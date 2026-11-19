'use client';
import Link from 'next/link';
import { LoginLink } from './login-link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { ChevronDown } from 'lucide-react';
import { TrackedLink } from './marketing/tracking';
const nav = [
  ['首页', '/'],
  ['前线观察', '/insights'],
  ['企业案例', '/cases'],
  ['产业研究', '/research'],
  ['开源生态', '/community'],
  ['FDE社群', '/membership'],
  ['关于我们', '/about'],
];
const ecosystemLinks = [
  ['新手指南', '/start', '找到适合你的学习与实践路径'],
  ['开源项目', '/projects', '发现可复用的 AI 开源方案'],
  ['Skills', '/skills', '探索技能、模板与工作流'],
  ['企业场景', '/scenarios', '从真实业务问题寻找方案'],
  ['动手实践', '/practice', '用实践包完成一次项目验证'],
  ['开源共创', '/build', '参与任务，贡献一线经验'],
  ['开放文档', '/docs', '查阅技术方法与交付指南'],
];
const moreResources = [
  ['资源总览', '/community'],
  ['实验室', '/lab'],
  ['开发者', '/developers'],
];
const isCurrent = (pathname: string, href: string) =>
  pathname === href || pathname.startsWith(href + '/');

function EcosystemNavigation({ pathname }: { pathname: string }) {
  const disclosure = useRef<HTMLDetailsElement>(null);
  const active = [...ecosystemLinks, ...moreResources].some(([, href]) =>
    isCurrent(pathname, href),
  );
  useEffect(() => {
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && !disclosure.current?.contains(event.target)) {
        if (disclosure.current) disclosure.current.open = false;
      }
    };
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, []);
  return (
    <details
      className="ecosystem-navigation"
      ref={disclosure}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && disclosure.current?.open) {
          event.preventDefault();
          event.stopPropagation();
          disclosure.current.open = false;
          disclosure.current.querySelector('summary')?.focus();
        }
      }}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('a') && disclosure.current)
          disclosure.current.open = false;
      }}
    >
      <summary data-active={active || undefined}>
        开源生态 <ChevronDown size={14} aria-hidden="true" />
      </summary>
      <div className="ecosystem-menu" role="group" aria-label="开源生态资源">
        <p className="ecosystem-menu-heading">从了解，到实践与共建</p>
        <div className="ecosystem-menu-links">
          {ecosystemLinks.map(([label, href, description]) => (
            <Link
              key={href}
              href={href}
              aria-label={label}
              aria-current={isCurrent(pathname, href) ? 'page' : undefined}
            >
              <span>{label}</span>
              <small>{description}</small>
            </Link>
          ))}
        </div>
        <div className="ecosystem-menu-more">
          {moreResources.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={isCurrent(pathname, href) ? 'page' : undefined}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </details>
  );
}
export function SiteNavigation({
  mobile = false,
  loggedIn = false,
  membershipEnabled = true,
}: {
  mobile?: boolean;
  loggedIn?: boolean;
  membershipEnabled?: boolean;
}) {
  const pathname = usePathname();
  const details = useRef<HTMLDetailsElement>(null);
  const links = nav
    .filter(([, href]) => href !== '/membership' || membershipEnabled)
    .map(([label, href]) =>
      href === '/community' ? (
        <EcosystemNavigation key={`ecosystem-${pathname}`} pathname={pathname} />
      ) : href === '/membership' ? (
        <TrackedLink
          key={href}
          href={href}
          event="community_detail_click"
          context={{ placement: 'header' }}
          aria-current={pathname === href ? 'page' : undefined}
        >
          {label}
        </TrackedLink>
      ) : (
        <Link key={href} href={href} aria-current={isCurrent(pathname, href) ? 'page' : undefined}>
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
