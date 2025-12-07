# SEEE Expedition Dashboard: Copilot Instructions

You are an expert React/Next.js developer assisting in the creation of the SEEE Expedition Dashboard. You must strictly adhere to the project's Technical Architecture and File Structure.

## 1. Core Tech Stack
* **Framework:** Next.js 14+ (App Router).
* **Language:** TypeScript (Strict mode).
* **UI Components:** shadcn/ui + Radix UI. Do not import raw generic components; always use `@/components/ui/*`.
* **Styling:** Tailwind CSS.
* **State:** TanStack Query (Server Data) and Zustand (Client State).

## 2. File Structure & Organization
* **Do not create new top-level folders.** Stick to `src/components`, `src/lib`, `src/hooks`, etc.
* **DTOs vs Models:** Keep Zod schemas in `src/lib/schemas.ts`.
* **Business Logic:** Keep rate limiting in `src/lib/bottleneck.ts` and API wrappers in `src/lib/api.ts`.

## 3. Security & Data Constraints (CRITICAL)
* **Read-Only:** Never create `POST/PUT/DELETE` routes for OSM data. The app is strictly Read-Only.
* **Proxy Pattern:** The frontend **NEVER** calls OSM directly. All fetches must go through `/api/proxy`.
* **No Persistent DB:** Do not suggest MongoDB, Postgres, or SQL. We use **Vercel KV (Redis)** for configuration and caching only.
* **PII Safety:** Never hardcode names or emails in tests. Use `src/mocks/data` (sanitized JSON) or generic "Scout A" placeholders.

## 4. Coding Patterns
* **Zod Validation:** Use `zod` for all data parsing.
    * **Tier 1:** Strict validation for IDs and Names (throw errors).
    * **Tier 2:** Permissive validation for Logistics/Flexi fields (return `null` on error).
* **Adapter Pattern:**
    * Use `BadgeAdapter` for fixed ID records (e.g., First Aid).
    * Use `FlexiAdapter` for user-defined columns (e.g., "Tent Group").
* **Mobile First:** When building tables, always include `hidden md:table` logic and provide a Card-based alternative for mobile screens.

## 6. UI Standards (Tables & Detail Pages)

- **Page Padding:** Use `p-4 md:p-6` for top-level page wrappers (events list and event detail) to keep spacing consistent.
- **Table Typography:** Use `text-sm` on tables in desktop views for consistent sizing across list and detail pages.
- **Table Frame:** Wrap tables in a `div` with `border rounded-lg overflow-hidden` and use a muted header row `thead.bg-muted`.
- **Table Header Cells:** Header `<th>` cells should use `text-left p-4 font-semibold`. Add `cursor-pointer` for sortable headers.
- **Table Body Rows:** Use `border-b last:border-b-0 hover:bg-muted/50 transition-colors` for row separators and hover feedback.
- **Table Body Cells:** Use `p-4` for spacing; apply `text-muted-foreground` for secondary values.
- **Back Link Placement:** On event detail, put the “Back to Events” control at the very top (before the header card). Use a supported shadcn Button variant (e.g., `variant="ghost"`).
- **Event Header Content:**
    - Show title as a heading-styled `CardTitle` (e.g., `text-2xl md:text-3xl font-semibold`).
    - Display date range and time as `CardDescription` with `•` separators.
    - Show `location` and `cost` inline with the date/time.
    - Do not show API `status: true`. If present, show only `approval_status`.
- **Public Notes:** Render `meta.event.publicnotes` inside a default-collapsed native `<details><summary>Event Description</summary></details>` block within `CardContent`. Avoid extra toggle buttons.
- **Participants (Detail Page):**
    - Source rows from `summary.meta.event.members`.
    - Attendance status from `attending`.
    - Age computed from `member.dob`.
    - Custom field values from `details`.
    - Custom field titles from `summary.meta.event.config`.
    - Render custom fields as individual dynamic columns; only include columns that have at least one non-empty value.
    - Patrol ID: where available, cross-reference `summary.data.members` (`member_id → patrol_id`) to populate the patrol column.
- **Mobile Participants:** Provide card view (`md:hidden`) with primary info (name, patrol, attendance, age). Avoid legacy badge blocks unless required.

## 5. Testing Strategy
* **Network:** Use `msw` (Mock Service Worker) for all network tests. Do not mock `fetch` globally if MSW can handle it.
* **Unit:** Use `jest` and `react-testing-library`.
* **Mocking:** Mock `useSession` and `useQuery` hooks rather than wrapping tests in full providers where possible.