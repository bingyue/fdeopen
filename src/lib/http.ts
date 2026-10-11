import { ZodError } from 'zod';
import { createHash } from 'node:crypto';
import { AppError } from './validation';
import { siteUrl, isDemo } from './config';
export function checkOrigin(request: Request) {
  const origin = request.headers.get('origin');
  const allowed = [new URL(siteUrl()).origin];
  if (isDemo() && process.env.NODE_ENV !== 'production')
    allowed.push(
      'http://localhost:3210',
      'http://127.0.0.1:3210',
      'http://localhost:3211',
      'http://127.0.0.1:3211',
    );
  if (!origin || !allowed.includes(origin)) throw new AppError('请求来源未通过验证', 403);
}
// Enforce byte limits while streaming, including requests without Content-Length.
export async function readBody(request: Request, maxBytes = 128000) {
  if (Number(request.headers.get('content-length') || 0) > maxBytes)
    throw new AppError('请求过大', 413);
  if (!request.body) return '';
  const reader = request.body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  let size = 0,
    text = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new AppError('请求过大', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError('请求内容无法读取');
  } finally {
    reader.releaseLock();
  }
}
export function parseJsonObject(text: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new AppError('JSON 格式有误');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new AppError('请求内容必须是 JSON 对象');
  return value as Record<string, unknown>;
}
export async function readJson(request: Request) {
  if (
    request.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json'
  )
    throw new AppError('需要 JSON 请求', 415);
  return parseJsonObject(await readBody(request));
}
export function errorResponse(error: unknown) {
  if (error instanceof ZodError)
    return Response.json({ error: error.issues.map((x) => x.message).join('；') }, { status: 400 });
  if (error instanceof AppError)
    return Response.json({ error: error.message }, { status: error.status });
  if (error && typeof error === 'object' && 'code' in error && error.code === '23505')
    return Response.json({ error: '记录已存在，请勿重复提交' }, { status: 409 });
  console.error('FDEOpen request failed', error instanceof Error ? error.message : 'unknown');
  return Response.json({ error: '服务暂时不可用，请稍后重试' }, { status: 500 });
}
export function requestKey(request: Request) {
  return createHash('sha256')
    .update(
      (request.headers.get('x-forwarded-for')?.split(',')[0] || 'local') +
        new Date().toISOString().slice(0, 10),
    )
    .digest('hex')
    .slice(0, 24);
}
