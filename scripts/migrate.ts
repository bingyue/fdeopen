import { db, migrate } from '../src/lib/db';
import { usesSupabase } from '../src/lib/config';
await migrate(await db(), usesSupabase());
console.log('Database migrations applied.');
process.exit(0);
