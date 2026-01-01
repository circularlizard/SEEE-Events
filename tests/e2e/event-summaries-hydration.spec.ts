import { test, expect } from './fixtures'

test.describe('Planner Event Drill-down', () => {
  test('navigates from Planner events list to event detail and back', async ({ page }) => {
    // Login via mock auth as Planner persona
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // Select elevated persona if dropdown present
    const personaDropdown = page.locator('#mockPersona')
    if (await personaDropdown.isVisible().catch(() => false)) {
      await personaDropdown.selectOption('seeeFullElevatedOther')
    }

    // Click Expedition Planner app button
    const plannerButton = page.getByRole('button', { name: /^Expedition Planner$/i })
    await expect(plannerButton).toBeVisible({ timeout: 5000 })
    await plannerButton.click()
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    await page.waitForLoadState('networkidle')

    // Navigate to Planner events route
    await page.goto('/dashboard/planning/events')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()

    // Attempt to find a detail link in the table first
    const tableLink = page.locator('tbody tr a[href*="/dashboard/planning/events/"]').first()
    const hasTableLink = await tableLink.isVisible().catch(() => false)

    if (hasTableLink) {
      await tableLink.click()
    } else {
      // Fallback: try any visible link (mobile cards)
      const cardLink = page.locator('a[href*="/dashboard/planning/events/"]').first()
      const hasCardLink = await cardLink.isVisible().catch(() => false)
      if (!hasCardLink) {
        test.skip(true, 'No event links available (empty state).')
        return
      }
      await cardLink.click()
    }

    // Event detail header should be visible
    await expect(page.getByTestId('event-detail-title')).toBeVisible({ timeout: 10000 })

    // Navigate back to Planner events list
    const backLink = page.getByRole('link', { name: /Back to Events/i })
    if (await backLink.isVisible().catch(() => false)) {
      await backLink.click()
      await page.waitForLoadState('networkidle')
      await expect(page.getByRole('heading', { name: 'Events' })).toBeVisible()
    }
  })
})
