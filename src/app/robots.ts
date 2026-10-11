import type { MetadataRoute } from 'next';
import { siteUrl, isDemo } from '@/lib/config';
export const dynamic = 'force-dynamic';
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: isDemo() ? undefined : '/',
      disallow: isDemo()
        ? '/'
        : ['/admin', '/dashboard', '/api/', '/login', '/auth/', '/submit', '/search'],
    },
    sitemap: isDemo() ? undefined : siteUrl() + '/sitemap.xml',
  };
}
