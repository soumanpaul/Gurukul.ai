---
name: gurukul-plan-feature
description: Plan a Gurukul V1 feature or change as a bounded implementation ticket with acceptance criteria and verification.
---

Read AGENTS.md, docs/engineering/state.md and the relevant requirement in docs/product/v1-spec.md from the project root. Inspect existing code before proposing paths or commands.

Use docs/engineering/templates/task.md. Include failure states, local persistence, source provenance and an executable verification plan where relevant. Separate tomorrow's demo from full V1 acceptance. Treat model/device performance as unmeasured unless evidence exists.

Record architectural changes in docs/decisions. Preserve the original research. Do not add a cloud dependency to solve a local-runtime limitation. Return the ticket and its dependencies; planning does not authorize publishing or implementing unrelated work.
