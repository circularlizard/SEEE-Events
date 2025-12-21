---
description: Run mutation testing to find test gaps
---

# Mutation Scan Workflow

This workflow executes Stryker mutation testing to identify surviving mutants and test coverage gaps.

## Prerequisites

- Redis running locally (via `docker-compose up -d redis`)
- Node dependencies installed (`npm install`)
- Unit tests passing

## Steps

// turbo
1. **Start Redis** (if not already running):
   ```bash
   docker-compose up -d redis
   ```

// turbo
2. **Run unit tests as pre-check**:
   ```bash
   npm run test:unit
   ```

3. **Run mutation testing**:
   ```bash
   npm run test:mutation
   ```
   
   Note: This can take 10-30 minutes depending on the number of mutants generated.

// turbo
4. **Open mutation report**:
   ```bash
   open reports/mutation/index.html
   ```

## Expected Output

- Unit tests pass before mutation testing begins
- Stryker generates mutants for files in `src/lib/**/*.ts` and `src/utils/**/*.ts`
- Mutation report shows:
  - **Killed mutants**: Tests caught the mutation (good)
  - **Survived mutants**: Tests did not catch the mutation (test gap)
  - **Timeout mutants**: Mutation caused infinite loop
  - **No coverage mutants**: No tests execute this code

## Interpreting Results

- **Target mutation score**: ≥80%
- **Surviving mutants**: Review each one to determine if:
  - A test is missing
  - The mutation is equivalent (no behavior change)
  - The code is unreachable/dead

## Troubleshooting

- If Stryker hangs, check for infinite loops in mutated code
- If mutation score is unexpectedly low, verify unit test coverage first
- If Redis errors occur, ensure Redis is running and accessible
