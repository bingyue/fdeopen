import Link from 'next/link';
import { packs } from '@/lib/practice';
export function ResourcePractice({ slug }: { slug: string }) {
  const related = packs.filter((p) => p.skill === slug || p.project === slug);
  if (!related.length) return null;
  return (
    <section className="case-practice">
      <span className="media-eyebrow">配套练习</span>
      <h2>先用合成样本跑通验收</h2>
      <p>不依赖本项目环境的本地练习，可用于理解输入、输出与验收口径。之后再按项目文档完成集成。</p>
      <div className="reading-action">
        {related.map((p) => (
          <Link key={p.slug} href={'/practice/' + p.slug}>
            {p.title} →
          </Link>
        ))}
      </div>
    </section>
  );
}
