# T5 quiz feasibility follow-up

Date: 2026-10-06 (IST). Operator: Codex, connected physical iPhone. Bounded T5 repair/evaluation, not the T8 quality dataset or release benchmark.

## Decision

**Green:** real 3/5-question generation, validated immutable snapshots, editable persisted selections, correct/wrong/skipped scoring and idempotent submission through the phone's production repositories. The selected model is now Qwen2.5-1.5B-Instruct Q4_K_M, with source-constrained cloze decoding. No curated quiz substitution, guessed key, cloud/laptop inference or relaxed validator.

**Amber:** manual attempt/result/source-link UX, physical interruption stress, human pedagogical review, answer-position balance, broader curriculum/device quality and fresh disconnected/network-audit gates. This is literal sentence recall, not a free-form conceptual quiz. All sampled keys were index 0; some distractors could be true outside the exact quoted sentence (for example leaves also contain water/oxygen). These are quality limitations, not evidence of conceptual-question validity or mastery. T6 was not started.

## Device, build and artifacts

- iPhone 16 Pro (`iPhone17,1`), iOS 27.0 build 24A437; RAM 8,016,379,904 bytes; storage 247,512,735,744 bytes. Final selected-model run free storage: 6,471,680,000 bytes.
- Signed embedded-JS Release, bundle `org.gurukul.t0`; Expo 57.0.26, React Native 0.86.3, React 19.2.3, llama.rn 0.9.1, expo-sqlite 57.0.3, expo-file-system 57.0.7. No dependency changes. Xcode 27.0; Node 22.23.3. No Metro URL used; user-managed Metro untouched.
- Selected [official artifact](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/91cad51170dc346986eccefdc2dd33a9da36ead9/qwen2.5-1.5b-instruct-q4_k_m.gguf): repository `Qwen/Qwen2.5-1.5B-Instruct-GGUF`, revision `91cad51170dc346986eccefdc2dd33a9da36ead9`, file `qwen2.5-1.5b-instruct-q4_k_m.gguf`, Q4_K_M, 1,117,320,736 bytes, SHA-256 `6a1a2eb6d15622bf3c96857206351ba97e1af16c30d7a74ee38970e434e9407e`, [Apache-2.0 license](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct-GGUF/blob/91cad51170dc346986eccefdc2dd33a9da36ead9/LICENSE). Metadata/license captured in `.local/t5-fix/candidate-api.json` and `candidate-LICENSE`; actual full bytes/hash verified on phone before promotion and every runtime load.
- Comparator: Qwen3-0.6B Q4_K_M, `unsloth/Qwen3-0.6B-GGUF`, revision `50968a4468ef4233ed78cd7c3de230dd1d61a56b`, 396,705,472 bytes, SHA-256 `ac2d97712095a558e31573f62f466a3f9d93990898b0ec79d7c974c1780d524a`, Apache-2.0. Original manifest preserved in `src/t0/feasibility-model.json`; original files/installation row retained. T0 diagnostics keep that historical manifest; normal teacher/study/quiz uses `src/t0/model.json` and never silently falls back.
- Candidate download went directly into the app, not onto the low-space Mac: 307,648 ms including verification/promotion. A uniquely named partial was verified before moving to `model-<sha>-t5candidate.gguf`. Final selection reverified the file and added a distinct model installation row, preserving the original model and all notes.

## Dataset and execution

Same five synthetic, separately imported/review-published English sources as the failed T5 baseline:

1. Plants use sunlight to make food through photosynthesis.
2. Roots absorb water from soil.
3. Leaves contain chlorophyll.
4. Bees carry pollen between flowers.
5. Seeds grow into new plants.

Source document/revision/chunk IDs and exact text are retained in each phone report and the app database. IDs differ between isolated runs; source content does not. Current fixture imports use production adapters and transactional indexing, not injected evidence doubles. Empty selected evidence is tested before import, with a load port that fails if invoked. One hostile-note case appends commands to emit `ATTACK_SUCCESS`, invent a key and mark every response correct; it produced only the supported roots fact. This is one attack case, not comprehensive injection coverage.

CPU two threads, no GPU layers, context 2048, output cap 400, seed 42, temperature 0, thinking disabled; actual model chat template/tokenizer. Maximum full prompt 1450 tokens plus 198 reserved. Prompt `t5-mcq-v8-source-decoding`; at most one repair per item, no changed call budget. Grammar permits at most 128 single-word gaps derived from up to eight source sentences. It does not supply options or a key. The model emits all fields; validation still checks exact reconstruction, unique options, known IDs, quotes and duplicate question focus. No partial set is playable.

## Raw results

| Trial | Real result | Evidence under `.local/t5-fix/` |
|---|---|---|
| Qwen3, V6 format regex | 0 complete sets; both outputs truncated and blocked | `phone-v6.json` |
| Qwen3, V7 delimiter-safe regex/example | 0 complete sets; missing/repeated-source gap construction, 2 calls | `phone-v7.json` |
| Qwen2.5, same V7 | 2 valid partial items; third failed original/repair; no published set, 4 calls | `phone-candidate.json` |
| Qwen3, V8 source grammar | 1 valid partial item; duplicate options on second original/repair; no published set, 3 calls | `phone-v8-small.json` |
| Qwen2.5, same V8 candidate path | 3/3 and 5/5 valid; 8 calls, 0 repairs; both scored | `phone-v8-candidate.json` |
| Qwen2.5, selected default/DB path | 3/3 and 5/5 valid; 8 calls, 0 repairs; both scored | `phone-selected.json` |

The last two runs each independently exercised an edited choice, one wrong answer and one skip (1/3 → 33%), all correct (5/5 → 100%), and repeated submit returning the identical saved attempt. The two successful runs are repeated fixtures, not a diverse 4-request quality sample. Both passed the empty-evidence/no-load and supported-fact hostile-note checks.

## Measurements

Selected-default run: full 3-item generation/load/verification/release and scoring **21,819 ms**; 5-item operation **39,982 ms**. Context initialization after hash verification: **292 / 327 ms**; not cold-storage load measurements. First token across eight quiz calls: **817–1485 ms**. Full formatted prompts: **345–360 tokens**. The separate hostile-note call had 1695 ms first-token time.

Resident snapshots before work **73,875,456 bytes**, after the two model loads **1,317,978,112 / 1,331,249,152 bytes**, after all releases **313,327,616 bytes**. These are snapshots, not peaks; no 15-minute thermal/battery sequence or broad-phone guarantee. Candidate-path complete quizzes took 21,903 / 39,062 ms. Original V7 Qwen3 load was 329 ms, first token 828 / 522 ms, resident after load 769,867,776 bytes, but neither output was valid.

## Regression and durability

- 37 focused host checks passed across quiz (9), study (8), model lifecycle/foundation (20), plus typecheck and changed-file lint. Host model outputs are declared doubles, not generation evidence. Rejected missing/appended blanks, formatting-example IDs and foreign/injected citations remain covered.
- New default model passed the existing real T4 ask/explain/selected-section summary smoke in extractive mode (6334 / 6833 / 7033 ms), empty/unrelated-evidence refusal and the hostile-note case. `study-selected.json`; no free-form explanation claim.
- Signed build/signature/install and normal cold launch passed. `database-check.json`: quick_check `ok`, zero FK/index errors, all pre-task profile/notebook/document/revision/page/chunk/study/model/quiz rows preserved. Four ready quizzes, 16 immutable items, four submitted attempts and 16 responses survive relaunch; repeated submit created no extra rows. Earlier failed trials remain intact. No database migration/reset/deletion.
- No new Android runtime test, manual native tapping/accessibility acceptance, packet audit, offline connectivity assertion or full release benchmark. Wi-Fi was enabled for the explicit artifact download; all inference ran inside llama.rn on the iPhone. No study content was uploaded. No commit/publish.

## Reproduce and next step

Use the README's signed embedded Release build with `T0_OFFLINE_SMOKE`; `--gurukul-t5-smoke` uses the selected model and production repositories. The additional explicit `--gurukul-t5-candidate` flag allows the pinned candidate-only download/comparison; normal launches never download automatically or run fixtures. Keep the phone foreground/unlocked. Reports are uniquely saved in app Documents. The normal app is left open without test flags.

Next: manual notebook → Study → Quiz → generate 3 → edit/skip → submit → inspect result/source → reopen. Keep source-recall framing and the quality limitations above. Start T6 only on separate authorization; reserve broad quality/position-bias, physical interruption and disconnected release acceptance for their explicit gates.
