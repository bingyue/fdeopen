import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import selection from '../../content/public-cases.json';
import type { DB } from './db';
import { slugSchema, type MediaPost } from './media-model';
import { publicMedia } from './media-service';

export const publicCaseSlugs = z.array(slugSchema).length(20).parse(selection.slugs);
if (new Set(publicCaseSlugs).size !== 20) throw new Error('Duplicate public case selection.');
const selected = new Set(publicCaseSlugs);
const guidePrefixes: Record<string, string> = {
  'caict-2025-reading-guide': 'caict-2025-',
  'datawhale-fde-interview-reading-guide': 'dw-fde-',
};
const caseLink = /\[([^\]\n]+)\]\(\/cases\/([a-z0-9-]+)(?:#[^)\s]+)?\)/g;

/** Apply the same publication and reference policy to source packs and current CMS content. */
export function curateCasePost<
  T extends {
    slug: string;
    channel: string;
    status: string;
    title: string;
    summary: string;
    body: string;
    seo_title?: string;
    seo_description?: string;
    home_rank?: number;
    featured?: boolean;
    breaking?: boolean;
  },
>(post: T): T {
  const result = { ...post };
  if (post.channel === 'cases') {
    if (!selected.has(post.slug) && ['published', 'scheduled'].includes(post.status)) {
      result.status = 'archived';
      result.home_rank = 0;
      result.featured = false;
      result.breaking = false;
    }
    return result;
  }
  const prefix = guidePrefixes[post.slug];
  if (prefix) {
    const count = publicCaseSlugs.filter((slug) => slug.startsWith(prefix)).length;
    const intro = (text: string) =>
      text.replace(
        /本篇将(《.+?》)中已整理的\d+篇案例组织为阅读路径。/,
        `本篇从$1中精选${count}篇公开案例，组织为阅读路径。`,
      );
    const title = (text: string) =>
      text.replace(/35个企业案例/, '精选企业案例').replace(/24个业务现场/, '精选业务现场');
    result.title = title(result.title);
    result.summary = intro(result.summary);
    if (result.seo_title) result.seo_title = title(result.seo_title);
    if (result.seo_description) result.seo_description = intro(result.seo_description);
    result.body = intro(result.body)
      .split('\n')
      .filter((line) => {
        const slug = line.match(/^\| .*?\]\(\/cases\/([a-z0-9-]+)\)/)?.[1];
        return !slug || selected.has(slug);
      })
      .join('\n');
  }
  // Preserve prose when a related case is archived, without leaving a broken link.
  result.body = result.body.replace(caseLink, (link, label: string, slug: string) =>
    selected.has(slug) ? link : label,
  );
  return result;
}

const changedFields = [
  'status',
  'home_rank',
  'featured',
  'breaking',
  'title',
  'summary',
  'body',
  'seo_title',
  'seo_description',
] as const;

export async function curateDatabaseCases(database: DB, ownerId: string, apply = false) {
  return database.transaction(async (tx) => {
    const [owner] = await tx.query<{ role: string; disabled: boolean }>(
      'SELECT role,disabled FROM users WHERE id=$1',
      [ownerId],
    );
    if (!owner || owner.disabled || owner.role !== 'admin')
      throw new Error('Case selection requires an active administrator.');
    // Keep the count and audit snapshot consistent with concurrent CMS writes.
    await tx.query('LOCK TABLE media_posts IN SHARE ROW EXCLUSIVE MODE');
    const available = await tx.query<{ slug: string }>(
      `SELECT p.slug FROM media_posts p WHERE p.channel='cases' AND ${publicMedia}`,
    );
    const visible = new Set(available.map((p) => p.slug));
    const missing = publicCaseSlugs.filter((slug) => !visible.has(slug));
    if (missing.length) throw new Error('Selected cases are not public: ' + missing.join(', '));
    const rows = await tx.query<MediaPost>(
      `SELECT * FROM media_posts WHERE deleted_at IS NULL AND status IN ('published','scheduled') ORDER BY id`,
    );
    const changes = rows.flatMap((before) => {
      const after = curateCasePost(before);
      const fields = changedFields.filter((key) => before[key] !== after[key]);
      return fields.length ? [{ before, after, fields }] : [];
    });
    if (apply && changes.length) {
      for (const { before, after, fields } of changes)
        await tx.query(
          `UPDATE media_posts SET ${fields.map((key, i) => `${key}=$${i + 1}`).join(',')},
           revision=revision+1,updated_at=now() WHERE id=$${fields.length + 1}`,
          [...fields.map((key) => after[key]), before.id],
        );
      await tx.query(
        'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          ownerId,
          'media.cases.curate',
          selection.version,
          JSON.stringify({
            selected: publicCaseSlugs,
            changes: changes.map(({ before, fields }) => ({
              id: before.id,
              slug: before.slug,
              revision: before.revision,
              before: Object.fromEntries(fields.map((key) => [key, before[key]])),
            })),
          }),
        ],
      );
      const [{ count }] = await tx.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM media_posts p WHERE p.channel='cases' AND ${publicMedia}`,
      );
      if (count !== 20) throw new Error('Case selection count mismatch; rolling back.');
    }
    return {
      mode: apply ? 'apply' : 'dry-run',
      selected: publicCaseSlugs.length,
      archived: changes.filter(({ before, after }) => before.status !== after.status).length,
      referencesUpdated: changes.filter(({ before }) => before.channel !== 'cases').length,
      changedSlugs: changes.map(({ before }) => before.slug),
    };
  });
}
