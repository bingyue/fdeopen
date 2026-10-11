import Link from 'next/link';
import { queryText, type SearchParams } from '@/lib/pagination';
import { currentUser } from '@/lib/auth';
import { getResource } from '@/lib/catalog';
import { PageHeading, Empty } from '@/components/site';
import { SubmissionForm } from '@/components/forms';
export const metadata = { title: '提交资源与需求', robots: { index: false, follow: true } };
export default async function Submit({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await currentUser();
  const params = await searchParams;
  const type = queryText(params, 'type'),
    edit = queryText(params, 'edit');
  const r = edit ? await getResource(edit) : null;
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="CONTRIBUTE TO THE OPEN"
        title="让你的实践，成为别人的起点"
        description="好的项目、技能和行业经验，值得被更多人发现。"
      />
      {!user ? (
        <Empty
          title="登录后提交你的资源"
          description="公开内容无需登录。提交资源需要一个可跟进审核进度的社区身份。"
          href="/login"
          label="登录并开始贡献"
        />
      ) : edit &&
        (!r || r.owner_id !== user.id || !['project', 'skill', 'scenario'].includes(r.kind)) ? (
        <Empty
          title="无法编辑这项资源"
          description="仅发布者可以提交更新，其他改进建议可通过详情页反馈。"
          href="/dashboard"
          label="返回工作台"
        />
      ) : (
        <div className="submit-layout">
          <SubmissionForm
            key={r?.id || type || 'project'}
            initialType={r?.kind || type}
            initial={
              r
                ? {
                    title: r.title,
                    summary: r.summary,
                    category: r.category,
                    sourceUrl: r.source_url,
                    sourceAuthor: r.source_author,
                    license: r.license,
                    tags: r.tags,
                    existingResourceId: r.id,
                  }
                : undefined
            }
          />
          <aside className="form-aside">
            <h3>每一次分享，都让社区更好</h3>
            <ol>
              <li>保留原项目、作者与许可信息。</li>
              <li>说明真实适用场景和使用边界。</li>
              <li>避免上传客户信息或访问密钥。</li>
              <li>编辑完成审核后，内容获得独立详情页。</li>
            </ol>
            <hr />
            <h3>企业需求，默认私密</h3>
            <p>
              联系信息与原始业务描述只对本人和审核人员可见。公开共创需要你的明确授权与编辑脱敏。
            </p>
            <hr />
            <Link href="/privacy" className="text-link">
              阅读社区规则 ↗
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
