import type { DB } from './db';
import { publicMedia } from './media-service';
import { AppError } from './validation';
import { positiveInteger } from './pagination';
export type ReadingItem = {
  id: string;
  title: string;
  summary: string;
  url: string;
  kind: string;
  target: 'media' | 'resource';
  saved_at: string;
};
export async function setMediaBookmark(
  database: DB,
  userId: string,
  postId: string,
  active: boolean,
) {
  if (!active) {
    await database.query('DELETE FROM media_bookmarks WHERE user_id=$1 AND post_id=$2', [
      userId,
      postId,
    ]);
    return;
  }
  const rows = await database.query(
    `INSERT INTO media_bookmarks(user_id,post_id) SELECT $1,p.id FROM media_posts p WHERE p.id=$2 AND ${publicMedia} ON CONFLICT(user_id,post_id) DO UPDATE SET user_id=excluded.user_id RETURNING post_id`,
    [userId, postId],
  );
  if (!rows.length) throw new AppError('内容不存在或已下架', 404);
}
export async function mediaBookmarked(database: DB, userId: string, postId: string) {
  return !!(
    await database.query(
      `SELECT b.post_id FROM media_bookmarks b JOIN media_posts p ON p.id=b.post_id WHERE b.user_id=$1 AND b.post_id=$2 AND ${publicMedia}`,
      [userId, postId],
    )
  ).length;
}
export async function recordReading(
  database: DB,
  userId: string,
  target: 'media' | 'resource',
  id: string,
) {
  await database.transaction(async (tx) => {
    // Serializes writes and the opt-out/clear action, keeping the per-user cap exact.
    const [profile] = await tx.query<{ reading_history_enabled: boolean }>(
      'SELECT reading_history_enabled FROM profiles WHERE user_id=$1 FOR UPDATE',
      [userId],
    );
    if (!profile?.reading_history_enabled) return;
    const col = target === 'media' ? 'post_id' : 'resource_id';
    const source =
      target === 'media'
        ? `media_posts p WHERE p.id=$2 AND ${publicMedia}`
        : "resources p WHERE p.id=$2 AND p.status='published'";
    await tx.query(
      `INSERT INTO reading_history(user_id,${col}) SELECT $1,p.id FROM ${source} ON CONFLICT(user_id,${col}) DO UPDATE SET seen_at=now()`,
      [userId, id],
    );
    await tx.query(
      'DELETE FROM reading_history WHERE user_id=$1 AND coalesce(resource_id,post_id) NOT IN (SELECT coalesce(resource_id,post_id) FROM reading_history WHERE user_id=$1 ORDER BY seen_at DESC,coalesce(resource_id,post_id) LIMIT 100)',
      [userId],
    );
  });
}
export async function configureHistory(database: DB, userId: string, enabled: boolean) {
  await database.transaction(async (tx) => {
    await tx.query('UPDATE profiles SET reading_history_enabled=$2 WHERE user_id=$1', [
      userId,
      enabled,
    ]);
    await tx.query('DELETE FROM reading_history WHERE user_id=$1', [userId]);
  });
}
export async function readingList(
  database: DB,
  userId: string,
  tab: 'bookmarks' | 'history',
  requestedPage = 1,
) {
  const mediaFrom = tab === 'bookmarks' ? 'media_bookmarks' : 'reading_history';
  const resourceFrom = tab === 'bookmarks' ? 'bookmarks' : 'reading_history';
  const time = tab === 'bookmarks' ? 'created_at' : 'seen_at';
  const union = `SELECT p.id,p.title,p.summary,'/' || (CASE p.channel WHEN 'features' THEN 'articles' ELSE p.channel END) || '/' || p.slug AS url,p.channel AS kind,'media' AS target,b.${time} AS saved_at FROM ${mediaFrom} b JOIN media_posts p ON p.id=b.post_id WHERE b.user_id=$1 AND ${publicMedia}
 UNION ALL SELECT r.id,r.title,r.summary,'/' || (CASE r.kind WHEN 'project' THEN 'projects' WHEN 'skill' THEN 'skills' WHEN 'scenario' THEN 'scenarios' WHEN 'demo' THEN 'lab' WHEN 'task' THEN 'build' ELSE 'docs' END) || '/' || r.slug,r.kind,'resource',b.${time} FROM ${resourceFrom} b JOIN resources r ON r.id=b.resource_id WHERE b.user_id=$1 AND r.status='published'`;
  const [{ count }] = await database.query<{ count: number }>(
    `SELECT count(*)::int count FROM (${union}) items`,
    [userId],
  );
  const pages = Math.ceil(count / 12),
    page = Math.min(positiveInteger(requestedPage), Math.max(1, pages));
  const saved = await database.query<ReadingItem>(
    `SELECT * FROM (${union}) items ORDER BY saved_at DESC,target,id LIMIT 12 OFFSET $2`,
    [userId, (page - 1) * 12],
  );
  return { saved, page, pages };
}
