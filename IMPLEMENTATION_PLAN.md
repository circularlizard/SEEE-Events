# **SEEE Expedition Dashboard: Implementation Plan**

_For detailed information on completed phases, see **`docs/COMPLETED_PHASES.md`**_

---

## **Reference: Target File Structure**

All agents must adhere to this structure. Do not create new top-level directories without approval.

```
.
├── .github/
│   └── copilot-instructions.md      # AI Agent behavior rules
├── docs/
│   ├── COMPLETED_PHASES.md          # ✅ Detailed history of Phases 0-2
│   ├── ARCHITECTURE.md              # Technical architecture reference
│   └── SPECIFICATION.md             # Product requirements
├── scripts/
│   ├── sanitize_data.py             # Script to scrub PII from raw dumps
│   └── validate-safety-layer.sh     # CI Check script
├── public/
│   └── mockServiceWorker.js         # MSW service worker
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts  # NextAuth handlers
│   │   │   └── proxy/[...path]/route.ts     # Safety Layer API Proxy
│   │   ├── (dashboard)/             # Protected dashboard routes
│   │   ├── layout.tsx               # Root app shell
│   │   ├── page.tsx                 # Login/Landing
│   │   └── dashboard/
│   │       ├── layout.tsx           # Dashboard layout (nav, sidebar)
│   │       ├── page.tsx             # Dashboard homepage
│   │       ├── events/page.tsx      # Events list
│   │       ├── api-browser/         # API Browser developer tool
│   │       └── settings/page.tsx    # User settings
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── domain/                  # Feature-specific (EventCard, EventsTable, etc)
│   │   └── layout/                  # Nav, Sidebar, Header
│   ├── hooks/
│   │   ├── useEvents.ts             # Events list data fetching
│   │   └── useApiRequest.ts         # Generic API request hook
│   ├── lib/
│   │   ├── auth.ts                  # NextAuth configuration
│   │   ├── api.ts                   # Fetch wrappers for OSM endpoints
│   │   ├── bottleneck.ts            # Rate limiting (80% safety buffer)
│   │   ├── redis.ts                 # Vercel KV/Redis connection
│   │   ├── schemas.ts               # Zod schemas (Tier 1 & 2 validation)
│   │   ├── logger.ts                # Pino structured logging
│   │   └── utils.ts                 # Helper functions (cn, classnames, etc)
│   ├── mocks/
│   │   ├── handlers.ts              # MSW request handlers
│   │   └── data/                    # Sanitized mock JSON (no PII)
│   ├── store/
│   │   └── use-store.ts             # Zustand state (section, role, theme)
│   ├── types/                       # TypeScript type definitions
│   └── __tests__/
│       ├── unit/                    # Unit tests (schemas, utils)
│       ├── integration/             # Integration tests (API proxy)
│       └── e2e/                     # E2E tests (Playwright)
├── tests/
│   └── e2e/                         # E2E test suites
├── .env.example                     # Environment variables template
├── .env.local                       # Local environment (gitignored)
├── docker-compose.yml               # Local Redis container
├── middleware.ts                    # NextAuth route protection
├── next.config.mjs                  # Next.js configuration
├── tailwind.config.ts               # Tailwind theme (shadcn tokens)
├── jest.config.ts                   # Jest unit test configuration
├── playwright.config.ts             # Playwright E2E configuration
└── README.md                        # Getting started guide
```

---

## **Completed Work Summary**

| Phase | Scope | Status | Key Deliverables |
|-------|-------|--------|------------------|
| **0** | Infrastructure & Data Sanitization | ✅ | Next.js 15 setup, MSW interception, Docker Redis, Sanitized mock data |
| **1** | Safety Layer & Proxy | ✅ | Rate limiting (80% buffer), Circuit breaker, Caching, 22 tests passing |
| **2.1** | OAuth & Authentication | ✅ | NextAuth with token rotation, Redis storage, Multi-section support |
| **2.2** | State Management | ✅ | Zustand store (section, role, theme), TanStack Query (server state) |
| **2.3** | App Initialization | ✅ | StartupInitializer, Progressive hydration, Redis OAuth data pattern |
| **2.4** | App Shell & Login UI | ✅ | Hero login page, Dashboard layout, Theme tokens (shadcn blue HSL) |
| **2.5** | Events List | ✅ | Responsive mobile/desktop views, TanStack Query hook, Loading states |
| **2.6** | E2E Testing | ✅ | Playwright setup with HTTPS, 18/28 tests passing |
| **2.7** | Homepage Scaffolding | ✅ | Login gating, Avatar + Logout, Sidebar navigation, Favicon |

**For detailed completion notes, see `docs/COMPLETED_PHASES.md`**

---

## **Active & Future Work
## **Active & Future Work**

---

## **Immediate Next Priorities**

### 1. Code Cleanup
- [ ] Remove debugging console.log statements from:
  - `src/hooks/useQueueProcessor.ts` (unconditional logs with emojis)
  - `src/components/layout/ClientShell.tsx` (processor state logs)
  - `src/components/layout/SummaryQueueBanner.tsx` (banner query logs)
  - Other components with dev-only logging
- [ ] Consider: Keep dev-only logs wrapped in `if (process.env.NODE_ENV !== 'production')` checks
- [ ] Delete unused file: `src/hooks/useEventSummaryQueue.ts` (superseded by `useQueueProcessor`)

### 2. Section Picker Modal Issue
- [ ] Diagnose why `SectionPickerModal` does not display on login
- [ ] Add diagnostic logs to verify mount and `sectionPickerOpen` state sync
- [ ] Check open conditions in `StartupInitializer.tsx` and modal component
- [ ] Ensure modal displays when user has multiple available sections
- [ ] Test with both single-section and multi-section OAuth responses

### 3. Per-Person Attendance View (Phase 3.2)
- [ ] Complete `/dashboard/people/attendance` route implementation
- [ ] Aggregate "Yes" attendance across all events per person using hydrated summaries
- [ ] Implement toggle: Single List vs Group by Patrol
- [ ] Apply mobile-first responsive design (cards on mobile, table on desktop)
- [ ] Respect access control selectors from Phase 2.8.1
- [ ] Add E2E test coverage for attendance aggregation and grouping

### Pending Investigation: Section Picker Visibility (MOVED TO PRIORITY #2 ABOVE)

---

## **Phase 2.8.0: Role Selection & Dynamic OAuth Scopes ✅ COMPLETED**

**Goal:** Implement pre-OAuth role selection UI that determines which scopes are requested during OAuth flow.

**Rationale:** Spec 3.1 requires role selection at login to drive scope requests. Different roles require different permissions:
- **Administrator:** `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`
- **Standard Viewer:** `section:event:read` only

**Implementation Approach:**
Due to NextAuth v4 limitations (static provider configuration), we implemented a **dual OAuth provider strategy** instead of dynamic scope calculation:

* [x] **2.8.0.1 Role Selection UI:**
  * [x] Inline role selector on login page with RadioGroup component
  * [x] Two radio button options: "Administrator" and "Standard Viewer"
  * [x] Collapsible permissions information explaining each role's access
  * [x] "Sign in with OSM" button calls appropriate provider based on selection
  * [x] Created shadcn/ui components: RadioGroup, Label, Collapsible

* [x] **2.8.0.2 Dual OAuth Provider Implementation:**
  * [x] Created two separate OAuth providers in src/lib/auth.ts:
    * `osm-admin` - Requests 4 scopes (full access)
    * `osm-standard` - Requests 1 scope (events only)
  * [x] Each provider has unique callback URL requiring OSM configuration update:
    * `/api/auth/callback/osm-admin`
    * `/api/auth/callback/osm-standard`
  * [x] Login page calls `signIn('osm-admin')` or `signIn('osm-standard')` based on role selection
  * [x] Role embedded in user profile during OAuth callback
  * [x] JWT callback stores roleSelection and calculated scopes in token
  * [x] Session exposes roleSelection for access control

* [x] **2.8.0.3 Mock Auth Support:**
  * [x] Mock auth credentials provider supports roleSelection parameter
  * [x] Mock users get appropriate scopes via getScopesForRole() helper
  * [x] Ready for testing (unit tests pending)

* [x] **2.8.0.4 E2E Verification:**
  * [x] **TEST (E2E):** Unauthenticated access to `/dashboard` and `/dashboard/events` redirects to sign-in (updated redirect matcher)
  * [x] **TEST (E2E):** Admin access route exists and is reachable by admin (`/dashboard/admin`)
  * [x] **TEST (E2E):** Standard user is blocked from admin (`/dashboard/admin` shows Forbidden or redirects)
  * [x] Move remaining login-related E2Es to Phase 3 catch-up (see 3.7):
    * Verify role selection UI displays on login
    * Verify correct provider called based on selection
    * Verify admin role gets 4 scopes, standard gets 1 scope
    * Verify role selection shown in session after login

**Key Learnings:**
- NextAuth v4 providers are static and cannot be configured dynamically per-request
- Dual provider approach is the correct solution for requesting different OAuth scopes
- OSM OAuth configuration must whitelist both callback URLs
- Role is properly stored in JWT and accessible via session.roleSelection

---

## **Phase 2.8.1: Access Control Selectors & Route Protection**

**Goal:** Implement role-based access control selectors and route protection before building data visualization views.

**Rationale:** Access control is a cross-cutting concern that affects all Phase 3 views (Event Dashboard, Readiness Matrix, Admin). Implementing this as a prerequisite ensures:
- Consistent filtering logic across all data views
- Prevention of unauthorized data access in the UI layer
- Foundation for Admin routes (Phase 4)
- Strategy A (Patrol-based) and Strategy B (Event-based) filtering implemented uniformly

* [x] **2.8.1.1 Access Control Selectors (Spec 5.2):**  
  * [x] Implemented in Zustand store (`src/store/use-store.ts`):
    * `getFilteredMembers()` - Applies Strategy A/B based on `userRole` and allowlists
    * `getFilteredEvents()` - Returns only allowed events for Strategy B
    * `getFilteredLogistics()` - Returns logistics rows for allowed participants
  * [x] Standard Viewers never receive data outside permitted scope in selectors
  * [x] Admin bypass supported: admin users view all data
  * [x] **TEST (Unit):** Added tests verifying admin bypass and Strategy A/B filtering
  
* [x] **2.8.1.2 Admin Route Protection:**  
  * [x] Middleware guard for `/dashboard/admin/**` redirects/forbids non-admin
  * [x] Guard utility in client ensures safety if middleware absent
  * [x] **TEST (Unit):** Middleware behavior validated via proxy/route tests
  
* [x] **2.8.1.3 E2E Verification:**  
  * [x] Admin route guard validated (admin passes, standard blocked)
  * [k] Move remaining visibility E2Es to Phase 3 (see 3.6) after UI exists

---

## **Phase 3: Data Visualization & Event Dashboard**

**Goal:** Render event dashboards with event details, participant lists, logistics, and First Aid readiness summary.

* [x] **3.0 Data Model Hydration (Progressive Summaries):**
  * [x] Hover-based prefetch: prefetch event summary on link hover using `usePrefetchEventSummary`
  * [x] Queue-based hydration: enqueue visible event IDs and process with limited concurrency/backoff
  * [x] **REFACTORED:** Migrated queue from hook-local state to Zustand global store for persistence across re-renders
  * [x] **IMPLEMENTED:** Centralized `useQueueProcessor` hook with timer management, concurrency control (default 2), and retry logic
  * [x] **FIXED:** Timer lifecycle issues - separated mount/unmount cleanup from queue state effects
  * [x] **FIXED:** Banner completion detection - added string-to-number ID conversion for query key extraction
  * [x] Viewport prefetch: prefetch summaries for visible events via IntersectionObserver (`useViewportPrefetchSummary`)
  * [x] Store summary-derived metadata in lightweight cache (TanStack Query) and expose access via `useEventSummaryCache`
  * [x] Respect rate limits: rely on proxy safety layer; limit client concurrency and use conservative `staleTime/gcTime`
  * [x] Ensure model supports future pivot reports (per person and per patrol) via `useEventSummaryCache`
  * [x] E2E: Hydration test added and suite passing (skips gracefully if empty)
  * [x] Queue Debug UI: Created `/dashboard/debug/queue` with live state display and manual controls
  * [x] OAuth Debug UI: Created `/dashboard/debug/oauth` to inspect cached resource data and term resolution

* [ ] **3.1 Event Detail Route & View (Spec 3.2):**  
  * [x] Create `/dashboard/events/[id]` route with auth protection  
  * [x] Implement `useEventDetail` fetching `details` + `summary` (no attendance)  
  * [x] Display event header: Event Name, Dates, Location, Status (from cached summary/details)  
  * [x] Display participant list table with columns: Name, Patrol, Role, Status, Contact (derived from summary participants)
  * [x] Implement **Unit Filter** to filter participants by Patrol/Group (distinct from later Readiness Filter)  
  * [x] Apply access control selectors from Phase 2.8 to ensure filtered views (selectors ready)
  * [ ] E2E (scoped to this UI): Event detail loads; header visible; participants render from summary  
  
* [ ] **3.2 Per‑Person Attendance View (Spec 3.2.1):**
  * [ ] Create `/dashboard/people/attendance` route (protected)
  * [ ] Purpose: Show each person with a list of events they’ve said “Yes” to (attending)
  * [ ] Data source: Use hydrated summaries (`meta.event.members`) + `useEventSummaryCache` to aggregate per person across events
  * [ ] Mapping:
    * Build person index by `member_id`
    * For each event summary, if `attending === 'yes'`, append event to that person’s list
    * Include event metadata (name, date range, location) for display
  * [ ] UI Controls:
    * Toggle: `Single List` vs `Group by Patrol`
    * `Single List`: Flat list of people (Name) with nested list of “Yes” events
    * `Group by Patrol`: Top-level groups by patrol, then people + their “Yes” events
  * [ ] UI Standards:
    * Page padding `p-4 md:p-6`; table/card typography `text-sm`
    * Mobile-first: cards for people on mobile, table view on desktop (hidden md:table)
    * Use shadcn components from `@/components/ui/*`
  * [ ] Access control: Respect selectors from 2.8.1 (Standard users see only permitted members/events)
  * [ ] Performance: Memoize person/event aggregation; avoid O(N^2) scans on re-render
  * [ ] E2E: View loads; toggle switches grouping; counts of “Yes” events per person match summaries

* [ ] **3.3 First Aid Readiness Summary (Spec 3.3):**
  * [ ] Compute and display "X/Y Participants are First Aid Qualified" with badge/percentage
  * [ ] Decide data source: Flexi-Record vs Badge-Record (adapter pattern hooks into Phase 4)
  * [ ] Implement Tier 2 handling: missing/invalid fields degrade gracefully
  * [ ] E2E (scoped to this UI): Readiness summary renders and updates with filters

* [ ] **3.4 Logistics & Metadata Display:**  
  * [ ] Display event logistics section (tents, transport, equipment as applicable)  
  * [ ] Implement Tier 2 Validation: corrupted logistics data shows empty cells, not crashes  
  * [ ] Support Flexi-Record logistics columns (flexible schema)  
  * [ ] E2E (scoped to this UI): Logistics render; corrupted fields show empty, not crash  
  
* [ ] **3.5 Mobile Transformation:**  
  * [x] Implement hidden md:table logic for desktop participant table  
  * [x] Build **Participant Cards** grid for mobile (Name, Patrol, First Aid status badge)  
  * [ ] Responsive event header layout for mobile  
  * [ ] E2E (scoped to this UI): Table visible on Desktop (1024px), Cards visible on Mobile (375px)  
  
* [ ] **3.6 Flexi-Column Mapping Dialog:**  
  * [ ] Build Dialog to resolve ambiguous columns from getFlexiRecordStructure  
  * [ ] Allow users to map columns (e.g., "Tent Group" vs "Tents" disambiguation)  
  * [ ] Persist mapping preferences to Zustand  
  * [ ] Show/hide columns based on mapping selection  
  * [ ] E2E (scoped to this UI): Dialog opens; mapping persists; columns toggle accordingly  
  
* [ ] **3.7 Derived State & Memoization:**  
  * [ ] Implement memoized selectors for "First Aid Readiness" stats to avoid re-renders  
  * [ ] Cache computed participant lists by Patrol/Status grouping  
  * [ ] Optimize requery behavior for large events  
  * [ ] E2E/Perf Smoke: Basic interaction remains responsive with large mock datasets  
  
* [ ] **3.7.1 UI Polishing (Detail & List Views):**
  * [ ] Align table typography and spacing across list/detail (`text-sm`, `p-4`, muted header)
  * [ ] Match page padding (`p-4 md:p-6`) and back-link placement
  * [ ] Render custom fields as dynamic columns on detail table (only when populated)
  * [ ] Add bidirectional sorting indicators in headers (↑/↓)
  * [ ] Implement column header filtering controls (inline inputs/selects for Patrol, Attendance, Age, and dynamic custom columns)
  * [ ] Ensure Patrol ID mapping via summary cross-reference remains visible

* [ ] **3.8 E2E Verification (roll-up):**  
  * [ ] Consolidate and run end-to-end scenarios across all Phase 3 UIs  
  * [ ] Verify event detail participants; First Aid summary; Unit Filter  
  * [ ] Verify access control (Standard vs Admin visibility) via 2.8.1 selectors  
  * [ ] Verify mobile/desktop responsive layout end-to-end

* [ ] **3.9 E2E Catch-up (non-UI-specific):**
  * [ ] Implement and verify remaining login/auth E2Es from 2.8.0.4:
    * Role selection UI presence
    * Provider selection correctness (`osm-admin` vs `osm-standard`)
    * Session `roleSelection` persistence
    * Scope assertions (admin: 4 scopes; standard: 1 scope)
  * [ ] Any additional cross-cutting E2Es not tied to a single UI

**Note on Training Data (Deferred to Phase 7):**
- Spec 3.4 "Readiness & Training View" requires training data source decision (Flexi-Record vs Badge-Record)
- This is deferred to Phase 7 pending:
  - Clarification of which data source contains training module completion status
  - Implementation of corresponding adapter (FlexiAdapter vs BadgeAdapter)
  - API endpoints for training data queries
- Phase 3 First Aid summary uses participant qualification status only (simpler data source)
- Phase 7 will add 7-module readiness tracking and training-based filtering

---

## **Phase 4: Configuration & Admin**

**Goal:** Allow non-technical updates to business rules and user management.

* [ ] **4.1 Adapter Pattern:**  
  * [ ] Create FlexiAdapter for parsing getFlexiRecordData.  
  * [ ] Create BadgeAdapter for parsing getBadgeRecord.  
* [ ] **4.2 Admin UI:**  
  * [ ] Build "User Management" table.  
  * [ ] Build **"Configuration Editor"** (Arch 3.4) to map Business IDs.  
  * [ ] Build "Factory Reset" (restore defaults) button.  
  * [ ] Ensure these routes/components are protected by userRole === 'admin'.  
* [ ] **4.3 E2E Verification:**  
  * [ ] **TEST (E2E):** Verify **Access Control**: Standard user receives 403 when accessing Admin routes.  
  * [ ] **TEST (E2E):** Verify **Factory Reset**: Clicking button updates Vercel KV (mocked) and UI refreshes.  
  * [ ] **TEST (E2E):** Verify **Config Editor**: Admin updates Badge ID -> Readiness View reflects new status (Integration).

## **Phase 5: Hardening & Export**

**Goal:** Finalize export features and production safety.

* [x] **5.1 API Browser (Optional - Completed Early):**  
  * [x] Created /dashboard/api-browser route with full UI (Protected route).  
  * [x] Endpoint selector with category filtering and search (15+ OSM API endpoints).  
  * [x] Parameter form with auto-population from current section.  
  * [x] Response viewer with formatted and raw JSON views.  
  * [x] Request history with localStorage persistence (max 20 items).  
  * [x] Example modal to view sample responses from mock data.  
  * [x] Generic API_ENDPOINTS fallback for automatic mock data serving.  
  * [x] Integration with /api/proxy for safe API calls.  
  * [x] Added to sidebar navigation under "Developer Tools".  
  * [x] Manual testing with real API calls (pending Phase 2.4 real mode verification).  
* [ ] **5.2 PDF Export:** Implement React-PDF generation for Patrol sheets.  
* [ ] **5.3 Excel Export:** Implement SheetJS export for offline editing.  
* [ ] **5.4 Circuit Breaker UI:** Create "System Cooling Down" overlay for Soft Locks.  
* [ ] **5.5 Final E2E Sweep:**  
  * [ ] **TEST (E2E):** Full walkthrough: Login -> Select Section -> Filter by Unit -> Export PDF.

## **Phase 6: Deployment & Handover**

**Goal:** Final Production Setup.

* [ ] **6.1 Vercel Setup:**  
  * [ ] Configure Environment Variables (OSM_CLIENT_ID, NEXTAUTH_SECRET, KV_URL).  
  * [ ] Deploy to Vercel Preview.  
  * [ ] Configure DNS and SSL.  
* [ ] **6.2 Documentation:**  
  * [ ] Final API documentation.  
  * [ ] User guide for end users.  
  * [ ] Admin guide for configuration.  
* [ ] **6.3 Handover:**  
  * [ ] Knowledge transfer session.  
  * [ ] Support channel setup.

## **Phase 7: Training & Readiness Data (Future)**

**Goal:** Implement training module tracking and readiness-based filtering.

**Status:** DEFERRED - Pending decision on training data source (Flexi-Record vs Badge-Record).

* [ ] **7.1 Training Data Source Resolution:**  
  * [ ] Decide: Which data source contains training module completion (Flexi vs Badge)?  
  * [ ] Document: Data schema and API endpoint for training queries  
  * [ ] Implement: Corresponding adapter (FlexiAdapter or BadgeAdapter)  

* [ ] **7.2 Readiness & Training View (Spec 3.4):**  
  * [ ] Implement TanStack Table with 7-module readiness columns  
  * [ ] Display training completion status per participant  
  * [ ] Add grouping by training status (Fully Ready, Partial, Not Ready)  

* [ ] **7.3 Readiness-Based Filtering:**  
  * [ ] Add filter control: "Show only members who completed all 7 modules"  
  * [ ] Add filter control: "Show only members without First Aid qualification"  
  * [ ] Persist filter preferences to Zustand  

* [ ] **7.4 E2E Verification:**  
  * [ ] **TEST (E2E):** Verify training data loads correctly  
  * [ ] **TEST (E2E):** Verify readiness grouping and filtering  
  * [ ] **TEST (E2E):** Verify mobile/desktop responsive layout with training columns  
* [ ] **6.2 Documentation:**  
  * [ ] Update README.md with "First Run" instructions for Admins.

## **Phase transition instructions**

* Do not move on to a new phase without explicit permission  
* Make sure to update the plan after each phase  
* Check that what is coming next still makes sense  
* Commit code at the end of each phase

