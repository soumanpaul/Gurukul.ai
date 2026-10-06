# Research synthesis

Date: 2026-10-05. Sources were inspected online during planning. Vendor descriptions establish advertised capabilities, not measured Gurukul performance. Recommendations and numerical budgets below are engineering proposals.

## What the supplied research contributes

| Input | Useful contribution | V1 disposition |
|---|---|---|
| [architecuture.md](../my-research/architecuture.md) | Phone-local inference, SQLite, downloaded models | Retain; replace unsupported size/speed claims with measurements |
| [product_palning.md](../my-research/product_palning.md) | Avatar onboarding, multilingual aspiration, upload/explain/quiz | Core experience; broad learner vision, narrow initial validation |
| [ideas.md](../my-research/ideas.md) | Camera capture and personalized practice | Retain study loop; defer unrelated SIH proposals |
| [compaitator.md](../my-research/compaitator.md) | Learning loops and competitive analysis | Use qualitative positioning; do not repeat unverified statistics |
| [school.ai.md](../my-research/school.ai.md) | Evidence-based progress and validated outputs | Retain principles; defer school administration and cloud stack |
| [school.aiv2.md](../my-research/school.aiv2.md) | Institutional distribution concept | Future product discovery, not V1 architecture |
| [laya.py](../my-research/laya.py) | Router experiment | Reference only; not executed or adopted |
| [monitization.md](../my-research/monitization.md) | Subscription hypotheses | Unvalidated; no V1 paywall |
| [SWE_os.md](../SWE_os.md) | Discover → specify → build → verify workflow | Implemented as repository context, skills, tickets, and checks |

The notes mix a school SaaS, competitive exam app, and private phone tutor. The latest user request selects the private phone tutor. “All learners” remains the vision; initial evaluation should use older school/college learners and a small set of readable subjects. This is a validation cohort, not a BCA-only product.

## Competitive lessons

| Reference | Verified product emphasis | Gurukul design lesson |
|---|---|---|
| [SchoolAI](https://schoolai.com/) | Teacher-created Spaces and Mission Control | Close the feedback loop; institutional dashboards are a separate scope |
| [Khanmigo](https://www.khanmigo.ai/) | Tutoring that guides learning and teacher assistance | Offer hints, worked examples, and check-understanding prompts |
| [Gauth](https://www.gauthmath.com/) | Homework assistance including image-based inputs | Make camera-to-study short and clear |
| [Notebook help](https://support.google.com/notebooklm/answer/16269187) | Notebook-style study product reference | Borrow source selection and conversational organization |
| Quizlet and Duolingo | Present in supplied notes; current Quizlet pages failed retrieval; Duolingo not independently checked here | Treat flashcards/habit comparisons as research leads, not verified feature or market claims |

Positioning hypothesis: “Your notes become a private study companion that keeps working without internet.” This is not a claim that no competitor supports offline features. The defensible work is reliable low-resource execution, trustworthy source grounding, and useful revision feedback.

## Technical findings and corrections

- [Expo development builds](https://docs.expo.dev/develop/development-builds/introduction/) support custom native dependencies. Do not plan llama.rn in stock Expo Go.
- [llama.rn](https://github.com/mybigday/llama.rn) binds llama.cpp to React Native. Its Expo/native integration and backend compatibility must be tested together. GPU/NPU acceleration is device-specific, not a default promise.
- [Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) is an Apache-2.0 candidate with configurable thinking behavior; the [official GGUF repository](https://huggingface.co/Qwen/Qwen3-0.6B-GGUF) provides a starting point for artifact selection. Disable extended reasoning for the first mobile spike; verify the runtime applies the intended template.
- [Qwen2.5-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct) is a comparison candidate, not a guaranteed phone fit. Model-family language claims do not validate Bengali tutoring by a small quantization.
- A model's weight-file size is not peak RAM. Runtime buffers, context/KV cache, UI, OCR, and the OS consume additional memory. No exact APK size, response time, or 4 GB compatibility claim is justified yet.
- [ML Kit OCR](https://developers.google.com/ml-kit/vision/text-recognition/v2) lists Latin, Devanagari, Chinese, Japanese, and Korean scripts. Bengali is not in that list. UI language, OCR script, retrieval language, and generation quality are four different capabilities.
- [Bundled Android OCR](https://developers.google.com/ml-kit/vision/text-recognition/v2/android) avoids a first-use recognition-model download. Prefer this for the offline acceptance test.
- A PDF viewer does not necessarily extract text. [Android PdfRenderer.Page](https://developer.android.com/reference/android/graphics/pdf/PdfRenderer.Page) APIs vary by OS level. Use a proven text extractor or render pages and OCR; never assume a browser PDF library works unchanged in React Native.
- [SQLite FTS5](https://www.sqlite.org/fts5.html) enables local lexical retrieval and BM25 ranking. RAG does not require embeddings. Verify FTS availability in the chosen [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) build.
- [Laya's model card](https://huggingface.co/convaiinnovations/laya) describes typed decisions. A separate classifier is unnecessary when the student already presses an action button. It also cannot establish that an arbitrary generated answer is true.
- [Multilingual MiniLM](https://huggingface.co/sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2) is a future embedding candidate. Its desktop model card is not proof of a usable native integration or good Bengali retrieval.
- [WebLLM](https://github.com/mlc-ai/web-llm) offers browser inference via WebGPU, but browser/hardware/storage support adds uncertainty for a phone-first hackathon.
- “Open-weight,” “open-source runtime,” and “unrestricted redistribution” are not interchangeable. Review each selected artifact and runtime license. Do not repeat the old notes' universal Play Store size limit or “free forever” claims.

## Three architectures considered

| Option | Benefits | Cost / failure modes | Decision |
|---|---|---|---|
| Native mobile, one local model, SQLite | Matches phone/offline requirement, durable local storage | Native build, RAM, OCR integration, device matrix | Recommended, subject to T0 |
| Browser PWA + WebLLM | Fast UI iteration, easy distribution | WebGPU availability, browser eviction, mobile memory, offline asset caching | Alternative only after actual browser validation |
| Laptop-local model + local UI | Easier development demonstration | Does not demonstrate phone-local execution; phone connection needs LAN | Honest fallback demo, not V1 completion |

No backend is required for the core V1. Do not introduce FastAPI, Postgres, queues, tenant isolation, or cloud vectors without a later product requirement.

## Product validation before scaling

Interview five learners: show the source → explanation → quiz → revision loop. Ask what they currently do, whether downloads are affordable, available storage, phone details, note languages, and whether they trust generated answers. Observe completion; do not substitute praise for evidence.

Hypotheses: offline availability matters; learners will download a model; missed-topic review is useful; the selected small model is good enough. Test them separately. Use optional local metrics, not uploaded notes.

## Economics and future opportunities

No paid inference endpoint means no per-query provider charge. Budget separately for model bandwidth, hosting, build/distribution, support, and testing. Estimate monthly download egress as installs × model bytes × retry factor; choose a host only after checking redistribution and bandwidth terms.

Later experiments: spaced revision, source-linked flashcards, portable study packs, validated regional languages, teacher-curated packs. School plans and paid sync require separate research and consent design. Competitive rankings, predictive exam claims, autonomous misconception diagnosis, voice/video generation, and cloud sync are deferred.

## Agent setup sources

[AGENTS.md documentation](https://developers.openai.com/codex/guides/agents-md) supports scoped durable instructions. [Codex skills documentation](https://developers.openai.com/codex/skills) describes discoverable procedures in .agents/skills. This repository uses those mechanisms without changing global configuration or claiming role documents create autonomous agents.
