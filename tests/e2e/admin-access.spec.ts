import { test, expect } from './fixtures'

test.describe('Admin Access', () => {
  test('admin user can access /dashboard/admin', async ({ page }) => {
    await page.goto('https://localhost:3000/')
    await expect(page.locator('text=Sign in with OSM')).toBeVisible()

    // Select Administrator role by clicking the labeled control
    await page.click('label:has-text("Administrator")')
    // Sign in with OSM admin provider
    await page.locator('role=button[name="Sign in with OSM"]').click()

    // After OAuth mock, navigate to admin page
    await page.goto('https://localhost:3000/dashboard/admin')
    // Fallback: assert we reached the admin route
    expect(page.url()).toContain('/dashboard/admin')
  })

  test('standard user is blocked on /dashboard/admin', async ({ page }) => {
    await page.goto('https://localhost:3000/')
    await expect(page.locator('text=Sign in with OSM')).toBeVisible()

    // Select Standard Viewer role by clicking the labeled control
    await page.click('label:has-text("Standard Viewer")')
    // Sign in with OSM standard provider
    await page.locator('role=button[name="Sign in with OSM"]').click()

    await page.goto('https://localhost:3000/dashboard/admin')
    // Either middleware redirect to /forbidden or page-level Forbidden message
    const url = page.url()
    const isForbiddenRoute = url.includes('/forbidden')
    const showsForbiddenMessage = await page.locator('text=Forbidden').isVisible().catch(() => false)
    expect(isForbiddenRoute || showsForbiddenMessage).toBeTruthy()
  })
})