import { createHmac, timingSafeEqual } from 'node:crypto';
import { db } from './db';
import { AppError, githubRepo } from './validation';
export type GithubMetadata = {
  repo: string;
  name: string;
  description: string;
  stars: number;
  language: string;
  license: string;
  licenseUrl: string;
  readme: string;
  sourceAuthor: string;
  url: string;
  defaultBranch: string;
  pushedAt: string;
  checkedAt: string;
  archived: boolean;
};
export function verifySignature(raw: string, signature: string | null, secret: string) {
  if (!signature || !/^sha256=[a-f0-9]{64}$/.test(signature) || !secret) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(raw).digest('hex');
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
export async function fetchGithub(url: string, force = false): Promise<GithubMetadata> {
  const repo = githubRepo(url);
  const database = await db();
  const cached = (
    await database.query<{ data: GithubMetadata; etag: string; checked_at: string }>(
      'SELECT * FROM github_cache WHERE repo=$1',
      [repo],
    )
  )[0];
  if (cached && !force && Date.now() - new Date(cached.checked_at).getTime() < 6 * 3600000)
    return cached.data;
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'FDEOpen/1.0',
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  if (cached?.etag) headers['If-None-Match'] = cached.etag;
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers,
    redirect: 'error',
    signal: AbortSignal.timeout(15000),
    cache: 'no-store',
  });
  if (response.status === 304 && cached) {
    const data = { ...cached.data, checkedAt: new Date().toISOString() };
    await database.query('UPDATE github_cache SET checked_at=now(),data=$2 WHERE repo=$1', [
      repo,
      JSON.stringify(data),
    ]);
    return data;
  }
  if (response.status === 403 || response.status === 429)
    throw new AppError('GitHub API 配额不足，请稍后同步或配置服务端 GITHUB_TOKEN', 503);
  if (!response.ok)
    throw new AppError(
      response.status === 404 ? 'GitHub 仓库不存在或不是公开仓库' : 'GitHub 暂时不可用，请稍后再试',
      response.status === 404 ? 404 : 502,
    );
  const r = await response.json();
  if (r.private) throw new AppError('只收录公开仓库');
  let readme = cached?.data.readme || '';
  const readmeHeaders = { ...headers };
  delete readmeHeaders['If-None-Match'];
  try {
    const rr = await fetch(`https://api.github.com/repos/${repo}/readme`, {
      headers: readmeHeaders,
      redirect: 'error',
      signal: AbortSignal.timeout(10000),
      cache: 'no-store',
    });
    if (rr.ok) {
      const body = await rr.json();
      if (body.content && body.size < 100000)
        readme = Buffer.from(body.content, 'base64').toString('utf8').slice(0, 40000);
    }
  } catch {
    /* metadata remains useful if README is unavailable */
  }
  const metadata: GithubMetadata = {
    repo: r.full_name,
    name: r.name,
    description: r.description || '',
    stars: r.stargazers_count,
    language: r.language || 'Markdown',
    license:
      r.license?.spdx_id === 'NOASSERTION' ? '自定义 / 多重许可' : r.license?.spdx_id || '未声明',
    licenseUrl: `${r.html_url}/blob/${r.default_branch}/LICENSE`,
    readme,
    sourceAuthor: r.owner.login,
    url: r.html_url,
    defaultBranch: r.default_branch,
    pushedAt: r.pushed_at,
    checkedAt: new Date().toISOString(),
    archived: r.archived,
  };
  await database.query(
    'INSERT INTO github_cache(repo,data,etag) VALUES($1,$2,$3) ON CONFLICT(repo) DO UPDATE SET data=excluded.data,etag=excluded.etag,checked_at=now()',
    [repo, JSON.stringify(metadata), response.headers.get('etag') || ''],
  );
  return metadata;
}
export async function syncGithub(repoFilter?: string) {
  const database = await db();
  const repo = repoFilter ? githubRepo(`https://github.com/${repoFilter}`) : undefined;
  // Apply a webhook's repository filter before any batch limit.
  const rows = await database.query<{ id: string; source_url: string }>(
    `SELECT id,source_url FROM resources WHERE kind='project' AND status='published'
     AND source_url LIKE 'https://github.com/%'
     ${repo ? "AND lower(regexp_replace(source_url,'(\\.git)?/?$',''))=$1" : ''}
     ORDER BY updated_at,id ${repo ? '' : 'LIMIT 25'}`,
    repo ? [`https://github.com/${repo.toLowerCase()}`] : [],
  );
  const results: { id: string; ok: boolean; error?: string }[] = [];
  // Bound upstream concurrency while keeping a slow repository from serializing the batch.
  for (let offset = 0; offset < rows.length; offset += 3) {
    results.push(
      ...(await Promise.all(
        rows.slice(offset, offset + 3).map(async (r) => {
          try {
            const g = await fetchGithub(r.source_url, !!repo);
            await database.query(
              'UPDATE resources SET metadata=metadata||$2::jsonb,updated_at=now() WHERE id=$1',
              [
                r.id,
                JSON.stringify({
                  repo: g.repo,
                  stars: g.stars,
                  language: g.language,
                  checkedAt: g.checkedAt,
                  pushedAt: g.pushedAt,
                  readme: g.readme,
                  archived: g.archived,
                  defaultBranch: g.defaultBranch,
                }),
              ],
            );
            return { id: r.id, ok: true };
          } catch (e) {
            return {
              id: r.id,
              ok: false,
              error: e instanceof AppError ? e.message : 'GitHub 同步失败',
            };
          }
        }),
      )),
    );
  }
  return results;
}
