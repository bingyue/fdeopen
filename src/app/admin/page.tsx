import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { isModerator } from '@/lib/validation';
import { homeSettings, summaryColumns } from '@/lib/catalog';
import { audit } from '@/lib/service';
import { PageHeading, Empty } from '@/components/site';
import { ActionButton, SimpleForm } from '@/components/actions';
import {
  ResourceEditor,
  ReviewForm,
  SettingsForm,
  RoleForm,
  CollectionEditor,
} from '@/components/admin-forms';
import { Button } from '@/components/ui/button';
import { queryText, type SearchParams } from '@/lib/pagination';
import { StatusBadge } from '@/components/status-badge';
import {
  resourcePath,
  kinds,
  type Resource,
  type User,
  type Submission,
  type Application,
  type Collection,
} from '@/lib/types';
export const metadata = { title: '运营后台', robots: { index: false, follow: false } };
const tabs = [
  ['overview', '运营概览'],
  ['submissions', '投稿审核'],
  ['resources', '内容管理'],
  ['requirements', '企业需求'],
  ['applications', '共创申请'],
  ['comments', '讨论审核'],
  ['reports', '内容举报'],
  ['collections', '专题管理'],
  ['users', '用户与权限'],
  ['settings', '首页配置'],
  ['logs', '操作日志'],
];
export default async function Admin({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  if (!isModerator(user.role))
    return (
      <div className="container page-space">
        <Empty
          title="需要社区管理权限"
          description="当前身份无法访问后台。普通成员可以在工作台查看自己的投稿和贡献。"
          href="/dashboard"
          label="返回工作台"
        />
      </div>
    );
  const params = await searchParams;
  const requestedTab = queryText(params, 'tab');
  const tab = tabs.some(([key]) => key === requestedTab) ? requestedTab : 'overview';
  const edit = queryText(params, 'edit'),
    q = queryText(params, 'q');
  const database = await db();
  let panel: React.ReactNode;
  if (tab === 'resources') {
    const resources = edit
      ? []
      : await database.query<Resource>(
          `SELECT ${summaryColumns} FROM resources r WHERE r.title ILIKE $1 ORDER BY r.updated_at DESC LIMIT 200`,
          [`%${q.slice(0, 100)}%`],
        );
    const target =
      edit && edit !== 'new'
        ? (await database.query<Resource>('SELECT * FROM resources WHERE id::text=$1', [edit]))[0]
        : undefined;
    if (edit && edit !== 'new' && !target) notFound();
    panel = edit ? (
      <ResourceEditor key={edit} resource={target} />
    ) : (
      <>
        <div className="admin-toolbar">
          <form className="catalog-search" action="/admin">
            <input type="hidden" name="tab" value="resources" />
            <div className="search-input">
              <Search size={16} />
              <input
                name="q"
                aria-label="搜索后台内容"
                defaultValue={q}
                placeholder="搜索内容标题"
              />
            </div>
            <Button variant="secondary">搜索</Button>
          </form>
          <Button asChild>
            <Link href="/admin?tab=resources&edit=new">
              <Plus size={15} />
              新建内容
            </Link>
          </Button>
        </div>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>内容</th>
                <th>类型</th>
                <th>状态</th>
                <th>推荐</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link
                      href={
                        r.status === 'published'
                          ? resourcePath(r)
                          : `/admin?tab=resources&edit=${r.id}`
                      }
                    >
                      {r.title}
                    </Link>
                  </td>
                  <td>{kinds[r.kind].label}</td>
                  <td>
                    <StatusBadge status={r.status} />
                  </td>
                  <td>{r.featured ? '精选' : '—'}</td>
                  <td>
                    <Link href={`/admin?tab=resources&edit=${r.id}`}>编辑</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (tab === 'submissions' || tab === 'requirements') {
    const requirements = tab === 'requirements';
    if (requirements) await audit(database, user.id, 'requirement.view', 'private-queue');
    const submissions = await database.query<Submission>(
      `SELECT * FROM submissions WHERE kind ${requirements ? '=' : '<>'} 'requirement' ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END,created_at DESC LIMIT 100`,
    );
    panel = (
      <>
        <h2>{requirements ? '私密企业需求' : '社区投稿审核'}</h2>
        {requirements && (
          <div className="notice">
            原始需求与联系方式不进入公开内容。只有投稿人同意公开时，才能另写脱敏文案并转为共创任务。查看操作已记录审计日志。
          </div>
        )}
        {submissions.length ? (
          submissions.map((s) => (
            <div className="item-panel" key={s.id}>
              <h3>
                {s.title}
                <StatusBadge status={s.status} />
                {s.payload.existingResourceId ? <span className="state">资源更新</span> : null}
              </h3>
              <p>{String(s.payload.summary || '')}</p>
              {s.payload.sourceUrl && typeof s.payload.sourceUrl === 'string' ? (
                <a
                  href={s.payload.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  查看提交来源 ↗
                </a>
              ) : null}
              {requirements && (
                <>
                  <p>联系信息：{String(s.payload.contact || '未填写')}</p>
                  <p>
                    公开授权：{s.payload.publicConsent ? '允许脱敏后公开' : '未授权，仅私密跟进'}
                  </p>
                </>
              )}
              <small>
                {s.kind} · {new Date(s.created_at).toLocaleDateString('zh-CN')}
              </small>
              {s.review_note && <p>备注：{s.review_note}</p>}
              {s.status === 'pending' && <ReviewForm s={s} />}
            </div>
          ))
        ) : (
          <Empty title="队列已清空" description="新的投稿会出现在这里。" />
        )}
      </>
    );
  } else if (tab === 'applications') {
    const apps = await database.query<Application>(
      'SELECT a.*,r.title,p.name FROM task_applications a JOIN resources r ON r.id=a.task_id JOIN profiles p ON p.user_id=a.user_id ORDER BY a.created_at DESC LIMIT 100',
    );
    panel = (
      <>
        <h2>共创申请与贡献确认</h2>
        <p className="notice">
          确认贡献前，请打开 PR 核实作者、交付内容与验收结果。社区不会把申请次数当作贡献次数。
        </p>
        {apps.length ? (
          apps.map((a) => (
            <div className="item-panel" key={a.id}>
              <h3>
                {a.title}
                <StatusBadge status={a.status} />
              </h3>
              <p>
                {a.name}：{a.message}
              </p>
              {a.pr_url && (
                <a href={a.pr_url} target="_blank" rel="noreferrer" className="text-link">
                  核验 GitHub PR ↗
                </a>
              )}
              <div className="item-actions">
                {a.status === 'pending' && (
                  <ActionButton
                    action="review-application"
                    payload={{
                      id: a.id,
                      status: 'accepted',
                      note: '欢迎参与，请按任务要求提交 PR。',
                    }}
                  >
                    接受认领
                  </ActionButton>
                )}
                {['pending', 'accepted', 'submitted'].includes(a.status) && (
                  <SimpleForm
                    action="review-application"
                    extra={{ id: a.id, status: 'rejected' }}
                    fields={[{ name: 'note', label: '未通过原因' }]}
                    button="退回申请"
                    success="已反馈给申请者。"
                  />
                )}
                {a.status === 'submitted' && (
                  <ActionButton
                    action="review-application"
                    variant="default"
                    payload={{
                      id: a.id,
                      status: 'completed',
                      note: '经社区审核，交付贡献已确认。',
                    }}
                    success="贡献已记录到开发者档案。"
                  >
                    已核实交付，确认贡献
                  </ActionButton>
                )}
              </div>
            </div>
          ))
        ) : (
          <Empty title="暂无共创申请" description="社区成员认领任务后，你可以在此审核。" />
        )}
      </>
    );
  } else if (tab === 'comments' || tab === 'reports') {
    const isComment = tab === 'comments';
    const rows = await database.query<{
      id: string;
      body?: string;
      reason?: string;
      title: string;
      name: string;
      status: string;
    }>(
      `SELECT t.*,r.title,p.name FROM ${isComment ? 'comments' : 'reports'} t JOIN resources r ON r.id=t.resource_id JOIN profiles p ON p.user_id=t.user_id ORDER BY t.created_at DESC LIMIT 100`,
    );
    panel = (
      <>
        <h2>{isComment ? '社区讨论审核' : '内容举报处理'}</h2>
        {rows.length ? (
          rows.map((r) => (
            <div className="item-panel" key={r.id}>
              <h3>
                {r.title}
                <StatusBadge status={r.status} />
              </h3>
              <p>
                {r.name}：{r.body || r.reason}
              </p>
              {r.status === 'pending' && (
                <div className="item-actions">
                  <ActionButton
                    action="moderate"
                    payload={{
                      kind: isComment ? 'comment' : 'report',
                      id: r.id,
                      status: isComment ? 'approved' : 'resolved',
                    }}
                  >
                    {isComment ? '审核通过' : '标记已处理'}
                  </ActionButton>
                  <ActionButton
                    action="moderate"
                    payload={{
                      kind: isComment ? 'comment' : 'report',
                      id: r.id,
                      status: isComment ? 'rejected' : 'dismissed',
                    }}
                  >
                    {isComment ? '拒绝公开' : '驳回举报'}
                  </ActionButton>
                </div>
              )}
            </div>
          ))
        ) : (
          <Empty title="当前没有待处理内容" description="新讨论和举报会进入这里。" />
        )}
      </>
    );
  } else if (tab === 'users') {
    const users = await database.query<User>(
      'SELECT u.id,u.role,u.disabled,p.* FROM users u JOIN profiles p ON p.user_id=u.id ORDER BY u.created_at DESC LIMIT 100',
    );
    panel = (
      <>
        <h2>用户与社区角色</h2>
        <p className="notice">
          维护者是管理角色，不代表已通过专家或职业能力认证。只有管理员可以调整权限。
        </p>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>用户</th>
                <th>身份</th>
                <th>公开档案</th>
                <th>权限管理</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>
                    {u.name}
                    <br />
                    <small>{u.handle}</small>
                  </td>
                  <td>{u.is_demo ? '演示身份' : 'GitHub 身份'}</td>
                  <td>{u.public ? '已公开' : '私密'}</td>
                  <td>
                    {user.role === 'admin' ? (
                      <RoleForm
                        id={u.id}
                        role={u.role}
                        disabled={u.disabled}
                        self={u.id === user.id}
                      />
                    ) : (
                      u.role
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else if (tab === 'settings') panel = <SettingsForm settings={await homeSettings()} />;
  else if (tab === 'collections') {
    const cs = await database.query<Collection>('SELECT * FROM collections ORDER BY title');
    const target = cs.find((c) => c.id === edit);
    const resources = await database.query<Resource>('SELECT * FROM resources ORDER BY title');
    const selected = target
      ? (
          await database.query<{ resource_id: string }>(
            'SELECT resource_id FROM collection_items WHERE collection_id=$1',
            [target.id],
          )
        ).map((r) => r.resource_id)
      : [];
    panel = edit ? (
      <CollectionEditor key={edit} collection={target} resources={resources} selected={selected} />
    ) : (
      <>
        <div className="admin-toolbar">
          <h2>专题管理</h2>
          <Button asChild>
            <Link href="/admin?tab=collections&edit=new">新建专题</Link>
          </Button>
        </div>
        {cs.map((c) => (
          <div className="list-row" key={c.id}>
            <div>
              <b>{c.title}</b>
              <p className="small muted">{c.published ? '公开' : '未公开'}</p>
            </div>
            <Link href={`/admin?tab=collections&edit=${c.id}`}>编辑专题 ↗</Link>
          </div>
        ))}
      </>
    );
  } else if (tab === 'logs') {
    const logs = await database.query<{
      id: string;
      action: string;
      target_id: string;
      created_at: string;
      details: unknown;
      actor_id: string;
    }>('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 100');
    panel = (
      <>
        <h2>最近 100 条操作日志</h2>
        <div className="table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>操作 / 目标</th>
                <th>操作者</th>
                <th>时间</th>
                <th>明细</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.action}
                    <br />
                    {l.target_id}
                  </td>
                  <td>{l.actor_id?.slice(0, 8) || '系统'}</td>
                  <td>
                    {new Date(l.created_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                  </td>
                  <td>
                    <details>
                      <summary>查看</summary>
                      <pre>{JSON.stringify(l.details, null, 2)}</pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  } else {
    const [counts, events, pending] = await Promise.all([
      database.query<{ kind: string; count: number }>(
        "SELECT kind,count(*)::int count FROM resources WHERE status='published' GROUP BY kind",
      ),
      database.query<{ event: string; count: number }>(
        "SELECT event,count(*)::int count FROM analytics_events WHERE created_at>now()-interval '30 days' GROUP BY event",
      ),
      database.query<{ count: number }>(
        "SELECT count(*)::int count FROM submissions WHERE status='pending'",
      ),
    ]);
    panel = (
      <>
        <h2>社区运营概览</h2>
        <div className="stats-grid">
          {[
            ['公开项目', counts.find((c) => c.kind === 'project')?.count || 0],
            ['Skills', counts.find((c) => c.kind === 'skill')?.count || 0],
            ['行业场景', counts.find((c) => c.kind === 'scenario')?.count || 0],
            ['待审投稿', pending[0]?.count || 0],
          ].map(([name, count]) => (
            <div className="stat-card" key={name}>
              <small>{name}</small>
              <b>{count}</b>
            </div>
          ))}
        </div>
        <h2>近 30 天核心转化事件</h2>
        <div className="notice">
          统计来自本站真实触发的事件总次数，不等于独立访客；演示环境中的测试操作也会计入。本系统不收集事件原文或企业联系方式。
        </div>
        <div className="stats-grid">
          {[
            ['view', '详情浏览'],
            ['github_click', '原资源跳转'],
            ['bookmark', '新增收藏'],
            ['submission', '投稿'],
            ['demo_click', 'Demo 跳转'],
            ['task_apply', '认领申请'],
            ['requirement', '企业需求'],
          ].map(([key, name]) => (
            <div className="stat-card" key={key}>
              <small>{name}</small>
              <b>{events.find((e) => e.event === key)?.count || 0}</b>
            </div>
          ))}
        </div>
        <div className="item-panel">
          <h3>GitHub 元数据同步</h3>
          <p>
            服务端缓存有效期 6 小时，日常由定时接口更新。同步失败不会删除已有内容；README
            仅作安全纯文本展示。
          </p>
          <ActionButton
            action="github-sync"
            payload={{}}
            success="同步请求已完成。若部分仓库受限，请检查服务日志与 GitHub 配额。"
          >
            同步项目元数据
          </ActionButton>
        </div>
        <div className="item-panel">
          <h3>运营起点</h3>
          <p>
            维护来源、审核投稿、补充部署与评测证据。优先围绕「100 个企业 AI
            开源实战项目共建计划」形成可复用内容。
          </p>
          <Link href="/admin?tab=submissions" className="text-link">
            打开审核队列 ↗
          </Link>
        </div>
      </>
    );
  }
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="COMMUNITY OPERATIONS"
        title="社区运营台"
        description="让内容保持可信，让贡献获得回应。"
      >
        <Button asChild variant="secondary">
          <Link href="/dashboard">返回个人工作台</Link>
        </Button>
      </PageHeading>
      <div className="dashboard-layout">
        <nav className="dashboard-nav" aria-label="后台导航">
          <Link href="/admin/media">媒体编辑工作台 ↗</Link>
          {tabs.map(([key, title]) => (
            <Link key={key} href={`/admin?tab=${key}`} className={key === tab ? 'active' : ''}>
              {title}
            </Link>
          ))}
        </nav>
        <div className="dashboard-panel">{panel}</div>
      </div>
    </div>
  );
}
