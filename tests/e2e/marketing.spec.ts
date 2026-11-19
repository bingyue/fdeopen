import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('publication, free ecosystem and mock membership work on desktop and mobile', async ({
  page,
  request,
  baseURL,
}) => {
  await page.goto('/');
  await expect(page.locator('.book-feature')).toBeVisible();
  const order = await page
    .locator('.start-paths,.front-cover,.book-feature,.media-main-grid')
    .evaluateAll((nodes) => nodes.map((n) => n.className.trim()));
  expect(order).toEqual(['book-feature', 'start-paths', 'front-cover', 'media-main-grid']);
  await page.locator('.book-feature').getByRole('link', { name: '了解图书' }).click();
  await expect(page).toHaveURL(/\/book$/);
  await expect(page.locator('.book-toc details')).toHaveCount(12);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', baseURL + '/book');
  expect(await page.locator('script[type="application/ld+json"]').first().textContent()).toContain(
    '9787302729556',
  );
  await expect(page.locator('#buy a').first()).toHaveAttribute(
    'href',
    'https://item.jd.com/10239039021503.html',
  );
  const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
  expect(a11y.violations).toEqual([]);
  await page.goto('/membership?utm_source=qa');
  await expect(page.locator('.membership-purchase-card')).toContainText('方案预览');
  await expect(page.locator('.membership-purchase-card button')).toBeDisabled();
  expect(
    await page.locator('script[type="application/ld+json"]').first().textContent(),
  ).not.toContain('Offer');
  await expect(page.getByText('399')).toHaveCount(0);
  await expect(page.locator('.purchase-qr')).toHaveCount(0);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.mobile-purchase-bar')).toBeVisible();
  await expect(page.locator('.media-floating-tools')).toBeHidden();
  for (const route of ['/membership', '/book', '/community', '/projects', '/projects/ragflow']) {
    await page.goto(route);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await expect(page.locator('.bottom-conversion')).toContainText('Awesome-FDE');
  await page.goto('/community');
  await expect(page.locator('.awesome-promo')).toContainText('免费开放');
  await page.getByLabel('主导航菜单').click();
  await expect(
    page.getByRole('navigation', { name: '移动端导航' }).getByRole('link', { name: 'FDE图书' }),
  ).toHaveCount(0);
  await expect(
    page
      .getByRole('navigation', { name: '移动端导航' })
      .getByRole('link', { name: '加入实战社群' }),
  ).toBeVisible();
  await page.goto('/cases');
  await page.locator('main a[href^="/cases/"]').first().click();
  await expect(page.locator('.bottom-conversion > .promo-card').first()).toContainText(
    '从阅读到实践',
  );
  await page.screenshot({ path: 'test-results/marketing-mobile.png', fullPage: true });
  const payload = {
    event: 'book_purchase_click',
    path: '/book',
    contentType: 'book',
    articleId: '',
    placement: 'book-page',
    utmSource: 'qa',
    device: 'desktop',
  };
  expect(
    (
      await request.post('/api/marketing/events', { headers: { origin: baseURL! }, data: payload })
    ).status(),
  ).toBe(204);
  expect(
    (
      await request.post('/api/marketing/events', {
        headers: { origin: 'https://evil.example' },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post('/api/marketing/events', {
        headers: { origin: baseURL! },
        data: { ...payload, event: 'payment_success' },
      })
    ).status(),
  ).toBe(400);
  await page.goto('/admin/marketing');
  await expect(page).toHaveURL(/\/login\?next=/);
});
