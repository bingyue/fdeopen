# 架构与权限决策

## 1. 单应用，明确的服务边界

Next.js App Router 同时承担 SSR 页面与 Route Handler。业务规则在 `src/lib/service.ts`，界面不直接操作数据库。Zod 在服务端再次验证输入，所有 SQL 值使用参数化绑定。排序字段、表名和枚举只能来自代码中的白名单。

UI 以白色、石墨灰与蓝色为主；首页以搜索和项目探索为中心，使用项目卡、专题、业务场景和共创入口，不使用传统论坛信息流。按钮基于 Radix Slot、CVA 与 Tailwind 的可复用组件，样式变量集中管理。

## 2. 双环境，行为一致

- **本地演示**：PGlite PostgreSQL，落盘 `.data/fdeopen`，提供两个明确标记的示例身份。密码随机令牌只以 SHA-256 摘要存入 sessions，Cookie 使用 HttpOnly、SameSite=Lax，HTTPS 时启用 Secure。
- **生产**：Supabase Auth + GitHub OAuth；每次请求使用 `getUser()` 验证身份，Proxy 刷新 Cookie。数据库使用服务端专用 Postgres 连接，浏览器不能接触 DATABASE_URL。
- **显式失败**：生产必须设置 APP_MODE；演示生产包需明确 opt-in 和至少 16 字符访问口令。配置错误不能静默降级为演示管理员。
- **单实例限制**：PGlite 只用于本地或单容器演示，不能放在 Vercel 临时文件系统或多副本共享目录。正式部署用 PostgreSQL。

## 3. 数据实体与关系

`resources` 统一公开内容的可检索字段与审核状态；`projects`、`skills`、`scenarios`、`demos`、`community_tasks`、`articles` 是带 `security_invoker=true` 的类型视图。这样收藏、讨论、专题和场景关联能够使用真正的外键，而不是无约束的多态 ID。

`metadata` 存储各类型的结构化扩展字段，由服务端白名单 Schema 验证。分类有 `project_categories`，资源列表索引覆盖 kind/status/category/featured，标签使用 GIN。项目与 Skill 元数据支持版本、平台、依赖、安装与配置；场景支持流程、指标和行业。

其他实体：users、profiles、scenario_relations、collections、collection_items、submissions、bookmarks、likes、comments、task_applications、contributions、notifications、audit_logs、reports、site_settings、analytics_events、github_cache、webhook_deliveries、sessions、rate_limits。

来源快照是初始内容，不是永远的事实。GitHub 同步只更新元数据，不覆盖编辑摘要与许可证备注。种子幂等，不覆盖管理员编辑，不生成虚构贡献。

## 4. 权限与私密数据

| 操作                       | 匿名 | 成员 / 维护者 | 编辑     | 管理员           |
| -------------------------- | ---- | ------------- | -------- | ---------------- |
| 阅读已发布内容             | 是   | 是            | 是       | 是               |
| 收藏、投稿、评论、认领     | 否   | 本人          | 本人     | 本人             |
| 修改个人资料、提交资源更新 | 否   | 本人资源      | 本人资源 | 本人资源         |
| 审核与内容运营             | 否   | 否            | 是       | 是               |
| 查看私密企业需求           | 否   | 仅本人投稿    | 审核范围 | 审核范围         |
| 调整账号角色 / 停用        | 否   | 否            | 否       | 是，不能修改自己 |

生产应用服务使用高权限数据库连接，因此必须通过 `currentUser` / `requireUser` 和服务层授权；不能从客户端直接使用相同数据库凭据。所有表启用 RLS，浏览器 SDK 仅对明确授权的公开内容及本人记录拥有 SELECT 权限，所有写操作仅经过应用服务。profiles 不向 Data API 授权，避免通过原表读出 private contact。

公开 DTO 不包含 submissions、联系信息、未审核评论、私人收藏或待认领信息。企业需求要转公开任务，必须存在用户 consent，编辑另填公开标题与介绍，不能把原始 payload 直接发布。查看需求队列、审核、内容编辑、权限变更和贡献确认进入审计日志。

## 5. 完整业务事务

- 投稿审查加行锁；只能处理 pending。通过后创建公开资源、写通知、审计。同一投稿不能重复发布。
- 资源修改提交 pending 版本，原页面保持可用；审核通过原地更新，保持 URL 和收藏关系。
- 任务状态变更使用明确状态机。只有 accepted/submitted 可以提交 PR；只有 submitted 可以确认贡献；application_id 唯一避免重复记账。
- 通过资源 status 限制收藏、申请、评论与事件；下架资源不能继续参与公开流程。
- Markdown/外部 README 作为纯文本渲染。仅仓库内已审核 MDX 文件会编译，不执行用户提交的 MDX/JS。

## 6. 外部集成与安全

GitHub 请求仅允许 `https://github.com/owner/repo` 形式，解析后使用固定 api.github.com 主机；禁止任意 URL 请求和重定向，设置超时与文本限制。服务端缓存 6 小时并使用 ETag；配额不足明确返回错误。签名 Webhook 使用 HMAC SHA-256 + timingSafeEqual，校验原始 body，以 delivery ID 和 claim token 区分处理中/成功状态，失败释放，10 分钟租约到期后可重获；按仓库 SQL 条件只同步已收录项目。同步并发上限为 3，常规批次最多 25 项。

状态变更校验 Origin，使用 HttpOnly 会话、登录/投稿/评论速率限制、请求体大小限制和蜜罐字段。所有用户输入经过 React 转义，结构化数据转义 `<`，不提供第三方代码执行接口。安全响应头包括 CSP、frame-ancestors、nosniff 和权限策略。当前 CSP 为 Next.js SSR 保留 unsafe-inline；unsafe-eval 仅开发环境保留，后续可升级 nonce CSP。

数据库迁移仅操作本应用表。生产建议使用新的专用 Supabase 项目，避免与已有同名业务实体混用。

## 7. 搜索与缓存

内容在服务端按白名单过滤，支持中文 ILIKE，默认分页且最大单页 100；不搜索私密提交。当前目录规模适合 SQL。较大规模可启用 PostgreSQL trigram 或独立检索引擎，保持公开 DTO 边界。

用户页面不共享缓存。SSR 提供可索引首屏，Metadata 与 Schema.org 数据按内容生成；演示模式禁止索引。来源统计不是实时声明，事件数不等于 UV。

## 8. 扩展接口

- `/api/catalog?kind=skill&q=...` 是只读资源接口，可作为未来 CLI 的基础；尚未承诺稳定外部版本 API。
- `metadata` 和关系表可扩展标准化 Skill 规范、Demo runner 调度与贡献类型。
- Lab 当前为外部链接与示例输入输出，不运行容器，不嵌入不受控脚本。
- 共创使用 GitHub PR 人工核验；后续可加入 Issues 定时聚合和归属验证。
- 资金托管与悬赏支付未实现，避免把协作状态当成支付状态。

## 复查后的读路径

卡片列表使用 ResourceSummary 白名单，详情保留完整资源；首页 preview 不额外计数。工作台按标签取数并分页。身份、详情、专题和开发者详情使用 React cache 仅在单次渲染内去重；不将身份或私密资料放入共享缓存。细节和验证数据见 CODE-REVIEW-2026-10-11.md。
