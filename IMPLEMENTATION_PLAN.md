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

## **Phase 1: The Safety Layer (Backend & Proxy)** ✅ COMPLETE

**Goal:** Build the "Safety Shield" backend before any UI. All complexity regarding limits and validation lives here.

* [x] **1.1 Developer Documentation (Local Setup):**  
  * [x] README.md already includes "Getting Started" guide with HTTPS setup  
  * [x] Documented docker-compose up -d requirement for local Redis  
  * [x] Created .env.example with all necessary environment variables  
* [x] **1.2 Observability (Moved from P5):**  
  * [x] Installed pino and pino-pretty  
  * [x] Created src/lib/logger.ts with helpers (rate limit, circuit breaker, proxy request, validation, Redis, cache) and integrated across safety layer  
* [x] **1.3 Zod Schemas (src/lib/schemas.ts):**  
  * [x] **Tier 1 (Strict):** Member, Event, Patrol, FlexiStructure, StartupData schemas - Fail if invalid  
  * [x] **Tier 1 (Strict - Config):** Schema for getStartupData (User Roles) and FlexiStructure (Column Defs)  
  * [x] **Tier 2 (Permissive):** FlexiData, BadgeRecords, Attendance schemas with .catch() for graceful degradation  
  * [x] Created parseStrict() and parsePermissive() utility functions  
  * [x] **TEST (Unit):** Verified Tier 1 throws errors on bad data, Tier 2 degrades gracefully (16 tests passing)  
* [x] **1.4 Rate Limiting Engine:**  
  * [x] Implemented bottleneck logic in src/lib/bottleneck.ts capped at 80% of API limit  
  * [x] Parse X-RateLimit-Remaining headers from responses  
  * [x] Dynamic reservoir updates based on remaining quota  
  * [x] Auto-trigger soft lock when quota < 10%  
* [x] **1.5 Circuit Breaker (Redis):**  
  * [x] **Soft Lock:** Pause queue if Quota hits 0 (via Redis)  
  * [x] **Hard Lock:** Global 503 Halt if X-Blocked is detected (via Redis)  
  * [x] Created helper functions: setSoftLock, isHardLocked, clearLocks  
  * [x] Quota tracking in Redis: remaining, limit, reset  
* [x] **1.6 Proxy Route:**  
  * [x] Built app/api/proxy/[...path]/route.ts  
  * [x] **Standardize Errors:** Consistent JSON error format with error codes and retryAfter  
  * [x] **Integrate Caching:** Read-Through Cache pattern (Check Redis -> Fetch -> Write Redis)  
  * [x] Integrated rate limiting, circuit breaker, and validation  
  * [x] Ensured POST/PUT/DELETE/PATCH requests are rejected (Read-Only Policy)  
  * [x] X-Blocked header detection triggers hard lock  
  * [x] **TEST (Integration):** MSW tests for proxy route covering caching, rate limiting, soft/hard locks, and X-Blocked detection (6 tests passing)  
* [x] **1.7 CI/CD Automation:**  
  * [x] Created scripts/validate-safety-layer.sh  
  * [x] Script Logic: Check Redis reachable, run ESLint, run TypeScript compile check, run unit tests (schemas) and integration tests (proxy), then full suite  
  * [x] Added `validate:safety` script in package.json

**Status:** ✅ Core Safety Layer Complete - Ready for Phase 2
- Zod schemas with two-tier validation strategy
- Bottleneck rate limiter with 80% safety buffer
- Redis-based circuit breaker with soft/hard locks
- Proxy route with caching, validation, and read-only enforcement
- API client wrapper with type-safe methods
 - Observability via Pino with structured logs
 - CI validation script and full tests green (22 tests)

## **Phase 2: Core State & "Shell" UI**

**Goal:** Connect frontend to backend using the "Waterfall" strategy.

* [x] **2.1 Authentication (Architecture 5.7):**  
  * [x] **Environment Setup:** Updated .env.example with NextAuth configuration:  
    1. OSM_API_URL & OSM_OAUTH_URL: Base URLs for OSM API and OAuth endpoints.  
    2. OSM_CLIENT_ID & OSM_CLIENT_SECRET: OAuth credentials from OSM Developer Portal.  
    3. NEXTAUTH_SECRET: Secret for JWT encryption (generate with `openssl rand -base64 32`).  
    4. NEXTAUTH_URL: https://localhost:3000 (HTTPS Required).  
  * [ ] **Callback Registration:** Ensure https://localhost:3000/api/auth/callback/osm is registered in OSM Developer Portal.  
  * [x] Installed next-auth@beta (v5).  
  * [x] Configured src/lib/auth.ts:  
    1. **OSM Provider:** OAuth 2.0 flow with Online Scout Manager.  
    2. Token refresh logic integrated into JWT callback with automatic expiry detection.  
  * [x] Implemented **Token Rotation Strategy** with automatic refresh when access token expires (1-hour lifetime).  
  * [x] Created app/api/auth/[...nextauth]/route.ts handlers for all auth routes.  
  * [x] Created middleware.ts for route protection (dashboard routes and /api/proxy require authentication).  
  * [x] Created TypeScript type definitions (src/types/next-auth.d.ts) for session and JWT.  
  * [ ] **TEST (Manual):** Verify authentication flow once OSM OAuth credentials are configured in .env.local.  

* [ ] **2.1.A ALTERNATE Authentication (Architecture 5.7):**  
  * [ ] **Environment Setup:** Configure .env.local to use **HTTPS**:  
    1. OSM_API_BASE_URL: The root URL for OSM (e.g., https://www.onlinescoutmanager.co.uk).  
    2. OSM_CLIENT_ID & OSM_CLIENT_SECRET: From OSM Developer Portal.  
    3. NEXTAUTH_SECRET: Generated string.  
    4. NEXTAUTH_URL: https://localhost:3000 (HTTPS Required).  
    5. MOCK_AUTH_ENABLED: true to bypass OSM (Offline Mode).  
    6. NEXT_PUBLIC_USE_MOCK_DATA: true to use JSON files instead of Proxy.  
  * [ ] **Callback Registration:** Ensure https://localhost:3000/api/auth/callback/osm is registered in OSM Developer Portal.  
  * [ ] Install next-auth.  
  * [ ] Configure src/lib/auth.ts:  
    1. **OSM Provider:** Standard OAuth 2.0 flow.  
    2. **Mock Provider:** Custom Credential provider triggered by MOCK_AUTH_ENABLED=true that returns a dummy session.  
  * [ ] Implement **Token Rotation Strategy** (refresh_token) to handle 1-hour expiry (Skip for Mock Provider).  
  * [ ] Create app/api/auth/[...nextauth]/route.ts.  
  * [ ] **TEST (Manual):** Verify 3 Operation Modes:  
    1. **Real Auth + Real Data:** MOCK_AUTH_ENABLED=false, NEXT_PUBLIC_USE_MOCK_DATA=false (Production).  
    2. **Real Auth + Mock Data:** MOCK_AUTH_ENABLED=false, NEXT_PUBLIC_USE_MOCK_DATA=true (Safe Dev).  
    3. **Mock Auth + Mock Data:** MOCK_AUTH_ENABLED=true, NEXT_PUBLIC_USE_MOCK_DATA=true (Offline/CI).  

* [ ] **2.1.1 Mock Authentication & Multi-Mode Support:**  
  **Goal:** Enable offline development and CI testing without OSM credentials (addresses 2.1.A requirements).
  * [ ] **Environment Variables:**
    * [ ] Add `MOCK_AUTH_ENABLED` to .env.example (defaults to `false`)
    * [ ] Verify `NEXT_PUBLIC_USE_MSW` exists for MSW control (already configured in Phase 0)
  * [ ] **Mock Provider Implementation:**
    * [ ] Add mock credentials provider to `src/lib/auth.ts` that:
      1. Returns a dummy session when `MOCK_AUTH_ENABLED=true`
      2. Bypasses OAuth flow entirely
      3. Provides fixed user data (e.g., "Mock User", mock@example.com)
  * [ ] **Conditional Provider Loading:**
    * [ ] Update `src/lib/auth.ts` to conditionally include OSM or Mock provider based on `MOCK_AUTH_ENABLED`
    * [ ] Ensure token rotation is skipped for Mock provider
  * [ ] **Mock Session Data:**
    * [ ] Create `src/mocks/mockSession.ts` with:
      1. Mock user profile (id, name, email, roles)
      2. Mock section access (to test section picker with multiple sections)
      3. Mock roles (admin, standard viewer, read-only)
  * [ ] **Documentation:**
    * [ ] Update README with three operation modes:
      1. **Real Auth + Real Data:** Production mode
      2. **Real Auth + Mock Data:** Safe development with real OAuth
      3. **Mock Auth + Mock Data:** Offline/CI mode (no credentials needed)
  * [ ] **Testing:**
    * [ ] Verify Mock Auth + Mock Data mode works without OSM credentials
    * [ ] Verify switching between modes via environment variables
    * [ ] Test middleware allows mock sessions through protected routes

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