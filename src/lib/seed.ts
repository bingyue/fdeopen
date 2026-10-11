import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import type { DB } from './db';
import type { Resource, Collection } from './types';
export const DEMO_MEMBER = '00000000-0000-4000-8000-000000000001';
export const DEMO_ADMIN = '00000000-0000-4000-8000-000000000002';
export async function seed(database: DB, demo = false) {
  if ((await database.query("SELECT key FROM site_settings WHERE key='seed_v1'")).length) return;
  const data = JSON.parse(await readFile(process.cwd() + '/content/catalog.json', 'utf8')) as {
    resources: Resource[];
    collections: (Collection & { slugs: string[] })[];
  };
  await database.transaction(async (tx) => {
    if (demo)
      for (const [id, role, handle, name, bio, tags] of [
        [
          DEMO_MEMBER,
          'member',
          'demo-builder',
          '示例开发者',
          '本地演示身份，用于体验收藏、投稿和共创流程。',
          ['RAG', 'Agent'],
        ],
        [
          DEMO_ADMIN,
          'admin',
          'demo-editor',
          '示例社区编辑',
          '本地演示管理员，审核操作会记录在操作日志。',
          ['社区运营', '开源'],
        ],
      ] as const) {
        await tx.query('INSERT INTO users(id,role) VALUES($1,$2) ON CONFLICT DO NOTHING', [
          id,
          role,
        ]);
        await tx.query(
          'INSERT INTO profiles(user_id,handle,name,bio,tags,public,is_demo,availability) VALUES($1,$2,$3,$4,$5,true,true,$6) ON CONFLICT DO NOTHING',
          [id, handle, name, bio, JSON.stringify(tags), '欢迎参与开源共建'],
        );
      }
    for (const r of data.resources) {
      await tx.query(
        'INSERT INTO resources(id,slug,kind,title,summary,category,tags,body,metadata,source_url,source_author,license,provenance,status,featured) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT DO NOTHING',
        [
          r.id,
          r.slug,
          r.kind,
          r.title,
          r.summary,
          r.category,
          JSON.stringify(r.tags),
          r.kind === 'article' && r.metadata.articleFile
            ? await readFile(process.cwd() + '/content/articles/' + r.metadata.articleFile, 'utf8')
            : r.body,
          JSON.stringify(r.metadata),
          r.source_url,
          r.source_author,
          r.license,
          r.provenance,
          r.status,
          r.featured,
        ],
      );
    }
    for (const r of data.resources)
      for (const slug of r.metadata.relatedSlugs || []) {
        const target = data.resources.find((x) => x.slug === slug);
        if (target)
          await tx.query(
            'INSERT INTO scenario_relations(source_id,target_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
            [r.id, target.id],
          );
      }
    for (const c of data.collections) {
      await tx.query(
        'INSERT INTO collections(id,slug,title,summary,theme) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
        [c.id, c.slug, c.title, c.summary, c.theme],
      );
      for (const slug of c.slugs) {
        const r = data.resources.find((r) => r.slug === slug);
        if (r)
          await tx.query(
            'INSERT INTO collection_items(collection_id,resource_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
            [c.id, r.id],
          );
      }
    }
    for (const cat of [
      'RAG',
      'Agent',
      'MCP',
      'Skills',
      'Workflow',
      'AI Coding',
      'Browser Automation',
      'AI Infra',
      '行业AI应用',
    ])
      await tx.query(
        'INSERT INTO project_categories(slug,name) VALUES($1,$1) ON CONFLICT DO NOTHING',
        [cat],
      );
    await tx.query(
      "INSERT INTO site_settings(key,value) VALUES('home',$1) ON CONFLICT DO NOTHING",
      [
        JSON.stringify({
          announcement: '100 个企业 AI 开源实战项目共建计划 · 从一次贡献开始',
          showLab: true,
          showTasks: true,
          showDevelopers: true,
        }),
      ],
    );
    await tx.query(
      "INSERT INTO site_settings(key,value) VALUES('seed_v1','true') ON CONFLICT DO NOTHING",
    );
    await tx.query('INSERT INTO audit_logs(id,action,target_id,details) VALUES($1,$2,$3,$4)', [
      randomUUID(),
      'seed',
      'catalog',
      JSON.stringify({ resources: data.resources.length, collections: 5, demo }),
    ]);
  });
}
