# Welcome and local profile

Reference: [board 01 v2, first phone](01-start-learning-v2.png). T1 owns this screen, including after local logout.

- Cream watercolor background with the smiling open book/sprout, edge foliage and bottom books. Current welcome copy (2026-10-06) overrides the board's illustrative text: dark-teal serif Gurukul AI, centered Your AI classroom, and Your free, offline study buddy — 24/7. Retain the existing typography and responsive wrapping. Offline AI still requires the explicit one-time teacher setup on the next screen; this copy does not imply a cloud service or human tutor.
- Rounded translucent cream form starts with Choose your avatar: two circular generated Boy/Girl portraits, teal selected ring plus checkmark and accessible radio state, followed by What should we call you?, a real saved nickname (never illustrative Asha), Preferred language with trailing chevron, Printed English notes supported first., and teal Continue with a right arrow. Selection is optional, decorative and not a stored gender identity or account authentication. Save the chosen avatar locally and reuse it in Settings; no camera/photo permission.
- Footer: No account needed. Your notes stay on this device. Logout confirmation and Settings retain the single-workspace/no-backup/security limitations.
- An empty optional name continues as Student; invalid input and storage errors remain visible. Language selection is only a preference, not an unsupported-language promise. Continue saves locally and opens teacher setup, which reuses the verified downloaded model.
- Scale decorative spacing to the safe viewport; preserve readable text and scroll access on small screens, large type and keyboard presentation. No animation or rasterized controls. Settings profile editing includes the same avatar choices. Existing profiles retain their prior default portrait until choosing one; logout/restart retains selection.

## Avatar artwork amendment — 2026-10-06

Built-in imagegen generated two separate, visually inspected matching portraits, copied without altering the originals to `assets/illustrations/profile-boy.png` and `assets/illustrations/profile-girl.png`. Native Image circular clipping provides the round photo-style selection; rings/checkmarks/labels are live native controls. No new dependency.

Exact boy prompt:

> Create a single square production profile-avatar illustration for Gurukul AI student app. Friendly smiling school-age BOY, warm medium-brown skin, dark short gently wavy hair, teal casual shirt, head and shoulders centered, eyes looking forward. Premium soft 3D clay/cartoon portrait, rounded gentle forms, subtle realistic shading, cream and mint palette, solid pale mint background filling square, portrait fits circular crop with generous space around hair. No text, logos, border, UI, watermark, accessories or additional people. 512x512 composition.

Girl prompt: identical with BOY replaced by GIRL and “dark short gently wavy hair” replaced by “dark shoulder-length gently wavy hair”. Generated output dimensions are tool-selected; the app displays 68-dp circular portraits. Migration 10 adds a nullable constrained avatar key; existing profile identity/data remains intact. Runtime/device verification is recorded in state.md.

## Artwork

`assets/illustrations/welcome-background.png` was generated with the built-in image tool on 2026-10-06, referencing board 01 v2. The existing closed teal book did not match the requested open-book character. Original retained under `/Users/soumanpaul/.codex/generated_images/01a10ca4-3f44-7fd2-9833-cd7dd0be672a/exec-d4153d2a-113e-4f1e-a471-9553b70fa2ce.png`. Asset visually inspected; generated approximation, not a pixel-identical extraction. Text, fields and arrow/chevron icons remain native and accessible.

Exact prompt:

> Create a production mobile app decorative BACKGROUND asset matching ONLY the FIRST phone screen in this reference (welcome and local profile). Output one portrait 1024x2048 PNG, no phone frame, no status bar, no text, no logos, no UI controls, no card outlines. Warm very pale cream paper (#fcf8f0), same subtle watercolor foliage, ochre washes, stacked books in bottom left corner, foliage bottom right. At horizontal center around 23% of image height place the EXACT first-screen cute open cream book mascot with two eyes smile rosy cheeks and tiny green sprout above, occupying about 34% of image width and 17% image height. Small muted foliage on both outer edges alongside mascot. Leave top 12% completely blank for live GURUKUL title. Leave center below 34% through 84% almost blank cream for live text and form fields. Bottom corner artwork only lowest 13%. Reproduce original watercolor style and composition faithfully; NOT the teal closed-book mascot and NOT robot. No letters anywhere. This will be the entire decorative background behind accessible live native text and controls.

Runtime checks and remaining device gates are recorded in state.md, not implied by this artwork.
