'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useId, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowUpRight,
  Check,
  Copy,
  MessageCircle,
  PenLine,
  Share2,
  X,
} from 'lucide-react';

const publicPages = new Set([
  '/',
  '/about',
  '/community',
  '/contribute',
  '/enterprise',
  '/search',
  '/privacy',
  '/terms',
]);
const publicSections = new Set([
  'insights',
  'features',
  'cases',
  'research',
  'people',
  'events',
  'articles',
  'projects',
  'skills',
  'scenarios',
  'lab',
  'build',
  'docs',
  'developers',
  'collections',
  'authors',
  'tags',
  'topics',
]);

export function FloatingTools() {
  const pathname = usePathname();
  // Keep account, preview and unsubscribe URLs out of the public sharing controls.
  if (!publicPages.has(pathname) && !publicSections.has(pathname.split('/')[1])) return null;
  return <FloatingToolsBar key={pathname} />;
}

function FloatingToolsBar() {
  const panelId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const shareButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const linkInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState({ title: '', url: '', local: false });
  const [canShare, setCanShare] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [copied, setCopied] = useState(false);

  function prepareShare() {
    if (open) return;
    // Query parameters and fragments may contain personal or form context.
    setPage({
      title: document.title,
      url: window.location.origin + window.location.pathname,
      local: ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname),
    });
    setCanShare(typeof navigator.share === 'function');
    setFeedback('');
    setCopied(false);
  }

  async function copy(withTitle: boolean) {
    if (busy || !page.url) return;
    setBusy(true);
    try {
      await navigator.clipboard.writeText(withTitle ? `${page.title}\n${page.url}` : page.url);
      setCopied(true);
      setFeedback(withTitle ? '标题和链接已复制，可以粘贴到微信。' : '链接已复制。');
    } catch {
      setCopied(false);
      setFeedback('自动复制不可用，请手动复制下方链接。');
      linkInput.current?.focus();
      linkInput.current?.select();
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    if (busy || !page.url) return;
    setBusy(true);
    setCopied(false);
    setFeedback('');
    try {
      await navigator.share({ title: page.title, url: page.url });
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        setFeedback('暂时无法打开系统分享，请使用复制链接。');
      }
    } finally {
      setBusy(false);
    }
  }

  function backToTop() {
    panel.current?.hidePopover();
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
    const heading = document.querySelector<HTMLElement>('main h1, main');
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
    }
  }

  return (
    <>
      <nav className="media-floating-tools" aria-label="页面快捷工具">
        <button
          ref={shareButton}
          type="button"
          className="media-float-trigger"
          popoverTarget={panelId}
          aria-label="分享页面"
          aria-expanded={open}
          aria-controls={panelId}
          aria-haspopup="dialog"
          onClick={prepareShare}
        >
          <Share2 size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>分享页面</span>
        </button>
        <Link href="/contribute" className="media-float-trigger" aria-label="投稿合作">
          <PenLine size={20} strokeWidth={1.7} aria-hidden="true" />
          <span>投稿合作</span>
        </Link>
        <button
          type="button"
          className="media-float-trigger media-float-top"
          aria-label="回到顶部"
          onClick={backToTop}
        >
          <ArrowUp size={21} strokeWidth={1.7} aria-hidden="true" />
          <span>回到顶部</span>
        </button>
      </nav>
      <div
        ref={panel}
        id={panelId}
        popover="auto"
        role="dialog"
        aria-labelledby={`${panelId}-title`}
        aria-describedby={`${panelId}-description`}
        className="media-share-panel"
        onBeforeToggle={(event) => {
          if (event.newState === 'closed' && event.currentTarget.contains(document.activeElement)) {
            shareButton.current?.focus({ preventScroll: true });
          }
        }}
        onToggle={(event) => {
          const isOpen = event.newState === 'open';
          setOpen(isOpen);
          if (isOpen) closeButton.current?.focus({ preventScroll: true });
        }}
      >
        <div className="media-share-heading">
          <div>
            <span>FDE前线 · 分享</span>
            <h2 id={`${panelId}-title`}>把好内容分享给同行</h2>
          </div>
          <button
            ref={closeButton}
            type="button"
            className="media-share-close"
            aria-label="关闭分享"
            popoverTarget={panelId}
            popoverTargetAction="hide"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>
        <div className="media-share-body">
          <p id={`${panelId}-description`} className="media-share-page-title">
            {page.title}
          </p>
          <div className="media-share-options">
            <button type="button" disabled={busy} onClick={() => void copy(false)}>
              <Copy size={20} aria-hidden="true" />
              <strong>复制链接</strong>
              <small>分享当前页面</small>
            </button>
            <button type="button" disabled={busy} onClick={() => void copy(true)}>
              <MessageCircle size={20} aria-hidden="true" />
              <strong>分享到微信</strong>
              <small>复制标题与链接</small>
            </button>
          </div>
          {canShare && (
            <button
              type="button"
              className="media-share-native"
              disabled={busy}
              onClick={() => void share()}
            >
              <Share2 size={17} aria-hidden="true" />
              更多分享方式
              <ArrowUpRight size={16} aria-hidden="true" />
            </button>
          )}
          <label className="media-share-url">
            页面链接
            <input
              ref={linkInput}
              readOnly
              value={page.url}
              onFocus={(event) => event.currentTarget.select()}
            />
          </label>
          {page.local && <p className="media-share-note">当前为本地预览链接，仅本机可访问。</p>}
          <p className={`media-share-feedback${copied ? ' is-success' : ''}`} role="status">
            {copied && <Check size={15} aria-hidden="true" />}
            {feedback}
          </p>
        </div>
      </div>
    </>
  );
}
