import Link from 'next/link';
import { InquiryForm } from '@/components/media-forms';
export const metadata = {
  title: '投稿与产业合作',
  description: '向FDE前线分享企业AI转型经验、采访线索和产业合作需求。',
  alternates: { canonical: '/contribute' },
};
export default function Contribute() {
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">CONTRIBUTE / CONNECT</span>
        <h1>
          让有价值的实践，被更多人看见<i>。</i>
        </h1>
        <p>欢迎有证据、有边界、有独立思考的内容与合作。</p>
      </div>
      <div className="media-service-layout">
        <aside className="service-intro">
          <h2>我们关注一线的问题与改变。</h2>
          <p>
            可以提交文章选题、采访线索、研究合作或活动建议。请说明材料来源与公开授权范围，商业合作内容发布时会明确标识。
          </p>
          <ul>
            <li>企业 AI 应用与组织变革</li>
            <li>智能体与工程交付实践</li>
            <li>可复核的企业案例和研究</li>
            <li>产业活动与公开交流</li>
          </ul>
          <div className="media-links">
            <Link href="/submit">提交社区资源</Link>
            <Link href="/admin/media">作者 / 编辑工作台</Link>
          </div>
          <p>
            联系方式通过此表单提交，由授权编辑私密处理。请勿填写密钥、客户机密或未经授权的个人资料。
          </p>
        </aside>
        <InquiryForm kind="cooperation" />
      </div>
    </div>
  );
}
