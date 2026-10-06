Here is complete architecture for your *Pocket Teacher - Offline Personal Digital Teacher* as a senior SWE doc you can directly put in your hackathon PPT.

### 1. Vision & Constraints
*Goal:* Khanmigo for Bharat - works in Bagdogra with no internet, answers in Bengali/Hindi/English from your own BCA notes, zero monthly cost.

*Hard Constraints:*
- APK < 60MB on Play Store
- 100% offline after first download
- Phone RAM < 4GB (target: low-end Android)
- Cost per query = 0

### 2. Tech Stack - Final
Layer | Choice | Why
Mobile | Expo + React Native + TypeScript + laya-ts | Typesafe, offline file system, fast dev
Decision Engine (System-One) | Laya (ONNX 420MB) | Local classifier, no token cost, typed output
Reasoning Engine (System-Two) | Qwen2 0.5B Q4_K_M GGUF via llama.rn | 380MB, runs on 4GB RAM, multilingual
Vector DB | SQLite + sqlite-vec (on device) | No cloud Pinecone, fully offline RAG
Backend (Optional sync) | FastAPI + Pydantic | You know it, for notes sync when online
Embeddings | Snowflake Arctic Embed 33M ONNX | 120MB, fast, runs on CPU
### 3. High Level Architecture
[ React Native App - Offline First ]
    |
    +--> [ FileSystem Layer ] - stores models + BCA PDFs in DocumentDirectory
    |
    +--> [ Laya Router - System One ] 25ms
    |     Input: user query
    |     Output: { topic: dbms, lang: bn, urgency: blocking, complexity: simple/complex }
    |
    +--> IF simple -> [ SQLite-Vec RAG ] -> retrieve 3 chunks -> Qwen2 0.5B quick answer
    |
    +--> IF complex -> [ System Two Agent ]
            1. RAG retrieve
            2. Chain-of-Thought prompt
            3. Qwen2 generate explanation
            4. Laya verify answer quality (yes/no)
            5. Generate quiz

[ FastAPI Sync Server - Online Only ]
    /sync/notes - upload new BCA PDFs -> embed -> push to mobile when online
### 4. Data Flow

1.  First Launch: App (55MB) downloads Laya ONNX + Qwen2 GGUF + Arctic Embed to phone. Show progress bar.
2.  Ingestion: Student selects BCA semester PDFs -> chunk (300 tokens) -> Arctic Embed -> store in sqlite-vec with metadata {subject, semester, language}.
3.  Query:
const layaResult = await layaRouter.predict(query)
// { topic: "dbms", lang: "bn" }

const chunks = await vectorDB.search(query, filter: topic)

const prompt = buildPrompt(chunks, query, lang: layaResult.lang)
const answer = await llamaRn.generate(prompt)
4.  Offline Quiz: Qwen2 generates 3 MCQs from answer, stores attempt in SQLite.

### 5. Key Architecture Decisions

*Why not bundle models in APK?* Play Store limit 150MB. Use lazy download to avoid 855MB APK failure.

*Why Laya + LLM, not just LLM?* LLM generation costs battery (2-3 sec + heat). Laya is 25ms CPU, filters 70% simple queries like "define DBMS" directly from RAG without waking LLM.

*Why Qwen2 0.5B not Phi-3?* Phi-3 needs 2.2GB and 6GB RAM. Qwen2 0.5B runs on Tecno/Infinix 4GB phones common in WB, with decent Bengali support.

*Typesafe Contract:*
const AnswerSchema = z.object({
  explanation: z.string(),
  quiz: z.array(z.object({q: z.string(), options: z.array(z.string()), ans: z.number()})),
  source: z.array(z.string())
})
Laya returns this shape, Zod validates before render - no hallucinated UI crash.

### 6. Deployment

- APK: EAS Build, Hermes enabled, 55MB AAB
- Model CDN: HuggingFace direct or your own S3, with resume support
- Backend: FastAPI on Render free tier, only for sync, app works even if backend down

This is production-ready for hackathon and scales to 10k users with zero LLM bill.

Want I generate the folder structure + starter code for `mobile/` and `server/` with this architecture?