import { z } from 'zod';
import { safeUrl } from './validation';

export const channels = {
  insights: {
    name: '前线观察',
    en: 'INSIGHTS',
    description: '观察产业变化，寻找企业 AI 转型的真实问题。',
  },
  features: {
    name: '深度',
    en: 'IN DEPTH',
    description: '走进技术、组织与商业的交汇处，理解变化背后的逻辑。',
  },
  cases: {
    name: '企业案例',
    en: 'IN PRACTICE',
    description: '深入真实业务场景，记录企业 AI 转型的方法、挑战与价值。',
  },
  research: {
    name: '产业研究',
    en: 'RESEARCH',
    description: '用系统研究与可验证的方法，理解企业 AI 的下一步。',
  },
  people: {
    name: '人物',
    en: 'PEOPLE',
    description: '记录企业 AI 负责人、技术专家与一线实践者的思考。',
  },
  events: { name: '活动', en: 'EVENTS', description: '在沙龙、研讨与交流中，让产业经验流动起来。' },
} as const;
export type Channel = keyof typeof channels;
export function isChannel(value: string): value is Channel {
  return Object.hasOwn(channels, value);
}
export const statusNames = {
  draft: '草稿',
  review: '待审核',
  published: '已发布',
  scheduled: '定时发布',
  archived: '已归档',
};
export const authenticityNames = {
  example: '示例内容',
  editorial: '编辑观点',
  sourced: '来源整理',
  verified: '已核实',
  anonymous: '匿名案例',
};
export const slugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9][a-z0-9-]{1,99}$/, 'Slug 使用 2–100 位小写字母、数字和短横线');
const short = z.string().trim().max(200).default('');
const text = z.string().trim().max(6000).default('');
const optionalDate = z.union([z.iso.datetime({ offset: true }), z.literal('')]).optional();
export const detailsSchema = z.object({
  company: short,
  industry: short,
  department: short,
  scenario: short,
  technology: short,
  transformation_level: short,
  stage: short,
  background: text,
  problem: text,
  solution: text,
  architecture: text,
  implementation: text,
  collaboration: text,
  investment: text,
  results: text,
  lessons: text,
  materials: text,
  research_type: z.enum(['article', 'report', 'series']).default('article'),
  team: short,
  person_name: short,
  person_title: short,
  event_start: optionalDate,
  event_end: optionalDate,
  location: short,
  event_state: z.enum(['open', 'closed', 'cancelled']).default('closed'),
  capacity: z.number().int().min(0).max(100000).default(0),
});
export const postSchema = z
  .object({
    id: z.uuid().optional(),
    revision: z.number().int().positive().optional(),
    slug: slugSchema,
    channel: z.enum(['insights', 'features', 'cases', 'research', 'people', 'events']),
    title: z.string().trim().min(3).max(160),
    subtitle: short,
    summary: z.string().trim().max(600).default(''),
    body: z.string().max(80000).default(''),
    category: slugSchema.nullable().default(null),
    tags: z.array(slugSchema).max(16).default([]),
    author_id: z.uuid().nullable().default(null),
    status: z.enum(['draft', 'review', 'published', 'scheduled', 'archived']).default('draft'),
    authenticity: z
      .enum(['example', 'editorial', 'sourced', 'verified', 'anonymous'])
      .default('example'),
    source_name: short,
    source_url: safeUrl.default(''),
    verification_note: z.string().trim().max(4000).default(''),
    sponsored: z.boolean().default(false),
    cover_id: z.uuid().nullable().default(null),
    cover_alt: short,
    cover_caption: z.string().max(1000).default(''),
    cover_style: z
      .enum(['grid', 'layers', 'circuit', 'field', 'report', 'portrait'])
      .default('grid'),
    seo_title: z.string().trim().max(120).default(''),
    seo_description: z.string().trim().max(300).default(''),
    details: detailsSchema.default(() => detailsSchema.parse({})),
    report_id: z.uuid().nullable().default(null),
    download_access: z.enum(['none', 'public', 'request']).default('none'),
    home_rank: z.number().int().min(0).max(100).default(0),
    featured: z.boolean().default(false),
    breaking: z.boolean().default(false),
    published_at: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (['published', 'scheduled'].includes(v.status)) {
      if (
        !v.author_id ||
        !v.category ||
        !v.published_at ||
        v.body.trim().length < 80 ||
        v.summary.length < 20
      )
        issue('发布前请填写作者、栏目、发布时间、摘要（至少20字）与完整正文（至少80字）');
      if (v.cover_id && !v.cover_alt) issue('封面需要图片说明（Alt）');
      if (v.authenticity !== 'example' && !v.source_name) issue('非示例内容必须说明来源');
      if (
        ['sourced', 'verified', 'anonymous'].includes(v.authenticity) &&
        v.verification_note.length < 20
      )
        issue('核实或匿名内容必须保留至少20字的内部核验依据');
      if (
        v.channel === 'cases' &&
        (!v.details.industry || !v.details.scenario || !v.details.company)
      )
        issue('案例发布需要企业名称（可匿名）、行业和应用场景');
      if (v.channel === 'cases' && v.authenticity === 'editorial')
        issue('企业案例请选择示例、已核实或匿名状态');
      if (
        v.channel === 'events' &&
        (!v.details.event_start || !v.details.event_end || !v.details.location)
      )
        issue('活动发布需要开始时间、结束时间与地点');
    }
    if (
      v.details.event_start &&
      v.details.event_end &&
      v.details.event_start >= v.details.event_end
    )
      issue('活动结束时间必须晚于开始时间');
    if (v.channel !== 'research' && (v.report_id || v.download_access !== 'none'))
      issue('报告仅可关联产业研究内容');
    if (v.download_access !== 'none' && !v.report_id) issue('请先上传报告 PDF');
  });
export type PostInput = z.infer<typeof postSchema>;
export type MediaPost = Omit<PostInput, 'id' | 'revision'> & {
  id: string;
  revision: number;
  owner_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  author_name?: string;
  author_slug?: string;
  author_bio?: string;
  category_name?: string;
  views?: number;
  observed_at?: string;
};
export type PublicPost = Omit<MediaPost, 'verification_note' | 'owner_id' | 'deleted_at'>;
export type Author = {
  id: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  user_id: string | null;
  is_example: boolean;
};
export type Taxonomy = { slug: string; name: string; description: string };
export type Topic = { slug: string; title: string; description: string; published: boolean };
export function postPath(post: Pick<MediaPost, 'channel' | 'slug'>) {
  return `${['cases', 'research', 'events'].includes(post.channel) ? '/' + post.channel : '/articles'}/${post.slug}`;
}
export const PRIVACY_VERSION = '2026-10-media-v1';
export const inquirySchema = z
  .object({
    kind: z.enum(['enterprise', 'expert', 'cooperation', 'report', 'event']),
    post_id: z.uuid().nullable().default(null),
    name: z.string().trim().min(2).max(80),
    contact: z.string().trim().min(5).max(200),
    organization: z.string().trim().max(200).default(''),
    industry: short,
    scenario: short,
    problem: z.string().trim().max(6000).default(''),
    budget: short,
    timeline: short,
    expertise: short,
    experience: text,
    representative_cases: text,
    cooperation_type: short,
    notes: text,
    consent: z.literal(true, { error: '请阅读并同意隐私告知' }),
  })
  .superRefine((v, ctx) => {
    const issue = (message: string) => ctx.addIssue({ code: 'custom', message });
    if (
      v.kind === 'enterprise' &&
      (!v.organization ||
        !v.industry ||
        !v.scenario ||
        v.problem.length < 10 ||
        !v.budget ||
        !v.timeline)
    )
      issue('请完整填写企业、行业、场景、问题、预算和期望周期');
    if (v.kind === 'expert' && (!v.expertise || !v.experience || !v.representative_cases))
      issue('请填写专业领域、行业经验与代表案例');
    if (v.kind === 'cooperation' && (!v.cooperation_type || !v.organization || v.notes.length < 10))
      issue('请填写合作类型、机构与合作需求');
    if (['event', 'report'].includes(v.kind) && !v.post_id) issue('请选择相关活动或报告');
  });
export type Inquiry = z.infer<typeof inquirySchema> & {
  id: string;
  payload: z.infer<typeof inquirySchema>;
  status: string;
  note: string;
  created_at: string;
  post_title?: string;
};
