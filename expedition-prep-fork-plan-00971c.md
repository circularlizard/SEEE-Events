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
| **OAuth** | OSM OAuth 2.0 with PKCE | Secure, no client secret needed for public clients |

---

## Phase 0: Fork Execution

**Goal:** Create the physical fork of the repository and establish the new project structure.

### 0.1 Fork Strategy

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

### 0.2 Initial Cleanup

**Files to Remove:**
- Vercel-specific config files (if any)
- Redis docker-compose.yml (will replace with PostgreSQL)

**Files to Modify:**
- `package.json` - remove ioredis, add pg
- `README.md` - rewrite for local installation

### 0.3 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Decision on fork strategy (new repo vs branch)

**Exit Criteria:**
```bash
# 1. Clean fork exists
# 2. Can run npm install successfully
# 3. Original git history preserved (if needed)
# 4. New project name established
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
| **Bottleneck (Rate Limiter)** | `src/lib/bottleneck.ts` | Core throttling logic reusable. Replace Redis quota storage with PostgreSQL |
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
| **Authentication** | `src/lib/auth.ts` (NextAuth) | Custom PKCE OAuth flow: `src/lib/oauth/pkce.ts` |
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
src/lib/auth.ts          ──────────→   DELETE
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
src/lib/oauth/*          ──────────→   NEW (PKCE implementation)
src/lib/sync/*           ──────────→   NEW (OSM sync service)
```

---

## Phase 1: Foundation - Read-Only Proof of Concept

**Goal:** Prove out the entire architecture end-to-end with minimal data types (members, patrols, sections only - no events, badges, flexi yet). Everything read-only.

**Success Criteria:**
- `docker-compose up` starts app + database
- OSM OAuth with PKCE flow completes successfully
- Members and patrols sync from OSM to local PostgreSQL
- Basic UI displays member list from local DB (not direct OSM calls)
- Works offline after initial sync

### 1.1 Architecture

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

**Why PKCE:**
- OSM supports PKCE (confirmed)
- No client secret needed for public/local clients
- More secure for local-only app
- Simpler credential management

### 1.2 Minimal Database Schema (Phase 1)

```sql
-- Core tables only
osm_tokens          -- Encrypted OAuth tokens (access, refresh, expiry)
sections            -- Section metadata
members             -- Member data (section_id, patrol_id)
patrols             -- Patrol structure per section
sync_log            -- Audit trail for debugging
```

**Explicitly NOT in Phase 1:**
- events, event_attendance
- flexi_records
- badge_records
- tutor_courses, tutor_completions
- expedition_teams, team_members

### 1.3 OAuth Flow with PKCE

```
1. User clicks "Connect to OSM"
2. App generates PKCE code_verifier + code_challenge
3. Redirect to OSM /oauth/authorize with code_challenge
4. User authorizes on OSM
5. OSM redirects to localhost callback with auth code
6. App exchanges code + verifier for tokens
7. Tokens encrypted and stored in PostgreSQL
8. Initial sync begins automatically
```

### 1.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Can access OSM API documentation
- [ ] Docker and Docker Compose installed locally
- [ ] OSM OAuth app registered with localhost callback

**Implementation Tasks:**
1. Docker Compose setup (app + postgres services)
2. PostgreSQL schema init script (5 tables only)
3. PKCE OAuth implementation (no NextAuth)
4. Token encryption/decryption service
5. OSM sync for members/patrols/sections only
6. Basic UI: member list view from local DB

**Exit Criteria (must pass):**
```bash
# 1. Stack starts
docker-compose up -d
curl -f http://localhost:3000 || exit 1

# 2. Database initialized
pg_isready -h localhost -p 5432 || exit 1

# 3. Can complete OAuth flow (manual test)
# 4. Members visible in UI from local DB
# 5. Works after disconnecting internet (offline test)
```

**Rollback:**
```bash
docker-compose down -v  # Removes all data, start fresh
```

---

## Phase 2: Extended Data Types (Read-Only)

**Goal:** Add remaining OSM data types (events, attendance, badges, flexi). Still read-only.

**Prerequisite:** Phase 1 exit criteria passed (members/patrols working).

### 2.1 Extended Database Schema

**Add to existing tables:**
```sql
events              -- Expedition events
event_attendance    -- Attendance records
flexi_records       -- Custom flexi record data  
badge_records       -- Badge completion data
```

**Still NOT included:**
- tutor_courses, tutor_completions (Phase 4)
- expedition_teams, team_members (Phase 5)

### 2.2 Sync Strategy by Data Type

| Data Type | Frequency | Notes |
|-----------|-----------|-------|
| events | Startup + manual | Event updates are intentional |
| flexi_records | Startup + every 4h | Updated frequently for prep |
| badge_records | Startup + every 4h | Training status changes |
| attendance | On event view | Fetch when user opens event |

### 2.3 UI Features Added

- Event list view (from local DB)
- Event detail with attendance
- Badge status view
- Flexi record display
- Sync status dashboard (when last sync, what's stale)
- Manual sync button with progress indicator

### 2.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Phase 1 exit criteria passed
- [ ] Can view members/patrols from local DB

**Implementation Tasks:**
1. Add events table and sync
2. Add badge_records table and sync
3. Add flexi_records table and sync
4. Create event list/detail views
5. Create sync status dashboard

**Exit Criteria:**
```bash
# 1. All data types visible in UI
# 2. Sync updates local DB correctly
# 3. Rate limiting working (max 80 req/min)
# 4. Manual sync button triggers refresh
# 5. Stale data indicator shows when sync needed
```

**Rollback:**
```bash
docker-compose down -v  # Re-sync restores everything
```

---

## Phase 3: Tutor LMS Integration (Read-Only)

**Goal:** Add Tutor LMS as second data source. Still read-only - just viewing Tutor data alongside OSM.

**Prerequisite:** Phase 2 exit criteria passed.

### 3.1 Tutor LMS Database Schema

**Add tables:**
```sql
tutor_courses       -- Course metadata from Tutor
tutor_completions   -- Student completion records
tutor_students      -- Student-to-member mapping cache
```

### 3.2 Tutor Sync Service

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

### 3.3 UI Features Added

- Tutor configuration page (API URL, credentials)
- Course-to-section mapping UI
- Training matrix: members × (OSM badges + Tutor courses)
- Training gaps highlighted (missing either source)

### 3.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Phase 2 exit criteria passed
- [ ] OSM data working (events, badges, flexi)

**Implementation Tasks:**
1. Add Tutor LMS API client
2. Add tutor_* tables
3. Create course mapping UI
4. Create training matrix view (aggregate OSM + Tutor)

**Exit Criteria:**
```bash
# 1. Can configure Tutor API credentials
# 2. Can map courses to sections
# 3. Training matrix shows data from both sources
# 4. Training gaps identified correctly
```

**Rollback:**
```bash
# Tutor data only - re-sync restores from Tutor API
```

---

## Phase 4: OSM Write-Back (The Big Change)

**Goal:** First write capability - update OSM badge/flexi records with training completion from Tutor.

**Prerequisite:** Phase 3 exit criteria passed (Tutor integration working).

### 4.1 Write-Back Architecture

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

### 4.2 Write-Back UI

- Training matrix: "Mark Complete" buttons for missing training
- Preview dialog: shows what will change in OSM
- Confirm/Cancel flow
- Write status dashboard (pending, completed, failed)

### 4.3 Required: OSM API Payloads

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

### 4.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Phase 3 exit criteria passed
- [ ] Tutor data flowing into training matrix
- [ ] User has provided OSM write API documentation

**Implementation Tasks:**
1. Add write methods to OSM sync service
2. Create write queue with rate limiting
3. Create preview/confirm UI flow
4. Add audit logging

**Exit Criteria:**
```bash
# 1. Can preview changes before writing
# 2. Can write badge completion to OSM
# 3. Can write flexi record data to OSM
# 4. Audit log records all changes
# 5. Rate limits respected (80 req/min max)
```

---

## Phase 5: Team Formation & Persistence

**Goal:** Expedition team builder with persistent team storage.

**Prerequisite:** Phase 4 exit criteria passed (write-back working).

### 5.1 Team Data Model

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

### 5.2 Team Builder UI

- Event selection first
- Participant pool (filterable from event attendance)
- Drag-and-drop team formation
- Balance indicators (gender, age, patrol distribution)
- Save/Load teams (persist to local DB)

### 5.3 Team Export

- PDF team sheets (attendance, contacts, medical)
- CSV export
- Print briefing packs

### 5.4 Entry/Exit Criteria

**Entry Criteria:**
- [ ] Phase 4 exit criteria passed

**Exit Criteria:**
```bash
# 1. Can create teams for an event
# 2. Teams persist in local DB
# 3. Can move members between teams
# 4. Can export teams to PDF/CSV
# 5. Team data survives app restart
```

---

## Phase 6: Data Quality & Hardening

**Goal:** Data quality checks, polish, testing, documentation.

**Prerequisite:** All previous phases complete.

### 6.1 Data Quality Dashboard

**Pre-expedition checks:**
- Contact info complete (phone, email, emergency contact)
- Medical info present
- Training complete (OSM badges + Tutor courses)
- Age verification for expedition level (Bronze/Silver/Gold requirements)
- Exportable issue lists

### 6.2 Security Hardening

- Database encryption at rest (PostgreSQL volume encryption)
- OAuth token encryption (AES-256-GCM)
- Tutor API credential encryption
- Optional: simple password protection on startup

### 6.3 Testing Strategy

- Unit tests (Jest) - reuse existing where possible
- Integration tests with Docker test stack
- E2E tests (Playwright) against local Docker

### 6.4 Documentation

- README.md: Local installation, Docker setup
- FIRST_RUN.md: Setup wizard walkthrough
- TROUBLESHOOTING.md: Common issues
- API_INTEGRATION.md: OSM/Tutor API details

### 6.5 Entry/Exit Criteria

**Exit Criteria:**
```bash
# 1. All success criteria from top of plan met
# 2. Tests passing
# 3. Documentation complete
# 4. No Redis/Vercel dependencies
```

---

## Agent Implementation Structure

Since this will be implemented by agents, phases are organized as **independent, verifiable work units** with clear entry/exit criteria and checkpoint commands.

### Phase Execution Order
```
Phase 1 (Foundation - Read-Only)    → Phase 2 (Extended Data - Read-Only)
     ↓                                        ↓
Phase 3 (Tutor LMS - Read-Only)     → Phase 4 (OSM Write-Back)
     ↓                                        ↓
Phase 5 (Team Formation)            → Phase 6 (Hardening)
```

### Checkpoint Commands
Each phase includes a verification command that must pass before proceeding:
- `npm run verify:phase-{N}` - Runs lint, typecheck, and phase-specific tests
- `docker-compose -f docker-compose.test.yml up --exit-code-from test` - Integration test stack

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

## Missing Sections to Add

### OSM Write API Details (Pending User Input)

**Status:** Waiting for example payloads from user

**Required Information:**
- OSM API endpoints for badge record updates
- OSM API endpoints for flexi record updates
- Example request/response payloads for each
- Required OAuth scopes for write operations
- Rate limits specific to write endpoints

**Placeholder Implementation:**
```typescript
// src/lib/sync/osm-write.ts - stubbed until API docs provided
export async function updateBadgeRecord(memberId: string, badgeId: string, status: 'complete' | 'incomplete') {
  // TODO: Implement after API documentation provided
  throw new Error('OSM write API not yet implemented - awaiting payload examples');
}

export async function updateFlexiRecord(memberId: string, extraId: string, data: Record<string, string>) {
  // TODO: Implement after API documentation provided
  throw new Error('OSM write API not yet implemented - awaiting payload examples');
}
```

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
- Database migrations (if any) handled via SQL init scripts with versioning

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

### Agent Checkpoint/Verification Points

**Each Phase Includes:**
1. **Entry Criteria:** What must be true before starting
2. **Implementation Tasks:** Specific, independent work items
3. **Exit Criteria:** Verification commands that must pass
4. **Rollback Procedure:** How to undo if verification fails

**Example Phase 1 Verification:**
```bash
# Phase 1 Exit Criteria
npm run lint
npx tsc --noEmit
docker-compose -f docker-compose.test.yml up --exit-code-from test
```

### Dependencies & Rollback

**Phase Dependencies:**
```
Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6
   │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┘ (all depend on Phase 1)
```

**Rollback Procedures:**
- **Phase 1-2 (Foundation):** `docker-compose down -v` removes all data, restart from scratch
- **Phase 3+ (Data):** Re-sync from OSM restores state (teams/configs may need manual re-import)
- **Database Issues:** Export → Reset → Import workflow documented in README

---

## Open Questions for Phase 1 Resolution

1. **Tutor LMS API:** Confirm Tutor LMS Pro has REST API access; get endpoint documentation
2. **Multi-user needs:** Will multiple leaders use the same workstation instance?
3. **Existing data:** Any need to migrate from current Redis/Vercel deployment?
4. **OSM Write-back target:** Preference for badge records vs flexi records for training data?
5. **OSM Write API payloads:** Awaiting example payloads for badge/flexi record updates from user

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

