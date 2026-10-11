import { z } from 'zod';
export class AppError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const safeUrl = z
  .string()
  .trim()
  .max(1000)
  .refine((v) => {
    if (v === '') return true;
    try {
      const u = new URL(v);
      return u.protocol === 'https:' && !u.username && !u.password;
    } catch {
      return false;
    }
  }, '请填写有效的 HTTPS 链接');
export function githubRepo(url: string) {
  const match = url
    .trim()
    .match(/^https:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+?)(?:\.git)?\/?$/);
  if (!match || match[1] === '.' || match[1] === '..' || match[2] === '.' || match[2] === '..')
    throw new AppError('请填写 https://github.com/作者/仓库 格式的公开仓库链接');
  return `${match[1]}/${match[2]}`;
}
export const submissionSchema = z
  .object({
    kind: z.enum(['project', 'skill', 'scenario', 'requirement']),
    title: z.string().trim().min(3, '标题至少 3 个字').max(100),
    summary: z.string().trim().min(15, '请至少填写 15 个字的介绍').max(4000),
    category: z.string().trim().min(1).max(80),
    sourceUrl: safeUrl.default(''),
    license: z.string().max(100).default(''),
    sourceAuthor: z.string().max(100).default(''),
    tags: z.array(z.string().trim().min(1).max(30)).max(8).default([]),
    contact: z.string().max(200).default(''),
    existingResourceId: z.uuid().optional(),
    publicConsent: z.boolean().default(false),
    honeypot: z.string().max(0, '提交未通过校验').default(''),
  })
  .superRefine((v, c) => {
    if (v.kind === 'project') {
      try {
        githubRepo(v.sourceUrl);
      } catch {
        c.addIssue({
          code: 'custom',
          path: ['sourceUrl'],
          message: '项目必须提供有效的 GitHub 仓库地址',
        });
      }
    }
    if (v.kind === 'skill' && !v.sourceUrl)
      c.addIssue({ code: 'custom', path: ['sourceUrl'], message: 'Skill 必须提供来源链接' });
    if (v.kind === 'requirement' && !v.contact)
      c.addIssue({ code: 'custom', path: ['contact'], message: '请填写联系信息，以便私下跟进' });
  });
export const profileSchema = z.object({
  name: z.string().trim().min(2).max(60),
  bio: z.string().max(1000),
  tags: z.array(z.string().trim().min(1).max(30)).max(10),
  contact: z.string().max(200),
  contact_public: z.boolean(),
  public: z.boolean(),
  availability: z.string().max(200),
  portfolio: z
    .array(z.object({ title: z.string().min(2).max(100), url: safeUrl.refine(Boolean) }))
    .max(8),
});
export const metadataSchema = z.object({
  stars: z.number().int().min(0).optional(),
  language: z.string().max(100).optional(),
  repo: z.string().max(200).optional(),
  defaultBranch: z.string().max(200).optional(),
  checkedAt: z.string().max(100).optional(),
  pushedAt: z.string().max(100).optional(),
  licenseUrl: safeUrl.optional(),
  licenseNote: z.string().max(1000).optional(),
  archived: z.boolean().optional(),
  readme: z.string().max(100000).optional(),
  version: z.string().max(100).optional(),
  platforms: z.array(z.string().max(100)).max(20).optional(),
  dependencies: z.array(z.string().max(200)).max(20).optional(),
  install: z.string().max(10000).optional(),
  configuration: z.string().max(10000).optional(),
  example: z.string().max(10000).optional(),
  industry: z.string().max(100).optional(),
  size: z.string().max(200).optional(),
  difficulty: z.string().max(100).optional(),
  pain: z.string().max(10000).optional(),
  workflow: z.array(z.string().max(1000)).max(20).optional(),
  solution: z.string().max(10000).optional(),
  metrics: z.array(z.string().max(1000)).max(20).optional(),
  demoUrl: safeUrl.optional(),
  docsUrl: safeUrl.optional(),
  architecture: z.array(z.string().max(1000)).max(20).optional(),
  input: z.string().max(5000).optional(),
  output: z.string().max(10000).optional(),
  state: z.enum(['open', 'in_progress', 'completed']).optional(),
  deadline: z.string().max(100).optional(),
  deliverables: z.array(z.string().max(1000)).max(20).optional(),
  issueUrl: safeUrl.optional(),
  relatedSlugs: z
    .array(z.string().regex(/^[a-z0-9-]+$/))
    .max(30)
    .optional(),
  articleFile: z
    .string()
    .regex(/^[a-z0-9-]+\.mdx$/)
    .optional(),
});
export const resourceSchema = z.object({
  id: z.uuid().optional(),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,99}$/),
  kind: z.enum(['project', 'skill', 'scenario', 'demo', 'task', 'article']),
  title: z.string().min(2).max(100),
  summary: z.string().min(10).max(4000),
  category: z.string().min(1).max(100),
  tags: z.array(z.string().max(30)).max(12),
  body: z.string().max(40000),
  source_url: safeUrl,
  source_author: z.string().max(150),
  license: z.string().max(150),
  provenance: z.enum(['external', 'editorial', 'demo', 'community']),
  status: z.enum(['draft', 'published', 'archived']),
  featured: z.boolean(),
  metadata: metadataSchema,
});
export function assertPr(url: string) {
  if (!/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/[1-9]\d*$/.test(url))
    throw new AppError('请填写有效的 GitHub Pull Request 链接');
}
export const isModerator = (role: string) => ['moderator', 'admin'].includes(role);
