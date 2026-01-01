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
