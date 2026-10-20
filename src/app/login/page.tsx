import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { isDemo, isLocalAuth } from '@/lib/config';
import { Logo } from '@/components/site';
import { LoginForm } from '@/components/forms';
import { AccountLoginForm } from '@/components/account-forms';
export const metadata = { title: '加入社区', robots: { index: false, follow: false } };
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await currentUser()) redirect('/dashboard');
  const p = await searchParams;
  return (
    <div className="container page-space">
      <div className="login-panel">
        <Logo />
        <h1>下一次构建，从这里开始</h1>
        <p>
          收藏值得关注的资源，发布你的项目，
          <br />
          和社区一起留下真实贡献。
        </p>
        {isLocalAuth() ? (
          <AccountLoginForm />
        ) : (
          <LoginForm
            demo={isDemo()}
            accessKeyRequired={!!process.env.DEMO_ACCESS_KEY}
            error={!!p.error}
          />
        )}
        <div className="notice">
          公开资源无需登录即可阅读。
          {isLocalAuth()
            ? '注册账号后可收藏、投稿及参与社区。个人主页默认私密。'
            : 'GitHub 登录仅用于建立身份，社区不会申请你的私有仓库权限。'}
        </div>
        <p className="login-note">
          继续即表示你理解并接受 <Link href="/privacy">隐私与社区规则</Link>。
        </p>
      </div>
    </div>
  );
}
