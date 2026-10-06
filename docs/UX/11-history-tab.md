# History tab

Created 2026-10-06. [Visual board](11-history-tab.png) extends board 02 and [study/history behavior](04-study-states.md). Generated with built-in image_gen using board 02 as the visual reference; [exact prompt](11-history-tab-prompt.txt).

Three states: dated saved turns, expanded saved answer with source evidence, and first-visit empty history. The populated screen also demonstrates an interrupted turn. All example content is illustrative.

- Keep History selected in the notebook's Sources / Study / History tabs. List only this notebook's latest 100 turns, newest first, with Ask/Explain/Summary labels, time, source scope and explicit status.
- View answer expands the saved turn within History; the middle phone illustrates this focused view. Preserve list position when closing it. Source expansion shows the saved quote and full excerpt; allow revision ID and offsets in source details, and label older revisions after edits.
- Complete means the saved answer passed validation, not that its meaning is guaranteed correct. Failed validation, cancelled and interrupted turns retain distinct labels and never show a completed answer. Return to Study opens a new independent question; it does not silently resume inference or erase the failed turn.
- History remains readable without a loaded teacher. Go to Study and Back to Study navigate only; model readiness gates generation there.
- Empty copy: “No study turns yet.” and “Your saved questions and answers will appear here.” Primary action: Go to Study. Loading and read failures must not masquerade as an empty history; show Loading history or Couldn't load history / Retry respectively.
- Quiz attempts remain in Progress. No new search, filter, pagination or conversational-context behavior is implied by this board.
- Use existing paper/teal/amber tokens and book assets, minimum 48 dp controls, scalable body text and icon-plus-text status labels. Scroll long content; keep tabs reachable. Announce source expansion state to screen readers.

Visually inspected the generated board for readable labels, consistent selection, notebook scope, source evidence and incomplete/empty states. This deliverable changes UX references only; no runtime or accessibility tests were run. Next: apply this reference when History implementation is requested.
