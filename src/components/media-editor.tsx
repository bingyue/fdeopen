'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  channels,
  statusNames,
  authenticityNames,
  detailsSchema,
  type Channel,
  type MediaPost,
  type Author,
  type Taxonomy,
} from '@/lib/media-model';
import { mediaApi } from './media-interactions';
const caseFields = [
  ['company', '企业名称（可匿名）'],
  ['industry', '所属行业'],
  ['department', '业务部门'],
  ['scenario', '应用场景'],
  ['technology', '技术路线'],
  ['transformation_level', '转型层级'],
  ['stage', '项目阶段'],
  ['background', '企业背景'],
  ['problem', '原始业务问题'],
  ['solution', 'AI 解决方案'],
  ['architecture', '系统架构'],
  ['implementation', '实施步骤'],
  ['collaboration', '组织协作'],
  ['investment', '项目投入'],
  ['results', '业务效果与 ROI'],
  ['lessons', '经验总结'],
  ['materials', '相关资料'],
] as const;
function localTime(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
function Upload({
  pdf = false,
  onUpload,
}: {
  pdf?: boolean;
  onUpload: (id: string, url: string) => void;
}) {
  const [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  return (
    <div className="upload-control">
      <input
        type="file"
        aria-label={pdf ? '上传报告 PDF' : '上传图片'}
        accept={pdf ? 'application/pdf' : 'image/png,image/jpeg,image/webp'}
        disabled={busy}
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 10 * 1024 * 1024) {
            setMessage('文件不能超过10 MB');
            return;
          }
          setBusy(true);
          setMessage('正在上传…');
          try {
            const r = await fetch('/api/media/upload', {
              method: 'POST',
              headers: { 'Content-Type': file.type, 'X-Filename': encodeURIComponent(file.name) },
              body: file,
              signal: AbortSignal.timeout(60000),
            });
            const v = await r.json();
            if (!r.ok) throw new Error(v.error);
            onUpload(v.id, v.url);
            setMessage('上传成功：' + file.name);
          } catch (err) {
            setMessage(err instanceof Error ? err.message : '上传失败');
          } finally {
            setBusy(false);
            e.target.value = '';
          }
        }}
      />
      <span role="status">{message}</span>
    </div>
  );
}
export function MediaEditor({
  post,
  authors,
  categories,
  tags,
  canPublish,
}: {
  post?: MediaPost;
  authors: Author[];
  categories: Taxonomy[];
  tags: Taxonomy[];
  canPublish: boolean;
}) {
  const router = useRouter();
  const [channel, setChannel] = useState<Channel>(post?.channel || 'features'),
    [body, setBody] = useState(post?.body || ''),
    [cover, setCover] = useState(post?.cover_id || null),
    [report, setReport] = useState(post?.report_id || null),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <form
      className="media-form media-editor"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const f = new FormData(e.currentTarget),
          text = (k: string) => String(f.get(k) || ''),
          detail = { ...detailsSchema.parse({}), ...post?.details } as Record<string, unknown>;
        for (const [key, value] of f.entries())
          if (key.startsWith('detail_')) detail[key.slice(7)] = value;
        for (const key of ['event_start', 'event_end'])
          if (detail[key]) detail[key] = new Date(String(detail[key])).toISOString();
        detail.capacity = Number(detail.capacity) || 0;
        const data = {
          id: post?.id,
          revision: post?.revision,
          slug: text('slug'),
          channel,
          title: text('title'),
          subtitle: text('subtitle'),
          summary: text('summary'),
          body,
          category: text('category') || null,
          author_id: text('author_id') || null,
          tags: f.getAll('tags'),
          status: text('status'),
          authenticity: text('authenticity'),
          source_name: text('source_name'),
          source_url: text('source_url'),
          verification_note: text('verification_note'),
          sponsored: f.get('sponsored') === 'on',
          cover_id: cover,
          cover_alt: text('cover_alt'),
          cover_caption: text('cover_caption'),
          cover_style: text('cover_style'),
          seo_title: text('seo_title'),
          seo_description: text('seo_description'),
          details: detail,
          report_id: channel === 'research' ? report : null,
          download_access: channel === 'research' ? text('download_access') : 'none',
          home_rank: Number(text('home_rank')) || 0,
          featured: f.get('featured') === 'on',
          breaking: f.get('breaking') === 'on',
          published_at: text('published_at') ? new Date(text('published_at')).toISOString() : null,
        };
        try {
          const r = await mediaApi('save', data);
          setMessage('已保存。当前状态：' + statusNames[data.status as keyof typeof statusNames]);
          router.replace(`/admin/media?edit=${r.id}`);
          router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : '保存失败');
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="form-two">
        <label>
          内容标题 *
          <input name="title" required minLength={3} maxLength={160} defaultValue={post?.title} />
        </label>
        <label>
          URL Slug *
          <input
            name="slug"
            required
            pattern="[a-z0-9](?:[a-z0-9]|-){1,99}"
            maxLength={100}
            defaultValue={post?.slug}
            placeholder="例如 enterprise-ai-practice"
          />
        </label>
      </div>
      <label>
        副标题
        <input name="subtitle" maxLength={200} defaultValue={post?.subtitle} />
      </label>
      <label>
        摘要
        <textarea name="summary" maxLength={600} defaultValue={post?.summary} />
      </label>
      <div className="form-two">
        <label>
          内容类型
          <select value={channel} onChange={(e) => setChannel(e.target.value as Channel)}>
            {Object.entries(channels).map(([key, v]) => (
              <option key={key} value={key}>
                {v.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          内容分类
          <select name="category" defaultValue={post?.category || ''}>
            <option value="">请选择分类</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="form-two">
        <label>
          作者
          <select name="author_id" defaultValue={post?.author_id || ''}>
            <option value="">请选择作者</option>
            {authors.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          标签（可多选）
          <select
            name="tags"
            multiple
            defaultValue={post?.tags || []}
            size={Math.min(5, Math.max(2, tags.length))}
          >
            {tags.map((t) => (
              <option key={t.slug} value={t.slug}>
                {t.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend>封面与配图</legend>
        <Upload onUpload={(id) => setCover(id)} />
        {cover && (
          <div className="media-links">
            <a target="_blank" href={`/api/media/assets/${cover}`}>
              查看已上传封面
            </a>
            <button type="button" className="editor-secondary" onClick={() => setCover(null)}>
              移除封面
            </button>
          </div>
        )}
        <div className="form-two">
          <label>
            封面 Alt
            <input name="cover_alt" maxLength={200} defaultValue={post?.cover_alt} />
          </label>
          <label>
            无图片时的封面版式
            <select name="cover_style" defaultValue={post?.cover_style || 'grid'}>
              {[
                ['grid', '线框'],
                ['layers', '组织层次'],
                ['circuit', '产业连接'],
                ['field', '业务现场'],
                ['report', '研究报告'],
                ['portrait', '人物观点'],
              ].map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>
          图注 / 图片来源
          <input name="cover_caption" maxLength={1000} defaultValue={post?.cover_caption} />
        </label>
      </fieldset>
      <label>
        正文（Markdown；不执行 HTML / JSX）
        <textarea
          className="body-editor"
          name="body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={80000}
          placeholder={'## 一级小节\n\n正文、引用、表格、代码块均可使用 Markdown。'}
        />
      </label>
      <div>
        <span>上传正文配图（插入后请编辑说明与来源）</span>
        <Upload
          onUpload={(_id, url) => setBody((v) => v + `\n\n![图片说明](${url} "图片说明与来源")\n`)}
        />
      </div>
      {channel === 'cases' && (
        <fieldset>
          <legend>企业案例结构化信息</legend>
          {caseFields.map(([key, label], i) => (
            <label key={key}>
              {label}
              {i < 7 ? (
                <input name={`detail_${key}`} maxLength={200} defaultValue={post?.details[key]} />
              ) : (
                <textarea
                  name={`detail_${key}`}
                  maxLength={6000}
                  defaultValue={post?.details[key]}
                />
              )}
            </label>
          ))}
        </fieldset>
      )}
      {channel === 'research' && (
        <fieldset>
          <legend>研究与报告</legend>
          <label>
            研究形式
            <select
              name="detail_research_type"
              defaultValue={post?.details.research_type || 'article'}
            >
              <option value="article">研究文章</option>
              <option value="report">研究报告 / PDF</option>
              <option value="series">系列研究专题</option>
            </select>
          </label>
          <label>
            研究团队
            <input name="detail_team" maxLength={200} defaultValue={post?.details.team} />
          </label>
          <Upload pdf onUpload={(id) => setReport(id)} />
          {report && (
            <div className="media-links">
              <a href={`/api/media/assets/${report}`}>查看 / 下载 PDF</a>
              <button type="button" className="editor-secondary" onClick={() => setReport(null)}>
                移除报告
              </button>
            </div>
          )}
          <label>
            下载权限
            <select name="download_access" defaultValue={post?.download_access || 'none'}>
              <option value="none">仅在线正文</option>
              <option value="public">公开下载</option>
              <option value="request">登录申请，审核完成后下载</option>
            </select>
          </label>
        </fieldset>
      )}
      {channel === 'people' && (
        <fieldset>
          <legend>人物信息</legend>
          <label>
            人物姓名
            <input
              name="detail_person_name"
              maxLength={200}
              defaultValue={post?.details.person_name}
            />
          </label>
          <label>
            身份与介绍
            <input
              name="detail_person_title"
              maxLength={200}
              defaultValue={post?.details.person_title}
            />
          </label>
        </fieldset>
      )}
      {channel === 'events' && (
        <fieldset>
          <legend>活动安排（本地时区）</legend>
          <div className="form-two">
            <label>
              开始时间
              <input
                type="datetime-local"
                name="detail_event_start"
                defaultValue={localTime(post?.details.event_start)}
              />
            </label>
            <label>
              结束时间
              <input
                type="datetime-local"
                name="detail_event_end"
                defaultValue={localTime(post?.details.event_end)}
              />
            </label>
          </div>
          <label>
            地点
            <input name="detail_location" maxLength={200} defaultValue={post?.details.location} />
          </label>
          <div className="form-two">
            <label>
              报名状态
              <select
                name="detail_event_state"
                defaultValue={post?.details.event_state || 'closed'}
              >
                <option value="closed">关闭报名</option>
                <option value="open">开放报名</option>
                <option value="cancelled">活动取消</option>
              </select>
            </label>
            <label>
              报名名额（0 表示不限）
              <input
                type="number"
                name="detail_capacity"
                min={0}
                max={100000}
                defaultValue={post?.details.capacity || 0}
              />
            </label>
          </div>
        </fieldset>
      )}
      <fieldset>
        <legend>真实性、来源与商业标识</legend>
        <label>
          内容性质
          <select name="authenticity" defaultValue={post?.authenticity || 'example'}>
            {Object.entries(authenticityNames)
              .filter(([k]) => canPublish || ['example', 'editorial'].includes(k))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <div className="form-two">
          <label>
            来源名称
            <input name="source_name" maxLength={200} defaultValue={post?.source_name} />
          </label>
          <label>
            来源网址（HTTPS）
            <input type="url" name="source_url" maxLength={1000} defaultValue={post?.source_url} />
          </label>
        </div>
        <label>
          内部核验依据（不公开）
          <textarea
            name="verification_note"
            maxLength={4000}
            defaultValue={post?.verification_note}
          />
        </label>
        <label className="consent-line">
          <input type="checkbox" name="sponsored" defaultChecked={post?.sponsored} />
          商业合作内容，公开页面显示标识
        </label>
      </fieldset>
      <details>
        <summary>SEO 与首页推荐</summary>
        <label>
          SEO 标题
          <input name="seo_title" maxLength={120} defaultValue={post?.seo_title} />
        </label>
        <label>
          SEO 描述
          <textarea name="seo_description" maxLength={300} defaultValue={post?.seo_description} />
        </label>
        {canPublish && (
          <>
            <label>
              首页排序（0 不推荐，1 为封面；其后为精选顺序）
              <input
                name="home_rank"
                type="number"
                min={0}
                max={100}
                defaultValue={post?.home_rank || 0}
              />
            </label>
            <label className="consent-line">
              <input type="checkbox" name="featured" defaultChecked={post?.featured} />
              编辑精选
            </label>
            <label className="consent-line">
              <input type="checkbox" name="breaking" defaultChecked={post?.breaking} />
              进入产业动态条
            </label>
          </>
        )}
      </details>
      <div className="form-two">
        <label>
          发布状态
          <select name="status" defaultValue={post?.status || 'draft'}>
            {Object.entries(statusNames)
              .filter(([k]) => canPublish || ['draft', 'review'].includes(k))
              .map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
          </select>
        </label>
        <label>
          发布时间（本地时区）
          <input
            name="published_at"
            type="datetime-local"
            defaultValue={localTime(post?.published_at)}
          />
        </label>
      </div>
      {message && (
        <div role="status" className="form-feedback">
          {message}
        </div>
      )}
      <div className="editor-actions">
        <button className="media-primary" disabled={busy}>
          {busy ? '正在保存…' : '保存内容'}
        </button>
        {post && (
          <Link target="_blank" href={`/admin/media/preview/${post.id}`}>
            查看已保存预览 ↗
          </Link>
        )}
        <Link href="/admin/media?tab=posts">返回内容列表</Link>
        {post && canPublish && (
          <button
            type="button"
            className="editor-danger"
            disabled={busy}
            onClick={async () => {
              if (!confirmDelete) {
                setConfirmDelete(true);
                return;
              }
              setBusy(true);
              try {
                await mediaApi('delete', { id: post.id, revision: post.revision });
                router.push('/admin/media?tab=posts');
                router.refresh();
              } catch (err) {
                setMessage(err instanceof Error ? err.message : '删除失败');
                setBusy(false);
              }
            }}
          >
            {confirmDelete ? '再次点击，确认移入回收状态' : '删除内容'}
          </button>
        )}
      </div>
    </form>
  );
}
export function AdminMediaForm({
  action,
  children,
  initial = {},
  button = '保存',
}: {
  action: string;
  children: React.ReactNode;
  initial?: Record<string, unknown>;
  button?: string;
}) {
  const router = useRouter(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <form
      className="media-form"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setMessage('');
        const f = new FormData(e.currentTarget);
        const data: Record<string, unknown> = { ...initial, ...Object.fromEntries(f) };
        for (const key of ['is_example', 'published'])
          if (f.has(key) || key in initial) data[key] = f.get(key) === 'on';
        if (f.has('post_ids')) data.post_ids = f.getAll('post_ids');
        if (f.has('ids'))
          data.ids = String(f.get('ids') || '')
            .split(/[\s,]+/)
            .filter(Boolean);
        if ('user_id' in data && !data.user_id) data.user_id = null;
        try {
          await mediaApi(action, data);
          setMessage('已保存');
          router.refresh();
        } catch (err) {
          setMessage(err instanceof Error ? err.message : '保存失败');
        } finally {
          setBusy(false);
        }
      }}
    >
      {children}
      <button className="media-primary" disabled={busy}>
        {busy ? '保存中…' : button}
      </button>
      {message && (
        <p className="form-feedback" role="status">
          {message}
        </p>
      )}
    </form>
  );
}

export function HomeOrderEditor({
  posts,
}: {
  posts: Pick<MediaPost, 'id' | 'title' | 'status' | 'home_rank'>[];
}) {
  const router = useRouter();
  const [ids, setIds] = useState(
    posts
      .filter((p) => p.home_rank > 0)
      .sort((a, b) => a.home_rank - b.home_rank)
      .map((p) => p.id),
  );
  const [selected, setSelected] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const move = (index: number, direction: number) =>
    setIds((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction], next[index]];
      return next;
    });
  return (
    <div className="media-form">
      <div className="form-two">
        <label>
          添加推荐内容
          <select value={selected} onChange={(e) => setSelected(e.target.value)}>
            <option value="">选择内容标题</option>
            {posts
              .filter((p) => !ids.includes(p.id))
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} · {statusNames[p.status]}
                </option>
              ))}
          </select>
        </label>
        <div className="editor-actions">
          <button
            type="button"
            className="editor-secondary"
            disabled={!selected || ids.length >= 100}
            onClick={() => {
              setIds((v) => [...v, selected]);
              setSelected('');
            }}
          >
            添加到推荐列表
          </button>
        </div>
      </div>
      <ol className="home-order-list">
        {ids.map((id, index) => {
          const post = posts.find((p) => p.id === id);
          return (
            <li key={id}>
              <div>
                <span>{index === 0 ? '封面主推' : `精选 ${index}`}</span>
                <strong>{post?.title || '内容已不可用'}</strong>
                <small>{post ? statusNames[post.status] : ''}</small>
              </div>
              <div>
                <button
                  type="button"
                  disabled={index === 0}
                  aria-label={`上移 ${post?.title}`}
                  onClick={() => move(index, -1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={index === ids.length - 1}
                  aria-label={`下移 ${post?.title}`}
                  onClick={() => move(index, 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  aria-label={`移除 ${post?.title}`}
                  onClick={() => setIds((v) => v.filter((x) => x !== id))}
                >
                  移除
                </button>
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className="media-primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await mediaApi('home', { ids });
            setMessage('首页推荐顺序已保存');
            router.refresh();
          } catch (e) {
            setMessage(e instanceof Error ? e.message : '保存失败');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? '保存中…' : '保存推荐顺序'}
      </button>
      {message && (
        <p role="status" className="form-feedback">
          {message}
        </p>
      )}
    </div>
  );
}
