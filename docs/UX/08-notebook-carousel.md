# Home — Horizontal notebook library

Extends board 01 with the existing warm paper cards, teal controls and book artwork.

- Keep the “Your notebooks” heading and Create notebook (+) action.
- Show notebook cards in one horizontally swipeable row, with a partial next card on phones to indicate more content. Preserve titles/source counts; allow titles to wrap and cards to grow vertically for large text.
- Place 48 dp left/right arrow buttons beside the heading. The right arrow advances roughly one viewport with overlap; left returns toward earlier notebooks. Disable each control at its boundary, including when all cards fit. Keep the horizontal scroll indicator visible.
- Wrap the heading/control row on narrow or large-text layouts rather than compressing touch targets. Use screen-reader labels and disabled states. Reduced Motion makes arrow navigation immediate, without animation; no autoplay.
- Keep the existing empty-library message and notebook-opening behavior. No changes to notebook order, data, source selection or study history.

Native swipe, arrow behavior and large-text/screen-reader acceptance are separate checks; implementation alone is not device proof.
