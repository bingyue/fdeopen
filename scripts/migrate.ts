import { db, migrate } from '../src/lib/db';
import { isDemo } from '../src/lib/config';
await migrate(await db(), !isDemo());
console.log('Database migrations applied.');
process.exit(0);
