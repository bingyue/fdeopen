import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { safeReturnPath, loginHref } from '@/lib/return-path';
import { WelcomeActions } from '@/components/welcome-actions';
import { StartPaths } from '@/components/start-paths';
export const metadata = { title: '欢迎加入', robots: { index: false, follow: false } };
export default async function Welcome({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const next = safeReturnPath((await searchParams).next);
  const user = await currentUser();
  if (!user) redirect(loginHref(next));
  return (
    <div className="container page-space">
      <h1>欢迎，{user.name}</h1>
      <p>
        个人主页默认私密。收藏和最近阅读仅自己可见；阅读记录可在工作台关闭。原页面会保留，你可以直接继续。
      </p>
      <WelcomeActions next={next} />
      <StartPaths />
    </div>
  );
}
