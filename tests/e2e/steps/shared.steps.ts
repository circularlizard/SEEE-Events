import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { Given, When, Then } = createBdd()

/**
 * Shared Step Definitions
 * 
 * Common steps used across multiple features:
 * - Authentication (login, role selection)
 * - Navigation
 * - Section selection
 */

// Authentication steps
Given('I am logged in as an admin', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Select Administrator role
  await page.click('label:has-text("Administrator")')

  // Prefer mock login when available in E2E
  const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
  if (await mockLoginButton.isVisible().catch(() => false)) {
    await mockLoginButton.click()
  } else {
    await page.locator('role=button[name="Sign in with OSM"]').click()
  }

  await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 10000 })
})

Given('I am logged in as a standard viewer', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Select Standard Viewer role
  await page.click('label:has-text("Standard Viewer")')

  // Prefer mock login when available in E2E
  const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
  if (await mockLoginButton.isVisible().catch(() => false)) {
    await mockLoginButton.click()
  } else {
    await page.locator('role=button[name="Sign in with OSM"]').click()
  }

  await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 10000 })
})

Given('I am on the login page', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
})

// Section selection steps
Given('I have selected the {string} section', async ({ page }, sectionName: string) => {
  // If section picker is visible, select the section
  const sectionPicker = page.locator('text=Select a Section')
  if (await sectionPicker.isVisible().catch(() => false)) {
    await page.click(`text=${sectionName}`)
    await page.waitForLoadState('networkidle')
  }
})

// Navigation steps
When('I navigate to {string}', async ({ page }, path: string) => {
  await page.goto(path)
  await page.waitForLoadState('networkidle')
})

When('I click {string}', async ({ page }, text: string) => {
  await page.click(`text=${text}`)
})

When('I click the button {string}', async ({ page }, buttonName: string) => {
  if (buttonName === 'Sign in with OSM') {
    const callbackUrlRaw = new URL(page.url()).searchParams.get('callbackUrl')
    const callbackPath = (() => {
      if (!callbackUrlRaw) return null

      // Middleware usually sets callbackUrl to a relative path (e.g. /dashboard/events),
      // but NextAuth can also set it to a full URL.
      if (callbackUrlRaw.startsWith('/')) return callbackUrlRaw

      try {
        const u = new URL(callbackUrlRaw)
        return `${u.pathname}${u.search}${u.hash}`
      } catch {
        return null
      }
    })()

    const shouldNavigateToCallback =
      !!callbackPath && callbackPath.startsWith('/dashboard') && callbackPath !== '/dashboard'

    const mockLoginButton = page.getByRole('button', { name: /Dev: Mock Login/i })
    if (await mockLoginButton.isVisible().catch(() => false)) {
      await mockLoginButton.click()

      // In mock auth mode, ensure we've actually logged in.
      await page.waitForURL(/\/dashboard(\/|$)/, { timeout: 10000 })

      if (shouldNavigateToCallback && callbackPath) {
        // Mock login may not apply callbackUrl automatically.
        await page.goto(callbackPath)
        await page.waitForLoadState('networkidle')
      }
      return
    }
  }

  await page.locator(`role=button[name="${buttonName}"]`).click()
})

// Assertion steps
Then('I should see {string}', async ({ page }, text: string) => {
  const loc = page.getByText(text)
  const count = await loc.count()

  for (let i = 0; i < count; i += 1) {
    if (await loc.nth(i).isVisible().catch(() => false)) {
      return
    }
  }

  await expect(loc.first()).toBeVisible()
})

Then('I should be on {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(path))
})

Then('I should not see {string}', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`)).not.toBeVisible()
})
