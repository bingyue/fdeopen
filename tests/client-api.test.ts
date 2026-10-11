import { afterEach, it, expect, vi } from 'vitest';
import { requestJson } from '../src/lib/client-api';
afterEach(() => vi.unstubAllGlobals());
it('turns an HTML gateway failure into a useful user message', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 })),
  );
  await expect(requestJson('/api/submit')).rejects.toThrow('服务暂时不可用');
});
it('shows the server validation message', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ error: '请先登录' }, { status: 401 })),
  );
  await expect(requestJson('/api/submit')).rejects.toThrow('请先登录');
});
it('does not automatically retry a timed-out mutation', async () => {
  const fetch = vi.fn().mockRejectedValue(new DOMException('timeout', 'TimeoutError'));
  vi.stubGlobal('fetch', fetch);
  await expect(requestJson('/api/submit', { method: 'POST' })).rejects.toThrow('操作可能已完成');
  expect(fetch).toHaveBeenCalledTimes(1);
});
