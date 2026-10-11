import { z } from 'zod';
import { cookies } from 'next/headers';
import { randomUUID } from 'node:crypto';
import { currentUser, requireUser, loginDemo, supabase, hashToken } from '@/lib/auth';
import { db } from '@/lib/db';
import { isDemo } from '@/lib/config';
import { DEMO_ADMIN, DEMO_MEMBER } from '@/lib/seed';
import { AppError, isModerator } from '@/lib/validation';
import { checkOrigin, readJson, errorResponse, requestKey } from '@/lib/http';
import { listResources } from '@/lib/catalog';
import { fetchGithub, syncGithub } from '@/lib/github';
import * as service from '@/lib/service';
import type { Kind } from '@/lib/types';
export const dynamic = 'force-dynamic';
const idSchema = z.uuid();
const note = z.string().max(2000).default('');
export async function GET(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    const { action } = await params;
    const u = new URL(request.url);
    if (action === 'health') {
      await (await db()).query('SELECT 1');
      return Response.json({ ok: true, mode: isDemo() ? 'demo' : 'supabase' });
    }
    if (action === 'me')
      return Response.json(
        { user: await currentUser() },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
    if (action === 'catalog') {
      const kind = z
        .enum(['project', 'skill', 'scenario', 'demo', 'task', 'article'])
        .optional()
        .parse(u.searchParams.get('kind') || undefined);
      return Response.json(
        await listResources(kind as Kind, {
          q: u.searchParams.get('q') || '',
          page: Number(u.searchParams.get('page')) || 1,
        }),
      );
    }
    if (action === 'github') {
      const user = await requireUser();
      await service.rateLimit(`github:${user.id}`, 10, 3600);
      return Response.json(await fetchGithub(u.searchParams.get('url') || ''));
    }
    throw new AppError('接口不存在', 404);
  } catch (e) {
    return errorResponse(e);
  }
}
export async function POST(request: Request, { params }: { params: Promise<{ action: string }> }) {
  try {
    checkOrigin(request);
    const { action } = await params;
    const data = await readJson(request);
    await service.rateLimit(`http:${requestKey(request)}`, 150, 60);
    if (action === 'demo-login') {
      if (!isDemo()) throw new AppError('演示登录已关闭', 404);
      const v = z
        .object({ role: z.enum(['member', 'admin']), accessKey: z.string().default('') })
        .parse(data);
      await service.rateLimit(`login:${requestKey(request)}`, 20, 600);
      if (process.env.DEMO_ACCESS_KEY && v.accessKey !== process.env.DEMO_ACCESS_KEY)
        throw new AppError('演示访问口令不正确', 403);
      await loginDemo(v.role === 'admin' ? DEMO_ADMIN : DEMO_MEMBER);
      return Response.json({ ok: true });
    }
    if (action === 'event') {
      const v = z
        .object({ event: z.enum(['view', 'github_click', 'demo_click']), resourceId: idSchema })
        .parse(data);
      const r = await (
        await db()
      ).query("SELECT id FROM resources WHERE id=$1 AND status='published'", [v.resourceId]);
      if (!r.length) throw new AppError('内容不存在', 404);
      await service.event(await db(), v.event, v.resourceId);
      return Response.json({ ok: true });
    }
    const user = await requireUser();
    let result: unknown = { ok: true };
    switch (action) {
      case 'logout': {
        if (isDemo()) {
          const jar = await cookies();
          const token = jar.get('fdeopen_session')?.value;
          if (token)
            await (
              await db()
            ).query('DELETE FROM sessions WHERE token_hash=$1', [hashToken(token)]);
          jar.delete('fdeopen_session');
        } else {
          const { error } = await (await supabase()).auth.signOut();
          if (error) throw new AppError('退出登录未完成，请稍后重试', 502);
        }
        break;
      }
      case 'submit':
        result = await service.submit(user, data);
        break;
      case 'profile':
        await service.updateProfile(user, data);
        break;
      case 'bookmark':
      case 'like':
        result = await service.toggle(user, idSchema.parse(data.resourceId), action);
        break;
      case 'comment': {
        const v = z
          .object({ resourceId: idSchema, body: z.string().trim().min(2).max(2000) })
          .parse(data);
        await service.comment(user, v.resourceId, v.body);
        break;
      }
      case 'report': {
        const v = z
          .object({ resourceId: idSchema, reason: z.string().trim().min(5).max(2000) })
          .parse(data);
        await service.rateLimit(`report:${user.id}`, 5, 3600);
        const r = await (
          await db()
        ).query("SELECT id FROM resources WHERE id=$1 AND status='published'", [v.resourceId]);
        if (!r.length) throw new AppError('内容不存在', 404);
        await (
          await db()
        ).query('INSERT INTO reports(id,user_id,resource_id,reason) VALUES($1,$2,$3,$4)', [
          randomUUID(),
          user.id,
          v.resourceId,
          v.reason,
        ]);
        break;
      }
      case 'apply': {
        const v = z
          .object({ resourceId: idSchema, message: z.string().trim().min(10).max(3000) })
          .parse(data);
        result = await service.applyTask(user, v.resourceId, v.message);
        break;
      }
      case 'pr': {
        const v = z.object({ id: idSchema, url: z.string().max(1000) }).parse(data);
        await service.submitPr(user, v.id, v.url);
        break;
      }
      case 'notifications':
        await (await db()).query('UPDATE notifications SET read=true WHERE user_id=$1', [user.id]);
        break;
      default: {
        if (!isModerator(user.role)) throw new AppError('此操作需要社区管理权限', 403);
        switch (action) {
          case 'review': {
            const v = z
              .object({
                id: idSchema,
                decision: z.enum(['approved', 'rejected']),
                note,
                publicTitle: z.string().min(3).max(100).optional(),
                publicSummary: z.string().min(15).max(4000).optional(),
              })
              .parse(data);
            result = await service.reviewSubmission(
              user,
              v.id,
              v.decision,
              v.note,
              v.publicTitle,
              v.publicSummary,
            );
            break;
          }
          case 'lead-note': {
            const v = z.object({ id: idSchema, note }).parse(data);
            await (
              await db()
            ).transaction(async (tx) => {
              const rows = await tx.query(
                "UPDATE submissions SET review_note=$2 WHERE id=$1 AND kind='requirement' RETURNING id",
                [v.id, v.note],
              );
              if (!rows.length) throw new AppError('企业需求不存在', 404);
              await service.audit(tx, user.id, 'requirement.followup', v.id, { note: v.note });
            });
            break;
          }
          case 'resource':
            result = await service.saveResource(user, data);
            break;
          case 'moderate': {
            const v = z
              .object({ kind: z.enum(['comment', 'report']), id: idSchema, status: z.string() })
              .parse(data);
            await service.moderate(user, v.kind, v.id, v.status);
            break;
          }
          case 'review-application': {
            const v = z
              .object({ id: idSchema, status: z.enum(['accepted', 'rejected', 'completed']), note })
              .parse(data);
            await service.reviewApplication(user, v.id, v.status, v.note);
            break;
          }
          case 'role': {
            const v = z
              .object({
                id: idSchema,
                role: z.enum(['member', 'maintainer', 'moderator', 'admin']),
                disabled: z.boolean(),
              })
              .parse(data);
            await service.updateRole(user, v.id, v.role, v.disabled);
            break;
          }
          case 'settings': {
            const v = z
              .object({
                announcement: z.string().min(1).max(200),
                showLab: z.boolean(),
                showTasks: z.boolean(),
                showDevelopers: z.boolean(),
              })
              .parse(data);
            await (
              await db()
            ).transaction(async (tx) => {
              await tx.query(
                "INSERT INTO site_settings(key,value) VALUES('home',$1) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=now()",
                [JSON.stringify(v)],
              );
              await service.audit(tx, user.id, 'settings.update', 'home', v);
            });
            break;
          }
          case 'collection': {
            const v = z
              .object({
                id: idSchema.optional(),
                slug: z.string().regex(/^[a-z0-9-]{2,100}$/),
                title: z.string().min(2).max(100),
                summary: z.string().min(10).max(1000),
                theme: z.enum(['blue', 'violet', 'green', 'orange', 'dark']),
                published: z.boolean(),
                resourceIds: z.array(idSchema).max(100),
              })
              .parse(data);
            const id = v.id || randomUUID();
            await (
              await db()
            ).transaction(async (tx) => {
              await tx.query(
                'INSERT INTO collections(id,slug,title,summary,theme,published) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,title=excluded.title,summary=excluded.summary,theme=excluded.theme,published=excluded.published',
                [id, v.slug, v.title, v.summary, v.theme, v.published],
              );
              await tx.query('DELETE FROM collection_items WHERE collection_id=$1', [id]);
              for (const rid of v.resourceIds)
                await tx.query(
                  'INSERT INTO collection_items(collection_id,resource_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
                  [id, rid],
                );
              await service.audit(tx, user.id, 'collection.save', id);
            });
            break;
          }
          case 'github-sync': {
            const sync = await syncGithub();
            await service.audit(await db(), user.id, 'github.sync', 'catalog', sync);
            const failed = sync.filter((r) => !r.ok);
            if (failed.length)
              throw new AppError(
                `${failed.length} 个仓库同步失败，其他仓库已更新。详情见操作日志。`,
                502,
              );
            result = { ok: true, updated: sync.length };
            break;
          }
          default:
            throw new AppError('接口不存在', 404);
        }
      }
    }
    return Response.json(result);
  } catch (e) {
    return errorResponse(e);
  }
}
