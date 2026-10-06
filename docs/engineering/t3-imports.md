# T3 import contract

## Supported baseline

Clean, short English printed notes: paste, UTF-8 TXT, unlocked/unencrypted PDF, single-frame JPEG/PNG and camera capture returning JPEG/PNG. File and paste do not require camera permission. No Bengali OCR, arbitrary handwriting, HEIC, office documents or multilingual accuracy claim. Non-Latin letters block publication with an explicit unsupported-script message; OCR itself can misrecognize an unsupported script, so human review is mandatory.

Limits: 20 MiB per original; TXT 1 MiB; 20,000 UTF-16 characters per page/paste; PDF 1–10 pages, page dimensions at most 2048 points; images at most 4096 pixels per side. Signature, strict UTF-8, PDF encryption/page bounds and decoded image metadata are checked locally. Imports reserve twice the maximum source size plus 128 MiB of free storage; this is a guard, not a guarantee against later disk exhaustion.

The system file picker may offer cloud-provider files. Choose files already downloaded to the device for offline use. Gurukul copies only local picker results; it never uploads study content. Camera capture requests camera permission only. Denial explains the fallback and leaves file/paste controls available.

## Extraction and persistence

iOS uses PDFKit text extraction with per-page Vision OCR fallback, and Vision en-US image OCR. Android uses bundled ML Kit Latin OCR for images and each PdfRenderer-rendered PDF page; Android does not claim embedded-text extraction. Both paths preserve page numbers and preview the original page. There are no measured word-confidence highlights.

Every import first persists a job, then copies into a unique app-private `.partial` file and promotes it before inspection. SHA-256 detects identical originals within a notebook. Duplicates reference the original and do not add search rows. Files are never overwritten or automatically deleted. iOS marks the Documents directory and source previews excluded from OS backup; Android has `allowBackup: false`. Full backup/restore privacy verification remains a release gate.

Extraction checkpoints one page at a time. Cancel/background loss takes effect after the current native operation, not mid-OCR. Restart marks active jobs interrupted. Retry verifies the original hash and skips completed pages. A crash before the durable copy exists requires reselecting the input; partial files are not treated as complete and currently remain on disk. Failed, duplicate and superseded originals/previews also remain until a future confirmed cleanup flow.

Review drafts persist separately from immutable published pages. Save validates every page (including empty OCR), generates page-local overlapping chunks with exact offsets, and atomically publishes the revision, chunks, active revision pointer and FTS rows. Edits create a new revision; old published pages/chunks remain immutable and searchable references switch only on commit. The previous active revision remains indexed during an edit. A page may be manually transcribed after empty OCR; empty pages cannot be silently published or skipped in this slice.

Migration 3 adds documents, document_revisions, import_jobs, import_pages, pages, chunks and chunk_search. It preserves migrations 1/2, profiles, notebooks and model installations. Source/job/revision IDs are native UUIDs; page/chunk IDs are deterministic revision/page/ordinal composites. Search is bound SQL, scoped to notebook, selected sources and active revisions. No model creates SQL, chunks or grades.

The Expo SQLite adapter disables `finalizeUnusedStatementsBeforeClosing` on both connections. Phone testing caught a native double-finalization crash when the default sweep finalized FTS5-owned statements before SQLite closed its virtual table. Repository calls use Expo's run/get wrappers, which finalize their own prepared statements in `finally`; no application statement is intentionally left open. SQLite itself owns teardown of FTS internals. This setting is required for the tested expo-sqlite 57.0.3 lifecycle.

## Focused verification

`tests/imports.test.mjs` exercises real SQLite migration, review gating, provenance, duplicate scope, cancellation/retry, restart recovery, missing/changed originals, camera denial fallback, immutable revisions and rollback/index consistency. `scripts/t3-fixtures.swift` creates synthetic English and negative fixtures in a new destination directory. The flag-gated `--gurukul-t3-smoke` native diagnostic imports only those synthetic fixtures through the production manager; it does not drive the system picker or permission dialogs. See state.md for actual build/device results, not just available test code.

Dependencies added: expo-document-picker 57.0.3, expo-image-picker 57.0.20, expo-font 57.0.4 and @expo/vector-icons 15.0.2 (MIT, exact pins). Existing PDFKit/Vision and bundled ML Kit adapters remain; no cloud OCR or inference dependency. llama.rn optional high-memory entitlements are disabled so Personal Team signing remains usable.
