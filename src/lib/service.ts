import { randomUUID } from 'node:crypto';
import { db, type DB } from './db';
import {
  AppError,
  submissionSchema,
  profileSchema,
  resourceSchema,
  isModerator,
  assertPr,
} from './validation';
import type { User, Resource, Submission, Application } from './types';
export async function audit(
  tx: DB,
  actor: string,
  action: string,
  target: string,
  details: unknown = {},
) {
  await tx.query(
    'INSERT INTO audit_logs(id,actor_id,action,target_id,details) VALUES($1,$2,$3,$4,$5)',
    [randomUUID(), actor, action, target, JSON.stringify(details)],
  );
}
async function notify(tx: DB, id: string, message: string) {
  await tx.query('INSERT INTO notifications(id,user_id,message) VALUES($1,$2,$3)', [
    randomUUID(),
    id,
    message,
  ]);
}
export async function event(tx: DB, name: string, id: string | null = null) {
  await tx.query('INSERT INTO analytics_events(id,event,resource_id) VALUES($1,$2,$3)', [
    randomUUID(),
    name,
    id,
  ]);
}
export async function rateLimit(key: string, max = 20, seconds = 60) {
  const [r] = await (
    await db()
  ).query<{ count: number }>(
    "INSERT INTO rate_limits(key,count,reset_at) VALUES($1,1,now()+$2*interval '1 second') ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.reset_at<now() THEN 1 ELSE rate_limits.count+1 END,reset_at=CASE WHEN rate_limits.reset_at<now() THEN excluded.reset_at ELSE rate_limits.reset_at END RETURNING count",
    [key, seconds],
  );
  if (r.count > max) throw new AppError('操作太频繁，请稍后再试', 429);
}
async function published(tx: DB, id: string, kind?: string) {
  const r = (
    await tx.query<Resource>(
      "SELECT * FROM resources WHERE id=$1 AND status='published' FOR SHARE",
      [id],
    )
  )[0];
  if (!r || (kind && r.kind !== kind)) throw new AppError('内容不存在或暂未公开', 404);
  return r;
}
export async function submit(user: User, input: unknown) {
  const v = submissionSchema.parse(input);
  await rateLimit(`submit:${user.id}`, 8, 3600);
  return (await db()).transaction(async (tx) => {
    // Serialize per-user submissions so the pending-duplicate check is atomic.
    await tx.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE', [user.id]);
    if (v.existingResourceId) {
      const own = await tx.query(
        'SELECT id FROM resources WHERE id=$1 AND owner_id=$2 AND kind=$3',
        [v.existingResourceId, user.id, v.kind],
      );
      if (!own.length) throw new AppError('只能修改自己发布的同类型资源', 403);
    }
    const duplicate = await tx.query(
      "SELECT id FROM submissions WHERE user_id=$1 AND title=$2 AND status='pending'",
      [user.id, v.title],
    );
    if (duplicate.length) throw new AppError('已有相同标题的待审核投稿，请在工作台查看', 409);
    const id = randomUUID();
    await tx.query(
      'INSERT INTO submissions(id,user_id,kind,title,payload) VALUES($1,$2,$3,$4,$5)',
      [id, user.id, v.kind, v.title, JSON.stringify(v)],
    );
    await audit(tx, user.id, 'submission.create', id, { kind: v.kind });
    await event(tx, v.kind === 'requirement' ? 'requirement' : 'submission');
    return { id };
  });
}
export async function reviewSubmission(
  user: User,
  id: string,
  decision: 'approved' | 'rejected',
  note: string,
  publicTitle?: string,
  publicSummary?: string,
) {
  if (!isModerator(user.role)) throw new AppError('需要审核权限', 403);
  return (await db()).transaction(async (tx) => {
    const s = (
      await tx.query<Submission>('SELECT * FROM submissions WHERE id=$1 FOR UPDATE', [id])
    )[0];
    if (!s) throw new AppError('投稿不存在', 404);
    if (s.status !== 'pending') throw new AppError('这条投稿已被处理，请刷新', 409);
    let resourceId: string | null = null;
    if (decision === 'approved') {
      const p = submissionSchema.parse(s.payload);
      if (s.kind === 'requirement' && !p.publicConsent)
        throw new AppError('该企业需求未授权公开。可在私密队列跟进，不可转为公开任务');
      if (s.kind === 'requirement' && (!publicTitle || !publicSummary || publicSummary.length < 15))
        throw new AppError('请为共创任务填写脱敏标题与介绍');
      resourceId = p.existingResourceId || randomUUID();
      const slug = `${s.kind}-${resourceId.slice(0, 8)}`;
      if (p.existingResourceId) {
        const owns = await tx.query(
          'SELECT id FROM resources WHERE id=$1 AND owner_id=$2 AND kind=$3 FOR UPDATE',
          [p.existingResourceId, s.user_id, s.kind],
        );
        if (!owns.length) throw new AppError('原资源归属已改变，无法发布此更新', 409);
        await tx.query(
          'UPDATE resources SET title=$2,summary=$3,body=$3,category=$4,tags=$5,source_url=$6,source_author=$7,license=$8,updated_at=now() WHERE id=$1',
          [
            resourceId,
            s.title,
            p.summary,
            p.category,
            JSON.stringify(p.tags),
            p.sourceUrl,
            p.sourceAuthor,
            p.license,
          ],
        );
      } else
        await tx.query(
          'INSERT INTO resources(id,slug,kind,title,summary,category,tags,body,metadata,source_url,source_author,license,provenance,status,owner_id) VALUES($1,$2,$3,$4,$5,$6,$7,$5,$8,$9,$10,$11,$12,$13,$14)',
          [
            resourceId,
            slug,
            s.kind === 'requirement' ? 'task' : s.kind,
            s.kind === 'requirement' ? publicTitle : s.title,
            s.kind === 'requirement' ? publicSummary : p.summary,
            s.kind === 'requirement' ? '企业共创' : p.category,
            JSON.stringify(p.tags),
            JSON.stringify(
              s.kind === 'requirement'
                ? {
                    state: 'open',
                    difficulty: '待评估',
                    deliverables: ['与需求方确认验收标准'],
                    deadline: '协商',
                  }
                : {},
            ),
            s.kind === 'requirement' ? '' : p.sourceUrl,
            s.kind === 'requirement' ? '社区企业需求' : p.sourceAuthor,
            p.license,
            'community',
            'published',
            s.user_id,
          ],
        );
    }
    await tx.query(
      'UPDATE submissions SET status=$2,review_note=$3,reviewed_by=$4,resource_id=$5,reviewed_at=now() WHERE id=$1',
      [id, decision, note, user.id, resourceId],
    );
    await notify(
      tx,
      s.user_id,
      `你的投稿「${s.title}」${decision === 'approved' ? '已通过审核' : '需修改后重新提交'}${note ? '：' + note : ''}`,
    );
    await audit(tx, user.id, 'submission.' + decision, id, { resourceId, note });
    return { resourceId };
  });
}
export async function toggle(user: User, resourceId: string, kind: 'bookmark' | 'like') {
  const table = kind === 'bookmark' ? 'bookmarks' : 'likes';
  return (await db()).transaction(async (tx) => {
    await tx.query('SELECT id FROM users WHERE id=$1 FOR NO KEY UPDATE', [user.id]);
    await published(tx, resourceId);
    const existing = await tx.query(
      `DELETE FROM ${table} WHERE user_id=$1 AND resource_id=$2 RETURNING user_id`,
      [user.id, resourceId],
    );
    if (!existing.length) {
      await tx.query(
        `INSERT INTO ${table}(user_id,resource_id) VALUES($1,$2) ON CONFLICT DO NOTHING`,
        [user.id, resourceId],
      );
      if (kind === 'bookmark') await event(tx, 'bookmark', resourceId);
    }
    return { active: !existing.length };
  });
}
export async function comment(user: User, id: string, body: string) {
  await rateLimit(`comment:${user.id}`, 10, 3600);
  const database = await db();
  await published(database, id);
  await database.query('INSERT INTO comments(id,user_id,resource_id,body) VALUES($1,$2,$3,$4)', [
    randomUUID(),
    user.id,
    id,
    body,
  ]);
}
export async function updateProfile(user: User, input: unknown) {
  const v = profileSchema.parse(input);
  await (
    await db()
  ).query(
    'UPDATE profiles SET name=$2,bio=$3,tags=$4,contact=$5,contact_public=$6,public=$7,availability=$8,portfolio=$9 WHERE user_id=$1',
    [
      user.id,
      v.name,
      v.bio,
      JSON.stringify(v.tags),
      v.contact,
      v.contact_public,
      v.public,
      v.availability,
      JSON.stringify(v.portfolio),
    ],
  );
}
export async function applyTask(user: User, id: string, message: string) {
  await rateLimit(`apply:${user.id}`, 10, 3600);
  return (await db()).transaction(async (tx) => {
    const r = await published(tx, id, 'task');
    if (r.metadata.state !== 'open') throw new AppError('该任务当前不接受新的申请');
    const a = randomUUID();
    await tx.query(
      'INSERT INTO task_applications(id,task_id,user_id,message) VALUES($1,$2,$3,$4)',
      [a, id, user.id, message],
    );
    await event(tx, 'task_apply', id);
    return { id: a };
  });
}
export async function submitPr(user: User, id: string, url: string) {
  assertPr(url);
  const rows = await (
    await db()
  ).query(
    "UPDATE task_applications SET pr_url=$3,status='submitted' WHERE id=$1 AND user_id=$2 AND status IN ('accepted','submitted') RETURNING id",
    [id, user.id, url],
  );
  if (!rows.length) throw new AppError('申请尚未通过，或你没有修改权限', 403);
}
export async function reviewApplication(
  user: User,
  id: string,
  status: 'accepted' | 'rejected' | 'completed',
  note: string,
) {
  if (!isModerator(user.role)) throw new AppError('需要审核权限', 403);
  return (await db()).transaction(async (tx) => {
    const a = (
      await tx.query<Application>('SELECT * FROM task_applications WHERE id=$1 FOR UPDATE', [id])
    )[0];
    if (!a) throw new AppError('申请不存在', 404);
    if (
      (status === 'completed' && a.status !== 'submitted') ||
      (status === 'accepted' && a.status !== 'pending') ||
      (status === 'rejected' && !['pending', 'accepted', 'submitted'].includes(a.status))
    )
      throw new AppError('当前状态不支持此操作', 409);
    await tx.query('UPDATE task_applications SET status=$2,review_note=$3 WHERE id=$1', [
      id,
      status,
      note,
    ]);
    if (status === 'completed') {
      assertPr(a.pr_url);
      const r = await published(tx, a.task_id, 'task');
      await tx.query(
        'INSERT INTO contributions(id,user_id,resource_id,application_id,title,pr_url,confirmed_by) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(), a.user_id, a.task_id, id, r.title, a.pr_url, user.id],
      );
    }
    await audit(tx, user.id, 'application.' + status, id, { note });
    await notify(
      tx,
      a.user_id,
      `共创申请状态已更新为 ${status === 'accepted' ? '已接受' : status === 'completed' ? '贡献已确认' : '未通过'}${note ? '：' + note : ''}`,
    );
  });
}
export async function saveResource(user: User, input: unknown) {
  if (!isModerator(user.role)) throw new AppError('需要管理权限', 403);
  const r = resourceSchema.parse(input);
  return (await db()).transaction(async (tx) => {
    const id = r.id || randomUUID();
    if (r.id) {
      const exists = await tx.query<Resource>('SELECT * FROM resources WHERE id=$1 FOR UPDATE', [
        id,
      ]);
      if (!exists.length) throw new AppError('内容不存在', 404);
      if (r.kind !== exists[0].kind)
        throw new AppError('已创建资源不能更改类型，请新建对应类型的内容', 409);
      if (r.kind === 'article' && r.body !== exists[0].body) delete r.metadata.articleFile;
    }
    await tx.query(
      'INSERT INTO resources(id,slug,kind,title,summary,category,tags,body,metadata,source_url,source_author,license,provenance,status,featured) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) ON CONFLICT(id) DO UPDATE SET slug=excluded.slug,kind=excluded.kind,title=excluded.title,summary=excluded.summary,category=excluded.category,tags=excluded.tags,body=excluded.body,metadata=excluded.metadata,source_url=excluded.source_url,source_author=excluded.source_author,license=excluded.license,provenance=excluded.provenance,status=excluded.status,featured=excluded.featured,updated_at=now()',
      [
        id,
        r.slug,
        r.kind,
        r.title,
        r.summary,
        r.category,
        JSON.stringify(r.tags),
        r.body,
        JSON.stringify(r.metadata),
        r.source_url,
        r.source_author,
        r.license,
        r.provenance,
        r.status,
        r.featured,
      ],
    );
    await tx.query('DELETE FROM scenario_relations WHERE source_id=$1', [id]);
    for (const slug of r.metadata.relatedSlugs || [])
      await tx.query(
        'INSERT INTO scenario_relations(source_id,target_id) SELECT $1,id FROM resources WHERE slug=$2 AND id<>$1 ON CONFLICT DO NOTHING',
        [id, slug],
      );
    await audit(tx, user.id, 'resource.save', id, { title: r.title, status: r.status });
    return { id };
  });
}
export async function moderate(user: User, kind: 'comment' | 'report', id: string, status: string) {
  if (!isModerator(user.role)) throw new AppError('需要审核权限', 403);
  const table = kind === 'comment' ? 'comments' : 'reports';
  if (!(kind === 'comment' ? ['approved', 'rejected'] : ['resolved', 'dismissed']).includes(status))
    throw new AppError('无效状态');
  return (await db()).transaction(async (tx) => {
    const rows = await tx.query(`UPDATE ${table} SET status=$2 WHERE id=$1 RETURNING id`, [
      id,
      status,
    ]);
    if (!rows.length) throw new AppError('记录不存在', 404);
    await audit(tx, user.id, kind + '.' + status, id);
  });
}
export async function updateRole(user: User, id: string, role: string, disabled: boolean) {
  if (user.role !== 'admin') throw new AppError('仅管理员可以管理角色', 403);
  if (id === user.id) throw new AppError('不能修改自己的角色或停用自己');
  return (await db()).transaction(async (tx) => {
    const rows = await tx.query('UPDATE users SET role=$2,disabled=$3 WHERE id=$1 RETURNING id', [
      id,
      role,
      disabled,
    ]);
    if (!rows.length) throw new AppError('用户不存在', 404);
    await audit(tx, user.id, 'user.update', id, { role, disabled });
  });
}
