import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { db } from '../src/lib/db';
import { DEMO_ADMIN, DEMO_MEMBER } from '../src/lib/seed';
import { importLibrary, validateLibrary } from '../src/lib/media-library';
import { curateDatabaseCases, curateCasePost, publicCaseSlugs } from '../src/lib/case-selection';
import { mediaList, mediaPost } from '../src/lib/media-service';

const source = () => readFile('content/media-library.json', 'utf8').then(JSON.parse);

it('ships exactly 20 public cases and keeps published reading paths within that selection', async () => {
  const pack = validateLibrary(await source());
  const cases = pack.posts.filter((p) => p.value.channel === 'cases');
  expect(
    cases
      .filter((p) => p.value.status === 'published')
      .map((p) => p.value.slug)
      .sort(),
  ).toEqual([...publicCaseSlugs].sort());
  expect(cases.filter((p) => p.value.status === 'archived')).toHaveLength(154);
  expect(pack.posts.filter((p) => p.value.status === 'published')).toHaveLength(47);
  for (const { value } of pack.posts) {
    expect(curateCasePost(value)).toEqual(value);
    if (value.status !== 'published') continue;
    for (const link of value.body.matchAll(/\]\(\/cases\/([a-z0-9-]+)\)/g))
      expect(publicCaseSlugs).toContain(link[1]);
  }
});

it('archives atomically with an audit snapshot, preserves CMS text, and survives reimport', async () => {
  const raw = await source();
  // Model the previously deployed pack, including a future scheduled case.
  for (const post of raw.posts) {
    if (post.channel === 'cases') post.status = 'published';
    if (post.slug === 'caict-2025-reading-guide')
      post.body += '\n| [旧案例](/cases/caict-2025-02) | 旧行业 | 旧场景 |\n';
  }
  const library = validateLibrary(raw),
    database = await db();
  await importLibrary(database, library, DEMO_ADMIN, true);
  await database.query(
    "UPDATE media_posts SET body=body || E'\\n保留编辑修改',status='scheduled',published_at='2099-01-01' WHERE slug='caict-2025-03'",
  );
  await expect(curateDatabaseCases(database, DEMO_MEMBER, true)).rejects.toThrow('administrator');
  await database.query("UPDATE media_posts SET status='draft' WHERE slug=$1", [publicCaseSlugs[0]]);
  await expect(curateDatabaseCases(database, DEMO_ADMIN, true)).rejects.toThrow('not public');
  expect((await mediaPost('caict-2025-02'))?.slug).toBe('caict-2025-02');
  await database.query("UPDATE media_posts SET status='published' WHERE slug=$1", [
    publicCaseSlugs[0],
  ]);
  const dryRun = await curateDatabaseCases(database, DEMO_ADMIN);
  expect(dryRun.archived).toBe(154);
  expect(dryRun.referencesUpdated).toBe(1);
  expect((await mediaList({ channel: 'cases' })).count).toBeGreaterThan(20);
  const result = await curateDatabaseCases(database, DEMO_ADMIN, true);
  expect(result.archived).toBe(154);
  expect((await mediaList({ channel: 'cases' })).count).toBe(20);
  expect(await mediaPost('caict-2025-02')).toBeNull();
  const [preserved] = await database.query<{ body: string; status: string }>(
    "SELECT body,status FROM media_posts WHERE slug='caict-2025-03'",
  );
  expect(preserved.status).toBe('archived');
  expect(preserved.body).toContain('保留编辑修改');
  const [audit] = await database.query<{ details: { changes: unknown[] } }>(
    "SELECT details FROM audit_logs WHERE action='media.cases.curate'",
  );
  expect(audit.details.changes).toHaveLength(155);
  expect((await importLibrary(database, library, DEMO_ADMIN)).inserted).toBe(0);
  expect((await mediaList({ channel: 'cases' })).count).toBe(20);
  expect((await curateDatabaseCases(database, DEMO_ADMIN, true)).changedSlugs).toEqual([]);
  expect((await mediaList({ channel: 'features' })).count).toBe(13);
  expect((await mediaList({ channel: 'research' })).count).toBe(12);
  expect((await mediaList({ channel: 'insights' })).count).toBe(2);
});
