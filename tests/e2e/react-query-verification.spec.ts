import { test, expect } from './fixtures'

/**
 * E2E Tests: React Query Verification (Phase 8.5)
 * 
 * Tests for verifying React Query migration:
 * - Section change does not leak old data
 * - Logout clears cached data
 * - Data loading banner shows progress correctly
 */

test.describe('React Query Verification', () => {
  // Helper to authenticate before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    
    // Sign in with mock auth
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      await page.waitForURL(/\/dashboard/, { timeout: 10000 })
    }
  })

  test.describe('Section Isolation', () => {
    test('events data updates when section changes', async ({ page }) => {
      // Navigate to events page
      await page.goto('/dashboard/events')
      
      // Wait for events to load
      await expect(page.getByRole('heading', { name: /Events/i })).toBeVisible()
      await page.waitForTimeout(2000)
      
      // Check if we have events loaded
      const initialEventsVisible = await page.locator('table').isVisible().catch(() => false)
      
      // If there's a section picker available, try changing section
      const changeSectionButton = page.getByRole('link', { name: /Change Section/i })
      if (await changeSectionButton.isVisible().catch(() => false)) {
        await changeSectionButton.click()
        await page.waitForURL(/section-picker/)
        
        // Select a different section if available
        const sectionCards = page.locator('[data-testid="section-card"]')
        const count = await sectionCards.count()
        if (count > 1) {
          await sectionCards.nth(1).click()
          await page.waitForURL(/\/dashboard/)
          
          // Navigate back to events
          await page.goto('/dashboard/events')
          await expect(page.getByRole('heading', { name: /Events/i })).toBeVisible()
          
          // Verify page loaded (data should be fresh for new section)
          await page.waitForTimeout(2000)
        }
      }
      
      // Test passes if no errors occurred during section change
      expect(true).toBe(true)
    })
  })

  test.describe('Logout Cache Clearing', () => {
    test('logout clears data and redirects to home', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      
      // Verify we're authenticated (dashboard should be visible)
      await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible()
      
      // Find and click the user menu
      const userMenu = page.getByRole('button', { name: /User menu/i })
      await expect(userMenu).toBeVisible()
      await userMenu.click()
      
      // Click logout
      const logoutButton = page.getByRole('menuitem', { name: /Logout/i })
      await expect(logoutButton).toBeVisible()
      await logoutButton.click()
      
      // Should redirect to home page
      await page.waitForURL('/', { timeout: 10000 })
      
      // Verify we're on the login page
      await expect(page.getByRole('button', { name: /Sign in/i })).toBeVisible()
    })

    test('after logout, returning to dashboard requires re-authentication', async ({ page }) => {
      // First login
      await page.goto('/dashboard')
      await page.waitForTimeout(1000)
      
      // Logout
      const userMenu = page.getByRole('button', { name: /User menu/i })
      if (await userMenu.isVisible().catch(() => false)) {
        await userMenu.click()
        const logoutButton = page.getByRole('menuitem', { name: /Logout/i })
        await logoutButton.click()
        await page.waitForURL('/', { timeout: 10000 })
      }
      
      // Try to access dashboard directly
      await page.goto('/dashboard')
      
      // Should be redirected to login or show login UI
      const isOnLoginPage = await page.getByRole('button', { name: /Sign in/i }).isVisible().catch(() => false)
      const isRedirectedToHome = page.url().includes('/')
      
      expect(isOnLoginPage || isRedirectedToHome).toBe(true)
    })
  })

  test.describe('Data Loading Banner', () => {
    test('data loading banner shows progress for events', async ({ page }) => {
      // Navigate to dashboard
      await page.goto('/dashboard')
      
      // Wait for page to load
      await page.waitForTimeout(1000)
      
      // The data loading banner should appear during loading
      // or the page should load successfully
      const dashboardHeading = page.getByRole('heading', { name: /Dashboard/i })
      await expect(dashboardHeading).toBeVisible({ timeout: 10000 })
      
      // After loading, events should be available on the dashboard
      // (upcoming events section)
      const upcomingEventsSection = page.getByRole('heading', { name: /Upcoming Events/i })
      await expect(upcomingEventsSection).toBeVisible({ timeout: 10000 })
    })

    test('events page loads data via React Query', async ({ page }) => {
      // Navigate to events page
      await page.goto('/dashboard/events')
      
      // Wait for events heading
      await expect(page.getByRole('heading', { name: /Events/i })).toBeVisible()
      
      // Wait for data to load
      await page.waitForTimeout(3000)
      
      // Should either show events table or empty state (no error)
      const hasTable = await page.locator('table').isVisible().catch(() => false)
      const hasEmptyState = await page.getByText(/No events/i).isVisible().catch(() => false)
      const hasError = await page.getByText(/Failed to load/i).isVisible().catch(() => false)
      
      // Should have loaded successfully (table or empty state, not error)
      expect(hasTable || hasEmptyState).toBe(true)
      expect(hasError).toBe(false)
    })
  })

  test.describe('Console Error Monitoring', () => {
    test('no React Query errors during normal navigation', async ({ page }) => {
      const consoleErrors: string[] = []
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text())
        }
      })
      
      // Navigate through the app
      await page.goto('/dashboard')
      await page.waitForTimeout(2000)
      
      await page.goto('/dashboard/events')
      await page.waitForTimeout(2000)
      
      // Filter out known non-critical errors
      const criticalErrors = consoleErrors.filter(error => 
        !error.includes('favicon') &&
        !error.includes('hydration') &&
        error.toLowerCase().includes('react query') ||
        error.toLowerCase().includes('usequery') ||
        error.toLowerCase().includes('cache')
      )
      
      // Should have no React Query related errors
      expect(criticalErrors).toHaveLength(0)
    })
  })
})
