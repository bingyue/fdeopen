# 安全说明

请不要在公开 issue、评论或投稿中披露密钥、私密业务数据和可直接利用的漏洞细节。正式部署者应提供安全联络地址并建立响应流程。

当前保护：服务端授权、资源归属校验、RLS 默认拒绝、参数化 SQL、Origin 校验、HttpOnly 会话、输入与大小限制、速率限制、HMAC Webhook、私密需求 DTO 隔离、审核日志、不执行第三方代码。

生产演示模式必须明确开启并设置访问口令；正常生产模式没有示例管理员。数据库服务凭据不能出现在 NEXT_PUBLIC 变量中。首次管理员由受控运维 CLI 授予。

生产依赖审计见 docs/production-dependency-audit.json。完整开发依赖扫描在当前锁文件中有 5 个 high 级联条目，均来自 eslint-config-next → fast-glob → micromatch → braces 的深层嵌套 glob 拒绝服务公告（GHSA-vfj7-8cjw-p6xm）；当前 registry 的 braces 最新版本仍为 3.0.3。该链不进入运行时依赖，Lint 使用仓库固定路径；不要把不受信任的 glob 输入传给开发工具。未通过降级 Next.js 或强制不兼容修复来掩盖此限制。

CSP 当前允许 Next.js 所需的内联脚本，后续可升级为 nonce 策略。真实 OAuth、部署账户、TLS、备份与恢复需在实际环境联调，源码验收不构成对所有部署环境的保证。
