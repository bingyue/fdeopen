import { NextResponse } from 'next/server';
import { supabase, syncIdentity } from '@/lib/auth';
import { siteUrl, isDemo } from '@/lib/config';
export async function GET(request: Request) {
  if (isDemo()) return NextResponse.redirect(new URL('/login', siteUrl()));
  const code = new URL(request.url).searchParams.get('code');
  if (code) {
    const client = await supabase();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await syncIdentity(data.user);
      return NextResponse.redirect(new URL('/dashboard', siteUrl()));
    }
  }
  return NextResponse.redirect(new URL('/login?error=callback', siteUrl()));
}
