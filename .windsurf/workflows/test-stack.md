---
description: Run full test stack locally with coverage
---

# Test Stack Workflow

This workflow runs the complete test suite locally: linting, unit tests, BDD E2E tests (instrumented), and merges coverage reports.

## Prerequisites

- Redis running locally (via `docker-compose up -d redis`)
- Node dependencies installed (`npm install`)
- Playwright browsers installed (`npx playwright install`)

## Steps

// turbo
1. **Start Redis** (if not already running):
   ```bash
   docker-compose up -d redis
   ```

// turbo
2. **Run linter**:
   ```bash
   npm run lint
   ```

// turbo
3. **Run TypeScript check**:
   ```bash
   npx tsc --noEmit
   ```

// turbo
4. **Run unit tests with coverage**:
   ```bash
   npm run test:unit
   ```

// turbo
5. **Run BDD E2E tests with instrumentation**:
   ```bash
   cross-env INSTRUMENT_CODE=1 npm run test:bdd
   ```

// turbo
6. **Merge coverage reports**:
   ```bash
   npm run test:merge
   ```

// turbo
7. **Open merged coverage report**:
   ```bash
   open coverage/total/index.html
   ```

## Expected Output

- Linting passes with no errors
- TypeScript compilation succeeds
- Unit tests pass with coverage collected in `coverage/unit/`
- E2E tests pass with coverage collected in `coverage/e2e/`
- Merged coverage report available in `coverage/total/index.html`

## Troubleshooting

- If Redis connection fails, ensure Redis is running on port 6379
- If E2E tests fail, check that no dev server is already running on port 3000
- If coverage merge fails, ensure both unit and E2E tests completed successfully
