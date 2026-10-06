# Startup and logout introduction

Approved references: [book introduction](first01.png) then [digital buddy](splash2.png). Implemented as native accessible text/actions, not screenshot-sized raster buttons or fake status bars. Cream/teal palette, italic serif Gurukul AI, sprouting book, four feature rows, Next; then approved robot, Meet your Digital Study Buddy, supporting copy and Get Started. Vector feature icons and restrained background washes approximate the illustrative details; not a pixel-identical rendering.

Every cold launch begins with the book screen, then the robot. Get Started resumes the persisted destination: profile for welcome/no profile, teacher setup for unfinished setup, Home for an active workspace. Background/foreground does not restart the introduction. Robot Back/Android Back returns to book. Confirmed successful logout persists welcome, then resets to the first book screen; failed/cancelled logout does not. No profile/model/history deletion, migration, new download, inference or network request. The native OS launch screen remains separate and unchanged.

T1 owns introductory routing; T7 owns logout/reset, safe-area/dynamic-text and keyboard/viewport regression. Both primary actions should fit the normal phone; allow scrolling for large text/constrained screens rather than shrinking text. Heavy setup runs only in the existing explicit teacher workflow. Screen 2 notes one-time teacher setup, not a new download for returning users.

Artwork: `assets/illustrations/splash-book.png` generated with built-in imagegen from first01.png; visually inspected. Existing robot `docs/UX/12-digital-teacher-avatar.png` reused. Exact book prompt:

> Extract/recreate only the smiling open-book mascot with green sprout from this supplied Gurukul splash reference as a single production square PNG with transparent background. Match its cream pages, dark teal binding, watercolor/clay shading, rosy cheeks, tiny black eyes and curved smile, two green leaves. Entire character centered with 8% clear margins, no cropping. Remove ALL text, button, icons, background paper, bottom foliage and UI. Only the one open book and sprout on genuine transparent alpha. This is an asset for rebuilding the supplied splash as accessible native UI.

Check results and device limitations are recorded in state.md.
