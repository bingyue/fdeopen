import { db } from '../src/lib/db';
import { seed } from '../src/lib/seed';
import { isDemo } from '../src/lib/config';
import { seedMedia } from '../src/lib/media-seed';
await seed(await db(), isDemo());
await seedMedia(await db(), isDemo());
console.log('Catalog seeded without overwriting existing data.');
process.exit(0);
