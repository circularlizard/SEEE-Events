---
description: Triage and fix failing BDD scenarios
---

# BDD Fix Workflow

This workflow helps debug and fix failing Gherkin feature scenarios.

## Prerequisites

- Node dependencies installed (`npm install`)
- Playwright browsers installed (`npx playwright install`)
- Redis running locally (via `docker-compose up -d redis`)

## Steps

1. **Identify the failing scenario**:
   - Check test output for the failing feature file and scenario name
   - Note the `@REQ-*` tag if present

// turbo
2. **Run the specific feature or scenario**:
   ```bash
   npm run test:bdd -- --grep "@REQ-AUTH-01"
   ```
   
   Or run a specific feature file:
   ```bash
   npm run test:bdd -- tests/e2e/features/auth/login.feature
   ```

// turbo
3. **View the test report**:
   ```bash
   npx playwright show-report
   ```

4. **Analyze the failure**:
   - Check screenshots in `test-results/`
   - Review trace files for step-by-step execution
   - Verify selectors in `tests/e2e/support/selectors.ts`
   - Check step definitions in `tests/e2e/steps/*.steps.ts`

5. **Fix the issue**:
   - Update step definitions if steps are missing or incorrect
   - Update selectors if UI elements changed
   - Update feature file if scenario is incorrect
   - Update application code if behavior is wrong

6. **Re-run the test**:
   ```bash
   npm run test:bdd -- --grep "@REQ-AUTH-01"
   ```

7. **Optional: Use Playwright codegen for new selectors**:
   ```bash
   npx playwright codegen http://localhost:3000
   ```
   
   This opens a browser with the Playwright inspector to help identify selectors.

## Common Issues

- **Selector not found**: UI changed, update `tests/e2e/support/selectors.ts`
- **Step definition missing**: Add step in appropriate `tests/e2e/steps/*.steps.ts` file
- **Timing issue**: Add explicit waits in step definition
- **Auth state**: Verify `Background` steps run correctly for auth setup

## Troubleshooting

- If tests hang, check for missing `await` in step definitions
- If auth fails, verify `NEXTAUTH_SECRET` and `NEXTAUTH_URL` are set
- If Redis errors occur, ensure Redis is running on port 6379
