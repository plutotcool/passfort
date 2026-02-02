import { defineConfig, devices } from '@playwright/test';

const E2E_PORT = process.env.E2E_PORT ?? '3099';
const baseURL = process.env.BASE_URL ?? `http://localhost:${E2E_PORT}`;

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
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      PORT: E2E_PORT,
      PASSFORT_PASSWORD: 'e2etest',
      PASSFORT_SECRET: 'e2e-secret-at-least-16-chars',
    },
  },
});
