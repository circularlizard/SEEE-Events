# Expedition Preparation Fork Plan

Transform the SEEE web-based dashboard into a containerized, locally-hosted web application with incremental feature delivery: read-only foundation first, then extended data, Tutor LMS integration, and finally OSM write-back capabilities.

---

## Executive Summary

This plan outlines the transformation of the current SEEE web-based dashboard (a Next.js web app hosted on Vercel with Redis) into a **local-first, containerized expedition preparation platform**. The fork will:

- Run entirely on a local workstation via Docker Compose
- Replace Redis/Vercel KV with a local PostgreSQL database (encrypted at rest)
- Maintain OAuth with OSM with non-aggressive sync (startup + manual triggers)
- Add Tutor LMS Pro integration for training status tracking
- **Write training completion data back to OSM badge/flexi records**
- Support Bronze/Silver/Gold expeditions across multiple Explorer sections
- **Persistent teams for communications and kit handling** with member movement for availability
- Focus on expedition preparation workflows: training verification, data quality, and team formation

---

## Key Design Decisions (Post-User Input)

| Aspect | Decision | Rationale |
| ------ | -------- | --------- |
| **Database** | PostgreSQL in Docker | Containerized stack, robust local storage, encrypted volumes |
| **Tutor LMS** | API integration with Tutor LMS Pro | Direct pull of course attendance/completion records |
| **Multi-Section** | Per-section data with section-scoped expedition views | Teams don't span sections; separate Bronze/Silver/Gold expeditions |
| **OSM Sync** | Hybrid OAuth with startup sync + manual trigger | Balances freshness with OSM rate limit compliance |
| **Architecture** | Web app in Docker container | Next.js served from container, accessed at localhost:3000 |
| **OAuth** | Adapt NextAuth for localhost first; custom PKCE only if NextAuth cannot work | NextAuth already supports PKCE + custom providers; full replacement is high-risk |
| **Rate Limiting** | In-memory Bottleneck.js (no Redis, no PostgreSQL) | Local single-instance app; Redis atomics → Postgres is non-trivial for no gain |
| **DB Migrations** | `node-pg-migrate`; one numbered file per phase | Prevents schema drift between phases; agents commit migration files as phase artifacts |

---

## Pre-Implementation Blockers

These must be resolved **before** any agent starts work. Agents must not begin a phase if its blocker is unresolved.

| Blocker | Who resolves | Blocks |
|---------|-------------|--------|
| OSM OAuth app registered for `http://localhost:3000/api/auth/callback/osm` | Human (manual — register on OSM developer portal) | EP-1B (Auth) |
| OSM write API payloads documented in `docs/osm-write-api-contract.md` | Human (obtain from OSM docs/support) | EP-4 entirely |
| Tutor LMS API discovery completed (`docs/tutor-api-contract.md` exists) | EP-3.0 agent sub-task | EP-3.1 onwards |
| Multi-user session isolation design reviewed and approved | Human sign-off on EP-1B design doc | EP-1B implementation |

---

## Phase EP-0: Fork Execution

**Goal:** Create the physical fork of the repository and establish the new project structure.

### EP-0.1 Fork Strategy

**Option A: Git Fork (Recommended)**
```bash
# Create new repository from current
git clone /home/david/projects/OSM-Tools /home/david/projects/expedition-prep
cd /home/david/projects/expedition-prep
git remote remove origin
git remote add origin <new-repo-url>
```

**Option B: In-Place Branch (if keeping same repo)**
```bash
git checkout -b expedition-prep-fork
# Or work in existing repo with feature flags
```

### EP-0.2 Initial Cleanup

**Files to Remove:**
- Vercel-specific config files (if any)
- Redis docker-compose.yml (will replace with PostgreSQL)

**Files to Modify:**
- `package.json` - remove ioredis, add pg
- `README.md` - rewrite for local installation

### EP-0.3 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Decision on fork strategy (new repo vs branch)

**Exit Criteria:**
```bash
#!/usr/bin/env bash
set -e
# 1. Dependencies install cleanly
npm install
# 2. TypeScript compiles
npx tsc --noEmit
# 3. Lint passes
npm run lint
# 4. No Redis/ioredis imports remain in src/
! grep -r 'ioredis\|from.*redis' src/ --include='*.ts' --include='*.tsx'
# 5. No Vercel KV imports remain
! grep -r 'vercel/kv\|@vercel/kv\|KV_REST' src/ --include='*.ts' --include='*.tsx'
echo "=== EP-0 PASSED ==="
git tag ep-0-verified
```

### EP-0.4 Fork Environment Variables

Create `.env.example` in the new repo with all required variables:

```bash
# PostgreSQL (Docker)
DATABASE_URL=postgresql://app:changeme@localhost:5432/expedition_prep

# Encryption (generate 32-byte hex key at first run)
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# OSM OAuth (register app at https://www.openstreetmap.org/oauth2/applications)
OSM_CLIENT_ID=<from OSM developer portal>
OSM_REDIRECT_URI=http://localhost:3000/api/auth/callback/osm

# NextAuth
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Tutor LMS (Phase EP-3 only)
TUTOR_API_URL=https://your-tutor-site.com/wp-json/tutor/v1
TUTOR_API_KEY=<from Tutor LMS Pro settings>
```

---

## Component Reuse Analysis

Based on review of `/home/david/projects/OSM-Tools`, here's what to reuse vs create fresh:

### REUSE (Minimal Changes)

| Component | Location | Rationale |
| --------- | -------- | --------- |
| **Zod Schemas** | `src/lib/schemas.ts` | Same OSM data shapes. Only add DB-specific schemas for local tables |
| **UI Components** | `src/components/ui/*.tsx` | shadcn/ui components are framework-agnostic. Keep as-is |
| **Export Utilities** | `src/lib/export/*` | Excel/PDF formatting logic unchanged. Just swap data source |
| **API Endpoint Definitions** | `src/lib/api-endpoints.ts` | Same OSM endpoints. Reuse for URL construction |
| **Bottleneck (Rate Limiter)** | `src/lib/bottleneck.ts` | Core throttling logic reusable. **Remove Redis quota storage; use in-memory queue** (Bottleneck.js default). No PostgreSQL needed for rate limiting in a local app. |
| **Domain Components** | `src/components/domain/EventCard.tsx`, `EventsTable.tsx`, etc. | UI components adaptable with new data hooks |
| **Tailwind Config** | `tailwind.config.ts`, `globals.css` | Styling system remains identical |
| **Testing Setup** | `jest.config.ts`, `playwright.config.ts` | Test frameworks reusable. Adapt tests for new data layer |

### ADAPT (Modify for Local-First)

| Component | Location | Changes Required |
| --------- | -------- | ---------------- |
| **TanStack Query Hooks** | `src/hooks/use*.ts` | Swap from calling `/api/proxy/*` to calling local API routes that query PostgreSQL |
| **Session/Auth** | `src/components/Session*.tsx` | Replace NextAuth session with custom PKCE OAuth session stored in PostgreSQL |
| **Startup Initializer** | `src/components/StartupInitializer.tsx` | Replace Redis checks with PostgreSQL connection checks |
| **Section Selector** | `src/components/SectionSelector.tsx` | Adapt to read from local DB instead of session |
| **Query Keys** | `src/lib/query-keys.ts` | Keep key patterns, but cache invalidation strategy changes |

### REPLACE (Create Fresh)

| Component | Current | Replacement |
| --------- | ------- | ----------- |
| **Authentication** | `src/lib/auth.ts` (NextAuth) | **Adapt first:** change callback URL to `localhost`, replace Redis token store with PostgreSQL. Custom PKCE only if NextAuth provably cannot work. |
| **Redis Client** | `src/lib/redis.ts` | PostgreSQL client: `src/lib/db/postgres.ts` |
| **API Proxy Layer** | `src/app/api/proxy/[...path]/route.ts` | Local sync service: `src/lib/sync/osm-sync.ts` |
| **Config Loader** | `src/lib/config-loader.ts` (Redis-based) | PostgreSQL-based config storage |
| **Docker Compose** | `docker-compose.yml` (Redis only) | New: PostgreSQL + app services |
| **Database Schema** | None (Redis key-value) | New: `sql/init-schema.sql` with table definitions |
| **Token Storage** | Redis `setOAuthData` | PostgreSQL encrypted token storage |
| **Rate Limit Quota** | Redis `getQuota/updateQuota` | PostgreSQL quota tracking |

### PACKAGE CHANGES

**Remove:**
- `ioredis` - No longer needed
- `next-auth` - Replaced with custom PKCE

**Add:**
- `pg` - PostgreSQL client
- `crypto` (built-in) - For PKCE code generation and token encryption

### FILE MAPPINGS (Example)

```
Current Architecture                    Fork Architecture
--------------------                    -------------------
src/lib/redis.ts         ──────────→   DELETE
src/lib/auth.ts          ──────────→   ADAPT (localhost callback, PostgreSQL token store)
src/lib/bottleneck.ts    ──────────→   ADAPT (replace Redis calls)
src/lib/schemas.ts       ──────────→   REUSE (add DB schemas)
src/lib/api.ts           ──────────→   ADAPT (replace proxy calls)
src/lib/export/*         ──────────→   REUSE
src/components/ui/*      ──────────→   REUSE
src/components/domain/* ──────────→   ADAPT (new data hooks)
src/hooks/use*.ts        ──────────→   ADAPT (local DB source)
src/app/api/proxy/*      ──────────→   DELETE
src/app/api/sync/*       ──────────→   NEW (local sync API)
src/lib/db/*             ──────────→   NEW (PostgreSQL layer)
src/lib/oauth/*          ──────────→   NEW (PKCE implementation — only if NextAuth adaptation fails)
src/lib/sync/*           ──────────→   NEW (OSM sync service)
```

---

## Phase EP-1: Foundation - Read-Only Proof of Concept

**Goal:** Prove out the entire architecture end-to-end with minimal data types (members, patrols, sections only - no events, badges, flexi yet). Everything read-only.

**Success Criteria:**
- `docker-compose up` starts app + database
- OSM OAuth with PKCE flow completes successfully
- Members and patrols sync from OSM to local PostgreSQL
- Basic UI displays member list from local DB (not direct OSM calls)
- Works offline after initial sync

### EP-1.1 Architecture

**Web App in Container:**
```
┌─────────────────────────────────────────┐
│  Browser → http://localhost:3000        │
│           ↓                            │
│  ┌─────────────────────────────┐      │
│  │  Next.js App (Container)    │      │
│  │  - API routes (local)       │      │
│  │  - React UI                 │      │
│  │  - OSM OAuth with PKCE      │      │
│  └──────────┬──────────────────┘      │
│             ↓                          │
│  ┌─────────────────────────────┐      │
│  │  PostgreSQL (Container)     │      │
│  │  - members, patrols, tokens  │      │
│  └─────────────────────────────┘      │
└─────────────────────────────────────────┘
```

### EP-1.2 Minimal Database Schema

```sql
-- Core tables only
users               -- Local user registry (osm_user_id, display_name, last_login)
osm_tokens          -- Encrypted OAuth tokens; FK to users (access, refresh, expiry, iv)
sections            -- Section metadata
members             -- Member data (section_id, patrol_id)
patrols             -- Patrol structure per section
sync_log            -- Audit trail for debugging
```

**Migration:** Create `sql/migrations/001_phase1_init.sql` using `node-pg-migrate`. Run via `npm run db:migrate`. Exit criteria includes `npm run db:migrate` completing cleanly on a fresh database.

**Session isolation (multi-user sequential):** Each OSM login creates or updates a row in `users`. The `osm_tokens` FK to `users` ensures tokens are scoped per user. Logout sets the token row to expired; login reuses the existing user row.

### EP-1.3 Authentication Approach

**Strategy:** Adapt existing `src/lib/auth.ts` (NextAuth) for localhost **before** attempting custom PKCE. NextAuth supports PKCE natively (`checks: ['pkce']`) and handles multi-user sequential sessions via cookie isolation for free.

**Preferred path — NextAuth adaptation (attempt this first):**
1. Change OSM provider callback URL to `http://localhost:3000/api/auth/callback/osm`
2. Replace Redis adapter with PostgreSQL adapter (`src/lib/db/auth-adapter.ts`)
3. Tokens stored encrypted (AES-256-GCM) in `osm_tokens` with per-token IV alongside ciphertext
4. Logout invalidates the token row; login reuses existing `users` row
5. Add `npm run db:migrate` to app startup to apply Phase EP-1 migration

**Fallback path — Custom PKCE (only if NextAuth adaptation is provably blocked):**
1. Implement PKCE verifier/challenge in `src/lib/oauth/pkce.ts` using Node `crypto` built-in
2. Store `code_verifier` in short-lived DB row during OAuth dance
3. Exchange code + verifier for tokens; encrypt and store in `osm_tokens`
4. Implement session cookie manually scoped to `user_id`

> **Agent decision point:** Attempt NextAuth adaptation first. If blocked, document the specific reason in `docs/handoffs/ep-1b-auth-decision.md` before switching to the fallback path.

### EP-1.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-0-verified` git tag exists (EP-0 exit criteria passed)
- [ ] Pre-implementation blocker: OSM OAuth app registered for `localhost` callback (see Pre-Implementation Blockers)
- [ ] `node-pg-migrate` added to package.json

**Parallel Sub-Tracks:**

| Track | Agent owns | Files | Can start when |
|-------|-----------|-------|----------------|
| **1A: DB Layer** | Schema migration, pg client, encrypted token store | `sql/migrations/001_*.sql`, `src/lib/db/` | EP-0 complete |
| **1B: Auth** | NextAuth adaptation (or PKCE fallback), session isolation | `src/lib/auth.ts`, `src/app/api/auth/` | 1A TypeScript interfaces committed |
| **1C: Sync** | OSM member/patrol/section sync service | `src/lib/sync/osm-sync.ts`, `src/app/api/sync/` | 1A TypeScript interfaces committed |

**Integration sub-task** (sequential, after all three tracks merge): wire auth → sync → DB end-to-end; build basic member list UI.

**Implementation Tasks:**
1. (1A) Docker Compose setup (app + postgres services)
2. (1A) PostgreSQL migration `001_phase1_init.sql` via `node-pg-migrate`; `npm run db:migrate` script
3. (1A) PostgreSQL client + AES-256-GCM token encryption (`src/lib/db/`)
4. (1B) Auth adaptation (NextAuth localhost + PostgreSQL token store + `users` table)
5. (1C) OSM sync for members/patrols/sections only
6. (Integration) Basic UI: member list view from local DB

**Handoff document required:** Agent must commit `docs/handoffs/ep-1-complete.md` (what was done, decisions made, known limitations) before the phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-1 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="db|auth|sync"
# Stack health
docker-compose up -d && sleep 8
docker-compose exec postgres pg_isready -U app
curl -sf http://localhost:3000/api/health | grep -q '"status"'
# Migration ran cleanly
npm run db:migrate
# All Phase EP-1 tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "users"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "osm_tokens"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "members"
# No unresolved TODOs in phase-owned files
! grep -rn "TODO\|FIXME" src/lib/db/ src/lib/sync/ src/lib/auth.ts
# Handoff doc committed
test -f docs/handoffs/ep-1-complete.md
echo "=== EP-1 PASSED ==="
git tag ep-1-verified
docker-compose down
```

**Rollback:**
```bash
docker-compose down -v  # Removes all data; re-run verify to start fresh
```

---

## Phase EP-2: Extended Data Types (Read-Only)

**Goal:** Add remaining OSM data types (events, attendance, badges, flexi). Still read-only.

**Prerequisite:** Phase EP-1 exit criteria passed (`ep-1-verified` tag exists).

### EP-2.1 Extended Database Schema

**Add to existing tables:**
```sql
events              -- Expedition events
event_attendance    -- Attendance records
flexi_records       -- Custom flexi record data  
badge_records       -- Badge completion data
```

**Still NOT included:**
- tutor_courses, tutor_completions (Phase EP-3)
- expedition_teams, team_members (Phase EP-5)

### EP-2.2 Sync Strategy by Data Type

| Data Type | Frequency | Notes |
|-----------|-----------|-------|
| events | Startup + manual | Event updates are intentional |
| flexi_records | Startup + every 4h | Updated frequently for prep |
| badge_records | Startup + every 4h | Training status changes |
| attendance | On event view | Fetch when user opens event |

### EP-2.3 UI Features Added

- Event list view (from local DB)
- Event detail with attendance
- Badge status view
- Flexi record display
- Sync status dashboard (when last sync, what's stale)
- Manual sync button with progress indicator

### EP-2.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-1-verified` git tag exists (Phase EP-1 exit criteria passed)
- [ ] Members/patrols visible in local DB

**Parallel Sub-Tracks:**

| Track | Agent owns | Can start when |
|-------|-----------|----------------|
| **2A: Data Sync** | events/badges/flexi sync extensions, `sql/migrations/002_*.sql` | EP-1 complete |
| **2B: UI Views** | Event list, event detail, sync dashboard | 2A TypeScript interfaces committed (can use mock data) |

**Implementation Tasks:**
1. (2A) PostgreSQL migration `002_phase2_events.sql`; run `npm run db:migrate`
2. (2A) Events, badge_records, flexi_records tables and sync services
3. (2B) Event list/detail views from local DB
4. (2B) Sync status dashboard + manual sync button

**Handoff document required:** Agent must commit `docs/handoffs/ep-2-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-2 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit
# Migrations run cleanly
npm run db:migrate
# All Phase EP-2 tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "events"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "badge_records"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "flexi_records"
# E2E: event list renders
npx playwright test tests/e2e/features/ep2-events.feature
# Rate limit smoke test (assert max 80 req/min)
node scripts/verify-rate-limit.mjs
# No unresolved TODOs in phase-owned sync files
! grep -rn "TODO\|FIXME" src/lib/sync/
# Handoff doc committed
test -f docs/handoffs/ep-2-complete.md
echo "=== EP-2 PASSED ==="
git tag ep-2-verified
```

**Rollback:**
```bash
docker-compose down -v  # Re-sync restores everything
```

---

## Phase EP-3: Tutor LMS Integration (Read-Only)

**Goal:** Add Tutor LMS as second data source. Still read-only - just viewing Tutor data alongside OSM.

**Prerequisite:** Phase EP-2 exit criteria passed (`ep-2-verified` tag exists).

### EP-3.0 Tutor LMS Discovery Gate (mandatory — blocks all EP-3.1+ work)

> ⛔ **EP-3.1 through EP-3.4 cannot start until this sub-task is complete.**

A single agent verifies the Tutor LMS Pro API and commits `docs/tutor-api-contract.md` with:
- Authentication method (API key / OAuth / session cookie?)
- Verified course listing endpoint + response shape
- Verified student completion endpoint + response shape
- Student-to-OSM-member mapping strategy (email match? name match? manual map?)
- Rate limits and pagination details
- Any credential provisioning steps required

**Exit gate:** `test -f docs/tutor-api-contract.md` — this file must exist and be committed before any EP-3.1 agent starts.

### EP-3.1 Tutor LMS Database Schema

**Add tables:**
```sql
tutor_courses       -- Course metadata from Tutor
tutor_completions   -- Student completion records
tutor_students      -- Student-to-member mapping cache
```

### EP-3.2 Tutor Sync Service

```typescript
// src/lib/sync/tutor-sync.ts
- fetchCourses()                    // Get all courses
- fetchStudentProgress(courseId)    // Get completions for course
- mapStudentsToMembers()            // Match Tutor emails to OSM members
```

**Sync Strategy:**
- Manual trigger only (no auto-sync for Tutor)
- User configures Tutor API credentials once
- User maps courses to sections manually
- Refresh on demand

### EP-3.3 UI Features Added

- Tutor configuration page (API URL, credentials)
- Course-to-section mapping UI
- Training matrix: members × (OSM badges + Tutor courses)
- Training gaps highlighted (missing either source)

### EP-3.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-2-verified` git tag exists (Phase EP-2 exit criteria passed)
- [ ] `docs/tutor-api-contract.md` exists and is committed (EP-3.0 discovery complete)

**Parallel Sub-Tracks (after EP-3.0 complete):**

| Track | Agent owns | Can start when |
|-------|-----------|----------------|
| **3A: Tutor Sync** | Tutor API client, `tutor_*` tables, migration `003_*.sql` | EP-3.0 complete |
| **3B: Training Matrix UI** | Combined OSM + Tutor readiness view | 3A TypeScript interfaces committed |

**Implementation Tasks:**
1. (3A) PostgreSQL migration `003_phase3_tutor.sql`; run `npm run db:migrate`
2. (3A) Tutor API client (`src/lib/sync/tutor-sync.ts`) using contract from EP-3.0
3. (3A) Student-to-member mapping service
4. (3B) Tutor configuration page (API URL, credentials)
5. (3B) Course-to-section mapping UI
6. (3B) Training matrix view (OSM badges + Tutor courses side by side)

**Handoff document required:** Agent must commit `docs/handoffs/ep-3-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-3 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="tutor"
npm run db:migrate
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "tutor_courses"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "tutor_completions"
# E2E: training matrix renders with both data sources
npx playwright test tests/e2e/features/ep3-training-matrix.feature
# Handoff doc committed
test -f docs/handoffs/ep-3-complete.md
echo "=== EP-3 PASSED ==="
git tag ep-3-verified
```

**Rollback:**
```bash
# Tutor data only - re-sync restores from Tutor API
```

---

## Phase EP-4: OSM Write-Back (The Big Change)

**Goal:** First write capability - update OSM badge/flexi records with training completion from Tutor.

**Prerequisite:** Phase EP-3 exit criteria passed (`ep-3-verified` tag exists).

> ⛔ **This phase cannot start until `docs/osm-write-api-contract.md` exists in the repo**, containing: verified endpoint URLs, example request/response payloads, required OAuth scopes for write operations, and write-endpoint rate limits. This document must be provided by the human before any agent begins EP-4.

> **Implementation note:** This phase must be implemented **sequentially by a single agent** (not parallelized) due to write-safety requirements. A second human review of the write logic is strongly recommended before the EP-4 exit criteria are run against a live OSM account.

### EP-4.1 Write-Back Architecture

**Critical Change:** App now writes to OSM (not read-only anymore).

```typescript
// src/lib/sync/osm-write.ts
- updateBadgeRecord(sectionId, memberId, badgeId, status)
- updateFlexiRecord(sectionId, memberId, extraId, data)
- queueWrite(operation)           // Queue for rate limiting
- previewChanges()                // Show what will change before commit
```

**Safety Measures:**
- Preview diff before any write (what will change)
- User must confirm before committing
- Write queue with priority (user-initiated > background)
- Audit log of all writes (what, when, before/after values)
- Undo capability for recent writes (if OSM API supports it)

### EP-4.2 Write-Back UI

- Training matrix: "Mark Complete" buttons for missing training
- Preview dialog: shows what will change in OSM
- Confirm/Cancel flow
- Write status dashboard (pending, completed, failed)

### EP-4.3 Required: OSM API Payloads

**Pending from user:**
- Badge record update endpoint + payload format
- Flexi record update endpoint + payload format
- Required OAuth scopes for write operations

**Placeholder until provided:**
```typescript
export async function updateBadgeRecord(...) {
  throw new Error('OSM write API not implemented - awaiting payload examples from user');
}
```

### EP-4.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-3-verified` git tag exists (Phase EP-3 exit criteria passed)
- [ ] `docs/osm-write-api-contract.md` exists and is committed (human-provided)
- [ ] Tutor data flowing into training matrix

**Implementation Tasks:**
1. Add write methods to OSM sync service (`src/lib/sync/osm-write.ts`)
2. Create write queue with in-memory Bottleneck.js rate limiting
3. Create preview/confirm UI flow (diff dialog before any write)
4. Add audit logging table (`sql/migrations/004_phase4_audit.sql`)

**Handoff document required:** Agent must commit `docs/handoffs/ep-4-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-4 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="write|audit"
npm run db:migrate
# Audit log table exists
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "audit_log"
# E2E: preview diff visible before write; audit log populated after
npx playwright test tests/e2e/features/ep4-writeback.feature
# Handoff doc committed
test -f docs/handoffs/ep-4-complete.md
echo "=== EP-4 PASSED ==="
git tag ep-4-verified
```

---

## Phase EP-5: Team Formation & Persistence

**Goal:** Expedition team builder with persistent team storage.

**Prerequisite:** Phase EP-2 exit criteria passed (`ep-2-verified` tag exists).

> **Note:** Team data is local-only (PostgreSQL only — no OSM write-back required). This phase does **not** depend on Phase EP-4. It can be developed in parallel with EP-3 or EP-4 after EP-2 is verified.

### EP-5.1 Team Data Model

```sql
expedition_teams:
  - id (PK)
  - event_id (FK)           -- Teams are event-specific
  - name                    -- e.g., "Team A", "Walking Group 1"
  - created_at
  - updated_at

team_members:
  - team_id (FK)
  - member_id (FK)
  - role                    -- "leader", "member"
  - tent_group (optional)
  - walking_group (optional)
  - added_at
```

**Key Behavior:**
- Teams tied to specific events
- Member can be on different teams for different events
- Move members between teams for availability

### EP-5.2 Team Builder UI

- Event selection first
- Participant pool (filterable from event attendance)
- Drag-and-drop team formation
- Balance indicators (gender, age, patrol distribution)
- Save/Load teams (persist to local DB)

### EP-5.3 Team Export

- PDF team sheets (attendance, contacts, medical)
- CSV export
- Print briefing packs

### EP-5.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-2-verified` git tag exists (Phase EP-2 exit criteria passed)

**Implementation Tasks:**
1. PostgreSQL migration `005_phase5_teams.sql` (expedition_teams, team_members tables)
2. Team CRUD API routes
3. Team builder UI with drag-and-drop formation
4. Balance indicators (gender, age, patrol distribution)
5. PDF/CSV export for team sheets

**Handoff document required:** Agent must commit `docs/handoffs/ep-5-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-5 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="team"
npm run db:migrate
# Team tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "expedition_teams"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "team_members"
# E2E: create team, move member, verify persistence after restart
npx playwright test tests/e2e/features/ep5-teams.feature
# Handoff doc committed
test -f docs/handoffs/ep-5-complete.md
echo "=== EP-5 PASSED ==="
git tag ep-5-verified
```

---

## Phase EP-6: Data Quality & Hardening

**Goal:** Data quality checks, polish, testing, documentation.

**Prerequisite:** EP-1 through EP-5 complete (all `ep-N-verified` tags exist). EP-5 and EP-4 may complete in any order.

### EP-6.1 Data Quality Dashboard

**Pre-expedition checks:**
- Contact info complete (phone, email, emergency contact)
- Medical info present
- Training complete (OSM badges + Tutor courses)
- Age verification for expedition level (Bronze/Silver/Gold requirements)
- Exportable issue lists

### EP-6.2 Security Hardening

- Database encryption at rest (PostgreSQL volume encryption)
- OAuth token encryption (AES-256-GCM)
- Tutor API credential encryption
- Optional: simple password protection on startup

### EP-6.3 Testing Strategy

- Unit tests (Jest) - reuse existing where possible
- Integration tests with Docker test stack
- E2E tests (Playwright) against local Docker

### EP-6.4 Documentation

- README.md: Local installation, Docker setup
- FIRST_RUN.md: Setup wizard walkthrough
- TROUBLESHOOTING.md: Common issues
- API_INTEGRATION.md: OSM/Tutor API details

### EP-6.5 Entry/Exit Criteria

**Entry Criteria:**
- [ ] All `ep-N-verified` tags exist for EP-1 through EP-5

**Handoff document required:** Agent must commit `docs/handoffs/ep-6-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-6 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit
npx playwright test
# No Redis/Vercel dependencies remain anywhere in src/
! grep -r 'ioredis\|from.*redis\|vercel/kv\|KV_REST' src/ --include='*.ts' --include='*.tsx'
# All required docs exist
test -f README.md
test -f FIRST_RUN.md
test -f docs/handoffs/ep-1-complete.md
test -f docs/handoffs/ep-2-complete.md
test -f docs/handoffs/ep-3-complete.md
test -f docs/handoffs/ep-4-complete.md
test -f docs/handoffs/ep-5-complete.md
test -f docs/handoffs/ep-6-complete.md
# No unresolved TODOs/FIXMEs across all source
! grep -rn "TODO\|FIXME" src/ --include='*.ts' --include='*.tsx'
echo "=== EP-6 PASSED ==="
git tag ep-6-verified
```

---

## Agent Implementation Structure

Phases are **independent, verifiable work units**. Each phase produces a git tag and a committed handoff document before the next agent may start.

### Revised Phase Map (Parallel Where Safe)

```
EP-0: Fork Setup (sequential, ~1 agent)
  └── [ep-0-verified] ──────────────────────────────────────────────────────
EP-1A: DB Layer ───┐
EP-1B: Auth        ├──→ [integration EP-1] ──→ [ep-1-verified] ──────────────
EP-1C: Sync  ──────┘
EP-2A: Data Sync ──┐
EP-2B: UI Views    ├──→ [integration EP-2] ──→ [ep-2-verified] ─────┬────────
                   ┘                                                  │
EP-3.0: Tutor Discovery (sequential gate)                            │
EP-3A: Tutor Sync ─┐                                                 ↓
EP-3B: Training UI ├──→ [ep-3-verified]          EP-# Expedition Preparation Fork Plan

Transform the SEEE web-based dashboard into a containerized, locally-hosted web application with incremental feature delivery: read-only foundation first, then extended data, Tutor LMS integration, and finally OSM write-back capabilities.

---

## Executive Summary

This plan outlines the transformation of the current SEEE web-based dashboard (a Next.js web app hosted on Vercel with Redis) into a **local-first, containerized expedition preparation platform**. The fork will:

- Run entirely on a local workstation via Docker Compose
- Replace Redis/Vercel KV with a local PostgreSQL database (encrypted at rest)
- Maintain OAuth with OSM with non-aggressive sync (startup + manual triggers)
- Add Tutor LMS Pro integration for training status tracking
- **Write training completion data back to OSM badge/flexi records**
- Support Bronze/Silver/Gold expeditions across multiple Explorer sections
- **Persistent teams for communications and kit handling** with member movement for availability
- Focus on expedition preparation workflows: training verification, data quality, and team formation

---

## Key Design Decisions (Post-User Input)

| Aspect | Decision | Rationale |
| ------ | -------- | --------- |
| **Database** | PostgreSQL in Docker | Containerized stack, robust local storage, encrypted volumes |
| **Tutor LMS** | API integration with Tutor LMS Pro | Direct pull of course attendance/completion records |
| **Multi-Section** | Per-section data with section-scoped expedition views | Teams don't span sections; separate Bronze/Silver/Gold expeditions |
| **OSM Sync** | Hybrid OAuth with startup sync + manual trigger | Balances freshness with OSM rate limit compliance |
| **Architecture** | Web app in Docker container | Next.js served from container, accessed at localhost:3000 |
| **OAuth** | Adapt NextAuth for localhost first; custom PKCE only if NextAuth cannot work | NextAuth already supports PKCE + custom providers; full replacement is high-risk |
| **Rate Limiting** | In-memory Bottleneck.js (no Redis, no PostgreSQL) | Local single-instance app; Redis atomics → Postgres is non-trivial for no gain |
| **DB Migrations** | `node-pg-migrate`; one numbered file per phase | Prevents schema drift between phases; agents commit migration files as phase artifacts |

---

## Pre-Implementation Blockers

These must be resolved **before** any agent starts work. Agents must not begin a phase if its blocker is unresolved.

| Blocker | Who resolves | Blocks |
|---------|-------------|--------|
| OSM OAuth app registered for `http://localhost:3000/api/auth/callback/osm` | Human (manual — register on OSM developer portal) | EP-1B (Auth) |
| OSM write API payloads documented in `docs/osm-write-api-contract.md` | Human (obtain from OSM docs/support) | EP-4 entirely |
| Tutor LMS API discovery completed (`docs/tutor-api-contract.md` exists) | EP-3.0 agent sub-task | EP-3.1 onwards |
| Multi-user session isolation design reviewed and approved | Human sign-off on EP-1B design doc | EP-1B implementation |

---

## Phase EP-0: Fork Execution

**Goal:** Create the physical fork of the repository and establish the new project structure.

### EP-0.1 Fork Strategy

**Option A: Git Fork (Recommended)**
```bash
# Create new repository from current
git clone /home/david/projects/OSM-Tools /home/david/projects/expedition-prep
cd /home/david/projects/expedition-prep
git remote remove origin
git remote add origin <new-repo-url>
```

**Option B: In-Place Branch (if keeping same repo)**
```bash
git checkout -b expedition-prep-fork
# Or work in existing repo with feature flags
```

### EP-0.2 Initial Cleanup

**Files to Remove:**
- Vercel-specific config files (if any)
- Redis docker-compose.yml (will replace with PostgreSQL)

**Files to Modify:**
- `package.json` - remove ioredis, add pg
- `README.md` - rewrite for local installation

### EP-0.3 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Decision on fork strategy (new repo vs branch)

**Exit Criteria:**
```bash
#!/usr/bin/env bash
set -e
# 1. Dependencies install cleanly
npm install
# 2. TypeScript compiles
npx tsc --noEmit
# 3. Lint passes
npm run lint
# 4. No Redis/ioredis imports remain in src/
! grep -r 'ioredis\|from.*redis' src/ --include='*.ts' --include='*.tsx'
# 5. No Vercel KV imports remain
! grep -r 'vercel/kv\|@vercel/kv\|KV_REST' src/ --include='*.ts' --include='*.tsx'
echo "=== EP-0 PASSED ==="
git tag ep-0-verified
```

### EP-0.4 Fork Environment Variables

Create `.env.example` in the new repo with all required variables:

```bash
# PostgreSQL (Docker)
DATABASE_URL=postgresql://app:changeme@localhost:5432/expedition_prep

# Encryption (generate 32-byte hex key at first run)
ENCRYPTION_KEY=<run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">

# OSM OAuth (register app at https://www.openstreetmap.org/oauth2/applications)
OSM_CLIENT_ID=<from OSM developer portal>
OSM_REDIRECT_URI=http://localhost:3000/api/auth/callback/osm

# NextAuth
NEXTAUTH_SECRET=<run: openssl rand -base64 32>
NEXTAUTH_URL=http://localhost:3000

# Tutor LMS (Phase EP-3 only)
TUTOR_API_URL=https://your-tutor-site.com/wp-json/tutor/v1
TUTOR_API_KEY=<from Tutor LMS Pro settings>
```

---

## Component Reuse Analysis

Based on review of `/home/david/projects/OSM-Tools`, here's what to reuse vs create fresh:

### REUSE (Minimal Changes)

| Component | Location | Rationale |
| --------- | -------- | --------- |
| **Zod Schemas** | `src/lib/schemas.ts` | Same OSM data shapes. Only add DB-specific schemas for local tables |
| **UI Components** | `src/components/ui/*.tsx` | shadcn/ui components are framework-agnostic. Keep as-is |
| **Export Utilities** | `src/lib/export/*` | Excel/PDF formatting logic unchanged. Just swap data source |
| **API Endpoint Definitions** | `src/lib/api-endpoints.ts` | Same OSM endpoints. Reuse for URL construction |
| **Bottleneck (Rate Limiter)** | `src/lib/bottleneck.ts` | Core throttling logic reusable. **Remove Redis quota storage; use in-memory queue** (Bottleneck.js default). No PostgreSQL needed for rate limiting in a local app. |
| **Domain Components** | `src/components/domain/EventCard.tsx`, `EventsTable.tsx`, etc. | UI components adaptable with new data hooks |
| **Tailwind Config** | `tailwind.config.ts`, `globals.css` | Styling system remains identical |
| **Testing Setup** | `jest.config.ts`, `playwright.config.ts` | Test frameworks reusable. Adapt tests for new data layer |

### ADAPT (Modify for Local-First)

| Component | Location | Changes Required |
| --------- | -------- | ---------------- |
| **TanStack Query Hooks** | `src/hooks/use*.ts` | Swap from calling `/api/proxy/*` to calling local API routes that query PostgreSQL |
| **Session/Auth** | `src/components/Session*.tsx` | Replace NextAuth session with custom PKCE OAuth session stored in PostgreSQL |
| **Startup Initializer** | `src/components/StartupInitializer.tsx` | Replace Redis checks with PostgreSQL connection checks |
| **Section Selector** | `src/components/SectionSelector.tsx` | Adapt to read from local DB instead of session |
| **Query Keys** | `src/lib/query-keys.ts` | Keep key patterns, but cache invalidation strategy changes |

### REPLACE (Create Fresh)

| Component | Current | Replacement |
| --------- | ------- | ----------- |
| **Authentication** | `src/lib/auth.ts` (NextAuth) | **Adapt first:** change callback URL to `localhost`, replace Redis token store with PostgreSQL. Custom PKCE only if NextAuth provably cannot work. |
| **Redis Client** | `src/lib/redis.ts` | PostgreSQL client: `src/lib/db/postgres.ts` |
| **API Proxy Layer** | `src/app/api/proxy/[...path]/route.ts` | Local sync service: `src/lib/sync/osm-sync.ts` |
| **Config Loader** | `src/lib/config-loader.ts` (Redis-based) | PostgreSQL-based config storage |
| **Docker Compose** | `docker-compose.yml` (Redis only) | New: PostgreSQL + app services |
| **Database Schema** | None (Redis key-value) | New: `sql/init-schema.sql` with table definitions |
| **Token Storage** | Redis `setOAuthData` | PostgreSQL encrypted token storage |
| **Rate Limit Quota** | Redis `getQuota/updateQuota` | PostgreSQL quota tracking |

### PACKAGE CHANGES

**Remove:**
- `ioredis` - No longer needed
- `next-auth` - Replaced with custom PKCE

**Add:**
- `pg` - PostgreSQL client
- `crypto` (built-in) - For PKCE code generation and token encryption

### FILE MAPPINGS (Example)

```
Current Architecture                    Fork Architecture
--------------------                    -------------------
src/lib/redis.ts         ──────────→   DELETE
src/lib/auth.ts          ──────────→   ADAPT (localhost callback, PostgreSQL token store)
src/lib/bottleneck.ts    ──────────→   ADAPT (replace Redis calls)
src/lib/schemas.ts       ──────────→   REUSE (add DB schemas)
src/lib/api.ts           ──────────→   ADAPT (replace proxy calls)
src/lib/export/*         ──────────→   REUSE
src/components/ui/*      ──────────→   REUSE
src/components/domain/* ──────────→   ADAPT (new data hooks)
src/hooks/use*.ts        ──────────→   ADAPT (local DB source)
src/app/api/proxy/*      ──────────→   DELETE
src/app/api/sync/*       ──────────→   NEW (local sync API)
src/lib/db/*             ──────────→   NEW (PostgreSQL layer)
src/lib/oauth/*          ──────────→   NEW (PKCE implementation — only if NextAuth adaptation fails)
src/lib/sync/*           ──────────→   NEW (OSM sync service)
```

---

## Phase EP-1: Foundation - Read-Only Proof of Concept

**Goal:** Prove out the entire architecture end-to-end with minimal data types (members, patrols, sections only - no events, badges, flexi yet). Everything read-only.

**Success Criteria:**
- `docker-compose up` starts app + database
- OSM OAuth with PKCE flow completes successfully
- Members and patrols sync from OSM to local PostgreSQL
- Basic UI displays member list from local DB (not direct OSM calls)
- Works offline after initial sync

### EP-1.1 Architecture

**Web App in Container:**
```
┌─────────────────────────────────────────┐
│  Browser → http://localhost:3000        │
│           ↓                            │
│  ┌─────────────────────────────┐      │
│  │  Next.js App (Container)    │      │
│  │  - API routes (local)       │      │
│  │  - React UI                 │      │
│  │  - OSM OAuth with PKCE      │      │
│  └──────────┬──────────────────┘      │
│             ↓                          │
│  ┌─────────────────────────────┐      │
│  │  PostgreSQL (Container)     │      │
│  │  - members, patrols, tokens  │      │
│  └─────────────────────────────┘      │
└─────────────────────────────────────────┘
```

### EP-1.2 Minimal Database Schema

```sql
-- Core tables only
users               -- Local user registry (osm_user_id, display_name, last_login)
osm_tokens          -- Encrypted OAuth tokens; FK to users (access, refresh, expiry, iv)
sections            -- Section metadata
members             -- Member data (section_id, patrol_id)
patrols             -- Patrol structure per section
sync_log            -- Audit trail for debugging
```

**Migration:** Create `sql/migrations/001_phase1_init.sql` using `node-pg-migrate`. Run via `npm run db:migrate`. Exit criteria includes `npm run db:migrate` completing cleanly on a fresh database.

**Session isolation (multi-user sequential):** Each OSM login creates or updates a row in `users`. The `osm_tokens` FK to `users` ensures tokens are scoped per user. Logout sets the token row to expired; login reuses the existing user row.

### EP-1.3 Authentication Approach

**Strategy:** Adapt existing `src/lib/auth.ts` (NextAuth) for localhost **before** attempting custom PKCE. NextAuth supports PKCE natively (`checks: ['pkce']`) and handles multi-user sequential sessions via cookie isolation for free.

**Preferred path — NextAuth adaptation (attempt this first):**
1. Change OSM provider callback URL to `http://localhost:3000/api/auth/callback/osm`
2. Replace Redis adapter with PostgreSQL adapter (`src/lib/db/auth-adapter.ts`)
3. Tokens stored encrypted (AES-256-GCM) in `osm_tokens` with per-token IV alongside ciphertext
4. Logout invalidates the token row; login reuses existing `users` row
5. Add `npm run db:migrate` to app startup to apply Phase EP-1 migration

**Fallback path — Custom PKCE (only if NextAuth adaptation is provably blocked):**
1. Implement PKCE verifier/challenge in `src/lib/oauth/pkce.ts` using Node `crypto` built-in
2. Store `code_verifier` in short-lived DB row during OAuth dance
3. Exchange code + verifier for tokens; encrypt and store in `osm_tokens`
4. Implement session cookie manually scoped to `user_id`

> **Agent decision point:** Attempt NextAuth adaptation first. If blocked, document the specific reason in `docs/handoffs/ep-1b-auth-decision.md` before switching to the fallback path.

### EP-1.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-0-verified` git tag exists (EP-0 exit criteria passed)
- [ ] Pre-implementation blocker: OSM OAuth app registered for `localhost` callback (see Pre-Implementation Blockers)
- [ ] `node-pg-migrate` added to package.json

**Parallel Sub-Tracks:**

| Track | Agent owns | Files | Can start when |
|-------|-----------|-------|----------------|
| **1A: DB Layer** | Schema migration, pg client, encrypted token store | `sql/migrations/001_*.sql`, `src/lib/db/` | EP-0 complete |
| **1B: Auth** | NextAuth adaptation (or PKCE fallback), session isolation | `src/lib/auth.ts`, `src/app/api/auth/` | 1A TypeScript interfaces committed |
| **1C: Sync** | OSM member/patrol/section sync service | `src/lib/sync/osm-sync.ts`, `src/app/api/sync/` | 1A TypeScript interfaces committed |

**Integration sub-task** (sequential, after all three tracks merge): wire auth → sync → DB end-to-end; build basic member list UI.

**Implementation Tasks:**
1. (1A) Docker Compose setup (app + postgres services)
2. (1A) PostgreSQL migration `001_phase1_init.sql` via `node-pg-migrate`; `npm run db:migrate` script
3. (1A) PostgreSQL client + AES-256-GCM token encryption (`src/lib/db/`)
4. (1B) Auth adaptation (NextAuth localhost + PostgreSQL token store + `users` table)
5. (1C) OSM sync for members/patrols/sections only
6. (Integration) Basic UI: member list view from local DB

**Handoff document required:** Agent must commit `docs/handoffs/ep-1-complete.md` (what was done, decisions made, known limitations) before the phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-1 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="db|auth|sync"
# Stack health
docker-compose up -d && sleep 8
docker-compose exec postgres pg_isready -U app
curl -sf http://localhost:3000/api/health | grep -q '"status"'
# Migration ran cleanly
npm run db:migrate
# All Phase EP-1 tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "users"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "osm_tokens"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "members"
# No unresolved TODOs in phase-owned files
! grep -rn "TODO\|FIXME" src/lib/db/ src/lib/sync/ src/lib/auth.ts
# Handoff doc committed
test -f docs/handoffs/ep-1-complete.md
echo "=== EP-1 PASSED ==="
git tag ep-1-verified
docker-compose down
```

**Rollback:**
```bash
docker-compose down -v  # Removes all data; re-run verify to start fresh
```

---

## Phase EP-2: Extended Data Types (Read-Only)

**Goal:** Add remaining OSM data types (events, attendance, badges, flexi). Still read-only.

**Prerequisite:** Phase EP-1 exit criteria passed (`ep-1-verified` tag exists).

### EP-2.1 Extended Database Schema

**Add to existing tables:**
```sql
events              -- Expedition events
event_attendance    -- Attendance records
flexi_records       -- Custom flexi record data  
badge_records       -- Badge completion data
```

**Still NOT included:**
- tutor_courses, tutor_completions (Phase EP-3)
- expedition_teams, team_members (Phase EP-5)

### EP-2.2 Sync Strategy by Data Type

| Data Type | Frequency | Notes |
|-----------|-----------|-------|
| events | Startup + manual | Event updates are intentional |
| flexi_records | Startup + every 4h | Updated frequently for prep |
| badge_records | Startup + every 4h | Training status changes |
| attendance | On event view | Fetch when user opens event |

### EP-2.3 UI Features Added

- Event list view (from local DB)
- Event detail with attendance
- Badge status view
- Flexi record display
- Sync status dashboard (when last sync, what's stale)
- Manual sync button with progress indicator

### EP-2.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-1-verified` git tag exists (Phase EP-1 exit criteria passed)
- [ ] Members/patrols visible in local DB

**Parallel Sub-Tracks:**

| Track | Agent owns | Can start when |
|-------|-----------|----------------|
| **2A: Data Sync** | events/badges/flexi sync extensions, `sql/migrations/002_*.sql` | EP-1 complete |
| **2B: UI Views** | Event list, event detail, sync dashboard | 2A TypeScript interfaces committed (can use mock data) |

**Implementation Tasks:**
1. (2A) PostgreSQL migration `002_phase2_events.sql`; run `npm run db:migrate`
2. (2A) Events, badge_records, flexi_records tables and sync services
3. (2B) Event list/detail views from local DB
4. (2B) Sync status dashboard + manual sync button

**Handoff document required:** Agent must commit `docs/handoffs/ep-2-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-2 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit
# Migrations run cleanly
npm run db:migrate
# All Phase EP-2 tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "events"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "badge_records"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "flexi_records"
# E2E: event list renders
npx playwright test tests/e2e/features/ep2-events.feature
# Rate limit smoke test (assert max 80 req/min)
node scripts/verify-rate-limit.mjs
# No unresolved TODOs in phase-owned sync files
! grep -rn "TODO\|FIXME" src/lib/sync/
# Handoff doc committed
test -f docs/handoffs/ep-2-complete.md
echo "=== EP-2 PASSED ==="
git tag ep-2-verified
```

**Rollback:**
```bash
docker-compose down -v  # Re-sync restores everything
```

---

## Phase EP-3: Tutor LMS Integration (Read-Only)

**Goal:** Add Tutor LMS as second data source. Still read-only - just viewing Tutor data alongside OSM.

**Prerequisite:** Phase EP-2 exit criteria passed (`ep-2-verified` tag exists).

### EP-3.0 Tutor LMS Discovery Gate (mandatory — blocks all EP-3.1+ work)

> ⛔ **EP-3.1 through EP-3.4 cannot start until this sub-task is complete.**

A single agent verifies the Tutor LMS Pro API and commits `docs/tutor-api-contract.md` with:
- Authentication method (API key / OAuth / session cookie?)
- Verified course listing endpoint + response shape
- Verified student completion endpoint + response shape
- Student-to-OSM-member mapping strategy (email match? name match? manual map?)
- Rate limits and pagination details
- Any credential provisioning steps required

**Exit gate:** `test -f docs/tutor-api-contract.md` — this file must exist and be committed before any EP-3.1 agent starts.

### EP-3.1 Tutor LMS Database Schema

**Add tables:**
```sql
tutor_courses       -- Course metadata from Tutor
tutor_completions   -- Student completion records
tutor_students      -- Student-to-member mapping cache
```

### EP-3.2 Tutor Sync Service

```typescript
// src/lib/sync/tutor-sync.ts
- fetchCourses()                    // Get all courses
- fetchStudentProgress(courseId)    // Get completions for course
- mapStudentsToMembers()            // Match Tutor emails to OSM members
```

**Sync Strategy:**
- Manual trigger only (no auto-sync for Tutor)
- User configures Tutor API credentials once
- User maps courses to sections manually
- Refresh on demand

### EP-3.3 UI Features Added

- Tutor configuration page (API URL, credentials)
- Course-to-section mapping UI
- Training matrix: members × (OSM badges + Tutor courses)
- Training gaps highlighted (missing either source)

### EP-3.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-2-verified` git tag exists (Phase EP-2 exit criteria passed)
- [ ] `docs/tutor-api-contract.md` exists and is committed (EP-3.0 discovery complete)

**Parallel Sub-Tracks (after EP-3.0 complete):**

| Track | Agent owns | Can start when |
|-------|-----------|----------------|
| **3A: Tutor Sync** | Tutor API client, `tutor_*` tables, migration `003_*.sql` | EP-3.0 complete |
| **3B: Training Matrix UI** | Combined OSM + Tutor readiness view | 3A TypeScript interfaces committed |

**Implementation Tasks:**
1. (3A) PostgreSQL migration `003_phase3_tutor.sql`; run `npm run db:migrate`
2. (3A) Tutor API client (`src/lib/sync/tutor-sync.ts`) using contract from EP-3.0
3. (3A) Student-to-member mapping service
4. (3B) Tutor configuration page (API URL, credentials)
5. (3B) Course-to-section mapping UI
6. (3B) Training matrix view (OSM badges + Tutor courses side by side)

**Handoff document required:** Agent must commit `docs/handoffs/ep-3-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-3 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="tutor"
npm run db:migrate
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "tutor_courses"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "tutor_completions"
# E2E: training matrix renders with both data sources
npx playwright test tests/e2e/features/ep3-training-matrix.feature
# Handoff doc committed
test -f docs/handoffs/ep-3-complete.md
echo "=== EP-3 PASSED ==="
git tag ep-3-verified
```

**Rollback:**
```bash
# Tutor data only - re-sync restores from Tutor API
```

---

## Phase EP-4: OSM Write-Back (The Big Change)

**Goal:** First write capability - update OSM badge/flexi records with training completion from Tutor.

**Prerequisite:** Phase EP-3 exit criteria passed (`ep-3-verified` tag exists).

> ⛔ **This phase cannot start until `docs/osm-write-api-contract.md` exists in the repo**, containing: verified endpoint URLs, example request/response payloads, required OAuth scopes for write operations, and write-endpoint rate limits. This document must be provided by the human before any agent begins EP-4.

> **Implementation note:** This phase must be implemented **sequentially by a single agent** (not parallelized) due to write-safety requirements. A second human review of the write logic is strongly recommended before the EP-4 exit criteria are run against a live OSM account.

### EP-4.1 Write-Back Architecture

**Critical Change:** App now writes to OSM (not read-only anymore).

```typescript
// src/lib/sync/osm-write.ts
- updateBadgeRecord(sectionId, memberId, badgeId, status)
- updateFlexiRecord(sectionId, memberId, extraId, data)
- queueWrite(operation)           // Queue for rate limiting
- previewChanges()                // Show what will change before commit
```

**Safety Measures:**
- Preview diff before any write (what will change)
- User must confirm before committing
- Write queue with priority (user-initiated > background)
- Audit log of all writes (what, when, before/after values)
- Undo capability for recent writes (if OSM API supports it)

### EP-4.2 Write-Back UI

- Training matrix: "Mark Complete" buttons for missing training
- Preview dialog: shows what will change in OSM
- Confirm/Cancel flow
- Write status dashboard (pending, completed, failed)

### EP-4.3 Required: OSM API Payloads

**Pending from user:**
- Badge record update endpoint + payload format
- Flexi record update endpoint + payload format
- Required OAuth scopes for write operations

**Placeholder until provided:**
```typescript
export async function updateBadgeRecord(...) {
  throw new Error('OSM write API not implemented - awaiting payload examples from user');
}
```

### EP-4.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-3-verified` git tag exists (Phase EP-3 exit criteria passed)
- [ ] `docs/osm-write-api-contract.md` exists and is committed (human-provided)
- [ ] Tutor data flowing into training matrix

**Implementation Tasks:**
1. Add write methods to OSM sync service (`src/lib/sync/osm-write.ts`)
2. Create write queue with in-memory Bottleneck.js rate limiting
3. Create preview/confirm UI flow (diff dialog before any write)
4. Add audit logging table (`sql/migrations/004_phase4_audit.sql`)

**Handoff document required:** Agent must commit `docs/handoffs/ep-4-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-4 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="write|audit"
npm run db:migrate
# Audit log table exists
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "audit_log"
# E2E: preview diff visible before write; audit log populated after
npx playwright test tests/e2e/features/ep4-writeback.feature
# Handoff doc committed
test -f docs/handoffs/ep-4-complete.md
echo "=== EP-4 PASSED ==="
git tag ep-4-verified
```

---

## Phase EP-5: Team Formation & Persistence

**Goal:** Expedition team builder with persistent team storage.

**Prerequisite:** Phase EP-2 exit criteria passed (`ep-2-verified` tag exists).

> **Note:** Team data is local-only (PostgreSQL only — no OSM write-back required). This phase does **not** depend on Phase EP-4. It can be developed in parallel with EP-3 or EP-4 after EP-2 is verified.

### EP-5.1 Team Data Model

```sql
expedition_teams:
  - id (PK)
  - event_id (FK)           -- Teams are event-specific
  - name                    -- e.g., "Team A", "Walking Group 1"
  - created_at
  - updated_at

team_members:
  - team_id (FK)
  - member_id (FK)
  - role                    -- "leader", "member"
  - tent_group (optional)
  - walking_group (optional)
  - added_at
```

**Key Behavior:**
- Teams tied to specific events
- Member can be on different teams for different events
- Move members between teams for availability

### EP-5.2 Team Builder UI

- Event selection first
- Participant pool (filterable from event attendance)
- Drag-and-drop team formation
- Balance indicators (gender, age, patrol distribution)
- Save/Load teams (persist to local DB)

### EP-5.3 Team Export

- PDF team sheets (attendance, contacts, medical)
- CSV export
- Print briefing packs

### EP-5.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] `ep-2-verified` git tag exists (Phase EP-2 exit criteria passed)

**Implementation Tasks:**
1. PostgreSQL migration `005_phase5_teams.sql` (expedition_teams, team_members tables)
2. Team CRUD API routes
3. Team builder UI with drag-and-drop formation
4. Balance indicators (gender, age, patrol distribution)
5. PDF/CSV export for team sheets

**Handoff document required:** Agent must commit `docs/handoffs/ep-5-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-5 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit -- --testPathPattern="team"
npm run db:migrate
# Team tables exist
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "expedition_teams"
docker-compose exec postgres psql -U app -d expedition_prep -c "\dt" | grep -q "team_members"
# E2E: create team, move member, verify persistence after restart
npx playwright test tests/e2e/features/ep5-teams.feature
# Handoff doc committed
test -f docs/handoffs/ep-5-complete.md
echo "=== EP-5 PASSED ==="
git tag ep-5-verified
```

---

## Phase EP-6: Data Quality & Hardening

**Goal:** Data quality checks, polish, testing, documentation.

**Prerequisite:** EP-1 through EP-5 complete (all `ep-N-verified` tags exist). EP-5 and EP-4 may complete in any order.

### EP-6.1 Data Quality Dashboard

**Pre-expedition checks:**
- Contact info complete (phone, email, emergency contact)
- Medical info present
- Training complete (OSM badges + Tutor courses)
- Age verification for expedition level (Bronze/Silver/Gold requirements)
- Exportable issue lists

### EP-6.2 Security Hardening

- Database encryption at rest (PostgreSQL volume encryption)
- OAuth token encryption (AES-256-GCM)
- Tutor API credential encryption
- Optional: simple password protection on startup

### EP-6.3 Testing Strategy

- Unit tests (Jest) - reuse existing where possible
- Integration tests with Docker test stack
- E2E tests (Playwright) against local Docker

### EP-6.4 Documentation

- README.md: Local installation, Docker setup
- FIRST_RUN.md: Setup wizard walkthrough
- TROUBLESHOOTING.md: Common issues
- API_INTEGRATION.md: OSM/Tutor API details

### EP-6.5 Entry/Exit Criteria

**Entry Criteria:**
- [ ] All `ep-N-verified` tags exist for EP-1 through EP-5

**Handoff document required:** Agent must commit `docs/handoffs/ep-6-complete.md` before phase is considered done.

**Exit Criteria (must pass — all commands return exit code 0):**
```bash
#!/usr/bin/env bash
set -e
echo "=== EP-6 Verification ==="
npm run lint
npx tsc --noEmit
npm run test:unit
npx playwright test
# No Redis/Vercel dependencies remain anywhere in src/
! grep -r 'ioredis\|from.*redis\|vercel/kv\|KV_REST' src/ --include='*.ts' --include='*.tsx'
# All required docs exist
test -f README.md
test -f FIRST_RUN.md
test -f docs/handoffs/ep-1-complete.md
test -f docs/handoffs/ep-2-complete.md
test -f docs/handoffs/ep-3-complete.md
test -f docs/handoffs/ep-4-complete.md
test -f docs/handoffs/ep-5-complete.md
test -f docs/handoffs/ep-6-complete.md
# No unresolved TODOs/FIXMEs across all source
! grep -rn "TODO\|FIXME" src/ --include='*.ts' --include='*.tsx'
echo "=== EP-6 PASSED ==="
git tag ep-6-verified
```

---

## Agent Implementation Structure

Phases are **independent, verifiable work units**. Each phase produces a git tag and a committed handoff document before the next agent may start.

### Revised Phase Map (Parallel Where Safe)

```
EP-0: Fork Setup (sequential, ~1 agent)
  └── [ep-0-verified] ──────────────────────────────────────────────────────
EP-1A: DB Layer ───┐
EP-1B: Auth        ├──→ [integration EP-1] ──→ [ep-1-verified] ──────────────
EP-1C: Sync  ──────┘
EP-2A: Data Sync ──┐
EP-2B: UI Views    ├──→ [integration EP-2] ──→ [ep-2-verified] ─────┬────────
                   ┘                                                  │
EP-3.0: Tutor Discovery (sequential gate)                            │
EP-3A: Tutor Sync ─┐                                                 ↓
EP-3B: Training UI ├──→ [ep-3-verified]          EP-5: Teams ──→ [ep-5-verified]
                   ┘         │
EP-4: Write-Back (sequential) ──→ [ep-4-verified]
                                         │
EP-6: Hardening & Docs ──→ [ep-6-verified]
```

**EP-5 parallelism:** Teams are local-only data. EP-5 can run concurrently with EP-3 or EP-4 after EP-2 is verified.

### Branch Strategy

```
main
 └── ep-phase-N          (phase integration branch)
       ├── ep-NA-db        (sub-track A)
       ├── ep-NB-auth      (sub-track B)
       └── ep-NC-sync      (sub-track C)
```

- Sub-track branches merge to the phase integration branch only when **their own verification passes**.
- Phase integration branches merge to `main` only when the **full phase verification script exits 0**.
- Agents never commit directly to `main`.

### Non-Optional Handoff Requirements

Every phase boundary requires **ALL** of the following before the next phase/agent starts:

1. **Verification script exits 0** — no exceptions, no "mostly passing"
2. **TypeScript clean** — `npx tsc --noEmit` returns 0
3. **Handoff document committed** — `docs/handoffs/ep-N-complete.md` (what was done, decisions made, known limitations, what the next agent must not change)
4. **Git tag created** — `git tag ep-N-verified`
5. **`.env.example` updated** — any new env vars documented
6. **No TODOs/FIXMEs in phase-owned files** — grep check in verification script

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OSM rate limits during bulk sync | Implement exponential backoff; batch requests; user-visible progress |
| OSM write-back errors | Preview changes before commit; dry-run mode; undo capability for recent writes |
| Tutor LMS API changes | Abstract behind adapter pattern; versioned API client |
| Data encryption complexity | Use established libraries (node-crypto, pg client); audit trail |
| Container portability | Test on Linux, macOS, Windows (WSL2); clear prerequisites |
| Accidental data corruption in OSM | Confirmation dialogs; preview diffs; write logging for audit; staged writes (review then commit) |

---

## Additional Design Notes

> These were open design decisions at plan creation; they are now incorporated into the relevant phases above.

### OSM Write API Details

See EP-4.3 and the Pre-Implementation Blockers table. EP-4 is fully blocked on `docs/osm-write-api-contract.md` being provided by the human. The `osm-write.ts` stub in EP-4.3 is intentional until that document exists.

### Team-Event Relationship

**Data Model:**
- Teams are **event-specific** (event_id foreign key)
- A member can be on different teams for different events
- Team composition tracked per event

**Schema:**
```sql
expedition_teams:
  - id (PK)
  - event_id (FK to events)
  - name (e.g., "Team A", "Walking Group 1")
  - created_at
  - updated_at

team_members:
  - team_id (FK)
  - member_id (FK to members)
  - role (e.g., "leader", "member")
  - tent_group (optional)
  - walking_group (optional)
  - added_at
```

### Data Export/Backup Strategy

**Manual Export Only:**
- Export button in UI generates JSON dump of local DB
- User saves to location of their choice
- Import reverses the process
- Data is transient - source of truth is OSM + Tutor

**No Automated Backups:**
- Local data can be reconstructed by re-syncing from OSM
- Teams/configurations are the only non-reconstructible data
- Team data can be exported manually before major changes

### App Update Mechanism

**Via Git + Rebuild:**
```bash
# User update workflow
git pull origin main
docker-compose down
docker-compose up --build
```

**No Built-in Update Checker:**
- Simple git-based workflow
- README documents update process
- Database migrations handled via `node-pg-migrate`; `npm run db:migrate` runs automatically on app startup and applies any pending numbered migration files

### Error Handling & Recovery

**Sync Failures:**
- Partial sync state tracked in `sync_log` table
- Resume capability: can restart from last successful checkpoint
- User-visible error messages with actionable next steps

**Write-Back Failures:**
- Staged changes remain in queue until committed
- Failed writes can be retried individually
- Preview mode ensures user sees what will change before committing

**Database Corruption:**
- Export functionality allows data recovery
- Re-sync from OSM reconstructs member/event data
- Team configurations may need manual re-export/re-import

### Rollback Procedures

- **EP-1 / EP-2 (Foundation):** `docker-compose down -v` removes all data; migrations re-run on next start
- **EP-3+ (Tutor/Write-Back):** Re-sync from OSM/Tutor restores data; teams/configs may need manual re-import
- **Database Issues:** Export → `docker-compose down -v` → `docker-compose up` → `npm run db:migrate` → Import

---

## Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| **Tutor LMS API access** | ⚠️ Unverified | Resolved in EP-3.0 discovery sub-task |
| **Multi-user model** | ✅ Resolved | Sequential logins; `users` table + session isolation in EP-1B |
| **Existing data migration** | ✅ N/A | Starting fresh; no Redis data to migrate |
| **OSM Write-back target** | ⏳ Pending | Badge records vs flexi records — decide before EP-4 starts |
| **OSM Write API payloads** | ⏳ Blocked | Human must provide; required before EP-4 can start |
| **OSM OAuth localhost redirect** | ⏳ Pending | Human must register app on OSM developer portal before EP-1B |

---

## Success Criteria

- [ ] Single `docker-compose up` starts the full stack
- [ ] OSM OAuth works with encrypted local token storage
- [ ] Full offline operation after initial sync (with deferred write-back when online)
- [ ] Tutor LMS training data visible alongside OSM data
- [ ] Can write training completion back to OSM badge/flexi records
- [ ] Persistent teams for communications and kit handling
- [ ] Team builder supports member movement for availability
- [ ] Data quality checks flag expedition-ready vs not-ready participants
- [ ] All existing web app functionality preserved or enhanced
- [ ] No Redis/Vercel dependencies remain

5: Teams ──→ [ep-5-verified]
                   ┘         │
EP-4: Write-Back (sequential) ──→ [ep-4-verified]
                                         │
EP-6: Hardening & Docs ──→ [ep-6-verified]
```

**EP-5 parallelism:** Teams are local-only data. EP-5 can run concurrently with EP-3 or EP-4 after EP-2 is verified.

### Branch Strategy

```
main
 └── ep-phase-N          (phase integration branch)
       ├── ep-NA-db        (sub-track A)
       ├── ep-NB-auth      (sub-track B)
       └── ep-NC-sync      (sub-track C)
```

- Sub-track branches merge to the phase integration branch only when **their own verification passes**.
- Phase integration branches merge to `main` only when the **full phase verification script exits 0**.
- Agents never commit directly to `main`.

### Non-Optional Handoff Requirements

Every phase boundary requires **ALL** of the following before the next phase/agent starts:

1. **Verification script exits 0** — no exceptions, no "mostly passing"
2. **TypeScript clean** — `npx tsc --noEmit` returns 0
3. **Handoff document committed** — `docs/handoffs/ep-N-complete.md` (what was done, decisions made, known limitations, what the next agent must not change)
4. **Git tag created** — `git tag ep-N-verified`
5. **`.env.example` updated** — any new env vars documented
6. **No TODOs/FIXMEs in phase-owned files** — grep check in verification script

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OSM rate limits during bulk sync | Implement exponential backoff; batch requests; user-visible progress |
| OSM write-back errors | Preview changes before commit; dry-run mode; undo capability for recent writes |
| Tutor LMS API changes | Abstract behind adapter pattern; versioned API client |
| Data encryption complexity | Use established libraries (node-crypto, pg client); audit trail |
| Container portability | Test on Linux, macOS, Windows (WSL2); clear prerequisites |
| Accidental data corruption in OSM | Confirmation dialogs; preview diffs; write logging for audit; staged writes (review then commit) |

---

## Additional Design Notes

> These were open design decisions at plan creation; they are now incorporated into the relevant phases above.

### OSM Write API Details

See EP-4.3 and the Pre-Implementation Blockers table. EP-4 is fully blocked on `docs/osm-write-api-contract.md` being provided by the human. The `osm-write.ts` stub in EP-4.3 is intentional until that document exists.

### Team-Event Relationship

**Data Model:**
- Teams are **event-specific** (event_id foreign key)
- A member can be on different teams for different events
- Team composition tracked per event

**Schema:**
```sql
expedition_teams:
  - id (PK)
  - event_id (FK to events)
  - name (e.g., "Team A", "Walking Group 1")
  - created_at
  - updated_at

team_members:
  - team_id (FK)
  - member_id (FK to members)
  - role (e.g., "leader", "member")
  - tent_group (optional)
  - walking_group (optional)
  - added_at
```

### Data Export/Backup Strategy

**Manual Export Only:**
- Export button in UI generates JSON dump of local DB
- User saves to location of their choice
- Import reverses the process
- Data is transient - source of truth is OSM + Tutor

**No Automated Backups:**
- Local data can be reconstructed by re-syncing from OSM
- Teams/configurations are the only non-reconstructible data
- Team data can be exported manually before major changes

### App Update Mechanism

**Via Git + Rebuild:**
```bash
# User update workflow
git pull origin main
docker-compose down
docker-compose up --build
```

**No Built-in Update Checker:**
- Simple git-based workflow
- README documents update process
- Database migrations handled via `node-pg-migrate`; `npm run db:migrate` runs automatically on app startup and applies any pending numbered migration files

### Error Handling & Recovery

**Sync Failures:**
- Partial sync state tracked in `sync_log` table
- Resume capability: can restart from last successful checkpoint
- User-visible error messages with actionable next steps

**Write-Back Failures:**
- Staged changes remain in queue until committed
- Failed writes can be retried individually
- Preview mode ensures user sees what will change before committing

**Database Corruption:**
- Export functionality allows data recovery
- Re-sync from OSM reconstructs member/event data
- Team configurations may need manual re-export/re-import

### Rollback Procedures

- **EP-1 / EP-2 (Foundation):** `docker-compose down -v` removes all data; migrations re-run on next start
- **EP-3+ (Tutor/Write-Back):** Re-sync from OSM/Tutor restores data; teams/configs may need manual re-import
- **Database Issues:** Export → `docker-compose down -v` → `docker-compose up` → `npm run db:migrate` → Import

---

## Open Questions

| Question | Status | Notes |
|----------|--------|-------|
| **Tutor LMS API access** | ⚠️ Unverified | Resolved in EP-3.0 discovery sub-task |
| **Multi-user model** | ✅ Resolved | Sequential logins; `users` table + session isolation in EP-1B |
| **Existing data migration** | ✅ N/A | Starting fresh; no Redis data to migrate |
| **OSM Write-back target** | ⏳ Pending | Badge records vs flexi records — decide before EP-4 starts |
| **OSM Write API payloads** | ⏳ Blocked | Human must provide; required before EP-4 can start |
| **OSM OAuth localhost redirect** | ⏳ Pending | Human must register app on OSM developer portal before EP-1B |

---

## Success Criteria

- [ ] Single `docker-compose up` starts the full stack
- [ ] OSM OAuth works with encrypted local token storage
- [ ] Full offline operation after initial sync (with deferred write-back when online)
- [ ] Tutor LMS training data visible alongside OSM data
- [ ] Can write training completion back to OSM badge/flexi records
- [ ] Persistent teams for communications and kit handling
- [ ] Team builder supports member movement for availability
- [ ] Data quality checks flag expedition-ready vs not-ready participants
- [ ] All existing web app functionality preserved or enhanced
- [ ] No Redis/Vercel dependencies remain

