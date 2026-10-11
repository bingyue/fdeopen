import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:3211',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/start.mjs',
    url: 'http://127.0.0.1:3211/api/health',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      PORT: '3211',
      HOSTNAME: '127.0.0.1',
      APP_MODE: 'demo',
      ALLOW_DEMO_IN_PRODUCTION: 'true',
      DEMO_ACCESS_KEY: 'fdeopen-e2e-only-secret',
      DEMO_DATA_DIR: '.data/e2e-' + Date.now(),
      NEXT_PUBLIC_SITE_URL: 'http://127.0.0.1:3211',
    },
  },
});
