import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Plus,
  Search,
  Layers,
  BookOpen,
  Code2,
  FlaskConical,
  Users,
  UserRound,
  Workflow,
  Box,
  Command,
} from 'lucide-react';
import type { User, Resource, ResourceSummary, Profile, Collection } from '@/lib/types';
import { kinds, resourcePath } from '@/lib/types';
import { Button } from './ui/button';
import { SiteNavigation, CommunityNavigation } from './navigation';
import { LoginLink } from './login-link';
export function Logo() {
  return (
    <Link href="/" className="logo media-logo" aria-label="FDE前线 首页">
      <span className="media-logo-mark">
        F<span>↗</span>
      </span>
      <span>
        FDE前线<small>企业AI转型与智能体产业媒体</small>
      </span>
    </Link>
  );
}
export function Header({ user }: { user: User | null }) {
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
              <Link href="/contribute">
                <Plus size={15} />
                投稿 / 合作
              </Link>
            </Button>
            {user ? (
              <Link className="login-link" href="/dashboard" aria-label="我的工作台">
                <span className="avatar avatar-sm">{user.name.slice(0, 1)}</span>
                <span>工作台</span>
              </Link>
            ) : (
              <LoginLink className="login-link" aria-label="账号登录">
                <UserRound size={18} />
                <span>登录</span>
              </LoginLink>
            )}
          </div>
          <SiteNavigation mobile loggedIn={!!user} />
        </div>
      </header>
      <CommunityNavigation />
    </>
  );
}
export function Footer() {
  return (
    <footer className="site-footer media-footer">
      <div className="media-container">
        <div className="media-footer-grid">
          <div>
            <Logo />
            <p>洞察 AI 产业变革，记录企业转型实践。</p>
            <small>INDEPENDENT THINKING. REAL-WORLD PRACTICE.</small>
          </div>
          <div>
            <strong>内容与研究</strong>
            <Link href="/insights">前线观察</Link>
            <Link href="/features">深度报道</Link>
            <Link href="/cases">企业案例</Link>
            <Link href="/research">产业研究</Link>
          </div>
          <div>
            <strong>连接与共建</strong>
            <Link href="/people">前线人物</Link>
            <Link href="/events">产业活动</Link>
            <Link href="/community">FDE开放社区</Link>
            <Link href="/enterprise">企业服务</Link>
          </div>
          <div>
            <strong>关于 FDE前线</strong>
            <Link href="/about">关于我们</Link>
            <Link href="/contribute">投稿 / 合作 / 联系</Link>
            <Link href="/terms">用户协议</Link>
            <Link href="/privacy">隐私政策</Link>
          </div>
        </div>
        <div className="media-footer-bottom">
          <div className="media-footer-identity">
            <span>© {new Date().getFullYear()} FDE前线</span>
            <span>杭州集智光年科技有限公司</span>
          </div>
          <a href="https://beian.miit.gov.cn/" target="_blank" rel="noopener noreferrer">
            浙ICP备2025181284号-9
          </a>
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
