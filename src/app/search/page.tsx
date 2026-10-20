import { Search } from 'lucide-react';
import Link from 'next/link';
import { listResources } from '@/lib/catalog';
import { mediaList } from '@/lib/media-service';
import { ResourceGrid } from '@/components/site';
import { PostCard, MediaEmpty } from '@/components/media';
import { Pagination } from '@/components/pagination';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
export const metadata = {
  title: '全站搜索',
  description: '搜索FDE前线的产业观察、深度内容、企业案例、研究以及开放社区资源。',
  robots: { index: false, follow: true },
  alternates: { canonical: '/search' },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const p = await searchParams,
    q = queryText(p, 'q'),
    page = positiveInteger(queryText(p, 'page')),
    scope = ['community', 'media'].includes(queryText(p, 'scope')) ? queryText(p, 'scope') : 'all';
  const [media, community] = await Promise.all([
    mediaList({ q, page: scope !== 'community' ? page : 1 }),
    listResources(undefined, { q, page: scope !== 'media' ? page : 1 }),
  ]);
  const result =
    scope === 'media'
      ? media
      : scope === 'community'
        ? community
        : {
            count: media.count + community.count,
            pages: Math.max(media.pages, community.pages),
            page: Math.max(media.page, community.page),
          };
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">SEARCH</span>
        <h1>
          搜索产业观察与开放资源<i>。</i>
        </h1>
        <p>在媒体内容与社区实践中，找到值得继续阅读的线索。</p>
      </div>
      <form className="media-filters">
        <Search size={19} />
        <input
          name="q"
          aria-label="全站搜索关键词"
          defaultValue={q}
          placeholder="搜索文章、案例、研究、项目与技能"
          maxLength={100}
        />
        <input type="hidden" name="scope" value={scope} />
        <button>搜索全部</button>
      </form>
      <nav className="media-links">
        <Link
          className={scope === 'all' ? 'active' : ''}
          href={`/search?q=${encodeURIComponent(q)}`}
        >
          全部结果 {media.count + community.count}
        </Link>
        <Link
          className={scope === 'media' ? 'active' : ''}
          href={`/search?q=${encodeURIComponent(q)}&scope=media`}
        >
          媒体内容 {media.count}
        </Link>
        <Link
          className={scope === 'community' ? 'active' : ''}
          href={`/search?q=${encodeURIComponent(q)}&scope=community`}
        >
          社区资源 {community.count}
        </Link>
      </nav>
      <p className="media-result-count">
        找到 {media.count} 篇公开内容 · 找到 {community.count} 个公开资源{q && ` · “${q}”`}
      </p>
      {scope !== 'community' && (
        <div className="media-grid-three">
          {media.rows.map((post) => (
            <PostCard key={post.id} post={post} mode="tile" />
          ))}
        </div>
      )}
      {scope !== 'media' && <ResourceGrid resources={community.rows} />}
      {!result.count && (
        <MediaEmpty
          title="没有匹配的结果"
          description="可以尝试其他关键词，或切换媒体内容与社区资源。"
        />
      )}
      <Pagination
        page={result.page}
        pages={result.pages}
        href={(n) => `/search?q=${encodeURIComponent(q)}&scope=${scope}&page=${n}`}
      />
    </div>
  );
}
