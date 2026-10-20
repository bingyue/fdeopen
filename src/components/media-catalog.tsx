import Link from 'next/link';
import { mediaList, mediaTaxonomy, caseFilters } from '@/lib/media-service';
import { type Channel } from '@/lib/media-model';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
import { Pagination } from './pagination';
import { ChannelHeading, PostCard, MediaEmpty } from './media';
export async function MediaCatalog({
  channel,
  params,
}: {
  channel: Channel;
  params: SearchParams;
}) {
  const q = queryText(params, 'q'),
    category = queryText(params, 'category'),
    tag = queryText(params, 'tag');
  const industry = queryText(params, 'industry'),
    scenario = queryText(params, 'scenario'),
    technology = queryText(params, 'technology');
  const [result, taxonomy, filters] = await Promise.all([
    mediaList({
      channel,
      q,
      category,
      tag,
      industry,
      scenario,
      technology,
      featured: queryText(params, 'featured') === '1',
      page: positiveInteger(queryText(params, 'page')),
    }),
    mediaTaxonomy(),
    channel === 'cases' ? caseFilters() : [],
  ]);
  return (
    <div className="media-container media-page">
      <ChannelHeading channel={channel} />
      <form action={`/${channel}`} className="media-filters">
        <input
          name="q"
          aria-label="搜索栏目内容"
          defaultValue={q}
          placeholder="搜索标题、内容或业务场景"
          maxLength={100}
        />
        <select name="category" aria-label="内容分类" defaultValue={category}>
          <option value="">全部分类</option>
          {taxonomy.categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {channel === 'cases' &&
          (['industry', 'scenario', 'technology'] as const).map((key, i) => (
            <select
              key={key}
              name={key}
              aria-label={['行业', '应用场景', '技术类型'][i]}
              defaultValue={queryText(params, key)}
            >
              <option value="">全部{['行业', '场景', '技术'][i]}</option>
              {[...new Set(filters.map((f) => f[key]).filter(Boolean))].sort().map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          ))}
        <button>筛选内容</button>
        <Link href={`/${channel}`}>重置</Link>
      </form>
      <div className="media-filter-links">
        <Link href={`/${channel}`} className={!tag ? 'active' : ''}>
          全部标签
        </Link>
        {taxonomy.tags.map((t) => (
          <Link
            key={t.slug}
            className={tag === t.slug ? 'active' : ''}
            href={`/${channel}?tag=${t.slug}`}
          >
            {t.name}
          </Link>
        ))}
      </div>
      <p className="media-result-count">共 {result.count} 篇已公开内容</p>
      <div className="media-grid-three">
        {result.rows.map((post) => (
          <PostCard key={post.id} post={post} mode="tile" />
        ))}
      </div>
      {!result.rows.length && (
        <MediaEmpty
          title="没有匹配的内容"
          description="可以调整关键词或筛选条件，查看其他已公开内容。"
        />
      )}
      <Pagination
        page={result.page}
        pages={result.pages}
        href={(page) => {
          const u = new URLSearchParams({
            q,
            category,
            tag,
            industry,
            scenario,
            technology,
            page: String(page),
          });
          if (queryText(params, 'featured')) u.set('featured', '1');
          return `/${channel}?${u}`;
        }}
      />
    </div>
  );
}
