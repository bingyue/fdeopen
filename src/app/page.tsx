import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Radio } from 'lucide-react';
import { mediaList, mediaTaxonomy } from '@/lib/media-service';
import { postPath } from '@/lib/media-model';
import {
  EditorialCover,
  PostMeta,
  PostCard,
  EditorialSection,
  MediaEmpty,
} from '@/components/media';
import { Newsletter } from '@/components/media-interactions';
export const metadata = {
  title: 'FDE前线 · 企业AI转型与智能体产业媒体',
  description:
    '洞察AI产业变革，记录企业转型实践。关注企业AI转型、智能体产业、FDE工程交付与组织变革。',
  alternates: { canonical: '/' },
};
export default async function Home() {
  const [home, latest, breaking, cases, research, people, events, popular, taxonomy] =
    await Promise.all([
      mediaList({ home: true, limit: 5 }),
      mediaList({ limit: 6 }),
      mediaList({ breaking: true, limit: 3 }),
      mediaList({ channel: 'cases', limit: 3 }),
      mediaList({ channel: 'research', limit: 3 }),
      mediaList({ channel: 'people', limit: 2 }),
      mediaList({ channel: 'events', limit: 2 }),
      mediaList({ popular: true, limit: 4 }),
      mediaTaxonomy(),
    ]);
  const lead = home.rows[0] || latest.rows[0],
    picks = home.rows.length > 1 ? home.rows.slice(1) : latest.rows.slice(1, 5);
  return (
    <div className="media-home media-container">
      <div className="newswire">
        <span>
          <Radio size={15} />
          产业动态
        </span>
        <div>
          {breaking.rows.length ? (
            breaking.rows.map((p) => (
              <Link key={p.id} href={postPath(p)}>
                {p.authenticity === 'example' && <small>示例</small>}
                {p.title}
                <ArrowUpRight size={13} />
              </Link>
            ))
          ) : (
            <p>暂未发布产业快讯，持续关注经过编辑审核的行业信息。</p>
          )}
        </div>
        <Link className="wire-all" href="/insights">
          全部 <ArrowRight size={14} />
        </Link>
      </div>
      <div className="edition-line">
        <span>洞察 AI 产业变革，记录企业转型实践</span>
        <span>BUSINESS × TECHNOLOGY × TRANSFORMATION</span>
      </div>
      {lead ? (
        <section className="front-cover" aria-label="封面与编辑精选">
          <article className="lead-story">
            <Link
              className="lead-image"
              href={postPath(lead)}
              prefetch={false}
              tabIndex={-1}
              aria-hidden="true"
            >
              <EditorialCover post={lead} large />
            </Link>
            <div className="lead-content">
              <span className="media-eyebrow">COVER STORY / 封面深度</span>
              <h1>
                <Link href={postPath(lead)} prefetch={false}>
                  {lead.title}
                </Link>
              </h1>
              <p>{lead.summary}</p>
              <PostMeta post={lead} />
            </div>
          </article>
          <aside className="editors-picks">
            <div className="rail-title">
              <span>编辑精选</span>
              <small>EDITOR’S PICKS</small>
            </div>
            {picks.map((post, index) => (
              <div className="pick-item" key={post.id}>
                <span className="pick-number">0{index + 1}</span>
                <PostCard post={post} mode="compact" />
              </div>
            ))}
            <Link href="/features" className="rail-more">
              进入深度栏目 <ArrowUpRight size={16} />
            </Link>
          </aside>
        </section>
      ) : (
        <MediaEmpty title="为企业 AI 的下一步，记录值得阅读的内容。" />
      )}
      <div className="media-main-grid">
        <section>
          <EditorialSection title="前线正在发生" en="LATEST STORIES" href="/insights" />
          <div className="story-tabs">
            <span>最新文章</span>
            <Link href="/insights">前线观察</Link>
            <Link href="/features">深度分析</Link>
            <Link href="/features?featured=1">编辑精选</Link>
          </div>
          <div className="story-feed">
            {latest.rows.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            {!latest.rows.length && <MediaEmpty />}
          </div>
          <Link className="load-more-link" href="/insights">
            更多前线观察 <ArrowRight size={16} />
          </Link>
        </section>
        <aside className="home-sidebar">
          <div className="sidebar-section">
            <div className="rail-title">
              <span>读者关注</span>
              <small>READING LIST</small>
            </div>
            {popular.rows.map((p, i) => (
              <div className="popular-item" key={p.id}>
                <b>{String(i + 1).padStart(2, '0')}</b>
                <div>
                  <Link href={postPath(p)}>{p.title}</Link>
                  <small>
                    {p.views || 0} 次已记录访问{p.authenticity === 'example' ? ' · 示例' : ''}
                  </small>
                </div>
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="rail-title">
              <span>持续追踪</span>
              <small>TOPICS</small>
            </div>
            {taxonomy.topics.map((t) => (
              <Link className="topic-teaser" href={`/topics/${t.slug}`} key={t.slug}>
                <span>专题 / SPECIAL REPORT</span>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="rail-title">
              <span>研究推荐</span>
              <small>RESEARCH</small>
            </div>
            {research.rows.slice(0, 2).map((post) => (
              <PostCard key={post.id} post={post} mode="compact" />
            ))}
          </div>
          <Newsletter />
        </aside>
      </div>
      <section className="home-cases">
        <EditorialSection
          title="企业 AI 转型实录"
          en="TRANSFORMATION IN PRACTICE"
          description="深入真实业务场景，记录企业 AI 转型的方法、挑战与价值。"
          href="/cases"
        />
        <div className="media-grid-three">
          {cases.rows.map((post) => (
            <PostCard key={post.id} post={post} mode="tile" />
          ))}
        </div>
        {!cases.rows.length && <MediaEmpty title="企业案例正在整理" />}
      </section>
      <section className="home-research">
        <EditorialSection title="FDE 产业研究" en="RESEARCH & PERSPECTIVES" href="/research" />
        <div className="research-strip">
          {research.rows.map((post) => (
            <Link className="research-card" href={postPath(post)} key={post.id}>
              <EditorialCover post={post} />
              <div>
                <span>FDE前线 · 产业研究</span>
                <h3>{post.title}</h3>
                <p>{post.summary}</p>
                <span className="research-read">
                  阅读研究 <ArrowUpRight size={16} />
                </span>
              </div>
            </Link>
          ))}
        </div>
        {!research.rows.length && <MediaEmpty title="研究内容正在准备" />}
      </section>
      <div className="home-two-columns">
        <section>
          <EditorialSection title="前线人物" en="PEOPLE AT THE FRONTLINE" href="/people" />
          {people.rows.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
          {!people.rows.length && <MediaEmpty title="人物报道正在准备" />}
        </section>
        <section>
          <EditorialSection title="产业活动" en="MEET & CONNECT" href="/events" />
          {events.rows.map((post) => (
            <Link className="event-teaser" href={postPath(post)} key={post.id}>
              <div className="event-date">
                <small>{post.authenticity === 'example' ? '示例活动' : '即将相遇'}</small>
                <strong>
                  {post.authenticity === 'example'
                    ? '—'
                    : new Date(post.details.event_start || '').getDate()}
                </strong>
              </div>
              <div>
                <h3>{post.title}</h3>
                <p>{post.details.location}</p>
                <span>
                  {post.authenticity === 'example'
                    ? '暂不开放报名'
                    : post.details.event_state === 'open'
                      ? '查看活动与报名'
                      : '查看活动详情'}{' '}
                  ↗
                </span>
              </div>
            </Link>
          ))}
          {!events.rows.length && <MediaEmpty title="近期活动尚未公布" />}
        </section>
      </div>
      <section className="ecosystem-editorial">
        <EditorialSection title="连接实践者，共建产业生态" en="FDE ECOSYSTEM" href="/community" />
        <div className="ecosystem-links">
          {[
            ['01', 'FDE 开放社区', '从开源项目与可复用经验开始。', '/community'],
            ['02', 'FDE 专家网络', '认识关注一线问题的实践者。', '/developers'],
            ['03', '企业 AI 需求', '从你的业务问题开始一次交流。', '/enterprise'],
            ['04', '产业合作', '让有价值的行业经验被看见。', '/contribute'],
            ['05', '企业 AI 诊断', '梳理场景与边界，形成行动起点。', '/enterprise?type=diagnosis'],
          ].map(([n, title, desc, href]) => (
            <Link href={href} key={n}>
              <span>
                {n}
                <ArrowUpRight size={18} />
              </span>
              <h3>{title}</h3>
              <p>{desc}</p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
