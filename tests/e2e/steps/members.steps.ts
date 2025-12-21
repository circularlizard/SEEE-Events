import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { Then } = createBdd()

Then('the members list should render appropriately for this viewport', async ({ page }) => {
  // Ensure the page is stable
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Page header
  await expect(page.getByTestId('members-title')).toBeVisible()

  // Empty state
  const noMembersLoaded = page.getByRole('heading', { name: /No members loaded/i })
  if (await noMembersLoaded.isVisible().catch(() => false)) {
    await expect(noMembersLoaded).toBeVisible()
    return
  }

  // Desktop: table view
  const tableVisible = await page.locator('table').isVisible().catch(() => false)
  if (tableVisible) {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible()
    return
  }

  // Mobile: card list view (table hidden)
  const tableHidden = await page.locator('table').isHidden().catch(() => true)
  const hasCards = await page.locator('div.bg-card').first().isVisible().catch(() => false)

  expect(tableHidden).toBeTruthy()
  expect(hasCards).toBeTruthy()
})
