import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { mediaRole, editorPost, mediaTaxonomy } from '@/lib/media-service';
import {
  channels,
  statusNames,
  type MediaPost,
  type Author,
  type Topic,
  type Inquiry,
} from '@/lib/media-model';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
import { MediaEditor, AdminMediaForm, HomeOrderEditor } from '@/components/media-editor';
import { MediaEmpty } from '@/components/media';
import { Pagination } from '@/components/pagination';
import { audit } from '@/lib/service';
export const metadata = { title: '媒体编辑工作台', robots: { index: false, follow: false } };
const tabs = [
  ['overview', '概览'],
  ['posts', '内容'],
  ['home', '首页推荐'],
  ['taxonomy', '栏目与标签'],
  ['authors', '作者'],
  ['topics', '专题'],
  ['inquiries', '申请与报名'],
  ['subscribers', '周刊登记'],
  ['access', '编辑权限'],
];
export default async function AdminMedia({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const role = await mediaRole(user);
  if (!role)
    return (
      <div className="media-container media-page">
        <MediaEmpty
          title="需要媒体编辑权限"
          description="普通用户可通过投稿合作入口提交选题。管理员可在编辑权限页授权作者或编辑。"
        />
      </div>
    );
  const params = await searchParams,
    tab = queryText(params, 'tab') || 'overview',
    edit = queryText(params, 'edit'),
    q = queryText(params, 'q'),
    page = positiveInteger(queryText(params, 'page'));
  const database = await db(),
    tax = await mediaTaxonomy(),
    canPublish = role !== 'author';
  const allowedTabs = canPublish
    ? tabs.filter(([k]) => k !== 'access' || role === 'admin')
    : tabs.filter(([k]) => ['overview', 'posts'].includes(k));
  if (!edit && !allowedTabs.some(([k]) => k === tab)) notFound();
  const authorRows = await database.query<Author>(
    `SELECT * FROM media_authors ${canPublish ? '' : 'WHERE user_id=$1'} ORDER BY name`,
    canPublish ? [] : [user.id],
  );
  let panel: React.ReactNode;
  if (edit) {
    let post: MediaPost | undefined;
    if (edit !== 'new') {
      try {
        post = await editorPost(user, edit);
      } catch {
        notFound();
      }
    }
    panel = (
      <MediaEditor
        key={`${edit}-${post?.revision || 0}`}
        post={post}
        authors={authorRows}
        categories={tax.categories}
        tags={tax.tags}
        canPublish={canPublish}
      />
    );
  } else if (tab === 'posts' || tab === 'overview') {
    const where = `deleted_at IS NULL AND title ILIKE $1 ${canPublish ? '' : 'AND owner_id=$2'}`,
      values = canPublish ? [`%${q.slice(0, 100)}%`] : [`%${q.slice(0, 100)}%`, user.id];
    const [{ count }] = await database.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM media_posts WHERE ${where}`,
        values,
      ),
      pages = Math.max(1, Math.ceil(count / 30)),
      safePage = Math.min(page, pages);
    const posts = await database.query<MediaPost>(
      `SELECT id,title,channel,status,slug,updated_at,authenticity FROM media_posts WHERE ${where} ORDER BY updated_at DESC LIMIT 30 OFFSET $${values.length + 1}`,
      [...values, (safePage - 1) * 30],
    );
    const stats = canPublish
      ? await database.query<{
          published: number;
          review: number;
          inquiries: number;
          views: number;
        }>(
          "SELECT (SELECT count(*)::int FROM media_posts WHERE deleted_at IS NULL AND status IN ('published','scheduled') AND published_at<=now()) AS published,(SELECT count(*)::int FROM media_posts WHERE status='review' AND deleted_at IS NULL) AS review,(SELECT count(*)::int FROM media_inquiries WHERE status='new') AS inquiries,(SELECT count(*)::int FROM media_views WHERE day>=current_date-6) AS views",
        )
      : [];
    panel = (
      <>
        {tab === 'overview' && stats[0] && (
          <div className="media-admin-stats">
            {[
              ['已公开', stats[0].published],
              ['待审核', stats[0].review],
              ['待处理申请', stats[0].inquiries],
              ['近7日去重阅读', stats[0].views],
            ].map(([label, n]) => (
              <div key={String(label)}>
                <strong>{n}</strong>
                <span>{label}</span>
              </div>
            ))}
          </div>
        )}
        <form className="media-filters">
          <input type="hidden" name="tab" value="posts" />
          <input name="q" defaultValue={q} placeholder="搜索媒体内容" aria-label="搜索媒体内容" />
          <button>搜索</button>
        </form>
        <div className="media-admin-list">
          {posts.map((p) => (
            <div className="media-admin-item" key={p.id}>
              <div>
                <h3>{p.title}</h3>
                <p>
                  {channels[p.channel].name} · {statusNames[p.status]} ·{' '}
                  {p.authenticity === 'example' ? '示例内容' : '正式内容'}
                </p>
              </div>
              <Link href={`/admin/media?edit=${p.id}`}>编辑 →</Link>
            </div>
          ))}
        </div>
        {!count && <MediaEmpty title="尚无媒体内容" />}
        <Pagination
          page={safePage}
          pages={pages}
          href={(p) => `/admin/media?tab=posts&q=${encodeURIComponent(q)}&page=${p}`}
        />
      </>
    );
  } else if (tab === 'home') {
    const posts = await database.query<MediaPost>(
      'SELECT id,title,status,home_rank FROM media_posts WHERE deleted_at IS NULL ORDER BY home_rank DESC,updated_at DESC LIMIT 200',
    );
    panel = (
      <>
        <h2>首页封面与精选顺序</h2>
        <p>
          第一条为主封面，其后为编辑精选。草稿、未到期内容不会对外展示；产业动态在文章编辑页单独勾选。
        </p>
        <HomeOrderEditor posts={posts} />
      </>
    );
  } else if (tab === 'inquiries') {
    await audit(database, user.id, 'media.inquiry.view', 'private-queue');
    const kind = queryText(params, 'kind'),
      state = queryText(params, 'status');
    const rows = await database.query<Inquiry>(
      "SELECT i.*,p.title AS post_title FROM media_inquiries i LEFT JOIN media_posts p ON p.id=i.post_id WHERE ($1='' OR i.kind=$1) AND ($2='' OR i.status=$2) ORDER BY i.created_at DESC LIMIT 50 OFFSET $3",
      [kind, state, (page - 1) * 50],
    );
    panel = (
      <>
        <h2>私密申请与报名</h2>
        <p>
          联系方式与原始需求仅供本次申请处理。查看已记录审计日志。报告申请设为“已完成”后，申请人取得下载权限。
        </p>
        <form className="media-filters">
          <input type="hidden" name="tab" value="inquiries" />
          <select name="kind" aria-label="申请类型" defaultValue={kind}>
            <option value="">全部类型</option>
            {[
              ['enterprise', '企业需求'],
              ['expert', '专家'],
              ['cooperation', '投稿合作'],
              ['event', '活动报名'],
              ['report', '报告资料'],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={state} aria-label="申请状态">
            <option value="">全部状态</option>
            {[
              ['new', '待处理'],
              ['contacted', '已联系'],
              ['completed', '已完成'],
              ['rejected', '未通过'],
            ].map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <button>筛选</button>
        </form>
        {rows.map((r) => (
          <details className="item-panel" key={r.id}>
            <summary>
              {r.name} · {r.organization} · {r.post_title || r.kind}
            </summary>
            <p>联系方式：{r.contact}</p>
            <dl className="case-facts">
              {Object.entries(r.payload)
                .filter(
                  ([k, v]) =>
                    !['name', 'contact', 'organization', 'post_id', 'consent'].includes(k) &&
                    typeof v === 'string' &&
                    v,
                )
                .map(([k, v]) => (
                  <div key={k}>
                    <dt>
                      {(
                        {
                          industry: '行业',
                          scenario: '场景',
                          problem: '主要问题',
                          budget: '预算',
                          timeline: '周期',
                          expertise: '专业领域',
                          experience: '行业经验',
                          representative_cases: '代表案例',
                          cooperation_type: '合作类型',
                          notes: '补充说明',
                        } as Record<string, string>
                      )[k] || k}
                    </dt>
                    <dd>{String(v)}</dd>
                  </div>
                ))}
            </dl>
            <AdminMediaForm action="inquiry-status" initial={{ id: r.id }}>
              <label>
                状态
                <select name="status" defaultValue={r.status}>
                  {[
                    ['new', '待处理'],
                    ['contacted', '已联系'],
                    ['completed', '已完成 / 报告授权'],
                    ['rejected', '未通过'],
                  ].map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                内部跟进备注
                <textarea name="note" defaultValue={r.note} />
              </label>
            </AdminMediaForm>
          </details>
        ))}
        <div className="media-links">
          {page > 1 && (
            <Link href={`/admin/media?tab=inquiries&kind=${kind}&status=${state}&page=${page - 1}`}>
              上一页
            </Link>
          )}
          {rows.length === 50 && (
            <Link href={`/admin/media?tab=inquiries&kind=${kind}&status=${state}&page=${page + 1}`}>
              下一页
            </Link>
          )}
        </div>
      </>
    );
  } else if (tab === 'subscribers') {
    await audit(database, user.id, 'media.subscribers.view', 'private-queue');
    const rows = await database.query<{ email: string; active: boolean; created_at: string }>(
      'SELECT email,active,created_at FROM media_subscriptions ORDER BY created_at DESC LIMIT 100 OFFSET $1',
      [(page - 1) * 100],
    );
    panel = (
      <>
        <h2>周刊意向登记</h2>
        <p>
          仅保存主动授权的登记，本系统不会自动发送邮件。正式发行前需配置发送平台、地址确认与退订流程。
        </p>
        {rows.map((r) => (
          <div className="media-admin-item" key={r.email}>
            <div>
              <h3>{r.email}</h3>
              <p>
                {r.active ? '已登记' : '已退订'} ·{' '}
                {new Date(r.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
          </div>
        ))}
        <div className="media-links">
          {page > 1 && <Link href={`/admin/media?tab=subscribers&page=${page - 1}`}>上一页</Link>}
          {rows.length === 100 && (
            <Link href={`/admin/media?tab=subscribers&page=${page + 1}`}>下一页</Link>
          )}
        </div>
      </>
    );
  } else if (tab === 'access') {
    const users = await database.query<{ id: string; name: string; role: string }>(
      'SELECT u.id,p.name,s.role FROM users u JOIN profiles p ON p.user_id=u.id LEFT JOIN media_staff s ON s.user_id=u.id WHERE NOT u.disabled ORDER BY p.name',
    );
    panel = (
      <>
        <h2>媒体权限授权</h2>
        <p>
          作者仅编辑自己的草稿并提交审核；编辑管理媒体内容、分类与合作申请；管理员拥有全部权限。
        </p>
        <AdminMediaForm action="role">
          <label>
            用户
            <select name="user_id">
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} · {u.role || '无媒体角色'}
                </option>
              ))}
            </select>
          </label>
          <label>
            角色
            <select name="role">
              <option value="author">作者</option>
              <option value="editor">编辑</option>
              <option value="none">移除媒体权限</option>
            </select>
          </label>
        </AdminMediaForm>
      </>
    );
  } else {
    const kind =
      tab === 'authors'
        ? 'author'
        : tab === 'topics'
          ? 'topic'
          : queryText(params, 'kind') === 'tag'
            ? 'tag'
            : 'category';
    const topics =
      tab === 'topics'
        ? await database.query<Topic>('SELECT * FROM media_topics ORDER BY title')
        : [];
    const selected = queryText(params, 'item');
    const existing =
      kind === 'author'
        ? authorRows.find((a) => a.slug === selected)
        : kind === 'topic'
          ? topics.find((t) => t.slug === selected)
          : (kind === 'tag' ? tax.tags : tax.categories).find((t) => t.slug === selected);
    const posts =
      kind === 'topic'
        ? await database.query<MediaPost>(
            'SELECT id,title FROM media_posts WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 200',
          )
        : [];
    const assigned =
      kind === 'topic' && existing
        ? (
            await database.query<{ post_id: string }>(
              'SELECT post_id FROM media_topic_posts WHERE topic_slug=$1',
              [selected],
            )
          ).map((r) => r.post_id)
        : [];
    const e = existing as (Author & Topic & { description?: string }) | undefined;
    panel = (
      <>
        <h2>{kind === 'author' ? '作者管理' : kind === 'topic' ? '专题管理' : '栏目与标签'}</h2>
        <div className="media-links">
          {tab === 'taxonomy' && (
            <>
              <Link href="/admin/media?tab=taxonomy&kind=category">栏目分类</Link>
              <Link href="/admin/media?tab=taxonomy&kind=tag">内容标签</Link>
            </>
          )}
          <Link href={`/admin/media?tab=${tab}&kind=${kind}`}>新建</Link>
        </div>
        <AdminMediaForm
          key={`${kind}-${selected}`}
          action="taxonomy"
          initial={{
            kind,
            ...(kind === 'author' && e ? { id: e.id } : {}),
            is_example: e?.is_example || false,
            published: e?.published || false,
            ...(kind === 'topic' ? { post_ids: [] } : {}),
          }}
        >
          <label>
            名称
            <input
              name="name"
              required
              minLength={2}
              maxLength={100}
              defaultValue={e?.name || e?.title}
            />
          </label>
          <label>
            Slug
            <input
              name="slug"
              required
              pattern="[a-z0-9](?:[a-z0-9]|-){1,99}"
              defaultValue={e?.slug}
              readOnly={!!e && kind !== 'author'}
            />
          </label>
          <label>
            介绍
            <textarea name="description" maxLength={3000} defaultValue={e?.bio || e?.description} />
          </label>
          {kind === 'author' && (
            <>
              <label>
                身份 / 头衔
                <input name="title" maxLength={200} defaultValue={e?.title} />
              </label>
              <label>
                关联登录用户 ID（授权作者编辑自己的署名）
                <input name="user_id" defaultValue={e?.user_id || ''} />
              </label>
              <label className="consent-line">
                <input type="checkbox" name="is_example" defaultChecked={e?.is_example} />
                示例作者
              </label>
            </>
          )}
          {kind === 'topic' && (
            <>
              <label>
                专题内容（可多选）
                <select name="post_ids" multiple size={10} defaultValue={assigned}>
                  {posts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="consent-line">
                <input type="checkbox" name="published" defaultChecked={e?.published} />
                公开专题
              </label>
            </>
          )}
        </AdminMediaForm>
        <div className="media-links">
          {(kind === 'author'
            ? authorRows
            : kind === 'topic'
              ? topics
              : kind === 'tag'
                ? tax.tags
                : tax.categories
          ).map((item) => (
            <Link key={item.slug} href={`/admin/media?tab=${tab}&kind=${kind}&item=${item.slug}`}>
              {'name' in item ? item.name : item.title}
            </Link>
          ))}
        </div>
      </>
    );
  }
  return (
    <div className="media-container media-admin">
      <div className="media-admin-head">
        <div>
          <h1>媒体编辑工作台</h1>
          <p>FDE前线 / {role === 'admin' ? '管理员' : role === 'editor' ? '编辑' : '作者'}</p>
        </div>
        <div className="media-links">
          <Link href="/admin/media?edit=new">＋ 新建内容</Link>
          <Link href="/admin">社区运营后台</Link>
        </div>
      </div>
      <nav className="media-admin-nav" aria-label="媒体后台导航">
        {allowedTabs.map(([k, v]) => (
          <Link
            className={tab === k && !edit ? 'active' : ''}
            key={k}
            href={`/admin/media?tab=${k}`}
          >
            {v}
          </Link>
        ))}
      </nav>
      {panel}
    </div>
  );
}
