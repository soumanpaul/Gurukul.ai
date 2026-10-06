# Hackathon versions — V1 demo and V2 activation

Current selection: **V2 activated** (2026-10-06). These rollout labels do NOT mean the original full-V1 requirements or T8 release gates passed. This document governs temporary feature visibility; existing architecture/UX contracts remain.

## Single switch

`src/domain/product-version.ts`:

```ts
export const productVersion: ProductVersion = 'v2';
```

`featuresFor` supplies the shared `fullStudy` gate. `app/routes.ts` provides `defaultRoute`, `routeEnabled`, `resolveRoute` and `visibleTabs`. AppShell resolves every requested route before rendering. The choice is compiled into the app, not a hidden user toggle, server setting or database migration.

## Feature split

| Flow | V1 demo | V2 |
| --- | --- | --- |
| Book → robot startup splashes; logout resets first splash | Enabled; future features labeled V2 | Enabled with normal copy |
| Local name, language preference, avatars, profile editing | Enabled | Enabled |
| Teacher setup/download/cancel/retry/reuse and Manage model | Enabled | Enabled |
| Default destination | AI Buddy | Home |
| Bottom tabs | AI Buddy, Settings | Home, AI Buddy, Progress, Settings |
| Buddy introduction, local chat/context, history/New chat, stop/retry, confirmed chat deletion, Explore | Enabled | Enabled |
| Buddy Practice / Review practice shortcuts | Hidden/disabled | Restored |
| Home carousel, create/View all notebooks, explicit import destination | Disabled | Restored |
| TXT/PDF/JPEG/PNG/camera, extraction/OCR, review/edit, revisions/indexing | Enabled only through Buddy file chats; standalone Home/paste remains disabled | Full notebook inputs restored |
| Notebook Sources/Study/History, scoped summary/ask/explain, citations | Scoped source-backed Buddy file chats enabled; full notebook navigation disabled | Restored inside notebooks, not a standalone bottom Study tab |
| 3/5-question quizzes, saved attempts, deterministic/idempotent scoring | Disabled | Restored |
| Progress/review, repeats, ambiguity flags, evidence/history | Disabled | Restored |
| Settings profile/language, Manage model, Privacy, Log out | Enabled | Enabled |
| Settings notebook/source Manage storage and Delete study data | Hidden/disabled, so no backdoor to retained study data | Restored with confirmation/cleanup |
| User-accessible T0 diagnostics | Disabled | Restored |

All feature files, database records/tables, migrations, assets and tests remain. Switching versions does not delete or rewrite notes, attempts, history or installed models. Startup interruption recovery remains; changing the switch launches no import/quiz/inference jobs. Engineering debug launch-argument smoke hooks remain developer-only and must not be used as public demo routes. This is feature gating, not authentication/security isolation.

## Later: activate V2

Give the agent this prompt:

> Read AGENTS.md, docs/engineering/state.md and docs/plans/demo-v1-v2.md. Activate V2 by changing the single productVersion value to 'v2'. Preserve both splash screens, Buddy introduction/history, profile/avatar, existing notes/attempts and installed model. Restore every V2 feature using existing code; do not reimplement, reset storage, uninstall, regenerate assets or add cloud services. Verify restored routes, Buddy shortcuts, notebook import/source selection/Study, quiz/progress and Settings storage confirmation with focused checks. Rebuild/install in place if authorized; report actual phone checks separately from pending gates. Update state.md. Do not commit or publish.

Checklist:
1. Change only the value to `'v2'` initially; all gates follow automatically. Keep V1 support and every gated implementation.
2. Typecheck, lint changed files and run `node --experimental-strip-types --test tests/product-version.test.mjs`. Both explicit version policies must pass regardless of the selected version.
3. Run affected foundation/import/study/quiz/progress/storage tests only if their behaviors change. Existing full-feature iOS tests assume V2; `testV1BuddyOnlyDemo` assumes V1. Do not run incompatible version-specific UI assertions together.
4. Verify four tabs/Home default; Sources/Study/History through notebooks; Buddy shortcuts to Progress/Home; Settings storage controls; preserved data/model without another download.
5. Retain accessible keyboard/large-text layouts, cancellation, source validation and honest capability labels. A restored feature is not proof of quality or phone support.
6. Record build/device results and remaining T8/T9 limitations. Historical broad-answer reliability and fixed-corpus quiz failures still block full release unless separately fixed/evaluated.

## V1 verification

Host policy tests cover both versions, disabled-route redirection and shared secondary-entry gates. Buddy host checks cover context/history/cancellation. Native test `GurukulT7UITests/T7UITests/testV1BuddyOnlyDemo` covers splashes/setup, allowed tabs, Buddy history/Explore, absent practice/storage/diagnostics, logout Cancel/confirm and installed-teacher reuse. No model-quality or offline-network acceptance is implied.

Keep existing UX: `docs/UX/splash/`, `15-ai-buddy.md`, `16-ai-buddy-welcome.md`, `14-welcome-profile.md`, `13-settings-overview.md`. No new artwork needed. Actual evidence is recorded in state.md.
