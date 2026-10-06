---
name: gurukul-build-slice
description: Implement an existing Gurukul ticket while preserving offline processing, deterministic grading and source provenance.
---

Read AGENTS.md, current state, the target ticket and relevant architecture. Check whether native dependencies and required commands actually exist.

Implement a bounded vertical slice. Keep model output behind validation, SQL behind repositories, grading in deterministic domain code and heavy native work off the UI thread. For migrations, preserve existing notes/attempts and prove upgrade behavior. For model or OCR work, follow the device gates in docs/quality/evaluation.md.

Run the checks appropriate to the change. Distinguish host/unit checks from actual phone evidence; do not use canned responses as proof of inference. Inspect project-scoped changes and update the ticket/state with results, unverified criteria and the next step. Do not commit or publish unless requested.
