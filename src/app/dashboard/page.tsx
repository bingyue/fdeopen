import Link from 'next/link';
import { db } from '@/lib/db';
import { loginHref } from '@/lib/return-path';
import { ReadingList, HistorySettings } from '@/components/reading-controls';
import { RecoverySetup } from '@/components/recovery-forms';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { workspaceData, workspaceTabs, type WorkspaceTab } from '@/lib/workspace';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
import { Pagination } from '@/components/pagination';
import { StatusBadge } from '@/components/status-badge';
import { isModerator } from '@/lib/validation';
import { PageHeading, Empty } from '@/components/site';
import { ProfileForm } from '@/components/forms';
import { Logout, SimpleForm, ActionButton } from '@/components/actions';
import { resourcePath } from '@/lib/types';
import { mediaRole } from '@/lib/media-service';
import { isLocalAuth } from '@/lib/config';
import { PasswordForm } from '@/components/account-forms';
export const metadata = { title: '我的工作台', robots: { index: false, follow: false } };
export default async function Dashboard({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const user = await currentUser();
  if (!user)
    redirect(
      loginHref(
        '/dashboard?' +
          new URLSearchParams(
            Object.entries(params).filter(
              (entry): entry is [string, string] => typeof entry[1] === 'string',
            ),
          ).toString(),
      ),
    );
  const mediaAccess = await mediaRole(user);
  const requestedTab = queryText(params, 'tab');
  const tab: WorkspaceTab = workspaceTabs.includes(requestedTab as WorkspaceTab)
    ? (requestedTab as WorkspaceTab)
    : 'overview';
  const { saved, submissions, apps, notifications, owned, stats, page, pages } =
    await workspaceData(user.id, tab, positiveInteger(queryText(params, 'page')));
  const historySettings =
    tab === 'history'
      ? (
          await (
            await db()
          ).query<{ reading_history_enabled: boolean }>(
            'SELECT reading_history_enabled FROM profiles WHERE user_id=$1',
            [user.id],
          )
        )[0]
      : null;
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="YOUR COMMUNITY WORKSPACE"
        title={`你好，${user.name}`}
        description="你的收藏、投稿与开源贡献，都在这里。"
      >
        <Logout />
      </PageHeading>
      <div className="dashboard-layout">
        <nav className="dashboard-nav" aria-label="工作台导航">
          {[
            ['overview', '工作台概览'],
            ['bookmarks', '稍后阅读 / 收藏'],
            ['history', '最近阅读'],
            ['submissions', '投稿与需求'],
            ['applications', '共创申请'],
            ['profile', '个人资料'],
          ].map(([key, label]) => (
            <Link
              aria-current={tab === key ? 'page' : undefined}
              className={tab === key ? 'active' : ''}
              key={key}
              href={`/dashboard?tab=${key}`}
            >
              {label}
            </Link>
          ))}
          <Link href="/dashboard/requests">媒体与合作申请</Link>
          {mediaAccess && <Link href="/admin/media">媒体编辑工作台 ↗</Link>}
          {user.public && <Link href={`/developers/${user.handle}`}>我的公开主页 ↗</Link>}
          {isModerator(user.role) && <Link href="/admin">运营后台 ↗</Link>}
        </nav>
        <div className="dashboard-panel">
          {tab === 'profile' ? (
            <>
              <ProfileForm user={user} />
              {isLocalAuth() && (
                <>
                  <RecoverySetup />
                  <PasswordForm />
                </>
              )}
            </>
          ) : tab === 'bookmarks' || tab === 'history' ? (
            <>
              <h2>{tab === 'history' ? '最近阅读' : '稍后阅读 / 收藏'}</h2>
              {historySettings && (
                <HistorySettings enabled={historySettings.reading_history_enabled} />
              )}
              <ReadingList items={saved} history={tab === 'history'} />
            </>
          ) : tab === 'submissions' ? (
            <>
              <h2>投稿与企业需求</h2>
              <p className="notice">
                企业原始需求与联系信息不会出现在公开搜索、个人主页或场景详情中。
              </p>
              {submissions.length ? (
                submissions.map((s) => (
                  <div key={s.id} className="item-panel">
                    <h3>
                      {s.title}
                      <StatusBadge status={s.status} />
                    </h3>
                    <p>{String(s.payload.summary || '')}</p>
                    <small>
                      {s.kind === 'requirement' ? '私密企业需求' : '社区资源投稿'} ·{' '}
                      {new Date(s.created_at).toLocaleDateString('zh-CN')}
                    </small>
                    {s.review_note && <p>编辑反馈：{s.review_note}</p>}
                    {s.resource_slug && s.resource_kind && (
                      <Link
                        href={resourcePath({ kind: s.resource_kind, slug: s.resource_slug })}
                        className="text-link"
                      >
                        查看公开详情 ↗
                      </Link>
                    )}
                  </div>
                ))
              ) : (
                <Empty
                  title="还没有投稿"
                  description="分享一个项目或技能，从第一次贡献开始。"
                  href="/submit"
                  label="提交资源"
                />
              )}
            </>
          ) : tab === 'applications' ? (
            <>
              <h2>我的共创申请</h2>
              {apps.length ? (
                apps.map((a) => (
                  <div className="item-panel" key={a.id}>
                    <h3>
                      {a.title}
                      <StatusBadge status={a.status} />
                    </h3>
                    <p>{a.message}</p>
                    {a.review_note && <p>维护者反馈：{a.review_note}</p>}
                    {a.pr_url && (
                      <a className="text-link" href={a.pr_url} target="_blank" rel="noreferrer">
                        已提交 PR ↗
                      </a>
                    )}
                    {['accepted', 'submitted'].includes(a.status) && (
                      <SimpleForm
                        action="pr"
                        extra={{ id: a.id }}
                        fields={[
                          {
                            name: 'url',
                            label: 'GitHub PR 链接',
                            type: 'url',
                            placeholder: 'https://github.com/owner/repo/pull/123',
                          },
                        ]}
                        button="提交 PR 供确认"
                        success="PR 已提交，等待贡献确认。"
                      />
                    )}
                  </div>
                ))
              ) : (
                <Empty
                  title="从一个小任务开始"
                  description="选择一个适合你的任务，介绍你的贡献计划。"
                  href="/build"
                  label="探索共创任务"
                />
              )}
            </>
          ) : (
            <>
              <div className="stats-grid">
                {[
                  ['收藏内容', stats.saved],
                  ['累计投稿', stats.submissions],
                  ['共创申请', stats.applications],
                  ['确认贡献', stats.completed],
                ].map(([k, v]) => (
                  <div className="stat-card" key={k}>
                    <small>{k}</small>
                    <b>{v}</b>
                  </div>
                ))}
              </div>
              <h2>社区通知</h2>
              {notifications.length ? (
                <>
                  <ActionButton action="notifications" payload={{}} success="通知已标记为已读">
                    全部标记已读
                  </ActionButton>
                  {notifications.map((n) => (
                    <div className="item-panel" key={n.id}>
                      <h3>
                        {!n.read && <span className="status-dot" />}
                        {n.message}
                      </h3>
                      <small>{new Date(n.created_at).toLocaleDateString('zh-CN')}</small>
                    </div>
                  ))}
                </>
              ) : (
                <p className="notice">审核反馈和贡献确认会显示在这里。</p>
              )}
              <h2 className="spaced">我发布的资源</h2>
              {owned.length ? (
                owned.map((r) => (
                  <div className="list-row" key={r.id}>
                    <Link href={resourcePath(r)}>{r.title}</Link>
                    {['project', 'skill', 'scenario'].includes(r.kind) && (
                      <Link href={`/submit?edit=${r.slug}`}>提交更新 ↗</Link>
                    )}
                  </div>
                ))
              ) : (
                <Empty
                  title="分享你的第一次实践"
                  description="先完善个人资料，再把值得复用的作品介绍给社区。"
                  href="/submit"
                  label="提交项目"
                />
              )}
            </>
          )}
          <Pagination
            page={page}
            pages={pages}
            href={(next) => `/dashboard?tab=${tab}&page=${next}`}
          />
        </div>
      </div>
    </div>
  );
}
