import { db } from './db';
import { summaryColumns } from './catalog';
import { positiveInteger } from './pagination';
import type { Application, ResourceSummary, Submission, Kind } from './types';
export const workspaceTabs = [
  'overview',
  'bookmarks',
  'submissions',
  'applications',
  'profile',
] as const;
export type WorkspaceTab = (typeof workspaceTabs)[number];
type LinkedSubmission = Submission & { resource_slug: string | null; resource_kind: Kind | null };
export async function workspaceData(userId: string, tab: WorkspaceTab, requestedPage = 1) {
  const data = {
    saved: [] as ResourceSummary[],
    submissions: [] as LinkedSubmission[],
    apps: [] as Application[],
    notifications: [] as { id: string; message: string; read: boolean; created_at: string }[],
    owned: [] as ResourceSummary[],
    stats: { saved: 0, submissions: 0, applications: 0, completed: 0 },
    page: 1,
    pages: 0,
  };
  if (tab === 'profile') return data;
  const database = await db();
  const from = {
    bookmarks:
      "resources r JOIN bookmarks b ON b.resource_id=r.id WHERE b.user_id=$1 AND r.status='published'",
    submissions:
      "submissions s LEFT JOIN resources r ON r.id=s.resource_id AND r.status='published' WHERE s.user_id=$1",
    applications: 'task_applications a JOIN resources r ON r.id=a.task_id WHERE a.user_id=$1',
    overview: "resources r WHERE r.owner_id=$1 AND r.status='published'",
  }[tab];
  const [{ count }] = await database.query<{ count: number }>(
    `SELECT count(*)::int count FROM ${from}`,
    [userId],
  );
  data.pages = Math.ceil(count / 12);
  data.page = Math.min(positiveInteger(requestedPage), Math.max(1, data.pages));
  const params = [userId, (data.page - 1) * 12];
  const limit = 'LIMIT 12 OFFSET $2';
  if (tab === 'bookmarks')
    data.saved = await database.query<ResourceSummary>(
      `SELECT ${summaryColumns} FROM ${from} ORDER BY b.created_at DESC,r.id ${limit}`,
      params,
    );
  if (tab === 'submissions')
    data.submissions = await database.query<LinkedSubmission>(
      `SELECT s.*,r.slug resource_slug,r.kind resource_kind FROM ${from} ORDER BY s.created_at DESC,s.id ${limit}`,
      params,
    );
  if (tab === 'applications')
    data.apps = await database.query<Application>(
      `SELECT a.*,r.title FROM ${from} ORDER BY a.created_at DESC,a.id ${limit}`,
      params,
    );
  if (tab === 'overview') {
    const [stats, notifications, owned] = await Promise.all([
      database.query<typeof data.stats>(
        `SELECT
        (SELECT count(*)::int FROM bookmarks b JOIN resources r ON r.id=b.resource_id WHERE b.user_id=$1 AND r.status='published') saved,
        (SELECT count(*)::int FROM submissions WHERE user_id=$1) submissions,
        (SELECT count(*)::int FROM task_applications WHERE user_id=$1) applications,
        (SELECT count(*)::int FROM task_applications WHERE user_id=$1 AND status='completed') completed`,
        [userId],
      ),
      database.query<(typeof data.notifications)[number]>(
        'SELECT id,message,read,created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC,id LIMIT 50',
        [userId],
      ),
      database.query<ResourceSummary>(
        `SELECT ${summaryColumns} FROM ${from} ORDER BY r.created_at DESC,r.id ${limit}`,
        params,
      ),
    ]);
    data.stats = stats[0];
    data.notifications = notifications;
    data.owned = owned;
  }
  return data;
}
