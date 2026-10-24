import Link from 'next/link';
import { notFound } from 'next/navigation';
import { packs } from '@/lib/practice';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = packs.find((p) => p.slug === slug);
  return { title: pack?.title || '实践包', alternates: { canonical: '/practice/' + slug } };
}
export default async function Pack({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const pack = packs.find((p) => p.slug === slug);
  if (!pack) notFound();
  return (
    <div className="container page-space start-guide">
      <Link href="/practice">← 全部实践包</Link>
      <span className="media-eyebrow">{pack.duration} / LOCAL PRACTICE</span>
      <h1>{pack.title}</h1>
      <p>{pack.summary}</p>
      <p className="notice">
        合成数据 · 本地规则验收 ·
        不调用模型或外部服务。本练习不是案例企业源码，也不是生产系统。代码与模板按 MIT 许可提供。
      </p>
      <a className="media-primary" href={'/practice/' + pack.slug + '.zip'} download>
        下载完整实践包 ZIP ↓
      </a>
      <section className="item-panel">
        <h2>输入与预期输出</h2>
        <h3>示例输入</h3>
        <p>{pack.input}</p>
        <h3>预期结果</h3>
        <p>{pack.output}</p>
      </section>
      <section className="item-panel">
        <h2>运行步骤</h2>
        <p>解压后进入文件夹，在终端运行（Python 3.10+）：</p>
        <pre>
          <code>{'python3 run.py\npython3 run.py --check'}</code>
        </pre>
        <p>
          Windows 可将 python3 替换为 py -3。第一条命令生成
          output.json；第二条核对随包预期，正确时显示 PASS。
        </p>
        <ol>
          {pack.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <p>
          包内包含 README、input.json、expected.json、run.py、acceptance.md 与
          LICENSE。修改输入后，预期结果需要由你按业务口径重新核定。
        </p>
      </section>
      <section className="item-panel">
        <h2>完成之后</h2>
        <p>提交一份已填写的验收记录，说明运行环境、失败样本、阈值依据和仍需人工检查的事项。</p>
        <div className="reading-action">
          <Link href={'/cases/' + pack.caseSlug}>返回关联案例</Link>
          <Link href={'/projects/' + pack.project}>开源项目</Link>
          <Link href={'/skills/' + pack.skill}>配套 Skill</Link>
          <Link href="/build/first-deployment">参与共创 →</Link>
        </div>
      </section>
    </div>
  );
}
