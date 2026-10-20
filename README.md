# FDE前线 · 企业AI转型与智能体产业媒体

**洞察 AI 产业变革，记录企业转型实践。**

提供企业案例、深度文章、产业研究与开放社区，面向企业 AI 负责人、FDE、AI 应用工程师和独立开发者。公开内容默认免费阅读，仓库与部署项目名保留为 `fdeopen`。

![首页预览](docs/screenshots/home-desktop.png)

## 快速运行

要求 Node.js 22.12+、npm。

```bash
npm ci
npm run dev
```

打开 **http://127.0.0.1:3210**。无需密钥即可运行。在 `/login` 选择示例开发者或示例管理员；切换身份前先在工作台退出。数据使用 PGlite（本地 PostgreSQL）持久化到 `.data/fdeopen`，刷新及重启不会丢失。不要让多个进程同时打开同一 PGlite 目录。

开发环境默认演示模式。正式 Docker 部署使用 `APP_MODE=postgres`，自管账号、密码与 PostgreSQL；可选 `APP_MODE=supabase` 接入 Supabase GitHub OAuth。配置不足时拒绝启动，不会自动退回演示管理员。

Next.js 16.4 的开发磁盘缓存存在重启后反复刷新问题，本项目已关闭
`experimental.turbopackFileSystemCacheForDev`。正常 Fast Refresh 和生产构建缓存仍然启用；
代价是每次重启开发服务后需要重新编译页面。不要为加快启动直接恢复这个开关，升级 Next.js 后先做重启回归。
排查证据、内存对照和回归步骤见 [开发刷新异常排查](docs/DEV-REFRESH-DIAGNOSIS.md)。

## 已实现的核心闭环

- **OpenHub**：项目目录、分类 / 语言 / 许可 / 活跃度 / Stars 筛选、分页搜索、独立详情、来源与许可说明、GitHub 导入与服务端同步、README 纯文本预览。
- **SkillHub**：来源、版本、平台、依赖、安装命令、配置示例、关联资源、收藏与下载来源跳转。
- **ScenarioHub**：20 个明确标为编辑方案的行业场景，包含痛点、流程、实施路径、评测指标及双向关联的项目与 Skills。
- **社区身份**：自管账号注册与登录、加盐密码哈希、修改密码并撤销全部会话；可选 Supabase GitHub OAuth。资料编辑、私密 / 公开档案、联系方式公开开关、作品集与私人收藏。
- **投稿与编辑**：提交 → 审核 → 发布 → 发布者提出修改 → 再审核；重复审核、越权编辑和非法状态转换被服务端阻止。
- **企业需求**：原始需求和联系信息默认私密；仅获得授权后，编辑另写脱敏内容转为公开任务。
- **FDE Lab**：5 个外部体验 / 教程入口及说明性输入输出；不执行第三方代码、不默认嵌入第三方页面。
- **开源共创**：开放任务 → 申请认领 → 管理员接受 → 提交 GitHub PR → 人工核验 → 贡献记录。无悬赏支付与资金托管。
- **开放文档**：8 篇受 Git 管理的 MDX 文档、章节目录、版本标识、公开检索与关联资源；编辑在线修改正文后按纯文本安全发布。
- **运营后台**：内容增改 / 下架、投稿、私密线索跟进、评论与举报、任务申请、专题、用户角色、首页开关、事件统计和审计日志。
- **SEO**：SSR、规范 URL、Metadata、分享图、JSON-LD、动态 Sitemap、Robots；演示环境不允许搜索引擎索引。

## 初始内容

媒体内容包包含 **201 篇文章与案例、114 张图片、5 个媒体专题**。构成为 174 篇企业案例、13 篇深度文章、12 篇研究和 2 篇观察。正式环境通过幂等导入初始化，不自动创建演示作者或虚构人物。详见[内容库说明](docs/CONTENT-LIBRARY.md)。

| 内容     | 数量 | 说明                                                                             |
| -------- | ---: | -------------------------------------------------------------------------------- |
| 项目     |   20 | 2026-10-11 经 GitHub API 核验的真实仓库；Stars 为带日期快照                      |
| Skills   |   20 | 从 `bingyue/fde-skills` 远程 master 分支核验，保留 AGPL 许可与作者，只做目录索引 |
| 企业场景 |   20 | 编辑提出的方案，不冒充已交付的客户成果，不承诺业务收益                           |
| 社区专题 |    5 | 企业 RAG、Agent、浏览器自动化、本地部署、100 项目共建计划                        |
| Lab 条目 |    5 | 原项目服务或教程入口，可能需要独立账号                                           |
| 共创任务 |    3 | 社区发起的文档、评测与行业示例任务                                               |
| 开放文档 |    8 | FDE、RAG、Agent、MCP、AI Coding、交付、生产化、行业实践                          |

来源快照见 [`content/github-sources.json`](content/github-sources.json) 与 [`content/skill-source-verification.json`](content/skill-source-verification.json)。外部项目归原作者所有，收录不代表官方合作。自定义许可或多重许可会明确显示，使用前请阅读原文。

## 项目结构

```text
src/app/                 SSR 页面、OAuth、API、SEO
src/components/          导航、资源卡片、表单、后台组件
src/components/ui/       基于 Radix Slot + CVA 的 shadcn 风格基础按钮
src/lib/                 业务服务、认证、权限、SQL 适配、GitHub 集成
content/                 初始内容与来源证据、MDX 文档
supabase/migrations/     PostgreSQL Schema、关系、索引、RLS
scripts/                 幂等种子、迁移、管理员初始化、部署准备
tests/                  服务层与 RLS 测试、Playwright E2E
docs/                   架构、部署、运营、验收与迭代计划
```

技术栈：Next.js 16.4、React 19.3、TypeScript、Tailwind CSS 4、Radix / shadcn 风格组件、PostgreSQL。演示数据库与生产数据库执行相同的参数化 SQL；正式 Docker 服务使用 PostgreSQL 容器与网站自管账号。

## 检查与构建

```bash
npm run lint
npm run typecheck
npm test
npm run build
# 首次运行浏览器验收时，如缺少 Chromium：
npx playwright install chromium
npm run test:e2e
```

E2E 在 3211 端口启动真正的独立生产包，使用一次性的演示数据库和测试口令，不污染 `.data/fdeopen`。报告为 `playwright-report/index.html`，验收截图保存至 `docs/screenshots/`。

`npm run build` 会生成 `.next/standalone` 并准备静态文件。`npm start` 读取根目录 `.env.local`（存在时）并使用独立包启动，默认端口 3210。生产模式不会自动创建演示身份。

## 生产配置

使用 [Server-Shanghai Docker 部署说明](deploy/server-shanghai/README.md)配置数据库密码、HTTPS 域名与持久化卷，执行迁移、建立管理员并导入内容。该方案不需要 Supabase 服务。

```bash
npm run db:migrate
npm run db:seed
# 使用受保护的环境文件提供 BOOTSTRAP_ADMIN_LOGIN / BOOTSTRAP_ADMIN_PASSWORD
npm run admin:bootstrap
npm run content:import -- --apply --owner=ADMIN_UUID
npm run build
npm start
```

远程仓库：[bingyue/fdeopen](https://github.com/bingyue/fdeopen)。部署过程、验证和回滚应以实际发布记录为准；本地测试通过不代表已经完成公网发布。

## 文档

- [建设计划与复用判断](docs/PLAN.md)
- [架构与权限决策](docs/ARCHITECTURE.md)
- [Supabase / Vercel / Docker 部署](docs/DEPLOYMENT.md)
- [运营手册与验收脚本](docs/OPERATIONS.md)
- [验收记录](docs/ACCEPTANCE.md)
- [代码复查与优化记录](docs/CODE-REVIEW-2026-10-11.md)
- [路线图](docs/ROADMAP.md)
- [贡献指南](CONTRIBUTING.md)

代码采用 MIT 许可。第三方项目、Skill 和原文仍适用其原作者许可，索引不改变原资源许可。FDE前线原创文档的转载与修改应标明来源。
