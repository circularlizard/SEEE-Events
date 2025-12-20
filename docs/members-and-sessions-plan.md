# SEEE Testing Implementation Plan

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

1. Install dependencies: `npm i -D playwright-bdd swc-plugin-coverage-instrument cross-env nyc`.
2. Update `next.config.mjs`:
   ```ts
   experimental: {
     swcPlugins: process.env.INSTRUMENT_CODE
       ? [['swc-plugin-coverage-instrument', {}]]
       : [],
   },
   ```
3. Create `tests/e2e/fixtures.ts` extending Playwright’s `test` to capture `window.__coverage__` (per strategy doc).
4. Run instrumented suite via `cross-env INSTRUMENT_CODE=1 playwright test -c playwright.bdd.config.ts`.

### 3.3 Coverage merge

Scripts to add:
```json
"scripts": {
  "test:unit": "jest",
  "test:e2e": "cross-env INSTRUMENT_CODE=1 playwright test",
  "pretest:merge": "mkdir -p coverage/merged",
  "test:merge": "nyc merge coverage coverage/merged/coverage.json",
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

## 6. CI / Reporting Pipeline

1. **CI stages**:
   - `test:unit`
   - `test:e2e` (BDD)
   - `test:merge`
   - `stryker` (cron or nightly)
2. Upload artifacts:
   - `coverage/unit`, `coverage/e2e`, `coverage/total`
   - Stryker HTML report
3. Governance dashboard: track trends for numerical %, functional scenario counts, mutation score.

## 7. Rollout Checklist

- [ ] Configure coverage instrumentation in Jest + Next.js.
- [ ] Add `playwright-bdd` config, fixtures, and shared steps.
- [ ] Convert high-value flows (Dashboard, Members, Member Issues) to `.feature` files.
- [ ] Remove legacy `.spec.ts` equivalents once BDD tests pass.
- [ ] Implement coverage merge scripts and ensure CI uploads reports.
- [ ] Add Stryker config + nightly mutation job.
- [ ] Document Gherkin authoring standards in the contributor guide.
- [ ] Enforce `REQ-` tags via lint rule or CI check.

## 8. Open Questions

- Should we gate PR merges on minimum coverage deltas (numerical + mutation)?
- Do we need additional BDD step libraries for data setup (e.g., MSW fixtures) before rolling to non-admin roles?

## 9. CI Workflows (GitHub Actions)

### 9.1 Goals

- Guarantee every PR/build runs the full layered test suite before publishing.
- Surface coverage + mutation artifacts directly in GitHub for reviewers.
- Block merges when critical checks (unit, BDD, coverage merge) fail.

### 9.2 Workflow layout

| Workflow | Trigger | Steps | Gates |
| --- | --- | --- | --- |
| `ci-test.yml` | `pull_request`, `workflow_dispatch` | Install deps → Lint → `npm run test:unit` → `npm run test:e2e` (BDD) → `npm run test:merge` | Required |
| `ci-mutation.yml` | `schedule` (nightly) + manual | Install deps → `npm run test:unit` → `npx stryker run` | Optional (reports blockers) |
| `ci-deploy.yml` | `workflow_dispatch`, `release` | Needs `ci-test` success → Build (`npm run build`) → Publish/Deploy | Publish gate |

### 9.3 Implementation steps

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
2. Add `.github/workflows/ci-mutation.yml` to run nightly (cron) + manual dispatch.
3. Update branch protection to require `CI – Tests` + `CI – Mutation`.
4. Add `.github/workflows/ci-deploy.yml` that depends on `CI – Tests` (`needs: ["CI – Tests"]`) and runs `npm run build` + deployment (e.g., Vercel CLI) only when tagged release or manual dispatch is approved.
5. Store Stryker + merged coverage as artifacts for download.

## 10. Windsurf Workflows

### 10.1 Goals

- Provide repeatable IDE automation for running layered tests locally.
- Speed up failure triage (unit vs BDD vs coverage merge).
- Share mutations/coverage commands with the team.

### 10.2 Workflow specs

| Workflow | File | Purpose | Steps |
| --- | --- | --- | --- |
| `/test-stack` | `.windsurf/workflows/test-stack.md` | Run lint, unit, BDD, merge locally | lint → unit → BDD (instrumented) → merge → open coverage report |
| `/mutation-scan` | `.windsurf/workflows/mutation-scan.md` | Execute Stryker focused run | unit precheck → `npx stryker run` → summarize surviving mutants |
| `/bdd-fix` | `.windsurf/workflows/bdd-fix.md` | Triage failing feature + regenerate step stubs | select feature → run `playwright test --grep <tag>` → open logs → optional `npx playwright codegen` |

### 10.3 Plan to author workflows

1. Create `.windsurf/workflows/test-stack.md` with sections:
   - Install deps (optional)
   - `npm run lint`
   - `npm run test:unit`
   - `cross-env INSTRUMENT_CODE=1 npm run test:e2e`
   - `npm run test:merge`
   - Tip: open `coverage/total/index.html`
2. Create `.windsurf/workflows/mutation-scan.md`:
   - `npm run test:unit`
   - `npx stryker run`
   - Note where HTML report lives (`reports/mutation`).
3. Create `.windsurf/workflows/bdd-fix.md`:
   - Prompt to select feature tag (env var)
   - Run `npx playwright test --config playwright.bdd.config.ts --grep @TAG`
   - For failures, run `npx playwright show-report`
   - Optionally call `npx playwright codegen <url>` for repro.
4. Publish `/seee-rules-testing` doc update referencing new workflows.
