import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { createHash } from 'node:crypto';
import { liteAdapter, migrate } from '../src/lib/db';
import { createAccount, loginAccount, changePassword } from '../src/lib/accounts';
import { hashPassword, verifyPassword } from '../src/lib/password';

const pg = new PGlite();
const database = liteAdapter(pg);
const password = 'account-test-long-passphrase';
beforeAll(async () => {
  await migrate(database);
});
afterAll(async () => {
  await pg.close();
});

describe('self-hosted account security', () => {
  it('salts password hashes and rejects malformed hashes and incorrect passwords', async () => {
    const first = await hashPassword(password);
    expect(await hashPassword(password)).not.toBe(first);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword('incorrect', first)).toBe(false);
    expect(await verifyPassword(password, 'scrypt$99999999$8$1$bad$bad')).toBe(false);
    expect(await verifyPassword(password)).toBe(false);
  });
  it('requires consent and strong passwords; cannot request admin through registration data', async () => {
    await expect(
      createAccount(database, {
        loginName: 'tester',
        name: 'Test',
        password: 'short',
        consent: true,
      }),
    ).rejects.toThrow();
    await expect(
      createAccount(database, { loginName: 'tester', name: 'Test', password, consent: false }),
    ).rejects.toThrow();
    const id = await createAccount(database, {
      loginName: 'TeSter',
      name: 'Test',
      password,
      consent: true,
      role: 'admin',
    });
    expect(
      (await database.query<{ role: string }>('SELECT role FROM users WHERE id=$1', [id]))[0].role,
    ).toBe('member');
    expect(
      (
        await database.query<{ public: boolean }>('SELECT public FROM profiles WHERE user_id=$1', [
          id,
        ])
      )[0].public,
    ).toBe(false);
    await expect(
      createAccount(database, { loginName: 'TESTER', name: 'Other', password, consent: true }),
    ).rejects.toThrow();
    expect((await database.query('SELECT id FROM users')).length).toBe(1);
  });
  it('stores only hashed sessions, revokes every session on password change, and rejects old credentials', async () => {
    const first = await loginAccount(database, { loginName: 'tester', password });
    await loginAccount(database, { loginName: 'TESTER', password });
    const sessions = await database.query<{ token_hash: string }>(
      'SELECT token_hash FROM sessions',
    );
    expect(sessions).toHaveLength(2);
    expect(sessions[0].token_hash).toBe(createHash('sha256').update(first.token).digest('hex'));
    expect(sessions.some((s) => s.token_hash === first.token)).toBe(false);
    await expect(
      changePassword(database, first.userId, {
        currentPassword: 'incorrect',
        password: 'next-long-passphrase',
      }),
    ).rejects.toThrow('当前密码');
    expect(await database.query('SELECT token_hash FROM sessions')).toHaveLength(2);
    await changePassword(database, first.userId, {
      currentPassword: password,
      password: 'next-long-passphrase',
    });
    expect(await database.query('SELECT token_hash FROM sessions')).toHaveLength(0);
    await expect(loginAccount(database, { loginName: 'tester', password })).rejects.toThrow(
      '账号或密码',
    );
    expect(
      (await loginAccount(database, { loginName: 'tester', password: 'next-long-passphrase' }))
        .userId,
    ).toBe(first.userId);
  });
  it('returns the same failure for unknown and disabled accounts without creating sessions', async () => {
    await database.query('UPDATE users SET disabled=true');
    const before = await database.query('SELECT token_hash FROM sessions');
    await expect(
      loginAccount(database, { loginName: 'tester', password: 'next-long-passphrase' }),
    ).rejects.toThrow('账号或密码不正确');
    await expect(loginAccount(database, { loginName: 'unknown', password })).rejects.toThrow(
      '账号或密码不正确',
    );
    expect(await database.query('SELECT token_hash FROM sessions')).toEqual(before);
    const audit = JSON.stringify(await database.query('SELECT * FROM audit_logs'));
    expect(audit).not.toContain(password);
    expect(audit).not.toContain('next-long-passphrase');
  });
});
