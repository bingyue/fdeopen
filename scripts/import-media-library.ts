import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { db } from '../src/lib/db';
import { isDemo } from '../src/lib/config';
import { DEMO_ADMIN } from '../src/lib/seed';
import { validateLibrary, importLibrary } from '../src/lib/media-library';

const apply = process.argv.includes('--apply');
const ownerArg = process.argv.find((a) => a.startsWith('--owner='))?.slice(8);
const library = validateLibrary(JSON.parse(await readFile('content/media-library.json', 'utf8')));
const upload = path.resolve(process.env.MEDIA_UPLOAD_DIR || '.data/uploads');
// Validate every immutable asset before opening a database or changing files.
for (const asset of library.assets) {
  const bytes = await readFile(path.join('content/media-library-assets', asset.file));
  if (
    bytes.length !== asset.size ||
    createHash('sha256').update(bytes).digest('hex') !== asset.sha256
  )
    throw new Error('Asset integrity mismatch: ' + asset.file);
  const valid =
    asset.mime === 'image/png'
      ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : asset.mime === 'image/jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : bytes.subarray(0, 4).toString() === 'RIFF' && bytes.subarray(8, 12).toString() === 'WEBP';
  if (!valid) throw new Error('Asset signature mismatch: ' + asset.file);
}
const counts = Object.fromEntries(
  ['cases', 'features', 'insights', 'research'].map((c) => [
    c,
    library.posts.filter((p) => p.value.channel === c).length,
  ]),
);
const publication = {
  published: library.posts.filter((p) => p.value.status === 'published').length,
  archived: library.posts.filter((p) => p.value.status === 'archived').length,
};
if (!apply) {
  console.log(
    JSON.stringify(
      {
        mode: 'dry-run',
        articles: library.posts.length,
        assets: library.assets.length,
        channels: counts,
        publication,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
if (!isDemo() && !ownerArg)
  throw new Error('Set --owner=<existing admin UUID> for a configured database.');
const database = await db();
await mkdir(upload, { recursive: true });
for (const asset of library.assets) {
  const bytes = await readFile(path.join('content/media-library-assets', asset.file));
  const destination = path.join(upload, asset.file);
  try {
    await writeFile(destination, bytes, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error;
    const existing = await readFile(destination);
    if (createHash('sha256').update(existing).digest('hex') !== asset.sha256)
      throw new Error('Existing upload differs: ' + asset.file);
  }
}
const result = await importLibrary(
  database,
  library,
  ownerArg || DEMO_ADMIN,
  process.argv.includes('--retire-examples'),
);
await mkdir('.data/content-import', { recursive: true });
await writeFile(
  '.data/content-import/import-' + Date.now() + '.json',
  JSON.stringify(result, null, 2) + '\n',
);
console.log(
  JSON.stringify(
    { ...result, insertedIds: undefined, retiredIds: undefined, channels: counts, publication },
    null,
    2,
  ),
);
process.exit(0);
