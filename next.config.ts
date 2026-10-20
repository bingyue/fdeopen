import type { NextConfig } from 'next';
const config: NextConfig = {
  output: 'standalone',
  experimental: {
    // Next 16.4 can replay stale HMR versions after restoring the dev disk cache,
    // causing an endless reload after a restart (vercel/next.js#100251, #100267).
    // Keep in-session Fast Refresh and the production build cache enabled.
    turbopackFileSystemCacheForDev: false,
  },
  serverExternalPackages: ['@electric-sql/pglite', 'postgres'],
  outputFileTracingExcludes: {
    '/*': [
      './.data/**/*',
      './.env*',
      './tests/**/*',
      './docs/screenshots/**/*',
      './test-results/**/*',
      './playwright-report/**/*',
    ],
  },
  outputFileTracingIncludes: { '/*': ['./content/**/*', './supabase/migrations/**/*'] },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com; font-src 'self'; connect-src 'self' https://*.supabase.co; frame-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'".replace(
                " 'unsafe-eval'",
                process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '',
              ),
          },
        ],
      },
    ];
  },
};
export default config;
