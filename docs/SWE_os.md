

# Mental model
 You
 ↓
"Build X"
 ↓
Codex
 ↓
code
 ↓
test
 ↓
fix


# Advanced workflow
                    ┌── Research agent
                    │
                    ├── Product/spec agent
                    │
YOU ──► Orchestrator ┼── Architecture agent
                    │
                    ├── Implementation agents
                    │
                    ├── Test/QA agent
                    │
                    └── Review/security agent
                              │
                              ▼
                         YOU approve
                              │
                              ▼
                            Ship



# 1. The new development loop
- I recommend you start thinking in this lifecycle:

# Flow
IDEA
 ↓
DISCOVER
 ↓
SPECIFY
 ↓
ARCHITECT
 ↓
PLAN
 ↓
IMPLEMENT
 ↓
VERIFY
 ↓
REVIEW
 ↓
SHIP
 ↓
LEARN

- I want to build a SaaS for Indian schools that lets teachers create AI-powered assignments.


# Phase 1 — Discovery
- Agent investigates:
Who is the user?
What problem are we solving?
What existing products exist?
What are competitors doing?
What assumptions are we making?
What could kill this product?

# Output:
docs/research/product-research.md


# Phase 2 — Product specification
Another pass turns that into:
docs/product/spec.md

# with:
personas
user journeys
requirements
non-requirements
edge cases
success metrics
MVP boundaries
acceptance criteria

# Phase 3 — Architecture
Agent studies your repository and produces:
docs/architecture/assignment-system.md

# including:
DB changes
API changes
frontend changes
background jobs
AI architecture
permissions
observability
failure modes
testing strategy
migration strategy

# Phase 4 — Implementation plan
- Now Codex gets:
spec
+
architecture
+
existing code

# and creates:
docs/plans/assignment-system.md
- broken into independently verifiable tasks.


# Phase 5 — Execution
- Now the coding agent works.


- Not: "Implement everything."

# Instead:
- Task 1
 ↓
implement
 ↓
test
 ↓
verify
 ↓
commit

- Task 2
 ↓
implement
 ↓
test
 ↓
verify

That distinction is huge.


# 2. Your AGENTS.md becomes extremely important
- Instead of repeatedly explaining your project to Codex, create a persistent engineering constitution.
- OpenAI explicitly recommends AGENTS.md for persistent repository context, including conventions, business logic, quirks and dependencies the model cannot infer from the code


AGENTS.md

# Project

What this product does.

# Architecture

How the system is structured.

# Repository

apps/
packages/
services/
...

# Technology

Next.js
Postgres
Redis
Stripe
OpenAI
...

# Engineering rules

- Prefer existing abstractions.
- Do not introduce dependencies without justification.
- Never modify database schema without migration.
- All API endpoints require tests.
- Never expose secrets.
- ...

# Development workflow

1. Understand existing implementation.
2. Produce plan for non-trivial changes.
3. Implement smallest coherent change.
4. Run tests.
5. Run typecheck.
6. Run lint.
7. Review diff.
8. Report remaining risks.

# Product rules

...

# Security rules

...

# Definition of Done

...


# 3. Learn the difference between 

- `AGENTS.md`, vs `Skills` vs `Agents`

- the most important concepts

# Agents.md
- AGENTS.md: Project knowledge + permanent rules.
- Think: "How does this company/project work?"

# SKILL.md
- Reusable procedure.
- Think: "How do I perform this kind of work?"
- OpenAI describes skills as reusable workflows containing instructions and potentially supporting files, templates and scripts. 

```
.agents/
  skills/
    feature-development/
      SKILL.md
    database-migration/
      SKILL.md
    api-design/
      SKILL.md
    frontend-feature/
      SKILL.md
    security-review/
      SKILL.md
    code-review/
      SKILL.md
    product-discovery/
      SKILL.md
```

# database-migration/SKILL.md might say:
# Database Migration

- When changing the database:
1. Inspect current schema.
2. Identify affected queries.
3. Create migration.
4. Update ORM/schema.
5. Update types.
6. Add migration tests.
7. Test rollback implications.
8. Run application tests.
9. Inspect generated SQL.
10. Summarize migration risk.


# 4. Agents are different again
- An agent is an actor with a responsibility.

- For example:
Product Analyst
Architect
Frontend Engineer
Backend Engineer
QA Engineer
Security Reviewer
Code Reviewer


# 5  architecture I would recommend for you one primary Codex + specialized skills.

                 YOU
                  │
                  ▼
            PRODUCT/TECH LEAD
                  │
       ┌──────────┼───────────┐
       ▼          ▼           ▼
   Research     Planning    Architecture
       │          │           │
       └──────────┼───────────┘
                  ▼
              CODEX
                  │
       ┌──────────┼──────────┐
       ▼          ▼          ▼
   Backend     Frontend     Infra
       │          │          │
       └──────────┼──────────┘
                  ▼
             Verification
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
       Tests    Review    Security
                  │
                  ▼
                YOU
                  │
                  ▼
                SHIP


# 6. The most important artifact: the Plan

docs/
  product/
    vision.md
    requirements.md

  architecture/
    system.md
    database.md
    ai.md

  plans/
    2026-10-school-ai.md

# Your plan might look like: --------------------------------------------------------------------------------------------
# Feature: AI Assignment Generator

## Goal

Allow teachers to generate assignments from a topic,
grade level and learning objective.

## User story

As a teacher...

## Constraints

- Existing auth system
- Existing curriculum model
- No new database
- Generation must be async
- Generation must be editable before publishing

## Architecture

...

## Data model

...

## API

POST /api/assignments/generate

...

## UI

...

## Failure modes

...

## Security

...

## Tasks

### T1
Create generation job model.

Acceptance:
- migration exists
- tests pass
- ...

### T2
Implement generation service.

Acceptance:
...

### T3
Implement API.

Acceptance:
...

### T4
Implement UI.

Acceptance:
...

### T5
Integration tests.

...

## Definition of Done

- [ ] tests
- [ ] typecheck
- [ ] lint
- [ ] security review
- [ ] diff review


# 7 Your prompts should start looking like engineering tickets: 
- OpenAI explicitly recommends structuring Codex prompts like GitHub issues, including paths, components, diffs and relevant documentation

```
## Goal

Implement organization member invitations.

## Context

Read:
- docs/architecture/auth.md
- docs/product/organizations.md

Relevant code:
- apps/web/src/app/...
- packages/auth/...

## Requirements

...

## Constraints

...

## Acceptance criteria

1.
2.
3.

## Verification

Run:
- pnpm test
- pnpm typecheck
- pnpm lint

Do not modify unrelated code.

Before changing code, inspect the existing implementation and
briefly state the implementation plan.
```



# 8. The "research → plan → execute → review" loop
- For any serious feature, I'd use this:

# Agent 1 — Explore
- Don't change code.

- Understand the repository and investigate how this feature
should fit into the existing architecture.

# Find:
- relevant files
- existing patterns
- dependencies
- risks
- ambiguities
- missing requirements

Return findings only.

# Agent 2 — Plan
- Using the exploration findings, produce an implementation plan.

- Do not write code.

# Include:
- architecture
- files to change
- database changes
- API changes
- UI changes
- tests
- edge cases
- risks
- task breakdown


# You review
- This is where you remain the architect.

# Agent 3 — Implement
- Implement task T1 from the approved plan.
- Do not redesign the architecture.

# After implementation:
- run relevant tests
- inspect diff
- fix failures
- report what changed

# Agent 4 — Review
- Give another context window the diff:

```
Review this implementation as a principal engineer.

Look specifically for:

- incorrect assumptions
- architecture violations
- security problems
- race conditions
- missing tests
- backwards compatibility
- unnecessary complexity
- edge cases

Do not modify code.

Return findings ordered by severity.
```

- Then Codex fixes them. That separation is incredibly useful.

# 9. Multi-agent becomes useful here
- Suppose you are building a large feature:

                    PLAN
                      │
          ┌───────────┼────────────┐
          │           │            │
          ▼           ▼            ▼
      Backend      Frontend      Testing
      Agent         Agent         Agent
          │           │            │
          └───────────┼────────────┘
                      ▼
                  Integration
                      │
                      ▼
                   Reviewer

- These tasks work well in parallel if their boundaries are clean.

# Backend agent
owns:
packages/api/*
packages/db/*
services/assignment/*


# while:
Frontend agent
owns:
apps/web/src/features/assignments/*



# 10. A surprisingly important concept: context engineering
- You'll hear a lot about prompt engineering.
- For experienced engineers, I think context engineering is more important.

# Your agent needs access to:
WHAT are we building?
       +
WHY are we building it?
       +
WHAT already exists?
       +
WHAT constraints exist?
       +
WHAT decisions have been made?
       +
WHAT does success mean?

# That's why these become valuable:
AGENTS.md
docs/
plans/
architecture/
skills/
tests/
git history

- You are essentially constructing an operating environment for the AI engineer.
- The recent OpenAI guidance is also moving toward smaller, targeted skills/context rather than enormous instruction dumps. 
    - https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra?utm_source=chatgpt.com

# 11. Build a "company in a repo"
- This is where I think your workflow can become really powerful.

- Imagine you have:

```
my-product/

├── AGENTS.md
│
├── docs/
│   ├── product/
│   │   ├── vision.md
│   │   ├── users.md
│   │   └── requirements.md
│   │
│   ├── architecture/
│   │   ├── system.md
│   │   ├── database.md
│   │   └── infrastructure.md
│   │
│   ├── decisions/
│   │   ├── ADR-001.md
│   │   └── ADR-002.md
│   │
│   └── plans/
│
├── .agents/
│   └── skills/
│       ├── product-discovery/
│       ├── feature-planning/
│       ├── backend-development/
│       ├── frontend-development/
│       ├── database-migration/
│       ├── testing/
│       ├── code-review/
│       ├── security-review/
│       └── release/
│
├── apps/
├── packages/
├── tests/
└── ...

```

- Now your AI isn't just "a chatbot that writes code."
- It has a persistent engineering environment.


# 12. And then add a Definition of Done
This is underrated.
Put something like this in your project:


# Definition of Done

A task is complete only when:

- [ ] Requirements implemented
- [ ] Existing architecture respected
- [ ] No unnecessary dependencies introduced
- [ ] Types pass
- [ ] Lint passes
- [ ] Relevant tests pass
- [ ] New behavior has tests
- [ ] Error paths considered
- [ ] Security implications considered
- [ ] Database migrations verified
- [ ] No secrets introduced
- [ ] Git diff reviewed
- [ ] No unrelated changes
- [ ] Documentation updated when behavior/architecture changed


# 13. Your "AI engineering toolbox"
- I'd build this gradually.

# Level 1 — You + Codex

- Learn:
AGENTS.md
Ask mode
Code mode
plans
verification
git

# Level 2 — Persistent workflows

- Learn:
Skills
project docs
architecture docs
ADRs
definition of done

# Level 3 — Specialized agents
- Learn:
research agent
planner
coder
reviewer
QA
security


# Level 4 — Parallel execution
- Learn:
task decomposition
independent workstreams
git worktrees
parallel agents
merge/review

# Level 5 — Autonomous loops
Learn:
agent → implement
       ↓
      test
       ↓
     failure
       ↓
      fix
       ↓
     review
       ↓
      test
       ↓
      ship

# Level 6 — Product engineering agents
- Then you can start doing:
idea
 ↓
market research
 ↓
customer research
 ↓
PRD
 ↓
architecture
 ↓
implementation
 ↓
QA
 ↓
analytics
 ↓
deployment
 ↓
monitoring

- One agent with excellent context beats five agents with poor context.


# Use another agent when there is a genuine reason:
independent investigation
independent review
parallel work
different expertise
fresh context
adversarial evaluation
Not simply because "multi-agent" sounds advanced

# adversarial review
You are a hostile senior reviewer.

Assume the implementation contains bugs.

Do not praise the implementation.

Try to break it.

Investigate:
- race conditions
- authorization
- malformed input
- concurrency
- retries
- partial failures
- stale state
- data corruption
- backwards compatibility
- performance
- observability
- test gaps

Only report actionable findings.

# Best of N
- Design 3 materially different architectures.

For each:
- architecture
- complexity
- scalability
- cost
- failure modes
- implementation effort

Then recommend one.


# Product development
                 IDEA
                  │
                  ▼
          MARKET RESEARCH
                  │
                  ▼
          COMPETITOR ANALYSIS
                  │
                  ▼
          USER / ICP ANALYSIS
                  │
                  ▼
             MVP SPEC
                  │
                  ▼
           PRODUCT DESIGN
                  │
                  ▼
           TECH ARCHITECTURE
                  │
                  ▼
              PLAN
                  │
                  ▼
          ┌───────┼────────┐
          ▼       ▼        ▼
       Backend  Frontend  AI
          │       │        │
          └───────┼────────┘
                  ▼
                 QA
                  │
                  ▼
              SECURITY
                  │
                  ▼
              DEPLOY
                  │
                  ▼
             ANALYTICS
                  │
                  ▼
             ITERATE

# You notice:
"I keep explaining how I want DB migrations done."

         ↓

Turn that process into:

database-migration/SKILL.md

         ↓

Next 50 projects:
agent already knows the process.

- I use AI to compress the entire software-development lifecycle.
- I design systems where agents perform most of the execution while I control intent, architecture, quality and product direction.

