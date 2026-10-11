import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  GitBranch as Github,
  Layers,
  BookOpen,
  Code2,
  FlaskConical,
  Users,
  Workflow,
  Box,
  Command,
} from 'lucide-react';
import type { User, Resource, ResourceSummary, Profile, Collection } from '@/lib/types';
import { kinds, resourcePath } from '@/lib/types';
import { Button } from './ui/button';
import { SiteNavigation } from './navigation';
import { learningUrl } from '@/lib/config';
export function Logo() {
  return (
    <Link href="/" className="logo" aria-label="FDEOpen 首页">
      <span className="logo-symbol">
        <Box size={23} strokeWidth={2.3} />
      </span>
      <span>
        FDE<span className="logo-open">Open</span>
        <small>FDE 开放社区</small>
      </span>
    </Link>
  );
}
export function Header({ user, demo }: { user: User | null; demo: boolean }) {
  return (
    <>
      <a href="#main" className="skip-link">
        跳转到正文
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Logo />
          <SiteNavigation />
          <div className="header-actions">
            <Link href="/search" className="icon-link" aria-label="全站搜索">
              <Search size={19} />
            </Link>
            <Button asChild size="sm" variant="secondary">
              <Link href="/submit">
                <Plus size={15} />
                提交项目
              </Link>
            </Button>
            <Link
              className="login-link"
              aria-label={user ? '我的工作台' : 'GitHub 登录'}
              href={user ? '/dashboard' : '/login'}
            >
              {user ? (
                <span className="avatar avatar-sm">{user.name.slice(0, 1)}</span>
              ) : (
                <Github size={18} />
              )}
              <span>{user ? '工作台' : '登录'}</span>
            </Link>
          </div>
          <SiteNavigation mobile loggedIn={!!user} />
        </div>
      </header>
      {demo && (
        <div className="demo-strip">
          <span className="status-dot" /> 本地演示模式 <span>·</span>{' '}
          真实来源目录，示例身份与演示数据{' '}
          <Link href="/login">
            切换体验身份 <ArrowRight size={12} />
          </Link>
        </div>
      )}
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo />
          <p>让企业 AI 落地更加开放。</p>
          <span className="micro">OPEN SOURCE · AI AGENTS · REAL-WORLD DEPLOYMENT</span>
        </div>
        <div>
          <strong>发现与构建</strong>
          <Link href="/projects">开源项目</Link>
          <Link href="/skills">Skills 市场</Link>
          <Link href="/scenarios">企业 AI 场景</Link>
        </div>
        <div>
          <strong>参与社区</strong>
          <Link href="/submit">提交你的作品</Link>
          <Link href="/build">参与开源共创</Link>
          <Link href="/docs/fde-getting-started">从这里开始</Link>
        </div>
        <div>
          <strong>FDE 生态</strong>
          <Link href="/about#frontline">FDE前线 · 内容与传播</Link>
          <Link href={learningUrl()}>
            51FDE · 学习与成长 <ArrowUpRight size={12} />
          </Link>
          <a href="https://fdechina.ai" target="_blank" rel="noreferrer">
            FDE中国 · 企业与生态 <ArrowUpRight size={12} />
          </a>
          <span className="muted small">生态服务独立于免费开放资源</span>
        </div>
      </div>
      <div className="container footer-bottom">
        <span>© {new Date().getFullYear()} FDEOpen · 由 FDE前线发起</span>
        <div>
          <Link href="/about">关于社区</Link>
          <Link href="/privacy">隐私与社区规则</Link>
          <Link href="/admin">运营后台</Link>
        </div>
      </div>
    </footer>
  );
}
export function SectionTitle({
  eyebrow,
  title,
  description,
  href,
  linkLabel = '查看全部',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  linkLabel?: string;
}) {
  return (
    <div className="section-title">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {href && (
        <Link href={href} className="text-link">
          {linkLabel}
          <ArrowRight size={16} />
        </Link>
      )}
    </div>
  );
}
const colors = ['blue', 'violet', 'green', 'orange', 'pink'];
export function ResourceIcon({
  r,
  large = false,
}: {
  r: Pick<Resource, 'slug' | 'kind' | 'title'>;
  large?: boolean;
}) {
  const c = colors[[...r.slug].reduce((s, c) => s + c.charCodeAt(0), 0) % colors.length];
  const Icon = {
    project: Code2,
    skill: Command,
    scenario: Workflow,
    demo: FlaskConical,
    task: Users,
    article: BookOpen,
  }[r.kind];
  return (
    <span className={`resource-icon ${c} ${large ? 'large' : ''}`} aria-hidden="true">
      {r.kind === 'project' ? (
        <b>{r.title.replace(/[^A-Za-z]/g, '').slice(0, 2) || 'AI'}</b>
      ) : (
        <Icon size={large ? 30 : 22} />
      )}
    </span>
  );
}
export const num = (value: number) =>
  value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(value);
export function ResourceCard({ r }: { r: ResourceSummary }) {
  return (
    <article className={`resource-card ${r.kind}-card`}>
      <div className="card-top">
        <ResourceIcon r={r} />
        <span className="card-category">
          {r.kind === 'scenario' ? r.metadata.industry : r.category}
        </span>
        {r.featured && <span className="featured-mark">精选</span>}
      </div>
      <h3>
        <Link href={resourcePath(r)}>
          {r.title}
          <ArrowUpRight size={16} />
        </Link>
      </h3>
      <p>{r.summary}</p>
      <div className="tags">
        {r.tags.slice(0, 3).map((t) => (
          <span key={t}>{t}</span>
        ))}
      </div>
      <div className="card-bottom">
        {r.kind === 'project' ? (
          <>
            <span>
              <span className="language-dot" />
              {r.metadata.language || '开源项目'}
            </span>
            <span title={`GitHub Stars · ${r.metadata.checkedAt?.slice(0, 10) || '来源快照'}`}>
              ☆ {num(r.metadata.stars || 0)}
            </span>
            <span className="license-label">{r.license}</span>
          </>
        ) : r.kind === 'skill' ? (
          <>
            <span>
              ↳ {r.source_author.includes('bingyue') ? 'fde-skills' : r.source_author || '社区贡献'}
            </span>
            <span>v{r.metadata.version || '待标注'}</span>
          </>
        ) : r.kind === 'scenario' ? (
          <>
            <span>{r.metadata.difficulty || '待评估'} · 实践方案</span>
            <span>
              方案示例 <ArrowRight size={13} />
            </span>
          </>
        ) : r.kind === 'task' ? (
          <>
            <span className="open-status">
              {r.metadata.state === 'open'
                ? '● 开放认领'
                : r.metadata.state === 'completed'
                  ? '已完成'
                  : '进行中'}
            </span>
            <span>{r.metadata.difficulty || '待评估'}</span>
          </>
        ) : (
          <>
            <span>{r.kind === 'demo' ? '外部项目体验' : '开放阅读'}</span>
            <ArrowRight size={15} />
          </>
        )}
      </div>
    </article>
  );
}
export function ResourceGrid({ resources }: { resources: ResourceSummary[] }) {
  return resources.length ? (
    <div className="resource-grid">
      {resources.map((r) => (
        <ResourceCard key={r.id} r={r} />
      ))}
    </div>
  ) : (
    <Empty
      title="暂时没有匹配的内容"
      description="试试其他关键词或清除筛选，也欢迎提交你正在使用的资源。"
      href="/submit"
      label="提交资源"
    />
  );
}
export function DeveloperCard({ p }: { p: Profile }) {
  return (
    <Link href={`/developers/${p.handle}`} className="developer-card">
      <span className="avatar">{p.name.slice(0, 1)}</span>
      <div>
        <h3>
          {p.name}
          {p.is_demo && <span className="tiny-badge">演示</span>}
        </h3>
        <p>{p.bio}</p>
        <div className="tags">
          {p.tags.slice(0, 3).map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
      <ArrowUpRight size={18} />
    </Link>
  );
}
export function CollectionCard({ c }: { c: Collection }) {
  return (
    <Link className={`collection-card ${c.theme}`} href={`/collections/${c.slug}`}>
      <span className="collection-icon">
        <Layers size={25} />
        <ArrowUpRight size={18} />
      </span>
      <small>COMMUNITY COLLECTION</small>
      <h3>{c.title}</h3>
      <p>{c.summary}</p>
      <span className="text-link">
        探索专题 <ArrowRight size={15} />
      </span>
    </Link>
  );
}
export function Empty({
  title,
  description,
  href,
  label,
}: {
  title: string;
  description: string;
  href?: string;
  label?: string;
}) {
  return (
    <div className="empty">
      <Box size={30} />
      <h3>{title}</h3>
      <p>{description}</p>
      {href && (
        <Button asChild variant="secondary">
          <Link href={href}>{label}</Link>
        </Button>
      )}
    </div>
  );
}
export function PageHeading({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="page-heading">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
    </div>
  );
}
export function Breadcrumb({ r }: { r: Resource }) {
  return (
    <nav className="breadcrumb" aria-label="面包屑">
      <Link href="/">首页</Link>
      <span>/</span>
      <Link href={kinds[r.kind].path}>{kinds[r.kind].label}</Link>
      <span>/</span>
      <span>{r.title}</span>
    </nav>
  );
}
