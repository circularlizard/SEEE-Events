import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { Then } = createBdd()

Then('the member issues page should load', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await expect(page.getByTestId('member-issues-title')).toBeVisible()
})

Then('the member issues summary should render', async ({ page }) => {
  await page.waitForLoadState('networkidle')

  // No members loaded state
  const noMembers = page.getByText(
    /No members loaded\. Please select a section to view member data issues\./i
  )
  if (await noMembers.isVisible().catch(() => false)) {
    await expect(noMembers).toBeVisible()
    return
  }

  // If there are no issues, the UI shows a green success state.
  const noIssues = page.getByRole('heading', { name: /No Issues Found/i })
  if (await noIssues.isVisible().catch(() => false)) {
    await expect(noIssues).toBeVisible()
    return
  }

  // Otherwise the page should render an issues summary paragraph and at least one accordion trigger.
  await expect(page.getByText(/members have data quality issues/i)).toBeVisible()

  const anyAccordionTrigger = page.locator('[data-state] > button').first()
  // Fallback if Radix markup differs
  const anyButton = page.getByRole('button').first()

  if (await anyAccordionTrigger.isVisible().catch(() => false)) {
    await expect(anyAccordionTrigger).toBeVisible()
    return
  }

  await expect(anyButton).toBeVisible()
})
