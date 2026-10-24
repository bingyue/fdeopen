import Link from 'next/link';
import { Compass, Code2, BookOpen } from 'lucide-react';
export function StartPaths() {
  return (
    <section className="start-paths" aria-labelledby="start-heading">
      <div className="start-heading">
        <span className="media-eyebrow">START HERE</span>
        <h2 id="start-heading">
          从你的<span className="start-highlight">目标</span>开始
        </h2>
        <p>
          FDE（Forward Deployed Engineer）深入业务一线，把 AI
          从演示推进到可验收、可持续运行的业务流程。
        </p>
      </div>
      <div className="path-grid">
        <Link href="/start#enterprise" data-tone="ink">
          <div className="path-card-meta">
            <span>01 / 企业负责人</span>
            <Compass size={21} aria-hidden="true" />
          </div>
          <h3>企业找方案 →</h3>
          <p>看同行案例，厘清数据与收益口径，形成一个可验证的试点。</p>
        </Link>
        <Link href="/start#builder" data-tone="teal">
          <div className="path-card-meta">
            <span>02 / 开发者</span>
            <Code2 size={21} aria-hidden="true" />
          </div>
          <h3>开发者做项目 →</h3>
          <p>选开源组件，跑通练习，带着可复现的结果参与共创。</p>
        </Link>
        <Link href="/start#learner">
          <div className="path-card-meta">
            <span>03 / 初次了解</span>
            <BookOpen size={21} aria-hidden="true" />
          </div>
          <h3>新人学 FDE →</h3>
          <p>先理解交付方法，再完成一次有输入、有结果的小实践。</p>
        </Link>
      </div>
    </section>
  );
}
