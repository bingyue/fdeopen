import type { Metadata } from 'next';
import { Header, Footer } from '@/components/site';
import { FloatingTools } from '@/components/floating-tools';
import { currentUser } from '@/lib/auth';
import { isDemo, siteUrl } from '@/lib/config';
import './globals.css';
import './media.css';
import './floating-tools.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'FDE前线 · 企业AI转型与智能体产业媒体', template: '%s · FDE前线' },
  description:
    '洞察AI产业变革，记录企业转型实践。关注企业AI转型、智能体产业、FDE工程交付与组织变革。',
  openGraph: {
    title: 'FDE前线 · 企业AI转型与智能体产业媒体',
    description: '洞察AI产业变革，记录企业转型实践',
    type: 'website',
    locale: 'zh_CN',
    siteName: 'FDE前线',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: !isDemo(), follow: !isDemo() },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="zh-CN">
      <body>
        <Header user={user} />
        <main id="main">{children}</main>
        <Footer />
        <FloatingTools />
      </body>
    </html>
  );
}
