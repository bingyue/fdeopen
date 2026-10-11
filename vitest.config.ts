import { defineConfig } from 'vitest/config';
import path from 'node:path';
export default defineConfig({
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  test: {
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    env: { APP_MODE: 'demo', DEMO_DATA_DIR: 'memory://' },
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
