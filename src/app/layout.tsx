import type { Metadata } from 'next';
import { Header, Footer } from '@/components/site';
import { currentUser } from '@/lib/auth';
import { isDemo, siteUrl } from '@/lib/config';
import './globals.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'FDEOpen · FDE开放社区 — 让企业AI落地更加开放', template: '%s · FDEOpen' },
  description:
    '发现优质 AI 开源项目、Agent Skills 与企业实践场景。连接开发者与真实业务，共建开放的企业 AI 实践生态。',
  openGraph: {
    title: 'FDEOpen · FDE开放社区',
    description: '让企业AI落地更加开放',
    type: 'website',
    locale: 'zh_CN',
    siteName: 'FDEOpen',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: !isDemo(), follow: !isDemo() },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="zh-CN">
      <body>
        <Header user={user} demo={isDemo()} />
        <main id="main">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
