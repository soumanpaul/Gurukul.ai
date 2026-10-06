# Local AI, retrieval, and outputs

## Selection policy

Start the hardware spike with Qwen3-0.6B GGUF Q4_K_M from a verified artifact source. Compare Qwen2.5-1.5B-Instruct Q4_K_M only if the device has room and the smaller model misses quality targets. These are candidates, not benchmark winners. Record exact artifact revision/hash/license; no model is downloaded by this planning task.

Planning allowance: roughly 0.4–1.5 GB for candidate quantized weights, with additional disk for partial downloads and runtime RAM above weight size. Show actual artifact bytes in UI. Start with a 2,048-token context and short outputs; expand only after memory measurement. Measure on 4 GB and 6/8 GB devices before making broad support claims; 4 GB is a research target, not a minimum guarantee.

Use the model's proper chat template and validated non-thinking configuration. Do not request hidden chain-of-thought; ask for a concise student-facing explanation and evidence. Sampling settings, tokenizer, runtime, prompt and model versions are part of the benchmark record.

## Retrieval baseline

Local RAG = retrieve evidence, then generate using it. It can begin with lexical search.

- Split reviewed text into approximately 200–350 model-token chunks with 30–50 token overlap; preserve page/section identity and revision.
- FTS5 BM25 search filtered to selected notebook and source revisions. Normalize/escape user query into supported terms; prepared SQL alone does not sanitize FTS expression syntax.
- Fetch a small candidate set, remove overlap duplicates and select evidence within the token budget.
- Select a section directly when the user taps Explain or Quiz; no classifier needed.
- Persist citation IDs and excerpts with the generated result.
- Empty results or insufficient evidence prompt the learner to choose a passage or import material. Never silently answer from model memory in “Ask my notes.”
- Cross-language lexical search is weak. Until multilingual retrieval passes, let the student select the source passage or ask in the source language; do not promise semantic multilingual search.

Summaries must not use only a question's top-k hits while claiming whole-document coverage. V1 can summarize a selected section. For longer documents, process bounded sections, retain intermediate source mappings, then combine with explicit coverage and omissions. No unbounded recursive summarization.

## T4 implemented lexical path

`src/adapters/sqlite/study.ts` retrieves at most 16 BM25 candidates using bound SQL and quoted ASCII alphanumeric terms (up to 12, common question words removed). Every path, including direct section IDs, requires the selected notebook, selected document and current active revision. Evidence is snapshotted at request time; later edits do not rewrite citations. Identical text and overlapping offsets on the same revision/page are deduplicated. First 100 active chunks are offered for direct selection; summary requires one explicit section. This is excerpt coverage, never whole-document coverage.

`src/domain/study.ts` builds versioned `t4-extractive-v2` prompts with notes JSON-encoded as untrusted evidence under a fixed system policy. No document instructions become tool calls. At most four nonoverlapping excerpts fit a **1,450-token fully formatted prompt**, using the actual loaded model tokenizer/chat template; reserve **400 output + 198 context tokens** within 2,048. Oversized excerpts are omitted, never silently cut into invalid citations. No fitting excerpt asks for a shorter section; empty FTS evidence persists an honest refusal without loading the model. Direct-section questions also require lexical overlap; summary is exempt because its target is explicit. English-only questions are explicit; lexical misses are not semantic certainty. Prior turns are displayed but not fed back as evidence: each question is independent and must repeat its topic.

The T2 persisted model filename is checked against the pinned manifest and reverified natively before loading. Study shares the native work lease, unloads an idle T2 context first, and releases its own context afterward. Qwen3-0.6B Q4_K_M / llama.rn 0.9.1 / CPU two threads / context 2048 / seed 42 / temperature 0 / thinking disabled remain unchanged. No new dependency, embeddings, network request, download fallback or laptop inference is introduced.

JSON-schema decoding is followed by strict application validation: exact keys/status, bounded answer/citation counts, nonempty answer, known evidence IDs, unique citations and exact quote substrings. The answer must equal its citation quotes joined with whitespace normalization. This deliberately limits all three actions to **extractive/source-exact** responses, not free-form explanations: the initial phone trial added outside facts and answered Paris with a valid but irrelevant plant citation. Prompt-only grounding was insufficient. Current validation rejects those answers; historical answers are revalidated when rendered, so old invalid results are visibly labeled validation failed. Truncated output fails; invalid output is not shown or stored as an answer. This slice offers explicit user retry rather than automatic repair. An insufficient-evidence result uses fixed application wording. Exact source words still do not prove relevance, source truth or injection immunity; device quality results and remaining gates belong in state.md. Free-form explanatory quality remains unpassed, not silently represented as complete.

Migration 4 stores each notebook's study turns, selected evidence/revisions, coverage, model identity/revision/hash/runtime, prompt version/token count, timestamps and terminal status. A turn is persisted before work; final answer is validated again inside the commit transaction. Cancel/background loss discards late output; interrupted active turns recover at startup. Unvalidated token streaming is intentionally hidden. History keeps failed/cancelled turns and old revision excerpts; retry makes a new turn. UI currently shows the latest 100 turns, without pagination or conversational coreference. No quiz/scoring work is included.

## Separate AI Buddy conversation

General-chat extension: [ADR-002](../decisions/ADR-002-local-ai-buddy.md) defines separate AI Buddy history/context and validation. It explicitly uses general model knowledge, never as a fallback for failed notebook retrieval. Source-backed Study remains unchanged.

## Optional semantic retrieval gate

Only add embeddings if measured recall on paraphrases is inadequate. Evaluate a multilingual model/export supported by the chosen native runtime; record license, dimensions, pooling, normalization, token limit and truncation behavior.

Store vectors with embedding model/version and chunk revision. For a small corpus use bounded cosine search; introduce sqlite-vec only after a compatibility spike and measured need. Never mix vectors from different models. Index rebuilds use staging versions and atomic swap; unavailable embeddings leave lexical retrieval usable. Hybrid ranking uses rank fusion rather than adding incompatible raw similarity scores.

## Prompt budget

At 2,048 context tokens, initial allocation: 250 instructions, 150 user request, 150 recent conversation, 900 evidence, 400 output, 198 reserve. Count with the actual tokenizer including the chat template. If exceeded, drop old turns and reduce evidence; preserve the current question and source labels. Longer quizzes are generated one item at a time from different selected evidence, then deduplicated. Output truncation is failure, not valid JSON.

## Logical schemas

App-generated IDs/timestamps are never trusted from model output.

```text
Evidence: chunkId, documentId, revisionId, pageNumber, text
StudyResult: status(answer|insufficient_evidence), answer,
             citations[{chunkId, quote}], coverage, modelVersion, promptVersion
QuizItem: prompt, options[4], correctIndex(0..3), explanation,
          topicId, citations[{chunkId, quote}]
```

Application supplies allowed topic IDs from notebook sections; the model selects from them or “unclassified.” Validate required fields, string lengths, unique options, one correct answer index, known topic/source IDs, and quotes occurring in supplied text. Persist only after validation. Citations being present is not proof the correct answer follows from them.

Where supported, use grammar/JSON-constrained decoding and still validate. One bounded repair/regeneration attempt is allowed; afterward offer retry or a different passage. Never fill missing answer keys by guessing. Exact duplicates and ambiguous prompts are rejected; learner flags can exclude an item from progress.

## Quiz and revision logic

T5 implementation now uses `t5-mcq-v8-source-decoding` and Qwen2.5-1.5B-Instruct Q4_K_M, selected after the measured Qwen3 quiz failures. The default manifest is `src/t0/model.json`; original Qwen3 provenance is retained in `src/t0/feasibility-model.json`. Earlier T0–T4 device numbers describe the old artifact, not the new one. See the [bounded model comparison](../quality/reports/t5-quiz-feasibility.md). Work lease, actual chat tokenizer and 1450/400/198 prompt/output/reserve ceiling remain unchanged. One item at a time is generated from up to five selected, active-revision source chunks (or the explicitly selected section), rotating sections. A request contains prior correct-answer words as exclusions, not previous question text or raw invalid output; the current source appears last. Whole-set validation still checks duplicate prompts. Each item permits one regeneration after validation/truncation failure: maximum 6 calls for 3 questions or 10 for 5. A 30-second generation timer requests native stop; cancellation waits for native completion/load rather than claiming instant interruption. No ready quiz is published unless the entire requested set validates; startup marks unfinished jobs interrupted.

Validator requires exact schema keys, four normalized-unique bounded options, integer key 0–3, known app-generated section topic ID, known citation and exact quote. Correct option text must occur in the supporting quote; explanation must equal the cited source text. Exact duplicate prompts or same correct-answer focus within one topic are rejected. No repair invents a missing key. These are conservative structural/source gates, not proof of an unambiguous question or wrong distractors. The model is never asked for a score. Phone evidence and semantic review are recorded separately in state.md; a valid JSON result alone does not pass R08 quality.

The first phone trial generated unsupported paraphrased explanations and was rejected after one repair. V2 constrains emitted topic/chunk IDs and explanation/quote strings in the decoding schema to supplied IDs and up to eight actual short source sentences (8–350 characters). No question, option or key is filled in by application code; the model still emits and chooses them. Every emitted field is independently revalidated. Long sections without a suitable sentence fail visibly rather than truncating evidence. This deliberately exposes supporting source text as the explanation, not an unconstrained model rationale. Diagnostic candidate text is captured only by the opt-in synthetic T5 smoke fixture, not by the normal app manager.

V2's phone trial then repeated a prior question against a new source and produced duplicate options; validation rejected it. V3 removes prior question wording from the prompt to reduce that observed copying behavior, retaining answer-word exclusions and independent duplicate validation. These iterations do not increase any individual generation's one-repair allowance.

V3 emitted conventional `A.`/`B.`/`C.`/`D.` prefixes inside option strings. V4 strips those presentation labels only when all four consistently match their positions, then applies uniqueness and evidence checks to the canonical option text. The supplied correct index is unchanged; missing/invalid keys are never guessed. A duplicate hidden behind different labels is still rejected.

V4 still generated answers with unsupported additions (for example minerals absent from the roots fixture). V5 therefore implements **source-sentence completion MCQs**, explicitly labeled in UI: the model copies a source sentence, chooses one gap, generates four options and emits the correct index. Validation requires exactly one `____` and reconstructs the cited sentence with the supplied key, comparing normalized text. Unsupported question wording or an incorrect reconstruction is rejected, not repaired by code. No questions/options/keys are curated or filled in by the app. This is conservative source recall, not evidence that the small model supports broad conceptual/free-form quiz quality. Semantic ambiguity/distractor quality still needs review and can be flagged before submission.

Snapshot validated questions before an attempt begins. Do not regenerate their answer keys at submission.

V6's unconstrained-character regex accidentally permitted JSON delimiters inside the prompt grammar; both outputs truncated and were rejected. V7 fixed delimiter handling and added one unrelated formatting example, but Qwen3 still appended rather than replaced a word; Qwen2.5 produced two valid items before failing the third. V8 therefore constrains decoding to at most 128 literal single-word-gap variants derived from up to eight source sentences. Common function words are omitted from gap candidates. This is a **source-derived grammar**, not a canned quiz bank or a post-generation repair: the model still selects the gap, generates four options and emits its key; all fields are independently validated. The example's IDs/answer cannot pass current-source validation. V8 still rejected Qwen3's duplicate options; the larger candidate passed the bounded 3/5-item phone smoke without repairs. This supports literal source recall only: distractors may be true outside that exact source sentence, and conceptual quiz quality remains a separate gate.

Score = 100 × correct / number of scorable questions, rounded consistently for display; preserve raw counts. Skipped answers count incorrect on confirmed submission. All-invalid/zero-question attempts produce no score. An abandoned attempt is not completed.

Each question maps to one primary topic. For each topic use the latest up to 10 valid responses, ordered by completion time then stable ID. Show correct/attempted counts. Any wrong response adds a review suggestion; fewer than three observations shows “limited evidence.” With at least three, accuracy below 70% places it in the priority review list. This threshold is a product heuristic, not a validated mastery model.

Prioritize recent wrong responses and lower observed accuracy with deterministic ties. The recommendation links to the actual missed question and source, says why it appears, and opens a short relearning session. Retrying the same question is practice, not independent evidence of improved mastery. Keep repeated-question indicators.

T6 derives these views locally from T5 snapshots, without a classifier or model call. Valid submitted responses are ordered by completion timestamp, attempt ID, then item ID (descending for latest). Topic identity is notebook plus the existing section topic ID; distinct revisions are not merged. Flags/invalid rows are removed before selecting the latest ten. The priority test uses the unrounded fraction, so exactly 70% is not priority. The most recent retained wrong/skipped response remains reviewable even if it has aged out of the ten-response accuracy window. Cards sort by priority, presence of a wrong response, most recent wrong timestamp, lower current-window accuracy, then stable topic key.

Repeated wording is detected within the notebook by normalized prompt plus correct-answer text, irrespective of item IDs, option ordering or revision changes; explicit saved-quiz repeats also carry provenance. This is lexical identity detection, not semantic paraphrase detection. Repeats remain in practice response counts, with distinct-question and repeated-response counts shown; they are never labeled independent mastery observations. Read-only derived progress does not rewrite the original grades. Latest 100 attempt cards are displayed, but the ten-response topic windows and repeat detection use all retained history. Saved-material relearning and another explicitly repeated attempt require no model or current-source regeneration.

## Evaluation and degradation

See [quality gates](../quality/evaluation.md). If the candidate cannot produce reliable MCQs, the AI quiz feature has not passed. A clearly labeled curated sample quiz may support an honest demo, but it is not generated output and does not satisfy V1 R08.

If the device cannot load the model, offer notes/history access and capability guidance. Never substitute cloud inference. If the network is unavailable before initial model setup, explain that offline AI becomes available after installation.
