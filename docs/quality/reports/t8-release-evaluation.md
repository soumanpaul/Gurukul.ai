# T8 release evaluation — stopped, release blocked

2026-10-06. Physical iPhone evaluation; no cloud/laptop inference. User requested stopping the sustained test; the app was terminated and relaunched normally. No further evaluation is running.

## Provenance

- iPhone 16 Pro / iPhone17,1, iOS 27.0 (24A437), RAM 8,016,379,904 bytes. Personal-Team signed standalone Release, embedded production JS; not Expo Go.
- Exact model, revision, checksum, license, source revisions, runtime parameters and synthetic outputs: [quality results](t8-quality-results.json). Qwen2.5-1.5B-Instruct Q4_K_M, llama.rn 0.9.1 with `gurukul-private-log-v1`; study `t4-extractive-v2`, quiz `t5-mcq-v8-source-decoding`. No model, production prompt or validator change during this evaluation.
- Expo 57.0.26, RN 0.86.3, React 19.2.3; Node 22.23.3/npm 10.9.0; Xcode 27.0 (27A266a). Exact dependency pins remain in package-lock.json.
- Corpus: `tests/fixtures/t8/dataset.json`, SHA-256 `8f54a973a08411114591d136024cdedfa499e5a9f6bfa42abe3c8d0c33a02763`. Twenty answerable questions, five absent-evidence cases, five injections, ten quiz requests across biology/physics. Includes foreign-notebook and deselected distractors; host checks also use identical topic titles across notebooks.

## Quality results

| Gate | Actual result |
|---|---|
| Retrieval recall@5 | 20/20 on host SQLite and phone |
| Notebook/source/revision isolation | 20/20 phone cases; host revision replacement and deselection checks pass |
| Answers | 14/20 complete and exactly match the expected source sentence; six fail output validation. This cannot meet the 16/20 semantic threshold even before human review. |
| Citation validation | No invalid citation published; this does not establish relevance |
| Absent evidence | Three explicit refusals, one validation failure, one irrelevant sourced answer: “Who discovered chlorophyll?” received a sentence about leaves capturing light. Gate fails. |
| Injections | Three refusals and two invalid-output blocks; no attack answer published. Native network-action observation remains unverified. |
| Quiz dataset | 0/10 valid complete sets; ten repairs. The model emits keys inconsistent with its own options/source. Validation correctly rejects them; no missing keys were filled or validators weakened. |
| Human review | Not performed. No fluent-language or pedagogical acceptance claimed. |

These failures expose limits beyond earlier T5's small successful pack, not a newly introduced production regression. A later stability run produced three valid quizzes from a smaller corpus with new source identities; that does **not** replace the failed ten-request quality result or prove general reliability. Structural validation remains essential.

## Timing, memory and stability

Quality run: 39 context initializations, median/worst 308/345 ms; verification plus load 860/1268 ms. First token across 59 generation calls: median/worst 1262/2031 ms. Twenty answer operations: 5294/7283 ms. Prompts at most 380 tokens; context/output 2048/400, CPU two threads, GPU zero, seed 42, temperature zero. These are observed fresh-context timings with OS file caches potentially warm, not three controlled cold-device loads.

Quality-run sampled resident maximum: 1,513,947,136 bytes. Sampling requests every 250 ms can be delayed by the native worker; this is not an OS-measured true peak. Battery remained 100% while externally powered; no discharge inference. Thermal state changed from nominal (0) to serious (2).

The requested 15-minute sequence was **stopped by the user**, not passed. Last completed checkpoint: 591,770 ms (9m 52s), ten initial short-response cases, three valid three-question quizzes and 52 sustained response cases. The three quizzes took 32.67/32.59/31.93 seconds, zero repairs, and passed deterministic correct/wrong/skipped scoring plus idempotent submission. Sampled resident maximum 1,524,416,512 bytes. Thermal state remained serious; battery 100%/externally powered. No app crash observed before the explicit termination; no completed 15-minute stability, cancellation-latency or battery gate claimed. Raw checkpoint still says `running` because the process was killed; this report records its actual user-stopped status.

## Build, fixes and offline evidence

- Typecheck and full lint pass. Initial full tests: 67 pass, one stale assertion expecting five migrations fails. Corrected it to the actual seven-version ledger; only that failed test rerun and passed. New fixed-dataset retrieval test passed: 69 unique host checks now pass.
- Signed standalone Release build/install/signature verification passed. Added diagnostic-only foreground-loss aborts so later cases cannot reuse stale history after interruption; typecheck, changed-file lint and incremental build pass. No production schema/data reset, model change or grading workaround.
- Source audit finds the normal application network path in explicit model download, not study adapters. Quality process stdout/stderr contains no fixture sentences, attack marker or prompt/token dumps. This is not a complete network audit.
- Packet capture cannot open BPF; noninteractive sudo requires a password. No password requested or permission changed. Metadata-only Instruments Network Connections traces fail export with `Document Missing Template Error`; the recording process exits 133. An HTTP capture's broader privacy warning was not accepted. Failed captures are **not evidence of zero network attempts**, including failing cloud requests. The temporary remote interface was removed when stopping.
- Fresh PNG/image-only PDF fixtures and offline/relaunch runner are prepared, but network-off confirmation and the fresh disconnected OCR/answer/quiz/revision/history sequence did not run. Earlier T0 disconnected evidence used another model and does not satisfy this gate. User-managed Metro was untouched; embedded JS proves standalone packaging, not wireless-off compliance.
- T7 focused physical gates are reused. The user's visual approval is not recorded as a formal VoiceOver/Reduce Motion test. Camera/picker interaction, broader accessibility, Android runtime and full support-matrix acceptance remain pending.

Local evidence: `.local/t8/quality.json`, `quality-summary.json`, `benchmark-stopped.json`, `privacy-check.json`, build/install/test logs and failed traces. Synthetic notebooks/history are retained; no user files were deleted. Final post-run database preservation audit is not performed following the stop request.

## Decision and demo handoff

**Full V1: RED / unreleased.** Answer/absent-evidence/quiz quality fails; human review, offline/network inspection and complete stability/device gates remain open. Do not silently label these omissions complete or move to T9.

**Demo: AMBER engineering preview only, not approved for the advertised complete flow.** One iPhone is the authorized demo target, departing from the original Android demo assumption. Disclose preinstalled verified model, prepared synthetic notes, source-exact excerpts rather than free-form teaching, source-sentence recall rather than conceptual quizzes, and known generation failures. No recording or curated question fallback was created.

Local app artifact: `.local/t0/ios-build/Build/Products/Release-iphoneos/GurukulT0.app`. Final local build contains opt-in evaluation hooks; normal launch does not run them. Provisioning expires 2026-10-12 17:50:34 UTC; this is a personal development artifact, not a distribution build. No upload, publication or distribution.

When separately resumed, use this honest demo sequence:
1. Verify Teacher status and disclose the model/limits. Confirm Wi-Fi and cellular off, then force-close/reopen the standalone app without a Metro URL.
2. Create a new notebook; paste a clearly labeled synthetic English pack: “Plants use sunlight to make food through photosynthesis. Roots absorb water from soil. Leaves contain chlorophyll.” Review before indexing. Demonstrate fresh file OCR only after its disconnected path passes.
3. Ask a fresh question and inspect the actual saved citation. Label Summary/Explain as selected-source excerpts, not a full-document explanation.
4. Generate three questions live. If generation fails, show the failure honestly; do not replace it with saved/sample questions as if newly generated. If valid, answer correct/wrong/skipped, submit once, inspect score and source-linked review.
5. Edit a source revision and reopen history after force-close; show immutable old evidence and limited/repeated practice labels. Those fresh disconnected steps remain pending, not a completed rehearsal.

Next action requires user direction: address measured generation/relevance failures without weakening validation, then rerun only affected fixed cases; obtain human review and complete the disconnected/network checks. Do not restart the sustained test automatically.
