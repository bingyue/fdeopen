export type SearchParams = Record<string, string | string[] | undefined>;
export const queryText = (params: SearchParams, key: string, max = 100) =>
  typeof params[key] === 'string' ? params[key].trim().slice(0, max) : '';
export function positiveInteger(value: unknown, fallback = 1, max = Number.MAX_SAFE_INTEGER) {
  const n = Number(value);
  return Number.isFinite(n) && n >= 1 ? Math.min(Math.floor(n), max) : fallback;
}
export function pageWindow(page: number, pages: number): (number | 'gap')[] {
  if (pages < 2) return [];
  const visible = [...new Set([1, pages, page - 1, page, page + 1])]
    .filter((n) => n >= 1 && n <= pages)
    .sort((a, b) => a - b);
  const result: (number | 'gap')[] = [];
  visible.forEach((n, i) => {
    if (i && n - visible[i - 1] > 1) result.push('gap');
    result.push(n);
  });
  return result;
}
