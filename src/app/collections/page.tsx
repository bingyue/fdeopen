import { collections } from '@/lib/catalog';
import { PageHeading, CollectionCard } from '@/components/site';
export const metadata = { title: '社区专题', alternates: { canonical: '/collections' } };
export default async function Page() {
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="CURATED COLLECTIONS"
        title="为一个目标，找到一组好工具"
        description="沿着精选主题探索项目、技能与实践路径。"
      />
      <div className="collection-grid">
        {(await collections()).map((c) => (
          <CollectionCard key={c.id} c={c} />
        ))}
      </div>
    </div>
  );
}
