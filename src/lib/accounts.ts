import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import type { DB } from './db';
import { hashPassword, verifyPassword } from './password';
import { AppError } from './validation';

export const loginName = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{2,31}$/, '账号为 3–32 位字母、数字、下划线或短横线');
export const passwordValue = z
  .string()
  .min(12, '密码至少 12 个字符')
  .max(128, '密码最多 128 个字符');
const registration = z.object({
  loginName,
  name: z.string().trim().min(1).max(60),
  password: passwordValue,
  consent: z.literal(true, { error: '请先阅读并同意隐私与社区规则' }),
});
const login = z.object({ loginName, password: z.string().min(1).max(128) });

export async function createAccount(
  database: DB,
  input: unknown,
  role: 'member' | 'admin' = 'member',
  recoveryCode?: string,
) {
  const value = registration.parse(input);
  const passwordHash = await hashPassword(value.password);
  const id = randomUUID();
  await database.transaction(async (tx) => {
    await tx.query('INSERT INTO users(id,role) VALUES($1,$2)', [id, role]);
    await tx.query('INSERT INTO profiles(user_id,handle,name) VALUES($1,$2,$3)', [
      id,
      value.loginName,
      value.name,
    ]);
    await tx.query(
      'INSERT INTO account_credentials(user_id,login_name,password_hash,recovery_hash) VALUES($1,$2,$3,$4)',
      [id, value.loginName, passwordHash, recoveryCode ? recoveryHash(recoveryCode) : null],
    );
    await tx.query(
      'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
      [
        randomUUID(),
        id,
        role === 'admin' ? 'account.bootstrap' : 'account.register',
        id,
        JSON.stringify({ consentVersion: '2026-10-account-v1' }),
      ],
    );
  });
  return id;
}

export async function loginAccount(database: DB, input: unknown) {
  const value = login.parse(input);
  return database.transaction(async (tx) => {
    const [account] = await tx.query<{ user_id: string; password_hash: string; disabled: boolean }>(
      'SELECT c.user_id,c.password_hash,u.disabled FROM account_credentials c JOIN users u ON u.id=c.user_id WHERE c.login_name=$1 FOR UPDATE OF c,u',
      [value.loginName],
    );
    const valid = await verifyPassword(value.password, account?.password_hash);
    if (!valid || !account || account.disabled) throw new AppError('账号或密码不正确', 401);
    const token = randomBytes(32).toString('base64url');
    await tx.query('DELETE FROM sessions WHERE user_id=$1 AND expires_at<=now()', [
      account.user_id,
    ]);
    await tx.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [createHash('sha256').update(token).digest('hex'), account.user_id],
    );
    await tx.query('INSERT INTO audit_logs(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      account.user_id,
      'account.login',
      account.user_id,
    ]);
    const [profile] = await tx.query<{ onboarding_at: string | null }>(
      'SELECT onboarding_at FROM profiles WHERE user_id=$1',
      [account.user_id],
    );
    return { userId: account.user_id, token, needsOnboarding: !profile?.onboarding_at };
  });
}

export async function changePassword(database: DB, userId: string, input: unknown) {
  const value = z
    .object({ currentPassword: z.string().min(1).max(128), password: passwordValue })
    .parse(input);
  const nextHash = await hashPassword(value.password);
  await database.transaction(async (tx) => {
    const [account] = await tx.query<{ password_hash: string; disabled: boolean }>(
      'SELECT c.password_hash,u.disabled FROM account_credentials c JOIN users u ON u.id=c.user_id WHERE c.user_id=$1 FOR UPDATE OF c,u',
      [userId],
    );
    if (
      !(await verifyPassword(value.currentPassword, account?.password_hash)) ||
      !account ||
      account.disabled
    )
      throw new AppError('当前密码不正确', 401);
    await tx.query(
      'UPDATE account_credentials SET password_hash=$1,password_changed_at=now(),recovery_hash=NULL WHERE user_id=$2',
      [nextHash, userId],
    );
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [userId]);
    await tx.query('INSERT INTO audit_logs(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      userId,
      'account.password_changed',
      userId,
    ]);
  });
}

function recoveryHash(code: string) {
  return createHash('sha256').update(code.trim()).digest('hex');
}
export async function registerAccount(database: DB, input: unknown) {
  const recoveryCode = randomBytes(24).toString('hex');
  const userId = await createAccount(database, input, 'member', recoveryCode);
  return { userId, recoveryCode };
}
export async function issueRecoveryCode(database: DB, userId: string, input: unknown) {
  const value = z.object({ currentPassword: z.string().min(1).max(128) }).parse(input);
  return database.transaction(async (tx) => {
    const [account] = await tx.query<{ password_hash: string; disabled: boolean }>(
      'SELECT c.password_hash,u.disabled FROM account_credentials c JOIN users u ON u.id=c.user_id WHERE c.user_id=$1 FOR UPDATE OF c,u',
      [userId],
    );
    if (
      !(await verifyPassword(value.currentPassword, account?.password_hash)) ||
      !account ||
      account.disabled
    )
      throw new AppError('当前密码不正确', 401);
    const recoveryCode = randomBytes(24).toString('hex');
    await tx.query('UPDATE account_credentials SET recovery_hash=$1 WHERE user_id=$2', [
      recoveryHash(recoveryCode),
      userId,
    ]);
    await tx.query('INSERT INTO audit_logs(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      userId,
      'account.recovery_issued',
      userId,
    ]);
    return { recoveryCode };
  });
}
export async function recoverAccount(database: DB, input: unknown) {
  const value = z
    .object({ loginName, recoveryCode: z.string().trim().min(1).max(128), password: passwordValue })
    .parse(input);
  await database.transaction(async (tx) => {
    const [account] = await tx.query<{
      user_id: string;
      recovery_hash: string | null;
      disabled: boolean;
    }>(
      'SELECT c.user_id,c.recovery_hash,u.disabled FROM account_credentials c JOIN users u ON u.id=c.user_id WHERE c.login_name=$1 FOR UPDATE OF c,u',
      [value.loginName],
    );
    const supplied = Buffer.from(recoveryHash(value.recoveryCode), 'hex');
    const stored = Buffer.from(account?.recovery_hash || '0'.repeat(64), 'hex');
    if (!timingSafeEqual(supplied, stored) || !account?.recovery_hash || account.disabled)
      throw new AppError('账号或恢复码不正确，或恢复码已失效', 401);
    const hash = await hashPassword(value.password);
    await tx.query(
      'UPDATE account_credentials SET password_hash=$1,password_changed_at=now(),recovery_hash=NULL WHERE user_id=$2',
      [hash, account.user_id],
    );
    await tx.query('DELETE FROM sessions WHERE user_id=$1', [account.user_id]);
    await tx.query('INSERT INTO audit_logs(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      account.user_id,
      'account.recovered',
      account.user_id,
    ]);
  });
}
