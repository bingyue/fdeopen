import { beforeAll, afterEach, it, expect, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { listResources, resourcePreview, getResource } from '../src/lib/catalog';
import { workspaceData } from '../src/lib/workspace';
import { pageWindow, queryText, positiveInteger } from '../src/lib/pagination';
import { saveResource, updateRole, submit, toggle } from '../src/lib/service';
import { DEMO_ADMIN, DEMO_MEMBER } from '../src/lib/seed';
import type { User } from '../src/lib/types';
let member: User, admin: User;
beforeAll(async () => {
  const database = await db();
  [member] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_MEMBER],
  );
  [admin] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_ADMIN],
  );
});
afterEach(() => vi.restoreAllMocks());
it('handles non-finite and fractional pagination without SQL failures', async () => {
  for (const value of [NaN, Infinity, -Infinity, -1, 1.5]) {
    const result = await listResources('project', { page: value, limit: value });
    expect(Number.isInteger(result.page)).toBe(true);
    expect(result.rows.length).toBeGreaterThan(0);
  }
  expect(positiveInteger('Infinity')).toBe(1);
  expect(queryText({ q: ['a', 'b'] }, 'q')).toBe('');
  expect(pageWindow(500, 1000)).toEqual([1, 'gap', 499, 500, 501, 'gap', 1000]);
});
it('keeps long bodies and README out of lists without breaking full text search', async () => {
  const resource = await getResource('ragflow');
  await (
    await db()
  ).query('UPDATE resources SET body=$2,metadata=metadata||$3::jsonb WHERE id=$1', [
    resource!.id,
    'REVIEW_BODY_NEEDLE ' + 'x'.repeat(20000),
    JSON.stringify({ readme: 'y'.repeat(40000) }),
  ]);
  const result = await listResources('project', { q: 'REVIEW_BODY_NEEDLE' });
  expect(result.rows).toHaveLength(1);
  expect(result.rows[0]).not.toHaveProperty('body');
  expect(result.rows[0].metadata).not.toHaveProperty('readme');
  expect(JSON.stringify(result).length).toBeLessThan(3000);
  expect((await listResources('project', { q: '%' })).rows).toHaveLength(0);
});
it('home previews execute one query and workspace profile executes none', async () => {
  const query = vi.spyOn(await db(), 'query');
  await resourcePreview('project', { limit: 6 });
  expect(query).toHaveBeenCalledTimes(1);
  query.mockClear();
  await workspaceData(member.id, 'profile');
  expect(query).not.toHaveBeenCalled();
  await workspaceData(member.id, 'bookmarks');
  expect(query).toHaveBeenCalledTimes(2);
  expect(
    query.mock.calls.some(([sql]) => /submissions|task_applications|notifications/.test(sql)),
  ).toBe(false);
});
it('paginates bookmarks while retaining accurate overview counts', async () => {
  await (
    await db()
  ).query(
    "INSERT INTO bookmarks(user_id,resource_id) SELECT $1,id FROM resources WHERE kind='project' ON CONFLICT DO NOTHING",
    [member.id],
  );
  const first = await workspaceData(member.id, 'bookmarks');
  const second = await workspaceData(member.id, 'bookmarks', 2);
  expect(first.saved).toHaveLength(12);
  expect(second.saved).toHaveLength(8);
  expect(new Set([...first.saved, ...second.saved].map((r) => r.id)).size).toBe(20);
  expect((await workspaceData(member.id, 'overview')).stats.saved).toBe(20);
});
it('serializes duplicate submissions and bookmark toggles', async () => {
  const input = {
    kind: 'scenario',
    title: 'Concurrent submission',
    summary: '并发提交同一个场景时只能保留一条待审核记录。',
    category: '测试',
  };
  const results = await Promise.allSettled([submit(member, input), submit(member, input)]);
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  const r = await getResource('ragflow');
  await (
    await db()
  ).query('DELETE FROM bookmarks WHERE user_id=$1 AND resource_id=$2', [member.id, r!.id]);
  await Promise.all([toggle(member, r!.id, 'bookmark'), toggle(member, r!.id, 'bookmark')]);
  expect(
    await (
      await db()
    ).query('SELECT * FROM bookmarks WHERE user_id=$1 AND resource_id=$2', [member.id, r!.id]),
  ).toHaveLength(0);
});
it('prevents content type changes and reports missing admin targets', async () => {
  const r = await getResource('ragflow');
  await expect(saveResource(admin, { ...r, kind: 'task' })).rejects.toMatchObject({ status: 409 });
  await expect(updateRole(admin, randomUUID(), 'member', false)).rejects.toMatchObject({
    status: 404,
  });
});

it('ignores inherited object property names as sort values', async () => {
  for (const sort of ['constructor', '__proto__', 'toString']) {
    expect((await listResources('project', { sort })).rows).toHaveLength(12);
  }
});
