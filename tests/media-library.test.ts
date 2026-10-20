import { readFile } from 'node:fs/promises';
import { expect, it } from 'vitest';
import { db } from '../src/lib/db';
import { DEMO_ADMIN, DEMO_MEMBER } from '../src/lib/seed';
import { importLibrary, validateLibrary, libraryId } from '../src/lib/media-library';

const source = () => readFile('content/media-library.json', 'utf8').then(JSON.parse);
it('validates the full sourced library and rejects missing media or local paths', async () => {
  const raw = await source();
  const library = validateLibrary(raw);
  expect(library.posts.length).toBeGreaterThanOrEqual(190);
  expect(JSON.stringify(library.posts)).not.toMatch(
    /AI\s*制造探索营|响哥|Case AI Day39|id_ehsnjqzdgwg3/i,
  );
  expect(
    library.posts
      .filter((p) => p.value.channel === 'cases')
      .every((p) => p.value.authenticity === 'sourced'),
  ).toBe(true);
  expect(() => validateLibrary({ ...raw, assets: [] })).toThrow('Missing article asset');
  raw.posts[0].body += '\n[内部文件](file:///Users/private/source.md)';
  expect(() => validateLibrary(raw)).toThrow('Private or unresolved reference');
});
it('imports atomically, keeps community data and preserves CMS edits on rerun', async () => {
  const raw = await source();
  const library = validateLibrary({ ...raw, assets: [], posts: raw.posts.slice(0, 2) });
  const database = await db();
  const [{ count: before }] = await database.query<{ count: number }>(
    'SELECT count(*)::int AS count FROM resources',
  );
  await expect(importLibrary(database, library, DEMO_MEMBER)).rejects.toThrow('administrator');
  expect(
    (await database.query('SELECT id FROM media_authors WHERE id=$1', [library.author.id])).length,
  ).toBe(0);
  const first = await importLibrary(database, library, DEMO_ADMIN);
  expect(first.inserted).toBe(2);
  const id = libraryId(library.posts[0].value.slug);
  await database.query(
    "UPDATE media_posts SET title='编辑修改后的标题',status='draft',revision=revision+1 WHERE id=$1",
    [id],
  );
  const again = await importLibrary(database, library, DEMO_ADMIN);
  expect(again.inserted).toBe(0);
  expect(again.skipped).toBe(2);
  const [edited] = await database.query<{ title: string; status: string; revision: number }>(
    'SELECT title,status,revision FROM media_posts WHERE id=$1',
    [id],
  );
  expect(edited).toMatchObject({ title: '编辑修改后的标题', status: 'draft', revision: 2 });
  expect(
    (await database.query<{ count: number }>('SELECT count(*)::int AS count FROM resources'))[0]
      .count,
  ).toBe(before);
});
