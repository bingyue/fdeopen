'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
const nav = [
  ['开源项目', '/projects'],
  ['Skills 市场', '/skills'],
  ['企业场景', '/scenarios'],
  ['实验室', '/lab'],
  ['开源共创', '/build'],
  ['开发者', '/developers'],
  ['开放文档', '/docs'],
];
export function SiteNavigation({
  mobile = false,
  loggedIn = false,
}: {
  mobile?: boolean;
  loggedIn?: boolean;
}) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  const links = nav.map(([label, href]) => (
    <Link
      key={href}
      href={href}
      aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
    >
      {label}
    </Link>
  ));
  if (!mobile)
    return (
      <nav className="desktop-nav" aria-label="主导航">
        {links}
      </nav>
    );
  return (
    <details
      key={pathname}
      className="mobile-nav"
      ref={details}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && details.current) {
          details.current.open = false;
          details.current.querySelector('summary')?.focus();
        }
      }}
    >
      <summary aria-label="主导航菜单">
        <span>菜单</span>
      </summary>
      <nav
        aria-label="移动端导航"
        onClick={(event) => {
          if ((event.target as HTMLElement).closest('a') && details.current)
            details.current.open = false;
        }}
      >
        {links}
        <Link href="/submit">提交项目</Link>
        <Link href={loggedIn ? '/dashboard' : '/login'}>
          {loggedIn ? '我的工作台' : 'GitHub 登录'}
        </Link>
      </nav>
    </details>
  );
}
