'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GitBranch as Github, ArrowRight, CheckCircle2, Download } from 'lucide-react';
import { Button } from './ui/button';
import { api, requestJson } from '@/lib/client-api';
import type { GithubMetadata } from '@/lib/github';
import type { User } from '@/lib/types';
export function LoginForm({
  demo,
  accessKeyRequired,
  error,
}: {
  demo: boolean;
  accessKeyRequired: boolean;
  error: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState(
    error ? 'GitHub 登录未完成，请重试并核对 OAuth 配置。' : '',
  );
  const [key, setKey] = useState('');
  const [busy, start] = useTransition();
  function login(role: string) {
    start(async () => {
      try {
        await api('demo-login', { role, accessKey: key });
        router.push('/dashboard');
        router.refresh();
      } catch (e) {
        setMessage((e as Error).message);
      }
    });
  }
  return (
    <div className="stack-form">
      {demo ? (
        <>
          {accessKeyRequired && (
            <label>
              演示访问口令
              <input
                type="password"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                autoComplete="off"
                required
              />
            </label>
          )}
          <Button disabled={busy} onClick={() => login('member')}>
            以示例开发者体验 <ArrowRight size={17} />
          </Button>
          <Button variant="secondary" disabled={busy} onClick={() => login('admin')}>
            以示例管理员体验
          </Button>
          <p className="login-note">
            本地演示身份，不会连接你的 GitHub 账号。
            <br />
            你可以测试收藏、投稿、审核与共创的完整流程。
          </p>
        </>
      ) : (
        <Button
          onClick={() => {
            // OAuth needs a full document redirect to the provider, not an RSC fetch.
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination
            window.location.assign('/auth/github');
          }}
        >
          <Github size={18} />
          使用 GitHub 登录
        </Button>
      )}
      {message && (
        <p className="feedback error" role="alert">
          {message}
        </p>
      )}
    </div>
  );
}
export function SubmissionForm({
  initialType = 'project',
  initial,
}: {
  initialType?: string;
  initial?: {
    title: string;
    summary: string;
    category: string;
    sourceUrl: string;
    sourceAuthor: string;
    license: string;
    tags: string[];
    existingResourceId: string;
  };
}) {
  const [type, setType] = useState(
    ['project', 'skill', 'scenario', 'requirement'].includes(initialType) ? initialType : 'project',
  );
  const [title, setTitle] = useState(initial?.title || '');
  const [summary, setSummary] = useState(initial?.summary || '');
  const [url, setUrl] = useState(initial?.sourceUrl || '');
  const [license, setLicense] = useState(initial?.license || '');
  const [author, setAuthor] = useState(initial?.sourceAuthor || '');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [done, setDone] = useState(false);
  const [busy, start] = useTransition();
  const router = useRouter();
  async function importGithub() {
    setError('');
    setInfo('');
    try {
      const v = await requestJson<GithubMetadata>(`/api/github?url=${encodeURIComponent(url)}`);
      setTitle(v.name);
      setSummary(v.description || '');
      setLicense(v.license);
      setAuthor(v.sourceAuthor);
      setInfo(`已获取 ${v.repo} 的公开元数据。请补充面向社区的中文介绍后提交。`);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (done)
    return (
      <div className="form-panel empty">
        <CheckCircle2 size={42} />
        <h2>{type === 'requirement' ? '企业需求已私密提交' : '投稿已进入审核队列'}</h2>
        <p>在工作台查看审核进展和编辑反馈。审核通过前不会公开你的投稿。</p>
        <Button asChild>
          <Link href="/dashboard?tab=submissions">
            查看我的投稿 <ArrowRight size={17} />
          </Link>
        </Button>
      </div>
    );
  return (
    <form
      className="form-panel stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        start(async () => {
          setError('');
          try {
            await api('submit', {
              kind: type,
              title,
              summary,
              sourceUrl: type === 'requirement' ? '' : url,
              license: type === 'requirement' ? '' : license,
              sourceAuthor: type === 'requirement' ? '' : author,
              category: data.get('category'),
              tags: String(data.get('tags') || '')
                .split(/[,，]/)
                .map((x) => x.trim())
                .filter(Boolean),
              contact: String(data.get('contact') || ''),
              publicConsent: data.get('publicConsent') === 'on',
              honeypot: String(data.get('website') || ''),
              ...(initial ? { existingResourceId: initial.existingResourceId } : {}),
            });
            setDone(true);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <h2>{initial ? '修改已发布资源' : '分享一个值得被发现的实践'}</h2>
      <div className="form-grid">
        <label className="full">
          提交类型
          <select
            value={type}
            disabled={!!initial || busy}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="project">开源项目</option>
            <option value="skill">Skill / 工作流 / MCP 资源</option>
            <option value="scenario">企业 AI 场景方案</option>
            <option value="requirement">私密企业需求</option>
          </select>
        </label>
        {type !== 'requirement' && (
          <>
            <label className="full">
              {type === 'project' ? 'GitHub 仓库地址' : '原始资源链接'}
              <input
                required={type !== 'scenario'}
                type="url"
                placeholder="https://github.com/owner/repo"
                disabled={busy}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <small>保留原作者的公开来源，所有链接仅支持 HTTPS。</small>
            </label>
            {type === 'project' && (
              <div className="full">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || !url}
                  onClick={() => start(importGithub)}
                >
                  <Download size={15} />
                  {busy ? '处理中…' : '获取 GitHub 元数据'}
                </Button>
              </div>
            )}
          </>
        )}
        <label className="full">
          {type === 'requirement' ? '需求标题' : '资源名称'}
          <input
            required
            minLength={3}
            maxLength={100}
            disabled={busy}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              type === 'requirement' ? '你希望解决什么业务问题？' : '例如：面向售后服务的知识库助手'
            }
          />
        </label>
        <label>
          分类 / 行业
          <select name="category" defaultValue={initial?.category || undefined}>
            {(type === 'project'
              ? [
                  'RAG',
                  'Agent',
                  'MCP',
                  'Skills',
                  'Workflow',
                  'AI Coding',
                  'Browser Automation',
                  'AI Infra',
                  '行业AI应用',
                ]
              : type === 'skill'
                ? [
                    'Agent Skill',
                    'Prompt模板',
                    'MCP Server',
                    'Workflow',
                    'AI应用模板',
                    '集成工具和SDK',
                  ]
                : [
                    '制造业',
                    '跨境电商',
                    '外贸',
                    '零售连锁',
                    '招聘猎头',
                    '教育',
                    '医疗',
                    '专业服务',
                    '企业管理',
                  ]
            ).map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
        <label>
          技术标签
          <input
            name="tags"
            maxLength={250}
            defaultValue={initial?.tags.join(', ')}
            placeholder="RAG, Python, 企业知识库"
          />
          <small>用逗号分隔，最多 8 个。</small>
        </label>
        <label className="full">
          {type === 'requirement' ? '业务问题与预期交付' : '介绍与适用场景'}
          <textarea
            required
            minLength={15}
            maxLength={4000}
            rows={6}
            disabled={busy}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="说明解决的问题、使用方式、适用边界和已有验证。至少 15 个字。"
          />
        </label>
        {type !== 'requirement' && (
          <>
            <label>
              作者 / 维护方
              <input
                disabled={busy}
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                maxLength={100}
                placeholder="原作者或组织名称"
              />
            </label>
            <label>
              开源许可
              <input
                disabled={busy}
                value={license}
                onChange={(e) => setLicense(e.target.value)}
                maxLength={100}
                placeholder="例如 MIT；不明确请标注待核实"
              />
            </label>
          </>
        )}
        {type === 'requirement' && (
          <>
            <label className="full">
              联系信息（仅本人及审核人员可见）
              <input
                required
                name="contact"
                maxLength={200}
                placeholder="邮箱或其他方便联系的方式"
              />
            </label>
            <label className="check-label full">
              <input type="checkbox" name="publicConsent" />
              <span>
                我同意编辑在脱敏后将需求转为公开共创任务。未勾选时，内容始终保留在私密需求队列。
              </span>
            </label>
          </>
        )}
        <label className="honeypot" aria-hidden="true">
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <p className="admin-hint">
        提交即确认你有权分享相应内容。请勿包含客户数据、密钥或未经授权的材料。投稿经审核后公开。
      </p>
      <Button type="submit" disabled={busy}>
        {busy ? '处理中…' : type === 'requirement' ? '私密提交需求' : '提交审核'}
        <ArrowRight size={16} />
      </Button>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
      {info && (
        <p className="feedback" role="status">
          {info}
        </p>
      )}
    </form>
  );
}
export function ProfileForm({ user }: { user: User }) {
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="form-panel stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          setError('');
          setSaved(false);
          try {
            const portfolio = String(f.get('portfolio') || '')
              .split('\n')
              .filter((x) => x.trim())
              .map((line) => {
                const [title, ...url] = line.split('|');
                return { title: title.trim(), url: url.join('|').trim() };
              });
            await api('profile', {
              name: f.get('name'),
              bio: f.get('bio'),
              tags: String(f.get('tags'))
                .split(/[,，]/)
                .map((x) => x.trim())
                .filter(Boolean),
              contact: f.get('contact'),
              contact_public: f.get('contact_public') === 'on',
              public: f.get('public') === 'on',
              availability: f.get('availability'),
              portfolio,
            });
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <h2>我的开发者档案</h2>
      <div className="form-grid">
        <label>
          显示名称
          <input name="name" required minLength={2} maxLength={60} defaultValue={user.name} />
        </label>
        <label>
          技术方向
          <input name="tags" defaultValue={user.tags.join(', ')} placeholder="以逗号分隔" />
        </label>
        <label className="full">
          个人简介
          <textarea name="bio" rows={4} maxLength={1000} defaultValue={user.bio} />
        </label>
        <label className="full">
          合作意向
          <input
            name="availability"
            maxLength={200}
            defaultValue={user.availability}
            placeholder="例如：希望参与企业知识库与开源评测项目"
          />
        </label>
        <label className="full">
          案例作品集
          <textarea
            rows={4}
            name="portfolio"
            defaultValue={user.portfolio.map((p) => `${p.title} | ${p.url}`).join('\n')}
            placeholder="每行一个作品：作品名称 | https://example.com"
          />
          <small>最多 8 项，仅填写有权公开的作品。</small>
        </label>
        <label className="full">
          联系信息
          <input name="contact" maxLength={200} defaultValue={user.contact} />
        </label>
        <label className="check-label full">
          <input type="checkbox" name="contact_public" defaultChecked={user.contact_public} />
          <span>在公开个人主页展示联系信息</span>
        </label>
        <label className="check-label full">
          <input type="checkbox" name="public" defaultChecked={user.public} />
          <span>公开我的开发者档案、作品集和已确认贡献。收藏与投稿审核信息始终仅本人可见。</span>
        </label>
      </div>
      <Button disabled={busy}>保存资料</Button>
      {saved && (
        <p className="feedback" role="status">
          资料已保存。
        </p>
      )}
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
