# 交付验收记录

日期：2026-10-11（Asia/Shanghai）。目标为可运行、可部署、可继续运营迭代的 FDEOpen 首期社区。

## 已验证

| 检查            | 结果                                                 | 证据                                                                                               |
| --------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| TypeScript      | 通过                                                 | `npm run typecheck`                                                                                |
| ESLint          | 通过，无 warning                                     | `npm run lint`                                                                                     |
| 服务与安全测试  | 39 / 39 通过                                         | `npm test`；投稿 / 修改审核、私密需求、归属、贡献状态机、HMAC、Origin、RLS、OAuth 身份元数据防冒用 |
| 浏览器 E2E      | 5 / 5 完整场景通过                                   | `npm run test:e2e`，使用真正的 standalone 生产包                                                   |
| 原生 PostgreSQL | 17.11 集成通过                                       | `postgres-integration.json`；迁移、生产种子、JSONB、审核事务、收藏、贡献及 RLS                     |
| 内容路由        | 93 / 93 返回 200                                     | `site-audit.json`；涵盖全部 76 个内容详情和公共入口                                                |
| 基础可访问性    | 13 个公共页面组合 + 工作台/后台 + 故障页无 axe 违规  | `site-audit.json`                                                                                  |
| 响应式          | 320–1440px 共 30 组无横向溢出                        | `site-audit.json`、截图                                                                            |
| 文档            | MDX 渲染、目录定位、版本与关联通过                   | E2E + 页面审计                                                                                     |
| SEO             | Canonical、JSON-LD、OG 图、Robots / Sitemap 返回正常 | E2E + 页面审计；演示 noindex 是预期行为                                                            |
| 生产依赖        | 0 已知漏洞                                           | `production-dependency-audit.json`                                                                 |
| GitHub          | 公共 API 元数据 / README 和缓存时间戳验证通过        | `bingyue/fde-skills` 真实请求，README 7674 字符                                                    |
| 来源核验        | 20 项目 + 20 Skills                                  | content 中的来源快照与远程技能目录验证                                                             |
| Docker          | 镜像构建与两种数据库模式运行通过                     | `review-docker.json`（本轮）；`docker-acceptance.json`（首期两种数据库模式）                       |
| 独立构建        | 通过，无构建警告                                     | `.next/standalone`，排除 `.data` / `.env` / 测试目录                                               |

## 浏览器验收覆盖

1. 首页搜索 → 项目详情 → 规范链接 / JSON-LD → MDX → Skills 原始链接；移动导航、响应式与自动化无障碍。
2. 成员登录 → 收藏 → 投稿 → 申请共创 → 评论；管理员审核投稿、接受任务和评论；成员提交 PR；管理员确认贡献；开发者主页显示真实审核记录；已发布资源修改进入审核。
3. 私密企业需求提交；匿名搜索不出现原文；无授权时后台禁止公开；普通成员不能升权；跨站 Origin 被阻止；后台配置和资源编辑实际生效。

4. 重复搜索参数、小数/无穷页码、非对象 JSON；移动导航跳转收起、Escape 与当前栏目。
5. 模拟网关 HTML 错误后表单保留输入；移动端工作台和桌面后台可访问性；编辑不存在内容时返回 404。

另以不可写数据库目录注入根布局故障，确认 500 页面显示中文恢复入口，未暴露内部异常，axe 检查通过（`review-error-boundary.json`）。

另外，独立 PostgreSQL 容器验证了与生产相同的 `postgres.js` 驱动、JSONB 编解码和行权限，而非只依赖模拟数据库。

## 本轮 review 优化数据

目录接口同一组 12 个项目的未压缩 JSON 从 17,131 字节降至 7,254 字节，减少 57.7%。首页业务查询从 15 次减为 9 次；工作台资料页不再读取其他模块，收藏页只查询总数和当前页。

比较原始数据见 `review-performance.json`；公共页面时序采样见 `site-audit.json`。本机单次、未限速结果不是线上 SLA，也不替代真实移动网络、地区和数据库延迟下的监测。

本轮问题、修改与边界见 [代码复查与优化记录](CODE-REVIEW-2026-10-11.md)。已有正式数据库升级前运行 `npm run db:migrate`，以应用 003、004 两个新增迁移。

## 明确的部署边界

- Supabase GitHub OAuth 代码与回调已实现；没有真实部署凭据，因此未执行真实账号授权、续期和 Supabase 托管实例联调。
- 未创建 GitHub 远程仓库、Vercel 站点或 DNS 记录；fdeopen.com 是配置目标，不表示已经上线。
- 外部 Lab 内容是体验 / 文档入口，本站不运行外部代码；示例输出明确标为说明性内容。
- 项目截图上传、自动聚合 GitHub Issues、Demo 沙箱、Skills CLI、细分运营分工和支付为后续增强，见 ROADMAP。
- 完整开发依赖审计仍存在 ESLint glob 链的 5 个 high 级联条目；生产依赖不受影响。详情与使用边界见 SECURITY.md。
- 运营主体、隐私联系人与数据保留周期需要正式运营方补充。

## 验收中修复的问题

- 校正 FDE Skills 的 master 分支来源和项目实际 License 文件路径。
- 修复浅色文字、分类筛选与移动登录入口的无障碍问题。
- 修复根加载占位造成的布局位移，以及中文文档目录锚点。
- 排除构建追踪中的本地数据库和环境文件，避免将演示会话带入镜像。
- 修复 postgres.js 对已序列化 JSONB 的重复编码，加入原生 PostgreSQL 集成验收脚本。

## 复测方法

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm run audit:site` 默认检查 http://127.0.0.1:3212，需提前启动该端口的 standalone 演示实例。通过 AUDIT_BASE_URL 可指定其他本地验收地址。

原生 PostgreSQL 测试仅允许本机独立的 `fdeopen_test` 数据库，防止误触业务库：

```bash
docker run --rm -d --name fdeopen-postgres-acceptance \
  -e POSTGRES_PASSWORD=fdeopen-temporary-test-only -e POSTGRES_DB=fdeopen_test \
  -p 127.0.0.1:35432:5432 pgvector/pgvector:pg17
TEST_DATABASE_URL=postgresql://postgres:fdeopen-temporary-test-only@127.0.0.1:35432/fdeopen_test npm run test:postgres
docker stop fdeopen-postgres-acceptance
```

临时密码仅适用于该一次性本机测试容器，不用于正式部署。Docker 容器运行结果见 `review-docker.json`（本轮）；`docker-acceptance.json`（首期两种数据库模式）：镜像构建、UID 1001、PGlite 会话登录、原生 PostgreSQL JSONB、生产模式禁用演示登录均通过。
