import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

const { Given, When, Then } = createBdd()

export async function ensureSectionSelected(page: Page) {
  await page.waitForLoadState('networkidle')

  const pickerHeading = page.getByRole('heading', { name: /Select Your Section/i })
  const continueButton = page.getByRole('button', { name: /^Continue$/i })
  const preferredSection = page.getByRole('button', { name: /Explorer Unit Alpha/i })

  // The section picker can render on /dashboard after hydration, or on /dashboard/section-picker.
  // Wait briefly for it to appear before deciding it's not present.
  for (let i = 0; i < 12; i += 1) {
    const url = page.url()
    const isPickerRoute = url.includes('/dashboard/section-picker')
    const pickerVisible = await pickerHeading.isVisible().catch(() => false)
    const continueVisible = await continueButton.isVisible().catch(() => false)
    const preferredVisible = await preferredSection.isVisible().catch(() => false)

    if (isPickerRoute || pickerVisible || continueVisible || preferredVisible) {
      break
    }

    await page.waitForTimeout(250)
  }

  const url = page.url()
  const isPickerRoute = url.includes('/dashboard/section-picker')
  const pickerVisible = await pickerHeading.isVisible().catch(() => false)
  const continueVisible = await continueButton.isVisible().catch(() => false)
  const preferredVisible = await preferredSection.isVisible().catch(() => false)

  if (!(isPickerRoute || pickerVisible || continueVisible || preferredVisible)) {
    return
  }

  if (await preferredSection.isVisible().catch(() => false)) {
    await preferredSection.click()
  } else {
    const anyOption = page.getByRole('button').filter({ hasText: /Unit/i }).first()
    if (await anyOption.isVisible().catch(() => false)) {
      await anyOption.click()
    }
  }

  if (await continueButton.isVisible().catch(() => false)) {
    await continueButton.click()
    // Wait for the picker to complete its redirect.
    await page
      .waitForURL((u) => !u.toString().includes('/dashboard/section-picker'), { timeout: 10000 })
      .catch(() => null)
    await page.waitForLoadState('networkidle')
    await pickerHeading.waitFor({ state: 'hidden', timeout: 5000 }).catch(() => null)
  }
}

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
  await ensureSectionSelected(page)
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
  await ensureSectionSelected(page)
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
  await ensureSectionSelected(page)
})

When('I wait {int} ms', async ({ page }, ms: number) => {
  await page.waitForTimeout(ms)
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

      await ensureSectionSelected(page)
      return
    }
  }

  await page.locator(`role=button[name="${buttonName}"]`).click()
})

When('my session expires', async ({ page }) => {
  // Simulate expiry by clearing cookies and persisted client state.
  // The dashboard should detect unauthenticated/session-expired state and redirect to login.
  await page.context().clearCookies()
  await page.evaluate(() => {
    try {
      window.localStorage.clear()
    } catch {
      // ignore
    }
    try {
      window.sessionStorage.clear()
    } catch {
      // ignore
    }
  })

  // Trigger client-side guards to run on the current page.
  await page.reload()
  await page.waitForLoadState('networkidle')
})

// Assertion steps
Then('I should see {string}', async ({ page }, text: string) => {
  const roleLocators = [
    page.getByRole('heading', { name: text, exact: true }),
    page.getByRole('button', { name: text, exact: true }),
    page.getByRole('link', { name: text, exact: true }),
    page.getByRole('cell', { name: text, exact: true }),
  ]

  for (const loc of roleLocators) {
    if (await loc.isVisible().catch(() => false)) {
      return
    }
  }

  const textLoc = page.getByText(text)
  const count = await textLoc.count()
  for (let i = 0; i < count; i += 1) {
    if (await textLoc.nth(i).isVisible().catch(() => false)) {
      return
    }
  }

  throw new Error(
    `No visible element found for text "${text}" (matched ${count} nodes, all hidden or not present).`
  )
})

Then('I should be on {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(path))
})

Then('the callbackUrl should be {string}', async ({ page }, expectedPath: string) => {
  const url = new URL(page.url())
  const callbackUrl = url.searchParams.get('callbackUrl')
  expect(callbackUrl).toBe(expectedPath)
})

Then('I should not see {string}', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`)).not.toBeVisible()
})
