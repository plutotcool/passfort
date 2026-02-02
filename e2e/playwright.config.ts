import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command:
      'pnpm run build && pnpm --filter passfort-example run build && pnpm --filter passfort-example run start',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 180_000,
    env: {
      PORT: '3000',
      PASSFORT_PASSWORD: 'e2etest',
      PASSFORT_SECRET: 'e2e-secret-at-least-16-chars',
    },
  },
});
