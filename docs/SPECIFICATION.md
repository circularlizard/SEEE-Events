# **SEEE Expedition Dashboard**

Version: Draft 21

Status: In progress

## **1. Open Questions & Pending Decisions**

Before final implementation, the following strategic decisions must be resolved:

* **Training Data Source:** Will training module completion be tracked via a single manual "Flexi-record" or by linking to "Badge Records" (Official or Custom)?  
  * *Impact:* Determines API complexity and required permissions.  
* **Access Control Configuration:** Which Access Control Strategy (Patrol-based vs. Event-based) will be the default for Standard Viewers?  
  * *Impact:* Determines how the User Configuration List is populated and maintained.

* **TanStack React Query Migration Approach (Resolved):** The implementation plan has selected an orchestrated pipeline approach with progressive enrichment for members data.
  * *Reference:* `docs/members-and-sessions-plan.md` (Section 8).

## **2. Project Overview**

**Goal:** Develop a read-only web-based dashboard that automates the display of Explorer Scout expedition data for the South East Edinburgh Explorers (SEEE).

**Problem Solved:** Currently, Unit Leaders lack visibility into which of their Explorers are attending expeditions, their training status, and kit requirements. Granting full OSM administrative access to all leaders poses GDPR risks; manual spreadsheets are labour-intensive.

**Target Audience:** Unit Leaders (viewing data for their specific Explorers) and SEEE Administrators (managing the data).

### **2.1 Multi-Application Platform Direction**

The platform now formalizes the three application experiences defined in `docs/future/platform-strategy-analysis.md` §3—with an additional platform-admin console—to prepare for Phase 3 Part 3 work:

1. **SEEE Event Planning** – replaces the legacy “Administrator” role experience and focuses on expedition setup, patrol refresh tooling, and member data quality investigations for the SEEE section.
2. **SEEE Expedition Viewer** – replaces the “Standard Viewer” role and provides read-only dashboards for expedition leaders once the section is hydrated.
3. **Multi-Section Viewer (future)** – shares the expedition viewer UI but reintroduces the section selector so other Edinburgh sections can adopt the tooling.
4. **Platform Admin Console (new)** – provides operational controls (section defaults, patrol cache priming, developer instrumentation, log access) that underpin the other apps.

All applications share the same proxy/auth/rate-limit safety layer, UI shell, TanStack Query providers, and Zustand stores. Requirements in the following sections are now grouped by platform-wide capabilities and per-application scope so we can iteratively port existing functionality into explicit apps.

## **3. Application Portfolio & Functional Requirements**

### 3.0 Requirement ID Scheme

All requirements in this specification carry unique identifiers using the pattern `REQ-<domain>-<nn>`. Domains align with major feature areas (e.g., `AUTH`, `EVENTS`, `LOGISTICS`, `TRAINING`, `SUMMARY`, `REPORTING`, `ADMIN`, `DATA`, `ARCH`, `NFR`). These IDs provide stable references for BDD features, tests, and documentation. Any new requirement must receive the next sequential number within its domain.

### **3.1 Platform-Wide Capabilities**

#### **3.1.1 Authentication & Multi-App Entry**

* **Protocol (REQ-AUTH-01):** The application will use **OSM OAuth 2.0 (Authorization Code Flow)**.
* **Login Method (REQ-AUTH-02):** Users must authenticate using their existing **Personal OSM Credentials**.
* **Simplified App Selection (REQ-AUTH-13):** After login, the user is presented with a simplified "3 Card" entry page to select their intended application experience.
    * **Expedition Viewer:** Read-only dashboard for SEEE events. Requires `section:event:read` scope.
    * **Expedition Planner:** Tools for SEEE event setup and patrol management. Requires `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read` scopes.
    * **OSM Data Quality Viewer:** Multi-section tool for identifying OSM data issues. Requires `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read` scopes.
* **App-Specific OAuth Scopes (REQ-AUTH-15):** Each application requests only the OSM scopes required for its functionality:
    - **Expedition Viewer:** Requests `section:event:read` only.
    - **Expedition Planner & Data Quality Viewer:** Request full admin scopes `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`.
* **Permission Validation (REQ-AUTH-16):** After OAuth completion, each app must validate the `permissions` object returned by OSM:
    - **SEEE-Specific Apps (Expedition Viewer, Expedition Planner):** Must validate permissions specifically for the SEEE section (ID 43105). The user must have the required permissions on the SEEE section to use these apps.
    - **Multi-Section Apps (OSM Data Quality Viewer, Platform Admin, Multi-Section Viewer):** Must validate that the user has the required permissions on **any** accessible section. The section selector will only show sections where the user has sufficient permissions.
    - Check that required permission types exist in the permissions object.
    - Verify each required permission has a value greater than 0.
    - If validation fails, display a helpful message: "You do not have the required OSM permissions to use this app. Please contact your OSM administrator." with a logout button.
    - No data hydration or API calls should be attempted if permission validation fails.
* **Platform Admin Entry (REQ-AUTH-14):** A subtle entry point and restricted route (`/dashboard/platform-admin`) provides operational controls for platform owners. Requires full admin scopes `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read` and platform admin verification via `platform:allowedOperators` configuration.
* **Legacy Role Scopes (Deprecated):**
    * **Administrator Scopes (REQ-AUTH-04):** Full admin scopes - now used by Expedition Planner and Data Quality Viewer apps.
    * **Standard Viewer Scopes (REQ-AUTH-05):** Event-only scope - now used by Expedition Viewer app.
* **Active Section Model (REQ-AUTH-06):**
    - **SEEE-Specific Apps:** Expedition Viewer and Expedition Planner assume the SEEE section ID and hide all section selection UI. These apps require SEEE-specific permission validation.
    - **Multi-Section Apps:** OSM Data Quality Viewer, Platform Admin enable the section selector, showing only sections where the user has the required permissions for the selected app.
* **Selector-first Rendering (REQ-AUTH-08):** If an app requires a section and none is selected, the selector must render **before** the normal dashboard UI to avoid flash.

**Implementation alignment (Dec 2025)** references the requirements above:

* `REQ-AUTH-06` enforces single-section mode.
* `REQ-AUTH-10` defines the primary control location (sidebar dropdown).
* `REQ-AUTH-08` guarantees the no-flash requirement.

#### **3.1.2 Session timeout**

* **Timeout Enforcement (REQ-AUTH-11):** If the user is inactive for 15 minutes and their NextAuth/OSM session expires, they must be redirected to login.
* **Post-login Callback (REQ-AUTH-12):** After re-authentication, the user must return to the page they were on (respect `callbackUrl`).

#### **3.1.3 Testing Automation & Reporting**

* **Automated Test Stack (REQ-QA-01):** Every pull request must run lint, TypeScript check, unit tests, BDD Playwright tests (instrumented), and coverage merge in CI (`CI – Tests` workflow).
* **Mutation Coverage Monitoring (REQ-QA-02):** Nightly mutation testing must run via `CI – Mutation Testing`, publishing HTML reports and failing when mutation score falls below 80%.
* **Deployment Gate (REQ-QA-03):** Production/staging builds may only run after `CI – Tests` succeeds; build artifacts must be generated via `CI – Deploy`.
* **Local Workflow Parity (REQ-QA-04):** Developers must have Windsurf workflows (`/test-stack`, `/mutation-scan`, `/bdd-fix`, `/file-completed-plan`) that mirror CI steps for consistent local verification.
* **Documentation Sync (REQ-QA-05):** Testing rules (`.windsurf/rules/seee-rules-testing.md`) must reference all available workflows and coverage targets so contributors can trace expectations.

### **3.2 SEEE Event Planning Application (Administrator Experience)**

The SEEE Event Planning app replaces the legacy "Administrator" role UI. It assumes the SEEE section, hides the section selector, and provides tooling to hydrate patrols/members, review data quality, and prepare expeditions.

#### **3.2.1 App Access & Permissions (REQ-AUTH-15, REQ-AUTH-16)**

* **Required OSM Scopes:** `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`.
* **Permission Validation:** Must validate that all required permissions exist in OSM startup data with values > 0.
* **Access Denied Flow:** Display helpful error message with logout button if permissions insufficient; no hydration attempted.

#### **3.2.2 Admin: Members views & data quality**

* **Scope (REQ-ADMIN-01):** Provide administrator-only views for exploring member datasets and identifying data quality issues.
* **Members List (REQ-ADMIN-02):** Admins must see a sortable member list per section.
* **Progressive Enrichment (REQ-ADMIN-03):** The members list must populate basic info immediately and enrich additional fields incrementally.
* **Issue Categories (REQ-ADMIN-04):** The system must detect and group issues for: missing/incomplete contact info, missing other contacts, missing doctor info, and duplicate emergency contact.
* **Accordion UX (REQ-ADMIN-05):** Member issues must render as collapsible accordion sections whose headers show issue name, count, criticality indicator, and description.
* **Issue Tables (REQ-ADMIN-06):** Expanded sections must display sortable member tables (default sort: name) with color-coding per criticality, matching the Dec 2025 UX.
* **Security (REQ-ADMIN-07):** Member contact/medical data is sensitive and must never be persisted to localStorage.

**Routes (canonical, admin only):**

* Members list: `/dashboard/members`
* Member data issues: `/dashboard/members/issues`

Future Phase 3 deliverables (patrol refresh tooling, logistics adapters, readiness pipelines) will be anchored in this application and reuse the same REQ identifiers.

### **3.3 SEEE Expedition Viewer Application (Standard Experience)**

The SEEE Expedition Viewer app is a read-only experience for expedition leaders. It is permanently locked to the SEEE section, has no section selector, and only requires event read scope. Its purpose is to let leaders see which members are attending which SEEE expeditions via two core views: (1) the SEEE event list and (2) a consolidated attendee view (grouped by patrol and per-event). Future attendance pivots (e.g., Walking Group, Tent Group) will reuse the same shared components in the Expedition Planner app.

#### **3.3.1 App Access & Permissions (REQ-AUTH-15, REQ-AUTH-16)**

* **Required OSM Scopes:** `section:event:read` only.
* **Permission Validation:** Must validate that events permission exists in OSM startup data with value > 0.
* **Access Denied Flow:** Display helpful error message with logout button if permission insufficient; no API calls attempted.

#### **3.3.2 Expeditions & Consolidated Attendance Views**

* **Events View (REQ-EVENTS-01/02):** Display active/future SEEE expedition events only; each event shows participant names and invitation status. This is the default entry point.
* **Consolidated Attendance View (REQ-EVENTS-06):** Provide a combined attendee view grouped by Patrol and Event so leaders can quickly see who is attending which expedition.
* **Shared Components:** Underlying table/card components must be shared with Expedition Planner to avoid divergence as new custom-field pivots are added.
* **Cache Integration (REQ-EVENTS-07):** Patrol ID→name mapping must come from the Redis patrol cache hydrated by admins; viewer surfaces cache freshness indicators but cannot refresh patrol data itself.

#### **3.3.3 Expedition Logistics View**

For each event, the dashboard must display logistical details.

* **Column Mapping Source (REQ-LOGISTICS-01):** Expedition Viewer consumes column-mapping definitions (Walking Group, Tent Group, etc.) provided by the Platform Admin Console; viewer users cannot modify mappings directly.
* **Graceful Degradation (REQ-LOGISTICS-02):** When required columns are missing/unmapped, the app must continue to show participant lists/invitation status and simply hide/gray-out unavailable logistics fields.
* **Displayed Fields (REQ-LOGISTICS-03):** For every participant show Expedition Group, Tent Group, Group Gear Provider (free text), and Additional Info (free text).
* **First Aid Summary (REQ-LOGISTICS-04):** **Deferred** – see Section 7 (Future Scope) for the postponed First Aid reporting requirement.

#### **3.3.4 Reporting & Export**

To support offline analysis and physical record-keeping during expeditions:

* **CSV/XLS Export (REQ-REPORTING-01):** Users must be able to download the currently displayed data (Event Dashboard or Summary) as CSV or Excel.
* **Filter Fidelity (REQ-REPORTING-02):** All exports must respect the currently applied filters (e.g., Patrol, Event, Readiness).
* **PDF Export (REQ-REPORTING-03):** Users must be able to generate a well-formatted PDF report suitable for printing.
* **PDF Formatting (REQ-REPORTING-04):** PDF exports must include readable table layouts, clear headers, and reflect applied filters/access controls.

### **3.4 OSM Data Quality Viewer Application (Administrator Experience)**

The OSM Data Quality Viewer provides multi-section access to identify and resolve OSM data issues across sections.

#### **3.4.1 App Access & Permissions (REQ-AUTH-15, REQ-AUTH-16)**

* **Required OSM Scopes:** `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`.
* **Permission Validation:** Must validate that all required permissions exist in OSM startup data with values > 0.
* **Access Denied Flow:** Display helpful error message with logout button if permissions insufficient; no API calls attempted.
* **Multi-Section Support:** Enables section selector for administrators managing multiple sections.

#### **3.4.2 Data Quality Views**

* **Cross-Section Issues (REQ-DATA-QUALITY-01):** Aggregate and display data quality issues across all accessible sections.
* **Section-Specific Filtering (REQ-DATA-QUALITY-02):** Allow filtering by section to focus on specific problem areas.
* **Issue Categories:** Reuse issue categories from REQ-ADMIN-04 (missing contact info, doctor info, duplicate contacts).
* **Export Capabilities:** Provide CSV export of identified issues for offline resolution tracking.

### **3.5 Multi-Section Viewer Application (Future Scope)**

The Multi-Section Viewer mirrors the Expedition Viewer UI but reintroduces the section selector, per-user access strategies, and generalized schemas so other sections can opt in.

* **Access Strategy Alignment:** Must honor Patrol-based vs Event-based restrictions defined in `REQ-ACCESS-04` → `REQ-ACCESS-08`.
* **Schema Flexibility:** Event/member schemas must support section-specific flexi columns without assuming SEEE naming conventions.
* **Progressive Enablement:** Multi-section audiences cannot view SEEE-only admin tools, patrol refreshers, or platform admin controls.
* **Documentation:** When this app is enabled, onboarding material must explain when to hydrate caches and how to request access.

Detailed readiness/logistics requirements continue to reference Section 7 until the multi-section viewer is funded.

### **3.6 Platform Admin Console**

The new Platform Admin Console centralizes operational controls required to keep the multi-app platform healthy.

#### **3.6.1 App Access & Permissions (REQ-AUTH-14, REQ-AUTH-15, REQ-AUTH-16)**

* **Required OSM Scopes:** `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`.
* **Platform Admin Verification:** Must verify user is in `platform:allowedOperators` configuration.
* **Permission Validation:** Must validate all required OSM permissions exist with values > 0.
* **Access Denied Flow:** Display helpful error message with logout button if either platform admin or OSM permissions insufficient.

#### **3.6.2 Operational Controls**

* **Operational Access (REQ-CONSOLE-01):** Only SEEE platform owners (subset of administrators) may access the console via a dedicated app entry point and route group (`/dashboard/(platform-admin)`).
* **Patrol Cache Management (REQ-CONSOLE-02):** Provide controls to trigger patrol/member hydration runs, inspect last refresh timestamps, and re-queue failed jobs without redeploying the app.
* **SEEE Section ID Configuration (REQ-CONSOLE-03):** Surface the canonical SEEE section ID with an editable field, default value, and write-back to Vercel KV/Redis so SEEE apps can assume the correct section automatically.
* **Developer Tools (REQ-CONSOLE-04):** Include safe developer utilities (e.g., proxy inspector, rate-limit simulator toggles, MSW enable/disable) to diagnose issues without SSH access.
* **Log Viewer (REQ-CONSOLE-05):** Provide read-only access to recent proxy/safety layer logs with filters for severity, OSM endpoint, and request ID to accelerate incident response.
* **Audit Trail (REQ-CONSOLE-06):** All actions taken in the console must be logged with timestamp, user, action, and payload summary for compliance.
* **Column Mapping Management (REQ-CONSOLE-07):** Allow platform admins to configure the expedition logistics column mappings (Walking Group, Tent Group, etc.) stored in Redis/KV so Expedition Viewer/Planner consume consistent definitions without per-user mapping UI.

## **4. Data Management Strategy**

### **4.1 Master Data Source**

* **OSM Source of Truth (REQ-DATA-01):** Online Scout Manager (OSM) remains the single authoritative source.
* **Read-only App (REQ-DATA-02):** The SEEE dashboard is strictly read-only; edits must occur directly in OSM.
* **Admin-driven Hydration (REQ-DATA-03):** Because standard viewers lack member/patrol permissions, administrators must hydrate member/patrol data which is then cached for viewers.
* **No External DB (REQ-DATA-04):** No separate persistent database may be used for personal data.

**Implementation alignment (Dec 2025)**:

* **Sensitive Fields (REQ-DATA-05):** Member contact/medical details must stay in-memory only on the client.
* **React Query Source (REQ-DATA-06):** Server-derived datasets must converge on TanStack React Query with progressive enrichment for members.

### **4.2 Custom Data Fields**

The application relies on data stored in OSM "User Data" columns within the Event "People" tab.

* **Custom Field Dependency (REQ-DATA-07):** The system must support flexible mapping of OSM "User Data" columns per event.
* **Expedition Group Field (REQ-DATA-08):** Capture Expedition Group as text.
* **Tent Group Field (REQ-DATA-09):** Capture Tent Group as text.
* **Group Gear Provider Field (REQ-DATA-10):** Capture Group Gear Provider as free text.
* **Additional Info Field (REQ-DATA-11):** Capture Additional Info as free text.

## **5. Technical Architecture**

### **5.1 Backend/API & Rate Limiting Strategy**

* **Defensive Rate Limit (REQ-ARCH-01):** Implement strict rate limiting to stay below OSM thresholds.
  * **Header Monitoring (REQ-ARCH-02):** Read X-RateLimit headers on every response.
  * **Internal Throttling (REQ-ARCH-03):** Self-cap below OSM’s published limits (e.g., 80/min if 100/min permitted).
  * **Backoff Compliance (REQ-ARCH-04):** The system must monitor for HTTP 429 responses and immediately pause the request queue, applying an exponential backoff or respecting the `Retry-After` header.
* **Rate Limit Telemetry (REQ-ARCH-19):** A visible UI indicator must surface current rate-limit status, remaining quota, and any active backoff periods to the user.
  * **Caching Strategy (REQ-ARCH-05):** Use server-side caching in Redis to reduce API load while preventing cross-user data leakage.
    * **Shared patrol cache:** Patrol structure may be cached across users (scoped by section) with a 90-day TTL because it is low sensitivity and changes infrequently.
    * **No shared member cache:** Member-related cached responses must not be shared across users.
    * **User-scoped keys:** Cache keys for member lists, event lists, and event details must be scoped to the authenticated user (and selected section).
    * **Short TTLs:** User-scoped caches must be short-lived:
      * **Member list (per section, per user):** 1 hour.
      * **Event lists and event details (per section, per user):** 1 hour.
    * **PII constraints:** Cached responses must not be used to persist or rehydrate sensitive personal data beyond what is already returned by authorized upstream endpoints.
  * **Cache refresh controls (REQ-ARCH-20):** A user must be able to force-refresh records they have access to:
    * Per-event refresh.
    * Per-member refresh (where a member record is visible/authorized in the UI context).
    * Global refresh (for the current section).
  * **Cache source indicators (REQ-ARCH-21):** Where practical, the UI should indicate whether a view loaded data from Redis cache vs upstream fetch (and optionally show cache age).
* **Safety Shield (REQ-ARCH-06):** All client requests must route via `/api/proxy/...`.
* **Retry Controls (REQ-ARCH-07):** Disable or tightly constrain retries for 401/429/503 responses.
* **Abort Support (REQ-ARCH-08):** Client fetch helpers must accept `AbortSignal` so section changes cancel in-flight work.

### **5.2 Security & Access Control**

* **Role Classes (REQ-ACCESS-01):** System must distinguish Administrator vs Standard Viewer.
  * **Administrator Definition (REQ-ACCESS-02):** Administrators can configure access limits and see all events/patrols by default.
  * **Standard Viewer Definition (REQ-ACCESS-03):** Standard viewers are restricted to administrator-defined scopes.
* **Restriction Strategies (REQ-ACCESS-04):** Support two models for Standard Viewers:
  * **Patrol-Based (REQ-ACCESS-05):** Show all events but permanently filter participants to specific Patrols.
  * **Event-Based (REQ-ACCESS-06):** Show all Patrols but only specified Events.
* **Configuration Store (REQ-ACCESS-07):** Map User -> Strategy -> `Patrol IDs/Event IDs` in the internal User Configuration List (JSON/env).
* **Whitelist Default (REQ-ACCESS-08):** Users not present in the configuration must be denied access by default.

### **5.3 Testing & Mock Data Layer**

* **Mock Layer (REQ-ARCH-09):** Provide a dedicated mock data layer for reliable testing without hitting live OSM.
* **Seed Data (REQ-ARCH-10):** Populate mock layer with anonymized JSON snapshots of real OSM data.
* **Config Toggle (REQ-ARCH-11):** Allow switching between live and mock providers via env flag (e.g., `USE_MOCK_DATA=true`).

### **5.4 Logging & Observability**

* **Comprehensive Logging (REQ-ARCH-12):** Implement extensive logging for diagnosing issues and monitoring API usage.
* **Coverage (REQ-ARCH-13):** Logs must include internal API calls, upstream traffic, request/response headers, and blocking indicators (X-Blocked/X-Deprecated).
* **Configurable Levels (REQ-ARCH-14):** Allow administrators to adjust logging verbosity via environment variables (e.g., errors-only vs verbose with bodies).

### **5.5 Error Handling & Stability**

* **Fail-fast API (REQ-ARCH-15):** API layer must fail fast rather than aggressive retrying to avoid OSM blocking.
* **Stop on X-Blocked (REQ-ARCH-16):** On detecting X-Blocked, suspend further API calls and alert administrators.
* **Unexpected Responses (REQ-ARCH-17):** Abort operations when data formats are unexpected; do not attempt blind retries.
* **Input Sanitization (REQ-ARCH-18):** Validate and sanitize all outbound parameters to OSM.

I have added a new section to the document for the UI's non-functional requirements. This new section is placed as Section 6.

## **6. Non-Functional UI Requirements**

* **Visual Quality (REQ-NFR-01):** The UI must present a clean, modern aesthetic with intentionally selected fonts and color palette.
* **Theming System (REQ-NFR-02):** Provide a theming mechanism to adjust palette/look without major code changes, while shipping with a default high-quality theme.
* **Responsiveness (REQ-NFR-03):** Ensure fully responsive layouts across desktop, tablet, and mobile breakpoints.

## **7. Future Scope: Training & First Aid Requirements**

The following requirements remain in scope for the broader SEEE platform but are intentionally deferred from the current Expedition Dashboard delivery.

### **7.1 Readiness & Training View**

To ensure compliance before an expedition, the dashboard must verify completion of the 7 required Explorer training modules and First Aid.

* **Data Source Decision (REQ-TRAINING-01):** The system must support either Flexi-record or Badge-based data sources once the strategic decision is made. Until then, the UI must remain agnostic and ready for either approach.
  * Option A – Flexi-Record (context only): manual single record per member.  
  * Option B – Badge Records (context only): pulls from OSM Badge system.  
* **Module Status Display (REQ-TRAINING-02):** The UI must display a Yes/No/Date status for each of the 7 Explorer training modules per member.
* **First Aid Status (REQ-TRAINING-03):** The UI must display the member’s current First Aid qualification status alongside the modules.

### **7.2 Member Participation & Readiness Summary View**

* **Scope (REQ-SUMMARY-01):** Provide an at-a-glance view aggregating participation data and training readiness across all active/future events and members.
* **Data Matrix (REQ-SUMMARY-02):** Render members as rows and events/training statuses as columns, showing invitation status plus training completion.
* **Training Columns (REQ-SUMMARY-03):** Include the 7 training modules + First Aid columns using data defined in Section 7.1.
* **Grouping – Primary (REQ-SUMMARY-04):** Allow grouping by Patrol so Unit Leaders can view their Unit contiguously.
* **Grouping – Secondary (REQ-SUMMARY-05):** Allow optional grouping by Invitation Status or key Training Status (e.g., show all members lacking First Aid).
* **Filtering – Events (REQ-SUMMARY-06):** Provide filters to include/exclude specific events (e.g., show only Bronze Qualifying events).
* **Filtering – Patrols (REQ-SUMMARY-07):** Provide filters to include/exclude Patrols.
* **Filtering – Readiness (REQ-SUMMARY-08):** Provide filters based on training readiness (e.g., only members missing modules).
* **Sorting (REQ-SUMMARY-09):** Support sorting by Member Name, Patrol, and training states.
* **Access Control (REQ-SUMMARY-10):** Respect access rules from Section 5.2 to ensure users only see permitted members/events.

### **7.3 Logistics: First Aid Summary**

* **First Aid Summary (REQ-LOGISTICS-04):** Provide a high-level First Aid qualification summary per event (e.g., count/percentage qualified) leveraging the training data described above.

## 8. Requirement ID Appendix

| Domain Prefix | Description |
| --- | --- |
| AUTH | Authentication, session selection, timeout requirements, and app-specific permissions |
| EVENTS | Event dashboard + attendance views |
| LOGISTICS | Expedition logistics fields and summaries |
| TRAINING | Readiness/training data requirements |
| SUMMARY | Participation & readiness summary view |
| REPORTING | Export/report generation |
| ADMIN | Admin-only member management + issues |
| DATA | Data sourcing, caching, and custom field dependencies |
| ARCH | Architecture-wide requirements (rate limiting, mock layer, logging, errors, etc.) |
| ACCESS | Security/access control strategies |
| NFR | Non-functional UI requirements |
| QA | Testing automation, workflows, and reporting |

> **Legacy mapping:** Requirements appearing prior to this update map directly to the IDs introduced above. When referencing older documentation or commits, assume the nearest matching textual requirement now carries the corresponding `REQ-` identifier.

