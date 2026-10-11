import { db } from './db';
import { cache } from 'react';
import { positiveInteger } from './pagination';
import type { Resource, ResourceSummary, Kind, Profile, Collection } from './types';
export type Filters = {
  q?: string;
  category?: string;
  license?: string;
  language?: string;
  sort?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
};
// Card queries deliberately exclude full bodies, README and private/internal metadata.
export const summaryColumns = `r.id,r.slug,r.kind,r.title,r.summary,r.category,r.tags,
  r.source_url,r.source_author,r.license,r.provenance,r.status,r.featured,r.owner_id,r.created_at,r.updated_at,
  jsonb_strip_nulls(jsonb_build_object('stars',r.metadata->'stars','language',r.metadata->'language',
    'checkedAt',r.metadata->'checkedAt','version',r.metadata->'version','industry',r.metadata->'industry',
    'difficulty',r.metadata->'difficulty','state',r.metadata->'state')) metadata`;
function resourceQuery(kind?: Kind, f: Filters = {}) {
  const where = ["r.status='published'"];
  const params: unknown[] = [];
  function add(sql: string, value: unknown) {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  }
  if (kind) add('r.kind=?', kind);
  if (f.q?.trim()) {
    const p = `$${params.length + 1}`;
    // Treat user-entered SQL wildcard characters literally.
    params.push(
      `%${f.q
        .trim()
        .slice(0, 100)
        .replace(/[\\%_]/g, '\\$&')}%`,
    );
    where.push(
      `(r.title ILIKE ${p} OR r.summary ILIKE ${p} OR r.tags::text ILIKE ${p} OR r.category ILIKE ${p} OR r.body ILIKE ${p})`,
    );
  }
  if (f.category) add('r.category=?', f.category);
  if (f.license) add('r.license=?', f.license);
  if (f.language) add("r.metadata->>'language'=?", f.language);
  if (f.featured) where.push('r.featured=true');
  const sorts: Record<string, string> = {
    newest: 'r.created_at DESC,r.title,r.id',
    stars:
      "CASE WHEN r.metadata->>'stars' ~ '^[0-9]+$' THEN (r.metadata->>'stars')::numeric ELSE 0 END DESC,r.title,r.id",
    active: "COALESCE(r.metadata->>'pushedAt','') DESC,r.title,r.id",
    popular: 'bookmark_count DESC,r.featured DESC,r.title,r.id',
  };
  const sort = Object.hasOwn(sorts, f.sort || '')
    ? sorts[f.sort!]
    : 'r.featured DESC,r.created_at,r.title,r.id';
  const counts =
    f.sort === 'popular'
      ? ',(SELECT count(*)::int FROM bookmarks b WHERE b.resource_id=r.id) bookmark_count'
      : '';
  return { where: where.join(' AND '), params, sort, counts };
}
export async function listResources(kind?: Kind, f: Filters = {}) {
  const database = await db();
  const { where, params, sort, counts } = resourceQuery(kind, f);
  const [{ count }] = await database.query<{ count: number }>(
    `SELECT count(*)::int count FROM resources r WHERE ${where}`,
    params,
  );
  const limit = positiveInteger(f.limit, 12, 100);
  const pages = Math.ceil(count / limit);
  const page = Math.min(positiveInteger(f.page), Math.max(1, pages));
  const rows = await database.query<ResourceSummary>(
    `SELECT ${summaryColumns}${counts} FROM resources r WHERE ${where} ORDER BY ${sort} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit],
  );
  return { rows, count, page, pages };
}
// Homepage sections need a small slice, not a count of the entire catalog.
export async function resourcePreview(kind: Kind, f: Filters = {}) {
  const { where, params, sort, counts } = resourceQuery(kind, f);
  return (await db()).query<ResourceSummary>(
    `SELECT ${summaryColumns}${counts} FROM resources r WHERE ${where} ORDER BY ${sort} LIMIT $${params.length + 1}`,
    [...params, positiveInteger(f.limit, 3, 12)],
  );
}
export const getResource = cache(async (slug: string) => {
  return (
    (
      await (
        await db()
      ).query<Resource>("SELECT * FROM resources WHERE slug=$1 AND status='published'", [slug])
    )[0] || null
  );
});
export async function relatedResources(id: string) {
  return (await db()).query<ResourceSummary>(
    `SELECT ${summaryColumns} FROM resources r WHERE r.status='published' AND r.id IN (SELECT target_id FROM scenario_relations WHERE source_id=$1 UNION SELECT source_id FROM scenario_relations WHERE target_id=$1) ORDER BY r.kind,r.title`,
    [id],
  );
}
export async function filterOptions(kind: Kind) {
  const rows = await (
    await db()
  ).query<{ category: string; license: string; language: string }>(
    "SELECT DISTINCT category,license,metadata->>'language' language FROM resources WHERE kind=$1 AND status='published'",
    [kind],
  );
  return {
    categories: [...new Set(rows.map((r) => r.category))].sort(),
    licenses: [...new Set(rows.map((r) => r.license).filter(Boolean))].sort(),
    languages: [...new Set(rows.map((r) => r.language).filter(Boolean))].sort(),
  };
}
export async function collections() {
  return (await db()).query<Collection>(
    'SELECT * FROM collections WHERE published ORDER BY created_at,title',
  );
}
export const collection = cache(async (slug: string) => {
  const c = (
    await (
      await db()
    ).query<Collection>('SELECT * FROM collections WHERE slug=$1 AND published', [slug])
  )[0];
  if (!c) return null;
  return {
    ...c,
    resources: await (
      await db()
    ).query<ResourceSummary>(
      `SELECT ${summaryColumns} FROM resources r JOIN collection_items i ON i.resource_id=r.id WHERE i.collection_id=$1 AND r.status='published' ORDER BY r.kind,r.title`,
      [c.id],
    ),
  };
});
export async function developers() {
  return await (
    await db()
  ).query<Profile>(
    'SELECT user_id,handle,name,bio,tags,github_url,availability,is_demo,portfolio FROM profiles WHERE public AND user_id IN (SELECT id FROM users WHERE NOT disabled) ORDER BY created_at LIMIT 100',
  );
}
export const developer = cache(async (handle: string) => {
  const p = (
    await (
      await db()
    ).query<Profile>(
      "SELECT p.user_id,p.handle,p.name,p.bio,p.tags,p.github_url,p.availability,p.is_demo,p.portfolio,CASE WHEN p.contact_public THEN p.contact ELSE '' END contact FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.handle=$1 AND p.public AND NOT u.disabled",
      [handle],
    )
  )[0];
  if (!p) return null;
  return {
    ...p,
    resources: await (
      await db()
    ).query<ResourceSummary>(
      `SELECT ${summaryColumns} FROM resources r WHERE r.owner_id=$1 AND r.status='published'`,
      [p.user_id],
    ),
    contributions: await (
      await db()
    ).query<{ id: string; title: string; pr_url: string; created_at: string }>(
      'SELECT id,title,pr_url,created_at FROM contributions WHERE user_id=$1 ORDER BY created_at DESC',
      [p.user_id],
    ),
  };
});
export async function homeSettings() {
  return (
    (
      await (
        await db()
      ).query<{
        value: {
          announcement: string;
          showLab: boolean;
          showTasks: boolean;
          showDevelopers: boolean;
        };
      }>("SELECT value FROM site_settings WHERE key='home'")
    )[0]?.value || {
      announcement: '100 个企业 AI 开源实战项目共建计划',
      showLab: true,
      showTasks: true,
      showDevelopers: true,
    }
  );
}
