import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { createHmac, randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { fetchGithub, syncGithub } from '../src/lib/github';
import { POST } from '../src/app/api/github/webhook/route';
const secret = 'review-test-secret';
const repo = 'review/target';
const target = randomUUID();
function upstream() {
  return vi.fn(async (url: string | URL | Request) => {
    if (String(url).endsWith('/readme'))
      return Response.json({ content: Buffer.from('README').toString('base64'), size: 6 });
    return Response.json(
      {
        full_name: repo,
        name: 'target',
        html_url: `https://github.com/${repo}`,
        default_branch: 'main',
        owner: { login: 'review' },
        stargazers_count: 123,
        pushed_at: '2026-10-11T00:00:00Z',
        license: { spdx_id: 'MIT' },
      },
      { headers: { etag: 'test-etag' } },
    );
  });
}
function delivery(id: string, raw = JSON.stringify({ repository: { full_name: repo } })) {
  return new Request('http://localhost/api/github/webhook', {
    method: 'POST',
    body: raw,
    headers: {
      'x-github-delivery': id,
      'x-github-event': 'push',
      'x-hub-signature-256': 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex'),
    },
  });
}
beforeAll(async () => {
  const database = await db();
  for (let i = 0; i < 8; i++)
    await database.query(
      "INSERT INTO resources(id,slug,kind,title,summary,category,source_url,status) VALUES($1,$2,'project','Filler','Example summary','test',$3,'published')",
      [randomUUID(), `filler-${i}`, `https://github.com/review/filler-${i}`],
    );
  await database.query(
    "INSERT INTO resources(id,slug,kind,title,summary,category,source_url,status,updated_at) VALUES($1,'review-target','project','Target','Example summary','test','https://github.com/review/target.git/','published','2099-01-01')",
    [target],
  );
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});
it('targets webhook repositories beyond the first 25 rows, including .git URLs', async () => {
  const fetch = upstream();
  vi.stubGlobal('fetch', fetch);
  const result = await syncGithub(repo);
  expect(result).toEqual([{ id: target, ok: true }]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(fetch.mock.calls.every(([url]) => String(url).includes(`/repos/${repo}`))).toBe(true);
});
it('refreshes the displayed verification timestamp on an ETag 304', async () => {
  await (
    await db()
  ).query(
    "UPDATE github_cache SET data=jsonb_set(data,'{checkedAt}','\"2000-01-01\"'::jsonb) WHERE repo=$1",
    [repo],
  );
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 304 })));
  const metadata = await fetchGithub(`https://github.com/${repo}`, true);
  expect(metadata.checkedAt).not.toBe('2000-01-01');
  const [cached] = await (
    await db()
  ).query<{ checked_at: string }>(
    "SELECT data->>'checkedAt' checked_at FROM github_cache WHERE repo=$1",
    [repo],
  );
  expect(cached.checked_at).toBe(metadata.checkedAt);
});
it('allows retry after upstream failure, then deduplicates successful deliveries', async () => {
  vi.stubEnv('GITHUB_WEBHOOK_SECRET', secret);
  const id = randomUUID();
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('upstream down')));
  expect((await POST(delivery(id))).status).toBe(502);
  const fetch = upstream();
  vi.stubGlobal('fetch', fetch);
  expect((await POST(delivery(id))).status).toBe(200);
  expect(await (await POST(delivery(id))).json()).toEqual({ ok: true, duplicate: true });
  expect(fetch).toHaveBeenCalledTimes(2);
});
it('rejects malformed signed JSON before claiming the delivery', async () => {
  vi.stubEnv('GITHUB_WEBHOOK_SECRET', secret);
  const id = randomUUID();
  expect((await POST(delivery(id, '{broken'))).status).toBe(400);
  expect(
    await (await db()).query('SELECT * FROM webhook_deliveries WHERE id=$1', [id]),
  ).toHaveLength(0);
});
it('returns a retryable response for active claims and reclaims abandoned attempts', async () => {
  vi.stubEnv('GITHUB_WEBHOOK_SECRET', secret);
  const id = randomUUID();
  await (
    await db()
  ).query('INSERT INTO webhook_deliveries(id,completed,claim_token) VALUES($1,false,$2)', [
    id,
    randomUUID(),
  ]);
  expect((await POST(delivery(id))).status).toBe(409);
  await (
    await db()
  ).query("UPDATE webhook_deliveries SET created_at=now()-interval '11 minutes' WHERE id=$1", [id]);
  vi.stubGlobal('fetch', upstream());
  expect((await POST(delivery(id))).status).toBe(200);
});
