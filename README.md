# SEEE Expedition Dashboard

A read-only dashboard for managing Scout expedition events, built with Next.js 15 and TypeScript.

## 🚀 Quick Start

### Prerequisites


### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Install mkcert (if not already installed)
brew install mkcert
mkcert -install

# Generate SSL certificates
mkdir -p certs
cd certs
mkcert localhost 127.0.0.1 ::1
cd ..

# Start local Redis (REQUIRED for auth cache + platform defaults)
# Redis stores OAuth resource data to keep JWTs small.
# Without Redis running, you'll see 500 errors from /api/auth/oauth-data
docker compose up -d redis

# Seed platform defaults (section ID + platform operators) if needed
KV_URL=redis://localhost:6379 node scripts/seed-platform-defaults.mjs

# Start development server with HTTPS
npm run dev

# Or use HTTP if you prefer
npm run dev:http
```

Visit [https://localhost:3000](https://localhost:3000) to see the app.

## Current Application Portfolio (Status – Jan 2026)

- **Expedition Viewer (Phase 1 complete)** – Locked to the SEEE section, `/dashboard` now redirects to the unit attendance overview, and `/dashboard/events/attendance` renders Unit Summary Cards with drill-down accordion, cache banner, hydration indicator, and By Event / By Attendee toggle. Viewer reuses the shared Expedition Events view and consolidated attendance components that Planner consumes.
- **Expedition Planner (Phase 2 in progress)** – Shares the events shell with Viewer (`/dashboard/planning/events`) and will pick up the same attendance components as new planning scenarios land. Planner personas should log in via the "Expedition Planner" mock auth button.
- **OSM Data Quality Viewer** – Multi-section issues workspace focused on patrol data quality (Phase 3).
- **Platform Admin** – Platform operations tooling (audit log, cache views, telemetry) with admin-only scopes.

## UI Standards

The SEEE Expedition Dashboard follows consistent UI patterns across the Events List and Event Detail pages:

- Page padding: use `p-4 md:p-6` for top-level wrappers.
- Table typography: apply `text-sm` to desktop tables for consistent sizing.
- Table frame: wrap tables in a `div` with `border rounded-lg overflow-hidden`.
- Table header: use `thead.bg-muted`; header cells `text-left p-4 font-semibold` and `cursor-pointer` when sortable.
- Table rows: `border-b last:border-b-0 hover:bg-muted/50 transition-colors`.
- Table cells: `p-4` with `text-muted-foreground` for secondary values.
- Back link: on Event Detail, place “Back to Events” at the very top using a shadcn Button (`variant="ghost"`).
- Event header: large `CardTitle` for the title; `CardDescription` shows date range, times, location, and cost separated by `•`. Only show `approval_status` if present—do not show API `status: true`.
- Public notes: render `meta.event.publicnotes` inside a default-collapsed native `<details><summary>Event Description</summary></details>` within `CardContent`.
- Participants (Event Detail):
  - Source rows from `summary.meta.event.members`.
  - Attendance status from `attending`.
  - Age computed from `member.dob`.
  - Custom field values from `details`; titles from `summary.meta.event.config`.
  - Render custom fields as individual dynamic columns; only include columns with at least one non-empty value.
  - Patrol ID: cross-reference `summary.data.members` (`member_id → patrol_id`) when available.

These conventions are also documented in `/.github/copilot-instructions.md` and should be followed for new views and components.

## Contributing

- Follow `/.github/copilot-instructions.md` for architecture, data-access, and UI standards.
- Match table and page styles per the UI Standards above.
- Keep OSM data read-only; all calls must go through `/api/proxy`.
- Use Zod for data parsing, TanStack Query for server data, and Zustand for client state.
- Prefer shadcn/ui components from `@/components/ui/*`.

Before opening a PR:

```bash
npx tsc --noEmit
npm run lint
npm run test
```

For E2E checks (optional):

```bash
npm run test:e2e
```

### Local Testing Instructions

#### Running the Full Test Stack

Use the `/test-stack` Windsurf workflow or run manually:

```bash
# 1. Start Redis (required for auth and platform config)
docker-compose up -d redis

# 2. Run linter
npm run lint

# 3. TypeScript check
npx tsc --noEmit

# 4. Unit tests with coverage
npm run test:unit

# 5. BDD E2E tests with instrumentation
cross-env INSTRUMENT_CODE=1 npm run test:bdd

# 6. Merge coverage reports
npm run test:merge

# 7. View merged coverage
open coverage/total/index.html
```

#### Testing Multi-App Functionality

The application now supports four apps: **expedition**, **planning**, **platform-admin**, and **multi** (multi-section viewer).

**Setting Platform Configuration:**

```bash
# Set the canonical SEEE section ID (required for SEEE-specific apps)
KV_URL=redis://localhost:6379 node scripts/seed-platform-defaults.mjs

# Or manually via Redis CLI:
redis-cli SET platform:seeeSectionId "43105"
redis-cli SADD platform:allowedOperators "admin@example.com"
```

**Testing Different Role/App Combinations:**

1. **Admin + Planning** (default for admin):
   - Login as admin, select "planning" app
   - Access: `/dashboard/planning`, `/dashboard/members`, `/dashboard/admin`

2. **Admin + Platform Admin**:
   - Login as admin, select "platform-admin" app
   - Access: `/dashboard/admin`, `/dashboard/api-browser`, `/dashboard/debug/*`

3. **Standard + Expedition** (default for standard):
   - Login as standard, select "expedition" app
   - Access: `/dashboard`, `/dashboard/events`, `/dashboard/events/attendance`

4. **Standard/Admin + Multi-Section Viewer**:
   - Login with either role, select "multi" app
   - Access: `/dashboard/members`, `/dashboard/section-picker`
   - Section selector remains visible (unlike SEEE-specific apps)

**App Selection Flow:**
- App selection happens at login and persists in the session
- Each app has dedicated route groups: `(expedition)`, `(planning)`, `(platform-admin)`, `(multi)`
- Cross-app navigation is blocked by `ClientShell` and middleware
- App-specific 404 pages guide users back to valid routes

**Testing Access Control:**
- Standard users **cannot** access: `/dashboard/admin`, `/dashboard/api-browser`, `/dashboard/members`
- Admin users **can** access all routes
- Route guards enforce app and role requirements
- Unauthorized access redirects to appropriate default paths

### Mock Personas (Dev & Playwright)

When mock auth is enabled (`NEXT_PUBLIC_MOCK_AUTH_ENABLED=true`), you can select predefined personas from the dropdown on the login screen or via Playwright steps:

| Persona ID | Role | Default App | Notes |
| --- | --- | --- | --- |
| `seeeEventsOnlyRestrictedOther` | Standard | Expedition Viewer | SEEE events-only scope; lands on the new attendance overview |
| `seeeFullElevatedOther` | Admin | Expedition Planner | Full SEEE scope + elevated access for Planner scenarios |
| `seeeFullOnly` | Admin | Expedition Viewer | Useful for testing shared components without elevated scope |
| `noSeeeElevatedOther` | Admin | Planner / Data Quality | Cross-section admin without SEEE access (used for guard-rail tests) |

These personas match the Playwright BDD steps (e.g., `Given I am logged in with mock persona "seeeEventsOnlyRestrictedOther" for app "Expedition Viewer"`). If the dropdown is hidden, the mock auth buttons still auto-select the appropriate persona for the chosen app.

### OAuth Callback URLs

The application uses **two separate OAuth providers** to request different scopes based on user role:

- **Administrator**: `https://localhost:3000/api/auth/callback/osm-admin`
  - Scopes: `section:event:read section:member:read section:programme:read section:flexirecord:read`
- **Standard Viewer**: `https://localhost:3000/api/auth/callback/osm-standard`
  - Scopes: `section:event:read`

**OSM OAuth Configuration Required:**
Both callback URLs must be whitelisted in your OSM Developer Portal OAuth application settings.

For production deployment, replace `localhost:3000` with your actual domain.

### Verify Redis is running

```bash
# Check the container health
docker ps --filter name=seee-redis-local

# Optional: ping Redis inside the container (should return PONG)
docker exec -it seee-redis-local redis-cli ping
```

If Redis is not running, Startup initialization and the API Browser will fail with:
`[StartupInitializer] Failed to fetch OAuth data: 500 "Internal Server Error"`.
Start Redis with `docker compose up -d redis` and reload the page.

To verify the platform defaults exist (and optionally override them), run:

```bash
redis-cli GET platform:seeeSectionId
redis-cli GET platform:allowedOperators
```

Re-run `scripts/seed-platform-defaults.mjs --force` to update the seeded values.

## 📁 Project Structure

```
.
├── src/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── lib/              # Utilities and business logic
│   ├── mocks/            # Mock Service Worker setup
│   │   ├── data/         # Sanitized test data (NO PII)
│   │   ├── api_map.json  # API endpoint mapping
│   │   └── handlers.ts   # MSW request handlers
│   ├── store/            # Zustand state management
│   └── types/            # TypeScript type definitions
├── docs/                 # Architecture and specifications
├── scripts/              # Data sanitization scripts
└── reference_data/       # Raw API dumps (gitignored - contains PII)
```

## 🔒 Security Features

### Read-Only Architecture
- **No mutations:** All `POST/PUT/DELETE` requests are blocked
- **Proxy pattern:** Frontend never calls OSM API directly
- **Rate limiting:** Built-in bottleneck protection (80% of API limit)
- **Circuit breaker:** Automatic pause if quota exhausted

### Data Safety
- All PII is scrubbed from test data
- Mock names used in development (e.g., "James Smith")
- Raw API dumps in `reference_data/` are gitignored
- Only sanitized JSON in `src/mocks/data/` is committed

## 🧪 Testing

### Core Commands

```bash
# Lint + type-check + unit tests
npm run lint
npx tsc --noEmit
npm run test:unit

# Instrumented BDD E2E tests (collects coverage)
cross-env INSTRUMENT_CODE=1 npm run test:bdd

# Merge Jest + Playwright coverage (outputs coverage/total/index.html)
npm run test:merge

# Mutation testing (Stryker)
npm run test:mutation
```

- Jest tests run under MSW for deterministic API interception.
- Playwright uses `playwright-bdd` with `.feature` files + shared steps; reports live in `playwright-report/`.
- Mutation reports are written to `reports/mutation/index.html`.

### Windsurf Workflows

Run these helper workflows from the command palette (⌘K):

1. **`/test-stack`** – docker Redis → lint → `tsc` → unit → instrumented BDD → coverage merge → open report.
2. **`/mutation-scan`** – redis pre-check → unit smoke → `npm run test:mutation` → open mutation report.
3. **`/bdd-fix`** – rerun failing feature/scenario via `--grep`, open Playwright report, optional `codegen`.
4. **`/file-completed-plan`** – archive finished plans and update docs (COMPLETED_PHASES, SPEC, ARCHITECTURE, README).

These workflows mirror CI so local runs catch issues early.

### CI Automation

| Workflow | Trigger | Purpose |
| --- | --- | --- |
| **CI – Tests** (`.github/workflows/ci-test.yml`) | Pull requests, manual | Lint → `tsc` → unit → instrumented BDD → coverage merge → upload artifacts |
| **CI – Mutation Testing** (`ci-mutation.yml`) | Nightly 02:00 UTC, manual | Unit smoke → `npm run test:mutation` → publish report and fail if mutation score < 80% |
| **CI – Deploy** (`ci-deploy.yml`) | Release, manual | Build after CI – Tests succeeds, upload build artifact for deployment |

Branch protection should require CI – Tests; mutation + deploy workflows surface quality gates and release readiness.

## 🛠️ Development

### Operation Modes

The application supports three operation modes to enable flexible development and testing:

#### 1. **Real Auth + Real Data** (Production Mode)
**When to use:** Production deployment or testing with live OSM data

```bash
# .env.local
MOCK_AUTH_ENABLED=false
NEXT_PUBLIC_USE_MSW=false
OSM_CLIENT_ID=your_real_client_id
OSM_CLIENT_SECRET=your_real_client_secret
```

- Uses OAuth 2.0 authentication with Online Scout Manager
- Makes real API calls to OSM endpoints
- Requires valid OAuth credentials registered in OSM Developer Portal
- Token rotation and rate limiting active

#### 2. **Real Auth + Mock Data** (Safe Development Mode)
**When to use:** UI development with real authentication but safe test data

```bash
# .env.local
MOCK_AUTH_ENABLED=false
NEXT_PUBLIC_USE_MSW=true
OSM_CLIENT_ID=your_real_client_id
OSM_CLIENT_SECRET=your_real_client_secret
```

- Uses real OAuth flow for authentication
- API calls intercepted by MSW and return sanitized mock data
- Good for testing authentication flow without consuming API quota
- Ensures UI handles real auth tokens correctly

#### 3. **Mock Auth + Mock Data** (Offline/CI Mode)
**When to use:** Offline development, CI/CD pipelines, or quick prototyping

```bash
# .env.local
MOCK_AUTH_ENABLED=true
NEXT_PUBLIC_USE_MSW=true
```

- No OSM credentials required
- Uses credentials provider with predefined mock users
- All API calls return mock data from `src/mocks/data/`
- Perfect for CI/CD environments and offline development

**Mock Users Available:**
- `admin` - Full admin access, multiple sections
- `standard` - Standard leader, single section
- `readonly` - Read-only viewer, single section
- `multiSection` - Standard leader with 3 sections (tests section picker)

Login with any of these usernames and any password when `MOCK_AUTH_ENABLED=true`.

### Mock Service Worker

MSW intercepts API calls and returns mock data from `src/mocks/data/`. This allows development without hitting the real OSM API.

Control MSW via environment variable:
```bash
# In .env.local
NEXT_PUBLIC_USE_MSW=true   # Enable mock data
NEXT_PUBLIC_USE_MSW=false  # Use real API calls
```

#### MSW Fixture Modes (`MSW_MODE`)

`MSW_MODE` selects which persona/app dataset is returned while MSW is active. Set it alongside `NEXT_PUBLIC_USE_MSW=true`.

| Mode | When to use it | Data shape |
| --- | --- | --- |
| `admin` (default) | Multi-section admin persona (events + members + patrol/flexi data). | Full dataset from `src/mocks/data/`, mirrors production admin access. |
| `standard` | Expedition viewer persona focused on event visibility only. | Returns event APIs unchanged but redacts member/patrol/flexi/startup payloads. |
| `platform` | Platform Admin Console smoke tests. Combine with `admin` (comma-separated). | Adds `/api/telemetry/rate-limit` + `/api/platform/cache-status` fixtures on top of admin data. |

Example commands:

```bash
# Expedition viewer (standard) in dev server
MSW_MODE=standard NEXT_PUBLIC_USE_MSW=true npm run dev

# Admin + Platform console in dev server
MSW_MODE=admin,platform NEXT_PUBLIC_USE_MSW=true npm run dev

# Playwright BDD with standard fixtures
cross-env NEXT_PUBLIC_USE_MSW=true MSW_MODE=standard npm run test:bdd

# Playwright covering admin + platform-only specs
MSW_MODE=admin,platform NEXT_PUBLIC_USE_MSW=true npm run test:bdd -- --grep "@platform"
```

When `NEXT_PUBLIC_USE_MSW=false`, the value of `MSW_MODE` is ignored.

### Controlling visible login apps

Set `NEXT_PUBLIC_VISIBLE_APPS` (comma-separated `AppKey` list) to control which app cards render on the login screen. Defaults to `expedition,planning` so unfinished apps like Data Quality stay hidden.

### Data Sanitization

To regenerate mock data from new API dumps:

1. Place raw `.txt` files in `reference_data/`
2. Run the sanitizer:
```bash
python3 scripts/sanitize_data.py
```
3. Review output in `src/mocks/data/`

## 📚 Documentation

- [Architecture](./docs/ARCHITECTURE.md) - System design and patterns
- [Specification](./docs/SPECIFICATION.md) - Requirements and features
- [Implementation Plan](./IMPLEMENTATION_PLAN.md) - Development roadmap

## 🤝 Contributing

This project uses:
- **TypeScript** (strict mode)
- **ESLint** for linting
- **Prettier** (via ESLint) for formatting
- **Conventional Commits** for commit messages

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
