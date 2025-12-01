# SEEE Expedition Dashboard: Implementation Plan

## Reference: Target File Structure
All agents must adhere to this structure. Do not create new top-level directories without approval.

```text
.
├── .github/
│   └── copilot-instructions.md   # AI Agent behavior rules
├── docs/
│   └── GEMINI_CONTEXT.md         # Architecture primer
├── scripts/
│   └── sanitize_data.py          # Script to scrub PII from raw dumps
├── public/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── proxy/            # The Safety Layer API Route
│   │   ├── (dashboard)/          # Protected routes
│   │   ├── layout.tsx            # Main App Shell
│   │   └── page.tsx              # Login/Landing
│   ├── components/
│   │   ├── ui/                   # shadcn/ui primitives (Button, Card)
│   │   ├── domain/               # Feature-specific (PatrolList, ReadinessTable)
│   │   └── layout/               # Nav, Sidebar
│   ├── lib/
│   │   ├── api.ts                # Fetch wrappers
│   │   ├── bottleneck.ts         # Rate limiting logic
│   │   ├── redis.ts              # Vercel KV connection
│   │   ├── schemas.ts            # Zod definitions (Tier 1 & 2)
│   │   └── utils.ts              # cn() and generic helpers
│   ├── mocks/
│   │   ├── handlers.ts           # MSW Handlers
│   │   └── data/                 # Sanitized JSON (NO PII allowed here)
│   ├── store/
│   │   └── use-store.ts          # Zustand (Session, Theme, Config)
│   └── types/                    # TypeScript interfaces
├── .env.example
├── .env.local
├── docker-compose.yml            # Local Redis
├── middleware.ts
└── next.config.mjs
```


## Phase 0: Infrastructure & Data Sanitization ✅ COMPLETE

**Goal:** Establish local environment and generate safe test data from raw API dumps.

  - [x] **0.1 Repository & Environment Setup:**
      - [x] Initialize Next.js 14+: Manually created config files preserving existing `src/` structure
      - [x] Install Core Deps: `lucide-react clsx tailwind-merge zod zustand @tanstack/react-query @tanstack/react-table date-fns`
      - [x] Install Safety Deps: `bottleneck ioredis server-only`
      - [x] Install Dev Deps: `msw jest @testing-library/react @testing-library/jest-dom`
      - [x] **Configure Gitignore (Critical):**
          - Added `*.txt` (To ignore raw API dumps like `getmembers.txt` containing PII).
          - Added `.env*.local`.
          - Ensured `src/mocks/data/*.json` is *not* ignored (so agents can use sanitized data).
  - [x] **0.2 Docker Infrastructure:**
      - [x] Created `docker-compose.yml` for local Redis (exposed on port 6379) to mimic Vercel KV.
      - [x] Created `.env.example` with configuration templates
  - [x] **0.3 Data Sanitization (Critical):**
      - [x] `scripts/sanitize_data.py` exists and has already been run
      - [x] Scrubbing logic implemented to anonymize PII using mock names
      - [x] Safe JSON files verified in `src/mocks/data/` - no email/phone/address data found
      - [x] `api_map.json` created to document all API endpoints
  - [x] **0.4 MSW Setup:**
      - [x] Configured Mock Service Worker (`src/mocks/handlers.ts`) to intercept requests using `api_map.json`
      - [x] Created handlers that return the sanitized JSON from `src/mocks/data/`
      - [x] Setup browser and server MSW instances
      - [x] Created MSWProvider component for conditional initialization
      - [x] Initialized MSW service worker in public directory
      - [x] Integrated MSW into root layout

**Status:** ✅ Phase 0 Complete - Dev server running successfully on http://localhost:3000

## Phase 1: The Safety Layer (Backend & Proxy)

**Goal:** Build the "Safety Shield" backend before any UI. All complexity regarding limits and validation lives here.

  - [ ] **1.1 Zod Schemas (`src/lib/schemas.ts`):**
      - [ ] **Tier 1 (Strict):** Schemas for `getmembers.txt` and `getEvents.txt` (IDs, Names). Fail if invalid.
      - [ ] **Tier 2 (Permissive):** Schemas for `getFlexiRecordData.txt` and `getBadgeRecord.txt`. Allow `null` or missing fields.
  - [ ] **1.2 Rate Limiting Engine:**
      - [ ] Implement `bottleneck` logic in `src/lib/bottleneck.ts` to cap requests at 80% of API limit.
      - [ ] Parse `X-RateLimit-Remaining` headers from responses.
  - [ ] **1.3 Circuit Breaker (Redis):**
      - [ ] **Soft Lock:** Pause queue if Quota hits 0.
      - [ ] **Hard Lock:** Global 503 Halt if `X-Blocked` is detected.
  - [ ] **1.4 Proxy Route:**
      - [ ] Build `app/api/proxy/[...path]/route.ts`.
      - [ ] Integrate Validation, Limiting, and Locking.
      - [ ] Ensure `POST` requests are rejected (Read-Only Policy).

## Phase 2: Core State & "Shell" UI

**Goal:** Connect frontend to backend using the "Waterfall" strategy.

  - [ ] **2.1 State Configuration:**
      - [ ] Setup TanStack Query (`staleTime: 5 mins`) for API data.
      - [ ] Setup Zustand for Session state (Section ID, User Role).
  - [ ] **2.2 Initialization Flow:**
      - [ ] Implement `getStartupData` fetch on app load.
      - [ ] Build **Section Picker Modal** if user has access to multiple sections (detected from startup data).
  - [ ] **2.3 App Shell:**
      - [ ] Build Sidebar and Header using `shadcn/ui`.
      - [ ] Implement "Theming Mechanism" via `globals.css` variables.
  - [ ] **2.4 Progressive Hydration:**
      - [ ] Fetch Event Index (`getEvents`) -\> Render Skeletons.
      - [ ] Lazy-load details (Participants, Structure) via throttled queue.

## Phase 3: Data Visualization

**Goal:** Render complex tables and mobile views.

  - [ ] **3.1 Readiness View (Desktop):**
      - [ ] Implement TanStack Table with "Grouping" (Patrol/Status).
      - [ ] Integrate Tier 2 Validation: corrupted logistics data shows empty cells, not crashes.
  - [ ] **3.2 Mobile Transformation:**
      - [ ] Implement `hidden md:table` logic.
      - [ ] Build **Participant Cards** grid for mobile users (displaying name + icons).
  - [ ] **3.3 Flexi-Column Mapping:**
      - [ ] Build Dialog to resolve ambiguous columns from `getFlexiRecordStructure.txt` (e.g., mapping "Tent Group" vs "Tents").
      - [ ] Persist mapping preferences to Zustand.
  - [ ] **3.4 Derived State:**
      - [ ] Implement memoized selectors for "First Aid Readiness" stats to avoid re-renders.

## Phase 4: Configuration & Admin

**Goal:** Allow non-technical updates to business rules.

  - [ ] **4.1 Adapter Pattern:**
      - [ ] Create `FlexiAdapter` for parsing `getFlexiRecordData`.
      - [ ] Create `BadgeAdapter` for parsing `getBadgeRecord`.
  - [ ] **4.2 Seeding:**
      - [ ] Create `defaults.json` loader to populate Redis config if empty.
  - [ ] **4.3 Admin UI:**
      - [ ] Build "User Management" table.
      - [ ] Build "Factory Reset" (restore defaults) button.
      - [ ] Ensure these routes/components are protected by `userRole === 'admin'`.

## Phase 5: Hardening & Export

**Goal:** Finalize export features and production safety.

  - [ ] **5.1 PDF Export:** Implement React-PDF generation for Patrol sheets.
  - [ ] **5.2 Excel Export:** Implement SheetJS export for offline editing.
  - [ ] **5.3 Circuit Breaker UI:** Create "System Cooling Down" overlay for Soft Locks.
  - [ ] **5.4 Observability:** Integrate Pino logger for `X-RateLimit` tracking.


## Phase tranisition instructions

- Do not move on to a new phase without explicit permission
- Make sure to update the plan after each phase
- Check that what is coming next still makes sense
- Commit code at the end of each phase