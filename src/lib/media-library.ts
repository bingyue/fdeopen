import { createHash, randomUUID } from 'node:crypto';
import { z } from 'zod';
import type { DB } from './db';
import { postSchema, slugSchema } from './media-model';

export const libraryId = (key: string) => {
  const h = createHash('sha256')
    .update('fde-library:' + key)
    .digest('hex');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
};
const taxonomy = z.object({ slug: slugSchema, name: z.string().min(1), description: z.string() });
export const librarySchema = z.object({
  version: z.literal(1),
  batch: slugSchema,
  prepared_at: z.iso.date(),
  author: z.object({
    id: z.uuid(),
    slug: slugSchema,
    name: z.string(),
    title: z.string(),
    bio: z.string(),
  }),
  categories: z.array(taxonomy),
  tags: z.array(taxonomy),
  topics: z.array(
    z.object({
      slug: slugSchema,
      title: z.string(),
      description: z.string(),
      published: z.boolean(),
    }),
  ),
  assets: z.array(
    z.object({
      id: z.uuid(),
      file: z.string().regex(/^[a-f0-9-]{36}\.(jpg|png|webp)$/),
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      size: z.number().int().positive().max(10485760),
      mime: z.enum(['image/jpeg', 'image/png', 'image/webp']),
    }),
  ),
  posts: z.array(z.record(z.string(), z.unknown())),
});
export function validateLibrary(raw: unknown) {
  const library = librarySchema.parse(raw);
  const slugs = new Set<string>();
  const assets = new Set(library.assets.map((a) => a.id));
  const categories = new Set(library.categories.map((c) => c.slug));
  const tags = new Set(library.tags.map((t) => t.slug));
  const topics = new Set(library.topics.map((t) => t.slug));
  const posts = library.posts.map((raw) => {
    const value = postSchema.parse({ ...raw, author_id: library.author.id });
    const topic = slugSchema.parse(raw.library_topic);
    if (slugs.has(value.slug)) throw new Error('Duplicate article slug: ' + value.slug);
    slugs.add(value.slug);
    if (
      !value.category ||
      !categories.has(value.category) ||
      value.tags.some((t) => !tags.has(t)) ||
      !topics.has(topic)
    )
      throw new Error('Unknown taxonomy: ' + value.slug);
    const references = [...value.body.matchAll(/\/api\/media\/assets\/([a-f0-9-]{36})/g)].map(
      (m) => m[1],
    );
    if (value.cover_id) references.push(value.cover_id);
    if (references.some((id) => !assets.has(id)))
      throw new Error('Missing article asset: ' + value.slug);
    if (/\/Users\/|file:\/\/|poc_token=|\]\((?:\.\.\/|图片\/)/.test(value.body))
      throw new Error('Private or unresolved reference: ' + value.slug);
    if (
      value.status !== 'published' ||
      !value.published_at ||
      Date.parse(value.published_at) > Date.now()
    )
      throw new Error('Library contains non-public or future article: ' + value.slug);
    return { value, topic };
  });
  return { ...library, posts };
}
export type MediaLibrary = ReturnType<typeof validateLibrary>;

/** Append only. A rerun never overwrites CMS edits, deleted posts, or slug collisions. */
export async function importLibrary(
  database: DB,
  library: MediaLibrary,
  ownerId: string,
  retireExamples = false,
) {
  return database.transaction(async (tx) => {
    const [owner] = await tx.query<{ role: string; disabled: boolean }>(
      'SELECT role,disabled FROM users WHERE id=$1',
      [ownerId],
    );
    if (!owner || owner.disabled || owner.role !== 'admin')
      throw new Error('Content import requires an active administrator owner.');
    for (const table of ['categories', 'tags'] as const)
      for (const item of library[table])
        await tx.query(
          `INSERT INTO media_${table}(slug,name,description) VALUES($1,$2,$3) ON CONFLICT DO NOTHING`,
          [item.slug, item.name, item.description],
        );
    const author = library.author;
    // Do not silently attach articles to a different person with the same slug.
    const [existingAuthor] = await tx.query<{ id: string }>(
      'SELECT id FROM media_authors WHERE slug=$1',
      [author.slug],
    );
    if (existingAuthor && existingAuthor.id !== author.id)
      throw new Error('Editorial author slug collision.');
    await tx.query(
      'INSERT INTO media_authors(id,slug,name,title,bio,is_example) VALUES($1,$2,$3,$4,$5,false) ON CONFLICT DO NOTHING',
      [author.id, author.slug, author.name, author.title, author.bio],
    );
    for (const a of library.assets)
      await tx.query(
        'INSERT INTO media_assets(id,owner_id,filename,mime,size,storage_key) VALUES($1,$2,$3,$4,$5,$3) ON CONFLICT DO NOTHING',
        [a.id, ownerId, a.file, a.mime, a.size],
      );
    for (const t of library.topics)
      await tx.query(
        'INSERT INTO media_topics(slug,title,description,published) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING',
        [t.slug, t.title, t.description, t.published],
      );
    const inserted: string[] = [],
      skipped: string[] = [];
    for (const { value, topic } of library.posts) {
      const id = libraryId(value.slug);
      const fields = Object.keys(value).filter(
        (k) => k !== 'id' && k !== 'revision',
      ) as (keyof typeof value)[];
      const rows = await tx.query(
        `INSERT INTO media_posts(id,owner_id,${fields.join(',')}) VALUES($1,$2,${fields.map((_, i) => '$' + (i + 3)).join(',')}) ON CONFLICT DO NOTHING RETURNING id`,
        [
          id,
          ownerId,
          ...fields.map((k) =>
            ['details', 'tags'].includes(k) ? JSON.stringify(value[k]) : value[k],
          ),
        ],
      );
      if (rows.length) {
        inserted.push(id);
        await tx.query(
          'INSERT INTO media_topic_posts(topic_slug,post_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [topic, id],
        );
      } else skipped.push(value.slug);
    }
    const retired: string[] = [];
    if (retireExamples && inserted.length) {
      // Only untouched stock demo content. Preserve user-edited examples and community data.
      const rows = await tx.query<{ id: string }>(
        `UPDATE media_posts SET status='archived',home_rank=0,featured=false,breaking=false,revision=revision+1,updated_at=now()
        WHERE authenticity='example' AND revision=1 AND owner_id=$1
        AND source_name='本地演示编辑稿（非真实报道）'
        AND author_id IN (SELECT id FROM media_authors WHERE slug='example-editor' AND is_example)
        RETURNING id`,
        [ownerId],
      );
      retired.push(...rows.map((r) => r.id));
      await tx.query(`UPDATE media_topics SET published=false WHERE slug='ai-transformation'
        AND description='示例专题：从工具采用到流程、组织与价值的系统变化。'
        AND NOT EXISTS(SELECT 1 FROM media_topic_posts tp JOIN media_posts p ON p.id=tp.post_id
          WHERE tp.topic_slug='ai-transformation' AND p.status IN ('published','scheduled') AND p.deleted_at IS NULL)`);
    }
    if (inserted.length || retired.length)
      await tx.query(
        'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
        [
          randomUUID(),
          ownerId,
          'media.library.import',
          library.batch,
          JSON.stringify({ inserted, retired, skipped }),
        ],
      );
    return {
      batch: library.batch,
      inserted: inserted.length,
      skipped: skipped.length,
      retired: retired.length,
      insertedIds: inserted,
      retiredIds: retired,
    };
  });
}
