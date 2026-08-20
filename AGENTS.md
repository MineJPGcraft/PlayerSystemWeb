# AGENTS.md

面向 AI 编码代理与人类协作者的工程指南。如果你没有95%以上的把握，请向用户询问。

## 项目是什么

**PlayerSystemWeb**（原 yggdrasil-web）是 Minecraft 外置登录（Yggdrasil / authlib-injector）认证服务器的**纯静态前端**：

- 不包含任何 Node.js 服务端代码（无 Express、无后端逻辑），构建产物 `dist/` 为纯静态文件，可部署到 GitHub Pages / Nginx / 任意静态托管。
- 必须搭配一个可访问的 Yggdrasil 认证后端使用，前端负责注册、登录、角色与皮肤管理、启动器会话、OIDC 回调、投票、议题、通知公告、管理侧（Moderator+）与管理后台 Console（Admin）等全部 UI 交互。

> ⚠️ 这不是认证服务器本身。`/yggdrasil/*` 是**后端协议路径**，是前后端契约，禁止改名。
> ⚠️ 业务接口规范以 **AuthAPI-doc** 为准（用户/邮箱验证码/人机验证 / 投票 / 议题 / 管理 / 后台端点），前端仅实现 UI 层，所有路径、字段、错误码均按文档约定。

### 权限模型（前端视觉/交互三档）

- **普通用户 user**：仪表盘、角色与皮肤、启动器会话、投票、议题、通知、个人信息。
- **管理侧（moderator 及以上）**：/management/* —— 用户、封禁、投票管理、审计日志、身份组（只读）、Yggdrasil 资源。路由 meta 加 `minRole: 'moderator'`。
- **管理后台（admin）**：/console/* —— 独立鉴权（主站 Cookie + 后台 JWT），更改用户系统角色、身份组增删改与分配、通知与公告、Issue 标签、前缀预设、配置热重载、后台审计。路由 meta 加 `consoleAuth: true, minRole: 'admin'`。

## 技术栈

| 类别 | 技术 |
|---|---|
| 框架 | Vue 3.5（Composition API + `<script setup lang="ts">`） |
| 语言 | TypeScript 5.6（严格模式，`verbatimModuleSyntax` 需 `import type`） |
| 构建 | Vite 6（`base: './'`，支持子路径部署） |
| 路由 | Vue Router 4（`createWebHistory` + 登录/角色/后台 JWT 守卫） |
| UI | shadcn-vue（基于 reka-ui）+ Tailwind CSS 4 + 多主题 |
| 3D 预览 | skinview3d + three |
| 请求 | axios（`withCredentials` Cookie 会话；后台另有独立 axios 实例） |

## 常用命令

```bash
npm install        # 安装依赖（仓库不提交 package-lock.json，勿用 npm ci）
npm run dev        # 开发服务器（--host ::），/api 代理到 VITE_DEV_API_PROXY_TARGET
npm run build      # vue-tsc 类型检查 + vite 生产构建 → dist/
npm run type-check # 仅类型检查
npm run preview    # 本地静态预览构建产物
```

## 目录结构

```
├── src/
│   ├── api/            # 全部后端 API 封装（按域拆分，index.ts 统一导出）
│   │   ├── http.ts         # 主站 axios 实例（Cookie 会话，401 → /login）
│   │   ├── consoleHttp.ts  # 后台 axios 实例（自动附带 Authorization: Bearer {JWT}，独立 401 → /console/login）
│   │   ├── types.ts        # 共享类型（ApiError / GameProfile / PrefixPreset / IdentityGroup / SystemRole 等）
│   │   ├── server.ts       # GET / 状态与功能开关、Yggdrasil 元数据
│   │   ├── captcha.ts      # GET /captcha/config 人机验证配置
│   │   ├── email.ts        # POST /email/code/* 邮箱验证码
│   │   ├── user.ts         # /user/*：注册/登录/me/改密/改邮箱/前缀/通知/公告/OIDC
│   │   ├── votes.ts        # /votes/* 用户侧投票
│   │   ├── issues.ts       # /issues/* 用户侧议题
│   │   ├── management.ts   # /management/* 管理侧（用户/前缀/封禁/投票管理/审计/身份组/Yggdrasil）
│   │   ├── console.ts      # /management/console/* 后台端点
│   │   └── yggdrasil.ts    # /yggdrasil/* 协议端点（禁止改名）
│   ├── views/            # 页面组件（路由懒加载）
│   ├── views/console/    # 后台 Console 页面（ConsoleLogin / ConsoleLayout + 各模块页）
│   ├── components/       # 通用组件（UserDisplay/AppPageHeader/AppPagination/NotificationsBell/AuthShell 等）与 ui/*（shadcn-vue）
│   ├── composables/      # useTheme / useUserInfo / useCaptcha / useConsoleAuth
│   ├── layouts/          # DefaultLayout（侧边栏 + 内容区）
│   ├── lib/              # cn、seo、siteConfig、textures 解码、apiError（错误码提取）、format（时间）、permissions（角色层级）
│   ├── router/           # 路由 + 守卫
│   ├── themes/           # 主题系统（light/dark/ocean/aurora/aurora-dark + themes.ts）
│   ├── App.vue
│   └── main.ts           # 应用入口（bootstrap：加载站点配置 → 恢复深层路由 → 挂载）
├── public/
│   ├── config.json       # 站点展示配置（标题/首页/页脚，运行时加载，无需重建）
│   └── 404.html          # 纯静态托管的 SPA 深层路由回退
├── vite.config.ts        # @ 别名、/api 开发代理、manualChunks 分包
└── .github/workflows/    # CI 构建 + GitHub Pages 部署
```

## 关键约定

### API 层（src/api）
- 主站请求经 `src/api/http.ts`：`baseURL` 构建期决定（生产 `VITE_API_BASE_URL`，默认 `/api`；开发恒为 `/api` 由 Vite 代理），`withCredentials: true` 携带 HttpOnly Cookie。
- 后台请求经 `src/api/consoleHttp.ts`：同时携带主站 Cookie 与 `Authorization: Bearer {JWT}`（JWT 存 `localStorage.consoleJwt`），401 清 JWT 并跳 `/console/login`。
- 401（主站）拦截器会清除 `localStorage.userInfo`、派发 `auth:expired` 事件（`useUserInfo` 监听清空内存态）并跳转 `/login`（动态 import router 以解除循环依赖）。
- `src/api/yggdrasil.ts` 封装 `/yggdrasil/*` 协议端点。**这些路径、函数名与类型名（如 `YggdrasilProfile`）属于后端协议契约，禁止改名。**
- 新增 API 时在对应域文件实现并在 `src/api/index.ts` 统一导出。

### 登录态与本地存储
- `localStorage.userInfo` = 前端登录态标记 + 用户信息缓存（真实凭据为 HttpOnly Cookie）。**必须是当前模型**：`userId`、`username` 为字符串且 `prefixes`、`identityGroups` 为数组；`useUserInfo`（`src/composables/useUserInfo.ts`）读取时会校验并丢弃旧版/损坏数据（升级前旧结构会触发渲染崩溃，禁止回归）。
- `localStorage.consoleJwt` = 后台会话 JWT（`consoleHttp` 自动附带；`useConsoleAuth` 管理）。
- 用户展示一律用 `username`，格式 `[前缀]username[身份组][系统角色]`（由 `src/components/UserDisplay.vue` 渲染）。

### 人机验证（src/composables/useCaptcha.ts）
- Provider 与 siteKey 一律由后端 `GET /captcha/config` 下发，前端禁止硬编码；支持 turnstile / hcaptcha / recaptcha / geetest。
- token 通过请求头 `X-Captcha-*` 传递；表单提交走 `withCaptcha(action, () => el, async (headers) => {...})` 包装，自动处理 `CaptchaMissing/Expired/Invalid/Required` 重拉配置、弹 widget 并重试一次（不清空表单）。

### 站点配置驱动
- 站点文案（品牌名、SEO、首页 Hero、页脚）由 `public/config.json` 驱动，`src/lib/siteConfig.ts` 在启动时加载并与默认配置深合并；用户可直接改 JSON，无需重新构建。
- `src/lib/seo.ts` 按路由 `meta.title` 动态更新 `document.title` 与 meta 标签。

### 路由与守卫（src/router/index.ts）
- 认证态以 `localStorage.userInfo` 为标记；`requiresAuth` 未登录跳 `/login?redirect=...`；已登录访问 login/register/reset-password/home 跳 `/dashboard`。
- 新增受保护页面：meta 加 `requiresAuth: true, sidebar: true, title: '...'`；管理侧再加 `minRole: 'moderator'`；后台再加 `consoleAuth: true, minRole: 'admin'`。
- `console-login` 是「已登录管理员的后台密码登录入口」，**不要**归入 publicOnlyPages（否则会被重定向到 `/dashboard`）。
- 后台 JWT 由 `router.beforeEach` 校验：`/console/*` 无 JWT → `/console/login`；有 JWT → 直接进入。

### 环境变量（构建期）
| 变量 | 作用 | 默认 |
|---|---|---|
| `VITE_DEV_API_PROXY_TARGET` | 开发环境 Vite 代理目标 | `http://192.168.1.132:8095` |
| `VITE_API_BASE_URL` | 生产环境后端基础地址 | `/api` |

`.env.*` 仅在启动/构建时读取一次，改动需重启 `npm run dev`。

### 构建与部署
- `vite.config.ts`：`base: './'`（子路径部署必需）、`server.proxy['/api']` 开发代理、`manualChunks` 分包（vendor-vue / vendor-three / vendor-skinview3d / vendor-reka / vendor-utils）。
- 纯静态部署：`npm run build` 后把 `dist/` 交给任意静态托管；GitHub Pages 见 `.github/workflows/deploy.yml`（注入 `VITE_API_BASE_URL` secret）。
- SPA 深层路由回退：GitHub Pages 等不识别 history 路由，`public/404.html` 把原始地址写入 `sessionStorage` 并跳回站点根，`src/main.ts` 启动时恢复真实路由。**不要删除这两处逻辑。**

### 其他
- 组件统一走 `src/components/ui/*`（shadcn-vue 风格，`<script setup lang="ts">`）；通用业务组件在 `src/components/`（UserDisplay / AppPageHeader / AppPagination / NotificationsBell / AuthShell）。
- 主题：`data-theme` 属性 + `src/themes/*.css`，`src/composables/useTheme.ts` 管理切换与持久化；当前内置 light / dark / ocean / aurora / aurora-dark。
- 代码风格：2 空格缩进、分号、单引号；TS 严格模式（`vue-tsc --noEmit` 会拦截类型错误），且 `verbatimModuleSyntax` 要求类型导入用 `import type`。
- 列表分页统一用 `src/components/AppPagination.vue`（`v-model:page` + `@update:page` 触发加载）；错误信息统一用 `src/lib/apiError.ts` 的 `extractErrorMessage` 提取后端中文文案。

## 常见坑

- 改 `.env.*` 后必须重启 dev server。
- 后端地址不带 `/api` 前缀（开发代理会剥离 `/api` 再转发）。
- 跨域登录失败多为后端 CORS 未允许凭证或 Cookie `SameSite`/`Secure` 配置问题。
- 皮肤预览不显示：确认材质 URL 域名在 Yggdrasil 后端的 `skinDomains` 白名单内。
- 空白页 / 无法导航：检查是否又用了旧版 `localStorage.userInfo` 结构（`prefixes` 缺失会让 `user.prefixes.find(...)` 抛错）；必须用 `useUserInfo` 的带校验读取，模板里对 `user.prefixes` 一律写 `(user?.prefixes ?? [])`。
- 后台进不去跳到仪表盘：`console-login` 被当成公开页处理（见「路由与守卫」）；或当前主站系统角色不是 `admin`/`super_admin`（`minRole: 'admin'` 会拦回仪表盘）。
- 后台接口 401：后台 JWT 过期（JWT 不自动续期，需重新后台登录），主站 Cookie 仍在时可复用，无需重新登录主站。
- 项目名称为 **PlayerSystemWeb**（package.json `name: "playersystemweb"`）；不要把站点名改回 Yggdrasil Web，也不要动 `/yggdrasil/*` 协议路径。
