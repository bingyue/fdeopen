'use client';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import type { MarketingContext, MarketingEvent } from '@/lib/marketing/events';

export function track(event: MarketingEvent, context: MarketingContext) {
  if (
    navigator.doNotTrack === '1' ||
    (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl
  )
    return;
  const source = new URLSearchParams(location.search).get('utm_source') || '';
  void fetch('/api/marketing/events', {
    method: 'POST',
    keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event,
      path: location.pathname,
      contentType: context.contentType || 'page',
      articleId: context.articleId || '',
      placement: context.placement,
      utmSource: /^[a-zA-Z0-9_-]{1,48}$/.test(source) ? source : '',
      device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop',
    }),
  }).catch(() => {});
}
export function TrackedLink({
  event,
  context,
  href,
  children,
  className,
  ...props
}: {
  event: MarketingEvent;
  context: MarketingContext;
  href: string;
  children: React.ReactNode;
  className?: string;
} & Pick<React.AnchorHTMLAttributes<HTMLAnchorElement>, 'aria-label' | 'aria-current' | 'title'>) {
  const external = href.startsWith('https://');
  return (
    <Link
      {...props}
      href={href}
      className={className}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      onClick={() => track(event, context)}
    >
      {children}
      {external && <span className="sr-only">（新窗口打开）</span>}
    </Link>
  );
}
export function PromoView({
  event,
  context,
  children,
  className,
}: {
  event: MarketingEvent;
  context: MarketingContext;
  children: React.ReactNode;
  className?: string;
}) {
  const element = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const { placement, contentType, articleId } = context;
  useEffect(() => {
    if (!element.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          track(event, { placement, contentType, articleId });
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    observer.observe(element.current);
    return () => observer.disconnect();
  }, [event, placement, contentType, articleId, pathname]);
  return (
    <div ref={element} className={className}>
      {children}
    </div>
  );
}
