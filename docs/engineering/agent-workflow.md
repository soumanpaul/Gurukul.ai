# Gurukul agent operating guide

This operationalizes [SWE_os.md](../SWE_os.md). Product runtime AI and development agents are separate systems.

## Installed versus proposed

Installed here: project AGENTS.md, four repository skills, durable plans/decisions/state, task/review/benchmark templates, a read-only harness validator and an Expo/native application. No global Codex configuration, MCP registrations, Git hooks or background agents are implied. Reuse the current app/toolchain; state.md separates historical from current evidence.

Codex discovers repository skills from .agents/skills according to its [official skills documentation](https://developers.openai.com/codex/skills). If a skill is not visible, reopen the project/session. Scoped [AGENTS.md instructions](https://developers.openai.com/codex/guides/agents-md) guide work; they are not a security sandbox.

## Context routing

| Work | Read |
|---|---|
| Every task | AGENTS.md, state.md, current ticket, docs/UX/README.md and the owning Required UX delivery T0–T7 row in docs/plans/v1-build.md |
| Scope/UX | docs/product/v1-spec.md, only the mapped docs/UX boards and current numbered notes; inspect referenced images before visual work |
| Runtime/native/import | docs/architecture/system.md, ADR-001 |
| Retrieval/generation/model | docs/architecture/ai.md, docs/quality/evaluation.md |
| Persistence/scoring | docs/architecture/data.md, relevant product requirements |
| New technology claim | docs/research/synthesis.md, primary docs |
| Final review | ticket acceptance, changed files, evidence and relevant architecture |

Do not load all raw research for every feature. Canonical precedence is current user intent → project instructions → active specification/ADRs → implementation plan → historical research. Report conflicts rather than merging incompatible stacks.

## Work loop

1. Explore the actual implementation; choose a bounded ticket and record acceptance.
2. Reuse the existing ticket. Create a new task document only for a materially new or ambiguous scope.
3. Implement the smallest coherent vertical slice including its required UX; do not postpone every visual/interaction requirement to T7 or redesign unrelated features. Current UX notes override superseded board examples, never runtime honesty or safety. Reuse assets; missing raster artwork uses imagegen with project-local output and recorded prompt. Add missing states to the UX folder/index.
4. Run the smallest relevant checks once, following AGENTS.md's lean verification policy.
5. Inspect changed code for acceptance and failure modes; for UI, compare actual screenshots with mapped references and check relevant navigation, keyboard/picker, real-data, accessibility and deletion behavior. A separate review report is optional unless requested. If native hardware/authentication is missing, record the exact pending gate; browser/simulator evidence is not physical phone evidence.
6. Update state.md once at task completion or a material blocker with concise evidence and next action.

Routine work does not trigger full benchmark runs, full test suites, research hash audits, skill revalidation, or separate planning/review passes. Reuse already loaded context and established toolchain evidence. Run broader checks for affected cross-cutting behavior, release readiness, or explicit requests. T0 still needs real feasibility evidence; full V1 still needs T8 release gates.

Status vocabulary: planned, in_progress, blocked, verified. “Implemented” without checks is not “verified.” If an external dependency blocks one gate, continue independent authorized work and name the missing evidence.

## Skills

- $gurukul-plan-feature: convert an approved V1 requirement into an executable ticket.
- $gurukul-build-slice: implement an existing ticket with local-first boundaries.
- $gurukul-evaluate-local-ai: compare model/retrieval/prompt changes using real evidence.
- $gurukul-review-change: report actionable correctness/privacy/reliability findings.

Examples:

> Use $gurukul-plan-feature for R03/R04. Read the selected ingestion adapter and define observable recovery behavior.

> Use $gurukul-build-slice for T5. Preserve the approved contracts and prove duplicate submission cannot change progress twice.

> Use $gurukul-evaluate-local-ai for the selected GGUF. Keep unmeasured phone results pending.

> Use $gurukul-review-change on the current project diff. Return findings ordered by severity with file references and reproduction steps.

## Agent roles and optional delegation

One primary agent is sufficient initially. Researcher, architect, implementer and reviewer are roles it can adopt sequentially; these names do not register subagents.

If the user explicitly asks for parallel agents, divide ownership by bounded outputs: research evidence, read-only review, or disjoint feature files. Give each the task, allowed paths, constraints, inputs, acceptance and required result format. Avoid concurrent edits to dependency manifests, migrations, state.md and shared contracts. The primary agent integrates and reruns relevant checks. Do not create worktrees or commit solely because a template mentions them.

## Tool policy and boundaries

Use filesystem MCP for ~/codex files and SQLite MCP for ~/codex/test.db; inspect tools before raw queries. Neither path is Gurukul's application database. Use Playwright MCP for browser automation. Physical Android testing needs native tooling/manual evidence; a browser snapshot cannot prove local mobile inference.

Prefer narrow project-scoped actions because the existing Git root is ../../. Do not stage the parent workspace. No publish/push/deploy/global config changes are implied by setup. User data, model weights and credentials stay out of source control. Confirm file deletion and table replacement as required by the user.

## Commands and evidence

Harness command: python3 scripts/check_harness.py. It validates required UX references and T0–T7 prompt routing as well as skills/links; it does not prove screens were implemented.

On a fresh build, establish app commands at T1. On this checkout inspect package.json, the lockfile and README for existing typecheck/lint/test/native commands and local toolchain paths. Reuse valid evidence and never invent passing commands. Use one pinned package manager/lockfile. Respect user-managed Metro; do not restart native/AI release benchmarks for UI edits.

The checker catches structural mistakes; it cannot verify architecture, model truth, instruction compliance, native compatibility or learning outcomes. Human review and actual device evidence remain necessary.
