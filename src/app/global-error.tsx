'use client';
import Link from 'next/link';
export default function GlobalError({ reset }: { reset: () => void }) {
  // Root layout failures cannot inherit the normal layout or its stylesheet.
  return (
    <html lang="zh-CN">
      <head>
        <title>暂时无法访问 · FDE前线</title>
      </head>
      <body
        style={{
          margin: 0,
          background: '#f7f9fb',
          color: '#17242e',
          fontFamily: "'Helvetica Neue', 'PingFang SC', sans-serif",
        }}
      >
        <main style={{ maxWidth: 560, margin: '12vh auto', padding: '32px 24px', lineHeight: 1.8 }}>
          <p style={{ color: '#154fd1', fontWeight: 700 }}>FDE前线</p>
          <h1 style={{ fontSize: 28 }}>社区暂时无法访问</h1>
          <p>服务遇到了临时问题，请稍后重新加载。</p>
          <button
            onClick={reset}
            style={{
              marginTop: 16,
              marginRight: 20,
              minHeight: 44,
              padding: '10px 20px',
              background: '#2468eb',
              color: '#fff',
              border: 0,
              borderRadius: 8,
              font: 'inherit',
              cursor: 'pointer',
            }}
          >
            重新加载
          </button>
          <Link href="/" style={{ color: '#154fd1', textDecoration: 'underline' }}>
            返回首页
          </Link>
        </main>
      </body>
    </html>
  );
}
