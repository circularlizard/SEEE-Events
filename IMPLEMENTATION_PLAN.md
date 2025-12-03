# **SEEE Expedition Dashboard: Implementation Plan**

## **Reference: Target File Structure**

All agents must adhere to this structure. Do not create new top-level directories without approval.

* .  
* ├── .github/  
* │   └── copilot-instructions.md   # AI Agent behavior rules  
* ├── docs/  
* │   └── GEMINI_CONTEXT.md         # Architecture primer  
* ├── scripts/  
* │   └── sanitize_data.py          # Script to scrub PII from raw dumps  
* │   └── validate-safety-layer.sh  # CI Check script (New)  
* ├── public/  
* ├── src/  
* │   ├── app/  
* │   │   ├── api/  
* │   │   │   ├── auth/[...nextauth]/route.ts  # Auth.js Handlers  
* │   │   │   └── proxy/            # The Safety Layer API Route  
* │   │   ├── (dashboard)/          # Protected routes  
* │   │   ├── layout.tsx            # Main App Shell  
* │   │   ├── not-found.tsx         # 404 Page  
* │   │   ├── error.tsx             # 500/Generic Error  
* │   │   └── page.tsx              # Login/Landing  
* │   ├── components/  
* │   │   ├── ui/                   # shadcn/ui primitives (Button, Card)  
* │   │   ├── domain/               # Feature-specific (PatrolList, ReadinessTable)  
* │   │   └── layout/               # Nav, Sidebar  
* │   ├── lib/  
* │   │   ├── auth.ts               # NextAuth Options & Rotation Logic  
* │   │   ├── api.ts                # Fetch wrappers  
* │   │   ├── bottleneck.ts         # Rate limiting logic  
* │   │   ├── logger.ts             # Pino Logger setup  
* │   │   ├── redis.ts              # Vercel KV connection  
* │   │   ├── schemas.ts            # Zod definitions (Tier 1 & 2)  
* │   │   └── utils.ts              # cn() and generic helpers  
* │   ├── mocks/  
* │   │   ├── handlers.ts           # MSW Handlers  
* │   │   └── data/                 # Sanitized JSON (NO PII allowed here)  
* │   ├── store/  
* │   │   └── use-store.ts          # Zustand (Session, Theme, Config)  
* │   ├── __tests__/                # Colocated or top-level tests  
* │   │   ├── unit/                 # Zod & Utils tests  
* │   │   ├── integration/          # API Route & Rate Limit tests  
* │   │   └── e2e/                  # Playwright tests  
* │   └── types/                    # TypeScript interfaces  
* ├── .env.example  
* ├── .env.local  
* ├── docker-compose.yml            # Local Redis  
* ├── middleware.ts  
* └── next.config.mjs

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

## **Phase 1: The Safety Layer (Backend & Proxy) ✅ COMPLETE**

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
  * [x] Added validate:safety script in package.json

**Status:** ✅ Core Safety Layer Complete - Ready for Phase 2

* Zod schemas with two-tier validation strategy  
* Bottleneck rate limiter with 80% safety buffer  
* Redis-based circuit breaker with soft/hard locks  
* Proxy route with caching, validation, and read-only enforcement  
* API client wrapper with type-safe methods  
* Observability via Pino with structured logs  
* CI validation script and full tests green (22 tests)

## **Phase 2: Core State & "Shell" UI**

**Goal:** Connect frontend to backend using the "Waterfall" strategy.

* [x] **2.1 Authentication (Architecture 5.7):**  
  * [x] **Environment Setup:** Updated .env.example with NextAuth configuration:  
    1. OSM_API_URL & OSM_OAUTH_URL: Base URLs for OSM API and OAuth endpoints.  
    2. OSM_CLIENT_ID & OSM_CLIENT_SECRET: OAuth credentials from OSM Developer Portal.  
    3. NEXTAUTH_SECRET: Secret for JWT encryption (generate with openssl rand -base64 32).  
    4. NEXTAUTH_URL: https://localhost:3000 (HTTPS Required).  
  * [x] **Callback Registration:** Ensure https://localhost:3000/api/auth/callback/osm is registered in OSM Developer Portal.  
  * [x] Installed next-auth@^4.24.0 (Downgraded from v5 beta for stability).  
  * [x] Configured src/lib/auth.ts:  
    1. **OSM Provider:** OAuth 2.0 flow with Online Scout Manager.  
    2. Token refresh logic integrated into JWT callback with automatic expiry detection.  
    3. **OAuth Data Storage:** Full section data stored in Redis (24hr TTL), only section IDs in JWT to avoid size limits.  
    4. **Scope Strategy:** Using `section:event:read` only (OSM filters sections by ALL scopes).  
  * [x] Implemented **Token Rotation Strategy** with automatic refresh when access token expires (1-hour lifetime).  
  * [x] Created app/api/auth/[...nextauth]/route.ts handlers for all auth routes.  
  * [x] Created app/api/auth/oauth-data/route.ts to fetch full OAuth data from Redis.  
  * [x] Created middleware.ts for route protection (dashboard routes and /api/proxy require authentication).  
  * [x] Created TypeScript type definitions (src/types/next-auth.d.ts) for session and JWT.  
* [x] 2.1.1 Mock Authentication & Multi-Mode Support:  
  Goal: Enable offline development and CI testing without OSM credentials (addresses 2.1.A requirements).  
  * [x] **Environment Variables:**  
    1. [x] Add MOCK_AUTH_ENABLED to .env.example (defaults to false)  
    2. [x] Verify NEXT_PUBLIC_USE_MSW exists for MSW control (already configured in Phase 0)  
  * [x] **Mock Provider Implementation:**  
    1. [x] Add mock credentials provider to src/lib/auth.ts that:  
       1. Returns a dummy session when MOCK_AUTH_ENABLED=true  
       2. Bypasses OAuth flow entirely  
       3. Provides fixed user data (e.g., "Mock User", mock@example.com)  
  * [x] **Conditional Provider Loading:**  
    1. [x] Update src/lib/auth.ts to conditionally include OSM or Mock provider based on MOCK_AUTH_ENABLED  
    2. [x] Ensure token rotation is skipped for Mock provider  
  * [x] **Mock Session Data:**  
    1. [x] Create src/mocks/mockSession.ts with:  
       1. Mock user profile (id, name, email, roles)  
       2. Mock section access (to test section picker with multiple sections)  
       3. Mock roles (admin, standard viewer, read-only)  
  * [x] **Documentation:**  
    1. [x] Update README with three operation modes:  
       1. **Real Auth + Real Data:** Production mode  
       2. **Real Auth + Mock Data:** Safe development with real OAuth  
       3. **Mock Auth + Mock Data:** Offline/CI mode (no credentials needed)  
* [x] **2.2 State & Configuration Seeding:**  
  * [x] Setup TanStack Query (staleTime: 5 mins) for API data.  
  * [x] Setup Zustand for Session state (Section ID, User Role).  
  * [x] **Seeding:** Create src/lib/config-loader.ts to load defaults.json into Redis if empty (Required for User Role detection).  
* [x] **2.3 Initialization Flow:**  
  * [x] ~~Implement getStartupData fetch on app load~~ **REPLACED:** OAuth `/oauth/resource` provides section data directly.  
  * [x] Created StartupInitializer component to fetch OAuth data from Redis via `/api/auth/oauth-data`.  
  * [x] User role determination based on section permissions (events + programme = standard, events only = readonly).  
  * [x] Multi-section support verified (4 sections accessible with correct scope).  
  * [x] Deprecated `getStartupData` endpoint in src/lib/api.ts (OAuth resource replaces it).  
  * [x] **Redis OAuth Storage Pattern:**  
    1. profile() callback stores full OAuth data in Redis (sections, scopes, permissions).  
    2. JWT contains only user ID, section IDs array, and scopes.  
    3. StartupInitializer fetches full data from Redis on app load.  
    4. Solves JWT size limits (was causing 431 errors with full section history).  
  
* [ ] **2.4 App Shell & Login UI:**  
  * [x] **Theme Configuration:**  
    1. [x] Select **Typeface**: Adopted Barlow + Barlow Semi Condensed from shadcn tokens.  
    2. [x] Select **Palette**: Adopted customised shadcn OKLCH variables in `globals.css` (Primary, Secondary, Muted, Accent, Destructive, etc.).  
    3. [x] **Radius & Spacing**: Mapped radius and shadows; Tailwind theme extended to token aliases (bg-primary, text-muted-foreground, rounded-md, shadow-sm).  
    4. [x] **Dark Mode Policy**: No dark mode required; `.dark` tokens retained for future but not surfaced.  
  * [x] Build **Section Picker Modal** if user has access to multiple sections (styled with theme tokens).  
  * [x] **Login Screen:** Implement `src/app/page.tsx` (Root/Login) with:  
    1. [x] "Sign in with OSM" button (triggers real OAuth).  
    2. [x] "Dev: Mock Login" button (conditionally rendered only if MOCK_AUTH_ENABLED=true).  
    3. [x] Clean, professional landing UI (Aesthetics & Theme).  
  * [x] **App Shell:** Build Sidebar and Header using shadcn/ui; wired into `layout.tsx`.  
  * [x] **Error Pages:** Create `error.tsx` (500), `not-found.tsx` (404), and `forbidden.tsx` (403).  
  * [x] **TEST (Component):** Verify Login UI logic:  
    1. [x] Mock MOCK_AUTH_ENABLED=false -> Verify only OSM button renders.  
    2. [x] Mock MOCK_AUTH_ENABLED=true -> Verify both buttons render.  
    3. [x] Verify "Sign in with OSM" calls signIn('osm').  
    4. [x] Verify "Mock Login" calls signIn('credentials', { redirect: true }).  
  * [ ] **TEST (Manual):** Verify the 3 Operation Modes:  
    1. [ ] Real Auth + Real Data (MOCK_AUTH_ENABLED=false, NEXT_PUBLIC_USE_MSW=false).  
    2. [x] Real Auth + Mock Data (MOCK_AUTH_ENABLED=false, NEXT_PUBLIC_USE_MSW=true) - **Verified working**.  
    3. [ ] Mock Auth + Mock Data (MOCK_AUTH_ENABLED=true, NEXT_PUBLIC_USE_MSW=true).  
* [ ] **2.5 Progressive Hydration (Events List):**  
  * [ ] Create `/dashboard/events` route protected by auth.  
  * [ ] Implement TanStack Query hook to fetch events via `/api/proxy/ext/events/events/?action=getEvents`.  
  * [ ] Render loading skeletons during data fetch.  
  * [ ] Display events in card grid or table layout (responsive).  
  * [ ] Show event name, dates, attendance count (from event data).  
  * [ ] Lazy-load event details on card click (defer Participants, Structure to detail view).  
* [ ] **2.6 E2E Testing Setup:**  
  * [ ] Install Playwright and configure for HTTPS localhost.  
  * [ ] Create basic E2E test structure (tests/e2e/ directory).  
  * [ ] **TEST (E2E):** Verify **Login Flow**:  
    1. [ ] Unauthenticated user accessing /dashboard redirected to login page.  
    2. [ ] Clicking "Sign in with OSM" triggers OAuth flow (verify redirect to OSM).  
    3. [ ] After OAuth callback, user lands on /dashboard.  
  * [ ] **TEST (E2E):** Verify **Section Picker**:  
    1. [ ] Multi-section user sees modal after login.  
    2. [ ] Section selection persists in Zustand store.  
    3. [ ] Selected section ID used in subsequent API calls.  
  * [ ] **TEST (E2E):** Verify **Events List**:  
    1. [ ] /dashboard/events renders loading skeletons.  
    2. [ ] Events load and display correctly.  
    3. [ ] Mobile view shows cards, desktop shows table (if implemented).

**Status:** Phase 2 Core Complete (Auth, State, Shell UI, API Browser). 

**Phase 2 Completion Notes:**
- OAuth authentication with Redis storage pattern (solves JWT size limits)
- Multi-section support verified (4 sections accessible)
- StartupInitializer without infinite loops
- Mock auth + Real auth modes implemented
- API Browser built as optional developer tool (Phase 5.1 completed early)
- Redis availability handling with 503 Service Unavailable
- README documentation updated with required Redis startup

**Next:** Complete Phase 2.4 manual testing (Real Auth + Real Data mode) → Install Playwright → Build Events List → Write E2E Tests → Move to Phase 3.

## **Pre-Phase 3: Real API Testing Readiness Assessment**

**Goal:** Verify safety layer protection before enabling real OSM API calls.

### **Safety Layer Verification Checklist**

✅ **Rate Limiting (Bottleneck):**
- [x] 80% safety factor implemented (800 req/hr from 1000 limit)
- [x] Dynamic reservoir updates based on X-RateLimit headers
- [x] Minimum 50ms between requests (smooth throttling)
- [x] Maximum 5 concurrent requests
- [x] Automatic soft lock when quota < 10%
- [x] Integration tests passing (6 tests)

✅ **Circuit Breaker (Redis):**
- [x] Soft lock (pause queue) when quota exhausted
- [x] Hard lock (global 503 halt) on X-Blocked header detection
- [x] Redis connectivity check (isRedisAvailable)
- [x] 503 Service Unavailable on Redis failure
- [x] Quota tracking in Redis (remaining, limit, reset)
- [x] Integration tests for soft/hard locks passing

✅ **Read-Only Enforcement:**
- [x] POST/PUT/DELETE/PATCH handlers return 405 Method Not Allowed
- [x] Integration test verifying mutation blocking
- [x] Frontend never calls mutations (proxy is only route to OSM)

✅ **Authentication & Authorization:**
- [x] OAuth 2.0 flow with token rotation
- [x] Access token refresh on 1-hour expiry
- [x] Session-based auth with NextAuth
- [x] Middleware protection on /dashboard and /api/proxy routes
- [x] Redis storage for OAuth data (24hr TTL)

✅ **Error Handling:**
- [x] Standardized JSON error responses with codes
- [x] 401 Unauthorized for missing auth
- [x] 429 Too Many Requests for soft lock
- [x] 503 Service Unavailable for hard lock/Redis down
- [x] Retry-After headers on 429/503 responses
- [x] X-Blocked detection triggers 5-minute hard lock

✅ **Caching:**
- [x] Read-through cache pattern (5-minute TTL)
- [x] Cache-Control headers on responses
- [x] Redis-based cache storage
- [x] Integration test for cache hit/miss

✅ **Observability:**
- [x] Pino structured logging
- [x] Rate limit logging (remaining, limit, reset)
- [x] Circuit breaker event logging
- [x] Proxy request logging (method, path, status, duration, cached)
- [x] Redis event logging

### **Testing Status**

**Unit Tests:** ✅ 16/16 passing (Zod schemas)
**Integration Tests:** ✅ 6/6 passing (Proxy route)
**Total:** ✅ 22/22 tests passing

**Mock Data Testing:** ✅ Complete
- Mock Auth + Mock Data mode verified
- Real Auth + Mock Data mode verified
- API Browser endpoints returning mock data
- MSW interception working correctly

**Real API Testing:** ⚠️ NOT YET TESTED
- Real Auth + Real Data mode not yet verified
- Rate limiting behavior with actual OSM API not confirmed
- X-RateLimit header parsing not tested against real responses
- Circuit breaker thresholds not validated with real quota

### **Recommended Testing Approach for Real API**

**Phase 1: Single Request Verification (Low Risk)**
1. Set NEXT_PUBLIC_USE_MSW=false in .env.local
2. Use API Browser to make ONE request to a safe read endpoint (e.g., getEvents)
3. Verify:
   - Request succeeds and returns real data
   - X-RateLimit headers are parsed and logged
   - Redis quota is updated correctly
   - Response is cached in Redis
4. Check logs for rate limit info and bottleneck execution

**Phase 2: Rate Limit Observation (Medium Risk)**
1. Make 5-10 requests through API Browser with different endpoints
2. Monitor rate limit quota decrease in logs
3. Verify reservoir updates in bottleneck
4. Confirm caching reduces duplicate requests
5. Check that requests are throttled (50ms minimum spacing)

**Phase 3: Soft Lock Testing (Controlled Risk)**
1. Manually trigger soft lock by setting Redis key:
   ```bash
   docker exec -it seee-redis-local redis-cli SET circuit:soft_lock 1 EX 60
   ```
2. Attempt request via API Browser
3. Verify 429 response with Retry-After header
4. Wait for lock expiry and retry

**Phase 4: Real Quota Monitoring (Production-like)**
1. Use Events List page to load ~10-20 events
2. Monitor quota consumption over 30 minutes
3. Verify quota never exceeds 80% threshold
4. Confirm soft lock triggers if approaching limit

### **Risk Assessment**

**LOW RISK** - Safe to proceed with real API testing:
- ✅ All safety mechanisms implemented and tested with mocks
- ✅ Read-only enforcement prevents data corruption
- ✅ Rate limiting has 20% buffer (800/1000)
- ✅ Circuit breaker will halt system before hard limit
- ✅ Caching reduces redundant requests
- ✅ Error handling prevents cascading failures

**MEDIUM RISK** - Unknown behaviors:
- ⚠️ OSM API rate limit headers format not confirmed (assumed standard)
- ⚠️ X-Blocked header behavior not observed in practice
- ⚠️ Actual request timing and quota consumption unknown

**MITIGATION STRATEGIES:**
- Start with API Browser (manual, controlled requests)
- Monitor logs closely during initial testing
- Keep requests under 50/hour initially to stay well under limit
- Test during low-usage times (avoid peak hours)
- Have Redis connection ready to manually set locks if needed

### **Decision Point**

**Recommendation:** ✅ **SAFE TO PROCEED** with real API testing using the phased approach above.

All safety mechanisms are in place and tested. The risk is low because:
1. Read-only prevents damage
2. Rate limiting has substantial buffer
3. Circuit breaker provides fail-safe
4. Manual testing allows observation before automation
5. API Browser provides controlled test environment

**Action:** Complete Phase 2.4 manual testing (Real Auth + Real Data) using API Browser before building Events List.

---

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
  * [ ] Manual testing with real API calls (pending Phase 2.4 real mode verification).  
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
* [ ] **6.2 Documentation:**  
  * [ ] Update README.md with "First Run" instructions for Admins.

## **Phase transition instructions**

* Do not move on to a new phase without explicit permission  
* Make sure to update the plan after each phase  
* Check that what is coming next still makes sense  
* Commit code at the end of each phase

