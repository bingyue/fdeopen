import { it, expect, vi } from 'vitest';
import { db } from '../src/lib/db';
it('retries initialization after a rejected setup instead of caching the rejection forever', async () => {
  vi.stubEnv('APP_MODE', 'invalid-review-mode');
  await expect(db()).rejects.toThrow('Configure APP_MODE');
  vi.unstubAllEnvs();
  const database = await db();
  expect(await database.query('SELECT 1 AS healthy')).toEqual([{ healthy: 1 }]);
});
