import { safeReturnPath } from '@/lib/return-path';
import { NextResponse } from 'next/server';
import { supabase, syncIdentity } from '@/lib/auth';
import { siteUrl, usesSupabase } from '@/lib/config';
export async function GET(request: Request) {
  if (!usesSupabase()) return NextResponse.redirect(new URL('/login', siteUrl()));
  const code = new URL(request.url).searchParams.get('code');
  if (code) {
    const client = await supabase();
    const { data, error } = await client.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await syncIdentity(data.user);
      return NextResponse.redirect(
        new URL(safeReturnPath(new URL(request.url).searchParams.get('next')), siteUrl()),
      );
    }
  }
  return NextResponse.redirect(new URL('/login?error=callback', siteUrl()));
}
