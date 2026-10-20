import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { isLocalAuth } from '../src/lib/config';
import { loginName, passwordValue } from '../src/lib/accounts';
import { hashPassword } from '../src/lib/password';

if (!isLocalAuth() || !process.argv.includes('--confirm'))
  throw new Error('Requires APP_MODE=postgres and --confirm after verifying account ownership.');
const name = loginName.parse(process.env.RESET_ACCOUNT_LOGIN);
const password = passwordValue.parse(process.env.RESET_ACCOUNT_PASSWORD);
const hash = await hashPassword(password);
await (
  await db()
).transaction(async (tx) => {
  const [user] = await tx.query<{ user_id: string }>(
    'SELECT user_id FROM account_credentials WHERE login_name=$1 FOR UPDATE',
    [name],
  );
  if (!user) throw new Error('Account not found.');
  await tx.query(
    'UPDATE account_credentials SET password_hash=$1,password_changed_at=now() WHERE user_id=$2',
    [hash, user.user_id],
  );
  await tx.query('DELETE FROM sessions WHERE user_id=$1', [user.user_id]);
  await tx.query('INSERT INTO audit_logs(id,action,target_id) VALUES($1,$2,$3)', [
    randomUUID(),
    'account.operator_password_reset',
    user.user_id,
  ]);
});
console.log('Password reset; all sessions revoked.');
process.exit(0);
