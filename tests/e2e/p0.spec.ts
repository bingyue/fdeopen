import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('start paths, downloadable practice, retained login destination, media saves and private history', async ({
  page,
}) => {
  await page.goto('/');
  await page
    .getByRole('link', {
      name: '01 / 企业负责人 企业找方案 → 看同行案例，厘清数据与收益口径，形成一个可验证的试点。',
    })
    .click();
  await expect(page).toHaveURL(/start#enterprise/);
  await page.goto('/practice/knowledge-eval');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('知识助手证据与权限验收');
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载完整实践包 ZIP ↓' }).click();
  expect((await download).suggestedFilename()).toBe('knowledge-eval.zip');
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  // Pick an actual published media post from the demo list.
  await page.goto('/cases');
  const link = page.locator('main a[href^="/cases/"]').first();
  const href = await link.getAttribute('href');
  expect(href).toBeTruthy();
  await link.click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
  await expect(page.getByRole('button', { name: '收藏 · 稍后阅读' })).toBeVisible();
  const title = await page.getByRole('heading', { level: 1 }).innerText();
  await page.getByRole('button', { name: '收藏 · 稍后阅读' }).click();
  await expect(page).toHaveURL(/login\?next=/);
  await page.getByLabel('演示访问口令').fill('fdeopen-e2e-only-secret');
  await page.getByRole('button', { name: '以示例开发者体验' }).click();
  await expect(page).toHaveURL(new RegExp(href! + '$'));
  await page.getByRole('button', { name: '收藏 · 稍后阅读' }).click();
  await expect(page.getByRole('button', { name: '已加入稍后阅读' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/projects/ragflow');
  const save = page.getByRole('button', { name: '收藏资源', exact: true });
  if (await save.count()) await save.click();
  await page.goto('/dashboard?tab=bookmarks');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'RAGFlow', exact: true })).toBeVisible();
  await page
    .locator('article.item-panel')
    .filter({ has: page.getByRole('heading', { name: 'RAGFlow', exact: true }) })
    .getByRole('button', { name: '取消收藏' })
    .click();
  await expect(page.getByRole('heading', { name: 'RAGFlow', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await page.goto('/dashboard?tab=history');
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'RAGFlow', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '关闭并清空' }).click();
  await expect(page.getByText('尚无阅读记录。', { exact: false })).toBeVisible();
  await page.goto(href!);
  await page.goto('/dashboard?tab=history');
  await expect(page.getByText('尚无阅读记录。', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: '开启阅读记录' }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/start');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
