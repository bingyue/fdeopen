'use client';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { Resource, Collection, Submission } from '@/lib/types';
import { Button } from './ui/button';
import { api, ActionButton } from './actions';
export function ReviewForm({ s }: { s: Submission }) {
  const [note, setNote] = useState('');
  const [publicTitle, setTitle] = useState('');
  const [publicSummary, setSummary] = useState('');
  const [error, setError] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  function review(decision: string) {
    start(async () => {
      setError('');
      try {
        await api('review', {
          id: s.id,
          decision,
          note,
          ...(s.kind === 'requirement' && decision === 'approved'
            ? { publicTitle, publicSummary }
            : {}),
        });
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }
  return (
    <div className="stack-form">
      <label>
        审核反馈 / 跟进备注
        <textarea
          rows={2}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="说明审核结果或建议修改的内容"
          maxLength={2000}
        />
      </label>
      {s.kind === 'requirement' && s.payload.publicConsent === true && (
        <>
          <label>
            脱敏后的公开标题
            <input
              value={publicTitle}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="不要直接复制企业名称与私密原文"
            />
          </label>
          <label>
            脱敏后的公开介绍
            <textarea
              value={publicSummary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={4000}
              placeholder="只保留已获授权的业务问题与共创范围，至少 15 字"
            />
          </label>
        </>
      )}
      <div className="item-actions">
        <Button
          disabled={busy || (s.kind === 'requirement' && s.payload.publicConsent !== true)}
          onClick={() => review('approved')}
        >
          {s.kind === 'requirement' ? '发布脱敏共创任务' : '审核通过并发布'}
        </Button>
        <Button disabled={busy} variant="secondary" onClick={() => review('rejected')}>
          退回并反馈
        </Button>
        {s.kind === 'requirement' && (
          <ActionButton
            action="lead-note"
            payload={{ id: s.id, note }}
            success="私密跟进记录已保存"
          >
            保存跟进备注
          </ActionButton>
        )}
      </div>
      {error && (
        <p className="feedback error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
export function ResourceEditor({ resource }: { resource?: Resource }) {
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, start] = useTransition();
  const router = useRouter();
  const r = resource;
  return (
    <form
      className="form-panel admin-editor stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          setError('');
          setMessage('');
          try {
            const metadata = JSON.parse(String(f.get('metadata') || '{}'));
            await api('resource', {
              ...(r ? { id: r.id } : {}),
              slug: f.get('slug'),
              kind: r?.kind || f.get('kind'),
              title: f.get('title'),
              summary: f.get('summary'),
              category: f.get('category'),
              tags: String(f.get('tags') || '')
                .split(/[,，]/)
                .map((x) => x.trim())
                .filter(Boolean),
              body: f.get('body'),
              source_url: f.get('source_url'),
              source_author: f.get('source_author'),
              license: f.get('license'),
              provenance: f.get('provenance'),
              status: f.get('status'),
              featured: f.get('featured') === 'on',
              metadata,
            });
            setMessage('内容与双向关联已保存。');
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <h2>{r ? '编辑：' + r.title : '新建社区内容'}</h2>
      <div className="form-grid">
        <label>
          名称
          <input name="title" defaultValue={r?.title} required maxLength={100} />
        </label>
        <label>
          URL 标识
          <input
            name="slug"
            required
            defaultValue={r?.slug}
            pattern="[a-z0-9](?:[a-z0-9]|-){1,99}"
            placeholder="lowercase-slug"
          />
        </label>
        <label>
          内容类型
          <select name="kind" disabled={!!r} defaultValue={r?.kind || 'project'}>
            <option value="project">项目</option>
            <option value="skill">Skill</option>
            <option value="scenario">场景</option>
            <option value="demo">Demo</option>
            <option value="task">共创任务</option>
            <option value="article">开放文档</option>
          </select>
        </label>
        <label>
          分类
          <input name="category" defaultValue={r?.category} required maxLength={100} />
        </label>
        <label className="full">
          简介
          <textarea
            name="summary"
            defaultValue={r?.summary}
            required
            minLength={10}
            maxLength={4000}
            rows={3}
          />
        </label>
        <label className="full">
          正文
          <textarea name="body" defaultValue={r?.body || ''} maxLength={40000} rows={7} />
          <small>修改正文后以安全纯文本发布；仓库中的 MDX 文章通过 Git 管理版本。</small>
        </label>
        <label className="full">
          标签
          <input name="tags" defaultValue={r?.tags.join(', ')} placeholder="逗号分隔" />
        </label>
        <label>
          来源 URL
          <input name="source_url" type="url" defaultValue={r?.source_url} />
        </label>
        <label>
          原作者
          <input name="source_author" defaultValue={r?.source_author || 'FDE前线 编辑组'} />
        </label>
        <label>
          许可
          <input name="license" defaultValue={r?.license} />
        </label>
        <label>
          来源类型
          <select name="provenance" defaultValue={r?.provenance || 'editorial'}>
            <option value="editorial">编辑整理</option>
            <option value="external">外部资源</option>
            <option value="demo">演示内容</option>
            <option value="community">社区投稿</option>
          </select>
        </label>
        <label>
          发布状态
          <select name="status" defaultValue={r?.status || 'draft'}>
            <option value="draft">草稿</option>
            <option value="published">公开发布</option>
            <option value="archived">归档下架</option>
          </select>
        </label>
        <label className="check-label">
          <input name="featured" type="checkbox" defaultChecked={r?.featured} />
          <span>加入首页精选</span>
        </label>
        <details className="full">
          <summary>内容扩展字段与关联资源</summary>
          <p className="admin-hint">
            项目：docsUrl、language；Skill：install、version、platforms；场景：pain、solution、workflow、metrics；Demo：demoUrl、input、output；任务：state、deliverables、deadline。relatedSlugs
            为关联资源 URL 标识数组。
          </p>
          <label>
            结构化内容（JSON）
            <textarea
              className="json-field"
              name="metadata"
              rows={18}
              defaultValue={JSON.stringify(r?.metadata || { relatedSlugs: [] }, null, 2)}
            />
          </label>
        </details>
      </div>
      <Button disabled={busy}>保存内容</Button>
      {message && (
        <p className="feedback" role="status">
          {message}
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
export function SettingsForm({
  settings,
}: {
  settings: { announcement: string; showLab: boolean; showTasks: boolean; showDevelopers: boolean };
}) {
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="form-panel stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          try {
            await api('settings', {
              announcement: f.get('announcement'),
              showLab: f.get('showLab') === 'on',
              showTasks: f.get('showTasks') === 'on',
              showDevelopers: f.get('showDevelopers') === 'on',
            });
            setSaved(true);
            setError('');
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <h2>首页模块配置</h2>
      <label>
        社区公告
        <input name="announcement" defaultValue={settings.announcement} required maxLength={200} />
      </label>
      {(['showLab', 'showTasks', 'showDevelopers'] as const).map((key, i) => (
        <label className="check-label" key={key}>
          <input type="checkbox" name={key} defaultChecked={settings[key]} />
          <span>{['展示在线实验室', '展示开源共创', '展示开发者'][i]}</span>
        </label>
      ))}
      <Button disabled={busy}>保存首页配置</Button>
      {saved && (
        <p className="feedback" role="status">
          已保存，首页会使用新的配置。
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
export function RoleForm({
  id,
  role,
  disabled,
  self,
}: {
  id: string;
  role: string;
  disabled: boolean;
  self: boolean;
}) {
  const [nextRole, setRole] = useState(role),
    [off, setOff] = useState(disabled);
  return (
    <div>
      <select
        aria-label="用户角色"
        value={nextRole}
        disabled={self}
        onChange={(e) => setRole(e.target.value)}
      >
        <option value="member">成员</option>
        <option value="maintainer">维护者</option>
        <option value="moderator">编辑</option>
        <option value="admin">管理员</option>
      </select>
      <label className="check-label">
        <input
          type="checkbox"
          checked={off}
          disabled={self}
          onChange={(e) => setOff(e.target.checked)}
        />
        停用账号
      </label>
      {!self && (
        <ActionButton
          action="role"
          payload={{ id, role: nextRole, disabled: off }}
          success="权限已更新"
        >
          保存权限
        </ActionButton>
      )}
    </div>
  );
}
export function CollectionEditor({
  collection,
  resources,
  selected = [],
}: {
  collection?: Collection;
  resources: Resource[];
  selected?: string[];
}) {
  const [error, setError] = useState(''),
    [saved, setSaved] = useState(false);
  const [busy, start] = useTransition();
  const router = useRouter();
  return (
    <form
      className="form-panel stack-form"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        start(async () => {
          try {
            await api('collection', {
              ...(collection ? { id: collection.id } : {}),
              slug: f.get('slug'),
              title: f.get('title'),
              summary: f.get('summary'),
              theme: f.get('theme'),
              published: f.get('published') === 'on',
              resourceIds: f.getAll('resourceIds'),
            });
            setError('');
            setSaved(true);
            router.refresh();
          } catch (e) {
            setError((e as Error).message);
          }
        });
      }}
    >
      <h2>{collection ? '编辑专题' : '新建专题'}</h2>
      <label>
        专题名称
        <input
          name="title"
          required
          minLength={2}
          maxLength={100}
          defaultValue={collection?.title}
        />
      </label>
      <label>
        URL 标识
        <input
          name="slug"
          required
          pattern="(?:[a-z0-9]|-){2,100}"
          defaultValue={collection?.slug}
        />
      </label>
      <label>
        专题介绍
        <textarea
          name="summary"
          required
          minLength={10}
          maxLength={1000}
          defaultValue={collection?.summary}
        />
      </label>
      <label>
        主题颜色
        <select name="theme" defaultValue={collection?.theme || 'blue'}>
          {['blue', 'violet', 'green', 'orange', 'dark'].map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </label>
      <label className="check-label">
        <input name="published" type="checkbox" defaultChecked={collection?.published ?? true} />
        公开专题
      </label>
      <label>
        包含的资源
        <select name="resourceIds" multiple size={10} defaultValue={selected}>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.title} · {r.kind}
            </option>
          ))}
        </select>
        <small className="muted">按住 Command / Ctrl 可多选。</small>
      </label>
      <Button disabled={busy}>保存专题</Button>
      {saved && (
        <p className="feedback" role="status">
          专题已保存。
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
