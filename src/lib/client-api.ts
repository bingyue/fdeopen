export async function requestJson<T = Record<string, unknown>>(
  url: string,
  options: RequestInit = {},
  timeoutMs = 30000,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...options, signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    if (error instanceof Error && ['TimeoutError', 'AbortError'].includes(error.name))
      throw new Error('请求超时，操作可能已完成。请刷新确认后再重试。');
    throw new Error('网络连接失败，请检查网络后重试。');
  }
  let result: unknown;
  try {
    result = await response.json();
  } catch {
    throw new Error(
      response.ok ? '服务返回了无法识别的结果，请刷新确认。' : '服务暂时不可用，请稍后重试。',
    );
  }
  if (!response.ok) {
    const message =
      result && typeof result === 'object' && 'error' in result ? result.error : undefined;
    throw new Error(typeof message === 'string' ? message : '操作失败，请稍后重试。');
  }
  return result as T;
}
export async function api(action: string, payload: unknown) {
  return requestJson(
    `/api/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: action === 'event',
    },
    action === 'github-sync' ? 240000 : 30000,
  );
}
