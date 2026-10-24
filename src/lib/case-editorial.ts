import { createHash, randomUUID } from 'node:crypto';
import editorial from '../../content/case-editorial-20261025.json';
import { postSchema } from './media-model';
import type { DB } from './db';
import { publicMedia } from './media-service';
export type EditorialFields = {
  title: string;
  summary: string;
  body: string;
  details: Record<string, string | undefined>;
};
export function editorialDigest(value: EditorialFields) {
  const details = Object.fromEntries(
    Object.entries(value.details)
      .filter(
        ([k, v]) =>
          v !== '' &&
          v != null &&
          !(k === 'research_type' && v === 'article') &&
          !(k === 'event_state' && v === 'closed') &&
          !(k === 'capacity' && Number(v) === 0),
      )
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  // Fixed canonical key ordering matches both source JSON and database jsonb.
  return createHash('sha256')
    .update(
      JSON.stringify({ body: value.body, details, summary: value.summary, title: value.title }),
    )
    .digest('hex');
}
export const editorialPatches = editorial.patches;
export function polishCase<T extends EditorialFields & { slug: string }>(post: T): T {
  const patch = editorial.patches.find((p) => p.slug === post.slug);
  if (!patch) return post;
  const current = editorialDigest(post);
  if (current === editorialDigest(patch.after)) return post;
  if (current !== patch.beforeDigest)
    throw new Error('Case changed since review; preserve and review CMS edits: ' + post.slug);
  return { ...post, ...patch.after };
}
export async function polishDatabaseCases(database: DB, owner: string, apply = false) {
  return database.transaction(async (tx) => {
    const admin = await tx.query(
      "SELECT id FROM users WHERE id=$1 AND role='admin' AND NOT disabled",
      [owner],
    );
    if (!admin.length) throw new Error('Active administrator required');
    const changes = [];
    for (const patch of editorial.patches) {
      const [row] = await tx.query<
        EditorialFields & { id: string; slug: string; revision: number }
      >(`SELECT p.* FROM media_posts p WHERE p.slug=$1 AND ${publicMedia} FOR UPDATE`, [
        patch.slug,
      ]);
      if (!row) throw new Error('Selected case is not public: ' + patch.slug);
      const updated = polishCase(row);
      if (updated === row) continue;
      // Validate the complete post before changing only reviewed editorial fields.
      const parsed = postSchema.parse(JSON.parse(JSON.stringify(updated)));
      changes.push({
        slug: row.slug,
        id: row.id,
        revision: row.revision,
        before: { title: row.title, summary: row.summary, body: row.body, details: row.details },
      });
      if (apply)
        await tx.query(
          'UPDATE media_posts SET title=$2,summary=$3,body=$4,details=$5,revision=revision+1,updated_at=now() WHERE id=$1',
          [row.id, parsed.title, parsed.summary, parsed.body, JSON.stringify(parsed.details)],
        );
    }
    if (apply && changes.length)
      await tx.query(
        'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
        [randomUUID(), owner, 'media.cases.polish', '2026-10-25', JSON.stringify({ changes })],
      );
    return {
      mode: apply ? 'apply' : 'dry-run',
      updated: changes.length,
      slugs: changes.map((c) => c.slug),
    };
  });
}
