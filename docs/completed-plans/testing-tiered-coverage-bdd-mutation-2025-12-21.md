# Tiered Testing Implementation (Tier 0–3) — Completed (2025-12-21)

## Scope

This document records completion of the testing tiers work:

- Tier 0: Requirement IDs in `docs/SPECIFICATION.md`
- Tier 1: Numerical coverage (unit + E2E) and merge pipeline
- Tier 2: Functional coverage using Playwright-BDD (Gherkin)
- Tier 3: Mutation testing using Stryker (manual trigger)

## Tier 0 — Requirement IDs

- Specification updated to use stable IDs (`REQ-<DOMAIN>-<NN>`) for traceability.

## Tier 1 — Numerical Coverage

### Unit coverage

- Jest configured to collect coverage.
- Output:
  - `coverage/unit/` (HTML + JSON)

### Instrumented E2E coverage

- Next.js 15 SWC plugin approach was not compatible; switched to Babel Istanbul instrumentation scoped to `src/`.
- Playwright fixture captures `window.__coverage__` to JSON.
- Output:
  - `coverage/e2e/` (JSON)

### Merge

- `nyc` merge configured to merge unit + e2e coverage.
- Output:
  - `coverage/total/index.html`

## Tier 2 — Functional Coverage (BDD)

- Added `playwright-bdd` and generation step (`bddgen`).
- Features stored under:
  - `tests/e2e/features/**`
- Steps stored under:
  - `tests/e2e/steps/**`

### BDD suite status

- `npm run test:bdd` runs and is green.
- REQ tags enforced for `.feature` files via `npm run test:req-tags`.

### Legacy specs

- Legacy `.spec.ts` files were removed for flows with BDD equivalents.

## Tier 3 — Mutation Coverage (Manual)

- Stryker configured via `stryker.conf.json`.
- Manual trigger:
  - `npm run test:mutation`
- Report output:
  - `reports/mutation/index.html`

## Notable Decisions

- Prefer BDD `.feature` files for new E2E coverage.
- Keep mutation testing manual (on-demand) rather than scheduled.
- Avoid global Babel config for Next.js (can break ESM deps); prefer scoped instrumentation.
