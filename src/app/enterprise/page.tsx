import Link from 'next/link';
import { InquiryForm } from '@/components/media-forms';
import { queryText, type SearchParams } from '@/lib/pagination';
export const metadata = {
  title: '企业 AI 服务与专家合作',
  description: '提交企业AI需求、诊断申请或专家合作信息。围绕真实业务问题，连接合适的实践资源。',
  alternates: { canonical: '/enterprise' },
};
export default async function Enterprise({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const type = queryText(await searchParams, 'type'),
    expert = type === 'expert',
    diagnosis = type === 'diagnosis';
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">FDE ECOSYSTEM / ENTERPRISE</span>
        <h1>
          从真实的问题开始<i>。</i>
        </h1>
        <p>连接企业需求、一线专家与可落地的实践资源。</p>
      </div>
      <nav className="media-links">
        <Link href="/enterprise" className={!expert && !diagnosis ? 'active' : ''}>
          企业 AI 需求
        </Link>
        <Link href="/enterprise?type=diagnosis" className={diagnosis ? 'active' : ''}>
          企业 AI 诊断
        </Link>
        <Link href="/enterprise?type=expert" className={expert ? 'active' : ''}>
          专家合作
        </Link>
        <Link href="/contribute">产业合作</Link>
      </nav>
      <div className="media-service-layout">
        <aside className="service-intro">
          <h2>
            {expert
              ? '让专业经验，遇到值得解决的问题。'
              : diagnosis
                ? '先理解业务，再讨论 AI。'
                : '把业务问题说清楚，是合作的第一步。'}
          </h2>
          <p>
            申请信息仅供授权工作人员评估与联系，不进入公开内容或搜索结果。提交申请不构成服务采购或效果承诺。
          </p>
          <ul>
            <li>描述你所在行业与具体场景</li>
            <li>说明当前困难和目标</li>
            <li>保留必要信息，避免提交商业机密</li>
            <li>工作人员结合需求进一步沟通</li>
          </ul>
          <Link href="/cases">先阅读企业案例 →</Link>
        </aside>
        <InquiryForm key={type} kind={expert ? 'expert' : 'enterprise'} diagnosis={diagnosis} />
      </div>
    </div>
  );
}
