# Members Hydration vs React Query (Summary)

## Purpose

This document summarizes the current **members data hydration** implementation and what a move to **TanStack React Query** would change, including benefits, downsides, and realistic migration options.

---

## Current Implementation (as of Dec 2025)

### Key files

- `src/hooks/useMembersHydration.ts` (members hydration orchestrator)
- `src/store/use-store.ts` (Zustand store: members + progress + TTL metadata)
- `src/lib/api.ts` (client-side API helpers via `/api/proxy/...`)
- `src/lib/member-data-parser.ts` (normalize/merge member data)
- `src/components/layout/ClientShell.tsx` (mounts hydration globally)
- `src/components/layout/DataLoadingBanner.tsx` (unified progress UI)

### Execution model

- **Global hook**: `useMembersHydration()` is mounted in `ClientShell.tsx`.
- **Trigger conditions**:
  - `useSession().status === 'authenticated'`
  - `useStore((s) => s.userRole) === 'admin'`
  - `useStore((s) => s.currentSection?.sectionId)` exists
- **Three-phase sequential hydration**:
  1. **Phase 1**: `getMembers({ sectionid, termid, section })` returns a list of member summaries.
  2. **Phase 2**: For each member, `getMemberIndividual({ sectionid, scoutid, termid })` enriches DOB + membership history.
  3. **Phase 3**: For each member, `getMemberCustomData({ sectionid, scoutid })` enriches contacts/medical/consents.

### Where data lives (source of truth)

Members are treated as **client state stored in Zustand**, not in React Query.

In `use-store.ts` the members slice includes:

- `members: NormalizedMember[]`
- `membersLoadingState: 'idle' | 'loading-summary' | 'loading-individual' | 'loading-custom' | 'complete' | 'error'`
- `membersProgress: { total; completed; phase }`
- `membersLastUpdated: Date | null`
- `membersSectionId: string | null`

Hydration updates are applied via:

- `setMembers(normalizedMembers)` (after Phase 1)
- `updateMember(id, partialUpdates)` (as Phase 2/3 finish per member)

### Normalization / progressive enrichment

- `src/lib/member-data-parser.ts` provides:
  - `createNormalizedMemberFromSummary()`
  - `updateMemberWithIndividualData()`
  - `parseCustomDataGroups()`
  - `updateMemberWithCustomData()`
  - `markMemberError()`

The UI can show partial data because `members[]` is updated incrementally.

### Caching / TTL

Caching is **manual** and driven by Zustand metadata (not React Query):

- `CACHE_TTL_MS = 12 hours` in `useMembersHydration.ts`
- `isCacheFresh()` returns true if:
  - `membersLastUpdated` exists
  - `membersSectionId === currentSection.sectionId`
  - `(Date.now() - membersLastUpdated) < CACHE_TTL_MS`

If cache is fresh and `members.length > 0`, hydration is skipped and progress is set to “complete”.

### Cancellation (important nuance)

Hydration uses an `AbortController` stored in a ref (`hydrationRef`).

- On section change, hydration calls `abort()` and optionally `clearMembers()`.
- During Phase 2/3 loops, the code checks `abortController.signal.aborted` between awaits to stop work.

However:

- The fetch layer (`proxyFetch()` in `src/lib/api.ts`) does **not** accept or pass an AbortSignal.
- That means requests are not truly cancelled at the network level; the hook only “ignores results” after abort.

### Unified progress banner

The top loading banner is driven by a **unified tracker in Zustand**:

- `updateDataSourceProgress('members', ...)` from `useMembersHydration.ts`
- `updateDataSourceProgress('events', ...)` from `useEventsHydration.ts`

`DataLoadingBanner.tsx` reads `dataSourceProgress` from Zustand and computes combined progress.

### React Query usage today

React Query is **not currently used** to fetch/cache members.

- `useMembersHydration.ts` imports `useQueryClient()` but does not use query keys or `useQuery`.

---

## System-wide impact (API layer + application)

This section summarizes the impact of adopting React Query beyond the members feature, based on the current architecture.

### Current “Safety Shield” API boundary: `/api/proxy/[...path]`

All browser-side API calls ultimately go through `src/app/api/proxy/[...path]/route.ts`.

- **Authentication**:
  - Proxy requires a valid NextAuth server session and reads `session.accessToken`.
  - If missing, proxy returns `401` (`UNAUTHENTICATED`).
- **Read-only enforcement**:
  - Mutation methods are blocked (see `src/app/api/proxy/__tests__/route.test.ts`).
- **Rate limiting**:
  - Proxy schedules upstream calls through Bottleneck via `scheduleRequest()` (`src/lib/bottleneck.ts`).
  - Bottleneck uses:
    - `maxConcurrent: 5`
    - `minTime: 50ms`
    - a dynamic reservoir based on `X-RateLimit-*` headers (stored in Redis).
- **Circuit breakers (Redis)**:
  - **Soft lock**: proxy returns `429` when soft locked.
  - **Hard lock**: proxy returns `503` when hard locked.
  - Proxy can trigger hard lock when upstream returns `X-Blocked`.
- **Server-side read-through caching**:
  - Proxy caches successful GET responses in Redis with a fixed TTL (`CACHE_TTL = 300` seconds).
  - The client currently also applies additional client-side TTL for some datasets (e.g. members 12h, events 5m) using Zustand metadata.

**Implication**: React Query would become an *additional* caching layer (client-side) on top of the proxy’s server-side caching and rate limiting.

### API client layer (`src/lib/api.ts`) considerations

The client API helpers (`getMembers`, `getEvents`, `getMemberIndividual`, `getMemberCustomData`, etc.) are wrappers around `proxyFetch()`.

Key points:

- **Abort/cancellation**:
  - Today, `proxyFetch()` does not pass an AbortSignal to `fetch()`.
  - If React Query is introduced, you will likely want query cancellation to work properly.
  - That requires threading a `signal?: AbortSignal` option through `proxyFetch()` and all exported API helpers.
- **Error normalization**:
  - Client throws `APIError` when the proxy returns non-2xx.
  - The proxy returns structured JSON errors for common cases:
    - `401` unauthenticated
    - `429` rate limited (soft lock / cooldown)
    - `503` system halted (hard lock)
    - other upstream failures
  - If using React Query retries, it is important to ensure retry logic is **disabled or tuned** for `401/429/503` (to avoid hammering the proxy during cooldown or while logged out).

### Application architecture boundaries (Zustand vs React Query)

Today Zustand holds both:

- **UI/session selection state** (section selection, role)
- **Server-derived state** (events, members, progress, timestamps)

If adopting React Query across the app, a clean boundary is typically:

- **Zustand**:
  - Session/selection state (`currentSection`, `userRole`, filters/sort UI state)
  - Cross-cutting UI state (e.g. local UI preferences)
  - Potentially the *unified* progress tracker if you continue to show one banner across heterogeneous data loads
- **React Query**:
  - Cached server data (`members`, `events`, etc.)
  - Fetch status (`isFetching`, `dataUpdatedAt`) and invalidation/refresh

**Risk**: If you keep `members`/`events` in Zustand and also introduce React Query caching, you create two sources of truth.

### SSR / hydration considerations

This application uses NextAuth and a proxy that requires server session access tokens.

- **Client-only fetching (today)**:
  - Works because the browser calls `/api/proxy/...` and cookies/session are handled automatically.
- **SSR-prefetch (optional future)**:
  - Using React Query’s dehydrate/rehydrate can improve perceived performance, but it increases complexity.
  - You must ensure server-side prefetches can access auth context (NextAuth session) and that sensitive data is not accidentally persisted.

### Rate limiting behavior at scale (app-wide)

React Query can increase request volume if:

- query keys are too granular (e.g. hundreds of per-member queries)
- defaults like `refetchOnWindowFocus` are left enabled for expensive resources

In this codebase, the proxy already enforces rate limiting, but the user experience under soft lock/hard lock depends on **client behavior**:

- Prefer long `staleTime` for expensive datasets (members/custom data)
- Disable focus refetch for expensive queries
- Avoid aggressive retries for `429/503`

### Testing and operational considerations

- **Testing**:
  - Current tests include proxy integration tests and a lot of hydration-driven UI tests.
  - Migrating to React Query changes what you test:
    - query keys, staleTime/refetch behavior
    - retry rules for `APIError` codes
    - cache invalidation on section change and logout
- **Security / sensitive data**:
  - Members data is sensitive.
  - If adopting React Query, keep caches in-memory only.
  - Ensure logout clears:
    - Zustand sensitive slices (already not persisted)
    - React Query cache (must be explicitly cleared)

---

## Evaluation of the status quo (current approach)

This section evaluates the current design (Zustand + custom hydration hooks + proxy caching/rate limiting) without assuming a move to React Query.

### Strengths

- **Explicit, predictable control flow**:
  - The three-phase members hydration is easy to follow and debug in one place.
  - Progress updates are explicit and decoupled from any framework-specific fetch abstraction.
- **Works naturally with the proxy “Safety Shield”**:
  - All traffic still goes through `/api/proxy`, so rate limiting, circuit breakers, and caching remain centralized.
  - The proxy’s `429`/`503` behaviors are surfaced as normal API errors, and the app doesn’t need to know upstream details.
- **Good progressive UX with minimal machinery**:
  - Phase 1 populates a usable list quickly.
  - Phase 2/3 progressively enrich per-member details.
  - Per-member failures do not block the rest of the list.
- **No additional client caching layer for sensitive data**:
  - Members are not persisted to localStorage.
  - There is no risk of inadvertently persisting query caches via a persistence plugin.
- **Lower conceptual overhead**:
  - Developers only need to understand the store + hydration hook, not query keys/invalidation semantics.

### Weaknesses

- **Re-implements “server-state” primitives in app code**:
  - Manual TTL freshness (`membersLastUpdated` + `membersSectionId`) and refresh logic.
  - Manual deduplication/avoidance of duplicate fetches.
  - Manual state machines (`membersLoadingState`, `membersProgress`) that must be kept consistent.
- **Cancellation is cooperative, not true request abort**:
  - `AbortController` exists, but the fetch stack does not pass a `signal` into `fetch()`.
  - Result: section changes can still leave expensive requests running until completion.
- **Global background hydration can be wasteful**:
  - Hydration is mounted in `ClientShell`, so it can run even if the user never visits the Members pages.
  - This is particularly relevant given the high call volume for member enrichment.
- **Harder reuse across pages without tight coupling**:
  - Any page needing members/events must know the Zustand selectors and the hydration semantics.
  - Sharing “fetch once, use everywhere” behavior requires careful discipline (and still risks accidental duplicate orchestration).
- **Testing burden shifts to custom orchestration**:
  - Unit/integration tests must validate the hook’s phase transitions, error handling, and TTL behavior.
  - These are solvable, but they are bespoke and will grow as more datasets adopt the same pattern.
- **Risk of store bloat over time**:
  - As more datasets are hydrated eagerly, Zustand may accumulate more “server-derived” slices with duplicated patterns.

## What “Moving to React Query” Would Offer

### Potential advantages

- **Request deduplication** by query key (avoid duplicate fetches if multiple pages/components need members).
- **Standard cache lifecycle** controls:
  - `staleTime` (freshness window)
  - `gcTime` (how long unused queries remain cached)
  - `invalidateQueries()` for refresh
- **Built-in error/retry primitives** (consistent retries/backoff if you choose to enable them).
- **Better observability** with React Query Devtools.
- **Cleaner section change semantics** when keys are structured like `['members', sectionId]`.

### Main downsides / tradeoffs (specific to this code)

- The current design is a **multi-phase fan-out pipeline with per-member incremental updates**.
  - React Query supports this, but not automatically.
  - You must choose how phases map onto queries (many small queries vs one orchestrated query).
- Risk of **two sources of truth** if you keep members in Zustand and also cache them in React Query.
  - A clean approach usually separates:
    - Zustand: UI/session selection state
    - React Query: server/cache state
- If you want SSR-prefetch/dehydrate/rehydrate, that adds wiring overhead.
- You must be deliberate about **sensitive data**:
  - Ensure the query cache stays in-memory only.
  - Clear queries on logout.

---

## Realistic Migration Options

### Option A: Query-per-resource (more “React Query native”)

- `useQuery(['members', sectionId], getMembers)`
- `useQuery(['memberIndividual', sectionId, scoutId], getMemberIndividual)` per member
- `useQuery(['memberCustom', sectionId, scoutId], getMemberCustomData)` per member

**Pros**:
- Natural caching/dedup per member
- Partial failure is straightforward

**Cons**:
- Potentially hundreds of active queries
- Progress tracking becomes derived (or still needs the Zustand tracker)

### Option B: Orchestrated “pipeline query” (closest to today)

- One query that runs the full 3-phase pipeline.

**Pros**:
- Fewer queries/keys
- Centralized control similar to current hook

**Cons**:
- Progressive per-member UI updates are harder unless the query function writes into cache incrementally
- Still a custom orchestrator, just in a different place

### Option C: Hybrid (use React Query only for Phase 1)

- Put `getMembers` list in React Query (cheap, useful, stable)
- Keep Phase 2/3 enrichment in the current orchestrator

**Pros**:
- Some dedupe/caching wins quickly

**Cons**:
- Still splits ownership: list in RQ, enrichment in Zustand

---

## Immediate Improvement Independent of React Query

### Add true request cancellation

To make the current `AbortController` effective:

- Update `proxyFetch()` to accept an optional `AbortSignal` and pass it to `fetch(..., { signal })`.
- Thread that signal through `getMembers`, `getMemberIndividual`, `getMemberCustomData`.
- Pass the signal from `useMembersHydration`.

This would reduce wasted network traffic and reduce the chance of stale in-flight requests completing after the user changes sections.

---

## Migration scope and timing (recommended)

This section summarizes what a TanStack Query migration should cover, and when to do it within the current Members & Sessions plan.

### Scope: what to migrate vs keep

- **Keep in Zustand** (UI/selection state):
  - `currentSection`, `selectedSections` (if still used), `availableSections`
  - `userRole`
  - UI-only state (filters/sorts, local preferences)
  - Optionally: the unified banner state (`dataSourceProgress`) if you want one combined progress indicator across heterogeneous loads

- **Migrate to TanStack Query** (server-state caches):
  - **High-value shared datasets** with multiple consumers:
    - Members (list + per-member detail enrichment)
    - Events
  - Any other proxy-backed datasets that become cross-cutting (e.g. attendance) once they’re used in multiple routes/components

- **Do not “migrate”**:
  - The server proxy itself (`/api/proxy`) and its rate limiting/circuit breakers (these remain the enforcement point regardless of client caching)

### Timing within the current plan

- **Do not do this mid-feature** (while actively changing members pages/issues), because it’s a cross-cutting refactor that can destabilize UX and tests.

- **Best window**:
  - After Section 6 (Member data issues) and Section 7 (navigation) are complete
  - Before Section 8 (section selector hardening / flash removal)

Rationale:

- By the end of Sections 6/7 you have real consumers and can validate the migration against them.
- Doing the migration before Section 8 avoids chasing “flash” regressions twice.

### Suggested sequence (minimizes risk)

1. **Prerequisite**: add real cancellation support by threading `AbortSignal` through `proxyFetch()` and API helpers.
2. **Migrate events first** (lower call volume than members enrichment), validate:
   - caching semantics
   - retry and refetch defaults
   - banner/progress integration
3. **Migrate members** using either:
   - per-member queries for progressive enrichment, or
   - a pipeline query that writes incremental updates into the query cache
4. **Remove duplicated cache/state** (avoid keeping the same server-state in both Zustand and Query).

---

## Status

- This document reflects the **actual implementation** currently in the repository.
- No code changes are included here.
