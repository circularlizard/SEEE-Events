import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { When, Then } = createBdd()

When('I open the first event from the events list', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  const hasEmptyState = await page.getByText(/No events found/i).isVisible().catch(() => false)
  if (hasEmptyState) {
    throw new Error('No events available to open for event detail scenario')
  }

  // Prefer table link on desktop; otherwise fall back to mobile card link.
  // Exclude the attendance route, which also lives under /dashboard/events/.
  const tableEventLink = page
    .locator('table tbody a[href^="/dashboard/events/"]:not([href$="/attendance"])')
    .first()
  
  // Mobile: look for any link to event detail (not attendance)
  const mobileEventLink = page
    .locator('a[href^="/dashboard/events/"]:not([href$="/attendance"]):not([href*="/attendance/"])')
    .first()

  if (await tableEventLink.isVisible().catch(() => false)) {
    await tableEventLink.click()
  } else if (await mobileEventLink.isVisible().catch(() => false)) {
    await mobileEventLink.click()
  } else {
    throw new Error('No event links found in table or mobile view')
  }

  await page.waitForLoadState('networkidle')
  // Look for event detail title by test ID or heading with "Back to Events" nearby
  const titleById = page.getByTestId('event-detail-title')
  const titleByHeading = page.locator('main h1').first()
  
  if (await titleById.isVisible().catch(() => false)) {
    await expect(titleById).toBeVisible()
  } else {
    await expect(titleByHeading).toBeVisible({ timeout: 10000 })
  }
})

Then('the event detail page should load', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  // Look for event detail title by test ID or heading
  const titleById = page.getByTestId('event-detail-title')
  const titleByHeading = page.locator('main h1').first()
  
  if (await titleById.isVisible().catch(() => false)) {
    await expect(titleById).toBeVisible()
  } else {
    await expect(titleByHeading).toBeVisible({ timeout: 10000 })
  }
})

Then('the event participants should render appropriately for this viewport', async ({ page }) => {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)

  // Desktop: participants table visible
  const tableVisible = await page.locator('table').isVisible().catch(() => false)
  if (tableVisible) {
    await expect(page.locator('table')).toBeVisible()
    await expect(page.getByRole('columnheader', { name: /Name/i })).toBeVisible()
    return
  }

  // Mobile: participant cards visible (table hidden)
  const tableHidden = await page.locator('table').isHidden().catch(() => true)
  const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false)

  expect(tableHidden).toBeTruthy()
  expect(hasCards).toBeTruthy()
})
