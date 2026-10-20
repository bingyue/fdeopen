import Link from 'next/link';
import { notFound } from 'next/navigation';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { MDXRemote } from 'next-mdx-remote/rsc';
import {
  GitBranch as Github,
  ArrowRight,
  ShieldCheck,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getResource, relatedResources } from '@/lib/catalog';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { resourcePath, kinds } from '@/lib/types';
import { Breadcrumb, ResourceIcon, ResourceGrid, SectionTitle, num } from '@/components/site';
import { ToggleButton, TrackedLink, CopyCode, SimpleForm, ViewEvent } from '@/components/actions';
import { siteUrl } from '@/lib/config';
import { isChannel } from '@/lib/media-model';
import { MediaDetail, mediaMetadata } from '@/components/media-detail';
export async function generateMetadata({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  if (section === 'articles' || isChannel(section)) return mediaMetadata(slug);
  const r = await getResource(slug);
  if (!r || kinds[r.kind].path !== `/${section}`) return {};
  return {
    title: r.title,
    description: r.summary,
    alternates: { canonical: resourcePath(r) },
    openGraph: { title: `${r.title} · FDE前线`, description: r.summary, url: resourcePath(r) },
  };
}
export default async function Detail({
  params,
}: {
  params: Promise<{ section: string; slug: string }>;
}) {
  const { section, slug } = await params;
  if (section === 'articles' || isChannel(section)) return <MediaDetail section={section} slug={slug}/>;
  const r = await getResource(slug);
  if (!r || kinds[r.kind].path !== `/${section}`) notFound();
  const [related, user, database] = await Promise.all([
    relatedResources(r.id),
    currentUser(),
    db(),
  ]);
  const [bookmarks, likes, comments, applications] = await Promise.all([
    user
      ? database.query('SELECT 1 FROM bookmarks WHERE user_id=$1 AND resource_id=$2', [
          user.id,
          r.id,
        ])
      : [],
    user
      ? database.query('SELECT 1 FROM likes WHERE user_id=$1 AND resource_id=$2', [user.id, r.id])
      : [],
    database.query<{ id: string; body: string; created_at: string; name: string }>(
      "SELECT c.id,c.body,c.created_at,p.name FROM comments c JOIN profiles p ON p.user_id=c.user_id WHERE resource_id=$1 AND status='approved' ORDER BY c.created_at DESC",
      [r.id],
    ),
    user && r.kind === 'task'
      ? database.query<{ status: string }>(
          'SELECT status FROM task_applications WHERE user_id=$1 AND task_id=$2',
          [user.id, r.id],
        )
      : [],
  ]);
  const m = r.metadata;
  const tocId = (text: string) => 'doc-' + text.trim().toLowerCase().replace(/\s+/g, '-');
  let article = '';
  if (r.kind === 'article' && m.articleFile && /^[a-z0-9-]+\.mdx$/.test(m.articleFile)) {
    try {
      article = await readFile(path.join(process.cwd(), 'content/articles', m.articleFile), 'utf8');
    } catch {
      article = '';
    }
  }
  return (
    <div className="container detail-page">
      <ViewEvent id={r.id} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': r.kind === 'article' ? 'TechArticle' : 'CreativeWork',
            name: r.title,
            description: r.summary,
            url: siteUrl() + resourcePath(r),
            author: { '@type': 'Organization', name: r.source_author || 'FDE前线' },
            isAccessibleForFree: true,
          }).replace(/</g, '\\u003c'),
        }}
      />
      <Breadcrumb r={r} />
      <div className="detail-header">
        <ResourceIcon r={r} large />
        <div>
          <div className="tags">
            <span>{r.category}</span>
            {r.featured && <span className="blue-tag">社区精选</span>}
            {r.provenance === 'demo' && <span>演示内容</span>}
            {r.kind === 'scenario' && <span>编辑方案 · 非客户成果</span>}
          </div>
          <h1>{r.title}</h1>
          <p>{r.summary}</p>
        </div>
      </div>
      <div className="detail-meta">
        <span>由 {r.source_author || '社区贡献者'} 提供</span>
        {m.stars !== undefined && <span>☆ {num(m.stars)} GitHub Stars</span>}
        {m.language && <span>{m.language}</span>}
        {r.license && <span>{r.license}</span>}
        {m.version && <span>v{m.version}</span>}
      </div>
      <div className="detail-layout">
        <article className="detail-main">
          <nav className="detail-tabs" aria-label="页面章节">
            <a href="#overview">概览</a>
            <a href="#getting-started">{r.kind === 'scenario' ? '实施路径' : '开始使用'}</a>
            <a href="#related">关联资源</a>
            <a href="#discussion">社区讨论</a>
          </nav>
          <section id="overview" className="prose-section">
            <h2>
              {r.kind === 'scenario'
                ? '业务痛点'
                : '关于这个' +
                  {
                    project: '项目',
                    skill: '技能',
                    scenario: '场景',
                    demo: '演示',
                    task: '任务',
                    article: '文档',
                  }[r.kind]}
            </h2>
            {article ? (
              <div className="prose">
                <MDXRemote
                  source={article}
                  components={{
                    h2: ({ children }) => <h2 id={tocId(String(children))}>{children}</h2>,
                  }}
                />
              </div>
            ) : (
              r.body.split('\n\n').map((p, i) => <p key={i}>{p}</p>)
            )}
            {r.kind === 'project' && (
              <>
                <h3>接入思路</h3>
                <div className="architecture-flow">
                  {(m.architecture || ['准备业务数据', '连接项目能力', '评测与交付']).map(
                    (s, i) => (
                      <span key={s}>
                        <small>0{i + 1}</small>
                        {s}
                      </span>
                    ),
                  )}
                </div>
                <p className="small muted">
                  以上为 FDE前线 建议的应用接入层次，项目内部架构请查阅原作者文档。
                </p>
              </>
            )}
            {r.kind === 'scenario' && (
              <>
                <h3>AI 应用方案</h3>
                <p>{m.solution}</p>
                <div className="metric-box">
                  <h3>如何衡量价值</h3>
                  {m.metrics?.map((t) => (
                    <div key={t}>
                      <CheckCircle2 size={17} />
                      {t}
                    </div>
                  ))}
                  <small>先记录人工流程基线，再通过试点比较；不预设收益承诺。</small>
                </div>
              </>
            )}
            {r.kind === 'task' && (
              <>
                <h3>预期交付物</h3>
                <ul>
                  {m.deliverables?.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p>
                  维护者审核申请后即可开始；提交公开的 GitHub PR
                  链接，审核确认后计入个人贡献。贡献标识表示社区审核记录。
                </p>
              </>
            )}
          </section>
          <section id="getting-started" className="prose-section">
            <h2>{r.kind === 'scenario' ? '建议实施路径' : '开始使用'}</h2>
            {r.kind === 'skill' && (
              <>
                {m.install && <CopyCode code={m.install} />}
                <h3>配置与依赖</h3>
                <p>{m.configuration || '请阅读来源中的配置说明。'}</p>
                <div className="tags">
                  {m.dependencies?.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <h3>使用示例</h3>
                <blockquote>{m.example || '查看原始资源了解使用方式。'}</blockquote>
              </>
            )}
            {r.kind === 'scenario' && (
              <ol className="step-list">
                {m.workflow?.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ol>
            )}
            {r.kind === 'demo' && (
              <>
                <div className="sample-io">
                  <span>示例输入</span>
                  <p>{m.input}</p>
                  <span>说明性输出 · 非实时模型结果</span>
                  <p>{m.output}</p>
                </div>
                {m.demoUrl && (
                  <TrackedLink
                    id={r.id}
                    event="demo_click"
                    href={m.demoUrl}
                    className="btn btn-primary"
                  >
                    前往项目体验
                  </TrackedLink>
                )}
                <p className="small muted">
                  外部服务由项目方提供，可能需要登录、配置模型或单独承担费用。
                </p>
              </>
            )}
            {r.kind === 'project' && (
              <>
                <p>
                  建议固定版本，在隔离环境中复现原项目 Quick
                  Start，记录依赖、模型服务和数据权限。本站仅索引原项目，不托管或执行仓库代码。
                </p>
                <a
                  href={m.docsUrl || r.source_url + '#readme'}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary"
                >
                  <BookOpen size={17} />
                  原项目部署文档
                  <ArrowUpRight size={15} />
                </a>
                {m.readme && (
                  <details className="readme-preview">
                    <summary>展开同步的 README 纯文本</summary>
                    <pre>{m.readme}</pre>
                  </details>
                )}
              </>
            )}
            {r.kind === 'article' && (
              <p>
                文档版本 {m.version || '1.0.0'}
                。欢迎通过资源反馈提出修订建议，内容由社区编辑审核更新。
              </p>
            )}
            {r.kind === 'task' &&
              (applications.length ? (
                <p className="notice">
                  你已提交这项共创申请。
                  <Link href="/dashboard?tab=applications" className="text-link">
                    查看申请进度与反馈 →
                  </Link>
                </p>
              ) : m.state !== 'open' ? (
                <p className="notice">
                  该任务{m.state === 'completed' ? '已完成' : '暂不接受新的申请'}。
                  <Link href="/build" className="text-link">
                    查看其他共创任务 →
                  </Link>
                </p>
              ) : user ? (
                <SimpleForm
                  action="apply"
                  extra={{ resourceId: r.id }}
                  fields={[
                    {
                      name: 'message',
                      label: '你计划如何完成这项贡献？',
                      placeholder: '介绍相关经验、预计时间与交付计划',
                      minLength: 10,
                    },
                  ]}
                  button="申请认领"
                  success="申请已提交，在工作台查看审核进度。"
                />
              ) : (
                <Link href="/login" className="btn btn-primary">
                  登录后申请认领 <ArrowRight size={16} />
                </Link>
              ))}
          </section>
          <section id="related" className="prose-section">
            <SectionTitle
              title="一起使用，更进一步"
              description="场景、项目与技能之间的双向关联。"
            />
            <ResourceGrid resources={related} />
          </section>
          <section id="discussion" className="prose-section">
            <h2>
              社区讨论 <span className="muted small">{comments.length} 条公开讨论</span>
            </h2>
            {comments.length ? (
              comments.map((c) => (
                <div key={c.id} className="comment">
                  <b>{c.name}</b>
                  <time>{new Date(c.created_at).toLocaleDateString('zh-CN')}</time>
                  <p>{c.body}</p>
                </div>
              ))
            ) : (
              <p className="muted">分享你的复现经验、适用场景或遇到的问题。</p>
            )}
            {user ? (
              <SimpleForm
                action="comment"
                extra={{ resourceId: r.id }}
                fields={[
                  {
                    name: 'body',
                    label: '写下你的实践或问题',
                    placeholder: '尊重作者，不公开客户信息。评论经过审核后显示。',
                  },
                ]}
                button="提交讨论"
                success="讨论已进入审核队列，通过后公开显示。"
              />
            ) : (
              <Link href="/login" className="text-link">
                登录参与讨论 <ArrowRight size={15} />
              </Link>
            )}
          </section>
        </article>
        <aside className="detail-aside">
          <div className="side-panel">
            {article && (
              <nav className="article-toc" aria-label="文章目录">
                <h3>本文目录</h3>
                {[...article.matchAll(/^## (.+)$/gm)].map((h) => (
                  <a key={h[1]} href={`#${tocId(h[1])}`}>
                    {h[1]}
                  </a>
                ))}
              </nav>
            )}
            <h3>开始你的下一步</h3>
            {r.source_url && (
              <TrackedLink
                id={r.id}
                event="github_click"
                href={r.source_url}
                className="btn btn-primary"
              >
                {r.source_url.startsWith('https://github.com') ? (
                  <Github size={17} />
                ) : (
                  <ExternalLink size={17} />
                )}
                查看原始资源
              </TrackedLink>
            )}
            <ToggleButton
              id={r.id}
              kind="bookmark"
              initial={bookmarks.length > 0}
              loggedIn={!!user}
            />
            <ToggleButton id={r.id} kind="like" initial={likes.length > 0} loggedIn={!!user} />
            <hr />
            <h4>
              <ShieldCheck size={16} />
              来源与使用说明
            </h4>
            <p>
              {r.provenance === 'external'
                ? '由社区收录的外部项目，归原作者所有。收录不代表官方合作或背书。'
                : r.kind === 'scenario'
                  ? '编辑整理的方案示例，需根据你的业务环境验证。'
                  : '由社区整理的开放实践内容。'}
            </p>
            {r.license && <p>许可：{r.license}</p>}
            {m.licenseNote && <p>{m.licenseNote}</p>}
            {m.licenseUrl && (
              <a href={m.licenseUrl} target="_blank" rel="noreferrer">
                查看原许可 ↗
              </a>
            )}
            {m.checkedAt && (
              <small>
                来源核验：{new Date(m.checkedAt).toLocaleDateString('zh-CN')}
                <br />
                Stars 等元数据并非实时值
              </small>
            )}
            {m.platforms && (
              <>
                <h4>适配平台</h4>
                <div className="tags">
                  {m.platforms.map((p) => (
                    <span key={p}>{p}</span>
                  ))}
                </div>
              </>
            )}
            {m.size && (
              <>
                <h4>适用企业</h4>
                <p>{m.size}</p>
              </>
            )}
            {m.deadline && <p>期限：{m.deadline}</p>}
          </div>
          <div className="side-panel muted-panel">
            <h3>让这份资源变得更好</h3>
            <p>发现来源失效、许可问题或不当内容？欢迎向编辑反馈。</p>
            <details>
              <summary>反馈或举报</summary>
              {user ? (
                <SimpleForm
                  action="report"
                  extra={{ resourceId: r.id }}
                  fields={[{ name: 'reason', label: '反馈说明', minLength: 5 }]}
                  button="提交反馈"
                  success="已收到，编辑会审核处理。"
                />
              ) : (
                <Link href="/login">登录后提交反馈</Link>
              )}
            </details>
          </div>
        </aside>
      </div>
    </div>
  );
}
