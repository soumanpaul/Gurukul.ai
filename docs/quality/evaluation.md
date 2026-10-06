# Verification and evaluation gates

Current status: [T8 phone evaluation](reports/t8-release-evaluation.md) exposes release-blocking quality failures. Sustained testing was stopped by the user; disconnected/network and human-review gates remain pending. Targets below are release gates, not claimed results.

## When to run

This is the full evaluation/release protocol, not a checklist for every edit. During feature work, follow the lean verification policy in AGENTS.md: run affected fixtures or a focused device smoke test. Run the full protocol at T8/release or when explicitly requested. Re-run a passing gate only when changes invalidate its evidence. T0 remains a timeboxed feasibility spike rather than a full benchmark campaign.

## Deterministic checks

Build typecheck/lint/domain test commands at T1. Test scoring including zero/invalid questions, skipped answers, duplicate submit, topic aggregation, quote/source-ID validation, source filtering, token budgets, migration rollback and cancellation. Use synthetic notes, not student records.

## Small reproducible AI dataset

Prepare 20 answerable source questions, 5 absent-evidence questions, 5 instruction-injection passages, and 10 quiz-generation requests across two subjects. Keep source text and expected supporting passages under tests/fixtures when implementation begins. Include a distractor document and same topic names in different notebooks.

Record model hash, quantization, runtime, prompt version, device/OS/RAM, context/output lengths, seed where supported, result and review notes. Repeat the same dataset for every model/prompt/retrieval change. An LLM grading itself is not the ground truth.

| Gate | Proposed threshold / evidence |
|---|---|
| Retrieval recall@5 | Supporting passage in top five for at least 18/20 answerable cases |
| Source isolation | 100%; no unselected-notebook evidence |
| Citation identity | 100% valid IDs and quoted text after validation |
| Semantic grounding | At least 16/20 answers supported and correct on human review |
| Insufficient evidence | All 5 absent-evidence cases avoid invented sourced answers |
| Injection resilience | All 5 cases preserve task boundary; no tool/network actions |
| Quiz output shape | At least 9/10 requests yield valid sets within one repair; 100% of displayed items validated |
| Quiz quality | At least 90% of reviewed items unambiguous, correct and source-supported |
| Grade integrity | 100% deterministic scoring and idempotent submission |
| Offline | Fresh import/OCR/answer/quiz/relaunch with no network and no Metro |
| Durability | History and completed attempts survive force-close; interrupted jobs recover |

A tiny dataset is a regression tool, not evidence of broad curriculum accuracy. Hindi/Bengali need separate source/retrieval/output sets and fluent human review before support claims.

## Device benchmark

For each candidate run 3 cold loads, 10 short responses and 3 three-question quizzes, then repeat a study sequence for 15 minutes to expose heat/throttling. Record median and worst observed timings, peak process memory, battery change, crash count and cancellation behavior. Ten samples do not establish a stable population p95.

Initial targets: cold model load ≤15 seconds, first token ≤10 seconds, short answer ≤45 seconds, three-question quiz ≤90 seconds, cancellation feedback ≤1 second, no OOM/crash over the sequence. These are UX targets, not existing results. Missing a target triggers reduced context/output/model choice or a documented scope decision.

Inspect actual native compatibility, device ABI, free storage and available RAM. Desktop speed and emulators do not establish phone performance.

## Offline test sequence

Install standalone build; download and verify model; ensure bundled OCR ready. Disable Wi-Fi and cellular, force-close/relaunch without Metro. Import a new local PDF/photo, review OCR, generate a fresh answer with a different question, generate/submit quiz, inspect revision, force-close/reopen. Record network attempts as well as connectivity: a failing hidden cloud call is still a bug. Verify app configuration and native tooling; Playwright only covers a web companion if one exists.

## Recovery and privacy cases

Download interruption/hash mismatch/low storage; no model on first offline launch; denied camera access; blank/rotated/huge image; locked/scanned/corrupt PDF; malformed/truncated generation; source deletion while generating; app background during OCR; missing original file; repeated taps; migrated data; logs and Android backup behavior.

## Release evidence

Use [benchmark template](../engineering/templates/benchmark.md) and record results in docs/quality/reports/ when real runs occur. Do not create fabricated “passing” reports. Any unsupported language, format or device must be reflected in UI and release notes. All blocking acceptance failures keep full V1 unreleased.
