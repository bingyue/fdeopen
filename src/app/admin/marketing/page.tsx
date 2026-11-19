import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isModerator } from '@/lib/validation';
import { db } from '@/lib/db';
import { PageHeading } from '@/components/site';
import { book, membership, purchaseReady } from '@/lib/marketing/config';
export const metadata = { title: '图书与社群转化统计', robots: { index: false, follow: false } };
export default async function MarketingAdmin() {
  const user = await currentUser();
  if (!user) redirect('/login?next=/admin/marketing');
  if (!isModerator(user.role)) notFound();
  const database = await db();
  const [totals, rows] = await Promise.all([
    database.query<{ event: string; count: string }>(
      'SELECT event,sum(count)::text AS count FROM marketing_metrics WHERE day>=CURRENT_DATE-29 GROUP BY event ORDER BY sum(count) DESC',
    ),
    database.query<{
      event: string;
      path: string;
      content_type: string;
      article_id: string;
      placement: string;
      utm_source: string;
      device: string;
      count: string;
    }>(
      'SELECT event,path,content_type,article_id,placement,utm_source,device,sum(count)::text AS count FROM marketing_metrics WHERE day>=CURRENT_DATE-29 GROUP BY event,path,content_type,article_id,placement,utm_source,device ORDER BY sum(count) DESC LIMIT 200',
    ),
  ]);
  return (
    <div className="container page-space">
      <PageHeading
        title="图书与社群转化统计"
        eyebrow="MARKETING OPERATIONS"
        description="最近30个自然日（数据库日期）· 匿名按日聚合 · 明细展示前200组"
      />
      <p className="notice">
        曝光与点击仅用于分析阅读和购买意向，可能包含重复访问。此处不统计支付成功人数、收入或会员资格；成交请以知识星球或售书平台记录为准。
      </p>
      <div className="marketing-two-grid">
        <section className="promo-card">
          <h2>当前运营配置</h2>
          <p>
            图书：{book.enabled ? '已启用' : '已关闭'} · 社群：
            {purchaseReady() ? '正式购买' : 'mock预览，未开售'}
          </p>
          <p>社群配置模式：{membership.mode}</p>
          <p>配置文件：src/lib/marketing/config.ts</p>
          <p>修改配置需经过检查、构建与部署。完整字段说明见仓库 docs/marketing-upgrade.md。</p>
          <Link href="/book">查看图书页 →</Link> · <Link href="/membership">查看社群页 →</Link>
        </section>
        <section className="promo-card">
          <h2>事件汇总</h2>
          {totals.length ? (
            <dl className="marketing-metrics">
              {totals.map((x) => (
                <div key={x.event}>
                  <dt>{x.event}</dt>
                  <dd>{x.count}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p>暂无事件；浏览器隐私设置可能阻止统计。</p>
          )}
        </section>
      </div>
      <h2>来源与位置</h2>
      <div className="table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              {['事件', '页面 / 内容ID', '类型', '位置', '渠道', '设备', '次数'].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((x, i) => (
              <tr key={i}>
                <td>{x.event}</td>
                <td>
                  <Link href={x.path}>{x.path}</Link>
                  <small>{x.article_id}</small>
                </td>
                <td>{x.content_type}</td>
                <td>{x.placement}</td>
                <td>{x.utm_source || '未标记'}</td>
                <td>{x.device}</td>
                <td>{x.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link href="/admin">返回运营后台 →</Link>
    </div>
  );
}
