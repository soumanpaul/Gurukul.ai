# T5 quiz states

Extends board 03 with the same cream surfaces, dark ink, teal actions, amber review panels, rounded option cards and existing book character. No new illustration or design system. Entry: notebook → Study/History → Quiz · practice and saved attempts. Keep the notebook's existing navigation.

## Setup and generation

- Default 3 questions, optional 5. Show selected-section versus selected-source scope; no full-document coverage claim.
- Label source-sentence completion mode: choose the missing word in a quoted sentence. Free-form conceptual question quality has not passed; do not disguise this conservative mode as broader capability.
- Sentence choices are constrained to gaps derived from the selected notes; options and keys come from validated local model output. Preserve the literal-source framing, especially where a distractor could be true in a different context.
- Explicit Generate locally action; stage text “Question N of 3/5,” at most one repair per item, Cancel and visible failure. Do not show partial candidates or let them start an attempt.
- Failed/interrupted generations stay visible in quiz history. Retry creates a fresh generation; never substitute a curated quiz.

## Attempt

```text
← Quizzes · keep saved answers
Question 1 of 3         [teal progress bar]
Question text
( ) First option       [rounded selectable card]
(●) Second option      [teal selected state]
( ) Third option
( ) Fourth option
Selections saved locally; editable until submission
Clear answer · skip
Flag ambiguous · exclude from score
[ Previous ]                             [ Next ]
Last question: [ Submit answers ]
```

Submission requires confirmation describing skipped/excluded questions. Save each choice before enabling more input; show failures rather than advancing silently. Closing or switching tabs preserves the attempt. No key, explanation, result or correctness color is shown before submission. Flagging is per attempt, not a global judgment that changes historical scores.

## Result

Book character → Practice complete → correct/scorable and percentage. Zero scorable means “No score,” never 0% or 100%. Label that one attempt is not a mastery measure. Show every question, with wrong/skipped marked Needs review, selected answer, immutable correct answer, explanation and View supporting notes. Citation expansion shows original quote, source title/page, saved revision and excerpt. A later source edit never rewrites this evidence. Practice again means generate a new quiz; opening the same quiz returns the existing saved attempt/result. Full aggregate progress remains T6.

Native keyboard/large-text/accessibility and real-device interaction verification remain separate from this design handoff.
