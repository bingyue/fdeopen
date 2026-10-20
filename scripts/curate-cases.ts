import { readFile, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { isDemo } from '../src/lib/config';
import { DEMO_ADMIN } from '../src/lib/seed';
import { validateLibrary } from '../src/lib/media-library';
import { curateCasePost, curateDatabaseCases, publicCaseSlugs } from '../src/lib/case-selection';

const apply = process.argv.includes('--apply');
if (process.argv.includes('--database')) {
  const owner = process.argv.find((arg) => arg.startsWith('--owner='))?.slice(8);
  if (!isDemo() && !owner) throw new Error('Set --owner=<existing admin UUID>.');
  console.log(
    JSON.stringify(await curateDatabaseCases(await db(), owner || DEMO_ADMIN, apply), null, 2),
  );
} else {
  const file = 'content/media-library.json';
  const original = await readFile(file, 'utf8');
  const pack = JSON.parse(original);
  const library = validateLibrary(pack);
  const cases = library.posts.filter((p) => p.value.channel === 'cases');
  for (const slug of publicCaseSlugs)
    if (!cases.some((p) => p.value.slug === slug && p.value.status === 'published'))
      throw new Error('Missing published case in library: ' + slug);
  pack.posts = pack.posts.map((post: Parameters<typeof curateCasePost>[0]) => curateCasePost(post));
  const validated = validateLibrary(pack);
  const visible = validated.posts.filter(
    (p) => p.value.channel === 'cases' && p.value.status === 'published',
  );
  if (visible.length !== 20) throw new Error('Expected exactly 20 published cases.');
  if (apply) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(pack, null, 2) + '\n');
    await rename(temporary, file);
  }
  console.log(
    JSON.stringify(
      {
        mode: apply ? 'apply' : 'dry-run',
        publicCases: visible.length,
        archivedCases: cases.length - visible.length,
      },
      null,
      2,
    ),
  );
}
process.exit(0);
