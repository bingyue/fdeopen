import { notFound } from 'next/navigation';
import { mediaTaxonomy, mediaList } from '@/lib/media-service';
import { PostCard, MediaEmpty } from '@/components/media';
import { Pagination } from '@/components/pagination';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    t = (await mediaTaxonomy()).topics.find((t) => t.slug === slug);
  return t
    ? { title: t.title, description: t.description, alternates: { canonical: '/topics/' + slug } }
    : {};
}
export default async function TopicPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params,
    t = (await mediaTaxonomy()).topics.find((t) => t.slug === slug);
  if (!t) notFound();
  const result = await mediaList({
    topic: slug,
    page: positiveInteger(queryText(await searchParams, 'page')),
  });
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">SPECIAL REPORT / 专题</span>
        <h1>{t.title}</h1>
        <p>{t.description}</p>
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
        href={(page) => `/topics/${slug}?page=${page}`}
      />
    </div>
  );
}
