# Gherkin Authoring Guide for SEEE Dashboard

## Overview

This guide defines standards for writing Gherkin feature files for the SEEE Expedition Dashboard. All new features and converted tests must follow these conventions.

## File Organization

```
tests/e2e/
├── features/
│   ├── auth/           # Authentication flows (REQ-AUTH-*)
│   ├── dashboard/      # Dashboard & events (REQ-EVENTS-*, REQ-LOGISTICS-*)
│   └── members/        # Member management (REQ-ADMIN-*, REQ-SUMMARY-*)
├── steps/
│   ├── shared.steps.ts     # Common steps (auth, navigation, assertions)
│   ├── dashboard.steps.ts  # Dashboard-specific steps
│   └── members.steps.ts    # Member-specific steps
└── support/
    ├── fixtures.ts     # Coverage collection fixtures
    └── selectors.ts    # Reusable selectors
```

## Feature File Structure

### Header

Every feature file must include:
1. **Requirement tags** from `docs/SPECIFICATION.md` (e.g., `@REQ-AUTH-01`)
2. **Feature declaration** with business objective
3. **Background** (optional) for common setup

```gherkin
@REQ-AUTH-01 @REQ-AUTH-02
Feature: Authentication and Login Flow
  As a user of the SEEE Dashboard
  I need to authenticate using OSM OAuth
  So that I can access the dashboard with appropriate permissions

  Background:
    Given I am on the login page
```

### Scenarios

Each scenario must:
1. Have a descriptive title referencing the requirement
2. Include relevant `@REQ-*` tags
3. Follow Given-When-Then structure
4. Use consistent language from shared steps

```gherkin
@REQ-AUTH-03
Scenario: User selects Administrator role and logs in
  When I click "Administrator"
  And I click the button "Sign in with OSM"
  Then I should be on "/dashboard"
```

## Requirement Tagging

### Feature-level Tags

Apply all relevant requirement IDs at the feature level:

```gherkin
@REQ-EVENTS-01 @REQ-EVENTS-02 @REQ-EVENTS-03
Feature: Event Dashboard
```

### Scenario-level Tags

Tag each scenario with its specific requirement(s):

```gherkin
@REQ-EVENTS-02
Scenario: Admin views upcoming events list
```

### Tag Format

- Use exact IDs from `docs/SPECIFICATION.md`
- Format: `@REQ-<DOMAIN>-<NN>`
- Domains: AUTH, EVENTS, LOGISTICS, TRAINING, SUMMARY, REPORTING, ADMIN, DATA, ARCH, ACCESS, NFR

## Step Definition Guidelines

### Shared Steps (tests/e2e/steps/shared.steps.ts)

Use these for common actions:

**Authentication:**
- `Given I am logged in as an admin`
- `Given I am logged in as a standard viewer`
- `Given I am on the login page`

**Section Selection:**
- `Given I have selected the "Borestane" section`

**Navigation:**
- `When I navigate to "/dashboard/events"`
- `When I click "Events"`
- `When I click the button "Sign in with OSM"`

**Assertions:**
- `Then I should see "Events List"`
- `Then I should be on "/dashboard"`
- `Then I should not see "Admin Panel"`

### Domain-Specific Steps

Create domain-specific step files for specialized actions:

**Dashboard steps (dashboard.steps.ts):**
```gherkin
When I open the event "Bronze Practice 2025"
Then I should see 15 participants
```

**Member steps (members.steps.ts):**
```gherkin
When I open the "Member data issues" page
Then I should see the "Missing Photo Consent" accordion section
```

## Writing Style

### Use Natural Language

✅ Good:
```gherkin
Given I am logged in as an admin
When I open the "Member data issues" page
Then I should see the "Missing Photo Consent" accordion section
```

❌ Bad:
```gherkin
Given user.login(role='admin')
When page.goto('/dashboard/members/issues')
Then assert element.visible('.accordion-section')
```

### Be Declarative, Not Imperative

✅ Good:
```gherkin
When I view the event details for "Bronze Practice 2025"
Then I should see participant attendance status
```

❌ Bad:
```gherkin
When I click the event row
And I wait for the page to load
And I scroll to the participants section
Then I should see the attendance column
```

### Avoid Technical Implementation Details

✅ Good:
```gherkin
Given I have selected the "Borestane" section
```

❌ Bad:
```gherkin
Given the localStorage contains {"currentSection": "12345"}
```

## Background Usage

Use `Background` for setup common to all scenarios in a feature:

```gherkin
Feature: Event Dashboard

  Background:
    Given I am logged in as an admin
    And I have selected the "Borestane" section

  Scenario: View events list
    When I navigate to "/dashboard/events"
    Then I should see "Upcoming Events"
```

## Data Tables

Use tables for structured data:

```gherkin
Scenario: Multiple members have missing data
  Given the following members exist:
    | Name       | Issue                  |
    | Scout A    | Missing Photo Consent  |
    | Scout B    | Missing Doctor Info    |
  When I open the "Member data issues" page
  Then I should see 2 issues
```

## Scenario Outlines

Use for testing multiple variations:

```gherkin
Scenario Outline: Different roles see appropriate content
  Given I am logged in as a <role>
  When I navigate to "/dashboard/admin"
  Then I should <visibility> "Admin Panel"

  Examples:
    | role            | visibility |
    | admin           | see        |
    | standard viewer | not see    |
```

## Migration Strategy

### Converting Existing Tests

1. **Identify the requirement** from `docs/SPECIFICATION.md`
2. **Extract the business scenario** from test descriptions
3. **Map test steps** to shared or new step definitions
4. **Add requirement tags** to feature and scenarios
5. **Verify** the feature runs with `npm run test:bdd`

### Example Conversion

**Before (login-flow.spec.ts):**
```typescript
test('unauthenticated user accessing /dashboard is redirected to sign-in', async ({ page }) => {
  await page.goto('/dashboard')
  await expect(page).toHaveURL('/')
  await expect(page.locator('text=Sign in with OSM')).toBeVisible()
})
```

**After (login.feature):**
```gherkin
@REQ-AUTH-02
Scenario: Unauthenticated user is redirected to login
  When I navigate to "/dashboard"
  Then I should be on "/"
  And I should see "Sign in with OSM"
```

## Running BDD Tests

```bash
# Run all BDD tests
npm run test:bdd

# Run specific feature
npm run test:bdd -- --grep @REQ-AUTH-01

# Run with coverage
npm run test:bdd:coverage
```

## Best Practices

1. **One feature per file** - Keep features focused
2. **Reuse shared steps** - Don't duplicate step definitions
3. **Tag everything** - Every scenario needs `@REQ-*` tags
4. **Keep scenarios independent** - No dependencies between scenarios
5. **Use meaningful names** - Scenario titles should be self-explanatory
6. **Avoid UI details** - Focus on user intent, not implementation
7. **Test business value** - Each scenario should verify a requirement

## Anti-Patterns to Avoid

❌ **Over-specification:**
```gherkin
When I click the button with class "btn-primary" at coordinates (100, 200)
```

❌ **Testing implementation:**
```gherkin
Then the React Query cache should contain event data
```

❌ **Missing requirement tags:**
```gherkin
Scenario: Some test without tags
```

❌ **Mixing abstraction levels:**
```gherkin
Given I am logged in
When I click xpath://button[@id='submit']
```

## Resources

- Specification: `docs/SPECIFICATION.md` (requirement IDs)
- Testing Plan: `docs/seee-testing-plan.md`
- Shared Steps: `tests/e2e/steps/shared.steps.ts`
- playwright-bdd docs: https://vitalets.github.io/playwright-bdd/
