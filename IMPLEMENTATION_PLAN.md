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

---

## **Phase 2.8.0: Role Selection & Dynamic OAuth Scopes (NEW - PREREQUISITE)**

**Goal:** Implement pre-OAuth role selection UI that determines which scopes are requested during OAuth flow.

**Rationale:** Spec 3.1 requires role selection at login to drive scope requests. Different roles require different permissions:
- **Administrator:** `section:event:read`, `section:member:read`, `section:programme:read`, `section:flexirecord:read`
- **Standard Viewer:** `section:event:read` only

Currently, scopes are hardcoded; they must be dynamic based on user's role selection.

* [ ] **2.8.0.1 Role Selection UI (Pre-OAuth Modal):**
  * [ ] Create modal component displayed on login page before OAuth redirect
  * [ ] Two radio button options: "Administrator" and "Standard Viewer"
  * [ ] Descriptive text explaining each role's permissions
  * [ ] "Continue" button that stores role selection and redirects to OSM OAuth
  * [ ] Persist role selection in session/URL state during OAuth callback

* [ ] **2.8.0.2 Dynamic Scope Calculation:**
  * [ ] Update src/lib/auth.ts to calculate OAuth scopes based on selected role
  * [ ] Pass selected role through OAuth flow (URL param or session state)
  * [ ] On callback, verify role selection and apply correct scopes in JWT
  * [ ] Administrator role: Add `section:member:read`, `section:programme:read`, `section:flexirecord:read` to scope
  * [ ] Standard Viewer role: Keep `section:event:read` only

* [ ] **2.8.0.3 Mock Auth Support:**
  * [ ] Update mock auth provider to support role selection
  * [ ] Generate mock users with appropriate scopes based on selected role
  * [ ] **TEST (Unit):** Verify mock auth returns correct scopes for each role

* [ ] **2.8.0.4 E2E Verification:**
  * [ ] **TEST (E2E):** Verify role selection modal displays on login
  * [ ] **TEST (E2E):** Verify role selection persists through OAuth callback
  * [ ] **TEST (E2E):** Verify admin role gets full scopes, standard gets minimal scopes
  * [ ] **TEST (E2E):** Verify role selection shown in session/store after login

---

## **Phase 2.8.1: Access Control Selectors & Route Protection**

**Goal:** Implement role-based access control selectors and route protection before building data visualization views.

**Rationale:** Access control is a cross-cutting concern that affects all Phase 3 views (Event Dashboard, Readiness Matrix, Admin). Implementing this as a prerequisite ensures:
- Consistent filtering logic across all data views
- Prevention of unauthorized data access in the UI layer
- Foundation for Admin routes (Phase 4)
- Strategy A (Patrol-based) and Strategy B (Event-based) filtering implemented uniformly

* [ ] **2.8.1.1 Access Control Selectors (Spec 5.2):**  
  * [ ] Implement in Zustand store (use-store.ts):
    * `getFilteredMembers()` - Apply Strategy A/B filtering based on userRole and assignedPatrol/Event
    * `getFilteredEvents()` - Return only events user is assigned to (Strategy B)
    * `getFilteredLogistics()` - Return only logistics rows for assigned participants
  * [ ] Ensure Standard Viewers *never* receive data outside their permitted scope
  * [ ] Admin can view all data without restrictions
  * [ ] **TEST (Unit):** Verify selectors return empty lists for unauthorized data access
  
* [ ] **2.8.1.2 Admin Route Protection:**  
  * [ ] Create middleware check for `/dashboard/admin` routes (future Phase 4)
  * [ ] Implement higher-order component or route wrapper for admin-only pages
  * [ ] Return 403 Forbidden for unauthorized access
  * [ ] **TEST (Unit):** Verify non-admin users cannot access admin routes

* [ ] **2.8.1.3 E2E Verification:**  
  * [ ] **TEST (E2E):** Verify Standard Viewer sees only assigned Patrol members
  * [ ] **TEST (E2E):** Verify Leader sees all members in their Event
  * [ ] **TEST (E2E):** Verify Admin sees all data across all Events/Patrols

---

## **Phase 3: Data Visualization & Event Dashboard**

**Goal:** Render event dashboards with event details, participant lists, logistics, and First Aid readiness summary.

* [ ] **3.1 Event Detail Route & View (Spec 3.2 & 3.3):**  
  * [ ] Create `/dashboard/events/[id]` route with auth protection  
  * [ ] Implement useEventDetail hook fetching from `/api/proxy/ext/events/[id]` with participants, logistics  
  * [ ] Display event header: Event Name, Dates, Location, Status  
  * [ ] Display **First Aid Readiness Summary** (Spec 3.3):
    * Show "X/Y Participants are First Aid Qualified" with badge/percentage
    * Calculate from participant data (to be resolved in later phase: Flexi-Record vs Badge-Record source)
  * [ ] Display participant list table with columns: Name, Patrol, Role, Status, Contact  
  * [ ] Implement **Unit Filter** to filter participants by Patrol/Group (distinct from later Readiness Filter)  
  * [ ] Apply access control selectors from Phase 2.8 to ensure filtered views
  
* [ ] **3.2 Logistics & Metadata Display:**  
  * [ ] Display event logistics section (tents, transport, equipment as applicable)  
  * [ ] Implement Tier 2 Validation: corrupted logistics data shows empty cells, not crashes  
  * [ ] Support Flexi-Record logistics columns (flexible schema)  
  
* [ ] **3.3 Mobile Transformation:**  
  * [ ] Implement hidden md:table logic for desktop participant table  
  * [ ] Build **Participant Cards** grid for mobile (Name, Patrol, First Aid status badge)  
  * [ ] Responsive event header layout for mobile  
  * [ ] **TEST (E2E):** Table visible on Desktop (1024px), Cards visible on Mobile (375px)  
  
* [ ] **3.4 Flexi-Column Mapping Dialog:**  
  * [ ] Build Dialog to resolve ambiguous columns from getFlexiRecordStructure  
  * [ ] Allow users to map columns (e.g., "Tent Group" vs "Tents" disambiguation)  
  * [ ] Persist mapping preferences to Zustand  
  * [ ] Show/hide columns based on mapping selection  
  
* [ ] **3.5 Derived State & Memoization:**  
  * [ ] Implement memoized selectors for "First Aid Readiness" stats to avoid re-renders  
  * [ ] Cache computed participant lists by Patrol/Status grouping  
  * [ ] Optimize requery behavior for large events  
  
* [ ] **3.6 E2E Verification:**  
  * [ ] **TEST (E2E):** Verify event detail loads with correct participants  
  * [ ] **TEST (E2E):** Verify First Aid summary displays correctly  
  * [ ] **TEST (E2E):** Verify Unit Filter works (toggle Patrol, see rows update)  
  * [ ] **TEST (E2E):** Verify access control: Standard Viewer sees only assigned members  
  * [ ] **TEST (E2E):** Verify mobile/desktop responsive layout

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

