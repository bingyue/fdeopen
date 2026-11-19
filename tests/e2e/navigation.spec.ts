import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('simplifies navigation, preserves article links, and removes retired channels', async ({
  page,
  request,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  const desktop = page.getByRole('navigation', { name: '主导航', exact: true });
  await expect(desktop.getByRole('link')).toHaveText([
    '首页',
    '前线观察',
    '企业案例',
    '产业研究',
    'FDE社群',
    '关于我们',
  ]);
  await expect(desktop.getByRole('link', { name: 'FDE社群' })).toHaveAttribute(
    'href',
    '/membership',
  );
  await expect(
    page.locator('a[href="/features"], a[href="/people"], a[href="/events"]'),
  ).toHaveCount(0);
  await expect(page.locator('.home-two-columns')).toHaveCount(0);
  const redirect = await request.get('/features?featured=1', { maxRedirects: 0 });
  expect(redirect.status()).toBe(308);
  expect(redirect.headers().location).toBe('/insights?featured=1');
  await page.goto('/insights');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('前线观察');
  const article = await page.locator('main a[href^="/articles/"]').first().getAttribute('href');
  expect(article).toBeTruthy();
  const legacy = await request.get(article!.replace('/articles/', '/features/'), {
    maxRedirects: 0,
  });
  expect(legacy.status()).toBe(308);
  expect(legacy.headers().location).toBe(article);
  await page.goto(article!);
  await expect(page.locator('main')).toContainText('前线观察');
  for (const path of ['/people', '/events', '/people/retired', '/events/retired'])
    expect((await request.get(path)).status()).toBe(404);
  const sitemap = await (await request.get('/sitemap.xml')).text();
  expect(sitemap).not.toMatch(/\/(features|people|events)(?:\/|<)/);
  expect((await request.get('/book')).status()).toBe(200);
  expect((await request.get('/community')).status()).toBe(200);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByLabel('主导航菜单').click();
  const mobile = page.getByRole('navigation', { name: '移动端导航' });
  await expect(mobile.getByRole('link', { name: '前线观察', exact: true })).toHaveCount(1);
  await expect(
    mobile.getByRole('link', { name: /^(深度|人物|活动|开放社区|FDE图书)$/ }),
  ).toHaveCount(0);
  await mobile.getByRole('link', { name: 'FDE社群', exact: true }).click();
  await expect(page).toHaveURL(/\/membership$/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unifies resource navigation with accessible desktop and mobile disclosures', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await page.locator('main h1').waitFor();
  await expect(page.getByRole('navigation', { name: '社区快捷导航' })).toHaveCount(0);
  const desktop = page.getByRole('navigation', { name: '主导航', exact: true });
  const trigger = desktop.getByText('开源生态', { exact: true });
  const panel = desktop.getByRole('group', { name: '开源生态资源' });
  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(panel).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(panel.getByRole('link', { name: '新手指南', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await page.locator('main h1').click();
  await expect(panel).toBeHidden();
  const destinations = [
    ['新手指南', '/start'],
    ['开源项目', '/projects'],
    ['Skills', '/skills'],
    ['企业场景', '/scenarios'],
    ['动手实践', '/practice'],
    ['开源共创', '/build'],
    ['开放文档', '/docs'],
  ];
  for (const [label, href] of destinations) {
    await trigger.click();
    const link = panel.getByRole('link', { name: label, exact: true });
    await expect(link).toHaveAttribute('href', href);
    await link.click();
    await expect(page).toHaveURL(new RegExp(href + '$'));
    await expect(panel).toBeHidden();
    await expect(trigger).toHaveAttribute('data-active', 'true');
  }
  await trigger.click();
  await expect(panel.getByRole('link', { name: '开放文档', exact: true })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.getByRole('link', { name: 'FDE前线 首页' }).first().focus();
  await expect(panel).toBeHidden();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('主导航菜单').click();
  const mobile = page.getByRole('navigation', { name: '移动端导航' });
  const mobileTrigger = mobile.getByText('开源生态', { exact: true });
  await mobileTrigger.click();
  for (const [label, href] of destinations)
    await expect(mobile.getByRole('link', { name: label, exact: true })).toHaveAttribute(
      'href',
      href,
    );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(mobileTrigger).toBeFocused();
  await expect(mobile).toBeVisible();
  await mobileTrigger.click();
  await mobile.getByRole('link', { name: '动手实践', exact: true }).click();
  await expect(page).toHaveURL(/\/practice$/);
  await expect(page.locator('.mobile-nav')).not.toHaveAttribute('open');
});
