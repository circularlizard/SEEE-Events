import { test, expect, Page } from '@playwright/test'

/**
 * E2E Smoke Tests: Console Error Detection
 * 
 * These tests visit each page and check for React/JavaScript console errors.
 * Uses mock authentication and MSW mock API data.
 * 
 * Catches runtime errors like:
 * - "Cannot update a component while rendering a different component"
 * - "Hydration mismatch"
 * - Unhandled promise rejections
 * - React hook violations
 */

// Pages that require authentication
const PROTECTED_PAGES = [
  '/dashboard',
  '/dashboard/events',
  '/dashboard/people/attendance',
  '/dashboard/admin',
  '/dashboard/api-browser',
  '/dashboard/debug/oauth',
  '/dashboard/debug/queue',
]

// Error patterns to ignore (expected/benign errors)
const IGNORED_PATTERNS = [
  /Download the React DevTools/i,
  /React DevTools/i,
  /Failed to load resource.*favicon/i,
  /net::ERR_/i, // Network errors during test teardown
]

/**
 * Helper to collect console errors during page navigation
 */
async function collectConsoleErrors(page: Page, url: string): Promise<string[]> {
  const errors: string[] = []
  
  // Listen for console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      const text = msg.text()
      // Filter out ignored patterns
      const isIgnored = IGNORED_PATTERNS.some((pattern) => pattern.test(text))
      if (!isIgnored) {
        errors.push(text)
      }
    }
  })
  
  // Listen for page errors (uncaught exceptions)
  page.on('pageerror', (error) => {
    errors.push(`PageError: ${error.message}`)
  })
  
  // Navigate and wait for page to stabilize
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  
  // Give React time to render and trigger any effects
  await page.waitForTimeout(1000)
  
  return errors
}

/**
 * Helper to authenticate with mock login
 */
async function mockLogin(page: Page): Promise<boolean> {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
  const isVisible = await mockLoginButton.isVisible().catch(() => false)
  
  if (isVisible) {
    await mockLoginButton.click()
    await page.waitForURL('/dashboard', { timeout: 10000 })
    return true
  }
  
  return false
}

test.describe('Console Error Detection', () => {
  test('login page renders without console errors', async ({ page }) => {
    const errors = await collectConsoleErrors(page, '/')
    
    expect(errors, `Console errors on /:\n${errors.join('\n')}`).toHaveLength(0)
  })

  test('protected pages render without console errors after mock login', async ({ page }) => {
    test.setTimeout(60000) // 60s timeout for visiting multiple pages
    // Authenticate first
    const loggedIn = await mockLogin(page)
    
    if (!loggedIn) {
      test.skip()
      return
    }
    
    // Test each protected page
    const allErrors: { page: string; errors: string[] }[] = []
    
    for (const url of PROTECTED_PAGES) {
      const errors = await collectConsoleErrors(page, url)
      
      if (errors.length > 0) {
        allErrors.push({ page: url, errors })
      }
    }
    
    // Report all errors at once for better debugging
    const report = allErrors
      .map(({ page, errors }) => `\n${page}:\n  - ${errors.join('\n  - ')}`)
      .join('\n')
    
    expect(allErrors, `Console errors detected:${report}`).toHaveLength(0)
  })

  test('event detail page renders without console errors', async ({ page }) => {
    const loggedIn = await mockLogin(page)
    
    if (!loggedIn) {
      test.skip()
      return
    }
    
    // Navigate to events list first
    await page.goto('/dashboard/events')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1000)
    
    // Try to click on the first event link
    const eventLink = page.locator('a[href^="/dashboard/events/"]').first()
    const hasEventLink = await eventLink.isVisible().catch(() => false)
    
    if (hasEventLink) {
      // Collect errors while navigating to event detail
      const errors: string[] = []
      
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          const text = msg.text()
          const isIgnored = IGNORED_PATTERNS.some((pattern) => pattern.test(text))
          if (!isIgnored) {
            errors.push(text)
          }
        }
      })
      
      await eventLink.click()
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
      
      expect(errors, `Console errors on event detail:\n${errors.join('\n')}`).toHaveLength(0)
    }
  })
})

test.describe('React-Specific Error Detection', () => {
  test.beforeEach(async ({ page }) => {
    await mockLogin(page)
  })

  test('no "Cannot update component while rendering" errors', async ({ page }) => {
    const renderErrors: string[] = []
    
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('Cannot update a component')) {
        renderErrors.push(msg.text())
      }
    })
    
    // Visit pages that commonly trigger this error
    for (const url of ['/dashboard/events', '/dashboard/people/attendance']) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(1000)
    }
    
    expect(renderErrors, `setState-during-render errors:\n${renderErrors.join('\n')}`).toHaveLength(0)
  })

  test('no hydration mismatch errors', async ({ page }) => {
    const hydrationErrors: string[] = []
    
    page.on('console', (msg) => {
      const text = msg.text()
      if (msg.type() === 'error' && (text.includes('Hydration') || text.includes('hydration'))) {
        hydrationErrors.push(text)
      }
    })
    
    // Visit pages
    for (const url of PROTECTED_PAGES.slice(0, 3)) {
      await page.goto(url)
      await page.waitForLoadState('networkidle')
      await page.waitForTimeout(500)
    }
    
    expect(hydrationErrors, `Hydration errors:\n${hydrationErrors.join('\n')}`).toHaveLength(0)
  })
})
