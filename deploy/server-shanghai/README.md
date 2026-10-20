# Docker 部署到 Server-Shanghai

应用与 PostgreSQL 17 通过 Compose 运行，不依赖 Supabase。Nginx 负责域名与 HTTPS；应用只映射宿主机 `127.0.0.1:3215`，数据库不映射宿主机端口。

## 目录与配置

- 发布代码：`/opt/fdeopen/releases/<commit>`，`/opt/fdeopen/current` 指向当前版本。
- 运行配置：`/etc/fdeopen/server.env`，root 所有、0600 权限。参考 `server.env.example`，数据库密码用 `openssl rand -hex 32` 生成。
- 数据卷：`fdeopen_postgres_data`、`fdeopen_uploads`。不要执行 `docker compose down -v`。
- `NEXT_PUBLIC_SITE_URL=https://fdeopen.com` 同时传入构建与运行阶段。
- 初始化管理员的口令仅临时传给 tools 容器，不写入应用镜像或 web 容器环境。

在发布目录下使用以下命令；`dc` 只是避免重复长参数的 shell 函数：

```sh
dc() {
  docker compose --env-file /etc/fdeopen/server.env \
    -f deploy/server-shanghai/compose.yaml "$@"
}
dc up -d postgres
dc --profile tools build web tools
dc --profile tools run --rm tools npm run db:migrate
dc --profile tools run --rm tools npm run db:seed
# 由受保护的终端环境提供两个变量，不要把真实值写进命令历史。
dc --profile tools run --rm \
  -e BOOTSTRAP_ADMIN_LOGIN -e BOOTSTRAP_ADMIN_PASSWORD tools npm run admin:bootstrap
dc --profile tools run --rm tools npm run content:import -- --apply --owner=ADMIN_UUID
dc --profile tools run --rm tools npm run release:check
dc up -d web
curl --fail http://127.0.0.1:3215/api/health
```

内容导入包含 201 篇公开文章/案例与 114 张图片。每次导入验证文件哈希，已有编辑内容不会覆盖。导入与 web 使用同一上传卷和 UID 1001，避免文件权限不一致。

## 域名与 HTTPS

将 `fdeopen.com` 与 `www.fdeopen.com` 的 A 记录指向目标服务器。安装 `nginx.conf` 为独立站点，先执行 `nginx -t` 再 reload。80/443 供公网访问，3215/5432 保持不对公网开放。

使用 Certbot 为两个域名签发证书并开启 HTTP 跳转 HTTPS。签发后验证证书域名与有效期，运行 `certbot renew --dry-run` 验证续期。Nginx 必须覆盖客户端传入的转发头，服务端限流才能使用可信来源。

## 账号与密钥

`APP_MODE=postgres` 下关闭演示登录和 Supabase OAuth，开放原生账号注册；注册账号始终为 member，个人主页默认私密。密码使用带随机盐的 scrypt，Cookie 为 HttpOnly/Secure/SameSite=Lax，数据库只保存会话摘要。修改密码会撤销所有会话。

用户在 `/dashboard?tab=profile` 修改密码。管理员线下核验账号归属后，才可用受保护环境变量 `RESET_ACCOUNT_LOGIN`、`RESET_ACCOUNT_PASSWORD` 运行：

```sh
dc --profile tools run --rm -e RESET_ACCOUNT_LOGIN -e RESET_ACCOUNT_PASSWORD \
  tools npm run account:reset-password -- --confirm
```

GitHub 公开资源同步无需个人 Token；若配置 Token，仅放入服务器环境文件。Webhook 与 Cron 不配置密钥时保持不可用。

## 备份、升级与回滚

发布前导出 PostgreSQL 自定义格式备份，并归档上传卷；备份文件只允许 root 读取。正式上线后安排每日备份，定期复制到独立存储并验证恢复。运行备份时不要复制正在运行的 PostgreSQL 数据目录。

升级按“备份 → 构建带 commit 标签镜像 → 迁移 → seed/内容导入 → 切换 web → 健康检查”进行。保留前一镜像和发布目录。回滚切回前一应用镜像，保留数据库与上传卷；新增迁移默认向后兼容，不自动删除用户数据。

验收包括匿名阅读、搜索、注册登录、权限隔离、管理员编辑、图片访问、密码修改、退出登录、容器重启后数据保留、公开 URL/分享图/Sitemap 及 HTTPS 续期。
