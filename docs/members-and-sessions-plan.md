# Members & Sessions Implementation Plan

## 1. Overview

This plan covers:

- Moving section selection controls from the page header into the sidebar.
- Implementing session timeout behavior so inactive sessions redirect to login when expired.
- For administrator users:
  - Hydrating the client data model with **members** for selected sections, in addition to events.
  - Adding a **Members** page with a sortable table of members.
  - Adding a **Member data issues** view that highlights problems with member data quality.

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
   - For mobile, either:
     - Keep a compact "Change section" action in the header, or
     - Rely on the sidebar if it is accessible via a mobile drawer.

### 2.4. Testing

- Update any existing tests around the section picker and initial dashboard load to reflect:
  - Section controls living in the sidebar instead of the header.
  - No flash of the main dashboard when a section is not yet selected.

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

---

## 4. Admin: hydrate members for selected sections

### 4.1. Requirements

- For **administrator** users only:
  - In addition to events, hydrate the client model with **members** for the selected sections.
- The members data should reflect OSM permissions: only members the user can see.

### 4.2. API and schemas

1. **Zod schemas**
   - In `src/lib/schemas.ts`, define:
     - `MemberSchema` for a normalized member view, including:
       - `id` (OSM member id), `firstName`, `lastName`.
       - `age` (derived from DOB if available).
       - `sections: { sectionId: string; sectionName: string; sectionType: string }[]`.
       - Contact info: postal address, phone, email.
       - Flags: `hasPhotoConsent`, `hasMedicalInfo`, `hasAllergies`.
     - `MembersResponseSchema` for API responses.

2. **Proxy helpers**
   - In `src/lib/api.ts`, add:
     - `getMembersForSection({ sectionid, termid, sectionType }): Promise<MembersResponse>`.
     - All calls go via `/api/proxy/...` per existing architecture.
   - Validate all responses with the Zod schemas (no `any`).

### 4.3. Client hook for members

- New hook `useMembers` in `src/hooks/useMembers.ts`:
  - Reads `currentSection`, `selectedSections`, `availableSections` from the store.
  - Uses `useSession` to determine if the user is an admin (`roleSelection === 'admin'`).
  - For admins and when sections are selected:
    - Multi-section mode: `useQueries` per section.
    - Single-section mode: `useQuery`.
  - Normalizes and merges data into a single `Member[]`:
    - De-duplicate members who appear in multiple sections and merge `sections` arrays.

### 4.4. Testing

- Member data model:
  - Zod schemas (`MemberSchema`, `MembersResponseSchema`).
  - Normalization logic for merging multi-section membership.

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
