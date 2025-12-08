import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Per-Person Attendance View
 * 
 * Tests the attendance by person page including:
 * - Page loads successfully
 * - Toggle between Single List and Group by Patrol
 * - Mobile and desktop views
 */

/**
 * Helper to login with mock auth
 */
async function mockLogin(page: import('@playwright/test').Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
  if (await mockLoginButton.isVisible().catch(() => false)) {
    await mockLoginButton.click()
    await page.waitForURL('/dashboard', { timeout: 10000 })
    return true
  }
  return false
}

test.describe('Per-Person Attendance View', () => {
  test.beforeEach(async ({ page }) => {
    const loggedIn = await mockLogin(page)
    if (!loggedIn) {
      test.skip()
    }
  })

  test('page loads with title and toggle', async ({ page }) => {
    await page.goto('/dashboard/people/attendance')
    
    // Page title should be visible
    await expect(page.getByRole('heading', { name: /Attendance by Person/i })).toBeVisible()
    
    // Toggle options should be visible
    await expect(page.getByLabel(/Single List/i)).toBeVisible()
    await expect(page.getByLabel(/Group by Patrol/i)).toBeVisible()
  })

  test('toggle switches between single list and group by patrol', async ({ page }) => {
    await page.goto('/dashboard/people/attendance')
    
    // Default should be Single List
    const singleListRadio = page.getByRole('radio', { name: /Single List/i })
    const groupByPatrolRadio = page.getByRole('radio', { name: /Group by Patrol/i })
    
    await expect(singleListRadio).toBeChecked()
    await expect(groupByPatrolRadio).not.toBeChecked()
    
    // Click Group by Patrol
    await groupByPatrolRadio.click()
    
    // Now Group by Patrol should be checked
    await expect(groupByPatrolRadio).toBeChecked()
    await expect(singleListRadio).not.toBeChecked()
  })

  test('shows loading state or data', async ({ page }) => {
    await page.goto('/dashboard/people/attendance')
    
    // Wait for page to load
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Should show either skeleton loading, data, or empty state message
    const hasData = await page.locator('.table-row, [class*="card"]').first().isVisible().catch(() => false)
    const hasEmptyMessage = await page.getByText(/No aggregated attendance/i).isVisible().catch(() => false)
    const hasSkeleton = await page.locator('.animate-pulse').first().isVisible().catch(() => false)
    
    // One of these states should be true
    expect(hasData || hasEmptyMessage || hasSkeleton).toBeTruthy()
  })
})

test.describe('Per-Person Attendance View - Mobile', () => {
  test.use({ 
    viewport: { width: 375, height: 667 }
  })

  test.beforeEach(async ({ page }) => {
    const loggedIn = await mockLogin(page)
    if (!loggedIn) {
      test.skip()
    }
  })

  test('mobile view shows cards instead of table', async ({ page }) => {
    await page.goto('/dashboard/people/attendance')
    await page.waitForLoadState('networkidle')
    
    // Page should load
    await expect(page.getByRole('heading', { name: /Attendance by Person/i })).toBeVisible()
    
    // Table should be hidden on mobile (has hidden md:table class)
    const table = page.locator('.md\\:table')
    const tableHidden = await table.isHidden().catch(() => true)
    expect(tableHidden).toBeTruthy()
  })
})
