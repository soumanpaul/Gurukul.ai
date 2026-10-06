# T4 study and history states

Companion to board 02, not a new visual direction. Reuse the warm paper background, dark ink, teal actions, amber notices, rounded source cards, existing book character, 48 dp controls, Home/Progress/Settings and Sources/Study/History navigation. Reuse implementation assets; no new character or icon style is needed.

## Study

```text
← Notebook                         Local sources
Sources          Study [active]          History
[book character] Learn from your selected notes
English lexical search · independent questions
[ Choose a section / Use lexical search instead ]
[ Source title · Page 1 · excerpt preview       ]
[ Selected section text, when explicitly chosen ]
[ What would you like to understand?            ]
[ Ask my notes                                 ]
[ Explain topic                                ]
[ Summarize selected section                    ]
Conversation · saved on this device
[ Question · time · scope                       ]
[ Answer / visible incomplete or error state    ]
[ Source title · Page 1 · View source            ]
```

Source chooser lists the first 100 selected active-revision chunks. Summary is disabled without an explicit section; never label lexical hits a whole-document summary. All questions are independent in this bounded implementation; history is not silently injected as evidence. No-model state directs to Settings; no native build leaves history readable. Zero evidence requests a passage/import instead of general knowledge.

Show the source-exact limitation beside the actions: answers/explanations/summaries select the notes' own words rather than free-form teaching. Unsupported paraphrases fail validation. Historic answers that fail the current validator show “validation failed,” not a completed answer.

While generating, show stage text and Cancel. Do not stream unvalidated answer text. Failed/invalid/truncated output gets an error card, not a plausible replacement. A retry is a new turn; keep the previous failure. Cancellation or restart leaves a visible incomplete status. Raw model JSON is not a user-facing answer.

## Citation expansion

Within the same rounded card, expand an amber-paper source panel: exact quote, full retrieved excerpt, page, saved revision ID and offsets. Label that the revision may be older after editing. Source-ID/substring checks are not proof of semantic correctness; invite comparison. Collapse using the same View source control.

## History

Notebook-scoped latest 100 turns, newest first, dated and labeled Ask/Explain/Summary. Show status, scope, validated answer and expandable citations. Empty state: “No study turns yet.” Interrupted/cancelled/failed turns never look complete. Return to Study to retry with an explicit topic. Full pagination, rich conversational follow-up and T5 quizzes are not part of T4.

Native visual/accessibility review remains separate from this reference. Never use example readiness scores or fabricated evidence counts from the concept boards.
