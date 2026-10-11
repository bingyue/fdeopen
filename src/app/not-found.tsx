import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="container error-page">
      <span className="eyebrow">404 · KEEP EXPLORING</span>
      <h1>这个页面还没有开放</h1>
      <p>内容可能尚未发布、已下架，或链接有误。</p>
      <Link className="btn btn-primary" href="/projects">
        返回项目库
      </Link>
    </div>
  );
}
