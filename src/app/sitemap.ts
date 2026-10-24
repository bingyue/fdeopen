import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { siteUrl, isDemo } from '@/lib/config';
import { kinds, resourcePath, type Resource } from '@/lib/types';
import { publicMedia } from '@/lib/media-service';
import { channels, postPath, type MediaPost } from '@/lib/media-model';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemo()) return [];
  const database = await db();
  const [resources, cs, profiles, posts, authors, topics, tags] = await Promise.all([
    database.query<Resource>("SELECT kind,slug,updated_at FROM resources WHERE status='published'"),
    database.query<{ slug: string }>('SELECT slug FROM collections WHERE published'),
    database.query<{ handle: string }>(
      'SELECT p.handle FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.public AND NOT u.disabled',
    ),
    database.query<MediaPost>(
      `SELECT p.channel,p.slug,p.updated_at FROM media_posts p WHERE ${publicMedia} AND p.authenticity<>'example'`,
    ),
    database.query<{ slug: string }>(
      `SELECT DISTINCT a.slug FROM media_authors a JOIN media_posts p ON p.author_id=a.id WHERE NOT a.is_example AND ${publicMedia} AND p.authenticity<>'example'`,
    ),
    database.query<{ slug: string }>('SELECT slug FROM media_topics WHERE published'),
    database.query<{ slug: string }>('SELECT slug FROM media_tags'),
  ]);
  return [
    ...[
      '',
      '/collections',
      '/developers',
      '/about',
      '/community',
      '/start',
      '/practice',
      '/practice/quotation-check',
      '/practice/knowledge-eval',
      '/practice/marketing-review',
      '/enterprise',
      '/contribute',
      '/privacy',
      '/terms',
      ...Object.keys(channels).map((k) => '/' + k),
      ...Object.values(kinds).map((k) => k.path),
    ].map((p) => ({ url: siteUrl() + p })),
    ...resources.map((r) => ({
      url: siteUrl() + resourcePath(r),
      lastModified: new Date(r.updated_at),
    })),
    ...cs.map((c) => ({ url: siteUrl() + '/collections/' + c.slug })),
    ...profiles.map((p) => ({ url: siteUrl() + '/developers/' + p.handle })),
    ...posts.map((p) => ({ url: siteUrl() + postPath(p), lastModified: new Date(p.updated_at) })),
    ...authors.map((a) => ({ url: siteUrl() + '/authors/' + a.slug })),
    ...topics.map((t) => ({ url: siteUrl() + '/topics/' + t.slug })),
    ...tags.map((t) => ({ url: siteUrl() + '/tags/' + t.slug })),
  ];
}
