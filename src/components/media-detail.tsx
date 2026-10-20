import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { cache } from 'react';
import { mediaPost, mediaList, mediaRedirect } from '@/lib/media-service';
import { channels, postPath, type PublicPost } from '@/lib/media-model';
import { siteUrl } from '@/lib/config';
import { currentUser } from '@/lib/auth';
import { EditorialCover, PostMeta, Provenance, PostCard, EditorialSection } from './media';
import { MediaMarkdown, tableOfContents } from './media-markdown';
import { ShareArticle, MediaView } from './media-interactions';
import { InquiryForm } from './media-forms';
const getPost = cache(mediaPost);
export async function mediaMetadata(slug: string) {
  const post = await getPost(slug);
  if (!post) return {};
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.summary,
    alternates: { canonical: postPath(post) },
    robots: post.authenticity === 'example' ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.summary,
      url: postPath(post),
      publishedTime: post.authenticity === 'example' ? undefined : post.published_at || undefined,
      ...(post.cover_id
        ? { images: [{ url: `/api/media/assets/${post.cover_id}`, alt: post.cover_alt }] }
        : {}),
    },
    twitter: { card: 'summary_large_image' as const, title: post.title, description: post.summary },
  };
}
export async function MediaDetail({ section, slug }: { section: string; slug: string }) {
  const post = await getPost(slug),
    path = `/${section}/${slug}`;
  if (!post) {
    const redirect = await mediaRedirect(path);
    if (redirect) permanentRedirect(redirect);
    notFound();
  }
  if (postPath(post) !== path) permanentRedirect(postPath(post));
  return <MediaArticle post={post} />;
}
const facts = [
  ['company', '企业名称'],
  ['industry', '所属行业'],
  ['department', '业务部门'],
  ['scenario', '应用场景'],
  ['technology', '技术路线'],
  ['transformation_level', '转型层级'],
  ['stage', '项目阶段'],
] as const;
const details = [
  ['background', '企业背景'],
  ['problem', '原始业务问题'],
  ['solution', 'AI 解决方案'],
  ['architecture', '系统架构'],
  ['implementation', '实施步骤'],
  ['collaboration', '组织协作机制'],
  ['investment', '项目投入'],
  ['results', '业务效果与 ROI'],
  ['lessons', '经验总结'],
  ['materials', '相关资料'],
] as const;
export async function MediaArticle({
  post,
  preview = false,
}: {
  post: PublicPost;
  preview?: boolean;
}) {
  const [related, user] = await Promise.all([
    mediaList({ channel: post.channel, limit: 4 }),
    currentUser(),
  ]);
  const toc = tableOfContents(post.body),
    url = siteUrl() + postPath(post);
  const observedAt = Date.parse(post.observed_at || post.updated_at);
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': post.authenticity === 'example' ? 'CreativeWork' : 'Article',
      headline: post.title,
      description: post.summary,
      url,
      mainEntityOfPage: url,
      inLanguage: 'zh-CN',
      isAccessibleForFree: true,
      ...(post.authenticity !== 'example'
        ? {
            datePublished: post.published_at,
            dateModified: post.updated_at,
            author: {
              '@type': 'Person',
              name: post.author_name,
              url: siteUrl() + '/authors/' + post.author_slug,
            },
          }
        : {}),
      publisher: { '@type': 'Organization', name: 'FDE前线' },
      ...(post.cover_id ? { image: siteUrl() + '/api/media/assets/' + post.cover_id } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: '首页', item: siteUrl() },
        {
          '@type': 'ListItem',
          position: 2,
          name: channels[post.channel].name,
          item: siteUrl() + '/' + post.channel,
        },
        { '@type': 'ListItem', position: 3, name: post.title, item: url },
      ],
    },
  ];
  return (
    <div className="article-shell">
      {!preview && (
        <>
          <MediaView id={post.id} />
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
          />
        </>
      )}
      {preview && (
        <div className="notice">
          编辑预览 · 未发布的内容不会进入公开列表、搜索或站点地图。
          <Link href={`/admin/media?edit=${post.id}`}>返回编辑</Link>
        </div>
      )}
      <nav className="article-breadcrumb" aria-label="面包屑">
        <Link href="/">首页</Link>
        <span>/</span>
        <Link href={`/${post.channel}`}>{channels[post.channel].name}</Link>
        <span>/</span>
        <span>正文</span>
      </nav>
      <div className="article-grid">
        <article>
          <header className="article-header">
            <span className="media-eyebrow">
              {channels[post.channel].en} / {post.category_name || channels[post.channel].name}
            </span>
            <h1>{post.title}</h1>
            {post.subtitle && <p className="article-subtitle">{post.subtitle}</p>}
            <PostMeta post={post} />
            <p className="article-summary">{post.summary}</p>
            <ShareArticle />
          </header>
          <figure className="article-cover">
            <EditorialCover post={post} large />
            {post.cover_caption && (
              <figcaption className="article-caption">{post.cover_caption}</figcaption>
            )}
          </figure>
          <Provenance post={post} />
          {post.channel === 'cases' && (
            <dl className="case-facts">
              {facts.map(
                ([key, label]) =>
                  post.details[key] && (
                    <div key={key}>
                      <dt>{label}</dt>
                      <dd>{post.details[key]}</dd>
                    </div>
                  ),
              )}
            </dl>
          )}
          {post.channel === 'people' && post.details.person_name && (
            <div className="author-box">
              <div>
                <h3>{post.details.person_name}</h3>
                <p>{post.details.person_title}</p>
              </div>
            </div>
          )}
          {post.channel === 'events' && (
            <div className="report-access">
              <h3>{post.authenticity === 'example' ? '示例活动信息' : '活动安排'}</h3>
              <p>
                时间：
                {post.details.event_start
                  ? new Date(post.details.event_start).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })
                  : '待公布'}
                （北京时间）
              </p>
              <p>地点：{post.details.location}</p>
              <p>
                状态：
                {post.authenticity === 'example'
                  ? '示例，不接受真实报名'
                  : post.details.event_state === 'cancelled'
                    ? '已取消'
                    : post.details.event_end && Date.parse(post.details.event_end) < observedAt
                      ? '已结束'
                      : post.details.event_state === 'open'
                        ? '开放报名'
                        : '报名关闭'}
              </p>
            </div>
          )}
          <MediaMarkdown body={post.body} />
          {post.channel === 'cases' && (
            <div className="case-detail-sections">
              {details.map(
                ([key, label]) =>
                  post.details[key] && (
                    <section key={key}>
                      <h3>{label}</h3>
                      <p>{post.details[key]}</p>
                    </section>
                  ),
              )}
            </div>
          )}
          {post.channel === 'research' && (
            <section className="report-access" id="report">
              <h3>研究资料</h3>
              <p>
                研究团队：{post.details.team || post.author_name} ·{' '}
                {post.details.research_type === 'report'
                  ? '研究报告'
                  : post.details.research_type === 'series'
                    ? '系列研究'
                    : '研究文章'}
              </p>
              {!post.report_id || post.download_access === 'none' ? (
                <p>当前提供在线正文，尚无可下载的公开报告。</p>
              ) : post.download_access === 'public' ? (
                <a className="media-primary" href={`/api/media/assets/${post.report_id}`}>
                  下载公开 PDF
                </a>
              ) : (
                <>
                  <p>此报告需申请获取。审核通过后，可在个人中心下载。</p>
                  {!preview &&
                    (user ? (
                      <InquiryForm kind="report" postId={post.id} />
                    ) : (
                      <Link className="media-primary" href="/login">
                        登录并申请资料
                      </Link>
                    ))}
                </>
              )}
            </section>
          )}
          {post.channel === 'events' &&
            !preview &&
            post.authenticity !== 'example' &&
            post.details.event_state === 'open' &&
            post.details.event_end &&
            Date.parse(post.details.event_end) > observedAt && (
              <section className="report-access">
                <h3>活动报名</h3>
                <InquiryForm kind="event" postId={post.id} />
              </section>
            )}
          <div className="article-tags">
            {post.tags.map((tag) => (
              <Link href={`/tags/${tag}`} key={tag}>
                # {tag}
              </Link>
            ))}
          </div>
          {post.author_slug && (
            <div className="author-box">
              <span className="author-monogram">{post.author_name?.slice(0, 1)}</span>
              <div>
                <h3>
                  <Link href={`/authors/${post.author_slug}`}>{post.author_name} ↗</Link>
                </h3>
                <p>{post.author_bio || '关注企业 AI 转型与产业实践。'}</p>
              </div>
            </div>
          )}
          <ShareArticle />
          <EditorialSection title="继续阅读" en="KEEP EXPLORING" href={`/${post.channel}`} />
          {related.rows
            .filter((p) => p.id !== post.id)
            .slice(0, 3)
            .map((p) => (
              <PostCard key={p.id} post={p} />
            ))}
          <Link className="load-more-link" href={`/${post.channel}`}>
            返回{channels[post.channel].name}
          </Link>
        </article>
        <aside className="article-sidebar">
          <div className="article-toc-media">
            <strong>本文目录</strong>
            <nav aria-label="文章目录">
              {toc.length ? (
                toc.map((t) => (
                  <a
                    key={t.id}
                    href={`#${t.id}`}
                    style={{ paddingLeft: Math.max(0, t.depth - 2) * 12 }}
                  >
                    {t.title}
                  </a>
                ))
              ) : (
                <span>正文</span>
              )}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}
