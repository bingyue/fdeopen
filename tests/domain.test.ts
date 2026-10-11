import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '../src/lib/db';
import { DEMO_MEMBER, DEMO_ADMIN } from '../src/lib/seed';
import {
  submit,
  reviewSubmission,
  toggle,
  updateProfile,
  applyTask,
  submitPr,
  reviewApplication,
  saveResource,
  updateRole,
} from '../src/lib/service';
import {
  getResource,
  listResources,
  developer,
  developers,
  relatedResources,
} from '../src/lib/catalog';
import { githubRepo, submissionSchema, resourceSchema } from '../src/lib/validation';
import { verifySignature } from '../src/lib/github';
import { checkOrigin } from '../src/lib/http';
import { createHmac } from 'node:crypto';
import { githubIdentity } from '../src/lib/identity';
import type { User, Resource } from '../src/lib/types';
let member: User, admin: User;
beforeAll(async () => {
  const database = await db();
  [member] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_MEMBER],
  );
  [admin] = await database.query<User>(
    'SELECT u.*,p.* FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1',
    [DEMO_ADMIN],
  );
});
describe('catalog integrity and actual workflows', () => {
  it('contains 20 sourced projects, 20 skills, 20 editorial scenarios and linked resources', async () => {
    for (const kind of ['project', 'skill', 'scenario'] as const) {
      const result = await listResources(kind, { limit: 100 });
      expect(result.count).toBe(20);
      expect(
        result.rows.every((r) =>
          kind === 'scenario'
            ? r.provenance === 'editorial'
            : r.source_url.startsWith('https://github.com/'),
        ),
      ).toBe(true);
    }
    const rag = await getResource('ragflow');
    expect((await relatedResources(rag!.id)).some((r) => r.kind === 'scenario')).toBe(true);
  });
  it('filters, searches full article text, clamps pagination and never exposes private submissions', async () => {
    expect(
      (await listResources('article', { q: '过期版本' })).rows.some(
        (r) => r.slug === 'rag-engineering',
      ),
    ).toBe(true);
    expect(
      (await listResources('project', { category: 'RAG' })).rows.every((r) => r.category === 'RAG'),
    ).toBe(true);
    expect((await listResources(undefined, { q: '绝无此项' })).count).toBe(0);
    expect((await listResources('project', { page: 99999 })).page).toBe(2);
  });
  it('submits, rejects unauthorized review, approves once, supports moderated edits', async () => {
    const s = await submit(member, {
      kind: 'project',
      title: '验收项目 Alpha',
      summary: '这是一个用于验证完整投稿审核流程的公开示例项目。',
      category: 'RAG',
      sourceUrl: 'https://github.com/test/alpha',
      sourceAuthor: 'test',
      license: 'MIT',
    });
    await expect(reviewSubmission(member, s.id, 'approved', '')).rejects.toThrow('权限');
    const r = await reviewSubmission(admin, s.id, 'approved', '通过');
    expect(r.resourceId).toBeTruthy();
    await expect(reviewSubmission(admin, s.id, 'approved', '')).rejects.toThrow('已被处理');
    const original = (
      await (await db()).query<Resource>('SELECT * FROM resources WHERE id=$1', [r.resourceId])
    )[0];
    const edit = await submit(member, {
      kind: 'project',
      title: '验收项目 Alpha 更新',
      summary: '这是经过修改后重新提交审核的更新内容，用于验证原链接保持稳定。',
      category: 'RAG',
      sourceUrl: 'https://github.com/test/alpha',
      existingResourceId: original.id,
    });
    expect((await getResource(original.slug))?.title).toBe('验收项目 Alpha');
    await reviewSubmission(admin, edit.id, 'approved', '修改通过');
    expect((await getResource(original.slug))?.title).toBe('验收项目 Alpha 更新');
    expect(
      (await (await db()).query('SELECT * FROM resources WHERE id=$1', [r.resourceId])).length,
    ).toBe(1);
  });
  it('keeps enterprise PII private and requires consent plus separate sanitized text', async () => {
    const privateReq = await submit(member, {
      kind: 'requirement',
      title: '私密测试公司 CRM 需求',
      summary: 'PRIVATE_CUSTOMER_SECRET_987 这是不允许公开的企业内部业务信息。',
      category: '企业管理',
      contact: 'private@example.com',
      publicConsent: false,
    });
    await expect(reviewSubmission(admin, privateReq.id, 'approved', '')).rejects.toThrow('未授权');
    expect((await listResources(undefined, { q: 'PRIVATE_CUSTOMER_SECRET_987' })).count).toBe(0);
    const opt = await submit(member, {
      kind: 'requirement',
      title: '允许脱敏的业务请求',
      summary: 'SECOND_PRIVATE_SECRET_987 这是需要由编辑脱敏后才能公开的信息。',
      category: '企业管理',
      contact: 'hidden@example.com',
      publicConsent: true,
    });
    await expect(reviewSubmission(admin, opt.id, 'approved', '')).rejects.toThrow('脱敏');
    const approved = await reviewSubmission(
      admin,
      opt.id,
      'approved',
      '',
      '公开的客服共创任务',
      '需要共建一个包含权限验证、来源引用和人工复核的客服知识助手。',
    );
    const row = (
      await (
        await db()
      ).query<Resource>('SELECT * FROM resources WHERE id=$1', [approved.resourceId])
    )[0];
    expect(JSON.stringify(row)).not.toContain('SECRET');
    expect(JSON.stringify(row)).not.toContain('hidden@example.com');
  });
  it('stores bookmarks per user and keeps private profile fields out of public DTOs', async () => {
    const r = await getResource('ragflow');
    expect(await toggle(member, r!.id, 'bookmark')).toEqual({ active: true });
    expect(
      (await (await db()).query('SELECT * FROM bookmarks WHERE user_id=$1', [admin.id])).length,
    ).toBe(0);
    expect(await toggle(member, r!.id, 'bookmark')).toEqual({ active: false });
    await updateProfile(member, {
      name: '示例开发者',
      bio: '个人简介',
      tags: ['RAG'],
      contact: 'TOP_SECRET_CONTACT',
      contact_public: false,
      public: true,
      availability: '参与共建',
      portfolio: [],
    });
    expect(JSON.stringify(await developer(member.handle))).not.toContain('TOP_SECRET_CONTACT');
    expect(JSON.stringify(await developers())).not.toContain('TOP_SECRET_CONTACT');
    await updateProfile(member, {
      name: '示例开发者',
      bio: '个人简介',
      tags: ['RAG'],
      contact: 'TOP_SECRET_CONTACT',
      contact_public: false,
      public: false,
      availability: '参与共建',
      portfolio: [],
    });
    expect(await developer(member.handle)).toBeNull();
  });
  it('requires accepted application, valid PR and administrator confirmation for contribution', async () => {
    const task = await getResource('first-deployment');
    const a = await applyTask(member, task!.id, '我将整理安装环境和依赖，完成一次可复现部署。');
    await expect(submitPr(member, a.id, 'https://github.com/test/repo/pull/1')).rejects.toThrow(
      '尚未通过',
    );
    await reviewApplication(admin, a.id, 'accepted', '欢迎参与');
    await expect(submitPr(admin, a.id, 'https://github.com/test/repo/pull/1')).rejects.toThrow(
      '权限',
    );
    await expect(submitPr(member, a.id, 'javascript:alert(1)')).rejects.toThrow('GitHub');
    await submitPr(member, a.id, 'https://github.com/test/repo/pull/1');
    await reviewApplication(admin, a.id, 'completed', '已核验');
    await expect(reviewApplication(admin, a.id, 'completed', '')).rejects.toThrow('状态');
    const cs = await (
      await db()
    ).query('SELECT * FROM contributions WHERE application_id=$1', [a.id]);
    expect(cs).toHaveLength(1);
  });
  it('protects resource editing and role escalation', async () => {
    const r = await getResource('dify');
    await expect(saveResource(member, r)).rejects.toThrow('权限');
    await expect(updateRole(member, admin.id, 'member', false)).rejects.toThrow('管理员');
    await expect(updateRole(admin, admin.id, 'member', true)).rejects.toThrow('自己');
    const logs = await (await db()).query('SELECT * FROM audit_logs WHERE actor_id=$1', [admin.id]);
    expect(logs.length).toBeGreaterThan(3);
  });
});
describe('security boundaries', () => {
  it('rejects SSRF-shaped GitHub URLs and unsafe links', () => {
    for (const url of [
      'http://github.com/a/b',
      'https://github.com.evil.com/a/b',
      'https://github.com/a/b/issues',
      'https://github.com/../..',
      'http://169.254.169.254',
      'https://token@github.com/a/b',
    ])
      expect(() => githubRepo(url)).toThrow();
    expect(githubRepo('https://github.com/langchain-ai/langchain.git')).toBe(
      'langchain-ai/langchain',
    );
    expect(
      submissionSchema.safeParse({
        kind: 'skill',
        title: '测试 Skill',
        summary: '这是一个测试数据校验功能的技能资源介绍。',
        category: 'MCP',
        sourceUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
  });
  it('requires a valid HMAC and exact payload', () => {
    const body = '{"test":1}',
      secret = 'testing';
    const signature = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
    expect(verifySignature(body, signature, secret)).toBe(true);
    expect(verifySignature(body + ' ', signature, secret)).toBe(false);
    expect(verifySignature(body, 'sha256=bad', secret)).toBe(false);
    expect(verifySignature(body, null, secret)).toBe(false);
  });
  it('blocks missing and cross-site origins', () => {
    expect(() =>
      checkOrigin(new Request('http://localhost:3210/api/submit', { method: 'POST' })),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3210/api/submit', {
          method: 'POST',
          headers: { origin: 'https://evil.example' },
        }),
      ),
    ).toThrow();
    expect(() =>
      checkOrigin(
        new Request('http://localhost:3210/api/submit', {
          method: 'POST',
          headers: { origin: 'http://localhost:3210' },
        }),
      ),
    ).not.toThrow();
  });
  it('rejects unsafe embedded links and traversal in MDX references', async () => {
    const r = await getResource('dify');
    expect(
      resourceSchema.safeParse({ ...r, metadata: { demoUrl: 'javascript:alert(1)' } }).success,
    ).toBe(false);
    expect(
      resourceSchema.safeParse({ ...r, metadata: { articleFile: '../../secret.mdx' } }).success,
    ).toBe(false);
  });
});

it('does not trust user-editable OAuth metadata for the bound GitHub identity', () => {
  const user = {
    id: DEMO_MEMBER,
    user_metadata: { user_name: 'spoofed-admin', provider_id: '1' },
    identities: [
      {
        id: 'provider-identity',
        provider: 'github',
        identity_data: { user_name: 'real-builder', sub: '1234', full_name: 'Builder' },
      },
    ],
  };
  expect(githubIdentity(user).githubUrl).toBe('https://github.com/real-builder');
  expect(githubIdentity(user).githubId).toBe('1234');
  expect(() => githubIdentity({ ...user, identities: [] })).toThrow('GitHub');
});
