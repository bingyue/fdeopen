export type Kind = 'project' | 'skill' | 'scenario' | 'demo' | 'task' | 'article';
export type Role = 'member' | 'maintainer' | 'moderator' | 'admin';
export type Meta = {
  stars?: number;
  language?: string;
  repo?: string;
  defaultBranch?: string;
  checkedAt?: string;
  pushedAt?: string;
  licenseUrl?: string;
  licenseNote?: string;
  archived?: boolean;
  readme?: string;
  version?: string;
  platforms?: string[];
  dependencies?: string[];
  install?: string;
  configuration?: string;
  example?: string;
  industry?: string;
  size?: string;
  difficulty?: string;
  pain?: string;
  workflow?: string[];
  solution?: string;
  metrics?: string[];
  demoUrl?: string;
  docsUrl?: string;
  architecture?: string[];
  input?: string;
  output?: string;
  state?: 'open' | 'in_progress' | 'completed';
  deadline?: string;
  deliverables?: string[];
  issueUrl?: string;
  relatedSlugs?: string[];
  articleFile?: string;
};
export type Resource = {
  id: string;
  slug: string;
  kind: Kind;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  body: string;
  metadata: Meta;
  source_url: string;
  source_author: string;
  license: string;
  provenance: 'external' | 'editorial' | 'demo' | 'community';
  status: 'draft' | 'published' | 'archived';
  featured: boolean;
  owner_id: string | null;
  created_at: string;
  updated_at: string;
  bookmark_count?: number;
  like_count?: number;
};
export type ResourceSummary = Omit<Resource, 'body' | 'metadata'> & {
  metadata: Pick<
    Meta,
    'stars' | 'language' | 'checkedAt' | 'version' | 'industry' | 'difficulty' | 'state'
  >;
};
export type Profile = {
  user_id: string;
  handle: string;
  name: string;
  bio: string;
  tags: string[];
  github_url: string;
  contact: string;
  contact_public: boolean;
  public: boolean;
  availability: string;
  portfolio: { title: string; url: string }[];
  is_demo: boolean;
};
export type User = Profile & { id: string; role: Role; disabled: boolean };
export type Submission = {
  id: string;
  user_id: string;
  kind: Kind | 'requirement';
  title: string;
  payload: Record<string, unknown>;
  status: string;
  review_note: string;
  resource_id: string | null;
  created_at: string;
};
export type Application = {
  id: string;
  task_id: string;
  user_id: string;
  message: string;
  pr_url: string;
  status: string;
  review_note: string;
  created_at: string;
  title?: string;
  name?: string;
};
export type Collection = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  theme: string;
  published: boolean;
};
export const kinds: Record<Kind, { label: string; path: string; en: string }> = {
  project: { label: '开源项目', path: '/projects', en: 'OpenHub' },
  skill: { label: 'Skills 市场', path: '/skills', en: 'SkillHub' },
  scenario: { label: '企业场景', path: '/scenarios', en: 'ScenarioHub' },
  demo: { label: '在线实验室', path: '/lab', en: 'FDE Lab' },
  task: { label: '开源共创', path: '/build', en: 'Build Together' },
  article: { label: '开放文档', path: '/docs', en: 'FDE Academy' },
};
export function resourcePath(r: Pick<Resource, 'kind' | 'slug'>) {
  return `${kinds[r.kind].path}/${r.slug}`;
}
