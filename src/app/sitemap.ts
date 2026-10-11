import type { MetadataRoute } from 'next';
import { db } from '@/lib/db';
import { siteUrl, isDemo } from '@/lib/config';
import { kinds, resourcePath, type Resource } from '@/lib/types';
export const dynamic = 'force-dynamic';
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (isDemo()) return [];
  const database = await db();
  const [resources, cs, profiles] = await Promise.all([
    database.query<Resource>("SELECT kind,slug,updated_at FROM resources WHERE status='published'"),
    database.query<{ slug: string }>('SELECT slug FROM collections WHERE published'),
    database.query<{ handle: string }>(
      'SELECT p.handle FROM profiles p JOIN users u ON u.id=p.user_id WHERE p.public AND NOT u.disabled',
    ),
  ]);
  return [
    ...[
      '',
      '/collections',
      '/developers',
      '/about',
      ...Object.values(kinds).map((k) => k.path),
    ].map((p) => ({ url: siteUrl() + p })),
    ...resources.map((r) => ({
      url: siteUrl() + resourcePath(r),
      lastModified: new Date(r.updated_at),
    })),
    ...cs.map((c) => ({ url: siteUrl() + '/collections/' + c.slug })),
    ...profiles.map((p) => ({ url: siteUrl() + '/developers/' + p.handle })),
  ];
}
