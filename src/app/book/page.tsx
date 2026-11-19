import Link from 'next/link';
import { notFound } from 'next/navigation';
import { book } from '@/lib/marketing/config';
import { marketingMetadata, bookStructuredData } from '@/lib/marketing/seo';
import {
  BookFeatureBanner,
  FounderProfile,
  AwesomeFDECard,
  CommunityPromoCard,
} from '@/components/marketing/promos';
import { TrackedLink } from '@/components/marketing/tracking';
import { mediaList } from '@/lib/media-service';
import { PostCard } from '@/components/media';

export const metadata = marketingMetadata('book');
export default async function BookPage() {
  if (!book.enabled) notFound();
  const related = await mediaList({ channel: 'cases', limit: 3 });
  return (
    <div className="media-container marketing-page book-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(bookStructuredData()).replace(/</g, '\\u003c'),
        }}
      />
      <div className="marketing-breadcrumb">
        <Link href="/">FDE前线</Link>
        <span>/</span>
        <span>专业出版</span>
      </div>
      <BookFeatureBanner detail />
      <nav className="marketing-anchor-nav" aria-label="图书专题目录">
        <a href="#value">阅读价值</a>
        <a href="#contents">正式目录</a>
        <a href="#author">认识作者</a>
        <a href="#companion">配套资源</a>
        <a href="#buy">正版购买</a>
      </nav>
      <section className="marketing-section" id="value">
        <span className="marketing-eyebrow">FROM DISCOVERY TO DELIVERY</span>
        <h2>把AI能力，变成企业真正可用的业务能力</h2>
        <div className="marketing-three-grid">
          {[
            [
              '从现场理解问题',
              '把业务访谈、流程观察与场景抽象连接起来，找到值得验证的企业AI机会。',
            ],
            [
              '用工程完成交付',
              '把PoC、知识工程、智能体、评测与治理贯穿起来，建立从原型到生产的完整视角。',
            ],
            ['让经验能够复用', '结合制造业、电商营销与出海实践，关注验收、组织采用和持续迭代。'],
          ].map(([title, description], i) => (
            <article key={title}>
              <span className="marketing-number">0{i + 1}</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="marketing-section book-audience">
        <h2>这本书，写给正在走向业务一线的你</h2>
        <div className="marketing-tags">
          {[
            '希望转型FDE的技术人员',
            'AI与智能体应用工程师',
            '架构师与工程交付负责人',
            '企业AI与数字化负责人',
            'AI创业者与行业实践者',
          ].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
      </section>
      <section className="marketing-section" id="contents">
        <span className="marketing-eyebrow">12 CHAPTERS · 一条完整的交付路径</span>
        <h2>从认知与成长，到工程与行业实践</h2>
        <p>
          第1—3章：职责、能力与组织成长；第4—6章：现场调研、场景与交付；第7—10章：原型、知识、智能体与治理；第11—12章：制造业、电商营销与出海。
        </p>
        <div className="book-toc">
          {book.toc.map((chapter, i) => (
            <details key={chapter.title} open={i === 0}>
              <summary>{chapter.title}</summary>
              <ul>
                {chapter.sections.map((section) => (
                  <li key={section}>{section}</li>
                ))}
              </ul>
            </details>
          ))}
        </div>
        <p className="marketing-source">
          目录依据
          <a href={book.tocUrl} target="_blank" rel="noopener noreferrer">
            清华大学出版社正式目录
          </a>
          整理，保留章节顺序与页码。结语：FDE是在现场中成长起来的 / 345。此处不公开图书正文。
        </p>
      </section>
      <div id="author">
        <FounderProfile />
      </div>
      {book.recommendations.length > 0 && (
        <section className="marketing-section">
          <h2>专家推荐</h2>
          {book.recommendations.map((x) => (
            <blockquote key={x.name}>
              <p>{x.quote}</p>
              <cite>
                {x.name} · {x.role}
              </cite>
            </blockquote>
          ))}
        </section>
      )}
      <section id="companion" className="marketing-section">
        <AwesomeFDECard context={{ placement: 'book-page', contentType: 'book' }} />
      </section>
      <section className="marketing-section">
        <h2>从阅读走向真实场景</h2>
        <p>以下为网站公开企业AI案例，可免费延伸阅读。</p>
        <div className="media-grid-three">
          {related.rows.map((post) => (
            <PostCard key={post.id} post={post} mode="tile" />
          ))}
        </div>
        <Link className="marketing-text-link" href="/cases">
          探索全部公开案例 →
        </Link>
      </section>
      <section className="marketing-section book-purchase" id="buy">
        <div>
          <span className="marketing-eyebrow">正版图书 · 独立购买</span>
          <h2>为下一次交付，建立系统方法</h2>
          <p>以下购书渠道来自出版社官网。实际售价、配送和售后以销售平台为准。</p>
        </div>
        <div className="marketing-actions">
          {book.purchaseLinks.map((x) => (
            <TrackedLink
              key={x.url}
              href={x.url}
              event="book_purchase_click"
              context={{ placement: 'book-page', contentType: 'book' }}
              className="marketing-button"
            >
              {x.label} ↗
            </TrackedLink>
          ))}
        </div>
      </section>
      <CommunityPromoCard context={{ placement: 'book-page', contentType: 'book' }} />
    </div>
  );
}
