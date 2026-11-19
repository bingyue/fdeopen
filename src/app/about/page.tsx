import Link from 'next/link';
import { FounderProfile, EcosystemLinks } from '@/components/marketing/promos';
import { purchaseReady } from '@/lib/marketing/config';
export const metadata = {
  title: '关于FDE前线',
  description: '了解FDE前线与创始人邴越：AI技术专家、企业FDE转型顾问，关注企业AI转型与智能体产业。',
  alternates: { canonical: '/about' },
};
export default function About() {
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">ABOUT US</span>
        <h1>
          洞察变革，记录实践<i>。</i>
        </h1>
        <p>FDE前线 · 企业 AI 转型与智能体产业媒体</p>
      </div>
      <div className="legal-copy">
        <h2 id="frontline">在技术与业务的交汇处</h2>
        <p>
          FDE前线关注企业 AI 转型、智能体产业、AI Native
          组织与管理变革。通过前线观察、企业案例与产业研究，让企业决策者和一线实践者理解正在发生的变化。
        </p>
        <h2>用证据建立可信度</h2>
        <p>
          我们重视来源、核验与表达边界。编辑观点不冒充统计结论，示例不冒充企业成果，商业合作不混同独立报道。匿名内容保留核验依据，公开范围尊重受访者和企业授权。
        </p>
        <FounderProfile />
        <section className="about-founder" aria-label="一线经历">
          <h3>一线经历与专业实践</h3>
          <ul className="about-founder-experience">
            <li>曾任职阿里巴巴 / 美团点评 / 快手技术专家</li>
            <li>曾服务新华网、埃森哲中国、用友软件企业数字化转型</li>
            <li>清华大学出版社《FDE前线部署工程师：企业AI转型与智能体工程化交付》作者</li>
            <li>中国通信工业协会人工智能领域专家</li>
            <li>腾讯云架构师同盟专家</li>
          </ul>
        </section>
        <h2>从媒体，到开放生态</h2>
        <p>
          开放社区是 FDE前线的实践入口，连接开源项目、技能与企业交付。
          你可以在社区维护资料、收藏资源、参与讨论与共创。
        </p>
        <div className="media-links">
          <Link href="/community">开放社区</Link>
          <Link href="/developers">专家与开发者</Link>
          <Link href="/enterprise">企业需求</Link>
          <Link href="/contribute">投稿与合作</Link>
        </div>
        <h2>知识出版与开放实践</h2>
        <p>
          以专业图书构建系统方法，以Awesome-FDE沉淀免费交付指南，以FDE中国社区连接实践者。年度实战社群由FDE中国社区组织会员经营，知识星球承载首期购买与内容。
          {!purchaseReady() && '社群目前为方案预览。'}
          人才培养由51FDE连接，企业服务从真实业务需求出发。
        </p>
        <EcosystemLinks />
        <h2 id="learning">专业成长与产业协作</h2>
        <p>
          学习、培训、企业诊断与人才合作作为生态连接入口。我们优先公开可阅读、可复核的经验；具体服务与安排由合作双方确认。
        </p>
        <h2>长期共建</h2>
        <p>
          100 个企业 AI
          开源实战项目是社区的长期共建目标，不是对已经完成数量的声明。现有开放资料可以从原社区继续访问。
        </p>
        <Link href="/collections/hundred-builds">查看共建计划 →</Link>
      </div>
    </div>
  );
}
