import Image from 'next/image';
import Link from 'next/link';
import {
  book,
  membership,
  founder,
  awesome,
  ecosystem,
  placements,
  promotionOrder,
  purchaseReady,
  type Placement,
} from '@/lib/marketing/config';
import type { MarketingContext } from '@/lib/marketing/events';
import { PromoView, TrackedLink } from './tracking';
import { PurchaseActions, PurchaseQRCode, type PurchaseOptions } from './purchase';

export const purchaseOptions: PurchaseOptions = {
  ready: purchaseReady(),
  purchaseUrl: purchaseReady() ? membership.purchaseUrl : '',
  qr:
    purchaseReady() &&
    /^\/marketing\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp)$/.test(membership.purchaseQRCode)
      ? membership.purchaseQRCode
      : '',
  memberAccessUrl: purchaseReady() ? membership.memberAccessUrl : '',
};
type PromoProps = { context?: MarketingContext; compact?: boolean };
function presentation(context: MarketingContext, compact: boolean) {
  const policy = placements[context.placement as Placement];
  return {
    enabled: policy?.enabled !== false,
    className: `${compact || policy?.format === 'card' ? 'compact' : ''} promo-format-${policy?.format || 'inline'}`,
  };
}
export function BookFeatureBanner({ detail = false }: { detail?: boolean }) {
  const placement = detail ? 'book-page' : 'home-feature';
  if (!book.enabled || !placements[placement].enabled) return null;
  const context = { placement, contentType: detail ? 'book' : 'home' };
  const Heading = detail ? 'h1' : 'h2';
  return (
    <PromoView
      event="book_banner_view"
      context={context}
      className={`book-feature ${detail ? 'book-hero' : ''}`}
    >
      <div className="book-cover-stage">
        <Image
          src={book.coverImage}
          alt={`《${book.title}：${book.subtitle}》正版图书封面`}
          width={440}
          height={560}
          sizes={detail ? '(max-width: 767px) 230px, 340px' : '(max-width: 767px) 160px, 210px'}
          preload={detail}
        />
      </div>
      <div className="book-feature-copy">
        <span className="marketing-eyebrow">
          FDE前线 · 专业出版 <span>FEATURED PUBLICATION</span>
        </span>
        <Heading>
          {book.title}
          <span>{book.subtitle}</span>
        </Heading>
        <p className="book-byline">
          {book.author} 著 <span> / </span> {book.publisher}
        </p>
        <strong className="book-tagline">{book.tagline}</strong>
        <p>{book.introduction}</p>
        <div className="book-milestone">
          {book.salesMilestone}
          <small>{book.salesNote}</small>
        </div>
        <div className="marketing-actions">
          {!detail && (
            <TrackedLink
              className="marketing-button"
              href="/book"
              event="book_detail_click"
              context={context}
            >
              了解图书 →
            </TrackedLink>
          )}
          <TrackedLink
            className={detail ? 'marketing-button' : 'marketing-button secondary'}
            href={book.purchaseLinks[0].url}
            event="book_purchase_click"
            context={context}
          >
            正版购买 ↗
          </TrackedLink>
          <TrackedLink
            className="marketing-text-link"
            href={book.awesomeFDEUrl}
            event="book_companion_click"
            context={context}
          >
            {detail ? '获取配套学习资料' : '配套开源资源'} ↗
          </TrackedLink>
          {detail && membership.enabled && (
            <TrackedLink
              className="marketing-text-link"
              href={book.readerCommunityUrl}
              event="community_detail_click"
              context={context}
            >
              作者实战社群 →
            </TrackedLink>
          )}
        </div>
        {detail && (
          <small className="book-publication">
            2026 年 11 月出版 · ISBN {book.isbn} ·{' '}
            <a href={book.officialUrl} target="_blank" rel="noopener noreferrer">
              出版社书页 ↗
            </a>
          </small>
        )}
      </div>
    </PromoView>
  );
}
export function BookPromoCard({
  context = { placement: 'article-bottom' },
  compact = false,
}: PromoProps) {
  const display = presentation(context, compact);
  if (!book.enabled || !display.enabled) return null;
  return (
    <PromoView
      event="book_banner_view"
      context={context}
      className={`promo-card book-promo ${display.className}`}
    >
      <span className="promo-disclosure">图书推广 · 专业出版</span>
      <div className="book-promo-inner">
        <Image
          src={book.coverImage}
          alt={book.title + '图书封面'}
          width={110}
          height={140}
          sizes="110px"
        />
        <div>
          <h3>想系统掌握企业AI工程化交付？</h3>
          <p>推荐阅读《{book.title}》</p>
          <small>
            {book.author} 著 · {book.publisher}
          </small>
        </div>
      </div>
      <TrackedLink
        className="marketing-text-link"
        event="book_detail_click"
        context={context}
        href="/book"
      >
        了解图书与配套资源 →
      </TrackedLink>
    </PromoView>
  );
}
export function CommunityPromoCard({
  context = { placement: 'home-sidebar' },
  compact = false,
}: PromoProps) {
  const display = presentation(context, compact);
  if (!membership.enabled || !display.enabled) return null;
  return (
    <PromoView
      event="community_card_view"
      context={context}
      className={`promo-card community-promo ${display.className}`}
    >
      <span className="promo-disclosure">会员服务推广 · FDE CHINA PRO</span>
      <h3>{compact ? 'FDE前线实战社群' : '从阅读到实践，与FDE同行。'}</h3>
      <p>
        {compact
          ? '企业AI案例 · 工程实践 · 专业人脉 · 产业机会'
          : '从理解企业AI，到真正完成企业AI交付。连接关注企业AI落地、智能体工程化与产业价值的实践者。'}
      </p>
      <strong>
        {purchaseOptions.ready
          ? `¥${membership.price} / 年 · ${membership.duration}天`
          : '年度实战会员 · 方案预览'}
      </strong>
      <div className="marketing-actions">
        <TrackedLink
          className="marketing-button"
          href="/membership"
          event="community_detail_click"
          context={context}
        >
          查看会员权益 →
        </TrackedLink>
        {purchaseOptions.ready && (
          <PurchaseActions options={purchaseOptions} context={context} compact />
        )}
      </div>
      {!purchaseOptions.ready && <small>尚未开放购买，正式权益以开放时公布的规则为准。</small>}
      {!compact && (
        <a
          className="marketing-text-link"
          href="https://fdechina.ai/"
          target="_blank"
          rel="noopener noreferrer"
        >
          探索FDE中国社区 ↗
        </a>
      )}
    </PromoView>
  );
}
export function AwesomeFDECard({
  context = { placement: 'community-feature' },
  compact = false,
}: PromoProps) {
  const display = presentation(context, compact);
  if (!awesome.enabled || !display.enabled) return null;
  return (
    <section className={`promo-card awesome-promo ${display.className}`}>
      <span className="marketing-eyebrow">免费开放 · 旗舰开源项目</span>
      <h3>
        Awesome-FDE<span>企业AI交付开放指南</span>
      </h3>
      <p>{awesome.description}。面向所有工程师与企业AI实践者开放。</p>
      {!compact && (
        <ul className="awesome-topics">
          {[
            '系统学习路线',
            '交付方法与模板',
            '企业AI案例',
            'Agent / RAG / MCP / Skill',
            '精选开源框架',
            '社区共创资源',
          ].map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      )}
      <div className="marketing-actions">
        <TrackedLink
          className="marketing-button secondary"
          href={awesome.repositoryUrl}
          event="awesome_fde_click"
          context={context}
        >
          查看 GitHub ↗
        </TrackedLink>
        <TrackedLink
          className="marketing-text-link"
          href={awesome.documentationUrl}
          event="book_companion_click"
          context={context}
        >
          图书配套资源 ↗
        </TrackedLink>
      </div>
      {!compact && (
        <div className="marketing-inline-links">
          <a href={awesome.contributionUrl} target="_blank" rel="noopener noreferrer">
            参与开源共创 ↗
          </a>
          <a href={awesome.errataUrl} target="_blank" rel="noopener noreferrer">
            提交图书勘误 ↗
          </a>
          <a href="https://fdechina.ai/" target="_blank" rel="noopener noreferrer">
            FDE中国社区 ↗
          </a>
        </div>
      )}
    </section>
  );
}
export function FounderProfile() {
  return (
    <section id="founder" className="founder-profile" aria-label="发起人邴越">
      <Image
        src={founder.portrait}
        alt="FDE前线发起人邴越"
        width={240}
        height={320}
        sizes="(max-width: 767px) 140px, 200px"
      />
      <div>
        <span className="marketing-eyebrow">FOUNDER · 在一线，连接业务与技术</span>
        <h2>{founder.name}</h2>
        <p>{founder.biography}</p>
        <ul>
          {founder.roles.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}
export function EcosystemLinks({ footer = false }: { footer?: boolean }) {
  return (
    <div className={footer ? 'footer-ecosystem' : 'marketing-ecosystem'}>
      {footer && <strong>FDE生态</strong>}
      {ecosystem
        .filter(
          (x) =>
            (x.url !== '/book' || book.enabled) && (x.url !== '/membership' || membership.enabled),
        )
        .map((x) => (
          <Link
            key={x.name}
            href={x.url}
            target={x.url.startsWith('https:') ? '_blank' : undefined}
            rel={x.url.startsWith('https:') ? 'noopener noreferrer' : undefined}
          >
            {footer ? (
              x.name
            ) : (
              <>
                <strong>{x.name} ↗</strong>
                <p>{x.description}</p>
              </>
            )}
          </Link>
        ))}
    </div>
  );
}
export function MembershipPurchaseCard() {
  return (
    <section id="purchase" className="membership-purchase-card" aria-label="年度会员方案">
      <span className="marketing-eyebrow">FDE CHINA PRO</span>
      <h2>企业AI年度实战会员</h2>
      {purchaseOptions.ready ? (
        <div className="membership-price">
          ¥{membership.price}
          <small>/ {membership.duration}天</small>
        </div>
      ) : (
        <div className="membership-price preview">
          方案预览<small>mock · 尚未开售</small>
        </div>
      )}
      <p>知识星球内容 · 会员交流 · 专题实践</p>
      <ul>
        <li>围绕真实企业AI场景持续学习</li>
        <li>与工程师、创业者和企业负责人交流</li>
        <li>图书与公开开源资料可独立获取</li>
      </ul>
      {purchaseOptions.ready && (
        <PurchaseQRCode
          src={purchaseOptions.qr}
          context={{ placement: 'membership-page', contentType: 'membership' }}
        />
      )}
      <PurchaseActions
        options={purchaseOptions}
        context={{ placement: 'membership-page', contentType: 'membership' }}
      />
      <small>FDE中国社区负责会员运营。开放后通过知识星球购买，无需注册本站。</small>
    </section>
  );
}
export function MembershipBenefits() {
  return (
    <section className="marketing-section" id="benefits">
      <span className="marketing-eyebrow">PRACTICE TOGETHER</span>
      <h2>让每一次实践，都多一个支点</h2>
      <p>
        {membership.benefitsConfirmed
          ? '七项年度会员权益'
          : '七项拟定服务方向 · 当前为方案预览，正式权益与交付频次待公布。'}
      </p>
      <div className="benefits-grid">
        {membership.benefits.map((x, i) => (
          <article key={x.title}>
            <span>{String(i + 1).padStart(2, '0')}</span>
            <h3>{x.title}</h3>
            <p>{x.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
export function MembershipFAQ() {
  const pending = '尚未开放购买，正式规则将在开放前公布。';
  return (
    <section className="marketing-section membership-faq" id="faq">
      <h2>加入之前，你可能还想了解</h2>
      {[
        ...membership.faq,
        {
          question: '会员有效期与价格如何确认？',
          answer: purchaseOptions.ready
            ? `年度会员人民币${membership.price}元，有效期${membership.duration}天，起算规则以购买平台为准。`
            : pending,
        },
        { question: '退款与售后如何处理？', answer: membership.refundPolicy || pending },
        { question: '可以开具发票吗？', answer: membership.invoicePolicy || pending },
        {
          question: '如何联系会员服务？',
          answer:
            membership.supportContact ||
            '服务联系方式将在开放购买前公布；一般商务合作可通过本站「投稿 / 合作」提交。',
        },
      ].map((x) => (
        <details key={x.question}>
          <summary>{x.question}</summary>
          <p>{x.answer}</p>
        </details>
      ))}
    </section>
  );
}
export function ArticleConversionBlock({
  contentType,
  articleId,
  title = '',
  sidebar = false,
  resource = false,
}: {
  contentType: string;
  articleId: string;
  title?: string;
  sidebar?: boolean;
  resource?: boolean;
}) {
  const placement: Placement = resource
    ? sidebar
      ? 'resource-sidebar'
      : 'resource-bottom'
    : sidebar
      ? 'article-sidebar'
      : 'article-bottom';
  if (!placements[placement].enabled) return null;
  const context = { placement, contentType, articleId };
  const order = promotionOrder(contentType, title, placement);
  const types = [
    ...new Set([...order, 'book', 'community', ...(sidebar ? ['awesome' as const] : [])] as const),
  ];
  return (
    <section
      aria-label={sidebar ? '延伸资源与会员服务' : '延伸学习与服务推广'}
      className={`article-conversion ${sidebar ? 'sidebar-conversion' : 'bottom-conversion'}`}
    >
      {!sidebar && <span className="marketing-eyebrow">延伸学习与服务推广</span>}
      {types.map((kind) =>
        kind === 'book' ? (
          <BookPromoCard key={kind} context={context} compact={sidebar} />
        ) : kind === 'community' ? (
          <CommunityPromoCard key={kind} context={context} compact={sidebar} />
        ) : (
          <AwesomeFDECard key={kind} context={context} compact={sidebar} />
        ),
      )}
      {/职业|成长|人才/.test(title) && (
        <a
          href="https://51fde.net/"
          className="marketing-text-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          51FDE · 探索人才培养与职业成长 ↗
        </a>
      )}
    </section>
  );
}
