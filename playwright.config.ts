import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './pw-tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  //.Serialised on purpose: the app rate-limits register/login per client key
  // (10/60s), and parallel workers all share one origin, so concurrent
  // registration tests hit the limiter and fail with "Too many attempts".
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3100',
    trace: 'on-first-retry',
    viewport: { width: 1440, height: 900 },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
    {
      name: 'safari',
      use: { ...devices['iPhone 14'] },
    },
  ],
});
