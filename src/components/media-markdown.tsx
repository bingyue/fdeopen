import { createElement } from 'react';
import Markdown, { type Components, defaultUrlTransform } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import Image from 'next/image';
export function tableOfContents(body: string) {
  let fenced = false;
  return body.split('\n').flatMap((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) {
      fenced = !fenced;
      return [];
    }
    const match = !fenced && /^(#{1,4})\s+(.+?)(?:\s+#+)?$/.exec(line);
    return match
      ? [
          {
            id: `heading-${index + 1}`,
            depth: match[1].length,
            title: match[2].replace(/[*_`]/g, ''),
          },
        ]
      : [];
  });
}
const heading: Components['h2'] = ({ children, node }) =>
  createElement(
    node?.tagName === 'h1' ? 'h2' : node?.tagName || 'h2',
    { id: `heading-${node?.position?.start.line}` },
    children,
  );
const components: Components = {
  h1: heading,
  h2: heading,
  h3: heading,
  h4: heading,
  a: ({ href, children }) => (
    <a
      href={href}
      rel={href?.startsWith('https:') ? 'noreferrer' : undefined}
      target={href?.startsWith('https:') ? '_blank' : undefined}
    >
      {children}
    </a>
  ),
  img: ({ src, alt, title }) =>
    typeof src === 'string' && /^\/api\/media\/assets\/[a-f0-9-]{36}$/.test(src) ? (
      <span className="article-figure">
        <Image
          src={src}
          alt={alt || '文章配图'}
          title={title}
          width={1200}
          height={800}
          unoptimized
        />
        <span className="image-caption">{title || alt}</span>
      </span>
    ) : (
      <span className="image-caption">{alt || '配图'}（请在后台上传图片）</span>
    ),
  table: ({ children }) => (
    <div className="article-table-wrap">
      <table>{children}</table>
    </div>
  ),
};
export function MediaMarkdown({ body }: { body: string }) {
  return (
    <div className="media-prose">
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={components}
        urlTransform={defaultUrlTransform}
      >
        {body}
      </Markdown>
    </div>
  );
}
