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

## **3. Functional Requirements**

### 3.0 Requirement ID Scheme

All requirements in this specification carry unique identifiers using the pattern `REQ-<domain>-<nn>`. Domains align with major feature areas (e.g., `AUTH`, `EVENTS`, `LOGISTICS`, `TRAINING`, `SUMMARY`, `REPORTING`, `ADMIN`, `DATA`, `ARCH`, `NFR`). These IDs provide stable references for BDD features, tests, and documentation. Any new requirement must receive the next sequential number within its domain.

### **3.1 Authentication & Section Selection**

* **Protocol (REQ-AUTH-01):** The application will use **OSM OAuth 2.0 (Authorization Code Flow)**.  
  * *Rationale:* This is the mandatory standard for multi-user applications interfacing with OSM.  
* **Login Method (REQ-AUTH-02):** Users must authenticate using their existing **Personal OSM Credentials**.  
* **Role Selection (REQ-AUTH-03):** At the start of the login process, the user must select their intended role ("Administrator" or "Standard Viewer") to determine requested OAuth scopes.
* **Administrator Scopes (REQ-AUTH-04):** Administrators require `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`.
* **Standard Viewer Scopes (REQ-AUTH-05):** Standard viewers require `section:event:read` only.
* **Active Section Model (REQ-AUTH-06):** The application must operate with a single active section at a time (`currentSection`).
  - **Persisted Selection (REQ-AUTH-07):** If a section exists in the persisted session store, the application must load it immediately without showing the full selector.
  - **Selector-first Rendering (REQ-AUTH-08):** If no section is selected, the section selector must render **before** the normal dashboard UI to avoid flash.
  - **Selection Persistence (REQ-AUTH-09):** After a user selects a section, that selection must be persisted and subsequent data loads must target that section.
* **Section Switch UX (REQ-AUTH-10):** When a section is already selected, switching must occur via a compact dropdown control in the sidebar (desktop) with a mobile affordance in the header.

**Implementation alignment (Dec 2025)** references the requirements above:

* `REQ-AUTH-06` enforces single-section mode.
* `REQ-AUTH-10` defines the primary control location (sidebar dropdown).
* `REQ-AUTH-08` guarantees the no-flash requirement.

### **3.1.1 Session timeout**

* **Timeout Enforcement (REQ-AUTH-11):** If the user is inactive for 15 minutes and their NextAuth/OSM session expires, they must be redirected to login.
* **Post-login Callback (REQ-AUTH-12):** After re-authentication, the user must return to the page they were on (respect `callbackUrl`).

### **3.2 Event Dashboard**

* **Scope (REQ-EVENTS-01):** Display **active and future events only**; historical data is out of scope.  
* **Event Listing (REQ-EVENTS-02):** Show upcoming expedition events fetched from the selected section.  
* **Participant Status (REQ-EVENTS-03):** For each event display participant name and invitation status (Invited/Accepted/Declined).  
* **Unit Filtering (REQ-EVENTS-04):** Provide a "Unit Filter" dropdown that filters participants based on their Patrol (Unit/ESU name).  
* **Attendance Route (REQ-EVENTS-05):** Attendance view lives at `/dashboard/events/attendance`; main events list at `/dashboard/events`.

### **3.3 Expedition Logistics View**

For each event, the dashboard must display logistical details.

* **Dynamic Column Mapping (REQ-LOGISTICS-01):** Since custom columns in OSM vary per event, the system must allow users to map available OSM columns (Walking Group, Tent Group, etc.) whenever automatic detection fails.
* **Graceful Degradation (REQ-LOGISTICS-02):** When required columns are missing/unmapped, the app must continue to show participant lists/invitation status and simply hide/gray-out unavailable logistics fields.
* **Displayed Fields (REQ-LOGISTICS-03):** For every participant show Expedition Group, Tent Group, Group Gear Provider (free text), and Additional Info (free text).
* **First Aid Summary (REQ-LOGISTICS-04):** Provide a high-level First Aid qualification summary per event (e.g., count/percentage qualified) using the data defined in Section 3.4.

### 

### **3.4 Readiness & Training View**

To ensure compliance before an expedition, the dashboard must verify completion of the 7 required Explorer training modules and First Aid.

* **Data Source Decision (REQ-TRAINING-01):** The system must support either Flexi-record or Badge-based data sources once the strategic decision is made. Until then, the UI must remain agnostic and ready for either approach.
  * Option A – Flexi-Record (context only): manual single record per member.  
  * Option B – Badge Records (context only): pulls from OSM Badge system.  
* **Module Status Display (REQ-TRAINING-02):** The UI must display a Yes/No/Date status for each of the 7 Explorer training modules per member.
* **First Aid Status (REQ-TRAINING-03):** The UI must display the member’s current First Aid qualification status alongside the modules.

### **3.5 Member Participation & Readiness Summary View**

* **Scope (REQ-SUMMARY-01):** Provide an at-a-glance view aggregating participation data and training readiness across all active/future events and members.
* **Data Matrix (REQ-SUMMARY-02):** Render members as rows and events/training statuses as columns, showing invitation status plus training completion.
* **Training Columns (REQ-SUMMARY-03):** Include the 7 training modules + First Aid columns using data defined in Section 3.4.
* **Grouping – Primary (REQ-SUMMARY-04):** Allow grouping by Patrol so Unit Leaders can view their Unit contiguously.
* **Grouping – Secondary (REQ-SUMMARY-05):** Allow optional grouping by Invitation Status or key Training Status (e.g., show all members lacking First Aid).
* **Filtering – Events (REQ-SUMMARY-06):** Provide filters to include/exclude specific events (e.g., show only Bronze Qualifying events).
* **Filtering – Patrols (REQ-SUMMARY-07):** Provide filters to include/exclude Patrols.
* **Filtering – Readiness (REQ-SUMMARY-08):** Provide filters based on training readiness (e.g., only members missing modules).
* **Sorting (REQ-SUMMARY-09):** Support sorting by Member Name, Patrol, and training states.
* **Access Control (REQ-SUMMARY-10):** Respect access rules from Section 5.2 to ensure users only see permitted members/events.

### **3.6 Reporting & Export**

To support offline analysis and physical record-keeping during expeditions:

* **CSV/XLS Export (REQ-REPORTING-01):** Users must be able to download the currently displayed data (Event Dashboard or Summary) as CSV or Excel.
* **Filter Fidelity (REQ-REPORTING-02):** All exports must respect the currently applied filters (e.g., Patrol, Event, Readiness).
* **PDF Export (REQ-REPORTING-03):** Users must be able to generate a well-formatted PDF report suitable for printing.
* **PDF Formatting (REQ-REPORTING-04):** PDF exports must include readable table layouts, clear headers, and reflect applied filters/access controls.

### **3.7 Admin: Members views & data quality**

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
  * **Retry-After Compliance (REQ-ARCH-04):** Obey Retry-After headers on 429 responses.
  * **Caching Strategy (REQ-ARCH-05):** Use caching for non-volatile data to reduce API load.
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

## 7. Requirement ID Appendix

| Domain Prefix | Description |
| --- | --- |
| AUTH | Authentication, session selection, and timeout requirements |
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

> **Legacy mapping:** Requirements appearing prior to this update map directly to the IDs introduced above. When referencing older documentation or commits, assume the nearest matching textual requirement now carries the corresponding `REQ-` identifier.

