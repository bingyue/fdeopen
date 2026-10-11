import Link from 'next/link';
import { developers } from '@/lib/catalog';
import { PageHeading, DeveloperCard, Empty } from '@/components/site';
import { Button } from '@/components/ui/button';
export const metadata = { title: '开发者', alternates: { canonical: '/developers' } };
export default async function Page() {
  const people = await developers();
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="PEOPLE BEHIND THE BUILD"
        title="认识构建开放未来的人"
        description="用公开作品与可确认的贡献展示能力，在真实项目中建立连接。"
      >
        <Button asChild>
          <Link href="/dashboard">建立个人主页</Link>
        </Button>
      </PageHeading>
      <div className="notice">
        个人档案由开发者自主选择公开，贡献记录需要管理员确认。演示身份有明确标记，不计为真实社区成员。
      </div>
      {people.length ? (
        <div className="developer-grid">
          {people.map((p) => (
            <DeveloperCard key={p.user_id} p={p} />
          ))}
        </div>
      ) : (
        <Empty
          title="成为第一批社区贡献者"
          description="登录并公开你的开发者档案，让更多人了解你的方向。"
          href="/login"
          label="加入社区"
        />
      )}
    </div>
  );
}
