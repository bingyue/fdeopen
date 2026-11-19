'use client';
import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { requestJson } from '@/lib/client-api';
export async function mediaApi(action: string, data: unknown) {
  return requestJson<Record<string, string>>(`/api/media/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}
export function ShareArticle() {
  const [copied, setCopied] = useState(false),
    [error, setError] = useState('');
  return (
    <div className="share-control">
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(window.location.origin + window.location.pathname);
            setCopied(true);
            setError('');
          } catch {
            setError('复制失败，请从地址栏复制链接');
          }
        }}
      >
        {copied ? <Check size={15} /> : <Copy size={15} />}{' '}
        {copied ? '链接已复制' : '复制链接 / 分享到微信'}
      </button>
      {error && <span role="status">{error}</span>}
    </div>
  );
}
export function MediaView({ id }: { id: string }) {
  useEffect(() => {
    void mediaApi('view', { id }).catch(() => {});
  }, [id]);
  return null;
}
