---
summary: Alignment plan for the OSM Data Quality app
owners:
  - platform
status: draft
last_updated: 2026-01-10
---

# Data Quality App Alignment Plan

## 1. Objectives
- Establish a dedicated routing/layout shell for the Data Quality application that mirrors the Expedition Viewer/Planner polish while enabling multi-section access.
- Ensure section switching, hydration, and TanStack Query caches operate under a `data-quality` namespace so admins can work across any permitted section.
- Align page views (landing, members list, issues, upcoming readiness dashboards) with the UI/UX patterns already delivered in the Expedition Viewer and Planner apps.
- Standardize data loading telemetry and export capabilities so every Data Quality surface participates in the shared export context contract (REQ-VIEW-13A) and hydration queue messaging.

## 2. Current State & Gaps
1. **Routing & Layout:** Data Quality routes piggyback on `/dashboard/planning` (SEEE-only) rather than a `(data-quality)` group. The nav shell shows Planner entries and the app label/currentApp never switches away from `planning`.
2. **Section Switching:** The section selector writes selections, but `useMembers` and related hooks default to the Planner namespace, so React Query keys and caches stay pinned to SEEE. Multi-section admins cannot meaningfully change context.
3. **Page Coverage:** Only the member issues accordion exists. There is no Data Quality landing page, members index, or readiness/patrol adapters despite the Phase 3 spec.
4. **Data Loading & Exports:** Although the issues view uses the export context API, other Data Quality views lack standardized export registration and hydration progress indicators tied to the queue toolbar.
5. **Testing/Docs:** Existing E2E/component tests assert Planner behavior only; Data Quality requirements (multi-section permissions, selector-first render) lack coverage and documentation.

## 3. Workstreams & Tasks

### 3.1 Routing & Layout Shell
1. Introduce `src/app/dashboard/(data-quality)/layout.tsx` that sets the store `currentApp` to `'data-quality'`, renders the shared providers, and enforces admin-only guards plus selector-first rendering.
2. Add `src/app/dashboard/(data-quality)/page.tsx` as a landing card grid (hero, links to Members, Issues, future readiness) similar to the Multi-Section dashboard but scoped to data quality workflows.
3. Update `nav-config` with a dedicated `dataQualityNav` (Members list, Member Data Issues, Readiness Dashboard placeholder) instead of reusing `multiNav` so the sidebar reflects the correct IA.
4. Wire the login selection and route guards (`getRequiredAppForPath`) to point `/dashboard/data-quality/*` to the new shell and default path `/dashboard/data-quality`.

### 3.2 Section Selector & Store Integration
1. Enhance the Zustand store to remember the last section per app and ensure `currentApp` flips based on route detection. Persist `data-quality` selections separately so switching back to Planner does not override them.
2. Refactor shared hooks (`useMembers`, hydration queue helpers) to read the active app key from `currentApp` (falling back only when unset) so query keys become `membersKeys.section('data-quality', sectionId, termId)`.
3. Ensure `/dashboard/data-quality` renders the `SectionSelector` (full-screen) whenever no valid section is selected, satisfying REQ-AUTH-08 and multi-section permission checks.
4. When switching sections via sidebar or `/dashboard/section-picker`, clear only the `data-quality` query caches and hydration queue entries, maintaining isolation from Planner caches.

### 3.3 Page View Alignment
1. **Members List:** Port the Planner members table/cards into `data-quality/members`, keeping progressive enrichment banners and admin-only controls. Register export contexts for the list.
2. **Member Issues:** Move `MemberIssuesClient` under the Data Quality routes but keep it shareable by Planner (e.g., via a domain component). Update detail links to route to a Data Quality-aware member detail surface or deep-link back to Planner with explicit context.
3. **Future Dashboards:** Stub routes/components for patrol readiness and badge/flexi adapters per Phase 3 documentation, ensuring they consume the normalized data from `src/lib/api.ts` and `src/lib/schemas.ts`.
4. Apply the UI standards (page padding, table vs. card responsive behavior, export button placements) so Data Quality matches the renovated Viewer/Planner look and feel.

### 3.4 Data Loading & Exports
1. Connect the Data Quality shell to the shared hydration progress toolbar and queue telemetry so admins see per-source progress across sections.
2. Expose the "Load data" bulk action globally within the Data Quality app (e.g., top-level banner) and allow admins to enqueue hydration for all pending members across the selected section.
3. Ensure every table registers an export context (spreadsheet + PDF) and surfaces the shared export dropdown in the header. Verify exports filter to on-screen rows and respect current sort order.
4. Validate that export execution still pipes through `/api/proxy` and does not leak PII to local storage, aligning with REQ-PLAN-07.

### 3.5 Testing, Telemetry, and Documentation
1. **Unit/Component Tests:** Add coverage for the new layout, nav switching, section selector behavior, and Data Quality members/issues components using mocked stores and hooks.
2. **BDD/E2E:** Extend Playwright scenarios to cover multi-section admins switching sections, hydrating data, and exporting reports inside the Data Quality app (including permission denial flows).
3. **Docs:** Update `docs/SPECIFICATION.md`, `ARCHITECTURE.md`, and related implementation plans to document the Data Quality route structure, section switcher behavior, and export telemetry expectations.
4. **Telemetry:** Ensure rate-limit/backoff messaging already implemented in the safety layer surfaces in Data Quality hydration banners; add logging for section switch events to aid debugging across multiple sections.

## 4. Risks & Mitigations
- **Cache Contention:** Sharing `useMembers` across apps may result in stale data. Mitigation: namespace query keys by app and flush caches on app switch.
- **Selector Flash:** Forgetting selector-first rendering will cause UI flash when no section is selected. Mitigation: guard routes with a selector gate (render SectionSelector until `currentSection` exists).
- **Export Drift:** Multiple export menus increase the risk of inconsistent schemas. Mitigation: centralize export context creation in shared hooks/components and add unit tests for the registered columns/rows.
- **PII Exposure:** Multi-section data contains sensitive contact info. Mitigation: continue avoiding localStorage persistence, reuse existing redaction helpers, and verify logs exclude PII.

## 5. Validation Checklist
- [ ] Navigating to `/dashboard/data-quality` shows the new landing page and prompts for section selection if none is chosen.
- [ ] Section switching updates the store, clears Data Quality caches only, and re-hydrates members/issues for the newly selected section.
- [ ] Members list and data issues views load data via the `data-quality` query namespace, display hydration progress, and allow exports.
- [ ] Playwright scenarios confirm multi-section admins can switch sections, hydrate data, and download both export formats without errors.
- [ ] Documentation reflects the new app structure and testing artefacts cite `REQ-DQ-*` identifiers.
