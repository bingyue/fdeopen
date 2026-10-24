import Link from 'next/link';
import { packs } from '@/lib/practice';
export const metadata = {
  title: '动手实践',
  description:
    '三份免费本地实践包：报价验收、知识助手评测、营销对照复盘。含合成输入、可运行脚本、预期输出和验收模板。',
  alternates: { canonical: '/practice' },
};
export default function Practice() {
  return (
    <div className="container page-space">
      <span className="media-eyebrow">LEARN BY DOING</span>
      <h1>把案例读成一次实践</h1>
      <p>
        免费、无需注册与密钥。Python 3.10+，标准库即可运行。数据均为合成，练习结果不代表企业实绩。
      </p>
      <div className="path-grid">
        {packs.map((p) => (
          <Link key={p.slug} href={'/practice/' + p.slug}>
            <small>{p.duration} · 本地演练</small>
            <h2>{p.title} →</h2>
            <p>{p.summary}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
