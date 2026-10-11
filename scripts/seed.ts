import { db } from '../src/lib/db';
import { seed } from '../src/lib/seed';
import { isDemo } from '../src/lib/config';
await seed(await db(), isDemo());
console.log('Catalog seeded without overwriting existing data.');
process.exit(0);
