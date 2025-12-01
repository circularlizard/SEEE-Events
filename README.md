# SEEE Expedition Dashboard

A read-only dashboard for managing Scout expedition events, built with Next.js 15 and TypeScript.

## 🚀 Quick Start

### Prerequisites

- Node.js 20+ and npm
- Docker (for local Redis)

### Installation

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env.local

# Start local Redis (optional - for caching)
docker-compose up -d

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see the app.

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

```bash
# Run tests
npm test

# Watch mode
npm run test:watch
```

Tests use Mock Service Worker (MSW) to intercept network requests.

## 🛠️ Development

### Mock Service Worker

In development, MSW intercepts API calls and returns mock data from `src/mocks/data/`. This allows development without hitting the real OSM API.

To disable MSW:
```bash
# In .env.local
NEXT_PUBLIC_USE_MSW=false
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

Private project for SEEE use only.
