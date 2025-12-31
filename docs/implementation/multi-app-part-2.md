# Phase 3: Multi-App Refinement & Resilience

This plan outlines the prioritized steps to align the platform with the functional review findings and the new 3-app architecture.

## Priority 1: Login & UX Simplification
- [ ] **Simplify App Selection (REQ-AUTH-13):** Replace the current role/app selection with a high-quality "3 Card" layout on the landing page.
    - Card 1: **Expedition Viewer** - Requires `section:event:read` scope only.
    - Card 2: **Expedition Planner** - Requires full admin scopes.
    - Card 3: **OSM Data Quality Viewer** - Requires full admin scopes with multi-section support.
    - *Platform Admin* remains a subtle link for super-admins with additional platform verification.
- [ ] **Implement App-Specific OAuth Scopes (REQ-AUTH-15):** Each app must request only the OSM scopes it needs:
    - Expedition Viewer: Request `section:event:read` only.
    - Expedition Planner & Data Quality Viewer: Request full admin scopes.
    - Platform Admin: Request full admin scopes plus platform verification.
- [ ] **Add Permission Validation (REQ-AUTH-16):** After OAuth completion, each app must validate the `globals.roles.permissions` object from OSM startup data:
    - **SEEE-Specific Apps (Expedition Viewer, Expedition Planner):** Validate permissions specifically for SEEE section (ID 43105). User must have required permissions on SEEE section.
    - **Multi-Section Apps (OSM Data Quality Viewer, Platform Admin):** Validate that user has required permissions on ANY accessible section. Section selector will only show sections with sufficient permissions.
    - Check required permissions exist and have values > 0.
    - Display helpful error message with logout button if validation fails.
    - Prevent any data hydration if permissions insufficient.
- [ ] **Update Section Picker:** Filter section list to only show sections where user has required permissions for the selected app.
- [ ] **Fix Login Flash:** Ensure the dashboard shell doesn't render until the app context and section are fully hydrated.

## Priority 2: API Resilience & Rate Limiting (Critical Stability)
- [ ] **Backoff Logic (REQ-ARCH-04):** Fix the bottleneck implementation to properly pause the queue and back off when a 429 (Too Many Requests) is encountered.
- [ ] **Telemetry UI (REQ-ARCH-19):** Add a visible indicator (e.g., in the header or a toast) showing current API rate limit status and active backoff timers.
- [ ] **Redis Cache Policy:** Implement decision on shared vs. user-specific Redis caching for member/event data (balancing performance and GDPR/security).
- [ ] **Hydration Optimization:** Review the SEEE hydration flow (~500 calls) to see if it can be batched or prioritized to reduce 429 frequency.

## Priority 3: E2E Test Updates for New Login Flow
- [ ] **Update Mock Auth Flow:** Adapt the mock authentication to work with the new 3-card selection and permission validation.
    - Ensure the selected card properly sets the `appSelection` in the mock auth flow.
    - Mock the `permissions` object in startup data to test both success and failure scenarios.
    - Fix the redirect loop that prevents E2E tests from completing login.
    - Actions: Add console logging to `src/app/page.tsx`, `src/lib/auth.ts`, `middleware.ts`, and `StartupInitializer.tsx` to trace the `appSelection` flow.
- [ ] **Add Permission Validation Tests:** Create test scenarios for:
    - User with sufficient SEEE permissions accessing SEEE-specific apps successfully.
    - User with sufficient permissions on any section accessing multi-section apps successfully.
    - User with insufficient SEEE permissions denied access to SEEE-specific apps.
    - User with insufficient permissions on all sections denied access to multi-section apps.
    - Platform admin verification (both success and failure).
- [ ] **Re-enable BDD Tests:** Once the new login flow and auth are working, update and run the full multi-app test suite.
    - Remove `@skip` from `multi-app-routing.feature`.
    - Update test scenarios to match the new 3-card UI and permission validation.
    - Run `npm run test:bdd -- --grep multi-app` and fix any remaining issues.
    - Verify full test stack passes: `npm run lint && npx tsc --noEmit && npm run test:unit && npm run test:bdd`.

## Priority 4: Expedition Viewer (Standard) Refinement
- [ ] **Home Page Refactor (REQ-EVENTS-06):** Change the default landing view to "Attendance by Person," grouped by Patrol cards.
- [ ] **SEEE Only Mode:** Completely disable and hide the section picker and section-switching logic when in this app.
- [ ] **Cache Integration (REQ-EVENTS-07):** Fix the issue where cached patrol names and member data aren't being picked up by standard users.

## Priority 5: Expedition Planner & Data Quality (Admin)
- [ ] **Planner Development:** Build out the "Planner" shell as the primary engine for patrol refresh and event preparation.
- [ ] **Data Quality App:** Migrate the "Member Issues" views into the dedicated "Data Quality Viewer" app.

## Priority 6: Platform Admin Cleanup
- [ ] **UI Polish:** Correct labels (e.g., "Patrol Data" -> "Platform Operations") and ensure the data loading toolbar is visible.
- [ ] **Audit Log Visibility:** Ensure console actions are clearly visible in the audit trail.
