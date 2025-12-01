# **SEEE Expedition Dashboard: Implementation Plan**

## **Reference: Target File Structure**

All agents must adhere to this structure. Do not create new top-level directories without approval.

.  
├── .github/  
│   └── copilot-instructions.md   # AI Agent behavior rules  
├── docs/  
│   └── GEMINI_CONTEXT.md         # Architecture primer  
├── scripts/  
│   └── sanitize_data.py          # Script to scrub PII from raw dumps  
│   └── validate-safety-layer.sh  # CI Check script (New)  
├── public/  
├── src/  
│   ├── app/  
│   │   ├── api/  
│   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js Handlers  
│   │   │   └── proxy/            # The Safety Layer API Route  
│   │   ├── (dashboard)/          # Protected routes  
│   │   ├── layout.tsx            # Main App Shell  
│   │   ├── not-found.tsx         # 404 Page  
│   │   ├── error.tsx             # 500/Generic Error  
│   │   └── page.tsx              # Login/Landing  
│   ├── components/  
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card)  
│   │   ├── domain/               # Feature-specific (PatrolList, ReadinessTable)  
│   │   └── layout/               # Nav, Sidebar  
│   ├── lib/  
│   │   ├── auth.ts               # NextAuth Options & Rotation Logic  
│   │   ├── api.ts                # Fetch wrappers  
│   │   ├── bottleneck.ts         # Rate limiting logic  
│   │   ├── logger.ts             # Pino Logger setup  
│   │   ├── redis.ts              # Vercel KV connection  
│   │   ├── schemas.ts            # Zod definitions (Tier 1 & 2)  
│   │   └── utils.ts              # cn() and generic helpers  
│   ├── mocks/  
│   │   ├── handlers.ts           # MSW Handlers  
│   │   └── data/                 # Sanitized JSON (NO PII allowed here)  
│   ├── store/  
│   │   └── use-store.ts          # Zustand (Session, Theme, Config)  
│   ├── __tests__/                # Colocated or top-level tests  
│   │   ├── unit/                 # Zod & Utils tests  
│   │   ├── integration/          # API Route & Rate Limit tests  
│   │   └── e2e/                  # Playwright tests  
│   └── types/                    # TypeScript interfaces  
├── .env.example  
├── .env.local  
├── docker-compose.yml            # Local Redis  
├── middleware.ts  
└── next.config.mjs

## **Phase 0: Infrastructure & Data Sanitization ✅ COMPLETE**

**Goal:** Establish local environment and generate safe test data from raw API dumps.

* [x] **0.1 Repository & Environment Setup:**  
  * [x] Initialize Next.js 14+: Manually created config files preserving existing src/ structure  
  * [x] Install Core Deps: lucide-react clsx tailwind-merge zod zustand @tanstack/react-query @tanstack/react-table date-fns  
  * [x] Install Safety Deps: bottleneck ioredis server-only  
  * [x] Install Dev Deps: msw jest @testing-library/react @testing-library/jest-dom  
  * [x] **Configure Gitignore (Critical):**  
    * Added *.txt (To ignore raw API dumps like getmembers.txt containing PII).  
    * Added .env*.local.  
    * Ensured src/mocks/data/*.json is *not* ignored (so agents can use sanitized data).  
* [x] **0.2 Docker Infrastructure:**  
  * [x] Created docker-compose.yml for local Redis (exposed on port 6379) to mimic Vercel KV.  
  * [x] Created .env.example with configuration templates  
* [x] **0.3 Data Sanitization (Critical):**  
  * [x] scripts/sanitize_data.py exists and has already been run  
  * [x] Scrubbing logic implemented to anonymize PII using mock names  
  * [x] Safe JSON files verified in src/mocks/data/ - no email/phone/address data found  
  * [x] api_map.json created to document all API endpoints  
* [x] **0.4 MSW Setup:**  
  * [x] Configured Mock Service Worker (src/mocks/handlers.ts) to intercept requests using api_map.json  
  * [x] Created handlers that return the sanitized JSON from src/mocks/data/  
  * [x] Setup browser and server MSW instances  
  * [x] Created MSWProvider component for conditional initialization  
  * [x] Initialized MSW service worker in public directory  
  * [x] Integrated MSW into root layout

**Status:** ✅ Phase 0 Complete - Dev server running successfully on http://localhost:3000

## **Phase 1: The Safety Layer (Backend & Proxy)**

**Goal:** Build the "Safety Shield" backend before any UI. All complexity regarding limits and validation lives here.

* [ ] **1.1 Developer Documentation (Local Setup):**  
  * [ ] Create/Update README.md with "Getting Started" guide.  
  * [ ] **Critical:** Document docker-compose up -d requirement for local Redis (Rate Limiter dependency).  
  * [ ] Document Environment Variable setup (.env.local).  
* [ ] **1.2 Observability (Moved from P5):**  
  * [ ] Install pino and pino-pretty.  
  * [ ] Create src/lib/logger.ts to capture X-RateLimit headers and errors.  
* [ ] **1.3 Zod Schemas (src/lib/schemas.ts):**  
  * [ ] **Tier 1 (Strict):** Schemas for getmembers.txt, getEvents.txt (IDs, Names). Fail if invalid.  
  * [ ] **Tier 1 (Strict - Config):** Schema for getStartupData (User Roles) and getFlexiRecordStructure.txt (Column Defs).  
  * [ ] **Tier 2 (Permissive):** Schemas for getFlexiRecordData.txt and getBadgeRecord.txt. Allow null or missing fields.  
  * [ ] **TEST (Unit):** Verify Tier 1 throws errors on bad data, while Tier 2 returns null (Graceful Degradation).  
* [ ] **1.4 Rate Limiting Engine:**  
  * [ ] Implement bottleneck logic in src/lib/bottleneck.ts to cap requests at 80% of API limit.  
  * [ ] Parse X-RateLimit-Remaining headers from responses.  
* [ ] **1.5 Circuit Breaker (Redis):**  
  * [ ] **Soft Lock:** Pause queue if Quota hits 0.  
  * [ ] **Hard Lock:** Global 503 Halt if X-Blocked is detected.  
* [ ] **1.6 Proxy Route:**  
  * [ ] Build app/api/proxy/[...path]/route.ts.  
  * [ ] **Standardize Errors:** Define consistent JSON error format (e.g., { error: "RATE_LIMITED", retryAfter: 120 }).  
  * [ ] **Integrate Caching (Arch 7):** Implement Read-Through Cache (Check Redis -> Fetch -> Write Redis).  
  * [ ] Integrate Validation, Limiting, Logging, and Locking.  
  * [ ] Ensure POST requests are rejected (Read-Only Policy).  
  * [ ] **TEST (Integration):** Use MSW to simulate an X-Blocked header and verify the API returns 503 for subsequent requests.  
* [ ] **1.7 CI/CD Automation:**  
  * [ ] Create scripts/validate-safety-layer.sh.  
  * [ ] Script Logic: 1. Check Redis is reachable 2. Run Linting 3. Run Unit Tests (Schemas) 4. Run Integration Tests (Proxy).  
  * [ ] Configure package.json with "test:safety": "./scripts/validate-safety-layer.sh".

## **Phase 2: Core State & "Shell" UI**

**Goal:** Connect frontend to backend using the "Waterfall" strategy.

* [ ] **2.1 Authentication (Architecture 5.7):**  
  * [ ] Install next-auth.  
  * [ ] Configure src/lib/auth.ts with OSM Provider.  
  * [ ] Implement **Token Rotation Strategy** (refresh_token) to handle 1-hour expiry.  
  * [ ] Create app/api/auth/[...nextauth]/route.ts.  
* [ ] **2.2 State & Configuration Seeding:**  
  * [ ] Setup TanStack Query (staleTime: 5 mins) for API data.  
  * [ ] Setup Zustand for Session state (Section ID, User Role).  
  * [ ] **Seeding:** Create src/lib/config-loader.ts to load defaults.json into Redis if empty (Required for User Role detection).  
* [ ] **2.3 Initialization Flow:**  
  * [ ] Implement getStartupData fetch on app load (requires Auth & Config).  
  * [ ] Build **Section Picker Modal** if user has access to multiple sections.  
* [ ] **2.4 App Shell & Error UI:**  
  * [ ] Build Sidebar and Header using shadcn/ui.  
  * [ ] Create error.tsx (500), not-found.tsx (404), and forbidden.tsx (403).  
  * [ ] Implement "Theming Mechanism" via globals.css variables.  
* [ ] **2.5 Progressive Hydration:**  
  * [ ] Fetch Event Index (getEvents) -> Render Skeletons.  
  * [ ] Lazy-load details (Participants, Structure) via throttled queue.  
* [ ] **2.6 E2E Verification (Shift Left):**  
  * [ ] Install Playwright.  
  * [ ] **TEST (E2E):** Verify **Login Flow**: Unauthenticated user redirected to Login.  
  * [ ] **TEST (E2E):** Verify **Section Picker**: Multi-section user sees modal, selection persists.

## **Phase 3: Data Visualization**

**Goal:** Render complex tables and mobile views.

* [ ] **3.1 Access Control Logic (Spec 5.2):**  
  * [ ] Implement Selectors in use-store or Query transformations to enforce **Strategy A (Patrol)** and **Strategy B (Event)** filtering.  
  * [ ] Ensure Standard Viewers *never* receive data outside their permitted scope in the UI layer.  
  * [ ] **TEST (Unit):** Verify selectors correctly return empty lists for participants outside the user's assigned Patrol/Event.  
* [ ] **3.2 Readiness View (Desktop):**  
  * [ ] Implement TanStack Table with "Grouping" (Patrol/Status).  
  * [ ] Integrate Tier 2 Validation: corrupted logistics data shows empty cells, not crashes.  
  * [ ] Implement **Unit Filter** (Distinct from grouping).  
* [ ] **3.3 Mobile Transformation:**  
  * [ ] Implement hidden md:table logic.  
  * [ ] Build **Participant Cards** grid for mobile users.  
* [ ] **3.4 Flexi-Column Mapping:**  
  * [ ] Build Dialog to resolve ambiguous columns from getFlexiRecordStructure.txt (e.g., mapping "Tent Group" vs "Tents").  
  * [ ] Persist mapping preferences to Zustand.  
* [ ] **3.5 Derived State:**  
  * [ ] Implement memoized selectors for "First Aid Readiness" stats to avoid re-renders.  
* [ ] **3.6 E2E Verification:**  
  * [ ] **TEST (E2E):** Verify **Desktop vs Mobile**: Table visible on Desktop (1024px), Cards visible on Mobile (375px).  
  * [ ] **TEST (E2E):** Verify **Grouping**: Users can toggle "Group by Patrol" and rows rearrange.

## **Phase 4: Configuration & Admin**

**Goal:** Allow non-technical updates to business rules.

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

* [ ] **5.1 PDF Export:** Implement React-PDF generation for Patrol sheets.  
* [ ] **5.2 Excel Export:** Implement SheetJS export for offline editing.  
* [ ] **5.3 Circuit Breaker UI:** Create "System Cooling Down" overlay for Soft Locks.  
* [ ] **5.4 Final E2E Sweep:**  
  * [ ] **TEST (E2E):** Full walkthrough: Login -> Select Section -> Filter by Unit -> Export PDF.

## **Phase 6: Deployment & Handover**

**Goal:** Final Production Setup.

* [ ] **6.1 Vercel Setup:**  
  * [ ] Configure Environment Variables (OSM_CLIENT_ID, NEXTAUTH_SECRET, KV_URL).  
  * [ ] Deploy to Vercel Preview.  
* [ ] **6.2 Documentation:**  
  * [ ] Update README.md with "First Run" instructions for Admins.

## **Phase transition instructions**

* Do not move on to a new phase without explicit permission  
* Make sure to update the plan after each phase  
* Check that what is coming next still makes sense  
* Commit code at the end of each phase