import 'server-only';
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { db } from './db';
import { isDemo } from './config';
import type { User } from './types';
import { AppError, isModerator } from './validation';
import { githubIdentity, type VerifiedOAuthUser } from './identity';
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function supabase() {
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => jar.set(name, value, options));
          } catch {
            /* refreshed in proxy */
          }
        },
      },
    },
  );
}
// Request-scoped memoization only: never share identity across requests.
export const currentUser = cache(async (): Promise<User | null> => {
  let id: string | undefined;
  if (isDemo()) {
    const token = (await cookies()).get('fdeopen_session')?.value;
    if (!token) return null;
    const rows = await (
      await db()
    ).query<{ user_id: string }>(
      'SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()',
      [hashToken(token)],
    );
    id = rows[0]?.user_id;
  } else {
    const { data, error } = await (await supabase()).auth.getUser();
    if (error || !data.user) return null;
    id = data.user.id;
  }
  if (!id) return null;
  const rows = await (
    await db()
  ).query<User>(
    'SELECT u.id,u.role,u.disabled,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1 AND NOT u.disabled',
    [id],
  );
  return rows[0] || null;
});
export async function requireUser(admin = false) {
  const user = await currentUser();
  if (!user) throw new AppError('请先登录', 401);
  if (admin && !isModerator(user.role)) throw new AppError('此操作需要社区管理权限', 403);
  return user;
}
export async function loginDemo(userId: string) {
  const token = randomBytes(32).toString('base64url');
  await (
    await db()
  ).query(
    "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
    [hashToken(token), userId],
  );
  (await cookies()).set('fdeopen_session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure:
      process.env.NODE_ENV === 'production' &&
      process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https'),
    path: '/',
    maxAge: 604800,
  });
}
export async function syncIdentity(user: VerifiedOAuthUser) {
  const identity = githubIdentity(user);
  await (
    await db()
  ).transaction(async (tx) => {
    await tx.query('INSERT INTO users(id,github_id) VALUES($1,$2) ON CONFLICT(id) DO NOTHING', [
      user.id,
      identity.githubId,
    ]);
    await tx.query(
      'INSERT INTO profiles(user_id,handle,name,github_url) VALUES($1,$2,$3,$4) ON CONFLICT(user_id) DO NOTHING',
      [user.id, identity.handle, identity.name, identity.githubUrl],
    );
    await tx.query('INSERT INTO audit_logs(id,actor_id,action,target_id) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      user.id,
      'auth.login',
      user.id,
    ]);
  });
}
