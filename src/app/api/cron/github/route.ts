import { syncGithub } from '@/lib/github';
import { errorResponse } from '@/lib/http';
export const maxDuration = 300;
export async function GET(request: Request) {
  if (
    !process.env.CRON_SECRET ||
    request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`
  )
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const results = await syncGithub();
    return Response.json({ results }, { status: results.some((r) => !r.ok) ? 502 : 200 });
  } catch (e) {
    return errorResponse(e);
  }
}
