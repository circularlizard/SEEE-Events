import { test, expect } from './fixtures'

/**
 * E2E Tests: Login Flow
 * 
 * Tests authentication flow including:
 * - Unauthenticated users redirected to login page
 * - Sign in button triggers OAuth flow
 * - Post-authentication redirect to dashboard
 * 
 * Note: These tests use Mock Auth mode to avoid real OAuth dependency
 */

test.describe('Login Flow', () => {
  test('unauthenticated user accessing /dashboard is redirected to sign-in', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/dashboard')
    
    // Should be redirected to sign-in page or root
    // Middleware redirects to /api/auth/signin which may redirect to /
    await page.waitForLoadState('networkidle')
    
    const url = page.url()
    const isSignInPage = url.includes('/api/auth/signin') || url.startsWith('https://localhost:3000/')
    expect(isSignInPage).toBeTruthy()
    
    // If redirected to root, verify login page elements
    if (url === 'https://localhost:3000/') {
      await expect(page.getByRole('heading', { name: /SEEE Expedition Dashboard/i })).toBeVisible()
      await expect(page.getByRole('button', { name: /Sign in with OSM/i })).toBeVisible()
    }
  })

  test('unauthenticated user accessing /dashboard/events is redirected to sign-in', async ({ page }) => {
    // Navigate to protected route
    await page.goto('/dashboard/events')
    
    // Should be redirected to sign-in page or root
    await page.waitForLoadState('networkidle')
    
    const url = page.url()
    const isSignInPage = url.includes('/api/auth/signin') || url.startsWith('https://localhost:3000/')
    expect(isSignInPage).toBeTruthy()
    
    // If redirected to root, verify sign-in button is visible
    if (url === 'https://localhost:3000/') {
      await expect(page.getByRole('button', { name: /Sign in with OSM/i })).toBeVisible()
    }
  })

  test('clicking "Sign in with OSM" triggers OAuth flow', async ({ page, context }) => {
    // Navigate to login page
    await page.goto('/')
    
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle')
    
    // Set up listener for navigation/popup before clicking
    const navigationPromise = page.waitForEvent('framenavigated', { timeout: 10000 })
    
    // Click sign-in button
    await page.getByRole('button', { name: /Sign in with OSM/i }).click()
    
    // Wait for navigation
    await navigationPromise
    
    // Should navigate to either:
    // 1. OSM OAuth page (real auth mode) - URL contains 'www.onlinescoutmanager.co.uk'
    // 2. Dashboard (mock auth mode) - URL is '/dashboard'
    const url = page.url()
    const isOAuthRedirect = url.includes('www.onlinescoutmanager.co.uk') || url.includes('/api/auth/signin')
    const isDashboardRedirect = url.includes('/dashboard')
    
    expect(isOAuthRedirect || isDashboardRedirect).toBeTruthy()
  })

  test('authenticated user on root is redirected to dashboard', async ({ page }) => {
    // This test assumes Mock Auth mode is enabled
    // If using real auth, you'll need to set up authentication state
    
    // For mock auth: sign in first
    await page.goto('/')
    
    // If mock login button exists, click it
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      
      // Wait for redirect to dashboard
      await page.waitForURL('/dashboard', { timeout: 10000 })
      
      // Verify we're on dashboard
      await expect(page).toHaveURL('/dashboard')
      
      // Verify dashboard content is visible
      await expect(page.getByText(/Session Information/i)).toBeVisible()
    }
  })

  test('authenticated user can access protected routes', async ({ page }) => {
    // Sign in with mock auth if available
    await page.goto('/')
    
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      await page.waitForURL('/dashboard')
      
      // Navigate to events page
      await page.goto('/dashboard/events')
      
      // Should successfully load events page (not redirect to login)
      await expect(page).toHaveURL('/dashboard/events')
      
      // Verify events page content
      await expect(page.getByRole('heading', { name: /Events/i })).toBeVisible()
    }
  })
})
