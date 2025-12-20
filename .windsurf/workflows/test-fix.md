---
description: Run tests and automatically fix common code quality issues
---

# Test and Fix Workflow

This workflow runs tests and automatically fixes common code quality issues. It's designed to be run before committing, merging, or deploying to ensure code quality.

## Prerequisites

- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Steps

1. **Run Tests**
   ```bash
   npm test
   ```
   // turbo

2. **Type Checking**
   ```bash
   npx tsc --noEmit
   ```
   // turbo

3. **Lint and Auto-fix**
   ```bash
   npx eslint . --ext .js,.jsx,.ts,.tsx --fix
   ```
   // turbo

4. **Format Code**
   ```bash
   npx prettier --write "**/*.{js,jsx,ts,tsx,json,css,scss,md}"
   ```
   // turbo

5. **Check for Uncommitted Changes**
   ```bash
   git status --porcelain
   ```
   // turbo

## Usage

Run this workflow before committing code, creating pull requests, or deploying to ensure:
- All tests pass
- Type checking succeeds
- Code follows the project's style guide
- Code is properly formatted

## Notes

- This workflow makes changes to your files. Review the changes before committing.
- Some errors might require manual intervention if they can't be automatically fixed.
- The workflow will stop if any test fails or if there are TypeScript errors that need to be fixed manually.