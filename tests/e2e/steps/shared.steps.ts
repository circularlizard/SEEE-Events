import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'

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
  
  // Sign in with OSM
  await page.locator('role=button[name="Sign in with OSM"]').click()
  await page.waitForURL('/dashboard', { timeout: 10000 })
})

Given('I am logged in as a standard viewer', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  
  // Select Standard Viewer role
  await page.click('label:has-text("Standard Viewer")')
  
  // Sign in with OSM
  await page.locator('role=button[name="Sign in with OSM"]').click()
  await page.waitForURL('/dashboard', { timeout: 10000 })
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
  await page.locator(`role=button[name="${buttonName}"]`).click()
})

// Assertion steps
Then('I should see {string}', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`)).toBeVisible()
})

Then('I should be on {string}', async ({ page }, path: string) => {
  await expect(page).toHaveURL(new RegExp(path))
})

Then('I should not see {string}', async ({ page }, text: string) => {
  await expect(page.locator(`text=${text}`)).not.toBeVisible()
})
