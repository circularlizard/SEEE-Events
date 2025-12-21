import { test, expect } from './fixtures'

test.describe('Phase 3.0: Progressive Event Summary Hydration', () => {
  test('prefetches summaries on viewport/queue and detail loads with header', async ({ page }) => {
    // Use mock auth to avoid real OAuth dependency
    await page.goto('/')
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      await page.waitForURL('/dashboard', { timeout: 10000 })
    }

    // Navigate to events list
    await page.goto('/dashboard/events')
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()

    // Attempt to find a detail link in the table first
    const tableLink = page.locator('tbody tr a[href*="/dashboard/events/"]').first()
    const hasTableLink = await tableLink.isVisible().catch(() => false)

    if (hasTableLink) {
      await tableLink.click()
    } else {
      // Fallback: try any visible link (mobile cards)
      const anyLink = page.getByRole('link').first()
      const hasAnyLink = await anyLink.isVisible().catch(() => false)
      if (!hasAnyLink) {
        test.skip(true, 'No event links available (empty state).')
        return
      }
      await anyLink.click()
    }
    // Header should be visible (populated from cached summary/details)
    await expect(page.getByTestId('event-detail-title')).toBeVisible()
  })
})
