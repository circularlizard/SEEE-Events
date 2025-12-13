# Members & Sessions Implementation Plan

## 1. Overview

This plan covers:

- Moving section selection controls from the page header into the sidebar.
- Implementing session timeout behavior so inactive sessions redirect to login when expired.
- For administrator users:
  - Hydrating the client data model with **members** for selected sections, in addition to events.
  - Adding a **Members** page with a sortable table of members.
  - Adding a **Member data issues** view that highlights problems with member data quality.

### 1.1. Dependency diagram

High-level dependencies between phases:

```text
Section 2 (sidebar / section selector)
        │
        ▼
Section 3 (session timeout)
        │
        ▼
Section 4 (member data hydration)
        │
        ▼
Section 5 (members page) ──► Section 6 (member data issues)
        │
        └─────────────────────────► Section 7 (navigation updates)

Section 8 (section selector hardening) is partially independent but
benefits from Section 2 being in place.
```

---

## 2. Move section controls into the sidebar

### 2.1. Current behavior

- The page header (in `Header.tsx` / `ClientShell.tsx`) currently:
  - Shows the selected section(s) for the logged-in OSM user.
  - Exposes a **Change section** button linking to `/dashboard/section-picker` with a `redirect` query parameter.
- Section state is driven by the Zustand store (`useStore`):
  - `availableSections`
  - `currentSection`
  - `selectedSections`
  - `setCurrentSection`, `setSelectedSections`

### 2.2. Target behavior

- The **sidebar** becomes the primary place to see and change the current section(s).
- The header no longer needs to show section selection for desktop; mobile may still expose a shortcut.

### 2.3. Implementation steps

1. **Sidebar top block**
   - In `src/components/layout/Sidebar.tsx`:
     - Add a block at the top of the nav (above "Overview") that:
       - Shows a summary of the selected sections:
         - Single section: `Section: {sectionName}`.
         - Multiple sections: `Sections: {N selected}` with a tooltip or truncated list of names.
       - Uses `useStore` to read `currentSection`, `selectedSections`, `availableSections`.

2. **Change section button**
   - In the same block, add a **Change section** link/button:
     - `href` = `/dashboard/section-picker?redirect=${encodeURIComponent(currentPath || '/dashboard')}`.
     - Reuse the existing redirect behavior from the header.

3. **Header cleanup**
   - Remove the section summary and "Change section" button from `Header.tsx` for desktop.
   - Keep a compact section summary + "Change section" action in the header **on mobile only** (`md:hidden`), so mobile users still have an easy way to switch sections when the sidebar is hidden.

### 2.4. Testing

- Update any existing tests around the section picker and initial dashboard load to reflect:
  - Section controls living in the sidebar instead of the header.
  - No flash of the main dashboard when a section is not yet selected.

### 2.5. Current status

- Implemented:
  - Section summary and "Change section" control have been moved into the **top of the sidebar** using Zustand state and `usePathname` for the redirect.
  - The header now shows section information and the change button **only on mobile**, with desktop deferring to the sidebar.
  - The section picker initializes its selection state from the current/selected sections in the store so it reflects the existing selection when opened.
  - `DashboardPage` includes a guard that renders a minimal loading state when the user is authenticated, has multiple available sections, and no section is selected, to reduce dashboard flashing.
- Still outstanding / not fully working:
  - There is still some residual flash of the main page before the section selector appears in certain flows. This needs a deeper follow-up (e.g. coordinating `StartupInitializer`, initial route rendering, and dashboard gating) and will be revisited later.
- Aside from the flash issue, section 2 work is effectively complete and implementation can proceed to section 3 (session timeout) next.

### 2.6. Single-section selection (NEW)

**Rationale**: To avoid the complexity of merging potentially conflicting data structures from different sections (especially `getCustomData` which can have section-specific custom fields), the section picker should be changed to allow **only a single section** to be selected at a time.

**Changes required**:
1. **Section picker UI** (`src/app/dashboard/section-picker/page.tsx`):
   - Replace checkboxes with radio buttons (only one can be selected).
   - Remove "Select All" / "Clear All" buttons.
   - Update `selectedIds` state to hold a single ID instead of a `Set`.
   - Always set `currentSection` (never `selectedSections` array).

2. **Store simplification**:
   - The `selectedSections` array in the store becomes unused for now.
   - All code should read from `currentSection` only.

3. **Sidebar display**:
   - Always show single section name (no "N selected" case).

4. **Remembered selection**:
   - Store a single `selectedSectionId` instead of `selectedSectionIds[]`.

---

## 3. Session timeout & redirect to login

### 3.1. Requirements

- When a user leaves the browser idle for **15 minutes** and later returns:
  - If the underlying NextAuth/OSM session has expired, they should be redirected to login.
- Inactive sessions should not silently continue; we should avoid confusing stale UI.

### 3.2. Design

- Use NextAuth as the **source of truth** for session validity.
- Add a client-side inactivity watcher that:
  - Tracks **last user activity** (mouse, keyboard, click, visibility change).
  - Periodically checks whether the session is still valid.
  - If not, redirects to the login page.

### 3.3. Implementation steps

1. **Create `useSessionTimeout` hook**
   - New hook under `src/hooks/useSessionTimeout.ts` (or similar):
     - Uses `useSession` from `next-auth/react` to get `status` and `data?.expires`.
     - Listens for user activity events:
       - `mousemove`, `keydown`, `click`, `focus`, `visibilitychange`.
     - Maintains an in-memory `lastActive` timestamp.

2. **Inactivity threshold**
   - Configure a constant `INACTIVITY_MS = 15 * 60 * 1000` (15 minutes).
   - Use `setInterval` or `setTimeout` inside the hook to:
     - Periodically check `Date.now() - lastActive`.
     - If above `INACTIVITY_MS`, trigger a session re-check.

3. **Session re-check & redirect**
   - On suspected inactivity:
     - Either call `getSession()` (client) or rely on `useSession` refetch behavior.
     - If the session is gone or `status === 'unauthenticated'`:
       - Redirect to `/api/auth/signin?callbackUrl=<current location>`.

### 3.4. Testing

- Add tests (unit or integration) for `useSessionTimeout` to ensure:
  - `lastActive` updates on user events.
  - After 15 minutes of simulated inactivity, a session re-check is triggered and redirect logic runs when the session is missing.

4. **Mount globally**
   - Import and call `useSessionTimeout` inside `ClientShell.tsx` so it runs for all authenticated pages.
   - Ensure it does not interfere with the OAuth callback or section-picker redirect flows.

### 3.5. Current status

- **Implemented**:
  - `useSessionTimeout` hook created in `src/hooks/useSessionTimeout.ts`.
  - Tracks user activity (mousemove, keydown, click, focus, visibilitychange).
  - After 15 minutes of inactivity, calls `getSession()` and redirects to `/?callbackUrl=<current URL>` if session is expired.
  - Hook is mounted globally in `ClientShell.tsx` for all authenticated users.
  - Unit tests added in `src/hooks/__tests__/useSessionTimeout.test.tsx` covering:
    - No redirect when session is still valid after inactivity.
    - Redirect to login when session has expired after inactivity.
    - No checks performed when user is unauthenticated.
- Section 3 is **complete**.

---

## 4. Admin: hydrate members for selected sections

### 4.1. Requirements

- For **administrator** users only:
  - In addition to events, hydrate the client model with **members** for the selected sections.
- The members data should reflect OSM permissions: only members the user can see.

### 4.2. API structure (based on OSM API analysis)

The OSM API requires **two calls per member** to get full data:

1. **`getMembers`** (one call per section)
   - Returns a flat array of members with **summary data only**:
     - `scoutid`, `firstname`, `lastname`, `full_name`
     - `patrolid`, `patrol`, `sectionid`
     - `age` (string like "17 / 10")
     - `photo_guid`, `active`, `enddate`
   - **Does NOT include**: contact info, medical info, emergency contacts, consents

2. **`getCustomData`** (one call per member)
   - Returns rich nested data for a single member.
   - Structure: `{ status, error, data: Group[] }` where each `Group` has:
     - `group_id`, `identifier`, `name`, `custom_order`
     - `columns[]` - array of fields with `column_id`, `varname`, `label`, `value`, `type`, `order`
   - **Key groups** (by `identifier`):
     - `contact_primary_member` - Member's own contact info (address, phone, email, medical/dietary/allergy notes)
     - `contact_primary_1` - Primary Contact 1 (parent/guardian)
     - `contact_primary_2` - Primary Contact 2 (second parent/guardian)
     - `emergency` - Emergency Contact (must be different from primary contacts)
     - `doctor` - Doctor's Surgery info
     - `standard_fields` - Essential Information (medical, allergies, dietary, swimmer, etc.)
     - `consents` - Photo consent, medical consent
     - `customisable_data` - Section-specific custom fields (structure varies by section)

3. **`getIndividual`** (required for DOB)
   - Returns DOB, membership history, and other sections the member belongs to.
   - **Upstream URL**: `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getIndividual&sectionid={sectionid}&scoutid={scoutid}&termid={termid}&context=members`
   - **Parameters**:
     - `action=getIndividual` (fixed)
     - `sectionid` - section ID
     - `scoutid` - member ID
     - `termid` - term ID
     - `context=members` (fixed)
   - **Key fields returned**: `dob`, `started`, `startedsection`, `meetings`, `others` (other sections)

4. **`getCustomData`** (required for contact/medical data)
   - **Upstream URL**: `https://www.onlinescoutmanager.co.uk/ext/customdata/?action=getData&section_id={sectionid}&associated_id={scoutid}&associated_type=member&associated_is_section=null&varname_filter=null&context=members&group_order=section`
   - **Parameters**:
     - `action=getData` (fixed)
     - `section_id` - section ID
     - `associated_id` - member ID (scoutid)
     - `associated_type=member` (fixed)
     - `associated_is_section=null` (fixed)
     - `varname_filter=null` (fixed)
     - `context=members` (fixed)
     - `group_order=section` (fixed)

5. **API call summary per member**:
   - `getMembers`: 1 call per section (returns all members in section)
   - `getIndividual`: 1 call per member (for DOB)
   - `getCustomData`: 1 call per member (for contacts, medical, consents)
   - **Total**: For N members: 1 + N + N = 2N + 1 calls per section

### 4.3. Rate limiting considerations

- **Problem**: For N members in a section, we need:
  - 1 call to `getMembers` (returns all members)
  - N calls to `getIndividual` (for DOB)
  - N calls to `getCustomData` (for contacts, medical, consents)
- For a typical section with ~50 members, this is ~101 API calls.

- **Rate limiting is already implemented** in `src/lib/bottleneck.ts`:
  - Uses Bottleneck library with `maxConcurrent: 5` and `minTime: 50ms` between requests.
  - Parses `X-RateLimit-*` headers from OSM API responses.
  - Dynamically adjusts reservoir based on remaining quota (80% safety factor).
  - Triggers soft lock when quota drops below 10%.
  - All proxy requests go through `scheduleRequest()` which respects the rate limiter.

- **Implementation approach**:
  1. **Eager loading**: Start fetching `getCustomData` as soon as section selection is confirmed.
  2. **Use existing rate limiter**: All calls go through `/api/proxy/...` which already uses `scheduleRequest()`.
  3. **Progressive loading**: Show member list immediately from `getMembers`, then progressively load `getCustomData` in the background.
  4. **Caching**: Cache `getCustomData` responses for **12 hours** (data changes infrequently).

### 4.4. Unified data retrieval progress bar

- The existing header space showing event retrieval progress should be **generalized** into a unified progress component that tracks all data loads:
  - "Loading events..." (existing)
  - "Loading members..." (new, for `getMembers`)
  - "Loading member info..." (new, for `getIndividual` calls - DOB)
  - "Loading member details..." (new, for `getCustomData` calls - contacts/medical)
- Reuse the existing header location for this unified progress display.
- The component should show:
  - Current data type being loaded.
  - Progress (e.g., "Loading member details: 15/48").
  - Overall completion state.

### 4.5. Zod schemas

1. **Raw API response schemas** (in `src/lib/schemas.ts`):
   - `MemberSummarySchema` - for `getMembers` response items
   - `IndividualResponseSchema` - for `getIndividual` response (DOB, membership history)
   - `CustomDataColumnSchema` - for individual columns in `getCustomData`
   - `CustomDataGroupSchema` - for groups in `getCustomData`
   - `CustomDataResponseSchema` - for full `getCustomData` response

2. **Normalized member schema**:
   - `NormalizedMemberSchema` - unified view combining summary + individual + custom data:
     - `id`, `firstName`, `lastName`, `fullName`
     - `age` (string from `getMembers`)
     - `dateOfBirth` (from `getIndividual`)
     - `started`, `startedSection` (membership dates from `getIndividual`)
     - `sectionId`, `sectionName` - current section
     - `memberContact` - member's own contact info
     - `primaryContact1`, `primaryContact2` - parent/guardian contacts
     - `emergencyContact` - emergency contact
     - `doctorInfo` - doctor/surgery info
     - `consents` - photo consent, medical consent flags
     - `medicalInfo` - medical details, allergies, dietary requirements

### 4.6. Proxy helpers

In `src/lib/api.ts`, add:
- `getMembersForSection({ sectionid, termid, section }): Promise<MemberSummary[]>`
- `getMemberIndividual({ sectionid, scoutid, termid, section }): Promise<IndividualResponse>` - for DOB
- `getMemberCustomData({ sectionid, scoutid, termid, section }): Promise<CustomDataResponse>` - for contacts/medical

All calls go via `/api/proxy/...` per existing architecture.

### 4.7. Client hook for members

New hook `useMembers` in `src/hooks/useMembers.ts`:
- Reads `currentSection` from the store (single section only).
- Uses `useSession` to determine if the user is an admin.
- **Phase 1**: Fetch member summaries for the selected section.
- **Phase 2**: Queue `getIndividual` calls for each member (for DOB).
- **Phase 3**: Queue `getCustomData` calls for each member (for contacts/medical).
- Normalizes data into `NormalizedMember[]`.

### 4.8. Custom data parsing

Create helper functions to extract structured data from the `getCustomData` response:
- `parseCustomDataGroups(data: CustomDataGroup[]): ParsedMemberData`
- Extract by `identifier`:
  - `contact_primary_member` → `memberContact`
  - `contact_primary_1` → `primaryContact1`
  - `contact_primary_2` → `primaryContact2`
  - `emergency` → `emergencyContact`
  - `doctor` → `doctorInfo`
  - `standard_fields` → `essentialInfo`
  - `consents` → `consents`
- Within each group, extract columns by `varname` (e.g., `email1`, `phone1`, `address1`, etc.)

### 4.9. Acceptance criteria

For Section 4 to be considered complete:
- Admin user selects a section and, after a short delay, sees:
  - A populated members list on the Members page.
  - A unified header progress bar that steps through events → members → member info → member details.
- Each member in the list has:
  - Name, age, DOB, section, and contact/medical/consent flags populated from normalized data.
- Hydration respects rate limiting and does not trigger hard or soft locks under normal usage.
- When network/API errors occur:
  - Other members still load.
  - Failed members show an error state with an option to retry.
- Changing the selected section:
  - Cancels in-flight member hydration for the previous section.
  - Clears previous member data and starts fresh hydration for the new section.
- All new Zod schemas validate real mock data (`members.json`, `individual.json`, `user_custom_data.json`).

### 4.10. Error handling and resilience

1. **Partial failure handling**:
   - If `getIndividual` or `getCustomData` fails for one member, continue with others.
   - Store error state per member (e.g., `loadingState: 'error'`).
   - Display failed members with retry option in UI.

2. **Cancellation on section change**:
   - When user changes section mid-hydration, abort in-flight requests.
   - Clear partial data from previous section.

3. **Network errors**:
   - Handle timeouts, 429 responses, and connection failures gracefully.
   - Show error state with retry button.

4. **Loading state granularity**:
   - Track per-member state: `'pending' | 'summary' | 'individual' | 'customData' | 'complete' | 'error'`.
   - Allow UI to show partial data while remaining fields load.

### 4.11. Store design

Add to Zustand store (`src/store/use-store.ts`):
- `members: NormalizedMember[]` - array of normalized members.
- `membersLoadingState: 'idle' | 'loading-summary' | 'loading-individual' | 'loading-custom' | 'complete' | 'error'`.
- `membersProgress: { total: number; completed: number; phase: string }`.
- `membersLastUpdated: Date | null` - for "Last updated X minutes ago" display.
- `setMembers`, `updateMember`, `clearMembers` actions.

### 4.12. Cache and freshness

1. **Cache strategy**:
   - `getMembers`: Cache for 12 hours (list rarely changes).
   - `getIndividual`: Cache for 12 hours (DOB doesn't change).
   - `getCustomData`: Cache for 12 hours (contact info changes infrequently).
   - Cache in React Query only (not localStorage) due to data sensitivity.

2. **Cache invalidation**:
   - Clear member cache when section changes.
   - Provide manual "Refresh" button to force re-fetch.

3. **Freshness indicator**:
   - Display "Last updated: X minutes ago" in UI.
   - Consider stale indicator if data is >1 hour old.

### 4.13. Security considerations

1. **Admin role check**:
   - Verify admin role in `useMembers` hook before fetching (not just UI hiding).
   - Proxy route should also verify admin role for member data endpoints.

2. **Data sensitivity**:
   - Member contact/medical data is sensitive.
   - Do not persist to localStorage.
   - Consider logging access to member detail data for audit.

### 4.14. Missing API documentation

**`getMembers`** upstream URL (to be confirmed):
- URL pattern: `https://www.onlinescoutmanager.co.uk/ext/members/contact/?action=getListOfMembers&sectionid={sectionid}&termid={termid}&section={section}`
- Parameters:
  - `action=getListOfMembers` (fixed)
  - `sectionid` - section ID
  - `termid` - term ID
  - `section` - section type (e.g., "scouts")

### 4.15. Testing

**Unit tests**:
- **Zod schemas**: Validate against mock data samples and edge cases (missing fields, unexpected types, null values).
- **Custom data parsing**: Test extraction with missing groups, empty columns, null values, unexpected group identifiers.
- **Normalization logic**: Test combining summary + individual + custom data into `NormalizedMember`.

**Integration tests**:
- **Rate limiting**: Verify ~101 calls complete without triggering soft lock (use mock API with `NEXT_PUBLIC_USE_MOCK_API=true`).
- **Error handling**: Test API timeout, 429 response, partial member failures.
- **Cache behavior**: Verify 12h TTL, cache invalidation on section change.

**Hook tests** (`useMembers`):
- Loading states transition correctly through phases (summary → individual → customData → complete).
- Cancellation on section change aborts in-flight requests.
- Non-admin users receive no data (not just hidden UI).
- Error state set correctly when API fails.

**Component tests**:
- Progress bar updates correctly as calls complete.
- Error states display appropriately for failed members.
- "Last updated" timestamp displays correctly.

**Environment setup for tests**:
- Set `NEXT_PUBLIC_USE_MOCK_API=true` to use mock data for rate limiting and integration tests.
- Mock data files: `members.json`, `individual.json`, `user_custom_data.json`.

### 4.16. Current status

**Implemented** (December 2025):

1. **Zod schemas** (`src/lib/schemas.ts`):
   - `IndividualDataSchema` / `IndividualResponseSchema` - for `getIndividual` API response (DOB, membership history).
   - `CustomDataColumnSchema` / `CustomDataGroupSchema` / `CustomDataResponseSchema` - for `getCustomData` API response.
   - `NormalizedContactSchema`, `NormalizedConsentsSchema`, `NormalizedMemberSchema` - normalized member data structure.
   - `MemberSchema.photo_guid` updated to allow `null` (some members have no photo).
   - `CustomDataColumnSchema.value` updated to handle objects (e.g., confirmation fields with `{by, date}`).
   - `CustomDataColumnSchema.permissions` updated to handle both arrays and empty strings.

2. **Proxy helper functions** (`src/lib/api.ts`):
   - `getMemberIndividual({ sectionid, scoutid, termid })` - fetches DOB and membership history.
   - `getMemberCustomData({ sectionid, scoutid })` - fetches contacts, medical, consents.

3. **Mock data registration** (`src/app/api/proxy/[...path]/route.ts`):
   - Added `individual.json` and `user_custom_data.json` to mock data registry.

4. **Zustand store** (`src/store/use-store.ts`):
   - Added `MembersState` interface with `members`, `membersLoadingState`, `membersProgress`, `membersLastUpdated`, `membersSectionId`.
   - Added actions: `setMembers`, `updateMember`, `setMembersLoadingState`, `setMembersProgress`, `setMembersLastUpdated`, `setMembersSectionId`, `clearMembers`.
   - Added selector hooks: `useMembers`, `useMembersLoadingState`, `useMembersProgress`, `useMembersLastUpdated`.
   - Member data is NOT persisted to localStorage (security).

5. **Custom data parsing** (`src/lib/member-data-parser.ts` - new file):
   - `parseCustomDataGroups()` - extracts normalized contact, medical, consent data from `getCustomData` groups.
   - `extractContactInfo()`, `extractMedicalInfo()`, `extractConsentInfo()` - group-specific extractors.
   - `createNormalizedMemberFromSummary()` - creates initial member from `getMembers` response.
   - `updateMemberWithIndividualData()` - enriches member with DOB from `getIndividual`.
   - `updateMemberWithCustomData()` - enriches member with contacts/medical/consents from `getCustomData`.

6. **Members hydration hook** (`src/hooks/useMembersHydration.ts` - new file):
   - Three-phase hydration: `getMembers` → `getIndividual` (per member) → `getCustomData` (per member).
   - Progressive loading: members appear immediately from Phase 1, details fill in during Phases 2 & 3.
   - Cancellation: section change aborts in-flight hydration and clears data.
   - Error resilience: individual member failures don't block others; error state tracked per member.
   - 12-hour cache TTL for member data freshness.
   - Admin role check before fetching.

7. **Global integration** (`src/components/layout/ClientShell.tsx`):
   - `useMembersHydration` hook mounted globally for admin users.
   - Debug logging shows hydration progress in development.

8. **Single-section selection** (`src/app/dashboard/section-picker/page.tsx`):
   - Changed from multi-select (checkboxes) to single-select (radio button behavior).
   - Removed "Select All" / "Clear All" buttons.
   - Updated `RememberedSelection` interface to store `selectedSectionId` (string) instead of `selectedSectionIds` (array).
   - Tests updated in `src/app/dashboard/section-picker/__tests__/section-picker.test.tsx`.

9. **Role detection** (`src/components/StartupInitializer.tsx`):
   - Fixed to use `roleSelection` from session (set during OAuth login) instead of deriving from permissions.
   - Admin users who log in with `osm-admin` provider now correctly get `userRole: 'admin'`.

**Verified working**:
- Logging in as admin triggers member hydration.
- All 48 members in mock data are fetched with individual and custom data.
- Hydration completes in ~3 seconds with mock API.
- No validation errors with real mock data.

**Still outstanding**:
- Unit tests for `useMembersHydration` hook.
- Unit tests for `member-data-parser.ts` functions.
- Integration tests for rate limiting behavior.
- Progress bar UI component (not yet implemented).
- Members page UI (Section 5).

Section 4 core implementation is **complete**. Proceed to Section 5 (Members page).

---

## 5. Members page (admin): sortable member list

### 5.1. Route & access control

- New route, `src/app/dashboard/members/page.tsx`:
  - Server component wrapper that checks session/role (like existing admin page):
    - If not admin, show a "Forbidden" message and link back to Dashboard.
  - Renders a client component that uses `useMembers` for data.

### 5.2. Table requirements

- Columns:
  - **Name**: "Last name, First name" (primary sort column).
  - **First name** (optional separate column if desired).
  - **Age**.
  - **Sections**: list of sections the member belongs to.
  - **Flags**: icons for photo consent, medical info, allergies.

- Behavior:
  - Table is client-side sortable by clicking column headers:
    - At minimum: Name, Age, Sections.
  - Icons:
    - Use small `lucide-react` or similar icons, e.g.:
      - Photo consent: camera icon.
      - Medical info: cross or stethoscope icon.
      - Allergies: alert triangle icon.
    - Each icon should have `aria-label` and/or a tooltip for accessibility.

### 5.3. Layout

- Desktop:
  - Standard table layout using existing Tailwind table styling.
- Mobile:
  - Consider a card-based layout similar to the attendance page to avoid horizontal scrolling.

### 5.4. Testing

- Members list page (`/dashboard/members`):
  - Sorting behavior for name, age, and sections.
  - Correct rendering of section lists per member.
  - Correct icons for photo consent, medical info, and allergies.

### 5.5. Future enhancements

- Add text search by name and filters (e.g. by patrol, by data completeness).
- Consider pagination or virtual scrolling for very large sections (100+ members).
- Add a member detail view (modal or separate route) showing full normalized member data.
- Allow configurable column visibility (hide/show optional columns such as separate first-name column or DOB).

### 5.6. Current status

**Implemented** (December 2025):

1. **Route** (`src/app/dashboard/members/page.tsx`):
   - Server component with admin role check (same pattern as `/dashboard/admin`).
   - Returns "Forbidden" message for non-admin users.
   - Renders `MembersClient` component for admin users.

2. **Client component** (`src/app/dashboard/members/MembersClient.tsx`):
   - Uses `useMembers`, `useMembersLoadingState`, `useMembersProgress` from Zustand store.
   - Sortable columns: Name, Age, DOB, Patrol, Loading status.
   - Sort direction toggle (asc/desc) with visual indicators.
   - Status icons for photo consent, medical info, allergies.
   - Per-member loading state indicator (pending, loading, error).
   - Progress bar during hydration showing phase and completion count.
   - Empty state when no section selected.
   - Loading state while hydration in progress.

3. **Responsive layout**:
   - Desktop: Table view with sortable column headers.
   - Mobile: Card-based layout with key info per member.

4. **Sidebar** (`src/components/layout/Sidebar.tsx`):
   - Added "Members" link in admin section.
   - Uses `UsersIcon` from lucide-react.
   - Only visible to admin users.

**Verified working**:
- Page loads with hydrated member data.
- Sorting works correctly for all columns.
- Status icons reflect member data (photo consent, medical, allergies).
- Progress bar shows hydration progress.
- Mobile card view renders correctly.

**Still outstanding**:
- Unit tests for `MembersClient` component.
- Text search and filtering.
- Member detail view (modal or separate route).

Section 5 is **complete**. Proceed to Section 6 (Member data issues view).

---

## 6. Member data-quality view (admin)

### 6.1. Requirements

- Highlight issues with member data, including:
  - Missing or incomplete **member** contact information.
  - Missing or incomplete **other contacts** information.
  - Missing **doctor** information.
  - Emergency contact is the same as one of the other contacts.
- *Incomplete contact information* is defined as missing **any** of:
  - Postal address
  - Phone number
  - Email address

### 6.2. Derived issue model

- Create pure helper functions (e.g. `src/lib/member-issues.ts`) to compute:
  - `hasCompleteMemberContact(member)`.
  - `hasCompleteOtherContacts(member)`.
  - `hasDoctorInfo(member)`.
  - `hasDuplicateEmergencyContact(member)` where emergency contact matches an "other" contact.
- These helpers operate on the normalized `Member` + nested contacts shape from `useMembers`.

### 6.3. Issues route & UI

- New route, `src/app/dashboard/members/issues/page.tsx`:
  - Admin-only guard as with other admin pages.
  - Page header: dark strip (`bg-primary text-primary-foreground`) titled **Member data issues**.

- Content sections:
  1. **Summary cards** at the top:
     - Counters for each issue type (e.g. `X members with incomplete member contact info`).
  2. **Issue detail sections**:
     - For each issue type, a table listing affected members, including:
       - Name
       - Sections
       - Which fields are missing or problematic (e.g. `Missing: email, phone`).
     - For "emergency contact same as other contact":
       - Show both contacts side-by-side or clearly highlight duplication.

### 6.4. Testing

- Member issues view (`/dashboard/members/issues`):
  - Member issue helpers (`hasCompleteMemberContact`, `hasCompleteOtherContacts`, `hasDoctorInfo`, `hasDuplicateEmergencyContact`, etc.).
  - Correct grouping of members into each issue category.

### 6.5. Future enhancements

- Add issue types for missing photo consent and missing medical consent.
- Introduce severity levels (e.g. critical vs minor) for different issue types.
- Provide an "Export to CSV" option for issue tables so leaders can share or work offline.
- Allow leaders to mark specific issues as acknowledged/waived (e.g. parent declined to provide email).

---

## 7. Navigation updates

### 7.1. Sidebar Members section (admin-only)

- In `Sidebar.tsx`, under the **Members** section:
  - Keep `Patrol data` link.
  - Add:
    - `Members` → `/dashboard/members` (members table page).
    - `Member data issues` → `/dashboard/members/issues` (data-quality view).

### 7.2. Attendance route adjustment

- Update the attendance page route to live under the Events section:
  - Move or alias the route to `/dashboard/events/attendance`.
  - Ensure sidebar link and internal navigation target `/dashboard/events/attendance`.

- Ensure non-admin users do **not** see these links (based on `roleSelection`).

### 7.3. Testing

- Routing / URLs and navigation:
  - Ensure route helpers or navigation components reference `/dashboard/members*` and `/dashboard/events/attendance` as expected.
  - Verify non-admin users do not see Members-related links.

### 7.4. Future enhancements

- Add breadcrumb navigation for members routes (e.g. `Dashboard / Members / Data issues`).

---

## 8. Section selector hardening / post-login flash

### 8.1. Requirements

- After login for:
  - Single-section users: they should land directly on `/dashboard` with a valid section selected.
  - Multi-section users without a remembered selection: they should go straight to `/dashboard/section-picker` without a flash of the main dashboard.
- There should be no visible flash of the main dashboard content before the section selector appears.

### 8.2. Implementation steps

1. **Login redirect**
   - Update the login redirect logic to:
     - For single-section users, redirect to `/dashboard` with a valid section selected.
     - For multi-section users without a remembered selection, redirect to `/dashboard/section-picker`.

2. **Section picker optimization**
   - Optimize the section picker to load quickly and minimize the flash of the main dashboard content.

### 8.3. Testing

- Section selector hardening:
  - Single-section users land directly on `/dashboard` with a valid section selected.
  - Multi-section users without a remembered selection go directly to `/dashboard/section-picker`.
  - There is no visible flash of the main dashboard content before the section selector appears.

---

## 9. Testing & verification

### 9.1. Automated

- High-level reminder to:
  - Add or update tests for each phase as described in the per-section "Testing" subsections above.
  - Keep tests in sync with any future route or layout changes.

### 9.2. Manual checks

1. **Sidebar changes**
   - Section summary and "Change section" control visible at top of sidebar.

2. **Session timeout**
   - After inactivity + session expiry, returning to the tab triggers redirect to login.
   - Active users are not logged out prematurely.

3. **Members data**
   - As admin, members load for selected sections.
   - Members who belong to multiple sections show all relevant sections.

4. **Members page**
   - Sorting works as expected.
   - Icons reflect photo consent, medical info, and allergies correctly.

5. **Member data issues**
   - Members with incomplete data appear under correct issue categories.
   - Definitions of "incomplete" match the rules in this document.

6. **Section selector hardening**
   - After login, users are redirected to the correct page without a flash of the main dashboard content.

### 9.3. End-to-end testing

- Add E2E tests (e.g. with Playwright) for critical admin flows:
  - Hydrating members and loading the Members page.
  - Viewing member data issues and verifying issue counts.
  - Navigating via sidebar between Dashboard, Members, and Member data issues.
  - Login → section selection → dashboard without flash.
