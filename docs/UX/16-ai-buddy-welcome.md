# AI buddy welcome concept

[Screen](16-ai-buddy-welcome.png), generated 2026-10-06 with built-in image_gen. Adapts the user's single robot welcome reference to Gurukul's cream watercolor paper, teal serif branding, white/cyan robot holding a teal book, and rounded teal primary action.

Copy: Gurukul AI; Hi, I'm your AI study buddy; Let's learn, practise and clear your doubts. One subject at a time.; Get Started.

User-requested tab flow (2026-10-06): entering the second tab, AI Buddy, first displays this welcome. Get Started opens the existing chat/action-card interface and history controls. Returning to the tab displays the introduction again. It is a view-only transition, with no model download, automatic inference, chat deletion or onboarding changes. Native accessible text and button controls reproduce the reference with the approved robot asset, cream background and mint halo; system status bar and bottom tabs remain native. Constrained screens and large text can scroll to the action.

Implemented in BuddyWelcome.tsx with the existing robot artwork and native typography/action, using a simplified cream/mint background instead of embedding the reference screenshot. Typecheck and changed-file lint pass. Signed Release build and physical iPhone welcome → chat → history → tab-return check pass; both screenshots visually inspected in `.local/buddy-introduction/screenshots/`. Normal-size controls fit the phone. Large text, VoiceOver and Android remain unverified. [Original artwork prompt](16-ai-buddy-welcome-prompt.txt).
