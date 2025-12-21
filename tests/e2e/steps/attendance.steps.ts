import { createBdd } from 'playwright-bdd'
import { expect } from '@playwright/test'

const { Then, When } = createBdd()

Then('the attendance grouping mode {string} should be selected', async ({ page }, label: string) => {
  await page.waitForLoadState('networkidle')
  const radio = page.getByLabel(label)
  await expect(radio).toBeChecked()
})

When('I select attendance grouping mode {string}', async ({ page }, label: string) => {
  await page.waitForLoadState('networkidle')
  await page.getByLabel(label).click()
})
