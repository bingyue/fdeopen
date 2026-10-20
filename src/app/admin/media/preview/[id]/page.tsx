import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { editorPost, mediaTaxonomy } from '@/lib/media-service';
import { MediaArticle } from '@/components/media-detail';
export const metadata = { title: '内容预览', robots: { index: false, follow: false } };
export default async function Preview({ params }: { params: Promise<{ id: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  let post;
  try {
    post = await editorPost(user, (await params).id);
  } catch {
    notFound();
  }
  const taxonomy = await mediaTaxonomy(),
    author = taxonomy.authors.find((a) => a.id === post.author_id);
  return (
    <MediaArticle
      preview
      post={{
        ...post,
        author_name: author?.name,
        author_slug: author?.slug,
        author_bio: author?.bio,
        category_name: taxonomy.categories.find((c) => c.slug === post.category)?.name,
      }}
    />
  );
}
