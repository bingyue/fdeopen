# FDE前线：出版、开源生态与实战社群升级

交付日期：2026-11-19。基于原有 Next.js / React / PostgreSQL 与 Docker 部署完成增量改造。

## 信息架构变化

| 范围         | 改版前                                   | 改版后                                                                 |
| ------------ | ---------------------------------------- | ---------------------------------------------------------------------- |
| 主导航       | 产业媒体、免费社区、关于                 | 保留全部入口，增加 FDE图书、加入实战社群；窄屏使用完整移动菜单         |
| 首页         | 封面深度、编辑精选、最新内容、栏目、生态 | 封面之后增加专业出版；右栏与底部增加独立会员服务推广                   |
| 专业出版     | 无独立中心                               | `/book`：图书、12章正式目录、作者、正版购买、配套开源、公开案例        |
| 免费开放社区 | `/community` 与资源列表                  | 保持原功能；社区和项目列表重点推荐 Awesome-FDE                         |
| 年度会员     | 无独立页面                               | `/membership`：七项服务方向、公开体验、发起人、入会流程、FAQ、购买能力 |
| 详情页       | 文章、目录、关联内容                     | 正文之后与侧栏加入图书、开源、会员服务；编辑内容与推广分开             |
| 关于与页脚   | 媒体理念、发起人、通用链接               | 连接媒体、知识出版、开放指南、FDEChina、51FDE、企业服务                |
| 运营统计     | 社区与媒体阅读统计                       | 新增 `/admin/marketing`，按来源/内容/位置/设备查看推广曝光与跳转       |

完整路径：产业内容 → 图书与知识方法 → 免费开源学习 → 年度实战社群 → 人才成长与企业服务。

## 已完成页面和组件

- 新页面：`src/app/book/page.tsx`、`src/app/membership/page.tsx`、`src/app/admin/marketing/page.tsx`。
- 新接口：`POST /api/marketing/events`，匿名、同源、限流、严格字段校验。
- `BookFeatureBanner` 同时承担首页专区与图书首屏，避免重复书目信息。
- `BookPromoCard`、`CommunityPromoCard`、`AwesomeFDECard`、`ArticleConversionBlock` 负责可复用推荐。
- `FounderProfile`、`EcosystemLinks` 统一人物与生态信息。
- `MembershipPurchaseCard`、`MembershipBenefits`、`MembershipFAQ` 负责产品展示。
- `PurchaseActions` 内含用户主动打开的原生购买弹窗，另有 `PurchaseQRCode` 与 `MobilePurchaseBar`。
- `TrackedLink` 与 `PromoView` 统一点击与进入可视区域后的曝光统计，观察器卸载后断开，无轮询或自动刷新。

现有文章、案例、研究、活动等媒体详情共用同一组件，因此全部覆盖。项目与Skills详情单独接入。后台预览不显示推广。

推荐规则：案例/活动先社群与图书；技术资源先Awesome-FDE；职业成长先图书，并补充51FDE入口；研究优先图书。侧栏包含三类推荐，正文中不插入推广。

## 图书与素材依据

- 书名：《FDE前线部署工程师：企业AI转型与智能体工程化交付》，邴越著，清华大学出版社。
- ISBN 9787302729556，出版日期 2026-11-01。
- [出版社正式书页](https://www.tup.com.cn/booksCenter/book_11842501.html)。京东、天猫链接均取自该页，不自行推测商品编号。
- [出版社正式目录](https://www.tup.com.cn/booksCenter/bookcatalog?id=11842501)，本地配置包含12章、154节，顺序与页码保留。未公开图书正文。
- 销量突破2000册由作者提供，显示截至2026-11-19及来源说明，不作为实时销量。
- 封面和作者肖像复用本地已确认素材，存放 `public/marketing/`；没有添加虚构专家推荐或活动现场。

## 集中配置方式

主配置：`src/lib/marketing/config.ts`。正式章节：`src/lib/marketing/book-toc.json`。

| 配置对象         | 内容                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `book`           | 开关、书名/副标题、作者/出版社、ISBN、出版日、封面、简介、里程碑、官方来源、渠道、目录、配套仓库、社群路径、已授权推荐语             |
| `founder`        | 姓名、肖像、身份、简介                                                                                                               |
| `membership`     | 开关、preview/live模式、产品名称、价格/币种/有效期、权益确认、购买链接/二维码、已有会员入口、内容预览、授权照片、FAQ、退款/发票/客服 |
| `awesome`        | 开关、旗舰推荐、仓库、文档、图书、共创、勘误                                                                                         |
| `placements`     | 各推广位置的开关、feature/card/inline展示形式、默认推荐顺序                                                                          |
| `promotionOrder` | 按内容类型和主题调整优先级；在同一配置文件内修改                                                                                     |
| `ecosystem`      | 生态平台及服务链接                                                                                                                   |

内部链接在本站打开，外部购书、开源与社群链接新窗口打开并带 `noopener noreferrer`。手机购买可直接打开真实链接；有二维码的桌面端由按钮打开购买弹窗，绝不自动弹窗。

更改配置之后运行 `npm run check` 和 `npm run test:e2e`，重新构建部署。当前采用版本化结构配置，后台提供只读配置状态与聚合统计，没有另建CMS或会员数据库。没有发现可复用的FDEChina公开会员配置接口，不能声称已实现跨站自动同步。

## 社群 mock 与正式启用

按用户确认，本次社群采用明确标注的 **mock方案预览**：`mode: 'preview'`，`price: null`，购买链接、二维码、售后规则为空。页面显示「暂未开放购买」，不展示399元、虚假二维码或无效付款入口；结构化数据不输出Offer。

七项权益标注为拟定服务方向。内容预览使用现有免费的报价核验、知识库评测、营销审核实践，明确不是会员独占内容。真实会员内容、已授权专家推荐、活动照片没有提供时隐藏相应展示。

正式开售时，在配置中一次性完成：

1. 设置实际 `price`、`duration` 与 `benefitsConfirmed: true`，逐条核对实际权益和交付频次。
2. 填写同一会员产品的真实知识星球 `purchaseUrl` 与 `memberAccessUrl`（仅HTTPS）。
3. 上传实际付费二维码至 `public/marketing/`，填写 `purchaseQRCode`（本地PNG/JPG/WebP路径）。二维码应与购买链接指向同一产品；不使用出版社图书二维码充当付款二维码。
4. 填写 `refundPolicy`、`invoicePolicy`、`supportContact`，补充必要FAQ。
5. 将 `mode` 改为 `live`。购买门禁会检查正式模式、已确认权益、有效价格/周期、HTTPS链接与完整服务规则；任一条件不满足仍保持不可购买。
6. 与FDEChina运营保持同价、同权益和同链接，完成真实手机、微信与桌面扫码验收。

二维码为可选项：没有二维码时桌面直接跳转真实购买链接；补齐二维码后显示扫码、下载与点击弹窗。移动端支持直接跳转、复制链接、保存二维码及微信提示；原浮动工具栏在社群手机页隐藏，避免与固定购买栏重叠。复制失败有文字提示，可长按链接操作。

购买无需注册本站账号。支付、订单与会员资格留在实际平台；本次不实现自主支付、伪造付款成功、知识星球未公开API或自动发群邀请。

## SEO与统计

- `/book`、`/membership` 有独立Title、Description、Canonical、Open Graph、Twitter分享元信息；使用真实书封与品牌分享图。
- 生产sitemap按产品开关收录两页；演示模式沿用全站不索引策略。
- 图书输出Book及嵌套Person；社群输出Product，只有真实可购买配置才增加Offer。
- 新表 `marketing_metrics`（迁移 `010_marketing_metrics.sql`），按天和维度累加，统计不关联账号、不存原始IP、浏览器指纹或完整URL查询参数。
- 事件包含 `book_banner_view`、`book_detail_click`、`book_purchase_click`、`book_companion_click`、`awesome_fde_click`、`community_card_view`、`community_detail_click`、`membership_purchase_click`、`purchase_qrcode_view`、`purchase_link_copy`、`member_access_click`。
- 维度：公开路径、内容类型、内容UUID、位置、受限格式的utm_source、mobile/desktop。保留当前访问URL的渠道标记，不跨页面设置追踪Cookie，也不推断未带渠道的访问来源。
- 浏览器DNT/GPC或相应请求头启用时不记录。接口限制2KB，同源校验、90次/分钟限流；拒绝未知事件、私密路由、邮箱等非预期字段。
- `/admin/marketing` 仅管理员/版主可读，显示近30日汇总与前200组来源维度。**点击次数不是人数或成交量**，不能据此计算真实收入/退款。
- 发布前先备份数据库与上传文件，迁移后启动新Web容器；旧版本不依赖新增表，可回滚应用镜像。

## 验证记录

- `npm run lint`、`npm run typecheck`、`npm test`、生产构建已通过；单元测试70项。
- 原有6条端到端流程通过，覆盖发现资源、登录、投稿、收藏、管理员审核、私密需求、权限、移动导航及阅读历史。
- 新增浏览器验证覆盖首页专区位置、正式目录、正版链接、Canonical、结构化数据、mock门禁、移动固定栏/无横向溢出、免费社区、文章推荐、统计接口与后台鉴权；无障碍检查覆盖图书与社群页面。最终7条端到端流程全部通过。
- 已人工查看1440px桌面与390px手机截图。正式知识星球扫码与付款待真实配置补齐后验收，未模拟成交。
- 构建发现原Next.js依赖的已知缓存漏洞，已更新至同版本线16.4.6（框架及ESLint配置同步）；生产依赖审计为0项漏洞。开发依赖仍有minimatch链路的7项moderate提示，不在本次业务改造中扩大升级范围。

## 修改文件索引

- 页面：`src/app/page.tsx`、`book/page.tsx`、`membership/page.tsx`、`community/page.tsx`、`about/page.tsx`、`[section]/[slug]/page.tsx`、`admin/page.tsx`、`admin/marketing/page.tsx`、`privacy/page.tsx`、`sitemap.ts`、`layout.tsx`。
- 公共组件：`src/components/site.tsx`、`navigation.tsx`、`catalog-page.tsx`、`media-detail.tsx`、`marketing/promos.tsx`、`marketing/purchase.tsx`、`marketing/tracking.tsx`。
- 配置/服务：`src/lib/marketing/config.ts`、`book-toc.json`、`events.ts`、`analytics.ts`、`seo.ts`、`src/lib/db.ts`、`src/app/api/marketing/events/route.ts`。
- 样式/素材：`src/app/marketing.css`、`public/marketing/book-cover.png`、`bingyue-portrait.png`、`community-share.png`。
- 数据/验证：`supabase/migrations/010_marketing_metrics.sql`、`tests/marketing.test.ts`、`tests/e2e/marketing.spec.ts`、`tests/e2e/community.spec.ts`。
- 依赖：`package.json`、`package-lock.json`；交付说明：本文件。

## 待补充与后续范围

本次mock版本可以展示和推广图书、免费资源及社群方案。正式社群开售仍需要实际付费邀请链接/二维码、会员入口、正式年费、确认权益、退款/发票/客服规则。可选补充已授权专家推荐、真实会员内容预览、真实活动照片。

后续P2：经证实存在接口后再做FDEChina配置同步；独立商户支付、订单/会员统一身份、小程序权益关联、支付平台真实成交归因均未实施。当前已有基于现有公开内容的延伸阅读，未新增个性化推荐系统。

回归过程中修正了一条既有测试的瞬时状态断言：申请成功后表单会被服务器刷新替换，改为检查持久化的「查看申请进度」入口，没有修改申请业务逻辑。
