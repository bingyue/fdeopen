import { beforeAll, describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { db } from '../src/lib/db';
import { DEMO_ADMIN, DEMO_MEMBER } from '../src/lib/seed';
import type { User } from '../src/lib/types';
import { postSchema, isChannel } from '../src/lib/media-model';
import {
  mediaList,
  mediaPost,
  mediaRole,
  savePost,
  editorPost,
  deletePost,
  grantMediaRole,
  mediaTaxonomy,
  submitInquiry,
  updateInquiry,
  mediaRedirect,
  saveHomeOrder,
  recordMediaView,
} from '../src/lib/media-service';
import { detectUpload, saveAsset, assetResponse } from '../src/lib/media-assets';
import { seedMedia } from '../src/lib/media-seed';
let admin: User, member: User, author: User;
let authorId: string;
const body =
  '## 完整正文\n\n这是用于检验真实发布流程的文章内容，需要具备完整的正文、作者、栏目与来源，不使用未经核验的企业经营数据。'.repeat(
    4,
  );
beforeAll(async () => {
  const database = await db();
  [admin] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_ADMIN],
  );
  [member] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_MEMBER],
  );
  const id = randomUUID();
  await database.query('INSERT INTO users(id) VALUES($1)', [id]);
  author = { ...member, id, user_id: id, role: 'member' };
  await grantMediaRole(admin, { user_id: id, role: 'author' });
  authorId = (await mediaTaxonomy()).authors[0].id;
});
const input = (slug: string) => ({
  slug,
  channel: 'features',
  title: '媒体验收：' + slug,
  summary: '这是一篇用于验证媒体内容发布权限与展示流程的完整测试摘要。',
  body,
  category: 'transformation',
  author_id: authorId,
  authenticity: 'example',
  published_at: new Date(Date.now() - 60000).toISOString(),
});
describe('media publishing boundaries', () => {
  it('retains community data and seeds media only once', async () => {
    const database = await db();
    const before = (await database.query('SELECT id FROM resources')).length;
    const posts = (await mediaList()).count;
    await seedMedia(database, true);
    expect((await mediaList()).count).toBe(posts);
    expect((await database.query('SELECT id FROM resources')).length).toBe(before);
    expect(before).toBeGreaterThan(70);
    expect(isChannel('toString')).toBe(false);
  });
  it('does not expose drafts, future releases or internal verification notes', async () => {
    const draft = await savePost(admin, { ...input('private-media-draft'), status: 'draft' });
    expect(await mediaPost('private-media-draft')).toBeNull();
    expect((await mediaList({ q: 'private-media-draft' })).count).toBe(0);
    const future = await savePost(admin, {
      ...input('scheduled-media'),
      status: 'scheduled',
      published_at: new Date(Date.now() + 3600000).toISOString(),
    });
    expect(await mediaPost('scheduled-media')).toBeNull();
    await (
      await db()
    ).query("UPDATE media_posts SET published_at=now()-interval '1 second' WHERE id=$1", [
      future.id,
    ]);
    expect(await mediaPost('scheduled-media')).not.toBeNull();
    const old = await editorPost(admin, draft.id);
    await savePost(admin, {
      ...old,
      status: 'published',
      authenticity: 'verified',
      source_name: '经核验的测试来源',
      verification_note: 'PRIVATE_INTERNAL_EVIDENCE_123456 这里保存不应对公众展示的内部核验材料。',
    });
    const publicPost = await mediaPost(old.slug);
    expect(publicPost).not.toHaveProperty('verification_note');
    expect(publicPost).not.toHaveProperty('owner_id');
    expect(JSON.stringify(await mediaList({ q: old.slug }))).not.toContain('PRIVATE_INTERNAL');
  });
  it('rejects stale edits, records redirects, and hides soft-deleted content', async () => {
    const created = await savePost(admin, { ...input('media-old-slug'), status: 'published' });
    const old = await editorPost(admin, created.id);
    const updated = await savePost(admin, { ...old, slug: 'media-new-slug' });
    await expect(savePost(admin, { ...old, title: '过期修改' })).rejects.toThrow('其他编辑');
    expect(await mediaRedirect('/articles/media-old-slug')).toBe('/articles/media-new-slug');
    await deletePost(admin, created.id, updated.revision);
    expect(await mediaPost('media-new-slug')).toBeNull();
    expect(await mediaRedirect('/articles/media-old-slug')).toBeNull();
    expect(
      (await (await db()).query('SELECT id FROM media_posts WHERE id=$1', [created.id])).length,
    ).toBe(1);
  });
  it('enforces author ownership and prevents self-publishing or role escalation', async () => {
    await expect(savePost(member, input('ordinary-member'))).rejects.toThrow('权限');
    const own = await savePost(author, { ...input('author-own-draft'), author_id: null });
    await expect(
      savePost(author, { ...input('author-self-publish'), status: 'published' }),
    ).rejects.toThrow('发布');
    const adminDraft = await savePost(admin, input('editor-private-draft'));
    await expect(editorPost(author, adminDraft.id)).rejects.toThrow('自己的');
    await expect(deletePost(author, own.id, 1)).rejects.toThrow('权限');
    await expect(grantMediaRole(author, { user_id: author.id, role: 'editor' })).rejects.toThrow(
      '管理员',
    );
    expect(await mediaRole(author)).toBe('author');
  });
  it('validates source, case structure and publication completeness', () => {
    expect(
      postSchema.safeParse({ ...input('incomplete'), body: '过短', status: 'published' }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({
        ...input('unverified'),
        status: 'published',
        authenticity: 'verified',
      }).success,
    ).toBe(false);
    expect(
      postSchema.safeParse({ ...input('invalid-case'), channel: 'cases', status: 'published' })
        .success,
    ).toBe(false);
    expect(
      postSchema.safeParse({ ...input('unsafe-url'), source_url: 'javascript:alert(1)' }).success,
    ).toBe(false);
  });
  it('persists home order and deduplicates page views', async () => {
    const p = await savePost(admin, { ...input('home-priority'), status: 'published' });
    await saveHomeOrder(admin, { ids: [p.id] });
    expect((await mediaList({ home: true })).rows[0].id).toBe(p.id);
    await recordMediaView(p.id, 'test-visitor');
    await recordMediaView(p.id, 'test-visitor');
    expect((await mediaPost('home-priority'))?.views).toBe(1);
    await expect(saveHomeOrder(author, { ids: [p.id] })).rejects.toThrow('权限');
  });
});
describe('media private forms and uploads', () => {
  it('requires consent and stores private enterprise requests with status changes', async () => {
    const form = {
      kind: 'enterprise',
      name: '测试联系人',
      contact: 'PRIVATE_EMAIL@example.com',
      organization: 'PRIVATE_COMPANY',
      industry: '制造',
      scenario: '设备知识',
      problem: '需要梳理企业设备知识并建立人工复核流程',
      budget: '待评估',
      timeline: '三个月',
      consent: true,
    };
    await expect(submitInquiry(null, { ...form, consent: false })).rejects.toThrow();
    const result = await submitInquiry(null, form);
    await expect(submitInquiry(null, form)).rejects.toThrow('重复');
    const [saved] = await (
      await db()
    ).query<{ payload: typeof form; status: string }>(
      'SELECT payload,status FROM media_inquiries WHERE id=$1',
      [result.id],
    );
    expect(saved.payload.organization).toBe(form.organization);
    expect((await mediaList({ q: 'PRIVATE_COMPANY' })).count).toBe(0);
    await expect(updateInquiry(member, { id: result.id, status: 'completed' })).rejects.toThrow(
      '权限',
    );
    await updateInquiry(admin, { id: result.id, status: 'contacted', note: '等待沟通' });
    expect(
      (
        await (
          await db()
        ).query<{ status: string }>('SELECT status FROM media_inquiries WHERE id=$1', [result.id])
      )[0].status,
    ).toBe('contacted');
  });
  it('rejects real registration against example events', async () => {
    const event = (await mediaList({ channel: 'events' })).rows[0];
    await expect(
      submitInquiry(null, {
        kind: 'event',
        post_id: event.id,
        name: '测试用户',
        contact: 'test@example.com',
        consent: true,
      }),
    ).rejects.toThrow('示例活动');
  });
  it('validates file signature and protects unlinked assets', async () => {
    expect(() => detectUpload(Buffer.from('<svg onload="alert(1)"></svg>'))).toThrow();
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j2ioAAAAASUVORK5CYII=',
      'base64',
    );
    await expect(saveAsset(member, png, 'x.png', 'image/png')).rejects.toThrow('权限');
    await expect(saveAsset(admin, png, 'x.jpg', 'image/jpeg')).rejects.toThrow('不一致');
    const asset = await saveAsset(admin, png, '../../x.png', 'image/png');
    await expect(assetResponse(asset.id, null)).rejects.toThrow('授权');
    expect((await assetResponse(asset.id, admin)).headers.get('content-type')).toBe('image/png');
    const post = await savePost(admin, {
      ...input('public-cover'),
      status: 'published',
      cover_id: asset.id,
      cover_alt: '测试图片',
    });
    expect((await assetResponse(asset.id, null)).status).toBe(200);
    await deletePost(admin, post.id, 1);
    await expect(assetResponse(asset.id, null)).rejects.toThrow('授权');
  });
});
