# Gurukul AI app branding

The user requested the existing digital robot identity for the iPhone launcher icon and the display name **Gurukul AI**. [Selected icon original](17-robot-app-icon-original.png) uses the approved white robot, cyan smile, teal book and deep-teal background. The earlier book-only draft is retained but not selected.

Generated with built-in image_gen; [exact final prompt](17-app-branding-prompt.txt). Visually inspected. The production asset is [robot-app-icon.png](../../assets/branding/robot-app-icon.png), resized to an opaque 1024×1024 PNG for native packaging. iOS applies its own corner mask; the label is native text rather than embedded lettering.

`app.json` sets the shared display name/icon. The existing iOS Info.plist and AppIcon catalog are updated directly so the current native build uses them; future prebuilds use Expo configuration. Bundle identifier `org.gurukul.t0` and development signing identity remain unchanged, allowing an update of the existing installation. This branding task does not authorize data deletion or a new app identity.

Build and physical-device verification results are recorded in the current engineering state. Android configuration inherits the icon on a future prebuild; no Android installation is claimed.

Verified 2026-10-06: signed iPhone Release build/install/launch passed. Device inventory reports Gurukul AI; the fetched non-placeholder installed icon shows the correct robot and native rounded mask. App launches into the existing Home/profile/notebooks. Evidence is in `.local/app-branding/`.
