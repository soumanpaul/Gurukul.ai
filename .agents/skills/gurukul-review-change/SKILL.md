---
name: gurukul-review-change
description: Review a Gurukul implementation diff for actionable offline, data integrity, model-output and native lifecycle defects.
---

Read the ticket, changed files and relevant architecture. Review without editing unless the user also requested fixes. Use docs/engineering/templates/review.md.

Prioritize hidden network dependencies, cross-notebook retrieval, fabricated citations, malformed quizzes, repeat submission, source deletion/edits, migration data loss, interrupted imports and native memory/cancellation behavior. Distinguish source identity checks from semantic correctness.

Return findings ordered by severity with file references, trigger, impact and reproduction. Name missing evidence rather than asserting tests pass. Do not manufacture findings; a clean review still states which device/AI gates were not exercised.
