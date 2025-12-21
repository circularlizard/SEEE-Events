import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { Then } = createBdd()

Then('the events list should render appropriately for this viewport', async ({ page }) => {
  // Give the page time to load data
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const hasEmptyState = await page.getByText(/No events found/i).isVisible().catch(() => false)
  if (hasEmptyState) {
    await expect(page.getByText(/No events found/i)).toBeVisible()
    return
  }

  // Desktop: table visible
  const tableVisible = await page.locator('table').isVisible().catch(() => false)
  if (tableVisible) {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Event Name/i })).toBeVisible()
    return
  }

  // Mobile: card layout visible (table hidden)
  const tableHidden = await page.locator('table').isHidden().catch(() => true)
  const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false)

  expect(tableHidden).toBeTruthy()
  expect(hasCards).toBeTruthy()
})
