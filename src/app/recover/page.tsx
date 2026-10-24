import { notFound } from 'next/navigation';
import { isLocalAuth } from '@/lib/config';
import { safeReturnPath } from '@/lib/return-path';
import { RecoverForm } from '@/components/recovery-forms';
export const metadata = { title: '找回密码', robots: { index: false, follow: false } };
export default async function Recover({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  if (!isLocalAuth()) notFound();
  const next = safeReturnPath((await searchParams).next);
  return (
    <div className="container page-space">
      <div className="login-panel">
        <h1>找回密码</h1>
        <p>使用注册时或账号安全中保存的一次性恢复码。</p>
        <RecoverForm next={next} />
      </div>
    </div>
  );
}
