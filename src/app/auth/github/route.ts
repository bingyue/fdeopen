import { safeReturnPath } from '@/lib/return-path';
import { NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import { usesSupabase, siteUrl } from '@/lib/config';
export async function GET(request: Request) {
  const next = safeReturnPath(new URL(request.url).searchParams.get('next'));
  if (!usesSupabase()) return NextResponse.redirect(new URL('/login', siteUrl()));
  const { data, error } = await (
    await supabase()
  ).auth.signInWithOAuth({
    provider: 'github',
    options: {
      redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}`,
      scopes: 'read:user',
    },
  });
  if (error || !data.url) return NextResponse.redirect(new URL('/login?error=oauth', siteUrl()));
  return NextResponse.redirect(data.url);
}
