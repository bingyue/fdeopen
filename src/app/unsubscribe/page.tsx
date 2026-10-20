import { UnsubscribeForm } from '@/components/media-forms';
import { queryText, type SearchParams } from '@/lib/pagination';
export const metadata = { title: '周刊退订', robots: { index: false, follow: false } };
export default async function Unsubscribe({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <div className="media-container media-page">
      <div className="channel-heading">
        <h1>管理周刊订阅</h1>
      </div>
      <UnsubscribeForm token={queryText(await searchParams, 'token')} />
    </div>
  );
}
