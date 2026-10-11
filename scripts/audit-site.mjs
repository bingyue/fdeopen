import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { readFile, writeFile } from 'node:fs/promises';
const base = process.env.AUDIT_BASE_URL || 'http://127.0.0.1:3212';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  reducedMotion: 'reduce',
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
await page.addInitScript(() => {
  window.__fdeLCP = 0;
  window.__fdeCLS = 0;
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__fdeLCP = e.startTime;
  }).observe({ type: 'largest-contentful-paint', buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__fdeCLS += e.value;
  }).observe({ type: 'layout-shift', buffered: true });
});
const report = {
  checkedAt: new Date().toISOString(),
  base,
  routes: [],
  accessibility: [],
  performance: {},
  consoleErrors: errors,
};
await page.goto(base, { waitUntil: 'networkidle' });
report.performance = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0];
  return {
    viewport: '1440x1000',
    network: 'local, unthrottled',
    ttfbMs: Math.round(n.responseStart - n.requestStart),
    domReadyMs: Math.round(n.domContentLoadedEventEnd),
    lcpMs: Math.round(window.__fdeLCP),
    cls: window.__fdeCLS,
    transferBytes: performance.getEntriesByType('resource').reduce((s, r) => s + r.transferSize, 0),
  };
});
for (const route of [
  '/',
  '/projects',
  '/skills',
  '/scenarios',
  '/lab',
  '/build',
  '/developers',
  '/docs',
  '/collections',
  '/about',
  '/privacy',
  '/login',
  '/submit',
  '/search?q=RAG',
  '/robots.txt',
  '/sitemap.xml',
  '/opengraph-image',
]) {
  const r = await context.request.get(base + route);
  report.routes.push({ route, status: r.status() });
}
const data = JSON.parse(await readFile('content/catalog.json', 'utf8'));
const paths = {
  project: 'projects',
  skill: 'skills',
  scenario: 'scenarios',
  task: 'build',
  article: 'docs',
  demo: 'lab',
};
for (const r of data.resources) {
  const route = '/' + paths[r.kind] + '/' + r.slug;
  const response = await context.request.get(base + route);
  report.routes.push({ route, status: response.status() });
}
for (const route of [
  '/',
  '/projects',
  '/projects/ragflow',
  '/skills/rag-architecture',
  '/scenarios/manufacturing-sop',
  '/docs/rag-engineering',
  '/login',
]) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  report.accessibility.push({
    route,
    viewport: 'desktop',
    violations: result.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  });
}
await page.setViewportSize({ width: 390, height: 844 });
for (const route of ['/', '/projects', '/projects/ragflow', '/skills', '/scenarios', '/login']) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const a = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  report.accessibility.push({
    route,
    viewport: '390x844',
    overflow,
    violations: a.violations.map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
  });
}
await page.goto(base + '/docs/rag-engineering');
const anchor = page.getByRole('navigation', { name: '文章目录' }).getByRole('link').last();
await anchor.click();
report.articleAnchor = await page.evaluate(() => {
  const h = location.hash.slice(1);
  return !!document.getElementById(decodeURIComponent(h));
});
await writeFile('docs/site-audit.json', JSON.stringify(report, null, 2));
console.log(
  JSON.stringify(
    {
      routes: report.routes.length,
      failed: report.routes.filter((r) => r.status !== 200),
      a11y: report.accessibility.filter((a) => a.violations.length || a.overflow),
      performance: report.performance,
      articleAnchor: report.articleAnchor,
      errors,
    },
    null,
    2,
  ),
);
await browser.close();
if (
  report.routes.some((r) => r.status !== 200) ||
  report.accessibility.some((a) => a.violations.length || a.overflow) ||
  !report.articleAnchor ||
  errors.length
)
  process.exit(1);
