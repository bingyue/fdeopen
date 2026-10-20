import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { MediaEmpty } from '@/components/media';
export const metadata = { title: '我的媒体与合作申请', robots: { index: false, follow: false } };
export default async function Requests() {
  const user = await currentUser();
  if (!user) redirect('/login');
  const rows = await (
    await db()
  ).query<{
    id: string;
    kind: string;
    status: string;
    created_at: string;
    title: string;
    report_id: string;
  }>(
    'SELECT i.id,i.kind,i.status,i.created_at,p.title,p.report_id FROM media_inquiries i LEFT JOIN media_posts p ON p.id=i.post_id WHERE i.user_id=$1 ORDER BY i.created_at DESC LIMIT 100',
    [user.id],
  );
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <span className="media-eyebrow">YOUR REQUESTS</span>
        <h1>我的申请</h1>
        <p>查看资料获取、活动报名与合作申请的处理状态。</p>
      </div>
      <div className="media-links">
        <Link href="/dashboard">返回个人中心</Link>
      </div>
      <div className="media-admin-list">
        {rows.map((r) => (
          <div key={r.id} className="media-admin-item">
            <div>
              <h3>
                {r.title ||
                  {
                    enterprise: '企业需求',
                    expert: '专家合作',
                    cooperation: '投稿合作',
                    report: '研究资料',
                    event: '活动报名',
                  }[r.kind]}
              </h3>
              <p>
                编号 {r.id.slice(0, 8)} ·{' '}
                {
                  { new: '待处理', contacted: '已联系', completed: '已完成', rejected: '未通过' }[
                    r.status
                  ]
                }{' '}
                · {new Date(r.created_at).toLocaleDateString('zh-CN')}
              </p>
            </div>
            {r.kind === 'report' && r.status === 'completed' && r.report_id && (
              <a href={`/api/media/assets/${r.report_id}`}>下载获批报告 ↗</a>
            )}
          </div>
        ))}
      </div>
      {!rows.length && <MediaEmpty title="尚未提交申请" />}
    </div>
  );
}
