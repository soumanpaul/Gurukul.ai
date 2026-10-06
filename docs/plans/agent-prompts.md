# Copy-ready agent prompts: T0–T9

Use these from the GURUKUL project directory. Copy one task's entire code block into your agent. Run in order; each prompt reads the existing plan rather than requiring you to repeat it. T2 and T3 both depend on T1, but run them sequentially unless you explicitly arrange separate ownership for parallel agents.

These prompts authorize the named implementation task, not deployment or unrelated work. They use AGENTS.md's lean checks. A blocked prerequisite must be reported honestly; independent work can continue. No prompt makes missing phone tests count as passing.

## T0 — Prove the native and local-AI path

```text
Use $gurukul-build-slice to execute T0 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T0: UX index and 01-start-learning-v2.png; route later design work only, keep the spike minimal.
Read AGENTS.md and docs/engineering/state.md first; inspect only the relevant architecture sections and current code.


- Inspect available Android SDK/JDK, Node/package manager, and connected devices.
- Record the actual demo phone, OS, RAM and storage when available. If no phone is available, finish host-side checks and leave physical-device gates pending.
- Build the smallest Expo development app that can run the selected llama.rn integration.
- Select one exact GGUF artifact with revision, license, size and checksum. Load it and generate a real local answer.
- Test one printed-image OCR path and one PDF extraction/render-to-OCR path locally.
- Record exact compatible dependency versions and observed load time, first-token time and memory where measurable.

Do not expand the full UI or silently substitute cloud/laptop inference for phone inference. Report green/amber/red against T0's go/no-go criteria. Use focused feasibility checks only, not the full release benchmark.
Update state.md once with evidence, blockers and the next action. Stop after T0; do not commit or publish.
```

## T1 — App foundation

```text
Use $gurukul-build-slice to implement T1 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T1: 01-start-learning-v2.png, 09-home-ready-viewport.md and 13-settings-overview.md; shared theme, local profile and filled-icon/bold-label active Home/Progress/Settings navigation.
Read AGENTS.md, state.md and the T0 findings. Reuse the validated stack and versions. If T0 is incomplete, identify the missing gate and implement only foundation work that does not depend on it.
Keep the validated SDK 57 cross-platform baseline unless compatibility evidence requires an approved change. Expo Go is UI preview only; llama.rn, native OCR/PDF and physical offline acceptance require custom native builds. Inspect Xcode/iPhone or Android tooling actually available; never substitute simulator/laptop evidence for phone tests.
Build the Expo/TypeScript foundation:
- Routes and feature/service/adapter boundaries from the architecture.
- Welcome and local profile flow with nickname and language; no required phone/email or cloud login.
- SQLite initialization and the first explicit migration for the foundation entities.
- Profile persistence across restart, a synthetic fixture, and real typecheck/lint/test commands.
- Minimal navigation to notebooks, study, progress and settings. Clearly label unfinished features; do not fake working AI.

Inspect existing code before scaffolding; preserve useful T0 work. Keep the structure small and avoid speculative backend services.
Run focused profile/persistence checks and relevant typecheck once; fix failures. Follow lean verification, update state.md briefly, and stop after T1. Do not commit or publish.
```

## T2 — Download and manage the offline teacher

```text
Use $gurukul-build-slice to implement T2 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T2: 12-digital-teacher.md, 13-settings-overview.md and 07-resilience-states.md; robot introduction, explicit real download states, technical details in Settings and truthful readiness.
Read AGENTS.md, state.md, R02 and the model-lifecycle section of docs/architecture/system.md. Confirm T1 and the selected runtime/model evidence exist.

Implement the real model lifecycle:
- Download UI with actual byte size, progress, storage check, license information and explicit user initiation.
- Trusted pinned manifest, partial download, cancellation/retry and safe resume only when the server supports it.
- Full checksum validation before promoting the artifact to ready; never load a corrupt or partial file.
- Load/unload, one inference at a time, cancellation, and clear absent/downloading/failed/ready states.
- Useful offline-before-setup behavior and retained notes/history when the model is unavailable.

Keep study content off the network. Preserve any existing verified model during replacement; follow project deletion rules.
Run focused download-integrity/state tests and a runtime smoke test when hardware is available. Do not repeat the full benchmark.
Update state.md with actual evidence and remaining gates. Stop after T2; do not commit or publish.
```

## T3 — Import notes, PDFs, images and camera captures

```text
Use $gurukul-build-slice to implement T3 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T3: 02-notes-and-study.png, 08-notebook-carousel.md, 09-home-ready-viewport.md and 10-all-notebooks.md; approved branded compact Home, carousel/arrows/Create/View all, mandatory Home import destination, keyboard-safe forms and native picker dismissal/cancel/retry.
Read AGENTS.md, state.md, R03/R04, and the ingestion/data architecture sections. Use the PDF/OCR adapters proven by T0 and the T1 app foundation.

Implement:
- Notebook/source library and paste/TXT, PDF, JPEG/PNG and camera inputs.
- Permission handling, signature/size/page/pixel limits, durable app-private copies and duplicate detection.
- Local extraction/OCR with progress, cancellation and visible failures.
- Extracted-text review/editing before indexing; preserve page provenance and immutable revisions.
- Recoverable import jobs, page-aware chunks and transactional SQLite search indexing.

Begin with clean English printed samples. Explicitly reject or explain unsupported scripts/formats; do not claim Bengali OCR or arbitrary handwriting support. Camera denial must leave file/paste usable.
Verify the affected import paths, empty OCR, cancellation/retry and index consistency with focused checks. Keep untested native paths pending.
Update state.md with supported inputs and remaining gaps. Stop after T3; do not commit or publish.
```

## T4 — Source-backed study and conversation history

```text
Use $gurukul-build-slice to implement T4 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T4: 02-notes-and-study.png, 04-study-states.md, 11-history-tab.png and 11-history-tab.md; implement all saved/expanded/interrupted/empty History states with real citations and notebook scope.
Read AGENTS.md, state.md, R05–R07 and the retrieval/prompt/output sections of docs/architecture/ai.md. Confirm T2 and T3 provide real model and indexed-source paths.

Connect source selection to local study:
- SQLite FTS retrieval restricted to the selected notebook and source revisions.
- Safe query construction, overlap deduplication and tokenizer-based context limits.
- Summarize selected section, Explain topic and Ask my notes actions using the local model.
- Validated citation IDs and quotes with an inspectable source excerpt.
- Honest insufficient-evidence behavior; no silent model-memory or cloud fallback.
- Persisted conversation history, cancellation and interrupted-generation recovery.

Treat notes as untrusted evidence, not executable instructions. Do not label top-k excerpts as a full-document summary. Start lexical RAG; add no embedding dependency without measured need.
Run focused source-isolation, citation, empty-evidence, prompt-budget and history checks plus a local generation smoke test when available.
Update state.md briefly and stop after T4. Do not commit or publish.
```

## T5 — Generate quizzes and score them correctly

```text
Use $gurukul-build-slice to implement T5 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T5: 03-practice-and-revision.png and 05-quiz-states.md; focused question/source/progress/options/flag/navigation and actual scored result UI.
Read AGENTS.md, state.md, R08/R09 and the quiz/output/data contracts. Confirm T4's grounded generation path exists.

Implement source-backed quiz generation and attempts:
- Generate 3 MCQs first, then support the V1 option of 5 questions.
- Require four unique options, one valid correct index, explanation, known topic and valid source evidence per item.
- Bound generation and allow at most one repair attempt; reject malformed, truncated or invalid output.
- Snapshot validated questions before starting an attempt.
- Persist answer selections, allow edits before submission and show the score at the end.
- Grade deterministically in a transaction; repeated submission must return the same result without double-counting.
- Show wrong answers, explanations and source links after submission.

Never ask the model to grade MCQs or invent missing answer keys. Do not present curated sample questions as generated output.
Run focused tests for correct/wrong/skipped responses, invalid or zero scorable questions, duplicate submission and output validation. Use a small real generation smoke test; reserve the full quality dataset for T8.
Update state.md and stop after T5. Do not commit or publish.
```

## T6 — Progress and targeted revision

```text
Use $gurukul-build-slice to implement T6 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T6: 03-practice-and-revision.png and 06-progress-states.md; latest-result score/date, amber evidence-backed review, disclosed repeated practice, and retained full progress/history/flags.
Read AGENTS.md, state.md, R10 and the revision rules in docs/architecture/ai.md. Use T5's persisted attempts and immutable question evidence.

Implement:
- Dated attempt history with correct/scorable counts and scores.
- Topic summaries derived from the latest up to 10 valid responses, with deterministic ordering.
- Wrong-answer review suggestions and source links; show limited evidence below three observations.
- Priority review when at least three observations have accuracy below 70%, as specified in the plan.
- A relearning action that opens supporting material and allows another practice attempt.
- Ambiguous-question flags, exclusion from derived progress and clear adjusted counts when applicable.
- Repeated-question indicators so retries are not presented as independent mastery evidence.

Use deterministic rules, not an additional classifier model. Describe practice results without diagnosing intelligence, learning disability or exam performance.
Run focused aggregation, repeat-attempt and invalid-item checks once. Update state.md and stop after T6. Do not commit or publish.
```

## T7 — Polish the experience and handle interruptions

```text
Use $gurukul-build-slice to implement T7 in docs/plans/v1-build.md.
UX acceptance: read docs/UX/README.md and “Required UX delivery T0–T7” in docs/plans/v1-build.md, then the mapped files under docs/UX/. T7: 03-practice-and-revision.png, 07-resilience-states.md and 13-settings-overview.md; finish Settings detail/deletion/recovery routes and audit every T1–T6 UX requirement, not just cosmetic polish.
Read AGENTS.md, state.md, the product experience and R11–R14. Inspect the existing T2–T6 flows before changing them.

Complete the V1 UX and resilience work:
- Lightweight local teacher avatar, clear readiness/progress/error states and reduced motion.
- Phone Sources/Study/History tabs or drawer; right-hand discussion/history panel on sufficiently wide screens.
- Screen-reader labels, large-text layouts, contrast, non-color status indicators and usable keyboard behavior.
- Model/storage settings and source/notebook deletion flows that explain affected history and request confirmation.
- Recoverable file cleanup, app-background/force-close handling and truthful interrupted states.
- Content-free diagnostics and clear format/language/device limitations.

Implement deletion behavior using synthetic fixtures; do not delete the user's actual files without confirmation. Keep native heavy work off the UI thread and do not introduce cloud services.
Run focused checks for the changed lifecycle/storage flows and relevant accessibility smoke checks. Avoid unrelated redesign or a full benchmark rerun.
Update state.md and stop after T7. Do not commit or publish.
```

## T8 — Evaluate and prepare the standalone demo build

```text
Use $gurukul-evaluate-local-ai for T8 in docs/plans/v1-build.md, and $gurukul-build-slice for necessary fixes within that task.
Read AGENTS.md, state.md and docs/quality/evaluation.md. Confirm T7 status and distinguish demo omissions from full-V1 requirements.

This is the release-evaluation stage:
- Create/run the specified synthetic retrieval, answer, absent-evidence, injection and quiz dataset.
- Record exact model/runtime/prompt/device provenance and real quality/timing/memory observations.
- Run the applicable typecheck, lint, tests and standalone native build checks; reuse still-valid evidence instead of repeating it.
- Test fresh import/OCR, new local answer, quiz, scoring, revision and history after disabling network and relaunching without Metro.
- Inspect network attempts and record failures; a hidden failing cloud call is not offline compliance.
- Fix blocking defects, then rerun only the checks affected by each fix.
- Save concise results under docs/quality/reports/ and prepare the demo script, artifact location and known limitations.

Do not fabricate physical-device or fluent-language review results. If hardware is unavailable, complete host checks and leave device gates pending. Label any recording or curated fallback honestly.
Report demo readiness separately from full-V1 readiness. Update state.md and stop after T8. Build locally but do not publish, upload or distribute unless explicitly requested.
```

## T9 — Close the remaining V1 gaps

```text
Use $gurukul-build-slice to execute T9 in docs/plans/v1-build.md.
Read AGENTS.md, state.md, the T8 report and the R01–R14 acceptance matrix.

Use the existing plan to identify and complete the remaining V1 gaps:
- Finish any demo-only omissions in model download, PDF/image/camera ingestion, quiz options, persistence and recovery.
- Verify migrations preserve existing notes and attempts, interrupted jobs recover, and confirmed deletion handles partial cleanup failure.
- Inspect sensitive logging and native backup settings.
- Validate the second device tier when hardware is available; record the actual support matrix.
- Enable additional language capabilities only after their OCR/retrieval/generation paths and fluent review pass independently.

Do not expand into school SaaS, cloud sync, payments, social features or unsupported language promises. Break work into small slices internally without creating redundant planning documents.
Run focused checks per fix and refresh only invalidated release evidence. If required hardware/review is missing, complete independent work and mark the exact remaining gates unverified.
Update state.md with completed requirements, evidence and remaining limitations. Claim full V1 only when all release requirements pass. Do not commit, publish or distribute unless requested.
```

## Optional continuation instruction

Append this only when you want the same agent to proceed beyond the named task:

```text
After this task's required gates pass, continue into the next numbered task using docs/plans/agent-prompts.md, stopping after T7. Do not start T8/T9 unless explicitly requested. If a prerequisite is blocked, continue independent work but do not silently change the architecture or claim the blocked gate passed. Follow the lean-check policy and keep updates concise.
```
