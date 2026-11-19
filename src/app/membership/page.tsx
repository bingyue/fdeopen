import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { membership, placements } from '@/lib/marketing/config';
import { marketingMetadata, membershipStructuredData } from '@/lib/marketing/seo';
import {
  MembershipPurchaseCard,
  MembershipBenefits,
  MembershipFAQ,
  FounderProfile,
  AwesomeFDECard,
  BookPromoCard,
  purchaseOptions,
} from '@/components/marketing/promos';
import { MobilePurchaseBar, PurchaseActions } from '@/components/marketing/purchase';

export const metadata = marketingMetadata('membership');
export default function MembershipPage() {
  if (!membership.enabled) notFound();
  const photos = membership.activityPhotos.filter((x) => x.authorized);
  const previews = membership.contentPreviews.filter((x) => x.confirmed);
  return (
    <div className="media-container marketing-page membership-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(membershipStructuredData()).replace(/</g, '\\u003c'),
        }}
      />
      <div className="marketing-breadcrumb">
        <Link href="/">FDE前线</Link>
        <span>/</span>
        <span>企业AI实战社群</span>
      </div>
      <section className="membership-hero">
        <div>
          <span className="marketing-eyebrow">FDE CHINA PRO · 年度实战会员</span>
          <h1>
            与真正推动企业AI落地的人，<em>一起成长。</em>
          </h1>
          <p>
            {membership.name}，{membership.description}
          </p>
          <div className="marketing-actions">
            <a className="marketing-button" href="#benefits">
              了解七项服务方向 ↓
            </a>
            <Link className="marketing-text-link" href="/community">
              探索免费开放社区 →
            </Link>
          </div>
          <div className="membership-credibility">
            <span>发起人 · 邴越</span>
            <span>运营 · FDE中国社区</span>
            <span>内容与购买 · 知识星球</span>
          </div>
        </div>
        <MembershipPurchaseCard />
      </section>
      <MembershipBenefits />
      {previews.length > 0 && (
        <section className="marketing-section">
          <span className="marketing-eyebrow">先体验，再了解</span>
          <h2>从这些公开实践开始</h2>
          <p>以下是本站现有免费资源，帮助你了解我们的实践方向；并非付费会员独占内容。</p>
          <div className="marketing-three-grid">
            {previews.map((x) => (
              <Link className="content-preview" key={x.url} href={x.url}>
                <span>{x.access === 'public' ? '公开阅读 · 免费' : '已确认的会员内容预览'}</span>
                <h3>{x.title} ↗</h3>
                <p>{x.description}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
      <section className="marketing-section">
        <h2>为关注长期实践的人而建</h2>
        <div className="marketing-three-grid">
          {[
            ['工程师与FDE实践者', '希望从技术实现走向业务理解、工程交付与可复用方法。'],
            ['企业AI负责人', '需要讨论场景选择、试点验收、组织采用与工程治理。'],
            ['AI创业者与行业专家', '愿意分享经验，连接同行，理解真实产业需求。'],
          ].map(([title, desc]) => (
            <article key={title}>
              <h3>{title}</h3>
              <p>{desc}</p>
            </article>
          ))}
        </div>
        <p className="marketing-note">
          如果你只需要公开学习资料，免费开放社区与Awesome-FDE已经可以帮助你开始。社群不提供就业、收入或项目成交保证。
        </p>
      </section>
      <FounderProfile />
      <section className="marketing-section">
        <h2>一本书，一份开放指南，一群实践者</h2>
        <p>
          FDE前线连接内容与知识出版，FDE中国社区组织会员与产业交流，51FDE连接人才培养。按自己的需要选择学习路径。
        </p>
        <div className="marketing-two-grid">
          <BookPromoCard context={{ placement: 'membership-page', contentType: 'membership' }} />
          <AwesomeFDECard
            context={{ placement: 'membership-page', contentType: 'membership' }}
            compact
          />
        </div>
      </section>
      {photos.length > 0 && (
        <section className="marketing-section">
          <h2>社群活动现场</h2>
          <div className="marketing-three-grid">
            {photos.map((x) => (
              <figure key={x.src}>
                <Image
                  src={x.src}
                  alt={x.caption}
                  width={600}
                  height={400}
                  sizes="(max-width: 767px) 100vw, 33vw"
                />
                <figcaption>{x.caption}</figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
      <section className="marketing-section">
        <span className="marketing-eyebrow">HOW TO JOIN</span>
        <h2>{purchaseOptions.ready ? '购买之后，开始你的实践之旅' : '正式开放后的加入流程'}</h2>
        <ol className="membership-steps">
          <li>
            <strong>确认权益与购买</strong>
            <p>通过知识星球邀请链接或二维码，核对实际价格、服务与退款规则后付款。</p>
          </li>
          <li>
            <strong>进入会员内容</strong>
            <p>用购买时的账号进入知识星球，会员资格以平台记录为准。</p>
          </li>
          <li>
            <strong>查看入群与活动说明</strong>
            <p>按照星球置顶指引加入会员微信群，通过FDE前线小程序参与公布的活动。</p>
          </li>
        </ol>
      </section>
      <MembershipFAQ />
      <section className="membership-bottom">
        <div>
          <span className="marketing-eyebrow">GROW THROUGH PRACTICE</span>
          <h2>把下一次探索，变成一次共同实践</h2>
          <p>
            {purchaseOptions.ready
              ? `年度会员 ¥${membership.price} / ${membership.duration}天`
              : '方案预览中，价格与正式服务规则确认后开放。'}
          </p>
        </div>
        <PurchaseActions
          options={purchaseOptions}
          context={{ placement: 'membership-page', contentType: 'membership' }}
          compact
        />
      </section>
      {placements['mobile-bar'].enabled && <MobilePurchaseBar options={purchaseOptions} />}
    </div>
  );
}
