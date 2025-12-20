# Members & Sessions Implementation Plan

## 1. Overview

This plan covers:

- Moving section selection controls from the page header into the sidebar.
- Implementing session timeout behavior so inactive sessions redirect to login when expired.
- For administrator users:
  - Hydrating the client data model with **members** for selected sections, in addition to events.
  - Adding a **Members** page with a sortable table of members.
  - Adding a **Member data issues** view that highlights problems with member data quality.
- Migrating server-derived client data (starting with events + members) to **TanStack React Query**.

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

Section 8 (React Query migration) should happen after 6/7 so it can be
validated against real consumers.

Section 9 (section selector hardening) is partially independent but
benefits from Section 2 being in place.
```

### 1.2. Consolidated plan outline (tracking)

- **Completed**:
  - Section 2 (sidebar / section selector)
  - Section 3 (session timeout)
  - Section 4 (members hydration)
  - Section 5 (members page)
  - Section 6 (member data issues)
  - Section 7 (navigation updates)
  - Section 8 (TanStack React Query migration)
  - Section 9 (section selector hardening / no-flash)
  - Section 11 (unified data loading system)
  - Section 12 (member issues page UX improvements)
- **Next**:
  - All sections complete!

### 1.3. Detailed implementation checklist conventions

- Use `- [ ]` items as the authoritative progress tracker.
- When a section is complete, keep only a short summary in this file and move details to `docs/completed-plans/`.

---

## 2. Move section controls into the sidebar

- **Status**: Completed.
- **Details**: moved to `docs/completed-plans/members-and-sessions-completed-2025-12-19.md` (Section 2).
- **Notes**:
  - Residual post-login/dashboard flash is tracked in Section 9.
  - Single-section selection behavior should be re-verified during Section 9 hardening.

---

## 3. Session timeout & redirect to login

- **Status**: Completed.
- **Details**: moved to `docs/completed-plans/members-and-sessions-completed-2025-12-19.md` (Section 3).
- **Notes**:
  - Low priority follow-up: when the server restarts, all sessions should be cleared.

---

## 4. Admin: hydrate members for selected sections

- **Status**: Completed.
- **Details**: canonical details moved to `docs/completed-plans/members-and-sessions-completed-2025-12-19.md` (Section 4).

<details>
<summary>Archived details (do not edit here)</summary>

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

**Implemented** (13 December 2025):

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

</details>

---

## 5. Members page (admin): sortable member list

- **Status**: Completed.
- **Details**: canonical details moved to `docs/completed-plans/members-and-sessions-completed-2025-12-19.md` (Section 5).

<details>
<summary>Archived details (do not edit here)</summary>

### 5.1. Route & access control

- New route, `src/app/dashboard/members/page.tsx`:
  - Server component wrapper that checks session/role (like existing admin page):
    - If not admin, show a "Forbidden" message and link back to Dashboard.
  - Renders a client component that uses `useMembers` for data.

### 5.2. Table requirements

- Columns (desktop):
  - **Status**: per-member hydration state (icon-only column; sortable).
  - **Name**: "Last name, First name" (primary sort column).
  - **Age**.
  - **DOB**.
  - **Details**: icons for photo consent, medical info, allergies.
  - **Patrol**: member's patrol in the currently selected section.
  - **Sections**: list of *other* sections the member belongs to (excluding the current patrol).

- Behavior:
  - Table is client-side sortable by clicking column headers:
    - At minimum: Status, Name, Age, Patrol.
  - Icons:
    - Use small `lucide-react` icons, e.g.:
      - Photo consent: camera icon.
      - Medical info: stethoscope icon.
      - Allergies: alert triangle icon.
      - Hydration status: circular loader, warning triangle, and green tick.
    - Each icon has `aria-label` and/or a tooltip for accessibility.
  - An inline **icon legend** (key) appears above the table explaining all status and detail icons.

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

**Implemented** (13 December 2025):

1. **Route** (`src/app/dashboard/members/page.tsx`):
   - Server component with admin role check (same pattern as `/dashboard/admin`).
   - Returns "Forbidden" message for non-admin users.
   - Renders `MembersClient` component for admin users.

2. **Client component** (`src/app/dashboard/members/MembersClient.tsx`):
   - Uses `useMembers`, `useMembersLoadingState`, `useMembersProgress` from Zustand store.
   - Sortable columns: Status (hydration state), Name, Age, DOB, Patrol.
   - Sort direction toggle (asc/desc) with visual indicators.
   - **Sections** column shows all *other* sections a member belongs to.
   - **Details** column shows icons for photo consent, medical info, and allergies.
   - Per-member loading state indicator (pending, loading, error, complete) rendered as icons.
   - Progress bar during hydration showing phase and completion count.
   - Inline icon legend explaining all status/detail icons.
   - Empty state when no section selected.
   - Loading state while hydration in progress.
   - Jest tests in `src/app/dashboard/members/__tests__/members-client.test.tsx` covering sorting, sections display, icons, loading states, and mobile cards.

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
- Text search and filtering.
- Member detail view (modal or separate route).

Section 5 is **complete**. Proceed to Section 6 (Member data issues view).

</details>

---

## 6. Member Data Issues (Admin) ✅

### 6.1. Requirements (Implemented)

- Highlights issues with member data, categorized by severity:

**Critical issues** (prevent safe event participation):
  - ✅ Absence of **any** contact information (no member contact, no primary contacts, no emergency contact).
  - ✅ Absence of at least one **email address** or **phone number** across all contacts.
  - ✅ No **emergency contact** defined.

**Medium issues** (important but not blocking):
  - ✅ Missing **medical practice details** (doctor/surgery information).
  - ✅ Emergency contact is the **same as** another contact (primary contact 1 or 2).
  - ✅ Missing **member contact** email or phone (even if other contacts have them).

**Low issues** (administrative/compliance):
  - ✅ Missing **photo consent**.
  - ✅ Missing **medical consent**.

### 6.2. Implementation Details

#### Helper Functions (`src/lib/member-issues.ts`)

**Critical Issue Detectors**:
- ✅ `hasNoContactInformation(member)` - No contact info at all
- ✅ `hasNoEmailOrPhone(member)` - No email/phone across all contacts
- ✅ `hasNoEmergencyContact(member)` - Emergency contact missing

**Medium Issue Detectors**:
- ✅ `hasMissingDoctorInfo(member)` - Doctor/surgery info missing
- ✅ `hasDuplicateEmergencyContact(member)` - Emergency contact matches primary contact
- ✅ `hasMissingMemberContactDetails(member)` - Member's own email/phone missing

**Low Issue Detectors**:
- ✅ `hasMissingPhotoConsent(member)` - Photo consent not recorded
- ✅ `hasMissingMedicalConsent(member)` - Medical consent not recorded

**Aggregators**:
- ✅ `getMemberIssues(member)` - Returns all issues for a member with severity levels
- ✅ `getMembersWithIssues(members)` - Categorizes members by issue severity
- ✅ `getIssueCounts(members)` - Provides counts for summary cards

- These helpers operate on the normalized `Member` + nested contacts shape from `useMembers`.

### 6.3. Implementation Details (UI)

#### Route: `/dashboard/members/issues`
- ✅ **Admin-only** access control via server component guard
- ✅ Page header with title and description
- ✅ Responsive layout with summary cards and issue tables

#### Summary Cards
- ✅ **Critical Issues** (Red/destructive variant)
  - No contact information
  - No email or phone
  - No emergency contact
- ✅ **Medium Issues** (Yellow/warning variant)
  - Missing doctor info
  - Duplicate emergency contact
  - Missing member contact details
- ✅ **Low Issues** (Blue/info variant)
  - Missing photo consent
  - Missing medical consent

#### Issue Tables
- ✅ Grouped by severity (Critical → Medium → Low)
- ✅ Expandable sections for each issue type
- ✅ For each member, shows:
  - Name (link to member detail)
  - Patrol name
  - Other sections (comma-separated)
  - Specific missing fields in issue details
  - Severity badge

#### Empty States
- ✅ No members loaded
- ✅ No issues found (with success message)
- ✅ Error states with retry option
  1. **Summary cards** at the top (grouped by severity):
     - **Critical issues card** (red/destructive variant):
       - Count of members with no contact information.
       - Count of members with no email or phone.
       - Count of members with no emergency contact.
     - **Medium issues card** (yellow/warning variant):
       - Count of members with missing doctor info.
       - Count of members with duplicate emergency contact.
       - Count of members with missing member contact details.
     - **Low issues card** (blue/info variant):
       - Count of members with missing photo consent.
       - Count of members with missing medical consent.
  
  2. **Issue detail sections** (one per severity level):
     - For each severity level, a collapsible section with tables for each issue type.
     - Each table lists affected members with:
       - Name
       - Sections
       - Specific missing fields or problematic data (e.g. `Missing: email, phone`).
     - For duplicate emergency contact issues:
       - Show which contact is duplicated (e.g., "Emergency contact same as Primary Contact 1").

### 6.4. Testing

#### Unit Tests (`src/lib/__tests__/member-issues.test.ts`)
- ✅ 34 tests covering all helper functions
- ✅ Edge cases and boundary conditions
- ✅ Type safety with TypeScript

#### Component Tests (`src/app/dashboard/members/issues/__tests__/member-issues-client.test.tsx`)
- ✅ Renders empty state when no members
- ✅ Shows no issues state when all data is complete
- ✅ Displays summary cards with correct counts
- ✅ Groups members by issue type correctly
- ✅ Shows missing fields in issue details
- ✅ Handles duplicate contact information
- ✅ Displays patrol name and other sections
- ✅ Shows em dash for empty sections
- ✅ Displays severity badges correctly

### 6.5. Future Enhancements
- [ ] Add breadcrumb navigation (e.g., `Dashboard / Members / Data issues`)
- [ ] Export issues to CSV/PDF
- [ ] Add bulk actions to resolve common issues
- [ ] Track issue resolution history
- [ ] Email notifications for critical issues

### 6.6. Implementation Notes
- Uses **React Query** for data fetching and caching
- Implements **progressive enhancement** - shows basic info immediately, then loads additional data
- Follows **accessibility** best practices
- Matches existing design system with shadcn/ui components
- Fully typed with TypeScript
- 100% test coverage for issue detection logic
- Provide an "Export to CSV" option for issue tables so leaders can share or work offline.
- Allow leaders to mark specific issues as acknowledged/waived (e.g. parent declined to provide email).

---

## 7. Navigation updates

### 7.0. Detailed implementation checklist

- [x] Ensure sidebar shows admin-only Members links (Members, Member data issues).
- [x] Move or alias attendance route to `/dashboard/events/attendance`.
- [x] Update any internal links/route helpers to point to the new attendance route.
- [x] Verify non-admin users do not see Members-related links.
- [x] Add/adjust tests for routing + sidebar visibility.

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

## 8. TanStack React Query migration (events + members)

This section consolidates the recommendations from `docs/completed-plans/members-hydration-react-query-summary-2025-12-19.md` into this plan.

### 8.1. Decision

- **Chosen approach**: Orchestrated pipeline (closest to current hydration model), writing incremental results into the React Query cache.
- **UX requirement**: Keep **progressive enrichment** (Phase 1 list appears immediately; Phase 2/3 enrich rows incrementally).

### 8.2. Goals

- Make React Query the **single source of truth** for cached server-derived data (events + members).
- Keep Zustand focused on **UI/selection state** (section selection, role, table sort/filter state).
- Preserve the `/api/proxy` “safety shield” boundary (auth, rate limiting, circuit breakers, Redis caching).
- Keep sensitive data **in-memory only** (no query persistence).

### 8.3. Prerequisites

- [x] Add true request cancellation:
  - [x] Update `proxyFetch()` to accept an optional `AbortSignal` and pass it to `fetch(..., { signal })`.
  - [x] Thread that signal through exported API helpers (`getEvents`, `getMembers`, `getMemberIndividual`, `getMemberCustomData`, etc.).

- [x] Define retry rules for `APIError` so the client does not hammer the proxy:
  - [x] `401` unauthenticated: no retry.
  - [x] `429` soft lock: no retry (or a single delayed retry), surface a clear “cooling down” UI.
  - [x] `503` hard lock: no retry, surface a clear “system halted” UI.

### 8.4. Migration sequence

- [x] Migrate **events first**:
  - [x] Introduce an events query key (e.g. `['events', sectionId]`).
  - [x] Use a conservative `staleTime` and disable `refetchOnWindowFocus` for events if it is expensive.
  - [x] Ensure section change naturally switches cache keys.

- [x] Migrate **members second**:
  - [x] Introduce a members query key (e.g. `['members', sectionId]`).
  - [x] Implement the 3-phase pipeline inside the query function (Phase 1 list, Phase 2 individual, Phase 3 custom data).
  - [x] Write incremental updates to the query cache so the UI can progressively render partial data (Option 1).
  - [x] Ensure long `staleTime` and disabled focus refetch for members.

- [x] Remove duplicated server-state from Zustand:
  - [x] Remove members/events as the authoritative data source in Zustand (avoid two sources of truth).
  - [x] Keep only UI state and (optionally) the unified loading banner state.

### 8.5. Verification

- [x] Query cancellation aborts network requests (not just cooperative cancellation).
- [x] Logout clears React Query cache.
- [x] Section change does not leak old data into the new section.

---

## 9. Section selector hardening / post-login flash

### 9.0. Detailed implementation checklist

- [x] If there is a cached selected section, load data for it and do not show the section selector.
- [x] If there is no cached selected section, show the section selector immediately (no dashboard flash), store the selection, then load data.
- [x] When a section is already selected, switching section uses an inline dropdown (not the full-screen section picker route).
- [x] Add/adjust tests for initial load gating + section switching behavior.

### 9.1. Requirements

- **Initial load behavior**:
  - If `currentSection` is present (persisted selection), the app renders the normal dashboard shell and begins loading data for that section.
  - If `currentSection` is not present, the app must render the section selector immediately (no flash of the normal dashboard UI), and only render the dashboard shell after a section is chosen.

- **Selection persistence**:
  - The selected section is stored in the client session store (persisted) so refreshes return to the same section.

- **Change section behavior**:
  - If a section is already selected, the user can switch section via a compact dropdown control.
  - The full section picker UI is reserved for the “no section selected” state (or optional explicit “change section” flow if needed).

- **No-flash requirement**:
  - When no section is selected, the normal dashboard layout (sidebar/header/content) must not render before the section selector.

### 9.2. Implementation steps

1. **Gated initial render (no flash)**
   - Gate rendering of the main dashboard shell on `currentSection`.
   - If `currentSection` is missing, render the section selector directly (full-screen) and delay rendering the dashboard shell until after selection.

2. **Persisted section restore**
   - On initial load, if `currentSection` exists, use it immediately and trigger data loads (events + members) for that section.

3. **Dropdown change section**
   - Replace the “Change section” link/modal flow with an inline dropdown when a section is already selected.
   - Switching sections should update `currentSection` and naturally re-key React Query caches.

### 9.3. Testing

- Section selector hardening:
  - With a cached selection, the section selector is not shown and data loads for the selected section.
  - With no cached selection, the section selector is shown immediately and there is no flash of the normal dashboard UI.
  - With a selected section, switching section uses the dropdown control and loads the new section’s data.

---

## 10. Testing & verification

### 10.0. Tracking checklist

- [ ] Add/update automated tests for Sections 6/7/8/9.
- [ ] Add manual verification notes for Sections 6/7/8/9.
- [ ] Add E2E coverage for critical admin flows and post-login no-flash flow.

### 10.1. Automated

- High-level reminder to:
  - Add or update tests for each phase as described in the per-section "Testing" subsections above.
  - Keep tests in sync with any future route or layout changes.

### 10.2. Manual checks

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

### 10.3. End-to-end testing

- Add E2E tests (e.g. with Playwright) for critical admin flows:
  - Hydrating members and loading the Members page.
  - Viewing member data issues and verifying issue counts.
  - Navigating via sidebar between Dashboard, Members, and Member data issues.
  - Login → section selection → dashboard without flash.

---

## 11. Unified Data Loading System

- **Status**: Completed.
- **Details**: canonical details moved to `docs/completed-plans/members-and-sessions-completed-2025-12-19.md` (Section 10).

<details>
<summary>Archived details (do not edit here)</summary>

### 10.1. Implementation Status (Completed)

- **Unified Loading Banner**
  - Created `DataLoadingBanner` component to replace separate loading indicators
  - Banner shows combined progress for all data sources (members, events, etc.)
  - Displays "All data loaded" when complete
  - Handles error states with clear messaging
  - Shows source summary (e.g., "Members: 42, Events: 15") on desktop

- **Eager Events Loading**
  - Implemented `useEventsHydration` hook for eager loading of events data
  - Events now load immediately when a section is selected
  - Added proper error handling and retry logic
  - Integrated with the unified loading state system

- **State Management**
  - Extended Zustand store with `dataSourceProgress` state
  - Added actions for updating and clearing progress
  - Implemented selectors for derived state (loading, complete, error states)

- **Code Cleanup**
  - Removed deprecated components: `MembersHydrationBanner` and `SummaryQueueBanner`
  - Updated all pages to use the new unified loading system
  - Improved TypeScript types for better type safety

### 10.2. Testing

- **Unit Tests**
  - Added comprehensive tests for `DataLoadingBanner` component
  - Added tests for data loading tracker store actions
  - All existing tests passing

- **Manual Testing**
  - Verified loading states for both members and events
  - Tested error handling and recovery
  - Confirmed proper behavior when switching sections

### 10.3. Next Steps

1. **Performance Optimization**
   - Consider implementing request deduplication for events data
   - Add caching for events data to avoid unnecessary refetches
   - Implement proper cleanup of stale data when switching sections

2. **Enhanced Error Recovery**
   - Add retry buttons for failed data loads
   - Implement exponential backoff for retries
   - Add more detailed error reporting

3. **Progressive Enhancement**
   - Add skeleton loading states for better perceived performance
   - Implement optimistic UI updates where appropriate
   - Add loading priorities for critical vs non-critical data

4. **Documentation**
   - Update API documentation for the new data loading system
   - Add developer documentation for adding new data sources
   - Create user documentation for the new loading indicators

5. **Analytics**
   - Add performance metrics for data loading times
   - Track error rates and common failure modes
   - Monitor user experience with the new loading patterns
   - View transaction log in the browser

### 10.4. Known Issues

- Occasional flash of loading state when navigating between pages
- Some edge cases in error recovery could be handled more gracefully
- Mobile layout may need additional refinement for the new banner

### 10.5. Future Considerations

- Implement server-side rendering for initial data loading
- Add support for background refresh of stale data
- Consider implementing a proper data fetching library like React Query or SWR --> Need to analyse this further and expand on what it would do for us.

</details>

---

## 12. Member Issues Page UX Improvements

### 12.0. Detailed implementation checklist

- [x] Replace card-based layout with collapsible sections
- [x] Section headers show summary (count, criticality, color coding)
- [x] Expanded sections show sortable member tables
- [x] Tables sortable by all columns (default: name)
- [x] Update tests for new component structure

### 12.1. Requirements

**Current State:**
- Member issues displayed as cards with summary information
- Each card shows issue type, count, criticality level, and color coding
- Clicking a card shows member details in a separate view

**New State:**
- Replace cards with collapsible accordion sections
- Section headers display the same summary information as current cards:
  - Issue type name
  - Member count
  - Criticality indicator (color + icon)
  - Brief description
- When expanded, show a sortable table of affected members
- Tables should be sortable by all columns
- Default sort: member name (ascending)

### 12.2. Implementation steps

1. **Install/verify accordion component**
   - Use shadcn/ui Accordion component for collapsible sections
   - Ensure proper accessibility (ARIA attributes)

2. **Restructure MemberIssuesClient component**
   - Replace Card components with Accordion
   - Move summary info to AccordionTrigger
   - Move member tables to AccordionContent

3. **Add table sorting**
   - Implement sortable table headers
   - Support sorting by: name, patrol, age, missing data fields
   - Maintain sort state per section
   - Visual indicators for sort direction

4. **Preserve styling and colors**
   - Maintain current color coding for criticality levels
   - Keep visual hierarchy clear
   - Ensure mobile responsiveness

### 12.3. Testing

- Member issues page loads with all sections collapsed
- Clicking section header expands/collapses that section
- Tables display correct member data
- Sorting works for all columns
- Color coding and criticality indicators display correctly
- Mobile layout remains functional
