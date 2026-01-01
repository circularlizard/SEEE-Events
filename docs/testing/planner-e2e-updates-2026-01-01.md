# Planner E2E Coverage Updates (2026-01-01)

## Context
- Expedition Planner now exposes the shared `ExpeditionEventsView` at `/dashboard/planning/events` with a sidebar entry under Planning.
- Existing BDD coverage only validates the Expedition Viewer flows; Planner navigation and events list rendering are untested at the E2E layer.
- Requirement IDs in `events-list.feature` still use the deprecated `REQ-EVENTS-*` series, even though the specification now maps these behaviors to `REQ-VIEW-01` – `REQ-VIEW-04`.
- `event-summaries-hydration.spec.ts` duplicates the BDD “Event Detail Responsive Layout” scenario without covering any Planner-specific behavior.

## Issues Identified
1. **Outdated Feature File** – `tests/e2e/features/dashboard/events-list.feature` targets `/dashboard/events` only and references legacy requirement IDs.
2. **Missing Planner Coverage** – No scenario logs in via the Planner persona, uses the Planning sidebar, and asserts the shared events list/table renders.
3. **Redundant Regression Spec** – `tests/e2e/event-summaries-hydration.spec.ts` repeats viewer-only checks already handled by BDD, offering no Planner validation.

## Proposed Changes
1. **Replace `events-list.feature`** with a "Shared Expedition Events View" feature:
   - Scenario Outline with `appLabel` = Expedition Viewer | Expedition Planner.
   - Steps: log in with appropriate persona, verify sidebar entry, navigate to the app-specific events route, assert header/description, mobile cards, desktop table/empty state.
   - Tags: `@REQ-VIEW-01 @REQ-VIEW-03 @REQ-VIEW-04` (and any additional IDs once logistics columns land).
2. **Add Planner-specific Scenario** inside the new feature (or a companion feature) that:
   - Uses `seeeFullElevatedOther` persona.
   - Clicks "Events" under Planning and confirms the Planner page title/copy, list/table rendering, and filter fidelity.
3. **Remove or Repurpose `event-summaries-hydration.spec.ts`:**
   - If removed, rely on the updated BDD feature to cover shared component prefetching.
   - If retained, rewrite to exercise a Planner-only behavior (e.g., ensuring event detail drill-down works from `/dashboard/planning/events`).

## Next Steps
- Update requirement mappings in all affected feature files to the new `REQ-VIEW-*` IDs.
- Coordinate with future spec updates so the Planner scenarios also reference `REQ-PLAN-*` IDs once planner-only logistics features ship.
- After the BDD edits, run `/test-stack` to ensure Playwright snapshots remain green before landing the Planner route changes.

## Expedition Viewer Attendance Redesign – E2E Alignment (Jan 2026)

### Context
- Expedition Viewer phase 1 (see `docs/implementation/multi-app-stage-3.md`) locks the app to SEEE, redirects `/dashboard` to the unit attendance overview, and mandates shared components/hooks with Expedition Planner.
- Attendance redesign (`docs/implementation/attendance-redesign-plan.md`) introduced Unit Summary Cards, unit drill-down accordion with view toggle, automatic hydration indicator, and cache status messaging.
- Current BDD files cover the legacy list/table experience only; no scenarios assert the new overview/cards, drill-down, hydration indicator, or cache banner.

### Required Feature Updates
1. **`attendance-by-person.feature` rewrite**
   - Scenario Outline covering desktop/tablet vs mobile/card rendering of Unit Summary Cards (`@REQ-VIEW-14 @REQ-VIEW-17`).
   - Steps verifying patrol names resolve from cache, counts for attendees/events, and navigation when a card is activated.
2. **New unit drill-down scenario**
   - Assert accordion sections per event, By Event / By Attendee toggle, and that attendees respect patrol filters (`@REQ-VIEW-15`).
   - Validate cache freshness banner + hydration indicator (`@REQ-VIEW-05 @REQ-VIEW-16`).
3. **Shared component regression**
   - Add Scenario Outline ensuring both Expedition Viewer and Planner render the consolidated attendance table using the shared component (`@REQ-VIEW-04`), referencing each route.

### Test Plan
1. Update step catalogue with new reusable steps for "unit summary card", "hydration indicator", and "cache banner".
2. Modify `tests/e2e/features/dashboard/attendance-by-person.feature` and any linked step definitions.
3. Delete or repurpose outdated step definitions tied to the old flat list view.
4. Extend Playwright personas: ensure viewer persona defaults to `/dashboard` -> attendance redirect, while planner persona navigates through sidebar to shared routes.
5. Execute `/test-stack` locally, inspect Playwright traces for mobile + desktop viewport assertions, then land changes alongside the viewer redesign PR.
