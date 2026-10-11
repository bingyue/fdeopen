'use client';
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container error-page">
      <h1>暂时无法加载内容</h1>
      <p>服务遇到了临时问题，请稍后重试。</p>
      <button className="btn btn-primary" onClick={reset}>
        重新加载
      </button>
    </div>
  );
}
