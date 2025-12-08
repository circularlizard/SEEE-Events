import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E Testing Configuration
 * 
 * Tests the SEEE Expedition Dashboard with:
 * - HTTPS localhost (self-signed certificate)
 * - Mock Auth + Mock Data mode for reliable testing
 * - Authentication flow, section picker, and events list
 */
export default defineConfig({
  testDir: './tests/e2e',
  
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
    },
  },
})
