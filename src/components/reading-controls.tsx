'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { api } from '@/lib/client-api';
import { loginHref } from '@/lib/return-path';
import type { ReadingItem } from '@/lib/reading';
import { Button } from './ui/button';
export function MediaBookmark({
  id,
  initial,
  loggedIn,
}: {
  id: string;
  initial: boolean;
  loggedIn: boolean;
}) {
  const [active, setActive] = useState(initial),
    [error, setError] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <div className="reading-action">
      <Button
        variant="secondary"
        disabled={busy}
        aria-pressed={active}
        onClick={() => {
          if (!loggedIn) {
            router.push(
              loginHref(window.location.pathname + window.location.search + window.location.hash),
            );
            return;
          }
          setError('');
          start(async () => {
            try {
              await api('media-bookmark', { id, active: !active });
              setActive(!active);
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          });
        }}
      >
        {active ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{' '}
        {active ? '已加入稍后阅读' : '收藏 · 稍后阅读'}
      </Button>
      {active && <Link href="/dashboard?tab=bookmarks">查看收藏 →</Link>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
const labels: Record<string, string> = {
  cases: '企业案例',
  features: '深度文章',
  research: '产业研究',
  insights: '前线观察',
  project: '开源项目',
  skill: 'Skill',
  scenario: '企业场景',
  task: '共创任务',
  demo: '实验室',
  article: '开放文档',
};
export function ReadingList({
  items,
  history = false,
}: {
  items: ReadingItem[];
  history?: boolean;
}) {
  const router = useRouter(),
    [busy, start] = useTransition(),
    [error, setError] = useState('');
  if (!items.length)
    return (
      <div className="notice">
        <p>
          {history
            ? '尚无阅读记录。登录后浏览文章、案例和社区资源即可留下足迹。'
            : '还没有收藏。文章、案例和社区资源的收藏会统一保存在这里。'}
        </p>
        <Link href="/start">从新手指南开始 →</Link>
      </div>
    );
  return (
    <div>
      {error && (
        <p role="alert" className="feedback error">
          {error}
        </p>
      )}
      {items.map((item) => (
        <article className="item-panel" key={item.target + item.id}>
          <small>
            {labels[item.kind] || '社区内容'} ·{' '}
            {new Date(item.saved_at).toLocaleDateString('zh-CN')}
          </small>
          <h3>
            <Link href={item.url}>{item.title}</Link>
          </h3>
          <p>{item.summary}</p>
          <div className="reading-action">
            <Link className="text-link" href={item.url}>
              {history ? '继续阅读' : '打开内容'} →
            </Link>
            {!history && (
              <Button
                disabled={busy}
                variant="ghost"
                onClick={() => {
                  setError('');
                  start(async () => {
                    try {
                      await api(
                        item.target === 'media' ? 'media-bookmark' : 'remove-bookmark',
                        item.target === 'media'
                          ? { id: item.id, active: false }
                          : { resourceId: item.id },
                      );
                      router.refresh();
                    } catch (e) {
                      setError((e as Error).message);
                    }
                  });
                }}
              >
                取消收藏
              </Button>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
export function HistorySettings({ enabled }: { enabled: boolean }) {
  const router = useRouter(),
    [busy, start] = useTransition(),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  function update(next: boolean) {
    setMessage('');
    setError('');
    start(async () => {
      try {
        await api('reading-history', { enabled: next });
        setMessage(next ? '记录已清空，后续阅读会继续记录。' : '已关闭并清空阅读记录。');
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }
  return (
    <div className="notice">
      <p>
        仅自己可见，最多保存最近 100 篇，不记录未登录访问。当前{enabled ? '已开启' : '已关闭'}。
      </p>
      <div className="reading-action">
        <Button variant="secondary" disabled={busy} onClick={() => update(!enabled)}>
          {enabled ? '关闭并清空' : '开启阅读记录'}
        </Button>
        {enabled && (
          <Button
            variant="ghost"
            disabled={busy}
            onClick={() => {
              if (window.confirm('清空全部阅读记录？此操作不可撤销，收藏不受影响。')) update(true);
            }}
          >
            清空记录
          </Button>
        )}
      </div>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
