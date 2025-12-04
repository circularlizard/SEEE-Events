# SEEE Expedition Dashboard

A read-only dashboard for managing Scout expedition events, built with Next.js 15 and TypeScript.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker (for local Redis)
- mkcert (for HTTPS in development)

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

# Start local Redis (REQUIRED for auth cache)
# Redis stores OAuth resource data to keep JWTs small.
# Without Redis running, you'll see 500 errors from /api/auth/oauth-data
docker compose up -d redis

# Start development server with HTTPS
npm run dev

# Or use HTTP if you prefer
npm run dev:http
```

Visit [https://localhost:3000](https://localhost:3000) to see the app.

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

### Unit & Integration Tests

```bash
# Run Jest tests
npm test

# Watch mode
npm run test:watch

# Phase 1 Safety Layer validation
npm run validate:safety
```

Tests use Mock Service Worker (MSW) to intercept network requests.

### End-to-End (E2E) Tests

E2E tests use Playwright to test the full application flow in a real browser:

```bash
# Run all E2E tests (headless)
npm run test:e2e

# Run with interactive UI
npm run test:e2e:ui

# Debug mode (step through tests)
npm run test:e2e:debug

# View HTML test report
npm run test:e2e:report
```

**E2E Test Coverage:**
- **Login Flow:** Unauthenticated redirect, OAuth trigger, post-auth navigation
- **Section Picker:** Multi-section modal, selection persistence (skipped - requires multi-section mock data)
- **Events List:** Loading states, desktop table view, mobile card view, responsive layout

**Requirements:**
- Dev server must be running (Playwright will start it automatically)
- HTTPS certificates must be generated (`mkcert localhost`)
- Redis must be running (`docker compose up -d redis`)
- Mock Auth mode recommended for reliable testing

**Browsers Tested:**
- Chromium (Desktop Chrome)
- Mobile Chrome (Pixel 5 emulation)

**Note:** Some section picker tests are skipped pending multi-section mock data configuration.

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
