export function isDemo() {
  return process.env.APP_MODE
    ? process.env.APP_MODE === 'demo'
    : process.env.NODE_ENV !== 'production';
}
export const isLocalAuth = () => process.env.APP_MODE === 'postgres';
export const usesSupabase = () => process.env.APP_MODE === 'supabase';
export function assertConfig() {
  if (isDemo()) {
    if (
      process.env.NODE_ENV === 'production' &&
      (process.env.ALLOW_DEMO_IN_PRODUCTION !== 'true' ||
        !process.env.DEMO_ACCESS_KEY ||
        process.env.DEMO_ACCESS_KEY.length < 16)
    )
      throw new Error(
        'Production demo requires explicit opt-in and a 16+ character DEMO_ACCESS_KEY.',
      );
  } else {
    if (
      process.env.NODE_ENV === 'production' &&
      !process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https://')
    )
      throw new Error('Production requires an explicit HTTPS NEXT_PUBLIC_SITE_URL.');
    if (!process.env.DATABASE_URL || (!isLocalAuth() && !usesSupabase()))
      throw new Error('Configure APP_MODE=postgres or supabase and DATABASE_URL.');
    if (
      usesSupabase() &&
      (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
    )
      throw new Error('Configure Supabase Auth environment.');
  }
}
export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3210';

export function learningUrl() {
  try {
    const value = new URL(process.env.FDE_LEARNING_URL || '');
    if (value.protocol === 'https:' && !value.username && !value.password) return value.href;
  } catch {
    /* keep the ecosystem entry on the local explanation until configured */
  }
  return '/about#learning';
}
