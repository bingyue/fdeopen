'use client';
import { useEffect, useState } from 'react';
import { Copy, Check, ArrowRight } from 'lucide-react';
import Link from 'next/link';
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
export function Newsletter() {
  const [message, setMessage] = useState(''),
    [pending, setPending] = useState(false),
    [token, setToken] = useState('');
  return (
    <div className="newsletter-panel">
      <span className="media-eyebrow">THE WEEKLY BRIEF</span>
      <h3>
        把重要的变化
        <br />
        留在你的视野里。
      </h3>
      <p>登记周刊订阅意向，关注企业 AI 的长期实践。首期发行时间另行公布。</p>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setPending(true);
          setMessage('');
          const f = new FormData(e.currentTarget);
          try {
            const r = await mediaApi('subscribe', {
              email: f.get('email'),
              consent: f.get('consent') === 'on',
            });
            setToken(r.unsubscribeToken || '');
            setMessage('订阅意向已登记。请保存下方退订入口。');
          } catch (error) {
            setMessage(error instanceof Error ? error.message : '暂时无法提交');
          } finally {
            setPending(false);
          }
        }}
      >
        <label className="sr-only" htmlFor="newsletter-email">
          订阅邮箱
        </label>
        <div className="newsletter-input">
          <input
            id="newsletter-email"
            name="email"
            type="email"
            required
            maxLength={254}
            placeholder="你的工作邮箱"
          />
          <button disabled={pending} aria-label="登记订阅">
            {pending ? '…' : <ArrowRight size={18} />}
          </button>
        </div>
        <label className="consent-line">
          <input type="checkbox" name="consent" required />
          我同意按<Link href="/privacy">隐私政策</Link>登记邮箱，用于周刊联系。
        </label>
      </form>
      {message && <p role="status">{message}</p>}
      {token && (
        <Link href={`/unsubscribe?token=${encodeURIComponent(token)}`}>保存退订链接 ↗</Link>
      )}
    </div>
  );
}
