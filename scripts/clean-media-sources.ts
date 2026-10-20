import { readFile, mkdir, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { isDemo } from '../src/lib/config';
import { DEMO_ADMIN } from '../src/lib/seed';
import { validateLibrary } from '../src/lib/media-library';
import {
  cleanMediaSource,
  removedSourcePattern,
  removedCaseUrl,
} from '../src/lib/media-source-cleanup';

type Content = {
  slug: string;
  body: string;
  source_name: string;
  source_url: string;
};
type StoredContent = Content & { id: string; revision: number };
const apply = process.argv.includes('--apply');
const databaseRequested = process.argv.includes('--database');
const ownerArg = process.argv.find((arg) => arg.startsWith('--owner='))?.slice(8);
const file = 'content/media-library.json';
const original = await readFile(file, 'utf8');
const library = JSON.parse(original);
const changes = (post: Content) => {
  const clean = cleanMediaSource(post);
  if (removedSourcePattern.test(JSON.stringify(clean)) || clean.body.includes(removedCaseUrl))
    throw new Error('Unexpected source mention requires editorial review: ' + post.slug);
  return clean.body !== post.body ||
    clean.source_name !== post.source_name ||
    clean.source_url !== post.source_url
    ? clean
    : null;
};
let libraryChanges = 0;
library.posts = library.posts.map((post: Content) => {
  const clean = changes(post);
  if (clean) libraryChanges++;
  return clean || post;
});
validateLibrary(library);

const operation =
  'source-cleanup-' +
  new Date().toISOString().replace(/[:.]/g, '-') +
  '-' +
  randomUUID().slice(0, 8);
const backup = '.data/content-import/' + operation;
async function saveBackup(name: string, data: unknown) {
  await mkdir(backup, { recursive: true, mode: 0o700 });
  await writeFile(
    backup + '/' + name,
    typeof data === 'string' ? data : JSON.stringify(data, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 },
  );
}
let databaseChanges = 0;
if (databaseRequested) {
  if (!isDemo() && !ownerArg)
    throw new Error('Set --owner=<existing admin UUID> for a configured database.');
  const database = await db();
  const ownerId = ownerArg || DEMO_ADMIN;
  await database.transaction(async (tx) => {
    const [owner] = await tx.query<{ role: string; disabled: boolean }>(
      'SELECT role,disabled FROM users WHERE id=$1',
      [ownerId],
    );
    if (!owner || owner.disabled || owner.role !== 'admin')
      throw new Error('Source cleanup requires an active administrator.');
    // Derive edits from current CMS content, not the initialization pack.
    const rows = await tx.query<StoredContent>(
      `SELECT id,slug,body,source_name,source_url,revision FROM media_posts
       WHERE (body || ' ' || source_name) ~* $1 OR body LIKE $2 ORDER BY id FOR UPDATE`,
      ['AI\\s*制造探索营|响哥', '%' + removedCaseUrl + '%'],
    );
    const pending = rows.flatMap((row) => {
      const clean = changes(row);
      return clean ? [{ row, clean }] : [];
    });
    databaseChanges = pending.length;
    if (!apply || !pending.length) return;
    // Keep the removed material in a private, reversible record before any UPDATE.
    await saveBackup(
      'database-before.json',
      pending.map(({ row }) => row),
    );
    for (const { row, clean } of pending) {
      const updated = await tx.query(
        `UPDATE media_posts SET body=$1,source_name=$2,source_url=$3,
         revision=revision+1,updated_at=now() WHERE id=$4 AND revision=$5 RETURNING id`,
        [clean.body, clean.source_name, clean.source_url, row.id, row.revision],
      );
      if (updated.length !== 1) throw new Error('Concurrent edit: ' + row.slug);
    }
    await tx.query(
      'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
      [
        randomUUID(),
        ownerId,
        'media.source.cleanup',
        operation,
        JSON.stringify({ count: pending.length, slugs: pending.map(({ row }) => row.slug) }),
      ],
    );
  });
}
if (apply && libraryChanges) {
  await saveBackup('library-before.json', original);
  const temporary = `${file}.${randomUUID()}.tmp`;
  await writeFile(temporary, JSON.stringify(library, null, 2) + '\n');
  await rename(temporary, file);
}
console.log(
  JSON.stringify(
    {
      mode: apply ? 'apply' : 'dry-run',
      libraryChanges,
      databaseChanges: databaseRequested ? databaseChanges : null,
      backup: apply && (libraryChanges || databaseChanges) ? backup : null,
    },
    null,
    2,
  ),
);
process.exit(0);
