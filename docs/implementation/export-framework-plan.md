# Export Framework & Event Participant Report Plan

## 1. Objective
Deliver a reusable export capability that lets any dashboard view expose "download what I see" functionality in spreadsheet (XLSX) and PDF formats. The first supported surface is the Expedition Viewer event participant report (participants grouped by unit). The plan honors the read-only contract from @docs/ARCHITECTURE.md and requirements REQ-VIEW-10 → REQ-VIEW-13 from @docs/SPECIFICATION.md.

## 2. Scope & Constraints
- **Visible data only:** exports must reflect the exact rows, filters, column toggles, and ordering currently rendered on screen.
- **Read-only:** no new POST/PUT calls to OSM; exports happen client-side from already fetched data. Cached data stays in TanStack Query/Zustand.
- **Formats:** Spreadsheet (.xlsx via SheetJS) and PDF (react-pdf) launched from the same UI entry point.
- **First adopter:** Expedition Viewer → Event detail page (participants by unit) under `src/app/dashboard/(expedition)/events/[id]/EventDetailClient.tsx`.
- **Extensibility:** Architecture must scale to consolidated attendance, planner logistics, and future data-quality views without duplicating logic.

## 3. Current State Summary
- Participant data already normalized in `EventDetailClient` via `useEventDetail`, `useEventSummaryCache`, and `usePatrolMap`.
- No shared abstraction for “exportable view data.” Each page manages its own derived arrays.
- Docs mention desired exports (SPEC §3.3.4, ARCH §8.1–8.2) but lack implementation detail, triggering this plan.

## 4. Proposed Architecture Additions
1. **Export Context Contract** (`src/lib/export/types.ts`):
   - `ExportColumn { id, label, type, formatter? }`
   - `ExportRow { [columnId]: string | number | null }`
   - `ExportViewContext { id, title, filters, columns, rows, source }` where `source` captures route + applied filters for auditing.
2. **Export Registrar Hook** (`src/hooks/useExportContext.ts`):
   - Consumer pages call `useExportContext(viewContext)` so the global exporter menu always receives up-to-date, filtered data.
   - Stores data in a lightweight Zustand slice (no server round-trips).
3. **Exporter Service Layer** (`src/lib/export/service.ts`):
   - Accepts an `ExportViewContext` plus format and dispatches to formatters.
   - Handles filename generation (`${viewId}-${timestamp}`) and ensures blob download via browser APIs.
4. **Formatters** (`src/lib/export/formatters/*`):
   - **SpreadsheetFormatter (SheetJS):** Maps columns to worksheet headers, preserves ordering, applies simple column width heuristics.
   - **PdfFormatter (react-pdf):** Builds a table with header, body, footer showing filters. Reuses Tailwind tokens via a shared theme map to ensure brand alignment.
5. **UI Componentry** (`src/components/domain/export/ExportMenu.tsx`):
   - Renders a Button + Dropdown (shadcn) listing "Download spreadsheet" and "Download PDF".
   - Disabled state when no export context registered or rows empty.
   - Provides inline hint about filters being respected.
6. **Telemetry Hook (future-ready):** capture download events (format, row count) via existing logging utilities in `src/lib/logger.ts` once instrumentation backlog allows.

## 5. Implementation Phases
### Phase A – Foundations
1. Create export types + service layer files under `src/lib/export/` with accompanying unit tests (REQ-VIEW-10/12 coverage references in describe blocks).
2. Add `useExportContext` hook + Zustand slice in `src/store/export-store.ts`. The slice stores the latest `ExportViewContext` keyed by route id.
   - For the MVP, allow views to pass context directly into `<ExportMenu>` (prop-based) so we can ship export locally without requiring a global header/shell integration.
3. Build spreadsheet and PDF formatters with unit tests covering:
   - Column ordering
   - Filter metadata inclusion
   - Unicode name rendering (scout names, patrols)
4. Introduce `<ExportMenu>` component with Jest + Testing Library interaction tests to verify disabled/enabled states and format selection.
5. Ensure formatter dependencies are lazy-loaded (dynamic import) so `xlsx` / `react-pdf` are only fetched when the user initiates an export.
6. Defer CSV output initially: the MVP delivers XLSX + PDF; add a CSV formatter later if required by downstream workflows.

### Phase B – Expedition Viewer Participant Export
1. Extend `EventDetailClient`:
   - Clarify the MVP export reflects the existing participants list/table with a Unit column (it does not invent grouping beyond what is visible on screen).
   - Derive `exportColumns` from existing visible columns (Name, Unit, Attendance, Age, dynamic custom fields).
   - Derive `exportRows` from `participants` memo so filters/sorts already applied, and ensure row order matches the current on-screen sort.
   - Do not export hidden/raw fields (e.g., export Age, but do not export DOB unless DOB is displayed).
   - Choose breakpoint fidelity: export the columns currently visible for the active layout (desktop table vs mobile card fields), to satisfy “only the data displayed on screen”.
   - Compose `ExportViewContext` with event metadata + current filters and pass into `useExportContext` (or provide it directly to `<ExportMenu>` for the MVP).
   - Place `<ExportMenu>` near the table/card controls (adjacent to filters) aligned with UI rules in @docs/ARCHITECTURE.md §6.
2. Wire the menu to call the export service for whichever format users select.
3. Add regression tests:
   - Component test stubbing `useExportContext` to confirm the correct context payload.
   - E2E BDD scenario (viewer) validating that downloads trigger using Playwright’s download assertions (e.g., filename extension and non-zero content).

### Phase C – Documentation & Future Rollout
1. Update `docs/SPECIFICATION.md` §3.3.4 to describe the reusable export framework and note Expedition Viewer adoption as REQ-VIEW-10/12 MVP.
2. Update `docs/ARCHITECTURE.md` §8 to document the export module layout (types, service, formatters, UI) and clarify client-side generation + filter fidelity.
3. Outline future adopters (consolidated attendance, planner logistics, data-quality tables) in `IMPLEMENTATION_PLAN.md` referencing this plan.
4. Track follow-up work in `IMPLEMENTATION_PLAN.md` checklist items (e.g., “Export framework Phase B complete” gates subsequent rollouts).

## 6. Risks & Mitigations
- **Large payloads:** For events with hundreds of participants, client memory may spike. Mitigation: defer formatting work to idle callbacks (`requestIdleCallback`) when available; chunk row processing in spreadsheet formatter.
- **PDF layout drift:** React-PDF styles differ from Tailwind. Centralize tokens and snapshot test sample exports.
- **Browser API limits:** Ensure graceful errors if `URL.createObjectURL` or `navigator.msSaveBlob` fail; show toast via existing alert utilities.
- **Accessibility:** Export button must be reachable via keyboard and announce file type in aria-label.

## 7. Testing Strategy
- **Unit:** Service + formatter tests (Jest) asserting column fidelity, filter metadata, filename patterns.
- **Component:** `<ExportMenu>` interactions, `EventDetailClient` context emission.
- **E2E / BDD:** Update Expedition Viewer scenarios with `@REQ-VIEW-10` & `@REQ-VIEW-12` tags verifying export menu presence and download initiation.
- **Mutation testing:** Extend `/mutation-scan` focus set with exporters once core logic lands.

## 8. Deliverables Checklist
- [x] Export types + service + formatters with tests
- [x] `useExportContext` hook and Zustand slice
- [x] `<ExportMenu>` component
- [x] Expedition Viewer participant export integration
- [x] SPEC & ARCH updates referencing export framework (already documented)
- [x] BDD + component tests covering export UI
