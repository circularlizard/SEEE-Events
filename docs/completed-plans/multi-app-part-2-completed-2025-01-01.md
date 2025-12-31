# Phase 3: Multi-App Refinement & Resilience (Completed)

This plan outlined the prioritized steps to align the platform with the functional review findings and the new multi-app architecture. **Priorities 1–3 are complete; remaining work continues in [multi-app-stage-3.md](./multi-app-stage-3.md).**

## Priority 1: Login & UX Simplification
- [X] **Simplify App Selection (REQ-AUTH-13):** Replace the current role/app selection with a high-quality "3 Card" layout on the landing page.
    - Card 1: **Expedition Viewer** - Requires `section:event:read` scope only.
    - Card 2: **Expedition Planner** - Requires full admin scopes.
    - Card 3: **OSM Data Quality Viewer** - Requires full admin scopes with multi-section support.
    - *Platform Admin* remains a subtle link for super-admins with additional platform verification.
- [X] **Implement App-Specific OAuth Scopes (REQ-AUTH-15):** Each app must request only the OSM scopes it needs:
    - Expedition Viewer: Request `section:event:read` only.
    - Expedition Planner & Data Quality Viewer: Request full admin scopes.
    - Platform Admin: Request full admin scopes plus platform verification.
- [X] **Add Permission Validation (REQ-AUTH-16):** After OAuth completion, each app must validate the `globals.roles.permissions` object from OSM startup data:
    - **SEEE-Specific Apps (Expedition Viewer, Expedition Planner):** Validate permissions specifically for SEEE section (ID 43105). User must have required permissions on SEEE section.
    - **Multi-Section Apps (OSM Data Quality Viewer, Platform Admin):** Validate that user has required permissions on ANY accessible section. Section selector will only show sections with sufficient permissions.
    - Check required permissions exist and have values > 0.
    - Display helpful error message with logout button if validation fails.
    - Prevent any data hydration if permissions insufficient.
- [X] **Update Section Picker:** Filter section list to only show sections where user has required permissions for the selected app.
- [~] **Fix Login Flash:** Ensure the dashboard shell doesn't render until the app context and section are fully hydrated. *Not 100% eliminated, but acceptable for now.*

## Priority 2: API Resilience & Rate Limiting (Critical Stability)
- [X] **Backoff Logic (REQ-ARCH-04):** Fix the bottleneck implementation to properly pause the queue and back off when a 429 (Too Many Requests) is encountered.
- [X] **Telemetry UI (REQ-ARCH-19):** Add a visible indicator (e.g., in the header or a toast) showing current API rate limit status and active backoff timers.
- [X] **Redis Cache Policy (REQ-ARCH-05, REQ-ARCH-20, REQ-ARCH-21):** Implement the agreed Redis caching policy that reduces rate limit pressure without sharing member data across users.
    - Shared patrol cache (scoped by section): 90-day TTL.
    - No shared member cache across users.
    - User-scoped caches (scoped by user + section):
        - Member list: 1 hour.
        - Event list and event details: 1 hour.
    - Note: The proxy and API client now support a cache bypass mechanism (`X-Cache-Bypass: 1`, `proxyFetch({ bypassCache: true })`) for future force-refresh controls.
    - Force-refresh UI controls are intentionally deferred until we review each application one by one.
    - Force refresh controls:
        - Per-event refresh.
        - Per-member refresh (when visible/authorized in UI context).
        - Global refresh (current section).
    - Where practical, add UI indicators for cached vs upstream data (and optional cache age).
- [~] **Hydration Optimization:** Review the SEEE hydration flow (~500 calls) to see if it can be batched or prioritized to reduce 429 frequency.
    - Removed global `useMembers()` hydration from `ClientShell` to avoid triggering the multi-phase per-member enrichment pipeline when browsing non-member pages.

## Priority 3: E2E Test Updates for New Login Flow
- [X] **Update Mock Auth Flow:** Adapted mock auth to the 3-card selection with persona picker and ensured `appSelection` is preserved through the redirect callback in `src/lib/auth.ts`. Startup data mocks now cover SEEE success/failure permutations.
- [X] **Add Permission Validation Tests:** `multi-app-routing.feature` now exercises:
    - SEEE access approvals/denials for Expedition Viewer & Planner.
    - Multi-section approval/denial for OSM Data Quality.
    - Platform admin guard rails (redirect to `/forbidden`).
    - All scenarios reference the new personas (`noSeeeElevatedOther`, `seeeEventsOnlyRestrictedOther`, `seeeFullOnly`, `seeeFullElevatedOther`).
- [X] **Re-enable BDD Tests:** Feature file updated (no more `@skip`), step defs now require mock login buttons, and `playwright.bdd.config.ts` starts a fresh HTTPS dev server with mock env vars + longer inactivity timeout. `npm run test:bdd -- --grep multi-app --reporter=line --workers=1` passes headlessly.

---

## Priorities 4–6: Continued in Stage 3

The remaining work (Expedition Viewer refinement, Expedition Planner development, OSM Data Quality Viewer migration, and Platform Admin cleanup) is now tracked in **[multi-app-stage-3.md](./multi-app-stage-3.md)**, which sequences specification updates, implementation tasks, and E2E coverage for each application.
