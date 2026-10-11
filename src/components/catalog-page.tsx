import Link from 'next/link';
import { Search, SlidersHorizontal, ArrowRight, Plus } from 'lucide-react';
import { listResources, filterOptions } from '@/lib/catalog';
import { kinds, type Kind } from '@/lib/types';
import { ResourceGrid, PageHeading } from './site';
import { Button } from './ui/button';
import { Pagination } from './pagination';
import { queryText, positiveInteger } from '@/lib/pagination';
const descriptions: Record<Kind, string> = {
  project: '发现值得复用的开源项目，从原作者的实践开始你的下一次构建。',
  skill: '让专业经验成为可复用的技能，连接 Agent、工具与真实工作。',
  scenario: '以业务问题为起点，找到可验证的 AI 方案、项目与 Skills。',
  demo: '在原项目中探索应用体验，阅读示例输入输出与部署路径。',
  task: '从一份文档、一个测试、一次复现开始，留下可确认的开源贡献。',
  article: '开放阅读，持续迭代。从工程方法到可交付的行业实践。',
};
export function parseFilters(params: Record<string, string | string[] | undefined>) {
  const get = (k: string) => queryText(params, k);
  return {
    q: get('q'),
    category: get('category'),
    license: get('license'),
    language: get('language'),
    sort: get('sort'),
    page: positiveInteger(get('page')),
  };
}
export async function CatalogPage({
  kind,
  params,
}: {
  kind: Kind;
  params: Record<string, string | string[] | undefined>;
}) {
  const f = parseFilters(params);
  const [result, options] = await Promise.all([listResources(kind, f), filterOptions(kind)]);
  const base = kinds[kind].path;
  const link = (changes: Record<string, string>) => {
    const sp = new URLSearchParams(
      Object.entries({ ...f, page: String(f.page), ...changes }).filter(([, v]) => v),
    );
    return `${base}?${sp}`;
  };
  return (
    <div className="container page-space">
      <PageHeading
        eyebrow={kinds[kind].en.toUpperCase()}
        title={kinds[kind].label}
        description={descriptions[kind]}
      >
        <Button asChild>
          <Link
            href={`/submit?type=${['project', 'skill', 'scenario'].includes(kind) ? kind : 'project'}`}
          >
            <Plus size={16} />
            贡献资源
          </Link>
        </Button>
      </PageHeading>
      {kind === 'scenario' && (
        <div className="notice">
          <strong>场景是方案的起点。</strong>{' '}
          当前收录为编辑整理的方案示例，业务价值需通过企业试点验证。
          <Link href="/submit?type=requirement">
            私密提交企业需求 <ArrowRight size={14} />
          </Link>
        </div>
      )}
      {kind === 'demo' && (
        <div className="notice">
          体验入口来自项目原站，部分服务可能需要独立账号。示例输出用于解释工作方式；本站不执行第三方仓库代码。
        </div>
      )}
      {kind === 'task' && (
        <div className="notice">
          共建流程：申请认领 → 维护者审核 → 提交 GitHub PR →
          确认贡献。无需付费，暂无悬赏与资金托管。
        </div>
      )}
      <div className="catalog-layout">
        <aside className="filters">
          <div className="filter-heading">
            <SlidersHorizontal size={16} />按{kind === 'scenario' ? '行业' : '分类'}探索
          </div>
          <Link className={!f.category ? 'selected' : ''} href={link({ category: '', page: '1' })}>
            全部{kinds[kind].label}
            <span>{!f.category ? result.count : ''}</span>
          </Link>
          {options.categories.map((c) => (
            <Link
              className={c === f.category ? 'selected' : ''}
              key={c}
              href={link({ category: c, page: '1' })}
            >
              {c}
            </Link>
          ))}
          <div className="filter-note">
            <BoxIcon />
            <b>Build in the open.</b>
            <p>保留来源，尊重许可。一起让优秀实践被更多人发现。</p>
            <Link href="/submit">提交你发现的资源 ↗</Link>
          </div>
        </aside>
        <div className="catalog-main">
          <form className="catalog-search" action={base}>
            <div className="search-input">
              <Search size={18} />
              <input
                name="q"
                aria-label="搜索关键词"
                placeholder={`搜索${kinds[kind].label}…`}
                defaultValue={f.q}
                maxLength={100}
              />
            </div>
            {f.category && <input type="hidden" name="category" value={f.category} />}
            <select name="sort" aria-label="排序方式" defaultValue={f.sort}>
              <option value="">精选优先</option>
              <option value="newest">最新收录</option>
              <option value="popular">收藏最多</option>
              {kind === 'project' && (
                <>
                  <option value="stars">GitHub Stars</option>
                  <option value="active">最近活跃</option>
                </>
              )}
            </select>
            <Button type="submit">搜索</Button>
            {kind === 'project' && (
              <div className="advanced-filters">
                <label>
                  语言
                  <select name="language" defaultValue={f.language}>
                    <option value="">全部语言</option>
                    {options.languages.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <label>
                  许可
                  <select name="license" defaultValue={f.license}>
                    <option value="">全部许可</option>
                    {options.licenses.map((v) => (
                      <option key={v}>{v}</option>
                    ))}
                  </select>
                </label>
                <Link href={base}>清除筛选</Link>
              </div>
            )}
          </form>
          <div className="result-count">
            <span>
              找到 <b>{result.count}</b> 个{kind === 'skill' ? '技能资源' : kinds[kind].label}
              {f.q && ` · “${f.q}”`}
            </span>
            <span>开放发现，自由探索</span>
          </div>
          <ResourceGrid resources={result.rows} />
          <Pagination
            page={result.page}
            pages={result.pages}
            href={(page) => link({ page: String(page) })}
          />
        </div>
      </div>
    </div>
  );
}
function BoxIcon() {
  return <span className="filter-box">〈 / 〉</span>;
}
