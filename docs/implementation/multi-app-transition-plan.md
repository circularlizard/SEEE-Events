---
phase: multi-app-platform-transition
summary: Step-by-step plan to evolve the SEEE dashboard into the multi-application platform (Event Planning, Expedition Viewer, Platform Admin, Multi-Section Viewer)
---

# Multi-App Platform Transition Plan

## 1. Preconditions & Hardening
- [x] Complete Platform Hardening backlog (section picker fix, hydration stability, logging/telemetry gaps) — tracked in @docs/completed-plans/platform-hardening-plan-completed-2025-12-22.md.
- [x] Confirm Redis keys (`platform:seeeSectionId`, `platform:allowedOperators`) exist with safe defaults.  
  _Recommended defaults:_ `platform:seeeSectionId = "43105"` (SEEE canonical section ID) and `platform:allowedOperators = ["david.strachan@mac.com"]`. Store values as JSON strings in Vercel KV so the Platform Admin console can edit them later.
- [x] Audit MSW fixtures to ensure admin vs standard flows can be tested independently.  
  _Audit outcome:_ existing handlers provide a single data shape; add variant fixtures before multi-app rollout — (1) standard viewer dataset limited to allowed patrols/events, (2) platform-admin telemetry/cache endpoints, (3) document flag in README for switching fixtures during Playwright runs.

### Follow-up actions from preconditions
- [x] Add a bootstrap script (or admin console action) that seeds the recommended KV defaults when missing, and document the command in README.  
  _Done:_ `scripts/seed-platform-defaults.mjs` seeds `platform:seeeSectionId` + `platform:allowedOperators`; usage documented in README "Quick Start" + Redis sections.
- [x] Create MSW fixture variants and wiring:
  - [x] `MSW_MODE=admin` → multi-section data (events + members + patrol/flexi/startup).
  - [x] `MSW_MODE=standard` → event-only dataset (members/patrol/flexi/startup redacted).
  - [x] `MSW_MODE=admin,platform` → enables telemetry/cache fixtures on top of admin data.
  - [x] Document how to switch modes in README + test workflows so Playwright suites cover both roles.
  _Notes:_ README now includes MSW mode table + combined-mode examples; handlers gate data per `MSW_MODE`.

## 2. Session & State Plumbing
- [x] Extend Zustand session store to include `currentApp` alongside `currentSection` and `userRole`.  
  _Done:_ `src/store/use-store.ts` now persists `currentApp`, wipes it on logout, and exposes `useCurrentApp`.
- [x] Mirror `currentApp` in server session helpers so App Router layouts can read it during SSR.  
  _Done:_ NextAuth JWT/session callbacks (`src/lib/auth.ts`) emit `session.appSelection`, and `src/types/next-auth.d.ts` exposes the field.
- [x] Add selectors/helpers (`isPlanningApp`, `isExpeditionApp`, etc.) used throughout components.  
  _Done:_ `use-store` exports `useIsPlanningApp`, `useIsExpeditionApp`, `useIsPlatformAdminApp`, `useIsMultiApp`, plus `getCurrentApp`.
- [x] Wire StartupInitializer + auth callbacks to set `currentApp` immediately after login so `requiredApp` guards have data on first render.  
  _Done:_ `StartupInitializer` consumes `session.appSelection` and hydrates the store; auth callbacks hydrate `token.appSelection`.

## 3. Routing & Layout Split
- [ ] Introduce app-specific route groups under `/dashboard/(planning|expedition|platform-admin|multi)`.
- [ ] Update shared dashboard layout to render app-aware navigation: unique sidebar links per app, shared header components.
- [ ] Add route metadata (e.g., `export const requiredApp = 'planning'`) consumed by middleware/guards.

## 4. Auth & Application Selection
//TODO: Consider how that role selection modal should be enhanced to capture desired app
- [ ] Enhance the role selection modal to capture desired app; default to Expedition Viewer for standard users until other apps GA.
- [ ] Map `(role, app)` to NextAuth providers:
  - Planning & Platform Admin → `osm-admin`
  - Expedition Viewer → `osm-standard`
  - Multi-Section Viewer → placeholder `osm-multisection` (flagged TODO until ready)
- [ ] Persist `{ currentApp, currentSection }` immediately after login; ensure redirect/callback honors both values.
- [ ] Update middleware + client guards to enforce `requiredApp` and `requiredRole` before rendering routes.

## 5. State & Data Layer Adjustments
- [ ] Namespace TanStack Query keys per app (`['planning', 'events']`, `['expedition', 'summaries']`).
- [ ] Inject SEEE section ID automatically in planning/expedition/platform-admin data hooks; hide section selector for these apps.
- [ ] Ensure hydration queues rerun whenever a SEEE app mounts so Expedition Viewer benefits from admin-triggered refreshes.
- [ ] Feed platform metadata (section ID, allowlists, developer toggles) from Redis into StartupInitializer.

## 6. Platform Admin Console MVP
- [ ] Scaffold `/dashboard/(platform-admin)` routes with protected navigation.
- [ ] Implement panels:
  - Patrol/member cache board with refresh controls
  - SEEE section ID viewer/editor (writes to Redis)
  - Developer tools drawer (MSW toggle, rate-limit simulator, proxy inspector)
  - Log viewer stub (pulls recent proxy logs)
- [ ] Emit audit events (user, timestamp, payload) for every console action; display recent entries in-console.

## 7. Expedition & Planning Shell Refinements
- [ ] Move existing admin-only tooling (member issues, patrol refresh) under the planning route group.
- [ ] Keep Expedition Viewer focused on events/logistics/attendance; ensure admin-only buttons hide automatically for standard users.
- [ ] Ensure both apps share hydration status banners and rate-limit notices.

## 8. Multi-Section Viewer Preparation
- [ ] Create `/dashboard/(multi)` placeholder routes that reuse Expedition Viewer components but leave the section selector enabled.
- [ ] Document TODO for `osm-multisection` provider + generalized hydrators (see `docs/future/platform-strategy-analysis.md` §6) and guard with feature flag until ready.
- [ ] Verify access-control selectors gracefully no-op for multi-section flows (OSM scopes already limit accessible sections).
- [ ] Add MSW fixtures for multiple sections to unblock E2E tests.

## 9. Testing & Tooling
- [ ] Expand unit tests for Zustand session store + selectors that depend on `currentApp`.
- [ ] Update Playwright BDD scenarios to cover all `(role, app)` combinations and ensure unauthorized app access is blocked.
- [ ] Update `/test-stack` workflow to include new route groups and console flows.
- [ ] Document local testing instructions (e.g., how to set `platform:allowedOperators`, switch apps) in README.

## 10. Rollout & Documentation
- [ ] Provide migration guidance for contributors (doc + Loom/video) showing how to work within the new route groups.
- [ ] Update `docs/SPECIFICATION.md` and `docs/ARCHITECTURE.md` references when milestones complete.
- [ ] Once multi-section viewer is production-ready, promote it from placeholder to GA by enabling the new provider and hydrators.
