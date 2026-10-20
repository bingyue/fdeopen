import { notFound } from 'next/navigation';
import { mediaTaxonomy, mediaList } from '@/lib/media-service';
import { PostCard, MediaEmpty } from '@/components/media';
import { Pagination } from '@/components/pagination';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    t = (await mediaTaxonomy()).tags.find((t) => t.slug === slug);
  return t
    ? {
        title: t.name + ' · 相关内容',
        description: t.description || '阅读' + t.name + '相关的产业观察、案例和研究。',
        alternates: { canonical: '/tags/' + slug },
      }
    : {};
}
export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params,
    t = (await mediaTaxonomy()).tags.find((t) => t.slug === slug);
  if (!t) notFound();
  const result = await mediaList({
    tag: slug,
    page: positiveInteger(queryText(await searchParams, 'page')),
  });
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">TOPIC INDEX / 标签</span>
        <h1># {t.name}</h1>
        <p>{t.description || '持续关注这一领域的实践与变化。'}</p>
      </div>
      <div className="media-grid-three">
        {result.rows.map((post) => (
          <PostCard key={post.id} post={post} mode="tile" />
        ))}
      </div>
      {!result.count && <MediaEmpty />}
      <Pagination
        page={result.page}
        pages={result.pages}
        href={(page) => `/tags/${slug}?page=${page}`}
      />
    </div>
  );
}
