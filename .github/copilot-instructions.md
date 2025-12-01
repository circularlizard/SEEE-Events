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

## 5. Testing Strategy
* **Network:** Use `msw` (Mock Service Worker) for all network tests. Do not mock `fetch` globally if MSW can handle it.
* **Unit:** Use `jest` and `react-testing-library`.
* **Mocking:** Mock `useSession` and `useQuery` hooks rather than wrapping tests in full providers where possible.