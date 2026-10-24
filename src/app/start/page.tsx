import Link from 'next/link';
import { StartPaths } from '@/components/start-paths';
export const metadata = {
  title: '从这里开始 · FDE 实践指南',
  description: '面向企业负责人、开发者和新人的 FDE 起步路线：找场景、做验证、参与共创。',
  alternates: { canonical: '/start' },
};
export default function Start() {
  return (
    <div className="container page-space start-guide">
      <h1>找到适合你的第一步</h1>
      <StartPaths />
      <section id="enterprise" className="item-panel">
        <span className="media-eyebrow">企业找方案</span>
        <h2>先把一个业务问题说清楚</h2>
        <ol>
          <li>
            <Link href="/cases">从 20 个公开案例中找相近场景</Link>，比较问题、数据条件和适用边界。
          </li>
          <li>
            <Link href="/practice/quotation-check">用验收模板写下人工基线、收益口径与停用条件</Link>
            ；暂时没有数据的项目，先做采样。
          </li>
          <li>
            <Link href="/enterprise">提交私密企业需求</Link>
            ，描述具体流程、已有系统、数据条件与期望结果。
          </li>
        </ol>
        <p>第一份产出：一页试点范围和验收标准。案例披露的效果不能直接当成你所在企业的预期收益。</p>
      </section>
      <section id="builder" className="item-panel">
        <span className="media-eyebrow">开发者做项目</span>
        <h2>先交付一份别人能复现的结果</h2>
        <ol>
          <li>
            <Link href="/practice">选择一个无需密钥的本地实践包</Link>，下载并运行示例。
          </li>
          <li>
            <Link href="/projects">查看开源项目</Link>与<Link href="/skills">可复用 Skills</Link>
            ，按项目文档接入自己的脱敏样本。
          </li>
          <li>
            <Link href="/build/first-deployment">参与首次部署共创</Link>
            ，提交环境说明、运行步骤、失败记录与结果。
          </li>
        </ol>
        <p>第一份产出：README、示例输入、验收结果和已知限制。不要提交访问密钥或客户原始数据。</p>
      </section>
      <section id="learner" className="item-panel">
        <span className="media-eyebrow">新人学 FDE</span>
        <h2>沿着“场景 → 验证 → 交付”学习</h2>
        <ol>
          <li>
            <Link href="/cases/field-fde-068">阅读智能客服案例</Link>
            ，区分业务指标、技术能力和待核验事项。
          </li>
          <li>
            <Link href="/practice/knowledge-eval">完成知识助手验收练习</Link>
            ，观察越权与无依据回答为什么必须拦截。
          </li>
          <li>
            <Link href="/docs">继续阅读开放文档</Link>，用自己的话说明下一轮该测试什么。
          </li>
        </ol>
        <p>
          第一份产出：一张问题清单和一份验收记录。Python
          练习需要本地环境；没有环境也可以先在线阅读输入与结果说明。
        </p>
      </section>
      <p className="notice">
        阅读案例和下载练习无需注册。登录后可统一收藏内容，并在工作台继续最近阅读。
      </p>
    </div>
  );
}
