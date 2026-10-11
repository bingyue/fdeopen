import { NextResponse } from 'next/server';
import { supabase } from '@/lib/auth';
import { isDemo, siteUrl } from '@/lib/config';
export async function GET() {
  if (isDemo()) return NextResponse.redirect(new URL('/login', siteUrl()));
  const { data, error } = await (
    await supabase()
  ).auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: `${siteUrl()}/auth/callback`, scopes: 'read:user' },
  });
  if (error || !data.url) return NextResponse.redirect(new URL('/login?error=oauth', siteUrl()));
  return NextResponse.redirect(data.url);
}
