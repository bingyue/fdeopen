import Link from 'next/link';
import { practiceForCase } from '@/lib/practice';
export function CasePractice({ slug }: { slug: string }) {
  const pack = practiceForCase(slug);
  return (
    <section className="case-practice" aria-label="从案例开始实践">
      <span className="media-eyebrow">读完之后，动手验证</span>
      <h2>{pack.title}</h2>
      <p>{pack.summary} 这是相关方法的合成数据演练，不复现案例企业系统或成果。</p>
      <div className="reading-action">
        <Link className="media-primary" href={'/practice/' + pack.slug}>
          开始 {pack.duration}练习 →
        </Link>
        <Link href={'/projects/' + pack.project}>查看开源组件</Link>
        <Link href={'/skills/' + pack.skill}>配套 Skill</Link>
      </div>
    </section>
  );
}
