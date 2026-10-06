# Digital teacher setup

2026-10-06. User-requested revision of board 01's middle screen: present a friendly sci-fi digital teacher instead of model/configuration details. This supersedes the original Teacher setup visual. The original board remains available for reference.

- [Revised onboarding board](01-start-learning-v2.png)
- [Transparent robot teacher asset](12-digital-teacher-avatar.png)
- [Exact generation prompts](12-digital-teacher-prompts.txt)

The robot uses pearl-white rounded forms, a dark visor, cyan smiling eyes, teal accents and a teal book. It is inspired by the user's robot reference and integrated into the existing warm-paper/teal UI. This is the explicit exception to the previous book-character-only guidance for teacher setup; other screens retain their existing visual direction.

## Student-facing experience

Heading: “Meet your digital teacher”. Supporting copy: “A little guidance. A lot to discover.” and “Learn from your notes, practise, and explore at your own pace.” Primary action: “Bring my teacher to life”. Secondary action: “Explore first”. Explain plainly: “One-time download. Internet needed for setup.”

Remove model names, parameter counts, license strings, device diagnostics and storage tables from the main introduction. Keep attribution and technical information accessible in Settings/About. Before starting the download, disclose its actual size in a compact download confirmation so the user can make a data-use decision; use live manifest values, not the historical mockup size.

The primary action begins the explicit setup/download flow after confirmation. Show actual progress using “Getting your teacher ready” with Cancel; preserve Retry and Explore first after an interruption. Storage problems use plain language such as “Free up some space to finish setup”. Only show ready after verification and readiness checks succeed. “Works offline” describes the post-setup capability, not the current download state.

Use the transparent avatar as a local illustration. Optional subtle glow can be rendered behind it; preserve a static reduced-motion mode. It does not require generated video, a network avatar service or a new model. Keep accessibility labels and 48 dp controls. Avoid presenting the avatar as a real human teacher.

## Review

Both assets were generated with built-in image_gen and visually inspected. PNG alpha presence was checked for the reusable avatar. This is a UX/artwork change only; no app implementation, installation or runtime tests were performed. Next: use this updated reference when implementing the teacher setup redesign.
