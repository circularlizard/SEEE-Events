# SEEE Testing Implementation Plan

## 0. Specification Prerequisite

- **Problem:** `docs/SPECIFICATION.md` currently lists requirements without stable identifiers, making it impossible to trace Gherkin scenarios back to source requirements.
- **Action:** Refactor the specification so every requirement (feature, sub-feature, acceptance rule) carries a unique identifier (e.g., `REQ-DASH-01`) following a consistent naming scheme.
- **Deliverables:**
  1. Introduce numbering + IDs within each section of the specification.
  2. Add an appendix table mapping legacy descriptions to new IDs.
  3. Document the ID format in `/seee-rules-testing` so future authors stay consistent.
- **Gate:** No BDD migration work starts until the updated specification has been reviewed and merged.

## 1. Objectives

- Establish measurable confidence in the SEEE Dashboard by combining numerical, functional, and mutation coverage.
- Move the entire Playwright suite to Gherkin-based BDD while preserving current regression value.
- Provide a repeatable workflow for feature delivery, test authoring, and coverage auditing.

## 2. Tooling Decisions

| Area | Decision | Notes |
| --- | --- | --- |
| BDD runner (Q1) | **Playwright + `playwright-bdd`** | Keeps the existing Playwright ecosystem, adds Cucumber syntax support without maintaining two runners. |
| Feature storage (Q2) | **`tests/e2e/features/<domain>/<feature>.feature`** | Mirrors route structure, enables requirement tagging (`@REQ-...`). |
| Step definitions (Q3) | **`tests/e2e/steps/*.ts` (shared)** | One shared directory per domain; steps import helpers from `tests/e2e/support`. |
| Migration scope (Q4) | **Full migration to BDD** | Convert all existing specs; no dual mode after completion. |

## 3. Tier 1 – Numerical Coverage

### 3.1 Unit tests (Jest)

1. Update `jest.config.ts`:
   - `collectCoverage: true`
   - `coverageDirectory: '<rootDir>/coverage/unit'`
   - `coverageReporters: ['json','html','text']`
2. Ensure `npm run test:unit` maps to `jest --runInBand` to stabilise coverage collection.
3. Store artifacts in CI (HTML + JSON).

### 3.2 Instrumented E2E tests (Playwright)

1. Install dependencies: `npm i -D playwright-bdd cross-env nyc babel-loader @babel/core babel-plugin-istanbul`.
2. Update `next.config.mjs` to instrument application code when `INSTRUMENT_CODE=1`.
   - Use a Babel Istanbul post-loader in `webpack` scoped to `src/` (Next 15 SWC plugin compatibility varies).
3. Ensure Playwright starts the dev server with `INSTRUMENT_CODE=1` (via `playwright.config.ts` `webServer.env`).
4. Create `tests/e2e/fixtures.ts` extending Playwright’s `test` to capture `window.__coverage__`.
5. Run instrumented suite via `cross-env INSTRUMENT_CODE=1 playwright test`.

### 3.3 Coverage merge

Scripts to add:
```json
"scripts": {
  "test:unit": "jest",
  "test:e2e": "cross-env INSTRUMENT_CODE=1 playwright test",
  "pretest:merge": "mkdir -p coverage/merged",
  "test:merge": "nyc merge coverage/unit coverage/merged/unit.json && nyc merge coverage/e2e coverage/merged/e2e.json && nyc merge coverage/merged coverage/merged/coverage.json",
  "posttest:merge": "nyc report --reporter=html --reporter=text --temp-dir=coverage/merged --report-dir=coverage/total",
  "audit:coverage": "npm run test:unit && npm run test:e2e && npm run test:merge"
}
```

## 4. Tier 2 – Functional Coverage (BDD)

### 4.1 Gherkin conventions

- File headers include `Feature:` + business objective and `@REQ-*` tags.
- Scenario templates:
  ```gherkin
  Scenario: REQ-MEM-01 – Admin views member issues
    Given I am logged in as an admin
    And I have selected the "Borestane" section
    When I open the "Member data issues" page
    Then I should see the "Missing Photo Consent" accordion section
  ```
- Use Background for authentication + section selection.

### 4.2 Repository layout

```
tests/
└─ e2e/
   ├─ features/
   │  ├─ dashboard/
   │  ├─ members/
   │  └─ auth/
   ├─ steps/
   │  ├─ dashboard.steps.ts
   │  ├─ members.steps.ts
   │  └─ shared.steps.ts
   └─ support/
      ├─ fixtures.ts
      ├─ selectors.ts
      └─ data.ts
```

### 4.3 Migration phases

1. **Infra** (Week 1)
   - Add `playwright-bdd` config (`playwright.bdd.config.ts`).
   - Implement shared `Given/When/Then` helpers (auth, navigation, assertions).
2. **High-value flows** (Week 2)
   - Convert `dashboard.spec.ts`, `members.spec.ts`, `attendance.spec.ts` into `.feature` files.
   - Keep legacy specs in CI until new BDD specs are green.
3. **Full conversion** (Week 3)
   - Rewrite remaining specs (console errors, admin access) as features.
   - Delete legacy `.spec.ts` files once parity verified.
4. **Ongoing**
   - Every new feature **must** ship with Gherkin + steps.
   - Requirements tracked via `REQ-` tags searchable in repo.

## 5. Tier 3 – Mutation Coverage

1. Install Stryker packages (`@stryker-mutator/core`, `@stryker-mutator/jest-runner`).
2. Add `stryker.conf.json` targeting `src/lib/**/*.ts` and `src/utils/**/*.ts` (exclude tests and generated files).
3. CI job `npm run test:unit && npx stryker run` for weekly confidence sweeps.
4. Treat surviving mutants as blockers for release until test gaps resolved.

## 6. Tier 4 – Automation & Reporting

### 6.1 CI / Reporting Pipeline

1. **Core stages**:
   - `test:unit`
   - `test:e2e` (BDD, instrumented)
   - `test:merge`
   - `stryker` (cron or nightly)
2. **Artifacts**:
   - `coverage/unit`, `coverage/e2e`, `coverage/total`
   - Stryker HTML report
3. **Governance**: dashboard tracks numerical %, functional scenario counts, mutation score.

### 6.2 GitHub Actions Workflows

| Workflow | Trigger | Steps | Gates |
| --- | --- | --- | --- |
| `ci-test.yml` | `pull_request`, `workflow_dispatch` | Install deps → Lint → `npm run test:unit` → `npm run test:e2e` (BDD) → `npm run test:merge` | Required |
| `ci-mutation.yml` | `schedule` (nightly) + manual | Install deps → `npm run test:unit` → `npx stryker run` | Optional (reports blockers) |
| `ci-deploy.yml` | `workflow_dispatch`, `release` | Needs `ci-test` success → Build (`npm run build`) → Publish/Deploy | Publish gate |

Implementation steps:

1. Create `.github/workflows/ci-test.yml`
   ```yaml
   name: CI – Tests
   on:
     pull_request:
     workflow_dispatch:
   jobs:
     test:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: npm
         - run: npm ci
         - run: npm run lint
         - run: npm run test:unit
         - run: cross-env INSTRUMENT_CODE=1 npm run test:e2e
         - run: npm run test:merge
         - uses: actions/upload-artifact@v4
           with:
             name: coverage-total
             path: coverage/total
   ```
2. Add `.github/workflows/ci-mutation.yml` (nightly cron + manual).
3. Require `CI – Tests` + `CI – Mutation` via branch protection.
4. Add `.github/workflows/ci-deploy.yml` that depends on `CI – Tests` (`needs: ["CI – Tests"]`) and runs `npm run build` + deployment when releases/manual dispatch are approved.
5. Upload merged coverage + Stryker artifacts for reviewer download.

### 6.3 Windsurf Workflows

| Workflow | File | Purpose | Steps |
| --- | --- | --- | --- |
| `/test-stack` | `.windsurf/workflows/test-stack.md` | Run lint, unit, BDD, merge locally | lint → unit → BDD (instrumented) → merge → open coverage report |
| `/mutation-scan` | `.windsurf/workflows/mutation-scan.md` | Execute Stryker focused run | unit precheck → `npx stryker run` → summarize surviving mutants |
| `/bdd-fix` | `.windsurf/workflows/bdd-fix.md` | Triage failing feature + regenerate step stubs | select feature → run `playwright test --grep <tag>` → open logs → optional `npx playwright codegen` |

Authoring plan:

1. Add `.windsurf/workflows/test-stack.md` (install deps, lint, unit, `INSTRUMENT_CODE=1 npm run test:e2e`, merge, open report).
2. Add `.windsurf/workflows/mutation-scan.md` (`npm run test:unit`, `npx stryker run`, point to `reports/mutation`).
3. Add `.windsurf/workflows/bdd-fix.md` (prompt for tag, run Playwright BDD config with `--grep`, `npx playwright show-report`, optional `codegen`).
4. Update `/seee-rules-testing` to reference new workflows.

## 7. Rollout Checklist (Tier Aligned)

### 7.1 Tier 0 – Specification IDs

- [x] Refactor `docs/SPECIFICATION.md` with unique requirement IDs (gate for all downstream items).

### 7.2 Tier 1 – Numerical Coverage

- [x] Configure coverage instrumentation in Jest + Next.js.
- [x] Implement coverage merge scripts and ensure CI uploads reports.

### 7.3 Tier 2 – Functional Coverage (BDD)

- [x] Add `playwright-bdd` config, fixtures, and shared steps.
- [x] Document Gherkin authoring standards in the contributor guide.
- [x] Convert first high-value flow to `.feature` (Auth/Login).
- [x] Make BDD runner green in CI-style run (`npm run test:bdd`).
- [x] Convert high-value flows (Dashboard, Members, Member Issues) to `.feature` files.
- [x] Remove legacy `.spec.ts` equivalents once BDD tests pass.
- [x] Enforce `REQ-` tags via lint rule or CI check.

### 7.4 Tier 3 – Mutation Coverage

- [x] Add Stryker config and document manual trigger (`npm run test:mutation`) for on-demand runs (report: `reports/mutation/index.html`).

### 7.5 Tier 4 – Automation & Workflows

- [ ] Land GitHub Actions workflows (`ci-test`, `ci-mutation`, `ci-deploy`) per §6.2.
- [ ] Publish Windsurf workflows (`/test-stack`, `/mutation-scan`, `/bdd-fix`) per §6.3.
- [ ] Create Windsurf workflow to file completed plans (move plan files to docs/completed-plans and update COMPLETED_PHASES.md) and update SPEC / ARCHITECTURE / README to make sure documentation accurately reflects the current state of the app.

## 8. Governance & Open Questions

- Coverage gates: decide minimum acceptable deltas for numerical + mutation scores per PR.
- Data setup: determine if additional BDD step libraries (e.g., MSW fixtures) are required before extending scenarios to non-admin roles.
- Workflow ownership: assign maintainers for CI YAML and Windsurf workflows to keep them in sync with tooling changes.
