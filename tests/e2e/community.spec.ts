import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const secret = 'fdeopen-e2e-only-secret';
async function login(page: Page, role: 'member' | 'admin' = 'member') {
  await page.goto('/login');
  await page.getByLabel('演示访问口令').fill(secret);
  await page
    .getByRole('button', { name: role === 'admin' ? '以示例管理员体验' : '以示例开发者体验' })
    .click();
  await expect(page).toHaveURL(/dashboard/);
}
async function logout(page: Page) {
  await page.goto('/dashboard');
  await page.getByRole('button', { name: '退出登录' }).click();
  await expect(page).toHaveURL(/\/$/);
}
test('public discovery, detail, MDX, SEO, responsive layout and accessibility', async ({
  page,
}) => {
  await page.goto('/community');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('让企业 AI 落地');
  await page.screenshot({ path: 'docs/screenshots/home-desktop.png', fullPage: true });
  await page.getByRole('textbox', { name: '搜索项目、Skills 或企业场景' }).fill('RAGFlow');
  await page.getByRole('button', { name: '开始搜索' }).click();
  await expect(page.getByRole('heading', { name: 'RAGFlow', exact: true })).toBeVisible();
  await page.getByRole('heading', { name: 'RAGFlow', exact: true }).getByRole('link').click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('RAGFlow');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    /\/projects\/ragflow$/,
  );
  await expect(page.locator('script[type="application/ld+json"]')).toHaveCount(1);
  await page.goto('/docs/rag-engineering');
  await expect(page.getByRole('heading', { name: '数据权限比检索更早' })).toBeVisible();
  await page.goto('/skills/rag-architecture');
  await expect(page.getByText('fde export codex', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: '查看原始资源' })).toHaveAttribute(
    'href',
    /blob\/master\//,
  );
  await page.goto('/community');
  const desktop = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  expect(
    desktop.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => ({ target: n.target, summary: n.failureSummary })),
    })),
  ).toEqual([]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'docs/screenshots/home-mobile.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByText('菜单', { exact: true }).click();
  await page.getByRole('navigation').getByRole('link', { name: '企业场景', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('企业场景');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
test('member submits and bookmarks; admin publishes; member updates; task becomes confirmed contribution', async ({
  page,
}) => {
  await login(page);
  await page.goto('/projects/ragflow');
  await page.getByRole('button', { name: '收藏资源', exact: true }).click();
  await expect(page.getByRole('button', { name: '已收藏' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await page.goto('/dashboard?tab=bookmarks');
  await expect(page.getByRole('heading', { name: 'RAGFlow' })).toBeVisible();
  await page.goto('/submit');
  await page.getByLabel('GitHub 仓库地址').fill('https://github.com/fdeopen/sample');
  await page.getByLabel('资源名称').fill('E2E 社区知识助手');
  await page
    .getByLabel('介绍与适用场景')
    .fill('面向企业知识问答的开源实践示例，包含权限隔离、引用校验与人工复核。');
  await page.getByLabel('作者 / 维护方').fill('E2E 示例作者');
  await page.getByLabel('开源许可').fill('MIT');
  await page.getByRole('button', { name: '提交审核', exact: true }).click();
  await expect(page.getByRole('heading', { name: '投稿已进入审核队列' })).toBeVisible();
  await page.goto('/build/first-deployment');
  await page
    .getByLabel('你计划如何完成这项贡献？')
    .fill('整理隔离环境的安装步骤与复现日志，并提交经过检查的部署说明文档。');
  await page.getByRole('button', { name: '申请认领', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('申请已提交');
  await page.goto('/projects/ragflow');
  await page.getByLabel('写下你的实践或问题').fill('E2E：部署文档已复现，建议补充依赖版本说明。');
  await page.getByRole('button', { name: '提交讨论', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('审核队列');
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin?tab=submissions');
  const submission = page
    .locator('.item-panel')
    .filter({ has: page.getByRole('heading', { name: 'E2E 社区知识助手' }) });
  await submission.getByRole('button', { name: '审核通过并发布' }).click();
  await expect(submission.locator('.state').first()).toHaveText('已通过');
  await page.goto('/admin?tab=applications');
  await page.getByRole('button', { name: '接受认领' }).click();
  await expect(page.locator('.item-panel .state')).toHaveText('已接受');
  await page.goto('/admin?tab=comments');
  await page.getByRole('button', { name: '审核通过', exact: true }).click();
  await expect(page.locator('.state')).toHaveText('已通过');
  await logout(page);
  await login(page);
  await page.goto('/dashboard?tab=applications');
  await page.getByLabel('GitHub PR 链接').fill('https://github.com/fdeopen/sample/pull/1');
  await page.getByRole('button', { name: '提交 PR 供确认' }).click();
  await expect(page.locator('.item-panel .state')).toHaveText('PR 待确认');
  await page.goto('/search?q=E2E');
  await page
    .getByRole('heading', { name: 'E2E 社区知识助手', exact: true })
    .getByRole('link')
    .click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('E2E 社区知识助手');
  await page.goto('/dashboard');
  await page.getByRole('link', { name: '提交更新' }).click();
  await page
    .getByLabel('介绍与适用场景')
    .fill('E2E 更新后的知识助手介绍：新增权限验证与失败样本，确保每个结论都可追溯。');
  await page.getByRole('button', { name: '提交审核', exact: true }).click();
  await expect(page.getByRole('heading', { name: '投稿已进入审核队列' })).toBeVisible();
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin?tab=applications');
  await page.getByRole('button', { name: '已核实交付，确认贡献' }).click();
  await expect(page.locator('.item-panel .state')).toHaveText('贡献已确认');
  await page.goto('/developers/demo-builder');
  await expect(
    page.getByRole('link', { name: '为开源项目补充一份可复现部署记录 查看 PR' }),
  ).toBeVisible();
});
test('private requirement, server authorization, CSRF, settings and resource edit', async ({
  page,
  request,
}) => {
  expect(
    (
      await request.post('/api/resource', {
        headers: { Origin: `http://127.0.0.1:${process.env.FDE_E2E_PORT || 3211}` },
        data: {},
      })
    ).status(),
  ).toBe(401);
  expect(
    (
      await request.post('/api/demo-login', {
        headers: { Origin: 'https://evil.example' },
        data: { role: 'admin', accessKey: secret },
      })
    ).status(),
  ).toBe(403);
  await login(page);
  const denied = await page.request.post('/api/role', {
    headers: { Origin: `http://127.0.0.1:${process.env.FDE_E2E_PORT || 3211}` },
    data: { id: '00000000-0000-4000-8000-000000000001', role: 'admin', disabled: false },
  });
  expect(denied.status()).toBe(403);
  await page.goto('/submit?type=requirement');
  await page.getByLabel('需求标题').fill('私密企业运营改进');
  await page
    .getByLabel('业务问题与预期交付')
    .fill('E2E_PRIVATE_PAYLOAD_NEVER_PUBLIC 这是需要私下沟通的公司内部数据与业务需求。');
  await page.getByLabel('联系信息（仅本人及审核人员可见）').fill('private-e2e@example.com');
  await page.getByRole('button', { name: '私密提交需求' }).click();
  await expect(page.getByRole('heading', { name: '企业需求已私密提交' })).toBeVisible();
  await page.goto('/search?q=E2E_PRIVATE');
  await expect(page.getByText('找到 0 个公开资源', { exact: false })).toBeVisible();
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin?tab=requirements');
  await expect(page.getByText('private-e2e@example.com', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: '发布脱敏共创任务' })).toBeDisabled();
  await page.goto('/admin?tab=settings');
  await page.getByLabel('社区公告').fill('E2E 验收公告 · 一起开放共建');
  await page.getByRole('button', { name: '保存首页配置' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.goto('/community');
  await expect(page.getByText('E2E 验收公告 · 一起开放共建')).toBeVisible();
  await page.goto('/admin?tab=resources&q=Dify');
  await page.getByRole('link', { name: '编辑', exact: true }).click();
  await page
    .getByRole('textbox', { name: '简介', exact: true })
    .fill('Dify 是用于构建 AI 应用的可视化工作流平台，这段介绍由 E2E 验证后台更新。');
  await page.getByRole('button', { name: '保存内容' }).click();
  await expect(page.getByRole('status')).toContainText('已保存');
  await page.goto('/projects/dify');
  await expect(page.getByText('这段介绍由 E2E 验证后台更新', { exact: false })).toBeVisible();
});
test('review regressions: malformed query parameters, bounded API payloads and mobile navigation', async ({
  page,
  request,
}) => {
  await page.goto('/search?q=RAG&q=Agent&page=1.5');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('搜索产业观察');
  await page.goto('/projects?sort=constructor');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('开源项目');
  await page.goto('/projects?page=Infinity');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('开源项目');
  const result = await request.get('/api/catalog?kind=project&page=1.5');
  expect(result.status()).toBe(200);
  const catalog = await result.json();
  expect(catalog.rows[0].body).toBeUndefined();
  expect(catalog.rows[0].metadata.readme).toBeUndefined();
  for (const data of ['null', '[]', '{broken']) {
    const response = await request.post('/api/bookmark', {
      data,
      headers: { Origin: `http://127.0.0.1:${process.env.FDE_E2E_PORT || 3211}`, 'Content-Type': 'application/json' },
    });
    expect(response.status()).toBe(400);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByLabel('主导航菜单').click();
  const mobile = page.getByRole('navigation', { name: '移动端导航' });
  await mobile.getByRole('link', { name: 'Skills 市场' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Skills 市场');
  await expect(page.locator('.mobile-nav')).not.toHaveAttribute('open');
  await page.getByLabel('主导航菜单').click();
  await expect(mobile.getByRole('link', { name: 'Skills 市场' })).toHaveAttribute(
    'aria-current',
    'page',
  );
  await page.keyboard.press('Escape');
  await expect(page.locator('.mobile-nav')).not.toHaveAttribute('open');
  await expect(page.getByLabel('主导航菜单')).toBeFocused();
});
test('review regressions: form failures preserve inputs and workspace remains accessible', async ({
  page,
}) => {
  await login(page);
  await page.goto('/submit');
  await page.getByLabel('GitHub 仓库地址').fill('https://github.com/review/example');
  await page.getByLabel('资源名称').fill('失败后保留输入');
  await page
    .getByLabel('介绍与适用场景')
    .fill('这是一个用于检查网络失败之后表单不会清空内容的公开项目。');
  await page.route('**/api/submit', (route) =>
    route.fulfill({ status: 502, contentType: 'text/html', body: '<html>Bad Gateway</html>' }),
  );
  await page.getByRole('button', { name: '提交审核' }).click();
  await expect(page.locator('.feedback[role="alert"]')).toContainText('服务暂时不可用');
  await expect(page.getByLabel('资源名称')).toHaveValue('失败后保留输入');
  await page.unroute('**/api/submit');
  await page.goto('/dashboard?tab=profile');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.getByLabel('显示名称').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    '16px',
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/review-profile-mobile.png', fullPage: true });
  await logout(page);
  await login(page, 'admin');
  await page.goto('/admin?tab=resources');
  await expect(page.getByText('已发布', { exact: true }).first()).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  expect(
    (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({ path: 'docs/screenshots/review-admin-desktop.png', fullPage: true });
  await page.goto('/admin?tab=resources&edit=not-found');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('这个页面还没有开放');
});
