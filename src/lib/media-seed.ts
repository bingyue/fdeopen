import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { DB } from './db';
import { postSchema } from './media-model';
import { DEMO_ADMIN } from './seed';
function stableId(value: string) {
  const s = createHash('sha256')
    .update('fde-media:' + value)
    .digest('hex');
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-8${s.slice(17, 20)}-${s.slice(20, 32)}`;
}
export async function seedMedia(database: DB, demo = false) {
  await database.transaction(async (tx) => {
    for (const [slug, name, description] of [
      ['transformation', '企业 AI 转型', '从业务问题到持续运营'],
      ['agents', '智能体产业', '技术、产品与应用边界'],
      ['engineering', 'FDE 与工程交付', '走进一线，构建可靠系统'],
      ['management', '组织与管理', '理解组织协作和价值创造'],
    ])
      await tx.query(
        'INSERT INTO media_categories(slug,name,description) VALUES($1,$2,$3) ON CONFLICT DO NOTHING',
        [slug, name, description],
      );
    for (const [slug, name] of [
      ['enterprise-ai', '企业 AI'],
      ['agents', '智能体'],
      ['fde', 'FDE'],
      ['organization', '组织变革'],
      ['rag', 'RAG'],
    ])
      await tx.query('INSERT INTO media_tags(slug,name) VALUES($1,$2) ON CONFLICT DO NOTHING', [
        slug,
        name,
      ]);
  });
  if (!demo) return;
  const examples: unknown[] = JSON.parse(
    await readFile(process.cwd() + '/content/media-demo.json', 'utf8'),
  );
  await database.transaction(async (tx) => {
    const marker = await tx.query(
      "INSERT INTO site_settings(key,value) VALUES('media_seed_v1','true') ON CONFLICT DO NOTHING RETURNING key",
    );
    if (!marker.length) return;
    const authorId = stableId('example-editor');
    await tx.query(
      'INSERT INTO media_authors(id,slug,name,title,bio,user_id,is_example) VALUES($1,$2,$3,$4,$5,$6,true) ON CONFLICT DO NOTHING',
      [
        authorId,
        'example-editor',
        'FDE前线 · 示例编辑部',
        '示例内容作者',
        '用于本地演示的编辑身份，不代表已核实的真实作者、专家或机构。',
        DEMO_ADMIN,
      ],
    );
    for (const [index, item] of examples.entries()) {
      const value = postSchema.parse({
        ...(item as object),
        author_id: authorId,
        status: 'published',
        authenticity: 'example',
        source_name: '本地演示编辑稿（非真实报道）',
        published_at: new Date(Date.now() - index * 3600000).toISOString(),
      });
      const fields = Object.keys(value).filter(
        (k) => k !== 'id' && k !== 'revision',
      ) as (keyof typeof value)[];
      await tx.query(
        `INSERT INTO media_posts(id,owner_id,${fields.join(',')}) VALUES($1,$2,${fields.map((_, i) => '$' + (i + 3)).join(',')}) ON CONFLICT DO NOTHING`,
        [
          stableId(value.slug),
          DEMO_ADMIN,
          ...fields.map((k) =>
            ['details', 'tags'].includes(k) ? JSON.stringify(value[k]) : value[k],
          ),
        ],
      );
    }
    await tx.query(
      "INSERT INTO media_topics(slug,title,description,published) VALUES('ai-transformation','企业 AI 转型进行时','示例专题：从工具采用到流程、组织与价值的系统变化。',true) ON CONFLICT DO NOTHING",
    );
    await tx.query(
      "INSERT INTO media_topic_posts(topic_slug,post_id) SELECT 'ai-transformation',id FROM media_posts WHERE owner_id=$1 AND channel IN ('features','insights','research') ON CONFLICT DO NOTHING",
      [DEMO_ADMIN],
    );
  });
}
