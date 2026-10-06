# Splash screen concepts

Current first-screen reference: [Book v4 with Next](15-splash-book-v4.png). Adds a rounded teal Next/arrow button below the feature rows while retaining v3's smaller icons and spacing. Next leads to the [robot welcome](16-ai-buddy-welcome.png) in the proposed introduction flow. Because it has an action, implement this as an in-app introduction after the native launch splash. Exact [imagegen edit prompt](15-splash-book-v4-prompt.txt) retained; visually reviewed, no runtime implementation performed.

Latest revision: [Book splash v3](15-splash-book-v3.png) reduces the four feature icons and increases the gap below “Your AI classroom”, preserving the copy and visual identity. Generated with built-in image_gen; visually checked. [Exact edit prompt](15-splash-book-v3-prompt.txt). Supersedes v2 for this layout; earlier versions retained.

2026-10-06. Two alternative portrait splash designs, generated with built-in image_gen and visually reviewed against board 01 v2 and the robot direction in 03.2. Current branding follows reference 14: Gurukul AI / Your AI classroom.

| Concept | Direction |
| --- | --- |
| [Book splash v2 — features](15-splash-book-v2.png) | Current user-requested book variant: four colorful icon/text rows below Your AI classroom |
| [Book splash](15-splash-book.png) | Warm watercolor paper, smiling open book with sprout, dark-teal italic wordmark |
| [Digital teacher splash](15-splash-digital-teacher.png) | Friendly white robot, cyan halo, teal book, matching cream background and wordmark |

These are alternatives, not consecutive screens. Both omit setup controls, model details and readiness claims. The robot option extends the user's approved digital-teacher direction to launch. [Exact prompts](15-splash-prompts.txt) are retained for reproduction.

Book v2 adds four individually stacked rows: Add your subjects; Notes by subject; Generate quizzes; Clear doubts with free AI buddy. Colorful books, notes folder, quiz sheet and robot/chat icons accompany the short labels. Original book splash is retained. [Edit prompt](15-splash-book-v2-prompt.txt). Generated with built-in image_gen and visually reviewed for copy, icon pairing and spacing. This richer composition can serve as a welcome illustration; do not prolong native startup to force reading it. No animation or app changes are included.

Implementation handoff: use one chosen direction; do not add an artificial splash delay or wait for model loading/download. Route to the appropriate persisted welcome/setup/home destination when the app is ready. Treat these as visual concepts, not already configured native launch assets. Adapt artwork and branding to platform splash constraints and varying screen sizes; preserve the central content without stretching or clipping. Use accessible live text for any subsequent in-app loading/recovery state. A startup error needs a recoverable screen rather than an endless splash. No runtime changes, device tests or launch-performance checks were performed for this artwork task.
