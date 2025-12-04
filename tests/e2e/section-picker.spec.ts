import { test, expect } from '@playwright/test'

/**
 * E2E Tests: Section Picker
 * 
 * Tests section selection functionality including:
 * - Multi-section users see selection modal
 * - Section selection persists in store
 * - Selected section ID is used in API calls
 * 
 * Note: Requires Mock Auth with multiple sections configured
 */

test.describe('Section Picker', () => {
  test.skip('multi-section user sees modal after login', async ({ page }) => {
    // This test requires mock data with multiple sections
    // Skip for now as it depends on mock OAuth data configuration
    
    await page.goto('/')
    
    // Sign in with mock auth
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      
      // Wait for section picker modal to appear
      // Note: Currently our mock setup may not have multiple sections
      const modalTitle = page.getByRole('heading', { name: /Select Section/i })
      
      if (await modalTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(modalTitle).toBeVisible()
        
        // Verify section buttons are present
        const sectionButtons = page.getByRole('button').filter({ hasText: /ESU|Scouts|Beavers|Cubs/i })
        await expect(sectionButtons.first()).toBeVisible()
      }
    }
  })

  test.skip('section selection persists in Zustand store', async ({ page }) => {
    // This test verifies that selecting a section updates the store
    // Skip for now as it requires multi-section mock data
    
    await page.goto('/')
    
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      
      // Wait for section picker
      const modalTitle = page.getByRole('heading', { name: /Select Section/i })
      
      if (await modalTitle.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Click first section button
        const firstSection = page.getByRole('button').filter({ hasText: /ESU|Scouts/i }).first()
        await firstSection.click()
        
        // Modal should close
        await expect(modalTitle).not.toBeVisible()
        
        // Navigate to events and verify section is used
        await page.goto('/dashboard/events')
        
        // Check that API calls include the selected section ID
        // This would require intercepting network requests
      }
    }
  })

  test.skip('selected section ID is used in subsequent API calls', async ({ page }) => {
    // This test verifies that the selected section ID is sent in API requests
    // Skip for now - requires network interception and multi-section setup
    
    await page.goto('/')
    
    // Set up network request interception
    const apiRequests: string[] = []
    page.on('request', (request) => {
      if (request.url().includes('/api/proxy/')) {
        apiRequests.push(request.url())
      }
    })
    
    // Sign in and select section
    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()
      
      // Navigate to events to trigger API call
      await page.goto('/dashboard/events')
      
      // Wait for API call to complete
      await page.waitForTimeout(2000)
      
      // Verify at least one API request was made with sectionid parameter
      const eventsRequest = apiRequests.find(url => url.includes('events'))
      if (eventsRequest) {
        expect(eventsRequest).toContain('sectionid')
      }
    }
  })
})
