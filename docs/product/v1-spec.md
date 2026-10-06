# Gurukul V1 specification

Status: implementation baseline proposal, 2026-10-05. Hardware assumptions await a real-device spike.

## Outcome

A learner imports their own notes, receives a source-linked explanation, completes a quiz, and sees what to revisit, with all study processing and history on their device.

Primary initial validation cohort: older school and college learners with English printed notes on an Android phone. Subject selection is unrestricted; launch claims are limited to evaluated material. Younger children, complex mathematics, handwriting, Hindi, and Bengali require additional validation.

## Experience

Visual/interaction acceptance follows [docs/UX](../UX/README.md) and the [T0–T7 ownership map](../plans/v1-build.md#required-ux-delivery-t0t7). Current numbered amendments supersede older mockup copy; illustrative model names, scores and people are not runtime data. Implement the mapped UX in each feature ticket, not only at final polish.

1. **Welcome:** “Welcome to Gurukul. I’m your AI study assistant.” Avatar is a lightweight local asset with idle/working/error states, accessible text, and reduced motion. No generated video or required voice.
2. **Profile:** nickname/name and preferred language. Phone/email fields may be offered as optional local profile details with a Skip action. They are not verified accounts, Gmail sign-in, recovery, or access control. Recommend omitting them from the demo to reduce friction.
3. **Get your teacher:** robot-led “Meet your digital teacher” and “Bring my teacher to life”, per reference 12. Disclose actual bytes/connectivity before explicit download; real progress/cancel/retry and plain-language storage/device limitations. Keep license/provenance/technical information accessible in Settings. Explore first keeps imports usable; AI explains unavailable states.
4. **Home:** greeting and leaf Ready Offline badge backed by local availability (not release acceptance). “Welcome to” plus highlighted **Gurukul AI**, italic “Your personal AI classroom.”, approved amber Add your notes/book card. Horizontal notebooks, left/right controls, circular Create (+), View all page and File/Camera/Paste actions. Home imports require explicit destination selection; never silently choose the first notebook. Default phone viewport fits core actions; larger text/short windows may scroll rather than clip.
5. **Notebook:** selectable sources, import status, study actions, and a persistent conversation. Desktop/tablet layout uses a right-hand discussion/history panel. Phone uses Sources / Study / History tabs or a drawer; do not squeeze three columns onto a phone.
6. **Study actions:** Summarize selected section, Explain topic, Ask my notes, Prepare quiz. Show selected sources and language. A broad-document summary must disclose coverage or process all supported sections.
7. **Quiz:** choose 3 or 5 questions; show one at a time; answers editable until submission. Score at the end, with correct answers, evidence, explanations, and “Review this topic.”
8. **Progress:** latest submitted Practice complete score/date and source-backed amber missed-answer card, Review this topic and disclosed repeated Practice again. Retain full dated/adjusted history, sample counts, topic summaries, flags and unfinished attempts behind View all progress & history. Empty/all-correct/zero-scorable results remain honest; no mastery diagnosis.
9. **Settings:** reference 13's compact profile/avatar, language, offline teacher, storage and privacy overview. Detail pages preserve working management and limitations. Delete study data opens scoped selection and named impact confirmation, never instant deletion. Warn that uninstall/data clearing loses local records. Home/Progress/Settings use filled active icons, highlighted bold labels and non-color selection indicators.

## Requirement and acceptance matrix

| ID | Requirement | Observable acceptance |
|---|---|---|
| R01 | Local onboarding | Airplane-mode profile creation works without phone/email or account |
| R02 | Model lifecycle | Download cancel/retry, hash failure, insufficient storage, load failure are explicit; only validated file becomes ready |
| R03 | Source import | TXT/paste, PDF, JPEG/PNG and camera input become app-private sources with status and provenance |
| R04 | OCR review | Extracted text is visible/editable before indexing; denied camera permission leaves file/paste usable |
| R05 | Local retrieval | Answers draw only from selected notebook/source revisions; no matches produces an honest insufficient-evidence response |
| R06 | Study actions | Summary, explanation, and Q&A link to actual source excerpts; invalid references are rejected |
| R07 | Persistent conversation | History survives force-close; incomplete generation is marked interrupted, not complete |
| R08 | Quiz validity | 3/5 valid MCQs, four unique options, one in-range correct option, source support; malformed output cannot enter a scored quiz |
| R09 | Scoring | Exact local scoring, idempotent submission, immutable question snapshot; resubmission cannot inflate progress |
| R10 | Revision | Wrong answers link to topics and evidence; limited data is visibly “needs review,” not a mastery diagnosis |
| R11 | Offline | After installation/readiness, fresh import, OCR, new answer, quiz, scoring and relaunch work with network disabled |
| R12 | Recovery/privacy | No document upload; interruption and storage errors preserve existing data; confirmed deletion removes affected derived content |
| R13 | Accessibility | Screen-reader labels, large text, adequate contrast, non-color status cues, keyboard behavior and reduced motion checked |
| R14 | Honest capabilities | Unsupported scripts/handwriting/formats and model limits are visible; no silent cloud fallback |

Proposed initial guardrails: 20 MB/file, 20 PDF pages/import, 5 images/import, 2,000 indexed chunks/notebook; enforce before expensive work and validate on device. If too large, ask for a page range. These are proposed limits, not measured capacity. DOCX/PPTX, web URLs, audio, video, spreadsheets, and equation recognition are outside V1.

English printed input is supported first. Hindi Devanagari OCR may be enabled only after tests. Bengali OCR is deferred unless a separate local OCR path passes. Bengali/Hindi pasted text and generated explanations are experimental until reviewed by fluent readers. Never hide unsupported text behind a generic “upload succeeded.”

## Tomorrow's demo versus full V1

Demo: one measured Android device, one model, one clean 1–3 page study pack, paste/text plus at least one tested file path, explain/summary, 3-question quiz, scoring, revision and persistent history. Camera/PDF are included only if the ingestion spike passes; otherwise show their real status as incomplete.

Full V1: all R01–R14 on the declared support matrix, required PDF/image/camera paths, download recovery, durable storage, evaluation evidence and release build. A reduced demo is not full V1.

## Learning design

Lead with a short explanation and one example. Offer “Give me a hint” and “Check my understanding.” Tell learners to inspect the source when uncertain. Source citation proves provenance, not correctness; retrieval and generation can both fail. Allow flagging a question as ambiguous; exclude flagged questions from progress calculations pending local review.

Score is practice performance, not exam prediction. Do not compare people, label intelligence, or infer a learning disability.

## Success and exclusions

Demo success: complete source → explanation → quiz → revision offline without crash, correct score, persisted history and inspectable source.

Pilot targets (hypotheses): 4/5 observed learners complete the loop without intervention; 80% of reviewed answers supported by sources; 90% of generated quiz items unambiguous and correct in the pilot set. Safety-critical score/provenance integrity failures block release regardless of average quality.

No cloud inference/auth/sync, school ERP, payments, social network, leaderboards, remote teacher surveillance, or autonomous agents inside the student app. Agentic development tooling is separate from product runtime.
