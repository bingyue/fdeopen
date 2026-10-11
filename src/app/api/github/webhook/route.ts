import { randomUUID } from 'node:crypto';
import { verifySignature, syncGithub } from '@/lib/github';
import { db } from '@/lib/db';
import { errorResponse, readBody, parseJsonObject } from '@/lib/http';
import { AppError, githubRepo } from '@/lib/validation';
export async function POST(request: Request) {
  let claimed: { delivery: string; token: string } | undefined;
  try {
    if (!process.env.GITHUB_WEBHOOK_SECRET) throw new AppError('Webhook 未配置', 503);
    const raw = await readBody(request, 1000000);
    if (
      !verifySignature(
        raw,
        request.headers.get('x-hub-signature-256'),
        process.env.GITHUB_WEBHOOK_SECRET,
      )
    )
      throw new AppError('签名无效', 401);
    const payload = parseJsonObject(raw);
    const delivery = request.headers.get('x-github-delivery');
    if (!delivery || delivery.length > 100) throw new AppError('缺少有效的 delivery ID');
    const type = request.headers.get('x-github-event');
    if (!['push', 'repository', 'release'].includes(type || ''))
      return Response.json({ ok: true, ignored: true });
    const repository = payload.repository as { full_name?: unknown } | null;
    if (!repository || typeof repository.full_name !== 'string') throw new AppError('缺少仓库名称');
    const repo = githubRepo(`https://github.com/${repository.full_name}`);
    const database = await db();
    const token = randomUUID();
    const acquired = await database.query(
      `INSERT INTO webhook_deliveries(id,completed,claim_token) VALUES($1,false,$2)
       ON CONFLICT(id) DO UPDATE SET created_at=now(),claim_token=excluded.claim_token
       WHERE NOT webhook_deliveries.completed AND webhook_deliveries.created_at<now()-interval '10 minutes'
       RETURNING id`,
      [delivery, token],
    );
    if (!acquired.length) {
      const [existing] = await database.query<{ completed: boolean }>(
        'SELECT completed FROM webhook_deliveries WHERE id=$1',
        [delivery],
      );
      if (existing?.completed) return Response.json({ ok: true, duplicate: true });
      throw new AppError('此投递正在处理中，请稍后重试', 409);
    }
    claimed = { delivery, token };
    const results = await syncGithub(repo);
    if (results.some((r) => !r.ok)) throw new AppError('同步失败，可重试', 502);
    await database.query(
      'UPDATE webhook_deliveries SET completed=true WHERE id=$1 AND claim_token=$2',
      [delivery, token],
    );
    return Response.json({ ok: true });
  } catch (error) {
    // Failed attempts are retryable; abandoned claims can be reclaimed after the lease.
    if (claimed) {
      try {
        await (
          await db()
        ).query('DELETE FROM webhook_deliveries WHERE id=$1 AND claim_token=$2 AND NOT completed', [
          claimed.delivery,
          claimed.token,
        ]);
      } catch {
        /* A database outage leaves an expiring claim, not a false success. */
      }
    }
    return errorResponse(error);
  }
}
