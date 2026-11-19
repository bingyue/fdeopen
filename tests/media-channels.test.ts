import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { PGlite } from '@electric-sql/pglite';
import { expect, it, vi } from 'vitest';
import { liteAdapter, migrate } from '../src/lib/db';
import * as databaseModule from '../src/lib/db';
import * as config from '../src/lib/config';
import { channels, isChannel, postSchema } from '../src/lib/media-model';
import { readingList } from '../src/lib/reading';
import sitemap from '../src/app/sitemap';

it('merges existing articles and retires people/events with their dependent records', async () => {
  const pg = new PGlite();
  const database = liteAdapter(pg);
  try {
    // Recreate the pre-upgrade schema so this exercises an actual data migration.
    await database.query('CREATE TABLE schema_migrations(version text PRIMARY KEY)');
    const directory = 'supabase/migrations';
    for (const file of (await readdir(directory)).sort()) {
      if (!file.endsWith('.sql') || file === '002_rls.sql' || file >= '011_media_channels.sql')
        continue;
      for (const statement of (await readFile(`${directory}/${file}`, 'utf8')).split(';'))
        if (statement.trim()) await database.query(statement);
      await database.query('INSERT INTO schema_migrations VALUES($1)', [file]);
    }
    const userId = randomUUID();
    await database.query('INSERT INTO users(id) VALUES($1)', [userId]);
    await database.query("INSERT INTO media_topics(slug,title) VALUES('migration-topic','专题')");
    const posts = Object.fromEntries(
      ['features', 'insights', 'cases', 'research', 'people', 'events'].map((c) => [
        c,
        randomUUID(),
      ]),
    );
    for (const [channel, id] of Object.entries(posts)) {
      await database.query(
        `INSERT INTO media_posts(id,slug,channel,title,body,owner_id,status,published_at,revision,details)
         VALUES($1,$2,$2,$2,'保留完整正文',$3,'published',now(),3,'{"company":"保留企业","event_state":"closed","person_name":"旧字段"}')`,
        [id, channel, userId],
      );
      await database.query('INSERT INTO media_bookmarks(user_id,post_id) VALUES($1,$2)', [
        userId,
        id,
      ]);
      await database.query('INSERT INTO reading_history(user_id,post_id) VALUES($1,$2)', [
        userId,
        id,
      ]);
      await database.query("INSERT INTO media_views(post_id,visitor_hash) VALUES($1,'visitor')", [
        id,
      ]);
      await database.query("INSERT INTO media_topic_posts VALUES('migration-topic',$1)", [id]);
      await database.query('INSERT INTO media_redirects VALUES($1,$2)', [`/old/${channel}`, id]);
    }
    for (const [kind, postId] of [
      ['event', posts.events],
      ['event', null],
      ['cooperation', posts.people],
      ['report', posts.research],
    ])
      await database.query(
        `INSERT INTO media_inquiries(id,kind,post_id,name,contact,payload,consent_version)
         VALUES($1,$2,$3,'申请人',$4,'{}','test')`,
        [randomUUID(), kind, postId, `${randomUUID()}@example.com`],
      );
    for (const [type, articleId, count] of [
      ['features', posts.features, 2],
      ['insights', posts.features, 3],
      ['people', posts.people, 1],
      ['events', posts.events, 1],
    ])
      await database.query(
        `INSERT INTO marketing_metrics(event,path,content_type,article_id,placement,device,count)
         VALUES('book_detail_click','/articles/features',$1,$2,'article-bottom','desktop',$3)`,
        [type, articleId, count],
      );

    await migrate(database);
    await migrate(database); // Rerunning startup must not mutate migrated articles again.
    const rows = await database.query<{
      id: string;
      channel: string;
      body: string;
      revision: number;
      details: object;
    }>('SELECT id,channel,body,revision,details FROM media_posts');
    expect(rows).toHaveLength(4);
    expect(rows.find((p) => p.id === posts.features)).toMatchObject({
      channel: 'insights',
      body: '保留完整正文',
      revision: 4,
      details: { company: '保留企业' },
    });
    expect(rows.find((p) => p.id === posts.insights)?.revision).toBe(3);
    for (const table of [
      'media_bookmarks',
      'reading_history',
      'media_views',
      'media_topic_posts',
      'media_redirects',
    ])
      expect(await database.query(`SELECT * FROM ${table}`)).toHaveLength(4);
    expect(await database.query('SELECT kind,post_id FROM media_inquiries')).toEqual([
      { kind: 'report', post_id: posts.research },
    ]);
    const metrics = await database.query<{ content_type: string; count: number }>(
      'SELECT content_type,count::int FROM marketing_metrics',
    );
    expect(metrics).toEqual([{ content_type: 'insights', count: 5 }]);
    for (const tab of ['bookmarks', 'history'] as const) {
      const { saved } = await readingList(database, userId, tab);
      expect(saved.find((p) => p.id === posts.features)?.url).toBe('/articles/features');
      expect(saved.find((p) => p.id === posts.insights)?.url).toBe('/articles/insights');
    }
    for (const channel of ['features', 'people', 'events']) {
      expect(isChannel(channel)).toBe(false);
      expect(
        postSchema.safeParse({ slug: 'retired-post', title: '测试内容', channel }).success,
      ).toBe(false);
      await expect(
        database.query('UPDATE media_posts SET channel=$1 WHERE id=$2', [channel, posts.features]),
      ).rejects.toThrow('media_posts_channel_check');
    }
    await expect(database.query("UPDATE media_inquiries SET kind='event'")).rejects.toThrow(
      'media_inquiries_kind_check',
    );
    expect(Object.keys(channels)).toEqual(['insights', 'cases', 'research']);
    // Exercise the real production sitemap (demo mode deliberately returns an empty one).
    await database.query("UPDATE media_posts SET authenticity='editorial'");
    vi.spyOn(databaseModule, 'db').mockResolvedValue(database);
    vi.spyOn(config, 'isDemo').mockReturnValue(false);
    const urls = (await sitemap()).map((entry) => new URL(entry.url).pathname);
    expect(urls).toEqual(
      expect.arrayContaining([
        '/insights',
        '/articles/features',
        '/articles/insights',
        '/book',
        '/membership',
        '/community',
      ]),
    );
    expect(urls.some((url) => /^\/(features|people|events)(\/|$)/.test(url))).toBe(false);
  } finally {
    vi.restoreAllMocks();
    await pg.close();
  }
});
