import { beforeAll, afterAll, it, expect } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { randomUUID } from 'node:crypto';
import { liteAdapter, migrate } from '../src/lib/db';
import {
  registerAccount,
  loginAccount,
  issueRecoveryCode,
  recoverAccount,
  changePassword,
} from '../src/lib/accounts';
import { safeReturnPath, loginHref } from '../src/lib/return-path';
import {
  recordReading,
  configureHistory,
  readingList,
  setMediaBookmark,
  mediaBookmarked,
} from '../src/lib/reading';
const pg = new PGlite(),
  database = liteAdapter(pg),
  password = 'a-long-original-password';
let account: Awaited<ReturnType<typeof registerAccount>>,
  other: Awaited<ReturnType<typeof registerAccount>>;
beforeAll(async () => {
  await migrate(database);
  account = await registerAccount(database, {
    loginName: 'reader',
    name: 'Reader',
    password,
    consent: true,
  });
  other = await registerAccount(database, {
    loginName: 'other',
    name: 'Other',
    password,
    consent: true,
  });
});
afterAll(async () => {
  await pg.close();
});
it('returns only internal navigation paths including query/hash and blocks authentication loops', () => {
  for (const unsafe of [
    'https://evil.example',
    '//evil.example',
    '/\\evil.example',
    '/%2f%2fevil.example',
    '/../auth/github',
    '/login?next=/login',
    '/api/health',
    'javascript:alert(1)',
    '/x\ny',
  ])
    expect(safeReturnPath(unsafe)).toBe('/dashboard');
  expect(safeReturnPath('/cases/a?q=AI%20Agent#reading')).toBe('/cases/a?q=AI%20Agent#reading');
  expect(loginHref('/cases/a#reading')).toBe('/login?next=%2Fcases%2Fa%23reading');
});
it('issues recovery codes without plaintext storage and recovers exactly once while revoking all sessions', async () => {
  const first = await loginAccount(database, { loginName: 'reader', password });
  expect(first.needsOnboarding).toBe(true);
  await database.query('UPDATE profiles SET onboarding_at=now() WHERE user_id=$1', [
    account.userId,
  ]);
  expect((await loginAccount(database, { loginName: 'reader', password })).needsOnboarding).toBe(
    false,
  );
  await expect(
    issueRecoveryCode(database, account.userId, { currentPassword: 'wrong' }),
  ).rejects.toThrow('当前密码');
  await expect(
    recoverAccount(database, {
      loginName: 'other',
      recoveryCode: account.recoveryCode,
      password: 'replacement-password',
    }),
  ).rejects.toThrow('恢复码');
  const next = await issueRecoveryCode(database, account.userId, { currentPassword: password });
  await expect(
    recoverAccount(database, {
      loginName: 'reader',
      recoveryCode: account.recoveryCode,
      password: 'replacement-password',
    }),
  ).rejects.toThrow('恢复码');
  expect(
    await database.query('SELECT * FROM sessions WHERE user_id=$1', [account.userId]),
  ).toHaveLength(2);
  const results = await Promise.allSettled(
    [0, 1].map(() =>
      recoverAccount(database, {
        loginName: 'reader',
        recoveryCode: next.recoveryCode,
        password: 'replacement-password',
      }),
    ),
  );
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(
    await database.query('SELECT * FROM sessions WHERE user_id=$1', [account.userId]),
  ).toHaveLength(0);
  await expect(loginAccount(database, { loginName: 'reader', password })).rejects.toThrow(
    '账号或密码',
  );
  await loginAccount(database, { loginName: 'reader', password: 'replacement-password' });
  const fresh = await issueRecoveryCode(database, account.userId, {
    currentPassword: 'replacement-password',
  });
  await changePassword(database, account.userId, {
    currentPassword: 'replacement-password',
    password: 'another-new-password',
  });
  await expect(
    recoverAccount(database, {
      loginName: 'reader',
      recoveryCode: fresh.recoveryCode,
      password: 'replacement-password',
    }),
  ).rejects.toThrow('恢复码');
  const stored =
    JSON.stringify(await database.query('SELECT * FROM account_credentials')) +
    JSON.stringify(await database.query('SELECT * FROM audit_logs'));
  for (const secret of [password, account.recoveryCode, next.recoveryCode, fresh.recoveryCode])
    expect(stored).not.toContain(secret);
});
it('rejects disabled account recovery without consuming its code', async () => {
  await database.query('UPDATE users SET disabled=true WHERE id=$1', [other.userId]);
  await expect(
    recoverAccount(database, {
      loginName: 'other',
      recoveryCode: other.recoveryCode,
      password: 'replacement-password',
    }),
  ).rejects.toThrow('恢复码');
  expect(
    (
      await database.query<{ recovery_hash: string }>(
        'SELECT recovery_hash FROM account_credentials WHERE user_id=$1',
        [other.userId],
      )
    )[0].recovery_hash,
  ).toBeTruthy();
  await database.query('UPDATE users SET disabled=false WHERE id=$1', [other.userId]);
});
it('unifies private bookmarks and history, filters unpublished content and caps mixed records at 100', async () => {
  const resource = randomUUID(),
    post = randomUUID(),
    archived = randomUUID(),
    future = randomUUID();
  await database.query(
    "INSERT INTO resources(id,slug,kind,title,summary,status,category) VALUES($1,'read-project','project','Project','Summary','published','Test')",
    [resource],
  );
  for (const [id, slug, status, date] of [
    [post, 'read-case', 'published', '2026-01-01'],
    [archived, 'archived-case', 'archived', '2026-01-01'],
    [future, 'future-case', 'scheduled', '2099-01-01'],
  ]) {
    await database.query(
      "INSERT INTO media_posts(id,slug,channel,title,status,published_at,owner_id) VALUES($1,$2,'cases','Case',$3,$4,$5)",
      [id, slug, status, date, account.userId],
    );
  }
  await database.query('INSERT INTO bookmarks(user_id,resource_id) VALUES($1,$2)', [
    account.userId,
    resource,
  ]);
  await setMediaBookmark(database, account.userId, post, true);
  await setMediaBookmark(database, account.userId, post, true);
  expect(await mediaBookmarked(database, account.userId, post)).toBe(true);
  await expect(setMediaBookmark(database, account.userId, archived, true)).rejects.toThrow('下架');
  await expect(setMediaBookmark(database, account.userId, future, true)).rejects.toThrow('下架');
  expect(
    (await readingList(database, account.userId, 'bookmarks')).saved.map((x) => x.target).sort(),
  ).toEqual(['media', 'resource']);
  expect((await readingList(database, other.userId, 'bookmarks')).saved).toEqual([]);
  for (let i = 0; i < 105; i++) {
    const id = randomUUID();
    await database.query(
      "INSERT INTO resources(id,slug,kind,title,summary,status,category) VALUES($1,$2,'project','Test','Summary','published','Test')",
      [id, 'history-' + i],
    );
    await recordReading(database, account.userId, 'resource', id);
  }
  await Promise.all([
    recordReading(database, account.userId, 'media', post),
    recordReading(database, account.userId, 'resource', resource),
  ]);
  expect(
    await database.query('SELECT * FROM reading_history WHERE user_id=$1', [account.userId]),
  ).toHaveLength(100);
  expect(
    (await readingList(database, account.userId, 'history')).saved
      .slice(0, 2)
      .map((x) => x.target)
      .sort(),
  ).toEqual(['media', 'resource']);
  expect((await readingList(database, other.userId, 'history')).saved).toEqual([]);
  await database.query("UPDATE media_posts SET status='archived' WHERE id=$1", [post]);
  expect((await readingList(database, account.userId, 'bookmarks')).saved).toHaveLength(1);
  expect(
    (await readingList(database, account.userId, 'history')).saved.some((x) => x.id === post),
  ).toBe(false);
  await configureHistory(database, account.userId, false);
  await recordReading(database, account.userId, 'resource', resource);
  expect((await readingList(database, account.userId, 'history')).saved).toHaveLength(0);
  expect((await readingList(database, account.userId, 'bookmarks')).saved).toHaveLength(1);
  await configureHistory(database, account.userId, true);
  await recordReading(database, account.userId, 'resource', resource);
  expect((await readingList(database, account.userId, 'history')).saved).toHaveLength(1);
});
