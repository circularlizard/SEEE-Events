# Multi-App Stage 3 Plan

This plan sequencesthe remaining work to align the four-application architecture with the functional review. For each application we first update the master specification, then ship the required implementation changes, and finally refresh the E2E coverage to match the new behavior.

## Phase 1: Expedition Viewer **(Completed – 2026-01-01)**
- **Objective:** Provide SEEE leaders with a read-only view of all SEEE expeditions and consolidated attendance, tied permanently to the SEEE section with no section selector. All UX/state updates in this phase must also be consumable by the Expedition Planner app. @docs/implementation/functional-review.md#35-53
- **Specification Updates:**
  - Restate the app purpose: show SEEE expedition list plus consolidated attendee view (by patrol and per event) using cached patrol names; no other scopes besides `section:event:read`.
  - Capture the two mandatory views (Events list, Consolidated attendees) and note future extensibility via event custom fields reused by Planner.
  - Clarify that patrol ID→name mapping continues to come from Redis; document the dependency on admin-populated cache.
- **Implementation Tasks:**
  - Lock the viewer to SEEE section in routing/store layers and remove any section picker remnants.
  - Build/align the two primary views, ensuring consolidated attendees leverage cached patrol names and can later pivot on custom fields.
  - Share underlying components/query hooks with Expedition Planner to keep future Planner views in sync.
- **E2E Updates:**
  - Update viewer scenarios to cover SEEE-only login, events list visibility, consolidated attendee view, and cache usage messaging.
  - Add regression coverage proving viewer and planner consume the same views/components (e.g., shared step definitions/assertions).
  - ✅ Status: Completed via `docs/SPECIFICATION.md` updates (REQ-VIEW-14→17), rewritten `events-list.feature`, `attendance-by-person.feature`, Planner drill-down spec, and `/test-stack` execution on 2026-01-01.

## Phase 2: Expedition Planner
- **Objective:** Deliver the admin planning shell focused on member/event prep, using SEEE section defaults and broader scopes. @docs/implementation/functional-review.md#54-64 @docs/implementation/multi-app-part-2.md#57-60
- **Specification Updates:**
  - Define core Planner workflows (patrol refresh, walking/tent group management, event preparation) and required scopes.
  - Align the Planner navigation IA with Expedition Viewer (events list + consolidated attendees) while noting the planner-only dashboard remains separate.
  - Add requirements for reusing Platform Admin's patrol data view inside Planner so administrators do not need to switch apps.
  - Move the member data quality views (members list + issues) from the Data Quality app specification into the Planner specification to reflect their new destination.
  - Document Redis cache expectations and how planner seeds patrol cache for other apps.
- **Implementation Tasks:**
  - Build Planner layout with navigation and context-aware hydration queue, mirroring Expedition Viewer views for events and consolidated attendees.
  - ✅ Shared Expedition Viewer views now back both `/dashboard/planning/events` (list) and `/dashboard/planning/events/attendance[...]` (overview + drilldown) so nav parity is in place.
  - ✅ Integrated the Platform Admin patrol data view at `/dashboard/planning/patrol-data`, carrying over refresh tooling and admin guards.
  - Embed member data quality views sourced from the existing Data Quality app, keeping route guards/admin scopes intact.
  - Implement patrol refresh tooling and integration with flexi/badge adapters.
  - Ensure cache priming hooks run post login and on demand.
- **E2E Updates:**
  - Author scenarios covering planner login, navigation, patrol refresh success/failure, and cache priming visibility.
  - Cover resilience behaviors (rate-limit backoff indications, hydration progress bars).

_Next:_ Once navigation/view parity is locked in, extend the specification to capture walking group and tent group management (column mapping requirements, adapter expectations, admin workflows) before beginning the corresponding implementation tasks.

## Phase 3: OSM Data Quality Viewer
- **Objective:** Move member issues/data quality tooling into its dedicated multi-section app with section selector and robust cache usage. @docs/implementation/functional-review.md#65-79 @docs/implementation/multi-app-part-2.md#57-60
- **Specification Updates:**
  - Clarify multi-section permission rules, section picker UX, and main data quality dashboards.
  - Document progress indicators, cache expectations, and resiliency requirements for long hydration sessions.
  - Add required badge/flexi adapters for readiness signals.
- **Implementation Tasks:**
  - Migrate member issues views from shared dashboard into this app with improved progress feedback.
  - Wire section selector to permission-filtered sections, ensuring cache usage across sections.
  - Harden hydration queue against 429s with UI messaging.
- **E2E Updates:**
  - Update multi-section viewer BDD scenarios to confirm section selection, progress UI, cache hits, and error handling.
  - Add data-quality specific scenarios referencing mock data issues.

## Phase 4: Platform Admin
- **Objective:** Polish the platform-operations experience, focusing on tooling visibility (audit logs, data loading toolbar) without section context. @docs/implementation/functional-review.md#65-69 @docs/implementation/multi-app-part-2.md#58-63
- **Specification Updates:**
  - Rename surface areas ("Platform Operations"), enumerate available tools (cache views, API diagnostics, audit log), and confirm no section selector.
  - Document required scopes and guard rails for hardening access.
  - Specify telemetry display for rate limiting/backoff states.
- **Implementation Tasks:**
  - Surface data loading toolbar and telemetry indicators prominently.
  - Ensure audit log feed reflects console/maintenance actions in real time.
  - Tighten routing/guards so only platform-verified admins access this app.
- **E2E Updates:**
  - Add scenarios covering platform admin login, audit log visibility, telemetry display, and guard-rail redirects for non-admins.
  - Include regression tests for cache tools (viewing, not mutating) to ensure read-only policy.
