import toc from './book-toc.json';

// This is the shared editorial configuration. Never put credentials here.
export const book = {
  enabled: true,
  title: 'FDE前线部署工程师',
  subtitle: '企业AI转型与智能体工程化交付',
  author: '邴越',
  publisher: '清华大学出版社',
  isbn: '9787302729556',
  publishedAt: '2026-11-01',
  coverImage: '/marketing/book-cover.png',
  tagline: '从业务发现到生产交付，系统掌握企业AI的FDE实战方法。',
  introduction:
    '本书系统覆盖FDE能力模型、业务调研、场景抽象、企业本体建模、PoC验证、RAG知识工程、Agent工程化、评测治理与生产交付，并结合制造业、电商营销与跨境出海等行业实践，帮助读者建立从AI技术学习到企业价值交付的完整能力体系。',
  salesMilestone: '正式出版 · 销量已突破 2,000 册',
  salesNote: '作者提供，截至 2026 年 11 月 19 日',
  officialUrl: 'https://www.tup.com.cn/booksCenter/book_11842501.html',
  tocUrl: 'https://www.tup.com.cn/booksCenter/bookcatalog?id=11842501',
  purchaseLinks: [
    { label: '京东正版购买', url: 'https://item.jd.com/10239039021503.html' },
    { label: '天猫正版购买', url: 'https://detail.tmall.com/item.htm?id=1097057663551' },
  ],
  toc,
  awesomeFDEUrl: 'https://github.com/fdeopen/awesome-fde',
  readerCommunityUrl: '/membership',
  recommendations: [] as { name: string; role: string; quote: string }[],
};

export const founder = {
  name: '邴越',
  portrait: '/marketing/bingyue-portrait.png',
  roles: [
    'FDE前线主理人',
    'FDE中国社区发起人',
    'AI创业者与企业AI转型顾问',
    '《FDE前线部署工程师》作者',
  ],
  biography:
    '拥有十二年互联网研发、技术管理及企业数智化实践经验，长期关注企业AI转型、智能体工程化交付、制造业AI、跨境电商与营销增长。',
};

export type MembershipConfig = {
  enabled: boolean;
  mode: 'preview' | 'live';
  name: string;
  subtitle: string;
  description: string;
  price: number | null;
  currency: 'CNY';
  duration: number;
  benefitsConfirmed: boolean;
  benefits: { title: string; description: string }[];
  purchaseUrl: string;
  purchaseQRCode: string;
  memberAccessUrl: string;
  refundPolicy: string;
  invoicePolicy: string;
  supportContact: string;
  contentPreviews: {
    title: string;
    description: string;
    url: string;
    access: 'public' | 'member';
    confirmed: boolean;
  }[];
  activityPhotos: { src: string; caption: string; authorized: boolean }[];
  faq: { question: string; answer: string }[];
};

export const membership: MembershipConfig = {
  enabled: true,
  mode: 'preview', // User-approved mock. A live product requires all confirmed purchase fields.
  name: 'FDE前线·企业AI实战社群',
  subtitle: 'FDE China Pro',
  description:
    '连接AI工程师、FDE实践者、企业AI负责人、创业者与行业专家，持续分享企业AI实战案例、工程交付方法、技术实践与产业机会。',
  price: null,
  currency: 'CNY',
  duration: 365,
  benefitsConfirmed: false,
  purchaseUrl: '',
  purchaseQRCode: '',
  memberAccessUrl: '',
  refundPolicy: '',
  invoicePolicy: '',
  supportContact: '',
  benefits: [
    {
      title: '企业AI深度案例',
      description:
        '围绕制造业、跨境电商、外贸、零售、营销增长与企业知识工程，拆解场景、过程和交付边界。',
    },
    {
      title: 'FDE交付工具箱',
      description:
        '进阶业务调研、场景分析、企业本体、PoC、技术选型、项目报价、ROI测算及评测验收资料。',
    },
    {
      title: 'AI工程技术实践',
      description: '关注Agent、RAG、MCP、Skill、Harness、多智能体、数据治理和生产级AI工程。',
    },
    {
      title: '会员专题交流',
      description:
        '线上专题分享、企业案例拆解、技术实践讨论与会员交流。具体频次以正式服务规则为准。',
    },
    {
      title: '会员专属交流群',
      description: '连接FDE工程师、AI创业者、企业负责人及行业实践者，共同讨论一线问题。',
    },
    {
      title: '人才与项目机会',
      description:
        '分享社区获得的真实岗位、企业AI项目需求及产业合作信息。不承诺就业、项目成交或收入。',
    },
    {
      title: '会员专属优惠',
      description: '指定课程、实战训练营、线下活动及工作坊的会员优惠，适用范围以活动规则为准。',
    },
  ],
  contentPreviews: [
    {
      title: '报价核验实践',
      description: '从输入清单到人工复核，体验一条可验证的交付路径。',
      url: '/practice/quotation-check',
      access: 'public',
      confirmed: true,
    },
    {
      title: '企业知识库评测',
      description: '用问题集、引用核验与验收表理解知识工程。',
      url: '/practice/knowledge-eval',
      access: 'public',
      confirmed: true,
    },
    {
      title: '营销内容审核',
      description: '把生成、审核与发布责任连成可复用流程。',
      url: '/practice/marketing-review',
      access: 'public',
      confirmed: true,
    },
  ],
  activityPhotos: [],
  faq: [
    {
      question: '开放社区、图书与实战社群有什么区别？',
      answer:
        '开放社区和Awesome-FDE提供免费开源资源；图书是独立出版物；实战社群是筹备中的年度会员服务，三者不捆绑购买。',
    },
    {
      question: '需要先注册FDE前线账号吗？',
      answer:
        '不需要。正式开放后可直接通过知识星球邀请链接或二维码购买，订单和会员资格以实际支付平台记录为准。',
    },
    {
      question: '能保证找到工作、接到项目吗？',
      answer: '不能。社群提供交流、信息与学习机会，不承诺就业结果、项目成交或收入。',
    },
    {
      question: '公开开源资料会变成付费内容吗？',
      answer: '不会。Awesome-FDE与网站公开实践资料继续免费开放，不作为会员独占内容。',
    },
  ],
};

export function purchaseReady(config: MembershipConfig = membership) {
  return (
    config.enabled &&
    config.mode === 'live' &&
    config.benefitsConfirmed &&
    config.price !== null &&
    Number.isFinite(config.price) &&
    config.price > 0 &&
    Number.isInteger(config.duration) &&
    config.duration > 0 &&
    safeHttps(config.purchaseUrl) &&
    safeHttps(config.memberAccessUrl) &&
    !!config.refundPolicy.trim() &&
    !!config.invoicePolicy.trim() &&
    !!config.supportContact.trim()
  );
}
export function safeHttps(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password;
  } catch {
    return false;
  }
}
export const awesome = {
  enabled: true,
  featured: true,
  name: 'Awesome-FDE',
  description: '企业AI交付开放指南 ·《FDE前线部署工程师》作者配套开源项目',
  repositoryUrl: 'https://github.com/fdeopen/awesome-fde',
  documentationUrl: 'https://github.com/fdeopen/awesome-fde#readme',
  bookUrl: '/book',
  contributionUrl: 'https://github.com/fdeopen/awesome-fde/issues',
  errataUrl:
    'https://github.com/fdeopen/awesome-fde/issues/new?title=%E5%9B%BE%E4%B9%A6%E5%8B%98%E8%AF%AF',
};
export const ecosystem = [
  {
    name: 'FDE中国社区',
    url: 'https://fdechina.ai/',
    description: '实践者社区、人才网络与企业AI服务生态',
  },
  { name: 'FDE图书', url: '/book', description: '从业务发现到生产交付的系统方法' },
  {
    name: 'Awesome-FDE',
    url: awesome.repositoryUrl,
    description: '免费开放的企业AI交付指南与学习资料',
  },
  {
    name: 'FDE前线实战社群',
    url: '/membership',
    description: purchaseReady()
      ? 'FDE中国社区组织的年度会员服务'
      : 'FDE中国社区组织的年度会员服务 · 方案预览',
  },
  { name: '51FDE人才成长', url: 'https://51fde.net/', description: 'FDE人才培养与职业成长平台' },
  { name: '企业AI服务', url: '/enterprise', description: '围绕业务问题，连接诊断与工程交付' },
  { name: '商务合作', url: '/contribute', description: '内容、研究与产业合作' },
];
export type PromoKind = 'book' | 'community' | 'awesome';
export type Placement =
  | 'home-feature'
  | 'home-sidebar'
  | 'home-bottom'
  | 'article-bottom'
  | 'article-sidebar'
  | 'resource-bottom'
  | 'resource-sidebar'
  | 'book-page'
  | 'membership-page'
  | 'community-feature'
  | 'projects-feature'
  | 'header'
  | 'mobile-bar';
export const placements: Record<
  Placement,
  { enabled: boolean; format: 'feature' | 'card' | 'inline'; order: PromoKind[] }
> = {
  'home-feature': { enabled: true, format: 'feature', order: ['book'] },
  'home-sidebar': { enabled: true, format: 'card', order: ['community'] },
  'home-bottom': { enabled: true, format: 'feature', order: ['community'] },
  'article-bottom': { enabled: true, format: 'inline', order: ['book', 'community'] },
  'article-sidebar': { enabled: true, format: 'card', order: ['book', 'awesome', 'community'] },
  'resource-bottom': { enabled: true, format: 'inline', order: ['awesome', 'community', 'book'] },
  'resource-sidebar': { enabled: true, format: 'card', order: ['awesome', 'book', 'community'] },
  'book-page': { enabled: true, format: 'feature', order: ['book', 'awesome', 'community'] },
  'membership-page': { enabled: true, format: 'feature', order: ['community', 'book', 'awesome'] },
  'community-feature': { enabled: true, format: 'feature', order: ['awesome'] },
  'projects-feature': { enabled: true, format: 'feature', order: ['awesome'] },
  header: { enabled: true, format: 'inline', order: ['book', 'community'] },
  'mobile-bar': { enabled: true, format: 'inline', order: ['community'] },
};
export function promotionOrder(
  contentType: string,
  title = '',
  placement: Placement = 'article-bottom',
): PromoKind[] {
  if (contentType === 'cases') return ['community', 'book'];
  if (/职业|成长|人才|转型FDE/.test(title)) return ['book', 'community'];
  if (['project', 'skill'].includes(contentType) || /RAG|MCP|Skill|Agent|智能体工程/i.test(title))
    return ['awesome', 'community', 'book'];
  return placements[placement].order;
}
