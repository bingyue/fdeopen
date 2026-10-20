# 部署手册

## 当前采用：自管 Docker + PostgreSQL

正式目标为腾讯云 Server-Shanghai，域名 `fdeopen.com`。使用[独立 Docker 部署说明](../deploy/server-shanghai/README.md)：`APP_MODE=postgres` 启用自管账号，应用和 PostgreSQL 分别运行在容器中，上传文件和数据库使用持久化卷。无需单独配置 Supabase。

下方 Supabase / Vercel 章节是可选方案。当前媒体附件使用本地文件系统，因此 Vercel 方案必须先改为持久化对象存储；不能把上传目录放在临时磁盘上直接上线。

## 本地开发

Node 22.12+。`npm ci && npm run dev`，打开 http://127.0.0.1:3210。没有环境变量时仅开发环境启用演示。演示数据是持久化的；备份时先停止进程，再复制整个 `.data/fdeopen` 目录，不要在运行中复制数据库文件。

## Supabase + GitHub OAuth

1. 创建**专用** Supabase 项目；本应用使用 public schema。准备支持 TLS 的 PostgreSQL 连接，优先使用 Supabase 官方提供的连接 / pooler 字符串，勿把数据库密码提交 Git。
2. 设置 `.env.local` 或部署平台环境：

```dotenv
APP_MODE=supabase
NEXT_PUBLIC_SITE_URL=https://fdeopen.com
DATABASE_URL=postgresql://...  # 从 Supabase 控制台取得，保留 TLS 配置
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
GITHUB_TOKEN=OPTIONAL_PUBLIC_REPO_READ_TOKEN
GITHUB_WEBHOOK_SECRET=RANDOM_LONG_SECRET
CRON_SECRET=RANDOM_LONG_SECRET
```

3. 在 GitHub 创建 OAuth App。Homepage URL 使用真实域名；Authorization callback URL 使用 `https://YOUR_PROJECT.supabase.co/auth/v1/callback`，不是应用自己的 callback。
4. 在 Supabase Auth Providers 启用 GitHub，配置 Client ID/Secret。GitHub Secret 仅存 Supabase 控制台，不要放进前端环境。
5. 在 Supabase URL Configuration 设置 Site URL 为 `https://fdeopen.com`，Redirect URLs 精确添加 `https://fdeopen.com/auth/callback`；本地联调可另外添加对应 localhost 回调。
6. 运行 `npm run db:migrate`，执行 Schema 与 RLS；`npm run db:seed` 写入真实资源目录，不创建任何演示用户。
7. 构建和启动，在网站用本人的 GitHub 登录一次；新资料默认私密。
8. 在受控 SQL 控制台核对该用户的 UUID、handle 与 GitHub 身份：

```sql
SELECT u.id, u.github_id, p.handle, p.name
FROM users u JOIN profiles p ON p.user_id=u.id;
```

9. 在已配置服务端连接的运维终端运行 `npm run admin:grant -- 用户UUID --confirm`。该操作写入审计日志。随后由后台 `/admin?tab=users` 管理其他角色。
10. 验证匿名读取、普通用户越权阻止、OAuth 回调、登录续期、私密需求不可公开读取。

参考：[Supabase SSR 官方文档](https://supabase.com/docs/guides/auth/server-side/creating-a-client)、[GitHub 登录配置](https://supabase.com/docs/guides/auth/social-login/auth-github)。

## Vercel

- 项目根目录指向 `fdeopen`，Next.js 框架，Node 22；安装 `npm ci`，构建 `npm run build`。
- 在构建前设置全部 `NEXT_PUBLIC_*` 值，它们可能被打包到客户端。只把 publishable key 放在公开变量；数据库、GitHub Token、Webhook 和 Cron 密钥均为服务端变量。
- 使用托管 PostgreSQL。不要在 Vercel 使用 PGlite，它不适用于临时磁盘和多实例环境。
- 在部署平台添加域名后，根据平台给出的 DNS 值配置域名解析。仓库中的域名是目标品牌域名，不代表已注册或已绑定。
- `vercel.json` 每日 UTC 03:00（北京时间 11:00）触发 `/api/cron/github`。配置 `CRON_SECRET`，验证平台自动附加 Bearer 请求头。根据所用方案确认 Cron 与执行时长配额。
- 配置 Webhook URL `https://fdeopen.com/api/github/webhook`，Content type 为 JSON，设置同一个 secret；订阅 push/release/repository 事件。只处理已收录仓库，并验证 GitHub HMAC 签名。
- 如无需 GitHub App/Webhook，可只使用定时同步和管理员手动同步。

## 独立 Node / Docker

```bash
npm ci
npm run build
npm start
```

`npm start` 读取根目录 `.env.local`，设置默认端口 3210，并运行 `.next/standalone/server.js`。输出包仅包含应用、运行时依赖、静态资源、内容与迁移，不包含 `.env`、`.data`、测试记录。

Docker 正式运行需传入生产环境文件：

```bash
docker build --build-arg NEXT_PUBLIC_SITE_URL=https://fdeopen.com -t fdeopen:1.0 .
docker run --rm --env-file .env.production -p 127.0.0.1:3210:3210 \
  -v fdeopen_uploads:/app/.data/uploads fdeopen:1.0
```

前置 HTTPS 反向代理，并把 NEXT_PUBLIC_SITE_URL 设置为公网 URL。公开环境不要使用 .env.example 中的 localhost 值。镜像以非 root 用户运行。

仓库内 `docker-compose.yml` 是单容器本地演示方式：

```bash
DEMO_ACCESS_KEY='替换为至少16字符的本地演示访问口令' docker compose up --build
```

它只绑定到本机端口，数据保存为命名卷。生产演示明确要求 `APP_MODE=demo`、`ALLOW_DEMO_IN_PRODUCTION=true` 和访问口令；不应混入真实用户或企业数据。

## 迁移、备份和回滚

- 迁移通过 schema_migrations 记录版本并使用事务。执行前备份；不要修改已运行过的迁移文件，新增后续版本。
- 新环境先迁移后 seed；seed 不覆盖已有内容或修改过的首页配置。
- 2026-10-11 review 新增 003 查询索引与 004 Webhook 处理租约迁移；升级已有正式实例时先执行 `npm run db:migrate`，再部署新版。
- PostgreSQL 建议启用每日备份与 PITR，按运营方要求确定保留周期。至少一次实际恢复验证后才对外上线。
- 应用回滚使用上一版本镜像；数据库变更应采用向后兼容策略。不存在一键自动回滚用户内容的脚本。
- 发布后观察 `/api/health`、应用错误、OAuth 失败率、审核队列和关键事件；不要在日志打印 Cookie、Token 或企业原始需求。
- 定期清理过期 sessions、rate_limits、webhook_deliveries 和超过运营周期的 analytics_events。审计日志的保存期限由实际运营主体制定。

## 可选托管环境

Supabase / Vercel 的账号、OAuth 与存储仅在选择相应方案时配置。Docker 生产方案使用自管账号，不需要上述凭据。每次发布仍需验证目标服务器上的 HTTPS、读写权限、内容导入和数据持久化。

## 生态入口

FDE中国入口使用已核验的 https://fdechina.ai。51FDE 的正式站点地址通过服务端 `FDE_LEARNING_URL` 配置；未配置时链接到本站生态说明，不依赖尚未确认的域名。
