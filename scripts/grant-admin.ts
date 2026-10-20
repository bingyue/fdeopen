import { z } from 'zod';
import { db } from '../src/lib/db';
import { audit } from '../src/lib/service';
const id = z.uuid().parse(process.argv[2]);
if (!process.argv.includes('--confirm'))
  throw new Error(
    'Use npm run admin:grant -- USER_UUID --confirm after verifying the user identity.',
  );
const database = await db();
const [user] = await database.query<{ id: string; handle: string; name: string }>(
  'SELECT u.id,p.handle,p.name FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
  [id],
);
if (!user) throw new Error('User not found. Create or sign in to the account first.');
await database.transaction(async (tx) => {
  await tx.query("UPDATE users SET role='admin',disabled=false WHERE id=$1", [id]);
  await audit(tx, id, 'admin.bootstrap', id, { handle: user.handle });
});
console.log(`Administrator granted to ${user.name} (${user.handle}).`);
process.exit(0);
