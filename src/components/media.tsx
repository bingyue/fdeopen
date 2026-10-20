import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, ArrowRight } from 'lucide-react';
import {
  channels,
  postPath,
  authenticityNames,
  type PublicPost,
  type Channel,
} from '@/lib/media-model';
export function EditorialCover({ post, large = false }: { post: PublicPost; large?: boolean }) {
  if (post.cover_id)
    return (
      <div className={`editorial-cover cover-image ${large ? 'large' : ''}`}>
        <Image
          src={`/api/media/assets/${post.cover_id}`}
          alt={post.cover_alt || post.title}
          width={1200}
          height={760}
          unoptimized
          priority={large}
        />
      </div>
    );
  return (
    <div
      className={`editorial-cover cover-${post.cover_style} ${large ? 'large' : ''}`}
      aria-hidden="true"
    >
      <div className="cover-top">
        <span>FDE前线 / {channels[post.channel].en}</span>
        <span>FIELD NOTES</span>
      </div>
      <div className="cover-geometry">
        <i />
        <i />
        <i />
        <i />
        <i />
        <div className="cover-rule" />
      </div>
      <div className="cover-type">
        <span>
          {post.channel === 'research'
            ? 'RESEARCH'
            : post.channel === 'cases'
              ? 'IN PRACTICE'
              : post.channel === 'people'
                ? 'PERSPECTIVES'
                : 'THE NEXT'}
        </span>
        <strong>
          {post.channel === 'research'
            ? '企业 AI 研究'
            : post.channel === 'cases'
              ? post.details.industry || '企业实践'
              : post.channel === 'people'
                ? '一线的思考'
                : '组织的下一步'}
        </strong>
      </div>
      <div className="cover-bottom">
        <span>TECHNOLOGY / BUSINESS / PEOPLE</span>
        <span>↗</span>
      </div>
    </div>
  );
}
export function PostMeta({ post }: { post: PublicPost }) {
  return (
    <div className="post-meta">
      <span>{post.author_name || '编辑部'}</span>
      <span>·</span>
      {post.authenticity === 'example' ? (
        <span className="example-label">示例内容</span>
      ) : (
        <time dateTime={post.published_at || undefined}>
          {post.published_at
            ? new Date(post.published_at).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
            : ''}
        </time>
      )}
      {post.authenticity === 'sourced' && <span>来源整理</span>}
      {post.sponsored && <span className="sponsor-label">商业合作</span>}
    </div>
  );
}
export function PostCard({
  post,
  mode = 'row',
}: {
  post: PublicPost;
  mode?: 'row' | 'tile' | 'compact';
}) {
  return (
    <article className={`post-card post-${mode}`}>
      {mode !== 'compact' && (
        <Link href={postPath(post)} tabIndex={-1} aria-hidden="true" prefetch={false}>
          <EditorialCover post={post} />
        </Link>
      )}
      <div className="post-copy">
        <div className="post-kicker">
          <Link href={`/${post.channel}`}>{channels[post.channel].name}</Link>
          {post.category_name && <span> / {post.category_name}</span>}
        </div>
        <h3>
          <Link href={postPath(post)} prefetch={false}>
            {post.title}
          </Link>
        </h3>
        {mode !== 'compact' && <p>{post.summary}</p>}
        <PostMeta post={post} />
      </div>
    </article>
  );
}
export function EditorialSection({
  title,
  en,
  href,
  description,
}: {
  title: string;
  en: string;
  href: string;
  description?: string;
}) {
  return (
    <div className="editorial-section-title">
      <div>
        <span>{en}</span>
        <h2>
          {title}
          <i />
        </h2>
        {description && <p>{description}</p>}
      </div>
      <Link href={href}>
        查看全部 <ArrowUpRight size={16} />
      </Link>
    </div>
  );
}
export function MediaEmpty({
  title = '内容正在准备中',
  description = '编辑团队正在整理这一栏目的内容。你也可以探索其他栏目，或分享一线实践。',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="media-empty">
      <span>FDE / OPEN</span>
      <h2>{title}</h2>
      <p>{description}</p>
      <Link href="/contribute">
        投稿与合作 <ArrowRight size={16} />
      </Link>
    </div>
  );
}
export function Provenance({ post }: { post: PublicPost }) {
  return (
    <aside className={`provenance ${post.authenticity === 'example' ? 'is-example' : ''}`}>
      <strong>
        {authenticityNames[post.authenticity]}
        {post.sponsored ? ' · 商业合作内容' : ''}
      </strong>
      <p>
        {post.authenticity === 'example'
          ? '本文为功能与版式演示内容，不代表真实采访、已核实企业实践或实际经营结果。'
          : post.authenticity === 'sourced'
            ? '本文依据公开资料整理。企业实践与效果数字为材料披露，本站未进行独立项目审计；文中的分析、推断与交付建议不代表原项目实际执行。'
            : post.authenticity === 'anonymous'
              ? '企业身份已作匿名处理。编辑部保留核验记录，公开信息以授权范围为限。'
              : post.authenticity === 'verified'
                ? '编辑部已记录来源及核验依据，结论适用于文中说明的范围。'
                : '本文呈现作者的分析与观点，请结合具体业务情况理解。'}
      </p>
      {post.source_name && (
        <small>
          来源：
          {post.source_url ? (
            <a href={post.source_url} target="_blank" rel="noreferrer">
              {post.source_name} ↗
            </a>
          ) : (
            post.source_name
          )}
        </small>
      )}
    </aside>
  );
}
export function ChannelHeading({ channel }: { channel: Channel }) {
  const c = channels[channel];
  return (
    <div className="channel-heading">
      <span className="media-eyebrow">FDE前线 / {c.en}</span>
      <h1>
        {c.name}
        <i>。</i>
      </h1>
      <p>{c.description}</p>
    </div>
  );
}
