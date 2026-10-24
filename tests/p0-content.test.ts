import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { polishCase, polishDatabaseCases, editorialPatches } from '../src/lib/case-editorial';
import { db } from '../src/lib/db';
import { importLibrary, validateLibrary } from '../src/lib/media-library';
import { DEMO_ADMIN } from '../src/lib/seed';
import { packs } from '../src/lib/practice';
import oldCase from './fixtures/case-before-editorial.json';
it('reviews exactly the public 20 and preserves edits outside the approved baseline', async () => {
  expect(editorialPatches).toHaveLength(20);
  const patch = editorialPatches.find((p) => p.slug === oldCase.slug)!;
  expect(polishCase(oldCase)).toMatchObject(patch.after);
  expect(() => polishCase({ ...oldCase, body: oldCase.body + 'New CMS edit' })).toThrow('preserve');
  const raw = JSON.parse(await readFile('content/media-library.json', 'utf8'));
  for (const post of raw.posts.filter(
    (p: { channel: string; status: string }) => p.channel === 'cases' && p.status === 'published',
  )) {
    expect(polishCase(post)).toEqual(post);
    expect(post.summary).not.toMatch(/…|：。/);
    expect(post.body).not.toMatch(/AI制造探索营|响哥/);
  }
  const database = await db();
  await importLibrary(database, validateLibrary(raw), DEMO_ADMIN, true);
  await database.query(
    'UPDATE media_posts SET title=$2,summary=$3,body=$4,details=$5 WHERE slug=$1',
    [oldCase.slug, oldCase.title, oldCase.summary, oldCase.body, JSON.stringify(oldCase.details)],
  );
  expect((await polishDatabaseCases(database, DEMO_ADMIN)).updated).toBe(1);
  // A conflict later in the batch must roll back earlier updates.
  await database.query(
    "UPDATE media_posts SET body=body || 'CMS change' WHERE slug='field-fde-035'",
  );
  await expect(polishDatabaseCases(database, DEMO_ADMIN, true)).rejects.toThrow('preserve');
  expect(
    (
      await database.query<{ body: string }>('SELECT body FROM media_posts WHERE slug=$1', [
        oldCase.slug,
      ])
    )[0].body,
  ).toBe(oldCase.body);
  const second = editorialPatches.find((p) => p.slug === 'field-fde-035')!;
  await database.query('UPDATE media_posts SET body=$1 WHERE slug=$2', [
    second.after.body,
    second.slug,
  ]);
  expect((await polishDatabaseCases(database, DEMO_ADMIN, true)).updated).toBe(1);
  expect((await polishDatabaseCases(database, DEMO_ADMIN, true)).updated).toBe(0);
  expect(
    await database.query("SELECT id FROM audit_logs WHERE action='media.cases.polish'"),
  ).toHaveLength(1);
});
it('practice packages run against independent expected outputs and link to published resources', async () => {
  const catalog = JSON.parse(await readFile('content/catalog.json', 'utf8'));
  const entries = Array.isArray(catalog)
    ? catalog
    : (Object.values(catalog).flat() as { slug: string }[]);
  for (const pack of packs) {
    expect(
      execFileSync('python3', ['content/practice/' + pack.slug + '/run.py', '--check'], {
        encoding: 'utf8',
      }),
    ).toContain('PASS');
    expect(entries.some((e: { slug: string }) => e.slug === pack.project)).toBe(true);
    expect(entries.some((e: { slug: string }) => e.slug === pack.skill)).toBe(true);
    const zip = await readFile('public/practice/' + pack.slug + '.zip');
    expect(zip.subarray(0, 2).toString()).toBe('PK');
  }
});
