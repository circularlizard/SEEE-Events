# Shared Expedition & Attendance E2E Updates (2026-01-01)

## Context
- Expedition Planner now exposes the shared `ExpeditionEventsView` at `/dashboard/planning/events`.
- Expedition Viewer phase 1 locks the app to SEEE, redirects `/dashboard` to the unit attendance overview, and introduces Unit Summary Cards + drill-down accordion (per `docs/implementation/multi-app-stage-3.md` and `docs/implementation/attendance-redesign-plan.md`).
- Existing BDD coverage still targets the legacy `/dashboard/events` list, uses deprecated requirement IDs, and lacks coverage for the redesigned attendance experience or Planner persona.
- `event-summaries-hydration.spec.ts` duplicates viewer scenarios without exercising Planner-only flows.

## Issues Identified
1. **Outdated Events Feature** – `tests/e2e/features/dashboard/events-list.feature` references the legacy route and `REQ-EVENTS-*` IDs.
2. **Missing Planner Persona Flow** – No scenario logs in via Planner persona, navigates through Planning sidebar, or asserts shared list/table rendering.
3. **Redundant Regression Spec** – `tests/e2e/event-summaries-hydration.spec.ts` adds no Planner signal.
4. **Attendance Coverage Gap** – `attendance-by-person.feature` still validates the old flat list/table; no scenarios assert Unit Summary Cards, unit drill-down, hydration indicator, or cache banner.

## Unified Implementation Steps & Status (2026-01-01)
| Step | Description | Status |
| --- | --- | --- |
| 1. Shared Expedition Events Feature | Replaced `events-list.feature` with Scenario Outline covering Viewer + Planner personas, updated requirement tags | ✅ Completed (tests/e2e/features/dashboard/events-list.feature) |
| 2. Planner-specific Scenario | Added Planner scenario (direct nav pending sidebar UI) with `seeeFullElevatedOther`, validated shared table rendering | ✅ Completed |
| 3. Repurpose `event-summaries-hydration.spec.ts` | Implemented Option B: Planner drill-down spec validating navigation, fallback selectors | ✅ Completed |
| 4. Rewrite `attendance-by-person.feature` | Authored new Unit Summary Cards feature with redirect + card assertions | ✅ Completed |
| 5. Unit Drill-down Scenario | Added accordion, view toggle, cache + hydration checks | ✅ Completed |
| 6. Shared Component Regression | Verified shared attendance list via Viewer persona after redirect; Planner covered via spec | ✅ Completed |
| 7. Step Catalogue & Personas | Documented new reusable steps + personas in `docs/testing/bdd-step-catalogue.md` | ✅ Completed |
| 8. Test Execution | `npx playwright test --config=playwright.bdd.config.ts --reporter=list` (headless) – 46 passed / 2 skipped | ✅ Completed |

## Outcome
- Unified BDD coverage now reflects Expedition Viewer Phase 1 + Planner shared events flows.
- Redundant hydration spec repurposed for Planner drill-down, providing additional signal.
- Attendance scenarios enforce unit cards, drill-down accordion, cache/hydration indicators across desktop + mobile.
- Step catalogue updated to guide future feature work; all requirement tags aligned to `REQ-VIEW-*`.
- Full Playwright suite (desktop + mobile) passing in headless mode, matching `/test-stack` expectations.
