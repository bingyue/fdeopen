import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Search,
  Sparkles,
  GitFork,
  Code2,
  Workflow,
  Box,
  Command,
  BookOpen,
  FlaskConical,
  Terminal,
  Check,
  Star,
  ShieldCheck,
} from 'lucide-react';
import { resourcePreview, collections, developers, homeSettings } from '@/lib/catalog';
import { ResourceGrid, SectionTitle, CollectionCard, DeveloperCard } from '@/components/site';
import { Button } from '@/components/ui/button';
export const metadata = { alternates: { canonical: '/' } };
const categories = [
  ['RAG', BookOpen, '知识的下一步'],
  ['Agent', Sparkles, '让想法开始行动'],
  ['MCP', Box, '连接工具与能力'],
  ['Skills', Command, '复用专业的方法'],
  ['Workflow', Workflow, '编排业务流程'],
  ['AI Infra', Terminal, '构建可靠的底座'],
];
function Ecosystem() {
  return (
    <div className="ecosystem" aria-label="从真实场景到开源项目、技能和企业交付的连接图">
      <div className="ecosystem-top">
        <span className="status-dot" /> BUILT IN THE OPEN <span>v1.0</span>
      </div>
      <div className="orbit orbit-one" />
      <div className="orbit orbit-two" />
      <svg className="connectors" viewBox="0 0 520 350" aria-hidden="true">
        <path d="M260 172L106 84M260 172L407 94M260 172L100 275M260 172L420 273" />
        <circle cx="187" cy="130" r="3" />
        <circle cx="333" cy="133" r="3" />
        <circle cx="184" cy="222" r="3" />
      </svg>
      <div className="eco-center">
        <span className="eco-logo">
          <Box size={30} />
        </span>
        <b>FDEOpen</b>
        <small>从开放，到落地</small>
      </div>
      <div className="eco-node node-one">
        <span className="node-icon blue">
          <Code2 size={18} />
        </span>
        <div>
          <b>Open Source</b>
          <small>发现优质开源项目</small>
        </div>
        <span className="node-dot" />
      </div>
      <div className="eco-node node-two">
        <span className="node-icon violet">
          <Command size={18} />
        </span>
        <div>
          <b>Agent Skills</b>
          <small>让经验可以复用</small>
        </div>
      </div>
      <div className="eco-node node-three">
        <span className="node-icon green">
          <Workflow size={18} />
        </span>
        <div>
          <b>Real-world Scenarios</b>
          <small>从真实业务出发</small>
        </div>
      </div>
      <div className="eco-node node-four">
        <span className="node-icon orange">
          <GitFork size={18} />
        </span>
        <div>
          <b>Build Together</b>
          <small>让贡献持续发生</small>
        </div>
      </div>
      <div className="ecosystem-bottom">
        <span>
          <Check size={12} /> Open by default
        </span>
        <span>Built for real work ↗</span>
      </div>
    </div>
  );
}
export default async function Home() {
  const settings = await homeSettings();
  const [projects, skills, scenarios, demos, tasks, sets, people, latest] = await Promise.all([
    resourcePreview('project', { featured: true, limit: 6 }),
    resourcePreview('skill', { featured: true, limit: 3 }),
    resourcePreview('scenario', { featured: true, limit: 3 }),
    settings.showLab ? resourcePreview('demo') : [],
    settings.showTasks ? resourcePreview('task') : [],
    collections(),
    settings.showDevelopers ? developers() : [],
    resourcePreview('project', { sort: 'newest', limit: 3 }),
  ]);
  return (
    <>
      <section className="hero-wrap">
        <div className="container">
          <Link href="/collections/hundred-builds" className="announcement">
            <span>COMMUNITY BUILD</span>
            {settings.announcement}
            <ArrowUpRight size={14} />
          </Link>
          <div className="hero">
            <div className="hero-copy">
              <span className="eyebrow">
                <span className="blue-dash" /> THE OPEN COMMUNITY FOR FDE
              </span>
              <h1>
                让企业 AI 落地
                <br />
                <em>更加开放。</em>
              </h1>
              <p>
                发现值得构建的开源项目，复用经过整理的 Skills，
                <br className="desktop-only" />
                从真实业务场景出发，和开发者一起把 AI 落到实处。
              </p>
              <form action="/search" className="hero-search" role="search">
                <Search size={21} />
                <input
                  aria-label="搜索项目、Skills 或企业场景"
                  name="q"
                  placeholder="搜索项目、Skills 或企业场景…"
                />
                <button type="submit" aria-label="开始搜索">
                  <ArrowRight size={20} />
                </button>
              </form>
              <div className="search-hints">
                <span>从这里开始</span>
                {['RAG', 'MCP', '知识库', 'Agent'].map((q) => (
                  <Link key={q} href={`/search?q=${encodeURIComponent(q)}`}>
                    {q}
                  </Link>
                ))}
              </div>
              <div className="hero-buttons">
                <Button asChild size="lg">
                  <Link href="/projects">
                    探索开源项目 <ArrowRight size={17} />
                  </Link>
                </Button>
                <Button asChild variant="ghost" size="lg">
                  <Link href="/submit">
                    <GitFork size={17} />
                    分享你的作品
                  </Link>
                </Button>
              </div>
              <div className="hero-trust">
                <span>
                  <ShieldCheck size={15} />
                  开放访问
                </span>
                <span>
                  <Code2 size={15} />
                  尊重来源与许可
                </span>
                <span>
                  <GitFork size={15} />
                  共建真实贡献
                </span>
              </div>
            </div>
            <Ecosystem />
          </div>
          <div className="category-bar">
            {categories.map(([name, Icon, desc]) => {
              const C = Icon as typeof BookOpen;
              return (
                <Link
                  key={String(name)}
                  href={`/projects?category=${encodeURIComponent(String(name))}`}
                >
                  <C size={23} />
                  <div>
                    <strong>{String(name)}</strong>
                    <span>{String(desc)}</span>
                  </div>
                  <ArrowUpRight size={13} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>
      <div className="container home-content">
        <section>
          <SectionTitle
            eyebrow="OPENHUB"
            title="好的实践，从好的项目开始"
            description="为企业 AI 开发而精选，连接原作者与开源社区。"
            href="/projects"
            linkLabel="探索项目库"
          />
          <div className="section-tabs">
            <span className="active">
              <Star size={14} />
              精选项目
            </span>
            <Link href="/projects?sort=newest">最新收录</Link>
            <Link href="/projects?sort=popular">社区收藏</Link>
            <small>GitHub 数据为带日期的来源快照</small>
          </div>
          <ResourceGrid resources={projects} />
        </section>
        <section className="collection-section">
          <SectionTitle
            eyebrow="CURATED COLLECTIONS"
            title="少一点寻找，多一点构建"
            href="/collections"
            linkLabel="全部专题"
          />
          <div className="collection-grid">
            {sets
              .filter((c) => c.theme !== 'dark')
              .slice(0, 3)
              .map((c) => (
                <CollectionCard key={c.id} c={c} />
              ))}
          </div>
        </section>
        <section>
          <SectionTitle
            eyebrow="SKILLHUB"
            title="把专业方法，装进你的 Agent"
            description="从需求诊断到交付验收，可复用的技能让工作更进一步。"
            href="/skills"
          />
          <ResourceGrid resources={skills} />
        </section>
        <section className="scenario-section">
          <SectionTitle
            eyebrow="SCENARIOHUB"
            title="技术，最终要回答业务问题"
            description="从一个真实问题出发，找到可复用的组件与实施路径。"
            href="/scenarios"
          />
          <ResourceGrid resources={scenarios} />
          <Link href="/submit?type=requirement" className="inline-cta">
            <span>
              <Workflow size={18} />
              有一个值得解决的企业问题？
            </span>
            <b>
              私密提交场景需求 <ArrowRight size={16} />
            </b>
          </Link>
        </section>
        {settings.showLab && (
          <section>
            <SectionTitle
              eyebrow="FDE LAB"
              title="先体验，再开始构建"
              description="查看原项目体验入口与示例，了解技术如何工作。"
              href="/lab"
            />
            <ResourceGrid resources={demos} />
          </section>
        )}
        {settings.showTasks && (
          <section>
            <SectionTitle
              eyebrow="BUILD TOGETHER"
              title="你的下一次贡献，可以从这里开始"
              description="一份部署记录、一个行业示例，都能让开放生态走得更远。"
              href="/build"
            />
            <ResourceGrid resources={tasks} />
          </section>
        )}
        {settings.showDevelopers && (
          <section>
            <SectionTitle
              eyebrow="PEOPLE BEHIND THE BUILD"
              title="项目背后，是认真构建的人"
              href="/developers"
            />
            {people.length ? (
              <div className="developer-grid">
                {people.slice(0, 3).map((p) => (
                  <DeveloperCard key={p.user_id} p={p} />
                ))}
              </div>
            ) : (
              <div className="join-developers">
                <UsersIcon />
                <p>社区正在开放共建，来建立你的第一个开发者档案。</p>
                <Link href="/login" className="text-link">
                  加入共建 <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </section>
        )}
        <section className="latest-row">
          <span className="eyebrow">RECENTLY ADDED</span>
          <b>最新收录</b>
          {latest.map((r) => (
            <Link key={r.id} href={`/projects/${r.slug}`}>
              {r.title}
              <ArrowUpRight size={13} />
            </Link>
          ))}
        </section>
        <section className="community-cta">
          <div>
            <span className="eyebrow">LESS ALONE. MORE OPEN.</span>
            <h2>
              下一个企业 AI 实践，
              <br />
              和社区一起构建。
            </h2>
            <p>加入「100 个企业 AI 开源实战项目共建计划」</p>
          </div>
          <div>
            <Button asChild variant="secondary" size="lg">
              <Link href="/submit">
                提交你的项目 <ArrowRight size={17} />
              </Link>
            </Button>
            <Link href="/collections/hundred-builds">
              了解共建计划 <ArrowUpRight size={15} />
            </Link>
            <small>100 是长期目标，每一份贡献都从真实开始。</small>
          </div>
          <div className="cta-orbit" />
        </section>
      </div>
    </>
  );
}
function UsersIcon() {
  return <FlaskConical size={24} />;
}
