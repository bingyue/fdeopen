import Link from 'next/link';
import { pageWindow } from '@/lib/pagination';
export function Pagination({
  page,
  pages,
  href,
}: {
  page: number;
  pages: number;
  href: (page: number) => string;
}) {
  if (pages < 2) return null;
  return (
    <nav className="pagination" aria-label="分页">
      {page > 1 && (
        <Link href={href(page - 1)} aria-label="上一页">
          上一页
        </Link>
      )}
      {pageWindow(page, pages).map((n, i) =>
        n === 'gap' ? (
          <span key={`gap-${i}`} aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={n}
            href={href(n)}
            aria-label={`第 ${n} 页`}
            aria-current={page === n ? 'page' : undefined}
          >
            {n}
          </Link>
        ),
      )}
      {page < pages && (
        <Link href={href(page + 1)} aria-label="下一页">
          下一页
        </Link>
      )}
    </nav>
  );
}
