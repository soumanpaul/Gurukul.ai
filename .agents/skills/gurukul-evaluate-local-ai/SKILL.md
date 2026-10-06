---
name: gurukul-evaluate-local-ai
description: Evaluate Gurukul model, prompt, retrieval or OCR changes against reproducible quality and physical-device offline gates.
---

Read docs/architecture/ai.md and docs/quality/evaluation.md. Use docs/engineering/templates/benchmark.md. Record the exact artifact hash, runtime, prompt, source revisions and device; reject comparisons with missing provenance.

Run the same synthetic fixture set before and after a change when both are available. Separate retrieval failure, generation failure, output validation, OCR failure and runtime failure. Include absent evidence and malicious document instructions. Score MCQs with fixed keys, not an evaluator model's preference.

Report raw success counts, repair counts, observed timing/memory and human semantic review. A desktop test is not phone evidence. If hardware or language review is unavailable, leave those gates unverified and continue independent checks. Never invent measurements or upload student content for evaluation.
