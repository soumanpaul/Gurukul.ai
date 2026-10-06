# Gurukul mobile UX concepts

Created 2026-10-05 using the built-in image generation tool, based on [V1 scope](../product/v1-spec.md). Nine screen concepts across three PNG boards; these are visual design references, not a working app or device validation.

| Board | Screens |
| --- | --- |
| [01 — Start learning, revised](01-start-learning-v2.png) | Local profile, robot teacher introduction, home; replaces the technical teacher setup in the [original board](01-start-learning.png) |
| [02 — Notes and study](02-notes-and-study.png) | Notebook sources/import, OCR review, source-linked study |
| [03 — Practice and revision](03-practice-and-revision.png) | Quiz, result/revision, settings |
| [04 — Study states](04-study-states.md) | T4 section selection, grounded answers, citation expansion, history, empty/error/interrupted states; interaction wireframe extending board 02 |
| [05 — Quiz states](05-quiz-states.md) | T5 3/5-question setup, generation, editable attempt, confirmation, score and source review; extends board 03 |
| [06 — Progress states](06-progress-states.md) | T6 dated/adjusted history, topic evidence, ambiguity flags, source-linked relearning and explicitly repeated practice; extends board 03 |
| [07 — Resilience states](07-resilience-states.md) | T7 teacher/readiness, adaptive history, accessible recovery and confirmed storage removal; native logging/accessibility gates remain pending |
| [08 — Notebook carousel](08-notebook-carousel.md) | Horizontal notebook cards, swipe and accessible left/right controls; extends board 01 |
| [09 — Viewport home](09-home-ready-viewport.md) | Compact home-ready composition from board 01, two phone notebook cards, retained arrows/+ and visible import tiles |
| [10 — All notebooks](10-all-notebooks.md) | View all page with full notebook list, creation and return navigation |
| [11 — History tab](11-history-tab.png) | Saved turns with interrupted status, expanded answer/source and empty history; [interaction notes](11-history-tab.md) |
| [12 — Digital teacher](12-digital-teacher.md) | Student-facing robot teacher setup, [transparent avatar](12-digital-teacher-avatar.png), download/recovery handoff |
| [13 — Settings overview](13-settings-overview.md) | Board 03 Settings implementation, generated profile avatar, actual model status, profile/model/storage detail routes and confirmed deletion |
| [14 — Welcome profile](14-welcome-profile.md) | Board 01 v2 first-screen composition, open-book watercolor background, selectable circular Boy/Girl avatars persisted locally and reused in Settings, native name/language form and keyboard-safe Continue |
| [15 — AI Buddy](15-ai-buddy.md) | Separate local general chat, robot welcome, bounded multi-turn context, saved conversations and confirmed chat deletion; translucent cream/teal adaptation of screens 2–3 of the [saved reference](16-buddy-glass-reference.png); screen 1 reserved for splash |

## Ongoing design rule

Startup/logout now follows [the two approved splash screens](splash/README.md): book → robot → saved profile/setup/Home destination. Confirmed logout returns to the first book splash. These references supersede earlier design-only splash navigation notes; native OS launch art remains separate.

Launcher branding: [17 — App icon and name](17-app-branding.md), using the established digital-teacher robot and the native label “Gurukul AI”.

Additional welcome variant: [splash2](splash2.png), titled “Meet your Digital Study Buddy”, with “Learn, practise and clear doubts together.” Original welcome artwork is unchanged. Generated with built-in imagegen; [prompt](splash2-prompt.txt). Visually reviewed; design only.

Current first introduction screen: [Book v4 with Next](15-splash-book-v4.png), retaining compact feature icons and subtitle spacing. Supersedes earlier book-splash versions for the interactive introduction.

Robot welcome: [16 — AI buddy welcome](16-ai-buddy-welcome.md), with [portrait screen](16-ai-buddy-welcome.png), adapts the supplied welcome reference to existing cream/teal Gurukul styling.

Latest book splash: [feature version v3](15-splash-book-v3.png) uses smaller colorful subject, notes, quiz and AI-buddy icons with more space below “Your AI classroom”; see [splash notes](15-splash-screens.md).

Splash concepts: [15 — Splash screens](15-splash-screens.md), with [book](15-splash-book.png) and [digital teacher](15-splash-digital-teacher.png) alternatives. These are launch design references, not installed native splash screens.

Execution ownership: [Required UX delivery T0–T7](../plans/v1-build.md#required-ux-delivery-t0t7). Every build prompt and project skill routes here from the start. T0 reads the direction without expanding its spike; T1 establishes the shared shell; T2 teacher setup; T3 Home/import/library; T4 study/History; T5 quiz; T6 result/progress; T7 Settings/resilience and cross-screen audit. Designs marked design-only remain implementation obligations in their owning ticket, not proven completion. The harness validates references/routing, not visual fidelity.

Robot exception requested 2026-10-06: use the approved robot for teacher setup (reference 12) and AI Buddy (reference 15). Notebook Study retains its book. Hide model/configuration details from the introduction; retain accessible attribution and honest setup/readiness states.

All future Gurukul UI/UX work follows this folder as the canonical reference. Reuse the established palette, typography, cards, navigation and book character, including the generated implementation assets in `assets/illustrations/`. When a new feature needs an unrepresented screen or state, add its design/reference and interaction notes here and update the board index above. Keep the same look and feel; do not redesign the app independently for each ticket. Visual references never override accessibility, honest runtime states or offline/data-integrity requirements.

## Interaction flow

Welcome → local nickname → teacher download or Explore first → home → notebook → import → review extracted text → save → study → quiz → results → supporting notes → fresh practice.

- Use Home / AI Buddy / Progress / Settings as primary navigation. Within notebooks use Sources / Study / History. Keep conversations persistent. General AI Buddy does not silently replace source-backed Study.
- Active bottom tab uses a filled teal icon on a pale-green pill, bold teal label and short teal underline; inactive tabs use gray outline icons and regular labels. Expose the selected tab to screen readers, keep touch targets at least 48 dp, and do not animate or flash the highlight.
- Explore first permits import and browsing. Until the model is validated and loaded, explain why AI actions are unavailable. Download screens also need progress, cancel, retry, storage failure and verification failure states.
- OCR text stays editable before indexing. Camera denial must leave File and Paste usable. PDF/image/camera availability depends on native feasibility checks.
- Study answers link to the selected source revision and page excerpt. No matching evidence should produce “I couldn't find this in your selected notes” with a source-selection action. Interrupted generation must remain visibly incomplete.
- Quiz setup offers 3 or 5 questions. Preserve editable selections until an explicit final Submit answers action. The shown question is question 2; the result card concerns a different, missed question about inputs. Production review should show the complete missed question too. Grade locally and deterministically; flag ambiguous questions and exclude them from progress pending review.
- Progress shows dated attempts, sample counts and topics needing review. The result mockup is not the full progress-history screen. Do not infer mastery from one attempt.
- Delete study data opens a confirmation specifying affected notes, conversations and attempts; Cancel is available. Keep this separate from model removal.

## Visual direction and implementation notes

Warm paper surfaces, dark text, teal actions, amber notices, rounded cards and a lightweight book avatar. Use readable sans-serif body text; the display serif in boards 1 and 3 is an optional heading treatment. Normalize typography, avatar and Android system chrome across screens during implementation; generated boards vary in these details.

Aim for at least 48 dp touch targets, scalable type, accessible control labels, icon-plus-text statuses and reduced motion. Contrast, TalkBack and large-text layout still require implementation checks.

Notebook/paste forms use a keyboard-avoiding bottom sheet. Keep the primary action outside the scrollable fields and above the keyboard; allow dragging or the keyboard's Done key to dismiss it. A disabled action must explain whether a name/text is missing or local work is still running. Test with the keyboard visible on the actual phone, not only with it dismissed.

On iOS, file/camera actions dismiss the import sheet and wait for its native dismissal event before presenting Files, camera or permission UI. Do not stack native presenters during the sheet animation or rely on a fixed delay. Cancelling the picker must release the busy state and allow retry or paste, without creating a source.

All names, notes, results and free-storage numbers are illustrative. The 397 MB download label rounds the repository model manifest's 396,705,472 bytes; production must use the selected manifest and measured device storage. Ready states illustrate the intended flow, not evidence of model readiness. English printed input is the initial baseline; additional language support remains unverified.

The core flow and History populated/detail/empty states are pictured. Download recovery, other empty/error states, quiz setup and deletion confirmation have interaction references but are not separate rendered screens.

## Generation and review

Exact prompts, including the source-count correction, are in [generation-prompts.txt](generation-prompts.txt). Originals were retained in the image tool output directory; selected PNGs are copied here. All three boards were visually inspected for legibility and product scope. The source selection count was corrected from two to one. No runtime or accessibility testing is claimed.
