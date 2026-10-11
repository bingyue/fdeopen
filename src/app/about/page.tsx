import Link from 'next/link';
import { PageHeading } from '@/components/site';
export const metadata = { title: '关于 FDEOpen', alternates: { canonical: '/about' } };
export default function About() {
  return (
    <div className="container page-space privacy-page">
      <PageHeading
        eyebrow="OPEN BY DEFAULT"
        title="开放实践，连接真实业务"
        description="FDEOpen · FDE开放社区，让企业 AI 落地更加开放。"
      />
      <h2>一个独立的开放社区</h2>
      <p>
        FDEOpen 面向 Forward Deployed Engineer、AI 应用工程师、独立开发者、AI 创业者与企业 AI
        负责人。我们通过项目、Skills、行业场景和真实贡献，让实践经验可以被发现、验证与复用。
      </p>
      <h2 id="frontline">由 FDE前线发起</h2>
      <p>
        FDE前线承担行业观察、媒体内容与实践传播。FDEOpen
        保持独立品牌和开发者体验，公开项目与文档默认免费访问。你不需要购买课程才能查看开放资源。
      </p>
      <h2>FDE 生态如何协作</h2>
      <ul>
        <li>FDEOpen：开放项目、技能、场景与协作。</li>
        <li>
          <span id="learning">51FDE</span>
          ：学习、训练营、职业与人才成长等独立服务。正式入口开放后会在社区中更新。
        </li>
        <li>
          <a href="https://fdechina.ai" target="_blank" rel="noreferrer">
            FDE中国
          </a>
          ：企业需求、专家与生态合作。
        </li>
      </ul>
      <h2>100 个企业 AI 开源实战项目共建计划</h2>
      <p>
        这是长期共建目标，不是对当前成果数量的声明。项目应带有可复现文档、来源许可与验收证据；没有验证过的效果不作为成果宣传。
      </p>
      <p>
        <Link href="/collections/hundred-builds" className="text-link">
          查看共建计划 →
        </Link>
      </p>
    </div>
  );
}
