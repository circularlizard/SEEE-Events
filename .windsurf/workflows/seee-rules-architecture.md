---
description: SEEE Expedition Dashboard architecture and implementation rules
---

# SEEE Expedition Dashboard Architecture Rules

## 1. Core Tech Stack
- **Framework:** Next.js 14+ (App Router) with `src/app` routing.
- **Language:** TypeScript in strict mode.
- **UI Components:** shadcn/ui + Radix UI.
  - Always import from `@/components/ui/*` for primitives.
- **Styling:** Tailwind CSS (utility classes, responsive design).
- **State Management:**
  - **TanStack Query** for server data (OSM API responses, summaries, details).
  - **Zustand** for client state (session/role/section, preferences, column mappings).

## 2. File & Layer Organization
- **Top-level structure:** Do **not** add new top-level folders.
  - Use existing layout:
    - `src/app` – routes (pages, layouts, API handlers).
    - `src/components` – UI and domain components.
    - `src/hooks` – React hooks.
    - `src/lib` – shared libraries (auth, api, bottleneck, redis, schemas, logger, utilities).
    - `src/mocks` – MSW handlers + sanitized mock data.
    - `src/store` – Zustand stores.
    - `src/types` – TypeScript types.
- **Zod schemas:**
  - All schemas and parsing helpers live in `src/lib/schemas.ts`.
  - Do not scatter Zod schemas into components or hooks.
- **Business logic placement:**
  - **Rate limiting / safety layer:** `src/lib/bottleneck.ts` and `src/app/api/proxy/[...path]/route.ts`.
  - **API wrappers / domain accessors:** `src/lib/api.ts` and related helpers.
  - **Auth configuration:** `src/lib/auth.ts` and `app/api/auth/[...nextauth]/route.ts`.
  - **Redis / KV access:** `src/lib/redis.ts`.

## 3. Security & Data Constraints (CRITICAL)
- **Read-only policy:**
  - Do **not** create `POST`, `PUT`, `PATCH`, or `DELETE` routes that talk to OSM.
  - The user-facing application is strictly read-only with respect to OSM data.
- **Proxy pattern:**
  - The frontend must **never** call OSM directly.
  - All OSM-related network calls go through `/api/proxy/[...path]`.
  - New data-access helpers must use `src/lib/api.ts` or add similar wrappers that still call `/api/proxy`.
- **No persistent DB:**
  - Do **not** introduce relational/NoSQL databases (Postgres, MongoDB, etc.).
  - Only use **Vercel KV / Redis** for:
    - Rate-limit state and locks.
    - Cached OSM responses.
    - Admin configuration and access control metadata.
- **PII safety:**
  - Never hardcode real names, emails, phone numbers, or addresses in code or tests.
  - Use existing sanitized mock data under `src/mocks/data` or generic placeholders like "Scout A".

## 4. Routing & App Structure
- **App Router:**
  - Use file-based routing under `src/app` with layouts and route groups as already established.
  - Keep dashboard routes under `app/dashboard` (and subroutes like `events`, `people`, `settings`, `api-browser`).
- **Route handlers:**
  - For auth: `app/api/auth/[...nextauth]/route.ts` using `authConfig` from `src/lib/auth.ts`.
  - For proxy/safety layer: `app/api/proxy/[...path]/route.ts` only; new OSM endpoints should map through this route, not additional direct fetches.
- **Layouts:**
  - Root layout sets up providers (NextAuth `SessionProvider`, MSW provider, TanStack Query provider, StartupInitializer, Tailwind/shadcn theme).
  - Dashboard layout manages sidebar, header, avatar, theme toggle.

## 5. Data Fetching & State Patterns
- **Route loaders vs client hooks:**
  - Use server-side logic (API routes + `lib/api.ts`) to encapsulate calls to OSM via the proxy.
  - Use TanStack Query hooks (e.g. `useEvents`, `useEventDetail`, `useEventSummaryCache`) for client data fetching.
- **Split-state model:**
  - TanStack Query: server data (events, members, attendance, flexi records, summaries).
  - Zustand: client preferences and session context (section, role, theme, column mappings, filters).
- **Progressive hydration:**
  - Follow the existing pattern:
    - Fetch event index first, render shell.
    - Hydrate per-event data via a controlled queue and TanStack Query.
  - When adding new views that rely on heavy data (e.g. readiness, per-person attendance), re-use the queue and summary cache rather than creating ad-hoc fetch storms.

## 6. UI & Styling Conventions
- **Components:**
  - Prefer shadcn/ui components from `@/components/ui/*` for primitives (Button, Card, Dialog, Table, etc.).
  - Put feature-specific UI in `src/components/domain` or similar feature subfolders, not in `lib`.
- **Tailwind usage:**
  - Follow standards in `README.md` and `.github/copilot-instructions.md` (e.g. `p-4 md:p-6` for page padding; `text-sm`, framed tables, responsive "table vs cards" behavior).
- **Accessibility:**
  - Use semantic HTML; rely on Radix primitives/shadcn defaults for keyboard and ARIA behavior.

### 6.1 Mobile‑First Tables
- Always design data views mobile‑first:
  - On **desktop (md and up)**: use a table view (`md:table`) with full columns.
  - On **mobile (below md)**: hide the table and display card‑based layouts.
- Implementation pattern:
  - Wrap the table in a container with `hidden md:table` (or similar) so it is not rendered on small screens.
  - Provide a corresponding card layout with `md:hidden` for phones.

### 6.2 Event Detail & Table UI Standards
- **Page padding:** Use `p-4 md:p-6` on top‑level page wrappers for list/detail views.
- **Tables (desktop):**
  - Typography: `text-sm` on table content.
  - Frame: wrap tables in a `div` with `border rounded-lg overflow-hidden`.
  - Header row: `thead.bg-muted`.
  - Header cells: `text-left p-4 font-semibold`; add `cursor-pointer` on sortable headers.
  - Body rows: `border-b last:border-b-0 hover:bg-muted/50 transition-colors`.
  - Body cells: `p-4`, using `text-muted-foreground` for secondary values.
- **Back link (event detail):**
  - Place the "Back to Events" control at the very top of the page, before the main header card.
  - Use a shadcn Button with a lightweight variant (e.g. `variant="ghost"`).
- **Event header content:**
  - Use `CardTitle` for the main title (e.g. `text-2xl md:text-3xl font-semibold`).
  - Use `CardDescription` to display date range, time, location, and cost separated by `•`.
  - Do **not** surface raw API `status: true`; if present, show only `approval_status`.
- **Public notes:**
  - Render `meta.event.publicnotes` inside a default‑collapsed native
    `<details><summary>Event Description</summary></details>` block within `CardContent`.
  - Avoid adding extra toggle buttons if `<details>` is sufficient.
- **Participants (event detail):**
  - Source rows from `summary.meta.event.members`.
  - Attendance status from the `attending` field.
  - Compute age from `member.dob`.
  - Custom field values from `details`; custom field titles from `summary.meta.event.config`.
  - Render custom fields as dynamic columns; include only columns with at least one non‑empty value.
  - Where available, cross‑reference `summary.data.members` (`member_id → patrol_id`) to populate the patrol column.
- **Mobile participants:**
  - Provide a card view (`md:hidden`) with primary participant info (name, patrol, attendance, age).
  - Avoid legacy badge blocks unless the specification explicitly requires them.

## 7. When adding or modifying features
- **Before you start:**
  - Confirm the feature fits one of the planned phases in `IMPLEMENTATION_PLAN.md`.
  - Re-use existing patterns for data fetching, state, and validation.
- **While implementing:**
  - Keep new logic in the correct layer:
    - API shape and parsing in `lib/api.ts` + `lib/schemas.ts`.
    - View composition in components under `src/components` and `src/app` routes.
  - Do not bypass the `/api/proxy` route for any OSM data.
- **After implementing:**
  - Ensure TypeScript is clean (`tsc --noEmit`).
  - Add or update tests where appropriate (unit, integration, E2E).

### 7.1 Adapter Pattern for Training & Flexi Data
- When implementing readiness/training or logistics views that depend on OSM badge/flexi data:
  - Use a **Badge adapter** for fixed‑ID badge records (e.g. First Aid qualifications).
  - Use a **Flexi adapter** for user‑defined/flexible columns (e.g. "Tent Group", "Walking Group").
- Keep these adapters in the appropriate configuration/adapter layer (not in components), and feed their normalized output into Zod‑validated schemas and TanStack Query hooks.
