# Local data design

Profile avatar amendment: migration 10 adds nullable `profile.avatar`, constrained to `boy` or `girl`. It is a decorative local asset key, not gender/account identity. Existing rows remain unselected; profile saves without a key preserve any prior selection. Selected portraits survive restart/logout and appear in Settings. No photo upload or external URL is stored.

AI Buddy extension: migration 9 adds `buddy_chats` and `buddy_turns` for general local conversations, terminal states, model/prompt provenance and context omissions. No existing table is altered. Confirmed chat deletion is scoped; notebook deletion does not remove Buddy history. See [ADR-002](../decisions/ADR-002-local-ai-buddy.md) and [UX 15](../UX/15-ai-buddy.md).

T1 implements the first explicit migration in `src/db/migrations/001-foundation.ts`: `schema_migrations`, singleton `profile`, and `notebooks` with a labeled synthetic sample. T2 adds `002-model-installations.ts` with artifact provenance, active filename, staging identity, received bytes, constrained installation status and UTC update time. T3 adds `003-imports.ts`: source originals, recoverable import jobs, mutable review drafts, immutable published revisions/pages/chunks and transactional FTS5 indexing. See the [implemented import contract](../engineering/t3-imports.md) for limits, ID exceptions and platform differences. Study/quiz/progress entities below remain proposed. The application database is app-private gurukul.db on the phone, unrelated to ~/codex/test.db.

Model installation is keyed by its bundled model ID (an explicit exception to UUID entity IDs). Repository reads require matching revision/hash/byte size. Native verification is still required: a persisted `ready` row alone never authorizes loading. Runtime loading/generation states remain in memory. New downloads retain any prior verified filename until the new artifact passes verification and promotion; no existing model is deleted. Interrupted staging is recoverable through explicit restart; an already-promoted destination can be derived from the persisted attempt name after a crash. Progress is checkpointed at transitions/handled cancellation rather than writing SQLite for every network callback. Filesystem promotion and SQL update are not one atomic transaction, hence this reconciliation path.

The profile stores a stable UUID, nickname, preferred-language code and UTC creation/update timestamps. No contact/account fields are required or collected. Language preference does not imply implemented translation/OCR support. The sample notebook uses a stable UUID; its text/provenance is a bundled synthetic fixture, not an imported source. Migrations are atomic and ordered; unknown/future or unversioned conflicting schemas fail without reset. The Expo adapter opens a dedicated transaction connection, enables foreign keys before BEGIN IMMEDIATE, and closes it after commit/rollback; this avoids Expo's separate transaction connection losing per-connection pragmas. WAL and foreign keys are enabled on the main connection too. Host tests exercise real SQLite rather than SQL mocks; phone verification is recorded in state.md.

## Entities

Migration 8 (`008-local-session.ts`) adds a singleton `local_session.stage`: welcome, teacher or active. Existing profiles migrate to active without changing their records; fresh installs start at welcome. Local logout changes only this stage. Continue saves the same profile and moves to teacher; verified-model continuation or Explore first moves to active. The stage survives force-close/relaunch. Neither logout nor setup clears notes, attempts or model metadata/files. This is a single-device workspace gate, not authentication or backup; uninstall can still remove all local data.

T4 adds `004-study.ts` and notebook-scoped `study_turns`: action/question, stage, evidence snapshot, validated result, coverage, model/prompt versions, actual prompt token count and timestamps. The snapshot retains source/revision/page/chunk IDs and offsets. Startup marks unfinished generations interrupted; retries create new turns. Final publication validates against the persisted evidence in a transaction. Old source edits never overwrite a prior conversation's evidence. Full conversational coreference and pagination are not implemented; UI shows latest 100 independent turns. See [T4 AI contract](ai.md#t4-implemented-lexical-path).

All identifiers are application-generated stable UUID strings unless noted. Timestamps use UTC; UI uses local time. Explicit foreign keys, indexes and constraints belong in migrations.

| Entity | Essential fields and invariants |
|---|---|
| profile | id, display_name, preferred_language, optional_contact; one local profile in V1 |
| notebooks | id, title, created_at |
| documents | id, notebook_id FK, original_uri, mime, byte_size, sha256, status, active_revision_id, created_at |
| document_revisions | id, document_id FK, extraction_version, created_at; immutable reviewed text version |
| pages | id, revision_id FK, page_number, raw_text, reviewed_text, extraction_method; unique revision/page |
| chunks | id, page_id FK, ordinal, text, token_count, start_offset, end_offset; unique page/ordinal |
| chunk_search | FTS5 index keyed to chunk identity; maintained transactionally with chunks |
| topics | id, notebook_id FK, label, source_section; stable app-created identity |
| conversations | id, notebook_id FK, title, created_at |
| messages | id, conversation_id FK, role, action, status, text, model_version, prompt_version, created_at |
| citations | id, message_id FK, chunk_id FK, quote; validates against the cited revision |
| quizzes | id, notebook_id FK, title, status, created_at |
| quiz_items | id, quiz_id FK, position, topic_id FK, prompt, options_json, correct_index, explanation, source_refs_json, validity; immutable once attempted |
| attempts | id, quiz_id FK, status, started_at, submitted_at, correct_count, scorable_count; one submission per ID |
| responses | attempt_id FK, quiz_item_id FK, selected_index nullable, is_correct; unique attempt/item |
| jobs | id, kind, entity_id, stage, status, checkpoint_json, error_code, updated_at |
| model_installations | id, source_revision, filename, sha256, bytes, license_ref, runtime_version, status |
| schema_migrations | version integer PK, applied_at |

Optional embeddings are a later migration: chunk_id, model_id, dimension, normalization, vector_blob; unique chunk/model. Local diagnostic events are bounded and content-free. Progress is derived from submitted valid responses; do not build an independent untraceable “mastery” database.

## Transaction boundaries

T5 migration `005-quizzes.ts` adds `quizzes`, immutable `quiz_items`, `attempts` and `responses`. Quizzes retain notebook/source snapshots, exact model/prompt identity and generation state. Topic IDs are app-derived `section:<chunkId>` values; a separate topic taxonomy is deferred. Whole-set validation and ready publication share a transaction. Ready quiz/item snapshots cannot be updated. One attempt per quiz is an explicit T5 constraint: opening it resumes or returns the same result; new practice requires a new generated quiz.

Selections are bound-SQL writes guarded by in-progress status and item/quiz membership. Per-attempt ambiguity flags exclude a question without changing its immutable snapshot. Submission runs under BEGIN IMMEDIATE, revalidates snapshots, persists one response per item, counts correct/scorable locally, stores rounded percentage or null for zero scorable, and seals the attempt. A submitted ID immediately returns its saved result; no new score/attempt count is written. Skipped scorable items count incorrect, invalid/flagged items do not count. Triggers prevent editing submitted attempts/responses. There is no model grading or aggregate progress table. Readability/semantic quality is not implied by deterministic scoring.

T6 migration `006-progress.ts` adds `progress_flags` (attempt/item, boolean flag, update time), `quiz_repeats` (new quiz → parent quiz) and an attempt completion index. Post-submission flags require membership in that completed attempt; they never update sealed responses, original grades or question evidence. Derivation revalidates questions/evidence, selections and saved scoring consistency. Invalid, pre-submission-excluded, post-submission-flagged and unfinished responses do not count. History displays original and adjusted counts/percentages separately; all-excluded means no adjusted score. Flags are per response, not a global ban on a question. Removing a progress flag cannot undo a sealed pre-submission exclusion.

T6 also permits explicitly labeled repeat practice without new inference: in one exclusive transaction, validate the complete parent 3/5-item set, copy immutable question/evidence/model/prompt snapshots into a new ready quiz, record its parent, create its new in-progress attempt and carry forward known exclusions. Existing IDs/grades stay unchanged. Reusing the same new quiz ID returns that repeat, rather than creating another attempt. Failed validation or any write failure rolls back the entire repeat. The T5 one-attempt-per-quiz constraint remains intact. No data reset or deletion is involved.

- Import: copy file and checkpoint job, stage extracted revisions; publish active revision + chunks + search index in one transaction.
- Quiz creation: commit quiz/items only after the entire selected question set validates.
- Answer selection: upsert one response per attempt/item while attempt is in progress.
- Submission: transaction verifies attempt state, snapshots grading results, calculates counts and marks submitted once. Retrying returns the same result.
- Corrections/flags: retain original attempt snapshot; exclude invalid questions in the derived progress view and clearly display any adjusted score/counts.
- Migrations: execute in version order transactionally where supported; checkpoint backup strategy before destructive changes. No implicit table replacement.
- Enable foreign keys for every connection. Verify the selected driver supports the transaction strategy; do not mix competing SQLite libraries.

## Source changes and deletion policy

Editing OCR creates a new revision and reindex job. Existing generated artifacts retain old source references until the user chooses deletion; new requests use the active revision. Label older material as based on an earlier revision.

For V1, deleting a source removes its revisions, chunks, citations, affected generated messages, and any quiz containing that source, including related attempts. Explain this impact and request confirmation before deletion. Recompute progress from remaining attempts. Delete the source's owned files through a recoverable cleanup job after the database transaction; if cleanup fails, show pending removal and retry. Do not report secure forensic erasure.

T7 migration 7 adds `file_cleanup` without modifying existing records. Settings previews source/notebook impact in an exclusive transaction and binds confirmation to the current document/history identities. Removal rechecks that preview and rejects active jobs, deletes affected whole quizzes/repeat descendants and flags/responses before their parents, clears FTS and the document/revision reference cycle, and queues deterministic private originals, staging files and bounded page previews in the same transaction. Malformed history blocks source deletion rather than guessing ownership; whole-notebook deletion can remove its malformed history after confirmation. A native work lease and manager busy checks prevent deletion during in-flight study. Progress is derived afresh from retained attempts.

Cleanup executes after commit, tolerates missing files, retains failed jobs with `CLEANUP_FAILED`, and retries explicitly from Settings after interruption/relaunch. No automatic deletion of unrelated caches, legacy model copies or user-selected original files occurs. Separate model confirmation compares tracked filenames, queues them and removes only that installation row; native discovery skips pending-removal candidates. App-private removal is not forensic erasure.

Deleting a notebook applies the same policy to all contained material. Deleting only a conversation removes its messages/citations but does not remove notes or independent quizzes. Deleting a model does not erase notes/history; it disables inference until another validated model is ready.

## Migration tests to implement

Fresh install, upgrade with existing notes/attempts, failed upgrade rollback, interrupted import restart, duplicate submission, source revision change, source deletion cleanup failure, and non-ASCII text roundtrip. Test real SQLite behavior in addition to pure domain logic.
