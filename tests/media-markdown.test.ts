import { expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MediaMarkdown, tableOfContents } from '../src/components/media-markdown';
it('renders safe Markdown, tables, headings and code without executing HTML or JS links', () => {
  const body =
    '## 安全标题\n\n<script>alert(1)</script>\n\n[恶意](javascript:alert(1))\n\n| A | B |\n| --- | --- |\n| 1 | 2 |\n\n```js\n## not a heading\nconst value = 1;\n```\n\n### 下一节';
  const html = renderToStaticMarkup(createElement(MediaMarkdown, { body }));
  expect(html).not.toContain('<script');
  expect(html).not.toContain('href="javascript:');
  expect(html).toContain('<table>');
  expect(html).toContain('id="heading-1"');
  expect(html).toContain('const value = 1;');
  expect(tableOfContents(body).map((t) => t.title)).toEqual(['安全标题', '下一节']);
});
