import { defineConfig, devices } from '@playwright/test';
const port = Number(process.env.FDE_E2E_PORT || 3211);
const origin = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: origin,
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node scripts/start.mjs',
    url: origin + '/api/health',
    timeout: 120000,
    reuseExistingServer: false,
    env: {
      PORT: String(port),
      HOSTNAME: '127.0.0.1',
      APP_MODE: 'demo',
      ALLOW_DEMO_IN_PRODUCTION: 'true',
      DEMO_ACCESS_KEY: 'fdeopen-e2e-only-secret',
      DEMO_DATA_DIR: '.data/e2e-' + Date.now(),
      NEXT_PUBLIC_SITE_URL: origin,
    },
  },
});
