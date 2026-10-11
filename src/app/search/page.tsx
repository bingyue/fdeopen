import { Search } from 'lucide-react';
import { listResources } from '@/lib/catalog';
import { ResourceGrid, PageHeading } from '@/components/site';
import { Button } from '@/components/ui/button';
import { Pagination } from '@/components/pagination';
import { queryText, positiveInteger, type SearchParams } from '@/lib/pagination';
export const metadata = { title: '全站搜索', robots: { index: false, follow: true } };
export default async function Page({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const params = await searchParams;
  const q = queryText(params, 'q');
  const results = await listResources(undefined, {
    q,
    page: positiveInteger(queryText(params, 'page')),
  });
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow="FIND YOUR NEXT BUILD"
        title="发现下一个值得构建的想法"
        description="一起搜索项目、技能、企业场景、文档与共创机会。"
      />
      <form action="/search" className="catalog-search">
        <div className="search-input">
          <Search size={20} />
          <input
            name="q"
            defaultValue={q}
            maxLength={100}
            aria-label="全站搜索关键词"
            placeholder="例如：RAG、外贸、企业交付…"
            autoFocus
          />
        </div>
        <Button>搜索全部</Button>
      </form>
      <p className="result-count">
        找到 {results.count} 个公开资源{q && ` · “${q}”`}
      </p>
      <ResourceGrid resources={results.rows} />
      <Pagination
        page={results.page}
        pages={results.pages}
        href={(page) => `/search?q=${encodeURIComponent(q)}&page=${page}`}
      />
    </div>
  );
}
