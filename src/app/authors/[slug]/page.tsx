import { notFound } from 'next/navigation';
import { mediaTaxonomy, mediaList } from '@/lib/media-service';
import { PostCard, MediaEmpty } from '@/components/media';
import { Pagination } from '@/components/pagination';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params,
    a = (await mediaTaxonomy()).authors.find((a) => a.slug === slug);
  return a
    ? {
        title: a.name + '的文章',
        description: a.bio,
        alternates: { canonical: '/authors/' + slug },
        robots: a.is_example ? { index: false } : undefined,
      }
    : {};
}
export default async function AuthorPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params,
    a = (await mediaTaxonomy()).authors.find((a) => a.slug === slug);
  if (!a) notFound();
  const result = await mediaList({
    author: slug,
    page: positiveInteger(queryText(await searchParams, 'page')),
  });
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">AUTHOR / {a.is_example ? '示例作者' : '作者主页'}</span>
        <h1>{a.name}</h1>
        <p>{a.title}</p>
        <p>{a.bio}</p>
      </div>
      <div className="media-grid-three">
        {result.rows.map((post) => (
          <PostCard key={post.id} post={post} mode="tile" />
        ))}
      </div>
      {!result.count && <MediaEmpty title="这位作者尚未发布文章" />}
      <Pagination
        page={result.page}
        pages={result.pages}
        href={(page) => `/authors/${slug}?page=${page}`}
      />
    </div>
  );
}
