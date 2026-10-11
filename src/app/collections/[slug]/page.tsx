import { notFound } from 'next/navigation';
import { collection } from '@/lib/catalog';
import { PageHeading, ResourceGrid } from '@/components/site';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await collection(slug);
  return { title: c?.title, alternates: { canonical: `/collections/${slug}` } };
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const c = await collection(slug);
  if (!c) notFound();
  return (
    <div className="container page-space">
      <PageHeading eyebrow="COMMUNITY COLLECTION" title={c.title} description={c.summary} />
      {slug === 'hundred-builds' && (
        <div className="notice">
          100
          是长期共建目标，并非当前项目成果数量。优先贡献可复现的部署记录、合成评测、行业示例与原仓库
          PR；不公开客户私密数据。
        </div>
      )}
      <ResourceGrid resources={c.resources} />
    </div>
  );
}
