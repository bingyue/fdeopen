'use client';
import { loginHref } from '@/lib/return-path';
import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark, Heart, Check, ArrowUpRight, Copy, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { api } from '@/lib/client-api';
export { api } from '@/lib/client-api';
export function ActionButton({
  action,
  payload,
  children,
  variant = 'secondary',
  success = '已完成',
  refresh = true,
}: {
  action: string;
  payload: unknown;
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'ghost' | 'danger';
  success?: string;
  refresh?: boolean;
}) {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <span className="action-wrap">
      <Button
        disabled={busy}
        variant={variant}
        onClick={() =>
          start(async () => {
            setError('');
            setMessage('');
            try {
              await api(action, payload);
              setMessage(success);
              if (refresh) router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        {busy ? '处理中…' : children}
      </Button>
      {error && (
        <span className="feedback error" role="alert">
          {error}
        </span>
      )}
      {message && (
        <span className="feedback" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
export function ToggleButton({
  id,
  kind,
  initial,
  loggedIn,
}: {
  id: string;
  kind: 'bookmark' | 'like';
  initial: boolean;
  loggedIn: boolean;
}) {
  // Remount the local toggle when a refreshed server snapshot changes (e.g. another tab).
  return (
    <ToggleControl
      key={`${id}:${kind}:${initial}`}
      id={id}
      kind={kind}
      initial={initial}
      loggedIn={loggedIn}
    />
  );
}
function ToggleControl({
  id,
  kind,
  initial,
  loggedIn,
}: {
  id: string;
  kind: 'bookmark' | 'like';
  initial: boolean;
  loggedIn: boolean;
}) {
  const [active, setActive] = useState(initial);
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  const Icon = kind === 'bookmark' ? Bookmark : Heart;
  return (
    <div>
      <Button
        variant={active ? 'default' : 'secondary'}
        disabled={busy}
        aria-pressed={active}
        onClick={() => {
          if (!loggedIn) {
            router.push(
              loginHref(window.location.pathname + window.location.search + window.location.hash),
            );
            return;
          }
          start(async () => {
            try {
              const result = await api(kind, { resourceId: id });
              setActive(result.active === true);
              setError('');
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          });
        }}
      >
        <Icon size={17} fill={active ? 'currentColor' : 'none'} />
        {kind === 'bookmark' ? (active ? '已收藏' : '收藏资源') : active ? '已点赞' : '点赞'}
      </Button>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function TrackedLink({
  id,
  event,
  href,
  children,
  className = 'btn btn-secondary',
}: {
  id: string;
  event: 'github_click' | 'demo_click';
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        api('event', { resourceId: id, event }).catch(() => {});
      }}
    >
      {children}
      <ArrowUpRight size={15} />
    </a>
  );
}
export function ViewEvent({ id }: { id: string }) {
  useEffect(() => {
    api('event', { event: 'view', resourceId: id }).catch(() => {});
  }, [id]);
  return null;
}
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(false);
  return (
    <div className="code-block">
      <div>
        <span>终端 · 请先检查命令与运行环境</span>
        <button
          aria-label="复制安装命令"
          onClick={async () => {
            try {
              setError(false);
              await navigator.clipboard.writeText(code);
              setCopied(true);
            } catch {
              setError(true);
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre>
        <code>{code}</code>
      </pre>
      {error && <p role="alert">复制未成功，请手动选择命令。</p>}
    </div>
  );
}
export function Logout() {
  const router = useRouter();
  const [busy, start] = useTransition();
  const [error, setError] = useState('');
  return (
    <span className="action-wrap">
      <Button
        variant="ghost"
        disabled={busy}
        onClick={() =>
          start(async () => {
            setError('');
            try {
              await api('logout', {});
              router.push('/');
              router.refresh();
            } catch (e) {
              setError((e as Error).message);
            }
          })
        }
      >
        <LogOut size={15} />
        {busy ? '退出中…' : '退出登录'}
      </Button>
      {error && (
        <span className="feedback error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
export function SimpleForm({
  action,
  extra,
  fields,
  button,
  success,
}: {
  action: string;
  extra: Record<string, unknown>;
  fields: {
    name: string;
    label: string;
    placeholder?: string;
    minLength?: number;
    type?: string;
    maxLength?: number;
  }[];
  button: string;
  success: string;
}) {
  const [error, setError] = useState(''),
    [message, setMessage] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        start(async () => {
          setError('');
          setMessage('');
          try {
            await api(action, { ...extra, ...values });
            form.reset();
            setMessage(success);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      {fields.map((f) => (
        <label key={f.name}>
          {f.label}
          {f.type === 'url' ? (
            <input type="url" required name={f.name} placeholder={f.placeholder} />
          ) : (
            <textarea
              name={f.name}
              required
              minLength={f.minLength || 2}
              maxLength={f.maxLength || 2000}
              rows={3}
              placeholder={f.placeholder}
            />
          )}
        </label>
      ))}
      <Button disabled={busy} type="submit">
        {busy ? '提交中…' : button}
      </Button>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="feedback" role="status">
          {message}
        </p>
      )}
    </form>
  );
}
