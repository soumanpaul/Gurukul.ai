# ADR-001: One phone-local study loop

Date: 2026-10-05. Status: proposed baseline pending T0 measurements.

## Context
The product must run on a phone without cloud AI after initial setup. Supplied research includes incompatible school SaaS and multi-model architectures. The event is tomorrow.

## Decision
Use Android-first React Native/Expo development build, one GGUF runtime/model, app-private storage, SQLite and lexical RAG. Keep retrieval and inference adapters replaceable. Let explicit study buttons determine tasks. Make optional contact details local only. Use a source-backed quiz/review loop as the differentiating experience.

## Alternatives
Browser WebLLM is easier to distribute but hardware/storage behavior adds uncertainty. Laptop-local inference is a valid disclosed demo fallback but not phone-local V1. School SaaS and Laya/multiple generation models add work and memory without proving the core loop.

## Consequences
Native build and physical-device tests are mandatory. Small models limit quality and language support. Initial model download is substantial and cannot be called fully offline onboarding. No cloud inference fee does not eliminate operational cost. Lexical RAG may miss paraphrases; measured failures can justify embeddings.

## Revisit when
T0 cannot run on the demo phone; retrieval recall fails; model quality is inadequate; a second platform is requested; or a pilot demonstrates demand for sharing/institutional features. Record new evidence and superseding decisions rather than silently replacing this baseline.
