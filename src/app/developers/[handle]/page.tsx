import { notFound } from 'next/navigation';
import { developer } from '@/lib/catalog';
import { ResourceGrid, SectionTitle, Empty } from '@/components/site';
export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await developer(handle);
  return { title: p?.name || '开发者', alternates: { canonical: `/developers/${handle}` } };
}
export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const p = await developer(handle);
  if (!p) notFound();
  return (
    <div className="container page-space">
      <div className="profile-hero">
        <span className="avatar avatar-xl">{p.name.slice(0, 1)}</span>
        <div>
          <span className="eyebrow">COMMUNITY BUILDER {p.is_demo ? '· 演示身份' : ''}</span>
          <h1>{p.name}</h1>
          <p>{p.bio || '这位开发者还没有填写简介。'}</p>
          <div className="tags">
            {p.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </div>
          {p.github_url && (
            <a href={p.github_url} target="_blank" rel="noreferrer">
              GitHub ↗
            </a>
          )}
          <p>{p.availability}</p>
          {p.contact && <p>公开联系方式：{p.contact}</p>}
        </div>
      </div>
      <section>
        <SectionTitle title="发布的项目与资源" />
        <ResourceGrid resources={p.resources} />
      </section>
      <section className="spaced">
        <SectionTitle title="已确认的开源贡献" />
        {p.contributions.length ? (
          p.contributions.map((c) => (
            <a className="list-row" key={c.id} href={c.pr_url} target="_blank" rel="noreferrer">
              <b>{c.title}</b>
              <span>查看 PR ↗</span>
            </a>
          ))
        ) : (
          <Empty
            title="贡献记录从第一次共建开始"
            description="完成共创任务并通过审核后，记录会出现在这里。"
          />
        )}
      </section>
      <section className="spaced">
        <SectionTitle title="案例作品集" />
        {p.portfolio.length ? (
          p.portfolio.map((p, i) => (
            <a className="list-row" key={i} href={p.url} target="_blank" rel="noreferrer">
              {p.title}
              <span>查看作品 ↗</span>
            </a>
          ))
        ) : (
          <p className="muted">暂未公开作品集。</p>
        )}
      </section>
    </div>
  );
}
