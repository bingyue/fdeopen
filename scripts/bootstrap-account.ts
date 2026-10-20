import { db, migrate } from '../src/lib/db';
import { isLocalAuth } from '../src/lib/config';
import { createAccount, loginName } from '../src/lib/accounts';

if (!isLocalAuth()) throw new Error('Bootstrap is only available in APP_MODE=postgres.');
const name = loginName.parse(process.env.BOOTSTRAP_ADMIN_LOGIN);
const database = await db();
await migrate(database);
const [existing] = await database.query<{ user_id: string; role: string }>(
  'SELECT c.user_id,u.role FROM account_credentials c JOIN users u ON u.id=c.user_id WHERE c.login_name=$1',
  [name],
);
if (existing) {
  if (existing.role !== 'admin')
    throw new Error('Existing account is not an administrator; refusing automatic promotion.');
  console.log(`Existing administrator: ${existing.user_id}`);
} else {
  const id = await createAccount(
    database,
    {
      loginName: name,
      name: 'FDE前线编辑部',
      password: process.env.BOOTSTRAP_ADMIN_PASSWORD,
      consent: true,
    },
    'admin',
  );
  console.log(`Administrator created: ${id}`);
}
process.exit(0);
