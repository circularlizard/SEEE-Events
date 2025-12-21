import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'

const testDir = defineBddConfig({
  features: 'tests/e2e/features/**/*.feature',
  steps: 'tests/e2e/steps/**/*.ts',
})

/**
 * Playwright BDD Configuration
 * 
 * Extends base Playwright config with Gherkin feature file support.
 * Features live in tests/e2e/features/, steps in tests/e2e/steps/
 */
export default defineConfig({
  testDir,
  
  // Maximum time one test can run
  timeout: 30 * 1000,
  
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI only
  retries: process.env.CI ? 2 : 0,
  
  // Opt out of parallel tests on CI
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use
  reporter: 'html',
  
  // Shared settings for all projects
  use: {
    // Base URL for navigation
    baseURL: 'https://localhost:3000',
    
    // Accept self-signed certificates
    ignoreHTTPSErrors: true,
    
    // Collect trace on test failure
    trace: 'on-first-retry',
    
    // Screenshot on failure
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  // Run your local dev server before starting the tests
  webServer: {
    command: 'npm run dev',
    url: 'https://localhost:3000',
    reuseExistingServer: !process.env.CI,
    ignoreHTTPSErrors: true,
    timeout: 120 * 1000,
    env: {
      // Enable mock authentication for E2E tests
      MOCK_AUTH_ENABLED: 'true',
      NEXT_PUBLIC_MOCK_AUTH_ENABLED: 'true',
      // Enable MSW for mock API responses
      NEXT_PUBLIC_USE_MSW: 'true',
      // Speed up inactivity timeout in E2E (production default is 15 minutes)
      NEXT_PUBLIC_INACTIVITY_TIMEOUT_MS: '5000',
    },
  },
})
