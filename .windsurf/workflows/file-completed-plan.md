---
description: Archive completed plan and update documentation
---

# File Completed Plan Workflow

This workflow archives a completed implementation plan and updates project documentation to reflect the current state.

## Prerequisites

- A completed implementation plan file (e.g., `plan.md`, `docs/*.md`)
- Changes have been tested and merged

## Steps

1. **Identify the completed plan file**:
   - Typical locations: `plan.md`, `docs/*.md`, `IMPLEMENTATION_PLAN.md`
   - Confirm all tasks in the plan are completed

2. **Create archive filename**:
   - Format: `{plan-name}-completed-{YYYY-MM-DD}.md`
   - Example: `testing-tiered-coverage-bdd-mutation-2025-12-21.md`

3. **Move plan to archive**:
   ```bash
   mv {plan-file} docs/completed-plans/{archive-filename}
   ```

4. **Update COMPLETED_PHASES.md**:
   - Add entry with:
     - Phase name and date
     - Brief summary of what was accomplished
     - Link to archived plan file
     - Key deliverables

5. **Update SPECIFICATION.md**:
   - Review requirements that were implemented
   - Mark requirements as implemented
   - Add any new requirements discovered during implementation
   - Update requirement status/notes

6. **Update ARCHITECTURE.md**:
   - Document new architectural patterns introduced
   - Update component diagrams if structure changed
   - Add new layers, services, or integrations
   - Update data flow diagrams

7. **Update README.md**:
   - Update feature list if new features added
   - Update setup instructions if new dependencies added
   - Update testing instructions if test commands changed
   - Update deployment instructions if process changed

8. **Verify documentation accuracy**:
   - Read through updated docs as if you're a new developer
   - Ensure all links work
   - Ensure all commands are current
   - Ensure architecture matches implementation

9. **Commit documentation updates**:
   ```bash
   git add docs/completed-plans/ docs/COMPLETED_PHASES.md docs/SPECIFICATION.md docs/ARCHITECTURE.md README.md
   git commit -m "docs: archive completed plan and update documentation"
   ```

## Checklist

- [ ] Plan file moved to `docs/completed-plans/`
- [ ] Entry added to `COMPLETED_PHASES.md`
- [ ] `SPECIFICATION.md` updated with implementation status
- [ ] `ARCHITECTURE.md` updated with new patterns/components
- [ ] `README.md` updated with new features/instructions
- [ ] All documentation links verified
- [ ] Changes committed to git

## Example COMPLETED_PHASES.md Entry

```markdown
### Phase: Tiered Testing Coverage (December 21, 2025)

**Plan**: [testing-tiered-coverage-bdd-mutation-2025-12-21.md](./completed-plans/testing-tiered-coverage-bdd-mutation-2025-12-21.md)

**Summary**: Implemented comprehensive testing strategy with four tiers:
1. Numerical coverage (Jest + instrumented Playwright)
2. Functional coverage (BDD with Gherkin)
3. Mutation testing (Stryker)
4. Automation & reporting (GitHub Actions + Windsurf workflows)

**Key Deliverables**:
- Coverage instrumentation and merge scripts
- BDD test suite with `playwright-bdd`
- Mutation testing configuration
- CI/CD workflows for automated testing
- Windsurf workflows for local testing
```
