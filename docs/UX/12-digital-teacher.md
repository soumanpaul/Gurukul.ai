# Digital teacher setup

2026-10-06. User-requested revision of board 01's middle screen: present a friendly sci-fi digital teacher instead of model/configuration details. This supersedes the original Teacher setup visual. The original board remains available for reference.

- [Revised onboarding board](01-start-learning-v2.png)
- [Transparent robot teacher asset](12-digital-teacher-avatar.png)
- [Exact generation prompts](12-digital-teacher-prompts.txt)

The robot uses pearl-white rounded forms, a dark visor, cyan smiling eyes, teal accents and a teal book. It is inspired by the user's robot reference and integrated into the existing warm-paper/teal UI. This is the explicit exception to the previous book-character-only guidance for teacher setup and the user-authorized [AI Buddy](15-ai-buddy.md); other screens retain their existing visual direction.

## Student-facing experience

Heading: “Meet your digital teacher”. Supporting copy: “A little guidance. A lot to discover.” and “Learn from your notes, practise, and explore at your own pace.” Primary action: “Bring my teacher to life”. Secondary action: “Explore first”. Explain plainly: “One-time download. Internet needed for setup.”

Remove model names, parameter counts, license strings, device diagnostics and storage tables from the main introduction. Keep attribution and technical information accessible in Settings/About. Before starting the download, disclose its actual size in a compact download confirmation so the user can make a data-use decision; use live manifest values, not the historical mockup size.

The primary action begins the explicit setup/download flow after confirmation. Show actual progress using “Getting your teacher ready” with Cancel; preserve Retry and Explore first after an interruption. Storage problems use plain language such as “Free up some space to finish setup”. Only show ready after verification and readiness checks succeed. “Works offline” describes the post-setup capability, not the current download state.

Use the transparent avatar as a local illustration. Optional subtle glow can be rendered behind it; preserve a static reduced-motion mode. It does not require generated video, a network avatar service or a new model. Keep accessibility labels and 48 dp controls. Avoid presenting the avatar as a real human teacher.

## Local sign-out and returning setup

Settings → Log out asks for confirmation, then persistently returns to Welcome. Keep the saved nickname/language, notes, attempts and installed teacher. Continuing reopens this single local workspace; this is not Google login, password protection, multi-user isolation or uninstall recovery. Warn explicitly that anyone continuing on this device can access it. Active native work must finish/unload before sign-out; never abandon work silently.

Welcome uses the existing book/wordmark, name field and compact language chooser; language remains a preference, not an OCR capability claim. Continue opens this teacher screen. The robot artwork is reused exactly from the approved transparent asset, not regenerated. Leaf/lock/back icons use the existing vector family and the glow is static.

On entering teacher setup, check the existing installation through the model manager, including size/SHA verification. A verified teacher shows “Your teacher is already on this device. No download needed.” and “Continue with my teacher”. Never redownload on sign-out, returning welcome, or app restart. Missing/corrupt files remain preserved and require explicit confirmation before a new download. Explore first remains available without a teacher; completion/skip is persisted. No automatic inference or cloud service is introduced. Model attribution remains in Settings. Layout allows scrolling for large text or progress/errors instead of clipping controls.

## Review

Both assets were generated with built-in image_gen and visually inspected. PNG alpha presence was checked for the reusable avatar. The original artwork delivery was design-only; implementation and device evidence for the returning setup flow are recorded separately in state.md.
