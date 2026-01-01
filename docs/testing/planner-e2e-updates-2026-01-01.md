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

## Unified Implementation Steps
1. **Author Shared Expedition Events Feature**
   - Replace `events-list.feature` with a "Shared Expedition Events View" Scenario Outline parameterized by `appLabel` = Expedition Viewer | Expedition Planner.
   - Steps include persona-specific login, sidebar/menu assertion, navigation to each route (`/dashboard/events` -> redirect, `/dashboard/planning/events`), and verification of headers, mobile cards, desktop tables/empty state (`@REQ-VIEW-01 @REQ-VIEW-03 @REQ-VIEW-04`).
2. **Add Planner-specific Scenario**
   - Within the new feature (or companion feature), add an explicit Planner persona scenario using `seeeFullElevatedOther`, clicking “Events” under Planning, and confirming planner copy, filters, and shared table rendering.
   - Reference planner requirement IDs once `REQ-PLAN-*` mapping is available.
3. **Retire or Repurpose `event-summaries-hydration.spec.ts`**
   - Option A: Remove the spec and rely on the updated BDD outline for hydration regression.
   - Option B: Rewrite to validate a Planner-only behavior (e.g., drill-down from `/dashboard/planning/events`).
4. **Rewrite `attendance-by-person.feature`**
   - Scenario Outline covering desktop/tablet vs mobile rendering of Unit Summary Cards, verifying patrol names from cache, attendee/event counts, and navigation from card to `/dashboard/events/attendance/[unitId]` (`@REQ-VIEW-14 @REQ-VIEW-17`).
5. **Add Unit Drill-down Scenario**
   - Assert event-grouped accordion sections, By Event / By Attendee toggle, and patrol filtering for the selected unit (`@REQ-VIEW-15`).
   - Validate cache freshness banner + hydration progress indicator (`@REQ-VIEW-05 @REQ-VIEW-16`).
6. **Shared Component Regression**
   - Scenario Outline confirming both Viewer and Planner render the consolidated attendance table using the shared components/hooks (`@REQ-VIEW-04`), ensuring cache messaging is consistent.
7. **Step Catalogue & Personas**
   - Extend `bdd-step-catalogue.md` with reusable steps for unit summary cards, hydration indicator, cache banner, and Planning sidebar navigation.
   - Ensure Viewer persona defaults to `/dashboard` (attendance redirect) while Planner persona navigates through Planning sidebar.
8. **Test Execution**
   - Update requirement tags to `REQ-VIEW-*` and future `REQ-PLAN-*`.
   - Run `/test-stack`, inspect Playwright traces for both desktop and mobile, and land changes with attendance redesign PR to keep scenarios in sync.
