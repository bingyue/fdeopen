'use client';
import Link from 'next/link';
import { LoginLink } from './login-link';
import { usePathname } from 'next/navigation';
import { useRef } from 'react';
import { TrackedLink } from './marketing/tracking';
const nav = [
  ['首页', '/'],
  ['前线观察', '/insights'],
  ['深度', '/features'],
  ['企业案例', '/cases'],
  ['产业研究', '/research'],
  ['人物', '/people'],
  ['活动', '/events'],
  ['开放社区', '/community'],
  ['关于我们', '/about'],
  ['FDE图书', '/book'],
];
export function SiteNavigation({
  mobile = false,
  loggedIn = false,
  bookEnabled = true,
  membershipEnabled = true,
}: {
  mobile?: boolean;
  loggedIn?: boolean;
  bookEnabled?: boolean;
  membershipEnabled?: boolean;
}) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  const links = nav
    .filter(([, href]) => href !== '/book' || bookEnabled)
    .map(([label, href]) =>
      href === '/book' ? (
        <TrackedLink
          key={href}
          href={href}
          event="book_detail_click"
          context={{ placement: 'header' }}
        >
          {label}
        </TrackedLink>
      ) : (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
        >
          {label}
        </Link>
      ),
    );
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
        <span className="mobile-community-label">开放社区资源</span>
        {[
          ['开源项目', '/projects'],
          ['Skills 市场', '/skills'],
          ['企业场景', '/scenarios'],
          ['实验室', '/lab'],
          ['开源共创', '/build'],
          ['开发者', '/developers'],
          ['开放文档', '/docs'],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
        {membershipEnabled && (
          <TrackedLink
            href="/membership"
            event="community_detail_click"
            context={{ placement: 'header' }}
            className="mobile-membership-link"
          >
            加入实战社群
          </TrackedLink>
        )}
        <Link href="/contribute">投稿 / 合作</Link>
        {loggedIn ? <Link href="/dashboard">我的工作台</Link> : <LoginLink>账号登录</LoginLink>}
      </nav>
    </details>
  );
}

export function CommunityNavigation() {
  const pathname = usePathname();
  return (
    <nav className="community-subnav" aria-label="社区快捷导航">
      <div>
        <Link href="/start" aria-current={pathname === '/start' ? 'page' : undefined}>
          新手指南
        </Link>
        {[
          ['开源项目', '/projects'],
          ['Skills', '/skills'],
          ['企业场景', '/scenarios'],
          ['动手实践', '/practice'],
          ['开源共创', '/build'],
          ['开放文档', '/docs'],
        ].map(([label, href]) => (
          <Link
            key={href}
            href={href}
            aria-current={pathname === href || pathname.startsWith(href + '/') ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
