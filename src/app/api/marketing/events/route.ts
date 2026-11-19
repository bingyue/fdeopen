import { db } from '@/lib/db';
import { checkOrigin, readJson, errorResponse, requestKey } from '@/lib/http';
import { rateLimit } from '@/lib/service';
import { recordMarketingEvent } from '@/lib/marketing/analytics';
export async function POST(request: Request) {
  try {
    checkOrigin(request);
    if (request.headers.get('dnt') === '1' || request.headers.get('sec-gpc') === '1')
      return new Response(null, { status: 204 });
    await rateLimit('marketing:' + requestKey(request), 90, 60);
    await recordMarketingEvent(await db(), await readJson(request, 2048));
    return new Response(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
