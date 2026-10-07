# ADR-003: Backend generation with replaceable provider adapters

Date: 2026-10-08. Status: user-requested architecture direction; implementation planned, runtime unchanged.

## Context

The user requests Google sign-in with backend-owned inference and a router supporting OpenAI, Gemini, Groq, OpenRouter, NVIDIA, Kimi/Moonshot and DeepSeek, including multiple authorized accounts per provider and failover when capacity is exhausted. The user explicitly requests direct design without the Gurukul planning skill.

Existing [V1](../product/v1-spec.md), [ADR-001](ADR-001-offline-v1.md) and [ADR-002](ADR-002-local-ai-buddy.md) describe phone-local inference and local profiles. This is a new online architectural direction, not evidence that the installed app has authentication or cloud access.

## Decision

Plan a modular TypeScript backend with Google identity verification, Gurukul sessions, canonical generation ports, provider adapters, versioned capability/privacy policies, PostgreSQL durable requests/usage and Redis distributed capacity coordination. Follow the [complete router design](../engineering/model-router-design.md).

Model credentials separately from organization/project/model quota groups. Choose another account only when its capacity and usage entitlement are independently verified; keys sharing a blocked group remain blocked together. Failover preserves task, source, quality, privacy, budget and deadline requirements. Account enforcement and moderation refusals are not bypassed by switching identities/providers. Do not assume every provider has a free production tier.

Keep one owner for retry/failover, bounded attempts, conservative unknown-charge accounting and explicit interrupted streams. Validate structures and citations independently of providers; deterministic quiz scoring remains on-device. Provider keys stay server-side. NVIDIA trial routes stay internal evaluation-only without a production entitlement.

## Consequences

Cloud mode requires network access, identity/session infrastructure, explicit content-transfer consent, provider eligibility, operational storage and spend management. It cannot inherit the app's offline/no-upload promise. Mobile UX/spec updates and data-preserving implementation are separate milestones; current local study behavior remains the implemented baseline.

The design is authorized planning for an online extension. No backend code, dependencies, credentials, account provisioning, deployment, paid calls or mobile migration are performed by this decision. Existing release blockers and stopped T8 work remain in effect. During implementation, revise the product baseline explicitly and record the selected mode and privacy behavior instead of silently superseding earlier guarantees.

## Alternatives

An aggregator-only integration is simpler but cannot independently govern all requested direct-account quota domains. An existing gateway product may reduce adapter work; evaluate it against shared quota groups, privacy restrictions, retries, licensing and usage reconciliation before adopting it. A custom modular router provides explicit contracts without requiring seven bespoke retry engines or immediate microservices.

## Next step

Implement the design's B0 fake-provider vertical slice when requested, then verify two real providers under configured entitlements and spend caps before enabling the remaining adapters. Planning acceptance is document inspection; provider runtime/quality and production readiness remain unverified.
