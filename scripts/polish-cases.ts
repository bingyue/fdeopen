import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { isDemo } from '../src/lib/config';
import { DEMO_ADMIN } from '../src/lib/seed';
import { polishCase, polishDatabaseCases, type EditorialFields } from '../src/lib/case-editorial';
import { validateLibrary } from '../src/lib/media-library';
const apply = process.argv.includes('--apply');
if (process.argv.includes('--database')) {
  const owner = process.argv.find((a) => a.startsWith('--owner='))?.slice(8);
  if (!owner && !isDemo()) throw new Error('Provide --owner=<existing admin UUID>');
  console.log(
    JSON.stringify(await polishDatabaseCases(await db(), owner || DEMO_ADMIN, apply), null, 2),
  );
} else {
  const file = 'content/media-library.json',
    pack = JSON.parse(await readFile(file, 'utf8'));
  pack.posts = pack.posts.map((p: EditorialFields & { slug: string }) => polishCase(p));
  validateLibrary(pack);
  if (apply) {
    const tmp = file + '.' + randomUUID() + '.tmp';
    await writeFile(tmp, JSON.stringify(pack, null, 2) + '\n');
    await rename(tmp, file);
  }
  console.log(
    '20 case editorial patches verified; ' + (apply ? 'pack saved' : 'no changes written'),
  );
}
process.exit(0);
