# Platform Strategy Analysis (21 Dec 2025)

This note consolidates the current specification gaps, the guidance from `docs/future/*`, and a strategy for evolving SEEE’s dashboard into a multi-application platform.

---

## 1. Outstanding Requirements from `docs/SPECIFICATION.md`

| Area | Status | Notes |
| --- | --- | --- |
| Session timeout + callback (`REQ-AUTH-11/12`) | ❌ | Idle timeout/redirection flow still missing. |
| Event detail wiring (`REQ-EVENTS-03/04/05`) | ⏳ | Invitation status shown, but unit filter + detail page polish incomplete. |
| Logistics view (`REQ-LOGISTICS-01`–`03`) | ❌ | No dynamic column mapping, expedition/tent/gear/notes columns yet. |
| Training readiness (`REQ-TRAINING-01`–`03`) | 🔄 deferred | Requirement moved to Future Scope (Spec §7). |
| Participation summary (`REQ-SUMMARY-01`–`10`) | 🔄 deferred | Requirement moved to Future Scope (Spec §7). |
| Reporting & export (`REQ-REPORTING-01`–`04`) | ❌ | CSV/XLS/PDF export stack + formatting requirements untouched. |
| Admin data quality views (`REQ-ADMIN-01`–`07`) | ⏳ | Patrol refresh exists; member issues list + accordions/tests outstanding. |
| QA automation (`REQ-QA-02`–`05`) | ⏳ | CI covers basics; need mutation-score enforcement + workflow documentation parity. |
| Architecture safeguards (`REQ-ARCH-01`–`18`) | ⏳ | Proxy exists, but rate-limit telemetry, retry suppression, abort support, and logging controls need verification/tests. |
| Access control config (`REQ-ACCESS-04`–`08`) | ⏳ | Strategies defined; production-grade enforcement + configuration UI/tests still missing. |
| UI non-functionals (`REQ-NFR-01`–`03`) | ⏳ | Theme tokens + responsive polish still tracked in Phase 3 plan. |

Legend: ❌ = not started, ⏳ = in progress/partial.

---

## 2. Future Documents Snapshot

1. **Phase 3 Detailed Plan**  
   Focuses on closing current dashboard scope (event detail, attendance grouping, mobile/table polish, auth E2E, dashboard overview, patrol mapping). Logistics/training/first-aid deferred to Phase 7. Highlights remaining testing gaps (component + Playwright for grouping, responsive layouts, auth flows).

2. **Quartermaster Requirements**  
   Describes a future kit inventory + issuance + reservation system built on OSM auth. Emphasizes mobile usability, check-in/out flows, reporting, auditing, and outstanding design questions (reuse OSM QM vs custom storage, permission scoping, data retention).

3. **What’s Next**  
   Short backlog: finish member viewer/issues, update docs, improve dashboard/landing page, deploy to Vercel, formalize Quartermaster + Expedition Planner + Training app specs, and add PDF attendee exports.

---

## 3. Current Application Reality

We effectively operate **three parallel applications** today, expressed via role selection rather than explicit app selection:

1. **SEEE Event Planning** (current “Administrator” role)  
   - Audience: SEEE core admin team.  
   - Scope: Event creation/planning helpers, member data quality, patrol refresh tooling.  
   - Section behavior: Always SEEE → section selector can be removed, enabling SEEE-specific assumptions (patrol IDs, flexi columns, badges).

2. **SEEE Expedition Viewer** (current “Standard Viewer” role)  
   - Audience: SEEE expedition leaders.  
   - Scope: Read-only expedition dashboards (events list, attendance, logistics).  
   - Section behavior: Always SEEE → also dispense with selector to simplify UX/data constraints.

3. **Multi-Section Viewer (future)**  
   - Audience: Wider Edinburgh units or other groups.  
   - Scope: Shares event/member/data-quality viewers but must handle selectable sections and more generalized schemas.

**Implication:** we should stabilize the shared platform, then formalize these apps (two SEEE-specific, one multi-section) before attempting a generalized multi-app shell.

---

## 4. Categorized Workstreams

### 4.1 Base Platform Fixes & Hardening

1. Session timeout + callback implementation (`REQ-AUTH-11/12`).
2. Rate-limit telemetry, abortable fetch helpers, logging-level controls, retry suppression (`REQ-ARCH-01`–`18`).
3. Access-control enforcement + configuration tooling (`REQ-ACCESS-04`–`08`).
4. CI parity tasks: mutation-test alerting, workflow documentation sync (`REQ-QA-02`–`05`).
5. UI polish + responsive tables/cards per Phase 3 §§3.3–4 (meets `REQ-NFR-01`–`03`).

### 4.2 Complete Current SEEE Expedition Scope

1. Event detail polish: unit filter wiring, patrol name rendering, component/E2E tests.
2. Logistics view: dynamic column mapping, expedition/tent/gear/notes columns, First Aid summary (Phase 7 kickoff).
3. Training readiness matrix with Flexi vs Badge data abstraction.
4. Participation summary matrix (grouping, filtering, sorting, access-aware).
5. Reporting/export stack (CSV/XLS/PDF with filter fidelity).
6. Admin member issues UI + patrol refresh tests.
7. Regression coverage: React Query hooks, responsiveness, auth flows.

### 4.3 New Applications / Expanded Scope

1. **Quartermaster app** – inventory, issuance, reservations, reporting, auditing; determine OSM integration vs bespoke store.  
2. **Expedition planner** – richer planning workflows (patrol selection, kit requirements, risk assessments).  
3. **Training application** – dedicated badge/quizzing workflows, potential write-back to OSM custom badges.  
4. **PDF record cards** – cross-app export use case.  
5. Documented deployment (Vercel) + landing page refresh to support multiple audiences.

---

## 5. Multi-Application Strategy (Post-Hardening)

### Option A – Fork per App
- **Pros:** Independent release cadence; tailored UX without shared constraints.
- **Cons:** Duplicated proxy/auth/rate-limit stack; harder to keep security patches synchronized; fragmented user experience.

### Option B – Multi-App Platform (Recommended, after hardening)
- Single Next.js codebase with an **application selector** layered on top of existing role/section selection.
- Shared infrastructure: OSM OAuth, proxy/rate limiting, Redis caches, TanStack Query providers, and UI shell.
- Route groups per app (`/dashboard/(expedition)`, `/dashboard/(quartermaster)`, etc.) with app-aware navigation and feature flags.
- Zustand stores `{ currentApp, role, section }`; TanStack Query keys namespaced per app.
- Shared components (member directory, patrol map) reused with feature toggles; reduces duplication and keeps UI consistent.

### Implementation Considerations (Sequenced)
1. **Auth Scopes:** Extend role modal to capture both Role and Application → map to provider scopes (e.g., Expedition Standard vs QM Manager).  
2. **Routing & Layout:** Application-aware sidebar + breadcrumbs; “Shared screens” exposed via cross-app routes when audiences overlap.  
3. **Data Contracts:** Keep Zod schemas in `src/lib/schemas.ts`; add app-specific adapters but re-use proxy helpers.  
4. **State Management:** Maintain split state (TanStack Query for server data, Zustand for UI/app context).  
5. **Testing:** Expand BDD suite with `@REQ-APP-*` tags per application; ensure CI covers each app’s critical flows.  
6. **Security:** If an app eventually needs write access (e.g., Quartermaster), isolate API routes and storage, enforce least-privilege scopes, and keep Expedition app read-only.

---

## 6. Recommended Sequencing

1. **Platform Hardening (in-flight)**  
   - Execute the dedicated stabilization plan (`docs/completed-plans/platform-hardening-plan-completed-2025-12-22.md`).  
   - Goals: session timeout fixes, rate-limit telemetry, access-config enforcement, responsive polish, CI parity.

2. **Formalize Current Apps**  
   - Rebrand Administrator role as **SEEE Event Planning** and Standard role as **SEEE Expedition Viewer**.  
   - Remove section picker for these SEEE-only apps; encode SEEE assumptions in schemas, proxies, and UI.  
   - Ensure documentation/specs describe their scopes explicitly.

3. **Plan Multi-App Foundation (post-hardening)**  
   - Design shared shell + selector once stabilization tasks complete.  
   - Introduce explicit app selection for the future multi-section viewer and any new tools (Quartermaster, Training).  
   - Update auth flows to request scopes per app rather than per role.

4. **Extend to New Apps**  
   - Kick off Quartermaster MVP and multi-section viewer requirements once the app foundation exists.  
   - Continue tracking new functionality (Expedition planner, training quizzes) under the multi-app framework.

This sequencing ensures we don’t dilute focus: stabilize today’s SEEE experience first, then evolve into a refined multi-application platform.

This structure should make it easier to assign ownership, plan sprints, and build toward a multi-application OSM tooling platform without fragmenting the codebase.
