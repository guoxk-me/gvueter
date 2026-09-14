# 03 技术开发文档

<!-- AI modified: 分离已确认技术目标与仓库静态观察，避免将原型、依赖和历史验收误当成当前实现。 -->

> 产品：Gvueter Admin Template<br>
> 文档日期：2026-09-05<br>
> 文档性质：V1 技术目标、当前实现快照与二次开发指南<br>
> 关联文档：[产品总览](./01-product-overview.md) · [业务规则](./02-business-rules.md) · [UI 与交互](./04-ui-and-interaction.md)

## 1. 阅读方式与技术边界

本文面向前端开发、后端接入方、测试和交付人员，回答“如何开发、如何接入、如何验证”，不替代业务规则或视觉规范。

- **已确认目标**：来自用户确认和产品方案，是后续开发应达到的状态。
- **本次细化建议 / 待评审**：补全工程流程的建议，未确认前不升级为统一业务规则；以业务规则文档的对应标记为准。
- **Inspected（仓库静态观察）**：在本文日期读取源文件、配置和脚本获得的事实，不代表本轮运行通过。
- **待实现 / 待验证**：尚未发现完整实现，或需要运行、集成、人工验收才能成立的事项。
- **Executed（执行证据）**：必须附本次命令、结果及对应版本；测试文件存在、依赖已安装和历史通过记录均不能替代执行证据。

当旧工程文档或现有代码与用户最新确认冲突时，本文保留目标并显式记录差异，不自动修改产品决策，也不宣称代码已经同步。

已确认定位是前端优先的生产级基础模板，而非特定业务系统。后端可替换，只承诺通用 API / OpenAPI 契约；`gnester-lite` 是接入示例，不是强制依赖。

## 2. 技术选型与依赖职责

### 2.1 固定基线

以下为仓库声明版本或版本范围，不是“最新版本”推荐；精确安装解析以 `pnpm-lock.yaml` 为准。

| 分层 | 仓库声明 | 职责 |
| --- | --- | --- |
| 运行时 | Vue `3.5.42`、TypeScript `~6.0.3` | SFC、响应式、严格类型和组件契约 |
| 构建 | Vite `^8.3.0`、`@vitejs/plugin-vue` | 开发服务器、Vue 编译、懒加载和生产产物 |
| 包管理 | pnpm `12.4.1` | 安装、锁文件、catalog 和脚本入口 |
| 路由 | Vue Router `^5.3.1` | History 路由、守卫、动态注册、页面元数据 |
| 客户端状态 | Pinia `^4.0.3`、持久化插件 | 身份投影、布局偏好、跨页面客户端状态 |
| 服务端状态 | TanStack Vue Query `^5.102.8` | 查询缓存、并发协调、Mutation、精确失效 |
| 请求 | Axios `^1.20.0` | 请求头、超时、错误、二进制上传下载 |
| UI 基础 | Tailwind CSS `^4.3.3`、Reka UI `^2.10.4` | 样式 Token 和 shadcn-vue 库存组件基础 |
| 授权投影 | CASL Ability `^7.0.1`、CASL Vue `^3.0.1` | 前端路由、菜单和操作权限体验 |
| 表单 | VeeValidate `^4.15.1`、Zod `3.25.76` | 字段状态、校验、运行时 API 边界 |
| 国际化 | Vue I18n `11.4.10` | 中英文文案与语言同步 |
| 测试 | Vitest `5.0.0`、Playwright `1.63.0` | 单元、组件、浏览器和视觉验证；测试运行时均使用稳定正式版 |

版本来源：[package.json](../../package.json)、[pnpm-workspace.yaml](../../pnpm-workspace.yaml)。Vue 编译器与运行时通过 overrides 保持一致；Vitest 与 V8 覆盖率提供器使用相同精确版本。

### 2.2 场景依赖与可替换模块

| 模块 | 已安装依赖 | 使用边界 |
| --- | --- | --- |
| 高级表格 | `@tanstack/vue-table`、`@tanstack/vue-virtual` | 数据模型和虚拟化；静态 Table 不应被迫加载它们 |
| 图表 | `@unovis/vue`、`@unovis/ts` | 当前图表示例实现，可由业务替换，保留容器响应和状态契约 |
| 日期 | `@internationalized/date` | 日历、日期字段；显示优先使用 `Intl` |
| 富文本 | `@vueup/vue-quill` | 编辑器增强场景，按需加载并执行内容安全策略 |
| 图标与字体 | `@lucide/vue`、`@fontsource/inter` | Inter 已完全本地加载并移除 Google Fonts 请求；图标白名单和其余 Token 对齐仍见 GAP-11 |
| 动效 | `motion-v`、`tw-animate-css` | 动效基础；必须服从 Reduced Motion |
| 轮播、OTP、拖拽抽屉 | `embla-carousel-vue`、`vue-input-otp`、`vaul-vue` | 可能由 shadcn-vue 库存组件引用，不可仅凭业务页未引用就删除 |
| 二维码 | `qrcode` | 示例能力，不自动升级为产品核心认证方式 |
| Mock | MSW | 开发与确定性浏览器验证，不是生产后端 |
| PWA | `vite-plugin-pwa`、Workbox 相关依赖 | 产品定位为可选增强；当前默认行为存在差异，见第 15 节 |

已安装只说明工程可引用，不说明已经完成 Demo、文档、国际化、可访问性和稳定性验收。上游库存组件需要晋级后才能作为稳定能力公开。

## 3. 环境与启动

### 3.1 运行要求

Implemented：Node.js 已统一为 `>=24.18.0 <25`，`.node-version`、CI、容器和文档均以 Node.js `24.18.0` 为最低基线。包管理固定 pnpm `12.4.1`。

```sh
pnpm install --frozen-lockfile
VITE_ENABLE_MOCKS=true pnpm run dev
```

以上显式开启 Mock，适合无后端的首次体验。需要环境文件时，以 [`.env.example`](../../.env.example) 为模板创建本地配置；不能把密钥放入任何 `VITE_*` 变量。

### 3.2 当前真实环境变量

| 变量 | 缺省行为 / 示例 | 注意事项 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 缺省 `/api` | 对接 gnester-lite 默认 URI 版本时使用 `/api/v1` |
| `VITE_ENABLE_MOCKS` | 未声明：开发开启、构建关闭；示例文件显式 `false` | 显式值优先；复制示例后直接启动不会自动开启 Mock |
| `VITE_NOTIFICATION_WS_URL` | 空 / 未声明时不连接 WebSocket | 当前实现变量，不是已确认 SSE 方案的最终配置 |
| `VITE_NOTIFICATION_WS_ALLOWED_ORIGINS` | 空列表 | 跨域 WebSocket 需精确 `wss:` 来源白名单 |
| `VITE_NAVIGATION_ALLOWED_ORIGINS` | 代码缺省空列表 | 示例文件含文档、支持站示例域；真实上线需替换 |

Inspected：目前没有统一的 `VITE_ENABLE_REGISTER`、`VITE_ENABLE_EXAMPLES` 或 `VITE_ENABLE_PWA` 开关，不能在文档中把这些名称当作已支持 API。

### 3.3 常用命令

| 命令 | 用途 |
| --- | --- |
| `pnpm run dev` | Vite 开发服务，常规本地端口 5173 |
| `pnpm run preview` | 预览已有 `dist`，常规端口 4173 |
| `pnpm run check` | 所有 TypeScript 项目检查与 ESLint |
| `pnpm run test:unit --run` | 一次性执行单元 / 组件测试 |
| `pnpm run test:coverage` | 执行测试并检查覆盖率阈值 |
| `pnpm run build` | 类型检查、Vite 构建、Bundle 预算、PWA 产物检查 |
| `pnpm run verify` | 本地与 PR 共用的完整核心门禁 |
| `pnpm run release:check` | Mock 构建、三浏览器 E2E，并保证恢复生产产物 |
| `pnpm run doctor` | 只读检查本地 Node、pnpm、文件、浏览器和端口环境 |
| `pnpm run docs:check` | 检查内部链接、脚本引用、环境变量与生成片段 |
| `pnpm run format` | ESLint 机械修复，会修改文件 |

工具链是官方 Vite / Vitest + pnpm，不使用历史文档中的 Vite+、Oxfmt 或 Oxlint。ESLint 是仓库唯一机械格式化工具。

## 4. 目录与模块边界

当前目录不完全等同于早期建议目录。新增业务应延续现有垂直模块，不为凑齐 `api/`、`plugins/` 等名称创建空目录。

| 目录 / 文件 | 应承担的职责 | 不应承担的职责 |
| --- | --- | --- |
| `src/main.ts` | 启动顺序、插件安装、全局边界 | 用户列表、表单等业务状态 |
| `src/pages/` | 路由页面和功能组合 | 可复用组件库、所有领域规则 |
| `src/features/<domain>/` | 领域类型、契约、组件、查询和工作流 | 应用级主题和身份基础设施 |
| `src/components/ui/` | shadcn-vue / Reka 基础控件 | HTTP、业务权限和具体领域流程 |
| `src/components/admin/` | SearchForm、Drawer、反馈等通用后台组合 | 特定用户 / 角色接口 |
| `src/components/data-table/` | 表格基础与共享分页契约 | 表单草稿或整个业务模块 |
| `src/components/pro-table/` | 当前高级表格实现，待统一入口 | 继续作为第二个长期公共品牌 |
| `src/components/layout/` | Header、菜单、Tabs、Shell | 服务器授权规则的事实来源 |
| `src/lib/` | HTTP、CASL、存储、安全和恢复适配 | 无限制堆放领域业务函数 |
| `src/stores/` | 跨页面客户端状态与安全持久化投影 | 复制完整 Query 响应和表单草稿 |
| `src/router/` | 静态路由、守卫、元数据 | 解析任意后端组件路径 |
| `src/mocks/` | 与契约匹配的开发数据和处理器 | 生产身份、存储或审计保证 |
| `src/i18n/`、`src/assets/css/` | 文案、显示语言和样式基础 | 业务状态分支 |

Vue 开发基线为 Composition API、`<script setup lang="ts">`、显式类型、Props 向下 / Events 向上。页面尽量作为组合面，复杂状态进入职责单一的 composable；纯工具保持普通函数。

框架 API 的实际自动导入范围为 Vue、Vue Router、Vue I18n、VueUse 和 `src/composables`。业务组件和工具函数维持显式导入，不能把自动导入当作隐藏模块依赖的方式。

参考：[架构说明](../admin-architecture.md)、[Vite 配置](../../vite.config.ts)。

## 5. 启动和应用恢复

Inspected：[启动入口](../../src/main.ts) 按以下顺序装配：

1. 在异步启动前安装 Vite 懒加载失败恢复监听。
2. 提前恢复主题色，降低首屏闪烁。
3. 创建 QueryClient，决定 Mock / PWA / 无 Service Worker 模式并清理冲突。
4. 必要时等待 MSW 启动，再创建 Vue 应用。
5. 安装全局异常处理、Pinia、I18n 和会话状态边界。
6. 恢复外观并建立语言同步，安装 Router、CASL、Vue Query 后挂载。

全局致命渲染、启动和懒加载错误进入独立恢复界面；普通业务请求失败仍由业务区域处理。旧版本 chunk 失效时提供用户主动重新加载，避免自动刷新循环或丢弃未保存工作。

Service Worker 模式迁移存在受控重新加载分支；这不等于允许业务异常随意刷新页面。

## 6. 状态所有权与缓存

### 6.1 单一来源

| 状态 | 所有者 | 持久化 / 恢复方式 |
| --- | --- | --- |
| 列表、详情、服务端统计 | Vue Query | 运行时缓存；不得复制到 Pinia 作为第二事实来源 |
| 查询条件、分页、排序 | 页面状态 + URL 白名单 | URL 恢复可分享状态；接口层转换一次页码 |
| 当前身份、授权快照 | Auth Store + 后端 | 浏览器只缓存必要会话元数据；刷新后重新取后端身份 |
| 主题、语言、布局偏好 | Appearance Store | 防御性读取本地偏好，需版本化迁移目标 |
| 菜单、动态注册记录 | Permission / Menu Store | 绑定当前主体，变更时卸载并重新编译 |
| Tabs、页面实例 | Tabs Store / KeepAlive | 页面身份与实例缓存分离，不等同于数据新鲜度 |
| 表单草稿、当前 Drawer | 表单 / 页面局部状态 | 默认不长期持久化；特殊草稿需明确身份和生命周期 |
| 通知已读投影 | 通知 Store 与 Query 协同 | 绑定主体，服务器计数优先，不能跨账号复用 |

Inspected：Query 默认 `staleTime=30_000`、`retry=1`、`refetchOnWindowFocus=false`，Mutation 默认 `retry=0`。Dashboard 概览单独使用 `60_000ms` 新鲜期；这些不是所有模块统一适用的产品 SLA。

Inspected：身份变化会执行 `queryClient.clear()`。这是安全边界，不应复用于每次保存；普通业务更新使用精确 `invalidateQueries` 或 `setQueryData`。

### 6.2 查询、刷新与取消

- 已确认目标：首次无缓存加载可使用骨架屏；保留旧数据的后台刷新不能再次清空工作面。
- 已确认目标：默认搜索分离草稿与已应用条件，查询/适用字段 Enter 后提交并回第一页，重置立即恢复默认并查询；有明确需求的字段或页面可显式启用即时查询（LIST-05）。
- Inspected：Users 使用 `['users', userQuery]` 与 `keepPreviousData`，成功保存后失效 `['users']`。
- 待对齐：统一适配器应规定权限 / 主体维度、取消信号、错误类别重试策略和页面停用时的生命周期。
- 注意：Axios 当前 GET 的“后请求取消前请求”与 Vue Query 的共享查询不是同一机制，不可混称自动去重。

当前 GET 封装没有接收 Vue Query `queryFn` 的外部 `signal`，不能宣称 `cancelQueries()` 已保证中断每个底层网络请求。新增封装需验证取消、身份切换与迟到响应的组合场景。

## 7. 认证与会话

### 7.1 已确认目标

认证覆盖登录、退出、忘记 / 重置密码和默认关闭的可选注册。Access Token 支持项目配置选择 `sessionStorage` 或 `localStorage`；Refresh Token 不暴露给 JavaScript，推荐由后端使用 Secure、HttpOnly Cookie 管理和轮换。

存放于 `sessionStorage` 不等于只能登录一次：它决定浏览器标签页会话的存储生命周期，不限制用户再次登录，也不强制双 Token 必须使用 `localStorage`。

### 7.2 当前实现

Inspected：[Auth Store](../../src/stores/auth.ts) 与 [Token 读取](../../src/lib/auth-session.ts) 只使用 `sessionStorage`，启动时主动删除旧 `localStorage` 凭证。当前不存在可切换持久化策略或 `/auth/refresh` 自动续期流程。

- 登录与 SSO exchange 原子接收 Token、用户、后端租户和授权快照。
- `/auth/me` 恢复用户和权限；用户、Token 与授权快照共同成立才视为已认证。
- `sessionRevision` 防止旧登录、退出、身份刷新响应覆盖新会话。
- 并发 `restoreSession()` 共享任务；相同 SSO 票据重复挂载共享 exchange。
- `refreshPrincipal()` 重新获取身份 / 授权，不是刷新 Access Token。
- 普通网络 / 5xx 不删除有效本地凭证；401 和终止性身份码进入统一失效边界。

### 7.3 后续续期契约要求

若实现产品目标中的无感续期，应先明确后端 Cookie、CSRF、跨域和撤销契约，再接入前端：

1. 同一有效主体内的续期请求单飞，多个受保护请求等待同一结果。
2. 已过期请求最多在续期成功后重放一次，禁止无限 401 / refresh 循环。
3. 登录、注册、找回密码和续期本身不得被同一续期拦截器循环捕获。
4. 账号切换、退出后旧续期响应失效，不得恢复已结束的会话。
5. 写请求是否可重放由接口幂等契约决定，不能全局自动重试 Mutation。
6. 续期失败统一释放等待队列、清理权限和受保护状态，再进入登录恢复流程。

以上为待实现约束，不是当前代码已经具备的行为。

## 8. HTTP、错误和副作用边界

Inspected：[HTTP 封装](../../src/lib/http.ts) 默认超时 15 秒；受保护请求附 Bearer，公共身份入口明确去除 Authorization；生成或保留 `X-Request-ID`。

JSON 响应首先校验 `{ code, message, data }` 信封，再按端点 `responseSchema` 校验业务数据。当前 TypeScript 参数允许省略 Schema，但契约脚本要求生产调用点显式声明，不能只依赖泛型断言。

| 失败 | 当前错误投影 / 目标处理 |
| --- | --- |
| 取消 | `canceled / none`，不作为业务错误 Toast |
| 401 或终止性身份码 | `authentication / sign-in`，只对当前受保护请求触发会话清理 |
| 普通 403 | `authorization / request-access`，保留会话，不等同于退出 |
| 409 | `conflict / refresh`，保留输入，刷新目标或重新确认 |
| 422 | `validation / review-input`，回填字段错误并聚焦首个无效控件 |
| 超时、网络、5xx | `timeout/network/server / retry`，提供局部恢复，不抹掉旧数据 |
| 响应结构异常 | `contract / contact-support`，阻止不可信结构进入业务状态 |

Inspected：`request-policy.ts` 的失效锁在一轮会话内只通知一次；HTTP 还比较请求所用凭证是否仍为当前凭证，避免旧 401 清理新账号。锁是失效协调，不是 Token 续期能力。

错误展示不得泄露 SQL、堆栈、Token 或内部地址；支持复制安全 Request ID。422 的 `fieldErrors` 允许非空字符串或非空字符串数组，UI 不能只处理单一形式。

## 9. OpenAPI 与运行时契约

已确认目标：OpenAPI 是传输契约事实来源，`openapi-typescript` 生成 DTO 并提交，CI 检查生成漂移；Zod 继续承担运行时输入 / 输出校验，两者不能相互替代。

Inspected：已有 [OpenAPI 3.1 文件](../openapi.yaml)、共享 [Zod 边界](../../src/lib/api-contracts.ts)、各 feature 的 `*-api-contracts.ts`，以及 `check:contracts` 双向门禁；尚未声明 `openapi-typescript` 依赖或类型生成命令。

- JSON Mutation 请求 DTO 应闭合字段集合，避免未声明属性悄然持久化。
- 网络页码从 1 开始，TanStack 内部从 0 开始，仅在共享边界转换一次。
- `pageSize` 通用上限为 200；具体接口可使用更小允许列表。
- 分页响应包含 `items / total / page / pageSize`，列表长度不得超过页大小或总数。
- 排序字段必须白名单，方向为 `asc / desc`；后端不能直接拼接客户端字段到查询语句。
- 日期时间使用带 `Z` 或偏移的 ISO 8601；业务时区显式使用 IANA 标识。
- 空集合用 `[]`，有意空标量用 `null`，可选字段缺失与 `null` 不混用。
- 文件响应分别检查媒体类型、字节内容与下载头，不能以 JSON DTO 检查替代文件安全。

契约变更必须同时更新 OpenAPI、请求 / 响应 Schema、Mock、前端消费和测试。新增后端不能只照抄 MSW 输出后便宣称兼容。

## 10. 动态路由、菜单与授权

### 10.1 导航编译

Inspected：[导航编译器](../../src/features/navigation/navigation-contract.ts) 通过固定 `navigationComponents` 映射懒加载组件。后端只能选择 `componentKey`，不能返回 JavaScript、import 路径或任意组件 URL。

当前导航结构支持 `menu / external / iframe`，内部路径、route name、component key 成组校验；外链排除内部路由字段，iframe 必须使用固定组件。当前防御预算是最大深度 8、最大节点 500，防止恶意 / 异常树失控，不代表正式信息架构允许八级菜单。

Inspected：动态路由注册成功后才提交菜单；注册异常会移除本轮已添加路由。退出、主体变化或菜单重载调用 `removeRoute` 清理旧记录和相关 Tabs。

当前静态路由仍包含 Dashboard 和若干隐藏示例路由，不能描述成“所有业务路由全部由后端控制”。原型菜单位置调整也不应自行迁移既有 `/dashboard` 等 URL。

### 10.2 安全与权限

- 授权快照包含 `contractVersion`、`policyVersion`、`grants`、`dataScope`；角色名称不是授权来源。
- `permissionIdentifier` 是稳定业务标识，CASL `action/subject` 是前端 UX 投影。
- 数据范围包含本人、本部门、本部门及下级、自定义部门、全部；后端先施加范围再筛选分页。
- 角色策略编辑与普通 Settings 权限分离，不能通过用户编辑间接获得角色分配权。
- 未授权的已知路径进入 403；未知路径进入 404；缺失或无效授权默认拒绝。
- 外链 / iframe 使用精确 HTTPS origin 白名单；前端、后端和 CSP 必须一致，禁止凭据 URL。
- iframe 在 sandbox 中运行；当前不允许 `allow-same-origin`，不能把嵌入内容当可信页面。

“隐藏按钮”永远不是安全保证。每个真实接口必须独立认证、授权、检查租户和行级数据范围。

### 10.3 Permission 阶段的已确认目标契约

<!-- AI modified: 记录 Q1070–Q1146 的实现边界，避免把权限树可见集当成服务端完整授权或把全局范围套用到无关操作。 -->

本节是目标契约，字段需经过 OpenAPI 与运行时 Schema 的兼容性设计后落地；不是对现有端点新增字段的实现声明。

| 对象 | 目标职责 | 不能混用的概念 |
| --- | --- | --- |
| 角色记录 | 稳定身份与编码、名称、系统/自定义类型、启用状态、说明、关联用户数、审计摘要 | 显示名不授予权限；新建不能自选系统身份 |
| 角色编辑版本 | 基本信息、显式权限和数据范围的乐观并发控制 | 不用权限目录版本替代记录版本 |
| 权限目录版本 | 页面/操作定义、依赖、可见与可授予投影的一致性 | 不等于登录主体的有效权限版本 |
| 授权快照版本 | 多启用角色合成后的权威授权，驱动 CASL、导航与缓存更新 | 不把编辑草稿或单角色响应直接写入 Ability |
| 数据范围 | 角色默认范围与部门选择，资源声明适用性 | 不作为无功能授权时的独立 Allow |

后端对每个资源/操作分别取“授予此操作的启用角色”的范围并集；角色 A 的全部查看范围不能扩大角色 B 的部门编辑范围。V1 为 Allow-only，无 Deny、用户级覆盖或角色继承。Super Admin 标记由后端保护，普通角色快照、复制及客户端字段均不能制造该标记。

权限目录响应只包含当前操作者允许查看的内容，并区分可修改与锁定。客户端提交可编辑范围及其角色/目录版本；服务端重新校验身份、可授予范围和依赖后，在原子事务内合并并保留锁定、隐藏及未清理的未知旧编码。客户端省略的隐藏项不代表撤销；计数、差异与异常列表也需要后端可见性投影。若范围在提交时收窄，应拒绝冲突变更并返回可恢复信息，不静默扩大或删除授权。

目录批选、页面访问和操作选择是不同领域动作：批选仅改变明确范围的可修改项，勾选页面不授予全部操作，选择操作补齐必需页面，撤销页面遇锁定操作时保留其依赖。搜索后的祖先只是显示/依赖路径，不能扩大批量目标。权限树完整获取的是“允许查看的目录”，不是无权限过滤的全局目录；虚拟化只改变可见行渲染，不改变选择、搜索、依赖和版本语义。

Vue Query 分别管理角色列表、角色详情、可查看授权目录、可选角色、部门树与权威授权摘要；Query Key 纳入实际影响响应的主体、版本和筛选条件。表单草稿、搜索词、展开状态及 Drawer Tabs 保留本地。后台刷新不覆盖脏草稿，关闭/身份变化释放查询；保存成功精确失效相关角色与用户摘要，涉及当前身份时重取授权并重建导航、清理无权缓存。

角色保存或用户角色分配都须由后端验证最新的授权边界；高影响确认中的差异与人数是有权查看的预览，不能代替提交校验。区分角色冲突、目录变化、字段/节点错误、普通网络失败与保存成功后的刷新失败；保留草稿，禁止自动覆盖或自动合并权限。其他在线用户通过请求或推送发现授权快照版本变化后更新，后端即时撤权不依赖前端接收到通知。

Inspected：当前 `AdminUser` / `UserInput` 是单一 `role`，`RoleDefinition` 只含固定 key、权限和单一范围，`UpdateRolePolicyInput` 没有编辑版本；页面使用 RoleCardSelector + RolePermissionMatrix。因此多角色 DTO、角色 CRUD、授权目录投影、版本字段及按资源/操作范围合成均需后续迁移（GAP-14），不能仅将现有矩阵换成树即视为完成。

## 11. DataTable、SearchForm、Form 与 Drawer

### 11.1 已确认的公共入口

<!-- AI modified: 用 09 已确认的 Shell、协调层和单一 Remote Query 适配职责替换未决组合描述。 -->

业务列表统一使用一个 **DataTable** 公共入口，通过配置表达共性，插槽承载业务差异，高级插件按需启用；不保留 DataTable / ProTable 两个并列的长期公共组件品牌。

简单静态结构仍使用基础 `Table`，不承担 Query 和 TanStack Table 的运行成本。单一入口不等于把所有功能写进一个巨大 SFC，也不等于必须一次加载所有高级实现。

| 层 | 推荐责任 | 排除责任 |
| --- | --- | --- |
| 基础 Table | 表格语义和样式 | 请求、分页、缓存、业务提交 |
| DataTable | 列、行身份、分页排序、选择、密度、状态和扩展点 | 具体用户 / 角色 API |
| 高级插件 | 虚拟化、树表、固定列、行内编辑等可选逻辑 | 无条件增加所有列表首屏成本 |
| SearchForm | 搜索草稿、查询 / 重置事件、字段布局 | 自行发请求或保存服务端结果 |
| DataTable Remote Query 适配层 | 统一查询生命周期、分页衔接、取消、缓存、重试和刷新 | 固定业务 API、领域 Mutation、表单草稿 |
| 领域 composable / Recipe | 提供类型化 queryKey/queryFn、响应适配器、Mutation 与领域错误映射 | 重复通用 Query 缓存和取消流程 |
| Form | 草稿、字段验证、脏状态、服务端字段错误 | 长期缓存列表数据 |
| Drawer | 开关、焦点、标题、正文滚动和底部操作区 | 绑定固定领域接口 |
| ListWorkspace Shell | 页面标题、搜索、工作面与辅助区域的可组合布局 | 固定领域接口和查询缓存 |
| useListWorkspace | 协调已应用条件、URL、分页排序、选择与 Drawer 上下文 | 第二套 Query 实例、复制服务端缓存、表单验证引擎 |

提供轻量 `ListWorkspace` Shell + `useListWorkspace`，允许 SearchForm、DataTable、Form 和 Drawer 独立使用；复杂业务可通过类型化插槽和回调扩展。配置对象本质仍通过 Props 输入，是组织复杂契约的方式，不是取代 Props 的另一套机制。

默认搜索草稿与已应用条件分离；仅后者驱动 Query Key 与白名单 URL。空值与默认值省略，URL 不含选择或表单草稿；浏览器前进/后退恢复条件和可见控件，不创建重复逻辑 Tab。高级筛选展开状态属于当前 Tab 会话，列显隐、顺序与密度按主体和稳定 Table ID 保存为个人偏好，并支持恢复默认。

SearchForm 收起态使用四列等分栅格：关键词、状态、角色和操作组各占一列；操作组内部按钮保持内容宽度并右对齐。展开态遵循字段的自然文档流，第一行补入部门，第二行的两个日期范围分别跨两列，操作组移动到全部字段之后并在独立行右对齐，不使用右上角固定定位。日期范围由开始日期、结束日期组成单个范围控件。宽屏四列，中等宽度 `2×2`，移动端单列；该规则属于 ListWorkspace 默认 Recipe，页面可在字段契约中显式调整跨度。

Remote 模式由 DataTable 的通用 Query 适配层（内部可复用 composable）统一接入查询生命周期。调用方提供类型化 `queryKey`、`queryFn`、响应适配器和必要策略，不在每个业务列表重写缓存、分页衔接、保留旧数据和取消处理。领域 Mutation 与表单流程由业务 composable / Recipe 组合；这些是目标职责，具体插件及 Props 签名仍需在迁移时定稿。

工作区消费该适配层公开的状态与动作，不再建立同键查询来协调 Drawer。Form 使用 VeeValidate + Zod 管理局部草稿和校验；远程详情、选项及 Mutation 继续归 Vue Query。Query 适配器保留主体/权限范围与取消信号维度，不能以 UI 同步代替后端授权或重试契约。

### 11.2 当前实现与迁移方向

Inspected：`DataTable.vue` 和 `ProTable.vue` 同时存在；前者直接使用 TanStack，后者承担服务端分页、筛选、列控制、展开、虚拟化、密度、局部全屏和行内编辑。当前高级能力是 Props 开关，不是已经形成独立懒加载插件协议。

Inspected：SearchForm 已有泛型字段配置和 search/reset 事件；Users 页面仍直接组合 Query 与 Mutation；多个 `*FormDialog.vue` 使用通用 `FormDialog`。`Drawer.vue` / `DetailDrawer.vue` 虽已存在，不能据此认定业务 CRUD 已统一为 Drawer。

迁移应先定义唯一 DataTable 公共契约并建立兼容测试，再把 ProTable 能力逐步迁入内部实现；不要先机械改名，造成分页、选择、列状态和可访问性退化。

### 11.3 分页、虚拟化与树

- Remote 默认每页 20 条，可选 20/50/100/200，端点可收紧。分页解决数据请求范围，虚拟化解决当前可见行的 DOM 成本，可以组合；每页 200 条可显式开启虚拟滚动。
- 不应仅按数据条数强制开启；固定高度、复杂单元格、滚动容器与实际性能都需验证。
- 树结构可以虚拟化，但必须对“展开后的可见节点列表”虚拟化，并保持稳定行 ID 和层级关系。
- 远端子节点懒加载、父子选择、加载失败重试和总数语义需额外契约，不能由 `getSubRows` 自动推导。
- Inspected：现有 ProTable 含 `getExpandedRowModel`、`getSubRows` 与虚拟器；这不证明动态高度、树懒加载、固定列等任意组合均已验收。
- 选择使用稳定 ID，默认仅当前页；跨页须显式启用。筛选、排序、页大小变化及显式刷新清空默认选择。行内编辑插件显式进入并限制一次一行，冲突组合禁止开启并说明。

### 11.4 提交与恢复

新增、编辑和详情默认 Drawer；删除等危险操作使用确认 Dialog；复杂长流程使用独立页面。Mutation 期间锁定发起控件，保留正文和错误；冲突、部分失败不得清空草稿或伪装全部成功。

保存成功默认关闭 Drawer，以服务器响应为准精确更新 / 失效关联 Query，保留筛选与合法页码；新记录不匹配当前结果时提供详情入口，不将草稿强插列表。删除使当前页失效才回到最近合法页。仅低风险可回滚即时开关允许按配置乐观更新，普通 CRUD 等待服务器确认；可重试写操作遵守后端幂等契约。

远程编辑立即打开 Drawer，首次详情用结构匹配 Skeleton，可信缓存可先展示并标记刷新；迟到详情不能覆盖已经改动的草稿。首次 Blur/提交显示校验，已有错误后输入重验；422 回填字段，摘要定位首个可修正错误。409 在原 Drawer 内比较服务端与草稿，重新读取和人工修正，不默认强制覆盖。

<!-- AI modified: 将 09B 用户 CRUD 的 Query、身份和部分成功边界接入目标技术契约。 -->

UserCrudRecipe 组合纯结构 BusinessDrawerShell；Shell 不导入用户 API、Vue Query 或 VeeValidate。用户详情、部门树、角色选项、有效权限和邀请状态使用独立、类型化 Query Key，Query Key 纳入当前主体及实际影响响应的权限范围。字段草稿与 Dirty 状态留在 Recipe 本地，远程选项失败只封锁对应字段，不把整个 Drawer 误判为失败。

目标用户契约至少区分稳定 `id`、姓名、唯一登录邮箱、可选 E.164 手机号、可选主部门、`roleIds`、人工账号状态、只读锁定信息、邀请摘要、版本以及创建/修改元数据。创建请求以 `sendInvitation` 表达投递意图，不再要求前端生成或保存临时密码；响应必须分别表达账号创建与邀请投递结果。邮箱修改、重发邀请、解除锁定、禁用和逻辑删除使用独立授权动作与端点，不混入普通资料更新。

创建/更新成功先以权威响应更新用户详情，再精确失效列表与权限摘要；新记录不匹配当前筛选时只提供详情入口。逻辑删除的短时撤销需要服务端可验证的恢复能力，不能只把本地行重新插回缓存。409、403 和远端不存在均保留当前草稿；重新提交写请求必须遵守版本和幂等契约。

### 11.5 已规划的 Form 与高级 Recipe

<!-- AI modified: 记录 09C 已确认的复用来源与尚未实现边界。 -->

- 09C 拆为 Basic、Content Workbench、Step、Dynamic 与 States 五组。可复用现有 Basic/Profile/FormDialog 字段与校验、FormWorkbench 草稿适配器、Announcement 发布生命周期、SteppedForm 步骤守卫及 SchemaDrivenForm 条件字段，但必须按新 Recipe 边界重新组合；当前三步 Stepper、单一角色/Dialog 或联系人数组不能直接代表目标原型。
- 内容发布工作台按安全、主体隔离的草稿适配器显式开启自动保存；普通 Form 默认不持久化。创建应用 Step Form 每步校验当前及依赖，最终完整验证；步骤编号可进入 URL，但恢复不能绕过前置状态。
- 通知规则 Dynamic Form 使用前端类型化 Schema，后端仅提供数据和选项；未知字段类型或规则显式报配置错误并阻止错误提交，复杂字段走类型化扩展点。
- `FormPageShell` 只提供页面级布局插槽，不持有 VeeValidate、Vue Query 或领域状态。可选 `DraftAdapter` 延续现有按主体隔离、Schema 版本、迁移、非法草稿拒绝和存储受限降级契约；Content 与 Step 可消费，Basic 默认不启用。
- Step 的前三步只更新本地会话草稿，最终 Mutation 才原子创建应用。Dynamic Form 以单一版本提交事件、受众、发送限制和启用渠道；前端可分区校验，但不得把多个接口的局部成功伪装成原子保存。
- Content Workbench 的 `DraftAdapter` 默认使用 800ms debounce，并在 blur/visibility change 时尽力 flush；只有权威远程草稿响应可以更新保存基线。远程已保存但尚未发布与本地 Dirty 是两个状态，pending/error 离开守卫不得被自动保存开关绕过。
- 内容预览通过新的逻辑应用 Tab 打开只读投影并保留原表单实例；富文本与 Markdown 是不同编辑器 Recipe，不在同一草稿中做有损双向转换。创建应用成功响应中的 Secret 只允许一次性短暂呈现，不写入 DraftAdapter、URL、Tab 持久化或日志。
- Dynamic Form 维护单一根表单状态；渠道切换不触发 Mutation。被禁用渠道从有效发送投影中排除但保留非敏感草稿字段；服务端 Secret 只返回掩码/存在标记，重新启用按契约验证。Schema 错误应带可定位路径，用于同时驱动摘要、渠道 Badge 和字段错误。
- 09C 状态适配器应区分客户端 touched/blur 错误、422 字段映射、根级提交错误、Mutation pending、远程草稿状态与发布状态；摘要导航需通过稳定字段路径切换 Dynamic 渠道并聚焦实际控件。单文件上传维护独立任务状态，失败重试不得重置其余附件或表单。
- 离线仅写按主体和 Schema 版本隔离的会话草稿；恢复网络后先读取权威版本再提交。409 差异 Drawer 消费服务端明确返回的版本/字段差异，不允许前端以陈旧快照伪造强制覆盖。权限撤回时移除受保护 Query 投影，用户输入只保留在当前内存/会话边界。
- Step 过期草稿不得跨不兼容版本恢复；一次性 Secret 在确认或路由离开后清除，并排除在 storage、URL、日志和错误上报之外。响应式仅改变布局与导航呈现，不改变字段路径、校验或提交语义。
- 09C 原型通过 04B 共享 Ref 和 Token 组成；若缺少变体，先扩展共享组件契约并同步全部实例，禁止复制后各自演化。四张主 Recipe 共用 Admin Shell 来源，但必须通过实例覆盖表达各自的菜单选中态和 Breadcrumb，不能继承用户列表的业务上下文。
- 富文本高频命令直接显示、低频命令进入更多菜单；封面和附件维持不同上传任务语义。一次性 Secret 的遮挡只属于显示状态，明文生命周期仍受 FORM-25/30 限制。可主题化结果 SVG 使用语义色 Token，不硬编码 violet 或 Light-only Fill。
- 导入预览按后端能力选择跳过/更新，结果保存行级错误和最近任务摘要；重试限定修正后的失败行，结果未知先按幂等契约核对。当前页/少量选择可直接导出，大范围导出走后端异步任务；字段只来自允许的导出配置，任务状态保留在当前页面。
- 09D 继续以 `DataTable` 为唯一业务增强入口，通过可选 Import、Export/Batch、Inline Edit、Tree 与 Virtual 插件提供能力；页面 Recipe 组合插件、Vue Query 与业务端点，插件本身不持有领域 API。未启用插件不得进入基础 Table/DataTable 的静态依赖路径。
- 09D 的权威校验、全量任务、批量写入、幂等、权限与冲突由服务端契约负责；前端状态机只表达上传、预览、提交、轮询、取消、恢复与结果。组合矩阵必须逐项验收，未验证的树形、虚拟化、动态行高、固定列和行编辑组合不进入稳定承诺。
- Import 插件以 CSV 为稳定输入，XLSX 解析器按需加载；版本化模板与可选字段映射由端点 Schema 驱动。前端预检后上传原文件，服务端返回权威预览与任务身份；重复策略、是否允许更新及取消能力均来自端点能力，不能由组件猜测。
- Import/Export 使用可轮询或未来替换为推送的统一任务资源。关闭 Drawer 只释放视图状态，不删除服务端任务；列表页保存最近任务身份和摘要。Export 创建与下载分别鉴权，字段取服务端 allowlist 与用户选择的交集；直接下载和异步导出共享相同范围序列化规则。
- Batch Mutation 响应显式携带 `atomicity`、成功目标、失败目标和可重试信息；前端不得从 HTTP 200 推断每个目标均成功。失败重试只提交仍合法且已确认的失败目标。
- Inline Edit 插件维护单一活动行的本地草稿、校验和版本；Mutation 成功后以权威响应更新缓存并重新应用筛选/排序，409 保留草稿和差异。行切换与页面离开共用 Dirty Guard，键盘提交不得覆盖 Textarea、Combobox 等控件语义。
- 金额字段以币种对应的最小货币单位整数进入 DTO，显示层通过 `Intl.NumberFormat` 和当前 Locale/Currency 呈现；库存 DTO 为非负整数。Schema 必须明确币种、精度和上下限，禁止用浮点 DTO 承担金额权威值。
- Tree 插件必须显式接收 Local 或 Remote 数据适配器、稳定 `rowId`、展开集合及选择策略。Remote 子节点使用独立 Query Key 和局部请求状态；搜索投影与真实展开集合分离，同级排序不得把父子关系拍平。级联选择只有在能够表达未加载后代边界时才可启用。
- Virtual 插件以稳定 ID、Cursor 和可预测行高为默认契约；动态行高需单独测量和验收。无限追加保留锚点，底部错误不替换已有数据；顶部实时插入先进入待显示缓冲和计数，不直接重排用户正在阅读的可见窗口。
- `ImportDrawerRecipe`、`ExportDrawerRecipe`、`BatchResultDrawer`、`InlineEditRow` 与 `AsyncTaskSummary` 是页面可复用组合层，不进入 DataTable 核心。它们消费插件状态、类型化任务资源和业务 Mutation；DataTable 仍只负责数据模型、渲染与插件生命周期。
- 兼容矩阵按 Supported、Conditional、Experimental、Unsupported 记录，并与自动化用例对应。Drawer 焦点循环、行编辑 Enter/Esc 作用域、树方向键/展开、虚拟列表焦点锚点和错误定位必须在组件接口阶段定义，不能等页面完成后补丁式加入。
- 当前稳定矩阵包含 Remote/Pagination/Selection/Batch；Inline Edit 与数据集变化、Tree 与 Virtual、Tree 与 Inline Edit 需要条件门禁；Inline Edit + Virtual 及 Dynamic Height + Virtual 只暴露实验标记，不进入默认类型提示或稳定示例。能力注册表负责阻止 Unsupported 组合并在开发环境说明原因。
- 最近任务只在主体隔离的会话存储中保存不敏感 ID，详情始终通过服务端重新取得。轮询由 Vue Query 控制退避、窗口隐藏降频和取消，未来推送适配器只替换同步通道。下载 URL 不进 Query 持久化、日志或本地存储，过期后重新鉴权获取。
- 性能验收以 200 行分页虚拟化、三级树展开和持续 Cursor 追加为代表场景，记录测量环境、滚动锚点、焦点和稳定 ID；静态画板及配置阈值不能作为 FPS 已达标的证据。
- Import 错误投影使用稳定行号与错误编码，只返回操作者可见的原字段；Export 字段取 allowlist 与当前选择的交集。Tree 子节点以 parentId、稳定 ID 和可选后代计数合并，权限投影在服务端区分不可见与只读。Audit Cursor 由服务端事件时间和稳定事件 ID 组成，敏感字段在响应生成前脱敏。
- 通用任务资源使用 queued/running/succeeded/partially_succeeded/failed/cancelled/expired 状态，并可选返回 completed/total；缺少真实总量时 UI 使用 indeterminate。创建命令携带幂等键，网络结果未知时先查询原任务或幂等结果，再决定是否允许重试。
- `09B`、`09C`、`09D` 与 `09E` 已完成 Candidate 原型和静态 QA；这些均不代表 Recipe、邀请端点、插件协议或运行行为已有代码与测试。09E 以 768×1024 与 390×844 为精确原型视口，1920/2560 及区间内布局必须在真实浏览器中验证，不能仅凭静态插值认定通过。`09A–09E` 的绘制与静态 QA 证据以[原型计划](../prototype-plan.md)为准，现有差异继续按 GAP-01/02 迁移。

## 12. Tabs、KeepAlive 与 URL

Inspected：[Tabs Store](../../src/stores/tabs.ts) 把标签绑定主体后持久化到 `localStorage`；同一活动路由仅 Query 变化时更新当前逻辑标签，不持续新增重复标签。

Inspected：[路由出口](../../src/components/layout/AdminRouteOutlet.vue) 用 `cacheKey` 控制 include，以活动 Tab 身份决定页面实例 key，当前 KeepAlive 上限为 20。已确认目标为默认 10 且可配置，后续应按此迁移和验收，不能把页面实例缓存当服务器结果持久化。

- 路由参数、筛选、Tab、树选择和详情 Drawer 只允许写入声明过的 URL 键。
- 身份凭据、密码、完整表单草稿和敏感查询不得写入 URL。
- 返回、刷新和复制链接都要恢复同一业务上下文，同时再次验证权限和资源存在性。
- 缓存页 deactivated 时应释放高成本观察、轮询与连接；activated 后按新鲜度恢复，而非固定全量刷新。
- 关闭标签、权限撤销、账号 / 租户切换应同步清理页面实例与受保护投影。

当前 URL 适配器会保留其他模块拥有的 Query 键，并对自己管理的字段应用允许列表。详细边界见 [页面状态与 URL 契约](../page-state-and-url-contract.md)。

## 13. 主题、国际化与可访问性

已确认目标：三层 `gv-*` Token、默认 Violet、Light / Dark / System、受控品牌预设、舒适密度及局部 Compact。Shell 使用 240 / 72px 导航和 Header 内 Breadcrumb，具体交互以 [UI 文档](./04-ui-and-interaction.md) 为准。

<!-- AI modified: 同步 Q1573–Q1581 确认的主题状态、持久化和无刷新切换约束。 -->

Theme 模式与完整 Appearance 设置分层实现：Header Popover 负责 Light/Dark/System 快速选择，Appearance Drawer 负责项目允许的品牌、三种正式 Layout 和安全选项。`System` 必须作为状态保存并监听系统变化；V1 偏好按用户身份本地隔离、携带 Schema Version 并支持迁移/安全重置，账号同步仅预留契约。切换过程不得重建 Router、QueryClient 或表单状态，颜色过渡为 `150–200ms`，Reduced Motion 下禁用过渡。全局 Store 不再控制统一 Compact，DataTable 等组件自行保存局部密度。

Appearance 配置只接受内置或项目注册的强类型 Palette，注册项必须完整声明 Light/Dark 并通过对比度检查。现有任意品牌色、任意功能色、Default/Ocean/Compact/Midnight 混合 Preset、四档全局尺寸和额外三种 Layout 不进入目标 Store/API；若迁移旧数据，必须逐字段映射到新的安全集合，不能把失效值继续透传。语言保持独立 Locale 状态，不并入 Theme Drawer。恢复默认只删除或覆盖 Appearance 命名空间，不清理认证、Query Cache 或业务草稿。

偏好读取顺序为当前用户命名空间、项目默认；System 作为持久化枚举并通过 `matchMedia` 实时解析。游客命名空间可在首次登录时继承一次，账号切换和退出必须重新解析目标身份，禁止沿用上一账号状态。同一身份跨标签页通过 Storage Event 或 BroadcastChannel 同步，并避免写回环路。迁移失败回退默认并记录一次可展示状态，不阻断启动。

应用 Bootstrap 在 Vue 挂载前读取最小可信字段并同步写入 mode、brand、`color-scheme` 和启用 PWA 时的 `theme-color`；完整 Store 稍后接管但不能造成二次闪烁。Popover 与 Drawer 复用同一 ThemeModeSelector 状态模型。自动保存采用合并写入，成功只更新局部保存状态，失败保留内存主题并提供重试，不以成功 Toast 轰炸用户。

Appearance Drawer 失败态不得撤销已经应用到内存和 DOM 的主题。持久化失败在 Drawer 内保留可重试状态；旧 Schema 迁移失败时丢弃不可信旧值、恢复当前项目默认，并以一次性非阻断消息说明。两类状态都不能阻塞应用启动或改用全局 Toast 循环提示。

跨标签页变更不触发写回环路或全局 Toast；仅在 Appearance Drawer 打开时暴露短暂同步状态。持久化失败即使关闭 Drawer 也必须保留可查询的错误状态，使 Header 入口能够显示弱提示并在下次打开时继续重试。System 的操作系统变化只改 resolvedMode，不得覆盖 selectedMode。Invalid Project Palette 属于开发配置诊断，运行时对终端用户仅暴露安全回退结果。

内容宽度状态只接受 Fluid/Centered；页面元数据可以对 DataTable 或复杂图表声明 Fluid 强制覆盖，但不能修改用户全局偏好。关闭 Tabs 时销毁非当前页面的 Tab/KeepAlive 状态，保留当前路由、Query、表单和当前缓存；Breadcrumb 可见性不得改变 Header 尺寸。页面过渡仅 Off/Fade，并以 `prefers-reduced-motion` 为最终强制约束。

Layout 切换不能重建业务 Store、Router 或 QueryClient；应保持 Appearance Drawer 的 Portal 和焦点状态，仅替换 Shell 结构。任何业务 Modal 打开时全局 Header 必须 inert，因此不能启动第二个 Appearance Modal。恢复默认从项目配置解析新的版本化 Appearance 值，只覆盖该命名空间。

Store 分离 `selectedMode`、`resolvedMode`、`brandId`；DOM 同时维护 `.dark`、`data-theme`、`data-brand` 与 `color-scheme`。CSS Token 需要提供 Background/Surface/Raised/Overlay 和独立 Sidebar 映射。功能状态 Palette 与品牌 Palette 解耦；Chart Categorical Palette 独立于 Success/Warning/Destructive，只有 Chart-1 绑定品牌角色。状态插图只消费五个插图语义角色。

品牌注册顺序固定为 Violet、Blue、Cyan、Green、Orange、Rose、Slate；持久化和 API 使用稳定 ID，展示名称由 Locale 层解析。Dark 模式只允许品牌角色影响交互、Focus、Chart-1 和小面积选中反馈，不能覆盖暖 Stone/Charcoal 表面或固定功能色。`10A`–`10E` 已完成静态 Candidate 原型与结构检查，但 Theme Store、Palette 注册、启动恢复、跨标签同步和动态响应式仍属于待实现工程范围。

<!-- AI modified: 同步 Q1679–Q1692 的品牌注册约束，并区分 Theme 原型完成与运行实现状态。 -->

项目 Palette 注册在类型、构建与 CI 阶段校验正文 `4.5:1`、大文字/图形/控件 `3:1`、焦点和状态对比度；生产接收到无效注册时拒绝应用并回退 Violet。组件不得通过硬编码颜色绕过语义层，Dark 阴影只保留 Overlay 与拖拽层用途。

Inspected：工程使用 `--background`、`--primary` 等 CSS 变量和 Appearance Store，默认 system / zh-CN / violet / sidebar；现有设置还允许任意 custom 与语义颜色，尚未收敛到受控预设目标。

Inspected：当前 Shell 定义六种布局，展开 16rem、Rail 4.25rem、上下文栏 14rem，Breadcrumb 在独立 Context Bar。它们与最新三布局、240 / 72px、Header Breadcrumb 原型不一致。

开发必须遵守：

- 中英文使用 key，不拼接不可翻译的句子；日期、数值、币种和文件大小传入当前 locale。
- 日期显示显式指定业务时区；当前默认 `Asia/Shanghai`，不得把浏览器本地时间静默当作业务时间。
- 字体本地加载 Inter，中文回退系统字体；不通过缩小字号处理长文案。
- 09E 英文压力场景必须使用实际 `en-US` 日期、时间、数字和复数规则。省略行为由组件或列契约显式声明，并保留可访问的完整值；关键验证和错误消息不得依赖视觉截断。
- 09E 静态交付只证明 Pencil 画板、共享引用和视觉验收契约成立，不证明运行时断点、虚拟键盘、触控、焦点、滚动或 Vue Query 状态已经实现。该阶段不得借原型任务修改 Vue 运行代码。
- 09E 移动运行验收必须包含虚拟键盘和动态视口：固定操作区使用安全区与动态视口约束，焦点字段及其错误可滚入可见区域。浏览器返回先关闭全屏业务 Drawer，并恢复由 URL、Query 与列表状态共同定义的筛选、合法页码、滚动位置和仍有效选择。
- 09E 响应式实现使用 viewport 控制 Shell 导航状态，内容组件优先通过容器宽度选择字段、列和操作布局。运行矩阵必须覆盖 `<640`、`640–1023`、`1024–1279`、`≥1280` 的边界，以及 360px、200% 缩放、动态视口和无整页横向溢出。
- Loading、Refreshing、Submitting 和 Error 应使用合适的 busy/status/alert 语义，避免重复播报，并把字段错误与控件关联。Drawer 焦点循环、关闭后焦点返回、提交失败聚焦首错、键盘恢复动作和 reduced-motion 必须通过运行测试；Pencil 只记录契约。
- 状态插图使用主题可映射 SVG；避免 PNG 白底或仅部分路径变色。普通数据表格仍以效率优先。
- 控件具备可访问名称、可见焦点、错误关联；弹层管理焦点与恢复，关键移动触达区至少 44px。
- 动效响应 `prefers-reduced-motion`；图表、Empty、Loading 不能只靠颜色表达语义。
- V1 不承诺 RTL；键盘、屏幕阅读器和 200% 缩放验收不能被截图或自动化工具替代。

## 14. Mock 与后端接入

Inspected：MSW 在挂载前启动；生产构建使用别名替换为类型化 no-op，并删除 `mockServiceWorker.js`。Bundle 门禁检查 Mock 入口 / Worker 是否泄漏。

Mock 数据必须确定、可复位、有限容量，覆盖成功、慢响应、401、403、409、422、500、空集合和二进制响应。Mock 的内存数据库、会话与审计只验证前端集成，不提供后端安全保证。

对接步骤：

1. 以 OpenAPI 和 Zod 边界逐项核对身份、分页、授权、菜单、错误和文件协议。
2. 配置真实 API base；gnester-lite 默认配对使用 `/api/v1`，代理仅去除 `/api`，上游收到 `/v1/...`。
3. 完成后端生产身份、角色、菜单、审计存储和授权；示例 JWT / Demo Controller 不等同于生产兼容层。
4. 关闭 Mock，运行真实后端集成验证，检查 Cookie / CORS / CSP / 下载头等浏览器边界。
5. 验收同一用户旅程在 Mock 和真实后端上的行为，记录差异，不要求数据数值完全相同。

## 15. 实时、PWA、SSO 与可观测增强

| 能力 | 已确认目标 | Inspected 与后续边界 |
| --- | --- | --- |
| 实时通知 | SSE + `eventsource-client`，Bearer、事件恢复、断线重连和释放 | 当前实现 WebSocket 与内存 transport，未安装目标库；需迁移协议，不能混用配置名 |
| PWA | 可选且默认关闭，关闭时不生成、不注册 SW | 当前非 Mock 生产自动构建并启用 PWA；无独立开关，属于待对齐项 |
| SSO | 可替换认证提供方，不绑定具体 IdP | 当前有 start / callback ticket / exchange；真实 PKCE、nonce、账号绑定由后端实现 |
| 多租户 | 增强能力，服务端确定主体归属 | 当前有 tenant 元数据和身份边界，不代表完整租户管理产品已完成 |
| 可观测 | 统一错误记录和可替换上报 | 当前有脱敏 reporter / CustomEvent 边界，不代表已接入外部监控平台 |
| 审计 | 后端持久、防篡改审计 | 当前 Mock 操作日志为内存示范，不能用于合规审计承诺 |

当前 WebSocket 将 Token 放在连接后的 authenticate 消息中，而不是 URL，重连退避上限 30 秒、事件 ID 去重有容量限制。SSE 迁移仍需定义恢复游标、重复事件、鉴权失败、代理超时和连接所有者，不能只替换一个构造函数。

当前 PWA 限定 API / 认证 NetworkOnly，Mock 与 PWA 避免根作用域竞争。后续默认关闭改造需同时覆盖插件、启动、UI、产物门禁和旧 SW 清理，不能只隐藏“安装”按钮。

## 16. 上传、内容与安全基线

- 上传前读取 `/uploads/policy` 安全投影；全局限制是上限，不是权限授予。
- 文件管理当前业务上限 5 MiB；用户 CSV 导入为 UTF-8、256 KiB、200 数据行，并遵守固定列规范。
- 服务端重复检查扩展名、MIME、真实字节签名、授权和容量；浏览器校验只能改善体验。
- 存储密钥只由后端 / 部署管理；普通上传不得接触 S3 AK / SK。
- 下载检查安全文件名和媒体类型；CSV 导出再次处理公式注入风险。
- 富文本和 Markdown 使用允许列表，不允许任意 HTML、事件属性或可执行链接。
- 后端对富文本再次消毒，不信任浏览器输出；可配置外部地址还需防 SSRF。
- 认证限流、密码哈希、会话撤销、CSRF、租户隔离、幂等与审计必须在后端独立验收。

完整安全和文件规则见 [安全说明](../security.md)、[API 契约](../api-contracts.md)。

## 17. 性能预算与按需加载

Inspected：[性能预算](../../src/lib/performance-budget.json) 定义入口 gzip 85 KiB、单异步 chunk gzip 110 KiB、KeepAlive 20、虚拟表阈值 200、树懒加载阈值 100；首屏 2500ms、路由 250ms、布局 320ms、交互 100ms 为当前工程目标值。

构建尺寸可由产物门禁验证；时间指标依赖测试环境和浏览器测量，配置中写有数值不代表真实性能已经达标。

- 路由懒加载；图表、富文本和高级插件按需加载。
- 基础 Table 路径不静态导入 Query / TanStack 功能，仅关闭 props 不等于移除了加载成本。
- 大列表使用稳定 ID、受控可见行数和正确测量；不要用数组索引伪装稳定业务身份。
- 避免服务端大对象复制到全局响应式树；衍生状态使用 computed，副作用集中清理。
- 虚拟化、缓存和预取均在正确性之后优化；不能为了速度削弱权限或状态恢复。

## 18. 测试与发布门禁

本节描述必须执行的程序，不表示本次文档编写已经运行整个发布矩阵。

11 — 工程优化以 V1 发布就绪为目标，优先保证正确性与安全、可复现构建、测试、性能和开发体验；不借机全面重构业务模块。CI 分为 PR 快速门禁与主分支 / Release 完整门禁，本地将提供 `pnpm run verify` 对齐 PR 核心检查。新增 Knip、Bundle 或安全门禁必须先修清存量基线再启用阻断，不能无限期允许失败。

性能发布证据由 Bundle 预算和代表流程浏览器测量共同组成，并记录设备、网络、数据规模和版本。PR 主要使用 Chromium 获得快速反馈；Release 自动验证 Chromium、Firefox、WebKit，并补充真实 Safari 人工验收。增强能力默认关闭时必须同时不存在 UI 入口、运行副作用和生产产物。

正式主干为 `main`，Node.js 基线为 `>=24.18.0 <25`，pnpm 固定 `12.4.1`。`pnpm run verify` 负责 PR 与本地核心门禁，`pnpm run release:check` 负责 Mock 构建、三引擎 E2E 和生产产物恢复；容器安全任务在 Phase 2 收口前继续由主分支 CI 独立执行。pre-commit 保持 lint-staged，门禁不可绕过性由受保护主干与 required checks 提供。

覆盖率先禁止低于当前全局基线，并为认证、权限、路由、API 设置更高目标。Release 使用参考 `gnester-lite` 执行真实后端 Smoke；MSW E2E 继续用于确定性主流程。Bundle 门禁增加首屏静态依赖总量、CSS、字体和请求数，时间指标须在固定环境采样校准后才能阻断。随附 Nginx 默认启用 gzip；CDN/Ingress 接管时仍需验证响应头和实际传输体积。

生产依赖 High/Critical 零容忍，无法安全升级时移除或替换相关能力。供应链验证包括构建工具风险、历史 Secret Scan、SBOM、容器扫描和 CodeQL，许可证初期仅报告。Renovate 每周分组更新，安全项独立 PR，禁止无审查自动合并。发布自动创建 GitHub Release、Changelog、校验源码包与容器镜像，不自动部署具体业务环境。

关键门禁脚本逐步纳入 TypeScript 检查并使用 Fixture 测试。Observability 通过供应商无关 Adapter 接入，默认安全空实现，可提供 Sentry 示例。干净克隆自动覆盖 Linux 和 Windows，macOS 在 Release 人工抽样。

`main` 的 required checks 为 `verify` 与 Chromium Smoke，并要求至少一次 Review、代码变化后批准失效、禁止直接 Push 和 Force Push。当前 `main-admin` 应通过保留历史的 Pull Request 合入，首个 Release 后归档旧分支。生产构建在验证通过后只生成一次不可变产物，容器扫描和 Release 复用该产物；Mock E2E 仍使用单独测试构建。

版本在核心契约稳定前保持 `0.x`。Conventional Commits 驱动 Release Please 维护 Release PR，合并后创建 SemVer Tag、Changelog 和 GitHub Release。参考镜像发布到 GHCR，并附 SPDX SBOM、Artifact Attestation、镜像摘要和漏洞扫描证据。

真实后端 Smoke 在 CI 中临时启动固定版本、确定性 Seed 的 `gnester-lite` 容器，至少验证 Health、登录/刷新/退出、当前身份、权限/菜单、分页列表、一次可回滚 Mutation、统一错误信封和 Request ID。认证、权限、路由、API 的初始覆盖率要求为 Statements/Lines/Functions 90%、Branches 85%；全局阈值不低于当前基线。

时间性能测试固定 Chromium、视口、CPU/网络配置和 Seed，冷启动与热导航分别多次采样取中位数并保留趋势。首屏总量先以当前真实构建加约 5% 波动建立不可回退门禁，再专项下调。环境变量通过类型化 Schema 和 Development/Test/Production Profile 在构建前校验 URL、Mock、CSP 与必要来源。

生产 Source Map 使用 Hidden 模式，只在监控 Adapter 启用时上传并绑定 Release SHA，不随站点公开。Adapter 事件仅包含 Release、环境、路由模板、错误分类、Request ID、模块和安全上下文，禁止 Token、密码、表单正文及原始响应。PWA 默认关闭路径必须额外处理历史 Worker 注销和缓存清理，不能只保证新构建不注册 Worker。

README 维持约 10 分钟快速启动与常用命令，深入内容链接到 `docs/`。`pnpm run doctor` 是只读诊断，覆盖 Node/pnpm、锁文件、环境变量、端口、浏览器依赖和常见配置冲突。V1 二次开发通过集中项目配置、`.env.example` 与初始化清单完成，不实现生成器；功能开关由类型化 Schema 校验，冲突在开发和构建阶段失败。

测试职责为规则单测、组件交互测试和跨模块 E2E，禁止为了覆盖率在多层复制相同断言。Flaky 重试通过仍失败并留存 Trace。Chromium 视觉快照只覆盖少量稳定组件和代表页面；三引擎负责行为断言。自动无障碍包含 Axe 和关键键盘/焦点旅程，Release 继续做 VoiceOver/Safari 与 NVDA/Firefox 或 Chrome 抽样。

Knip 依赖问题立即阻断；未使用文件和导出建立存量基线后阻断新增问题，存量按模块清理。Renovate 分 Runtime、Vue 核心、构建、测试、GitHub Actions、Docker 更新，Major 单独 PR。许可证使用 Allow/Deny/Review 策略，未知和强 Copyleft 人工审查，Deny 项阻断。

`docs:check` 只校验脚本引用、环境变量清单、内部链接与生成片段。Changelog 面向使用者记录功能、配置、公共契约、迁移、安全和重大依赖变化。发布与校验脚本使用跨平台 Node/TypeScript，不依赖 Bash、`sed` 或 `rm`。CI 失败证据分别按 PR 14 天、主分支 30 天保留，Release 关键证据长期附着于 Release。

不可变前端产物使用公开运行时配置跨环境晋级，只允许 API 地址、公开功能开关等非敏感值。优先级为运行时公开配置、构建期安全默认值、项目默认值；非法值明确阻止受影响能力。所有浏览器可读取的 `VITE_*` 和运行时文件都禁止包含数据库凭证、私钥、对象存储密钥、监控上传 Token 或后端 Secret。

参考 Nginx 在缺失时生成 Request ID，并转发至后端、返回客户端。生产 CSP 禁止 `unsafe-eval`，尽量不使用 `unsafe-inline`，允许来源由受控配置生成。指纹静态资源长期 immutable，HTML 与运行时配置 no-cache，认证、权限和敏感 API no-store。Liveness 只检查前端静态服务；Readiness 可检查后端依赖，但不得引起前端重启循环。

回滚以镜像 Digest 指向上一已验证版本，至少保留当前和前一版本。本地状态迁移必须顺序、幂等、带版本且限制命名空间。OpenAPI 通过 `api:generate` 生成并提交 DTO，`api:check` 在临时目录检查生成漂移。Zod 只保留在 API、运行配置、Storage、插件等不可信边界，不重复验证内部已类型化对象。

浏览器性能门禁覆盖 Login、Dashboard、User List/DataTable、Role Permission、Appearance Drawer 和主路由切换。固定 Seed 提供 Small、Typical、Stress，硬门禁使用 Typical，Stress 只做趋势和专项回归。生命周期测试覆盖重复路由、Drawer、账号切换和 KeepAlive 淘汰。

GHCR 同时发布 `linux/amd64` 和 `linux/arm64`。参考容器必须以非 root 运行、兼容只读根文件系统、显式声明临时目录、使用最小运行时镜像，并提供可验证的 Liveness/Readiness。

V1 保持单应用仓库，出现至少两个独立发布单元后才评估 Monorepo。Feature 只通过窄公共入口跨域消费，共享基础层禁止反向依赖 Feature；没有外部消费者时不创建 Barrel。ESLint 门禁检查禁止依赖方向、跨 Feature 深层导入和循环依赖。

路由页面及图表、富文本、地图、拖拽、高级表格插件动态加载，认证和基础 Shell 保持轻量同步。预取只覆盖当前有权且高概率的首屏和导航近邻，并受网络条件约束。组件只有在真实核心页面使用且通过文档、测试、可访问性验收后才能从 Candidate/Validated 晋级 Stable。

MSW 场景固定为可组合的 Happy、Empty、Error、Offline、Permission、Slow；Mutation 使用隔离内存数据与固定 Seed，测试后重置。生产入口必须从编译图中排除 Worker、Handler、Mock 数据和 Chunk，不能只在运行时关闭。

错误分类为 Validation、Authentication、Authorization、Conflict、Rate Limit、Offline/Network、Server、Cancelled、Unknown。Axios 不承担通用重试；Vue Query 只对安全幂等查询按类别重试，Mutation 显式声明幂等与恢复。AbortSignal 取消过期页面查询，上传和服务端任务不随页面请求被错误取消。

业务日志统一进入 Logger/Observability Adapter，生产阻断未获白名单的 `console.*`。Feature Flag 不能代替 Permission。CI 校验 Locale Key 集合、占位参数和未使用 Key。Vue、Vue Query、Mock DevTools 仅开发模式动态加载；Bundle 报告本地按需与 Release 生成，PR 只在超限时上传。

同一 PR 的过期 CI 自动取消，`main` 与 Release 不取消。缓存只覆盖 pnpm Store、Playwright 浏览器与 Docker BuildKit 层；锁文件不兼容时不得复用，`node_modules` 和业务 `dist` 不作为跨提交缓存。PR 核心门禁中位数目标为 10 分钟内，Release Gate 为 30 分钟内。

E2E 先按浏览器和稳定场景并行，超过时间目标后再使用固定 Shard 并合并报告。构建工具 High/Critical 同样阻断；不可达安全例外及性能、覆盖率、许可证等临时例外必须记录 Issue、责任人、理由、范围与到期时间，到期自动恢复门禁。

Observability 对未捕获错误和发布异常完整采集，性能事件采样，重复错误聚合并执行隐私过滤。模板只提供事件级别、Adapter 和示例告警规则，接收人、阈值、保留期及数据驻留由接入项目决定。

Release 可部署明确标记的独立 Mock Demo，不使用生产凭证且不晋级为正式制品。`0.x` Breaking Change 仍需提供配置、API、本地状态和组件迁移说明；通常保留至少一个 Minor 的弃用期，安全和错误契约修复可立即移除但必须说明迁移。

仓库提供 Bug、Feature、Regression、Documentation Issue 模板与 Private Vulnerability Reporting 指引。Release 需受保护 Environment 人工批准。11 阶段不增加产品 UI，只交付工程计划、流程和当前 Commit 的 CI/测试证据；完成时必须在干净环境通过 `verify`、`release:check`、真实 Smoke、Linux/Windows 克隆、制品证明和文档检查。

实施拆为安全基线、CI/工具链、运行配置/PWA、契约/依赖、性能/测试、Release/文档六个可独立验证批次。必须保留当前工作树中的用户修改和未跟踪文件，只修改必要文件并按范围提交。

已完成全量应用依赖刷新并更新 Lockfile。Unovis 继续作为底层 Provider，`@unovis/ts` 与 `@unovis/vue` 为最新稳定版 `1.7.0`。TanStack Table 已升级到 `9.2.4`，DataTable 与 ProTable 分别使用显式 Feature Profile，业务消费方不直接承担第三方 Feature 泛型；列固定偏好由 `left/right` 迁移到 `start/end`，旧持久化数据读取后自动升级。Vitest 与 Coverage 已同步升级到 `5.0.0`，Vue Runtime/Compiler 统一为 `3.5.42`，Playwright 升级到 `1.63.0`。TypeScript 暂留 `6.0.3`，等待 typescript-eslint 正式支持 TypeScript 7；Zod 暂留 `3.25.76`，等待 VeeValidate 5 稳定版后协同迁移。安全 Override 保持 Nano ID `3.3.18` 与 `resolve@1.22.11`，Node 类型保持 24.x。`dayjs` 已由 `@internationalized/date` / `Intl` 替代并删除。

本次依赖刷新已完成本地 Release Gate：冻结安装、静态检查、契约与安全门禁、测试清单、生产依赖审计、665 项覆盖率测试、Mock/生产构建和三浏览器 E2E `149/149` 全部无重试通过。Playwright `1.63.0` 的 WebKit 代表集连续三轮 `42/42` 通过；Firefox 冷启动 MSW Worker 采用 10 秒断言预算。最终产物已恢复为无 Mock 的生产构建；浏览器测试刷新统一等待 Vue Shell 重新挂载，避免把主题预初始化状态误判为页面就绪。

Implemented：Phase 1 已统一 Node/pnpm、操作文档和本地/CI 命令入口。`doctor` 只读诊断运行时、仓库文件、浏览器与开发端口；`docs:check` 离线校验内部链接、脚本引用、`.env.example` / `env.d.ts` 和共享命令片段。Chart 源码边界门禁已迁入 TypeScript，并用 Fixture 测试验证允许和拒绝场景。CI 对 PR 自动取消旧运行，Ubuntu/Windows 使用干净检出执行 `verify`，PR 使用 Chromium Smoke，主分支与手动运行保留三浏览器和容器任务；pnpm Store 与 Playwright 浏览器缓存按 Lockfile 隔离，不缓存 `node_modules` 或 `dist`。

Executed（本地，pnpm 12.4.1 升级后）：冻结安装、`verify`、675 项覆盖率测试、0 个已知生产依赖漏洞、Mock 构建、三浏览器 E2E `149/149` 和生产产物恢复通过。Windows/Linux 托管克隆、PR 时长及容器证据必须等待 GitHub Actions 实际运行后补录，因此 Phase 1 当前状态为 Implemented，而不是 Executed。

Confirmed（Q1831–Q1835）：Phase 1 的完成证据必须来自新版托管 CI，至少包含 Linux、Windows 和 Chromium；分支保护不纳入本批次。pnpm 与 GitHub Actions 采用兼容的最新稳定 Major。PR 只阻断 Ubuntu `verify` 与 Chromium Smoke；Windows、完整三浏览器和容器验证进入主分支、手动或定期运行。`pnpm audit --prod --audit-level high` 继续留在 `verify` 并失败关闭。`doctor` 需完成 Node/pnpm、锁文件、环境变量、端口、浏览器依赖与常见冲突的只读诊断，且只能报告变量名和问题类型，不得显示配置值或秘密。

Confirmed（Q1836–Q1841）：GitHub CI 采用官方 `pnpm/setup v2` 统一提供 Node 24、pnpm 12 和按 Lockfile 隔离的 pnpm Store 缓存；pnpm 版本只从 `packageManager` 读取。所有第三方 Actions 使用当前稳定 Major 对应的完整 Commit SHA。PR 的 `verify` 与 Chromium Smoke 并行执行并共同阻断；完整 Windows、三浏览器和容器矩阵覆盖 `main`、过渡期 `main-admin`、手动及每周任务。Doctor 对 Node/pnpm、锁文件、危险公开环境配置和确定性冲突失败关闭，对端口占用与缺少可选浏览器只警告。完成本地验证后先报告变更，不自动 Commit 或 Push。

Confirmed（Q1842–Q1845）：完整矩阵固定每周一北京时间 10:00 运行。`verify`、Chromium、Windows、三浏览器与容器必须在同一 Commit 通过，才可将 Phase 1 从 Implemented 更新为 Executed。Doctor 读取实际存在的 `.env`、Local 和各 Mode 环境文件，只输出文件名、变量名和问题类型；未声明变量、公开密钥命名、非法布尔/URL 及 Production Mock 属于阻断问题。pnpm 固定 `12.4.1`，Lockfile 必须由相同版本重新生成并接受冻结安装与完整 Release Gate 验证。

<!-- AI modified: 同步 Q1842–Q1845 对定期时间、同 Commit 证据、环境诊断和 Lockfile 迁移的确认。 -->

Implemented（Q1846）：pnpm `12.4.1` 与双文档 Lockfile 已迁移并通过冻结安装。CI 统一使用 SHA 固定的官方 `pnpm/setup v2.1.0`，其余 Action 升级到稳定版本；PR 的 `verify` / Chromium 并行，Windows、完整三浏览器和容器仅在可信分支、手动及每周一北京时间 10:00 运行。可信运行的 Chromium 证据纳入三浏览器任务，避免重复 Smoke。Doctor 校验实际环境文件、类型声明、生产 Mock 继承、URL/布尔值与锁文件一致性，输出不含变量值；已增加脱敏与事件分层 Fixture。Release Runner 复用 pnpm 原生路径，调用失败仍尝试生产恢复。Phase 1 保持 Implemented，等待新版同 Commit 托管 CI；本轮不 Commit/Push，不修改分支保护。

<!-- AI modified: 同步实际 pnpm 12 / CI / Doctor 实施，避免将本地结果视为托管完成。 -->

工具优先使用 GitHub Action 或平台能力，只有本地需要复现的检查才加入 Catalog 管理的开发依赖。11 工程基线完成不能替代 DataTable、权限、Theme、认证等核心产品差距验收，最终 V1 Release 必须同时满足两者。

<!-- AI modified: 记录本轮托管验收授权，不沿用上一轮禁止自动提交的状态。 -->

Confirmed（托管验收授权）：用户已授权提交本项目此前相关依赖升级、安全边界与 Phase 1 工具链，并推送到 `origin/main-admin` 验证托管 CI。排除本地 `.codex` 配置；不修改远端保护、不合并主干、不发布制品。Phase 1 仍需实际同 Commit 的 Linux、Windows、三浏览器和容器结果才能更新完成状态。

<!-- AI modified: 记录实际托管失败及其路径边界原因，禁止用本地通过覆盖远端失败。 -->

Executed：Commit `6fc447e` 已推送，首次 [托管 CI](https://github.com/guoxk-me/gvueter/actions/runs/34800164248) 的 Linux `verify` 通过，Windows 在生产契约门禁失败。门禁仅按 `/` 排除测试/Mock，导致 Windows `\` 路径被误纳入生产扫描；已建立能复现该问题的回归并修正实际路径边界，Chart 诊断路径统一为 `/`。修复完成状态仍需新版本地与托管执行证据；不补伪生产 Schema、不跳过平台、不放宽契约。

Executed（路径兼容修复，本地）：失败回归修复后，10 项工具 Fixture、676 项单元测试、完整三浏览器 `149/149`、全部本地发布门禁和最终生产产物恢复通过；未修改业务 API、组件契约或远端治理配置。Phase 1 继续等待新 Commit 的完整托管矩阵。

<!-- AI modified: 记录真实 CI 失败与基线更新授权边界，不提前标记验收完成。 -->

Executed / Inspected：首次托管 E2E 为 18 项截图失败、1 项 WebKit 分页 Flaky、130 项直接通过，容器因前置失败未执行。路径修复已推送为 `639d5e6`，见 [新版 CI](https://github.com/guoxk-me/gvueter/actions/runs/34801243763)：第二轮最终失败；Linux `verify` 通过，Windows 契约和工具回归通过，但 PWA 测试虚拟模块导入存在非法文件 URL；E2E 为 131 项通过、18 项截图失败，本轮无 Flaky，容器未执行。已在该测试文件模拟浏览器注册入口，本地目标测试和静态检查通过，仍未取得新版 Windows 完成证据。WebKit 分页本地零重试连续 10 次通过，Linux 首次轨迹后退时页面空白，尚未修改应用行为。

Executed（PWA 修复，本地）：完整 `release:check` 退出码为 0，676 项单元测试、三浏览器 `149/149`（零失败、跳过、错误）、全部门禁及最终生产产物恢复通过。用户已授权将测试入口修复与验收记录纳入本次本地提交，本轮不推送，仍需 Windows 托管验证；不修改应用逻辑或截图基线。

Proposed（待授权）：旧截图含过期菜单和 `75%` 活跃率，当前 Fixture 为 `87.5%`，并存在系统渲染差异。拟检查并更新当前 Fixture 的 macOS/Linux 独立 Chromium 基线，保留原容差、几何/行为断言和 Flaky 阻断。安全审查要求用户明确授权批量基线更新；当前未执行更新，原路径和基线不变，Phase 1 仍为 Implemented。

运行时公开配置在首个 Minor 保留 `VITE_*` 构建期回退并提示弃用，下一个 Breaking 版本移除旧入口。分支保护、Environment、GHCR、Pages、Private Vulnerability Reporting、分支合并和正式发布均属于远端状态，实际执行前必须再次确认目标。

公开 Demo 默认使用 GitHub Pages 的独立 Mock 构建并明确标识；GHCR 镜像可见性继承仓库。每个 Release 保留 Commit、Node/pnpm、门禁、浏览器、制品摘要、已知限制和迁移链接。PR 不依赖外部服务，Release 外部步骤有限重试后仍失败则停止发布。工程进度统一记录 Planned、Implemented、Executed、Blocked，并关联实际证据。

Q1817 已确认 11 阶段设计树收口。具体实施依赖、阶段状态和验收顺序以[工程优化实施清单](../engineering-optimization-plan.md)为准；当前已执行依赖刷新与 Phase 0 安全基线，Phase 1 已实现并进入补齐工具链 Major 与托管证据的收口阶段，Phase 2–6 和远端治理操作尚未开始。

Phase 0 的核心图表范围为 Line、Bar、Donut，地图不进入核心。业务页面只能消费项目类型化图表入口，第三方 Provider 留在内部；图表需对齐 10D Token，并覆盖可访问摘要/数据替代、Pointer/键盘/触摸以及容器、Sidebar、Tabs/KeepAlive、主题、Locale 的重新测量和清理。

用户确认使用 shadcn-vue 推荐的 Unovis。MapLibre 漏洞针对地图 attribution 中的不可信 HTML，当前核心 Line/Bar/Donut 路径不使用地图；这只能降低实际暴露，不能抹除依赖风险。图表快照不得批量接受。日期迁移保持 Locale、业务时区、空值和日期范围边界，依赖与 Lockfile 通过 pnpm 正常更新，禁止手改 Lockfile、未经验证的跨 Major Override 或永久、宽泛的 Audit Ignore。

Executed：业务图表已统一改为项目 Chart 入口，入口使用 Unovis 直接子路径暴露 Line、Bar、Donut 及所需容器，内部 Context 与公共 Barrel 已解除循环依赖。源码门禁阻止业务绕过入口或引入地图，生产 Bundle 门禁扫描实际 JS 产物。`ChartContainer` 覆盖容器尺寸、window fallback、页面可见性、主题、Locale、Tabs/KeepAlive 恢复和卸载清理；Dashboard 与组件中心均保留屏幕阅读器数据替代。本轮未改变图表视觉，因此没有更新视觉基线。

Executed：冻结安装、静态检查、契约、安全、测试清单、666 项覆盖率测试、Mock/生产构建与三浏览器 E2E `149/149` 通过；图表异步块为 `61.11 KiB gzip`，生产产物不含地图渲染器，生产和开发依赖 `pnpm audit --audit-level low` 均为零已知漏洞。安全修复使用精确的 Babel、Browserslist、Fast URI 和两条 Brace Expansion 补丁线 Override，没有 Audit Ignore。

<!-- AI modified: 同步 Phase 0 图表边界、生命周期、无障碍、安全审计与浏览器执行证据。 -->

```sh
pnpm install --frozen-lockfile
pnpm run release:check
```

新机器先执行 `pnpm exec playwright install chromium firefox webkit`。`release:check` 内部负责 Mock 构建与三浏览器验证，并在成功或失败后恢复无 Mock 的生产 `dist`；不能发布测试产物。

Inspected：Vitest 全源码覆盖率阈值为 statements / lines 74%、branches 66%、functions 67%；Inventory 检查防止测试集被删薄，不等于执行覆盖率。

Inspected：CI 行为测试运行 Chromium、Firefox、WebKit，像素基线由 Chromium 负责，重试后才通过仍因 flaky 失败；HTML、JUnit、trace、截图和失败视频用于留证。

每个新业务模块至少验证：输入边界、授权、请求参数、成功 Mutation、字段错误、空数据、首次加载、后台刷新、取消、离线、会话变化和必要的部分成功。

Shell 需按最新原型验证三种正式布局、展开 / 收缩、390 / 768 / 1024 / 1280 / 1440，并补齐 1920 / 2560 宽屏。现有测试文档仍有六布局矩阵；其存在不证明新三布局原型已经落地。

人工发布记录还需覆盖真实 200% 浏览器缩放、VoiceOver + Safari、NVDA + Firefox / Chrome。记录版本、SHA、测试旅程和问题链接，不能把自动化扫描写成全部无障碍通过。

## 19. 部署与运维

History SPA 需要对非资源未知路径回退 `index.html`；带指纹静态资源长期缓存，HTML 使用 `no-cache`。生产 HTTPS、CSP 和错误恢复必须共同验证。

Inspected：仓库提供非特权 Nginx 多阶段容器，端口 8080，默认 `API_UPSTREAM=backend:8080`。`/healthz` 检查静态服务存活，`/readyz` 检查后端依赖；不能用后端不可用不断重启健康前端。

- `VITE_*` 是构建期公开值；更换 API 地址需要重新构建，不是注入运行时密钥。
- `CSP_CONNECT_SRC`、`CSP_FRAME_SRC` 是部署端策略，与前端来源白名单分别授权。
- 默认同源 `/api` 代理不承诺开箱即用跨域 API；跨域需要 CORS、CSP、身份网关和健康检查共同调整。
- 保留 Authorization、Request ID 和后端 no-store；禁止缓存配置密钥投影和认证结果。
- 滚动发布保留必要旧资源或使用安全回滚；懒加载失败由用户确认恢复，不自动无限刷新。

交付参考：[部署](../deployment.md)、[运行手册](../runbook.md)、[回滚](../rollback.md)、[PWA](../pwa.md)。

## 20. 新增业务模块的标准流程

1. 在业务规则中明确对象、操作、权限标识、数据范围、状态和错误恢复，不先复制页面样式。
2. 检查现有 feature / 组件 / 依赖能否复用；确定 `features/<domain>` 的职责和对外入口。
3. 定义 OpenAPI、DTO、Zod 与字段校验，明确分页、幂等、冲突和文件边界。
4. 编写 MSW 场景和契约测试，真实后端独立实现同一协议。
5. 定义 Query Key、查询 composable、Mutation 及精确缓存更新；不新增重复 Pinia 服务器缓存。
6. 组合 SearchForm、统一 DataTable、Form 和 Drawer；复杂业务保持插槽 / 局部组件扩展。
7. 注册白名单 component key、路由元数据、菜单和 CASL 投影，后端同步鉴权。
8. 接入中英文、主题 Token、状态插图、焦点、键盘和 Reduced Motion。
9. 验证 URL 恢复、Tabs、KeepAlive、权限变更、账号 / 租户切换和异步清理。
10. 执行相关测试与 `check`；涉及工具链、依赖、安全、构建或部署时执行完整发布门禁。
11. 补充使用文档、验收证据和组件状态，进入真实核心场景验证后再升级稳定等级。

命名遵循仓库规则：Vue 组件 PascalCase，其他新文件 kebab-case，composable 以 `use` 开头。不要为一次字段重组创建通用抽象，也不要把新业务规则塞入无边界 `utils`。

## 21. 待对齐清单

以下差异不是本轮代码修复承诺，后续应按独立开发任务实现并验收。

| 编号 | 已确认目标 | Inspected | 处理方向 |
| --- | --- | --- | --- |
| GAP-01 | 单一 DataTable + 高级插件；静态 Table 轻量 | DataTable / ProTable 并存，均直接引入 TanStack | 收敛公共 API，保留行为测试后迁移内部实现 |
| GAP-02 | 业务 CRUD 统一 Drawer | 多个业务 `*FormDialog.vue` 仍使用 Dialog | 逐模块迁移，保留确认 Dialog，验证脏状态和焦点 |
| GAP-03 | 三正式布局，240 / 72px，Header Breadcrumb | 六布局，256 / 68px，独立 Context Bar | 以最新原型为准同步 Shell 和测试矩阵 |
| GAP-04 | SSE + eventsource-client | WebSocket / 内存 transport，现有 WS 环境名 | 定义 SSE 契约、恢复和生命周期后迁移 |
| GAP-05 | 生成 DTO；Knip 门禁 | `dayjs` 已移除；仍未声明 openapi-typescript / Knip | 按依赖和契约迁移流程落地 DTO 生成与无用代码门禁 |
| GAP-06 | 可选注册、独立 500、示例整体关闭 | 未发现注册 / 独立 500 路由及统一关闭开关 | 补配置、路由、恢复和关闭后核心不受影响验证 |
| GAP-07 | 导航偏好按用户 + Layout 隔离；Tabs 默认 session、KeepAlive 默认 10 | 栏宽仍来自全局 appearance，Tabs 使用 local、KeepAlive 当前 20 | 补导航状态作用域 / 迁移；不把此要求扩大为所有外观项必须按 Layout 存储 |
| GAP-08 | session / local 两种 Access Token 策略 | 仅 session，主动清除 local 凭证，无自动续期 | 单独评审认证边界，不能只更换存储 API |
| GAP-09 | Dashboard 各模块独立状态与权限装配 | 当前概览 composable 主要使用单一 `/dashboard/overview` Query | 对照 06B 原型拆清权限、加载与恢复边界 |
| GAP-10 | PWA 默认关闭且无产物 / 注册 | 非 Mock 生产默认构建并注册 PWA | 建立真正开关和双模式产物 / 旧 Worker 验证 |
| GAP-11 | 本地字体、受控品牌色、三层 gv-* Token 与统一控件基线 | 本地 Inter 已实施；custom 色仍开放，变量及部分尺寸不同于原型 | 继续完成品牌与 Token 映射，不机械替换颜色字符串 |
| GAP-12 | 新菜单身份、自身与有效启用状态 | 当前 DTO 未完整表达 routeKey、enabled 等目标；全套节点级独立开关属于 MENU-10 待评审 | 先约定兼容 DTO、白名单编译与旧数据迁移，不提前把草案字段写入接口 |
| GAP-13 | 用户名或邮箱登录，风控以服务端权威为准 | 当前邮箱校验与前端固定失败次数 / 锁定时间 | 同步标识 DTO 与风险响应，不把 Demo 常量作为生产政策 |
| GAP-14 | 多角色 RBAC、角色生命周期、授权树、可授予投影与版本化原子保存 | 用户单一 `role`；固定 `RoleDefinition` 与无版本更新输入；常驻卡片/矩阵 | 先设计兼容 DTO、角色/目录/快照版本及后端保留事务，再迁移 DataTable 与 Large Drawer；验证同资源/操作合成不越界 |

## 22. 完成与证据要求

开发完成必须同时具备实现、相关验证、受控范围和可维护性。对外报告分清“原型已更新”“源码已实现”“运行已通过”“真实后端已验收”，不得互相替代。

本文基于仓库静态快照编制；历史文档中的测试数量、依赖状态和原型同步结论不自动继承为本轮证据。发布时应再次核对 manifest、环境变量、契约和本节差异清单。
