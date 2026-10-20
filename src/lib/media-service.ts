import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { z } from 'zod';
import { db, type DB } from './db';
import type { User } from './types';
import { AppError } from './validation';
import { audit } from './service';
import {
  postSchema,
  inquirySchema,
  slugSchema,
  postPath,
  PRIVACY_VERSION,
  type Channel,
  type MediaPost,
  type PublicPost,
  type Author,
  type Taxonomy,
  type Topic,
} from './media-model';

// One visibility predicate is shared by lists, search, downloads, recommendations and sitemap.
export const publicMedia =
  "p.deleted_at IS NULL AND p.status IN ('published','scheduled') AND p.published_at<=now()";
const joins =
  ' LEFT JOIN media_authors a ON a.id=p.author_id LEFT JOIN media_categories c ON c.slug=p.category ';
const publicColumns = `p.id,p.slug,p.channel,p.title,p.subtitle,p.summary,p.category,p.tags,p.author_id,
 p.status,p.authenticity,p.source_name,p.source_url,p.sponsored,p.cover_id,p.cover_alt,p.cover_caption,p.cover_style,
 p.seo_title,p.seo_description,p.report_id,p.download_access,p.home_rank,p.featured,p.breaking,
 p.published_at,p.created_at,p.updated_at,p.revision,now() AS observed_at,a.name AS author_name,a.slug AS author_slug,a.bio AS author_bio,c.name AS category_name`;
const summaryDetails =
  "jsonb_build_object('industry',p.details->>'industry','scenario',p.details->>'scenario','technology',p.details->>'technology','company',p.details->>'company','research_type',p.details->>'research_type','person_name',p.details->>'person_name','person_title',p.details->>'person_title','event_start',p.details->>'event_start','event_end',p.details->>'event_end','location',p.details->>'location','event_state',p.details->>'event_state') AS details";
function dates<T>(row: T): T {
  return JSON.parse(JSON.stringify(row));
}
export async function mediaRole(
  user: User | null,
  database?: DB,
): Promise<'admin' | 'editor' | 'author' | null> {
  if (!user || user.disabled) return null;
  const [row] = await (database || (await db())).query<{
    role: string;
    media_role: 'editor' | 'author' | null;
  }>(
    'SELECT u.role,s.role AS media_role FROM users u LEFT JOIN media_staff s ON s.user_id=u.id WHERE u.id=$1 AND NOT u.disabled',
    [user.id],
  );
  return row?.role === 'admin' ? 'admin' : row?.media_role || null;
}
async function staff(user: User, database: DB, editor = false) {
  const role = await mediaRole(user, database);
  if (!role || (editor && role === 'author')) throw new AppError('需要相应的媒体编辑权限', 403);
  return role;
}
export async function mediaList(
  options: {
    channel?: Channel;
    q?: string;
    category?: string;
    tag?: string;
    author?: string;
    topic?: string;
    industry?: string;
    scenario?: string;
    technology?: string;
    page?: number;
    limit?: number;
    featured?: boolean;
    breaking?: boolean;
    home?: boolean;
    popular?: boolean;
  } = {},
) {
  const database = await db(),
    values: unknown[] = [];
  const clauses = [publicMedia];
  const add = (sql: string, value: unknown) => {
    values.push(value);
    clauses.push(sql.replace('?', '$' + values.length));
  };
  if (options.channel) add('p.channel=?', options.channel);
  if (options.q)
    add(
      "(p.title || ' ' || p.summary || ' ' || p.body) ILIKE ?",
      `%${options.q.slice(0, 100).replace(/[\\%_]/g, '\\$&')}%`,
    );
  if (options.category) add('p.category=?', options.category);
  if (options.tag) add('p.tags @> ?::jsonb', JSON.stringify([options.tag]));
  if (options.author) add('a.slug=?', options.author);
  if (options.topic)
    add(
      'EXISTS(SELECT 1 FROM media_topic_posts tp JOIN media_topics t ON t.slug=tp.topic_slug WHERE tp.post_id=p.id AND t.published AND t.slug=?)',
      options.topic,
    );
  for (const key of ['industry', 'scenario', 'technology'] as const)
    if (options[key]) add(`p.details->>'${key}'=?`, options[key]);
  if (options.featured) clauses.push('p.featured');
  if (options.breaking) clauses.push('p.breaking');
  if (options.home) clauses.push('p.home_rank>0');
  const where = clauses.join(' AND ');
  const [{ count }] = await database.query<{ count: number }>(
    `SELECT count(*)::int AS count FROM media_posts p ${joins} WHERE ${where}`,
    values,
  );
  const limit = Math.min(24, Math.max(1, Math.floor(options.limit || 12)));
  const pages = Math.max(1, Math.ceil(count / limit));
  const page = Math.min(pages, Math.max(1, Math.floor(options.page || 1)));
  const rows = await database.query<PublicPost>(
    `SELECT ${publicColumns},'' AS body,${summaryDetails},
    (SELECT count(*)::int FROM media_views v WHERE v.post_id=p.id) AS views
    FROM media_posts p ${joins} WHERE ${where}
    ORDER BY ${options.popular ? 'views DESC,' : ''}${options.home ? 'p.home_rank ASC,' : ''}p.published_at DESC,p.id
    LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
    [...values, limit, (page - 1) * limit],
  );
  return { rows: dates(rows), count, pages, page };
}
export async function mediaPost(slug: string): Promise<PublicPost | null> {
  const [row] = await (
    await db()
  ).query<PublicPost>(
    `SELECT ${publicColumns},p.body,p.details,
    (SELECT count(*)::int FROM media_views v WHERE v.post_id=p.id) AS views
    FROM media_posts p ${joins} WHERE p.slug=$1 AND ${publicMedia}`,
    [slug],
  );
  return row ? dates(row) : null;
}
export async function mediaRedirect(path: string) {
  const [row] = await (
    await db()
  ).query<MediaPost>(
    `SELECT p.channel,p.slug FROM media_redirects r JOIN media_posts p ON p.id=r.post_id WHERE r.old_path=$1 AND ${publicMedia}`,
    [path],
  );
  return row ? postPath(row) : null;
}
export async function mediaTaxonomy() {
  const database = await db();
  const [categories, tags, authors, topics] = await Promise.all([
    database.query<Taxonomy>('SELECT * FROM media_categories ORDER BY name'),
    database.query<Taxonomy>('SELECT * FROM media_tags ORDER BY name'),
    database.query<Author>(
      'SELECT id,slug,name,title,bio,is_example FROM media_authors ORDER BY name',
    ),
    database.query<Topic>('SELECT * FROM media_topics WHERE published ORDER BY title'),
  ]);
  return { categories, tags, authors, topics };
}
export async function caseFilters() {
  return (await db()).query<{ industry: string; scenario: string; technology: string }>(
    `SELECT DISTINCT p.details->>'industry' AS industry,p.details->>'scenario' AS scenario,p.details->>'technology' AS technology FROM media_posts p WHERE p.channel='cases' AND ${publicMedia}`,
  );
}
export async function editorPost(user: User, id: string) {
  const database = await db(),
    role = await staff(user, database);
  const [row] = await database.query<MediaPost>(
    'SELECT * FROM media_posts WHERE id=$1 AND deleted_at IS NULL',
    [z.uuid().parse(id)],
  );
  if (!row) throw new AppError('内容不存在', 404);
  if (role === 'author' && row.owner_id !== user.id) throw new AppError('只能管理自己的内容', 403);
  return dates(row);
}
export async function savePost(user: User, input: unknown) {
  const v = postSchema.parse(input),
    database = await db();
  return database.transaction(async (tx) => {
    const role = await staff(user, tx);
    const old = v.id
      ? (
          await tx.query<MediaPost>(
            'SELECT * FROM media_posts WHERE id=$1 AND deleted_at IS NULL FOR UPDATE',
            [v.id],
          )
        )[0]
      : null;
    if (v.id && !old) throw new AppError('内容不存在', 404);
    if (old && v.revision !== old.revision)
      throw new AppError('内容已被其他编辑更新，请刷新后再编辑', 409);
    if (role === 'author') {
      if (old && old.owner_id !== user.id) throw new AppError('只能管理自己的内容', 403);
      if (
        !['draft', 'review'].includes(v.status) ||
        (old && ['published', 'scheduled'].includes(old.status))
      )
        throw new AppError('作者只能编辑草稿并提交审核，发布需要编辑权限', 403);
      if (
        v.home_rank ||
        v.featured ||
        v.breaking ||
        (v.authenticity !== 'example' && v.authenticity !== 'editorial')
      )
        throw new AppError('推荐与核验需要编辑权限', 403);
      if (
        v.author_id &&
        !(
          await tx.query('SELECT id FROM media_authors WHERE id=$1 AND user_id=$2', [
            v.author_id,
            user.id,
          ])
        ).length
      )
        throw new AppError('不能使用其他作者署名', 403);
    }
    if (v.status === 'scheduled' && (!v.published_at || Date.parse(v.published_at) <= Date.now()))
      throw new AppError('定时发布必须选择未来时间');
    if (v.status === 'published' && v.published_at && Date.parse(v.published_at) > Date.now())
      throw new AppError('未来内容请使用定时发布');
    for (const tag of v.tags)
      if (!(await tx.query('SELECT slug FROM media_tags WHERE slug=$1', [tag])).length)
        throw new AppError('标签不存在，请先创建标签');
    if (
      v.author_id &&
      !(await tx.query('SELECT id FROM media_authors WHERE id=$1', [v.author_id])).length
    )
      throw new AppError('作者不存在');
    if (
      v.category &&
      !(await tx.query('SELECT slug FROM media_categories WHERE slug=$1', [v.category])).length
    )
      throw new AppError('栏目不存在');
    const inlineImages = [...v.body.matchAll(/\/api\/media\/assets\/([a-f0-9-]{36})/gi)].map(
      (m) => [m[1], 'image/'] as const,
    );
    for (const [assetId, mime] of [
      [v.cover_id, 'image/'],
      [v.report_id, 'application/pdf'],
      ...inlineImages,
    ] as const) {
      if (!assetId) continue;
      const [asset] = await tx.query<{ mime: string; owner_id: string }>(
        'SELECT mime,owner_id FROM media_assets WHERE id=$1',
        [assetId],
      );
      if (!asset || !asset.mime.startsWith(mime)) throw new AppError('附件类型不匹配或不存在');
      if (role === 'author' && asset.owner_id !== user.id)
        throw new AppError('不能使用其他作者的未公开附件', 403);
    }
    const id = old?.id || randomUUID(),
      nextPath = postPath(v);
    const [alias] = await tx.query<{ post_id: string }>(
      'SELECT post_id FROM media_redirects WHERE old_path=$1',
      [nextPath],
    );
    if (alias && alias.post_id !== id) throw new AppError('此 URL 是其他文章的历史地址', 409);
    const fields = Object.keys(v).filter(
      (k) => k !== 'id' && k !== 'revision',
    ) as (keyof typeof v)[];
    const values = fields.map((k) =>
      ['tags', 'details'].includes(k) ? JSON.stringify(v[k]) : v[k],
    );
    if (old) {
      await tx.query(
        `UPDATE media_posts SET ${fields.map((k, i) => `${k}=$${i + 2}`).join(',')},revision=revision+1,updated_at=now() WHERE id=$1`,
        [id, ...values],
      );
      if (postPath(old) !== nextPath)
        await tx.query(
          'INSERT INTO media_redirects(old_path,post_id) VALUES($1,$2) ON CONFLICT(old_path) DO NOTHING',
          [postPath(old), id],
        );
    } else {
      await tx.query(
        `INSERT INTO media_posts(id,owner_id,${fields.join(',')}) VALUES($1,$2,${fields.map((_, i) => '$' + (i + 3)).join(',')})`,
        [id, user.id, ...values],
      );
    }
    await tx.query('DELETE FROM media_redirects WHERE old_path=$1 AND post_id=$2', [nextPath, id]);
    await audit(tx, user.id, 'media.save', id, {
      status: v.status,
      revision: (old?.revision || 0) + 1,
    });
    return { id, revision: (old?.revision || 0) + 1, path: nextPath };
  });
}
export async function deletePost(user: User, id: string, revision: number) {
  const database = await db();
  await database.transaction(async (tx) => {
    await staff(user, tx, true);
    const rows = await tx.query(
      'UPDATE media_posts SET deleted_at=now(),revision=revision+1,home_rank=0 WHERE id=$1 AND revision=$2 AND deleted_at IS NULL RETURNING id',
      [z.uuid().parse(id), revision],
    );
    if (!rows.length) throw new AppError('内容已更新或不存在，请刷新', 409);
    await audit(tx, user.id, 'media.delete', id);
  });
}
export async function saveHomeOrder(user: User, input: unknown) {
  const { ids } = z
    .object({
      ids: z
        .array(z.uuid())
        .max(100)
        .refine((v) => new Set(v).size === v.length, '推荐列表不能重复'),
    })
    .parse(input);
  await (
    await db()
  ).transaction(async (tx) => {
    await staff(user, tx, true);
    await tx.query('LOCK TABLE media_posts IN SHARE ROW EXCLUSIVE MODE');
    for (const id of ids)
      if (
        !(await tx.query('SELECT id FROM media_posts WHERE id=$1 AND deleted_at IS NULL', [id]))
          .length
      )
        throw new AppError('推荐内容不存在');
    await tx.query('UPDATE media_posts SET home_rank=0,revision=revision+1 WHERE home_rank>0');
    for (const [i, id] of ids.entries())
      await tx.query(
        'UPDATE media_posts SET home_rank=$2,revision=revision+1,updated_at=now() WHERE id=$1',
        [id, i + 1],
      );
    await audit(tx, user.id, 'media.home', 'home', { ids });
  });
}
export async function saveTaxonomy(user: User, input: unknown) {
  const v = z
    .object({
      kind: z.enum(['category', 'tag', 'author', 'topic']),
      slug: slugSchema,
      name: z.string().trim().min(2).max(100),
      description: z.string().max(3000).default(''),
      id: z.uuid().optional(),
      title: z.string().max(200).default(''),
      user_id: z.uuid().nullable().default(null),
      is_example: z.boolean().default(false),
      published: z.boolean().default(false),
      post_ids: z.array(z.uuid()).max(100).default([]),
    })
    .parse(input);
  await (
    await db()
  ).transaction(async (tx) => {
    await staff(user, tx, true);
    if (v.kind === 'category' || v.kind === 'tag') {
      const table = v.kind === 'category' ? 'media_categories' : 'media_tags';
      await tx.query(
        `INSERT INTO ${table}(slug,name,description) VALUES($1,$2,$3) ON CONFLICT(slug) DO UPDATE SET name=excluded.name,description=excluded.description`,
        [v.slug, v.name, v.description],
      );
    } else if (v.kind === 'author') {
      await tx.query(
        'INSERT INTO media_authors(id,slug,name,title,bio,user_id,is_example) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,name=excluded.name,title=excluded.title,bio=excluded.bio,user_id=excluded.user_id,is_example=excluded.is_example',
        [v.id || randomUUID(), v.slug, v.name, v.title, v.description, v.user_id, v.is_example],
      );
    } else {
      await tx.query(
        'INSERT INTO media_topics(slug,title,description,published) VALUES($1,$2,$3,$4) ON CONFLICT(slug) DO UPDATE SET title=excluded.title,description=excluded.description,published=excluded.published',
        [v.slug, v.name, v.description, v.published],
      );
      await tx.query('DELETE FROM media_topic_posts WHERE topic_slug=$1', [v.slug]);
      for (const id of new Set(v.post_ids))
        await tx.query('INSERT INTO media_topic_posts(topic_slug,post_id) VALUES($1,$2)', [
          v.slug,
          id,
        ]);
    }
    await audit(tx, user.id, 'media.taxonomy', v.slug, { kind: v.kind });
  });
}
export async function grantMediaRole(user: User, input: unknown) {
  const v = z
    .object({ user_id: z.uuid(), role: z.enum(['author', 'editor', 'none']) })
    .parse(input);
  await (
    await db()
  ).transaction(async (tx) => {
    if ((await mediaRole(user, tx)) !== 'admin') throw new AppError('只有管理员可以授权', 403);
    if (!(await tx.query('SELECT id FROM users WHERE id=$1 AND NOT disabled', [v.user_id])).length)
      throw new AppError('用户不存在或已停用');
    if (v.role === 'none') await tx.query('DELETE FROM media_staff WHERE user_id=$1', [v.user_id]);
    else
      await tx.query(
        'INSERT INTO media_staff(user_id,role) VALUES($1,$2) ON CONFLICT(user_id) DO UPDATE SET role=excluded.role',
        [v.user_id, v.role],
      );
    await audit(tx, user.id, 'media.role', v.user_id, { role: v.role });
  });
}
export async function submitInquiry(user: User | null, input: unknown) {
  const v = inquirySchema.parse(input),
    id = randomUUID();
  await (
    await db()
  ).transaction(async (tx) => {
    if (v.post_id) {
      const [p] = await tx.query<MediaPost>(
        `SELECT p.* FROM media_posts p WHERE p.id=$1 AND ${publicMedia} FOR UPDATE`,
        [v.post_id],
      );
      if (
        !p ||
        (v.kind === 'report' && (p.channel !== 'research' || p.download_access !== 'request')) ||
        (v.kind === 'event' && p.channel !== 'events')
      )
        throw new AppError('相关内容不可申请', 404);
      if (v.kind === 'report' && !user) throw new AppError('请先登录以便查看申请与获取资料', 401);
      if (v.kind === 'event') {
        if (p.authenticity === 'example') throw new AppError('示例活动不接受真实报名');
        if (
          p.details.event_state !== 'open' ||
          !p.details.event_end ||
          new Date(p.details.event_end).getTime() <= Date.now()
        )
          throw new AppError('活动报名已结束');
        const [{ count }] = await tx.query<{ count: number }>(
          "SELECT count(*)::int AS count FROM media_inquiries WHERE post_id=$1 AND kind='event' AND status<>'rejected'",
          [p.id],
        );
        if (p.details.capacity && count >= p.details.capacity)
          throw new AppError('活动名额已满', 409);
      }
    }
    const duplicate = await tx.query(
      "SELECT id FROM media_inquiries WHERE kind=$1 AND contact=$2 AND post_id IS NOT DISTINCT FROM $3 AND status IN ('new','contacted')",
      [v.kind, v.contact, v.post_id],
    );
    if (duplicate.length) throw new AppError('已有同类型申请待处理，请勿重复提交', 409);
    await tx.query(
      'INSERT INTO media_inquiries(id,kind,post_id,user_id,name,contact,organization,payload,consent_version) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [
        id,
        v.kind,
        v.post_id,
        user?.id || null,
        v.name,
        v.contact,
        v.organization,
        JSON.stringify(v),
        PRIVACY_VERSION,
      ],
    );
  });
  return { id };
}
export async function updateInquiry(user: User, input: unknown) {
  const v = z
    .object({
      id: z.uuid(),
      status: z.enum(['new', 'contacted', 'completed', 'rejected']),
      note: z.string().max(4000).default(''),
    })
    .parse(input);
  await (
    await db()
  ).transaction(async (tx) => {
    await staff(user, tx, true);
    const rows = await tx.query(
      'UPDATE media_inquiries SET status=$2,note=$3 WHERE id=$1 RETURNING id',
      [v.id, v.status, v.note],
    );
    if (!rows.length) throw new AppError('申请不存在', 404);
    await audit(tx, user.id, 'media.inquiry', v.id, { status: v.status });
  });
}
export async function recordMediaView(id: string, visitor: string) {
  await (
    await db()
  ).query(
    `INSERT INTO media_views(post_id,visitor_hash) SELECT p.id,$2 FROM media_posts p WHERE p.id=$1 AND ${publicMedia} ON CONFLICT DO NOTHING`,
    [z.uuid().parse(id), visitor],
  );
}
export async function subscribe(input: unknown) {
  const v = z.object({ email: z.email().max(254), consent: z.literal(true) }).parse(input);
  const token = randomBytes(32).toString('base64url');
  // A repeat submission does not reactivate someone else's unsubscribed address or rotate their token.
  const rows = await (
    await db()
  ).query(
    'INSERT INTO media_subscriptions(id,email,unsubscribe_hash,consent_version) VALUES($1,$2,$3,$4) ON CONFLICT(email) DO NOTHING RETURNING id',
    [
      randomUUID(),
      v.email.toLowerCase(),
      createHash('sha256').update(token).digest('hex'),
      PRIVACY_VERSION,
    ],
  );
  return { ok: true, unsubscribeToken: rows.length ? token : undefined };
}
export async function unsubscribe(input: unknown) {
  const { token } = z.object({ token: z.string().min(40).max(100) }).parse(input);
  await (
    await db()
  ).query('UPDATE media_subscriptions SET active=false WHERE unsubscribe_hash=$1', [
    createHash('sha256').update(token).digest('hex'),
  ]);
}
