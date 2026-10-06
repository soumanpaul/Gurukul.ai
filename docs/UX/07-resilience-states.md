# T7 — Local readiness, storage and recovery

Extends boards 01–03 with the existing warm paper surfaces, teal actions, amber notices, rounded cards and local book character. No new image pack or animation dependency.

## Teacher and layout

- Home: static book avatar and explicit installation status. “Installed” means recorded locally, not verified in this session; load always verifies again. Import/review remain usable without the teacher.
- Study: static avatar with Idle / Working locally / Needs attention text. Never convey state by color alone or animate indefinitely. Show actual manager progress and cancellation status, never a simulated percentage.
- Phone notebooks retain Sources / Study / History tabs. At width 1000 dp or greater and font scale below 1.5, Sources and Study gain a right-hand saved discussion/history panel. Larger text falls back to one column. Keep both panels within the existing page scroll; no compressed three-column phone layout.
- Import sheets respect reduced motion, defaulting to no animation until the OS preference is read. Keyboard avoidance, scrollable fields and fixed footer actions remain. Shared actions announce labels/disabled state; controls are at least 48 dp high. Wrapping navigation accommodates large text.

## Storage and destructive confirmation

Settings → Storage → Manage notebook → Delete source / Delete notebook.

1. Read a transactionally consistent preview. Never delete from the first tap.
2. Confirmation states the source/duplicate, conversation, quiz and attempt counts. Warn that revisions/search entries go too, progress is recalculated, and deletion cannot be undone. Model/profile are separate. Cancel is a full exit with no writes.
3. Confirmation is tied to that preview; changed selection/history requires refresh and a new confirmation. Active import/generation or retained native context blocks removal. No automatic cancellation of someone else's work.
4. Database removal and file-cleanup queue commit together. File cleanup follows commit. Show the number of pending files and explicit Retry. Missing files succeed idempotently; failures retain content-free error codes. Restart preserves the queue without starting unconfirmed deletions. Never claim secure erasure.
5. Model removal is separate, disabled while loaded/busy, and removes only the selected installation's tracked model/staging files. Older untracked copies remain; do not promise all space is reclaimed. Notes, quiz snapshots and attempts stay.

Storage shows measured available device space, not a mock capacity. Model bytes/MiB come from the pinned manifest. Explain supported printed-English inputs, source-recall/extractive limitations and unsupported scripts/formats in Settings.

## Recovery and privacy

Existing import checkpoints, interrupted conversation/quiz recovery and saved answer selections remain authoritative. Failed cleanup is retryable; failed DB writes never reset a workspace. Invalid saved quiz snapshots display an error instead of crashing or inventing keys. Unexpected generation errors are replaced by fixed messages; no native exception/prompt text is copied into new persisted error fields.

Native logging now uses the reproducible `gurukul-private-log-v1` patch in `scripts/private-llama.mjs`, pinned to llama.rn 0.9.1. It suppresses native logging sinks/callbacks and forces source builds instead of the logging precompiled cores. iOS and Android ARM64 CPU libraries compile; the actual phone log-canary check still requires Gurukul to stay foreground. Do not label the gate device-green based on compilation or UI error filtering alone.

## Acceptance boundaries

Host checks cover storage transactions, cleanup retry, safe messages, responsive breakpoint behavior and representative text contrast. Physical VoiceOver/TalkBack, large text, reduced motion, keyboard/confirmation taps, tablet layout, destructive synthetic-device recovery and full disconnected regression are separate pending checks. Do not use user-owned notes for deletion acceptance. T8 is not part of this slice.

Focused iPhone tests are prepared in `tests/ios/T7UITests.swift`: create a uniquely named disposable notebook with keyboard visible, inspect Sources/History, cancel deletion and verify its named confirmation before deleting that same empty notebook; then run a large-text accessibility audit. `scripts/ios-t7-tests.rb` configures only the generated local Xcode project. The separate opt-in T7 probe generates one synthetic canary answer and checks interrupted jobs and synthetic-only cleanup across three process launches. Neither test's presence is proof of execution; actual results belong in state.md.
