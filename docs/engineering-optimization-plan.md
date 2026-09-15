# 11 工程优化实施清单

> 状态：In progress。Phase 0 已执行；Phase 1 和 Phase 2 已在本地实现并通过 Release Gate，托管验收仍待同一提交的 CI 证据；Phase 3–6 与远端仓库设置仍为计划。

## 1. 目标与边界

目标是建立可复现、可审计的 V1 工程发布基线。实施顺序为安全与 CI、工具链、运行配置与 PWA、契约与依赖、性能与测试、Release 与文档。

- 保留当前工作树中的用户修改与未跟踪文件。
- 不在本阶段无边界重写业务模块，也不新增 Pencil 产品画板。
- 工程门禁通过不等于 DataTable、权限、Theme、认证等核心产品差距已经完成。
- 分支保护、Environment、GHCR、Pages、漏洞私密报告、分支合并和正式发布属于远端变更，执行前再次确认。

## 2. 当前基线

| 状态 | 事实 |
| --- | --- |
| Inspected | 当前分支为 `main-admin`；现有工作流未覆盖该分支，默认 `main` 也尚未承载新版工作流和保护规则。 |
| Implemented | Node 基线已统一为 `>=24.18.0 <25`，`.node-version`、CI、容器和文档采用 Node `24.18.0`，pnpm 固定 `12.4.1`。 |
| Executed | 已通过 Taze 将 Unovis 同步升级到 `1.7.0`；核心图表通过直接子路径只引入 Line、Bar、Donut 等已授权渲染器，生产产物不包含地图渲染器；生产与开发依赖审计均无已知漏洞。 |
| Executed | 已完成全量依赖刷新并更新 Lockfile：TanStack Table `9.2.4` 已通过显式 DataTable/ProTable Feature Profile 完成兼容迁移，Vitest/Coverage 已升级到 `5.0.0`，Vue Runtime/Compiler 已统一到 `3.5.42`，Playwright 已升级到 `1.63.0`。TypeScript 暂留 `6.0.3`，等待 typescript-eslint 支持 TypeScript 7；Zod 暂留 `3.25.76`，等待稳定版 VeeValidate 5 后协同迁移。 |
| Inspected | 最终 Taze 扫描未再发现本批次应用依赖升级；另报 `pnpm 10 → 12` 与 GitHub Actions Major，属于 Phase 1 工具链/CI 独立迁移，不在本批次混入。安全 Override 保持 Nano ID `3.3.18` 与 `resolve@1.22.11`，Node 类型保持 24.x。 |
| Executed | `pnpm run verify` 与 `pnpm run release:check` 已成为本地和 CI 的统一入口；本地完整执行通过并恢复无 Mock 的生产 `dist`。 |
| Inspected | Bundle 门禁只限制单个 JS 文件；时间指标、首屏总量、CSS、字体和请求数尚无真实门禁。 |
| Inspected | PWA 当前生产路径默认启用；运行配置仍主要依赖构建期 `VITE_*`。 |
| Executed | 依赖刷新后的本地 Release Gate 已通过：冻结安装、TypeScript/ESLint、契约、安全、测试清单、生产审计、665 项覆盖率测试、Mock/生产构建及 Chromium/Firefox/WebKit E2E `149/149` 均无重试通过；Playwright `1.63.0` WebKit 代表集连续三轮 `42/42` 通过，最终 `dist` 已恢复为无 Mock 的生产产物。 |

## 3. 分阶段计划

### Phase 0 — 安全基线

Status：Executed

- 为现有 ChartContainer 建立 Bundle、视觉、可访问性和生命周期验收。
- 稳定图表范围为 Line、Bar、Donut，地图不进入核心；业务页面只使用项目类型化图表入口。Unovis 继续作为底层图表库，`@unovis/ts` 与 `@unovis/vue` 已同步升级至 `1.7.0`，由上游将 MapLibre 更新到 `6.7.0`，无需额外 pnpm Override。
- 图表不要求像素复制旧实现，但必须保持数据语义并对齐 10D Token；提供可访问名称、文字摘要或数据替代，Pointer、键盘和触摸交互不能只依赖 Hover。
- 生命周期覆盖容器、Sidebar、Tabs/KeepAlive、主题和 Locale 变化，并清理监听器。快照差异必须人工对照 10D 后再更新。
- Operations Demo 的日期逻辑已迁移到 `@internationalized/date`，`dayjs` 已移除；通用格式化继续使用 `Intl`。
- 重新执行生产与开发依赖审计，High/Critical 必须清零。

Acceptance：`pnpm audit --prod --audit-level high` 通过；开发依赖无未管理 High/Critical；发布产物不含未授权地图代码，源码门禁禁止地图入口；Unovis 升级后的类型、图表、构建和审计兼容性验证通过；图表单元/组件、Dashboard、组件中心、Light/Dark、中英文、响应式、Reduced Motion、生命周期和 Bundle 通过；不存在无期限或宽泛风险忽略项。

Executed：项目 Chart 入口稳定提供 Line、Bar、Donut 和所需容器/交互适配，业务代码不再直接导入 Unovis；源码门禁阻断绕过入口和地图依赖，生产 Bundle 门禁扫描实际 JS 产物。`ChartContainer` 已覆盖 ResizeObserver、window fallback、页面可见性、主题、Locale、Tabs/KeepAlive 恢复与卸载清理；Dashboard 和组件中心均提供非视觉数据替代。冻结安装、类型与 ESLint、契约、安全、测试清单、666 项覆盖率测试、Mock/生产构建、Bundle/PWA 以及 Chromium/Firefox/WebKit `149/149` 已通过；Chart 异步块为 `61.11 KiB gzip`，低于 `110 KiB` 预算，`pnpm audit --audit-level low` 为零漏洞。未更新图表视觉快照，因为本批次未改变既定视觉。

<!-- AI modified: record the executed Phase 0 chart boundary, lifecycle, accessibility, audit, and browser evidence. -->

### Phase 1 — CI 与工具链

Status：Implemented

- 将 Node 基线统一为 Node 24 LTS，并同步 package、CI、容器和文档。
- 提供 `pnpm run verify` 与 `pnpm run release:check`，消除重复构建和文档命令漂移。
- 将关键门禁脚本迁入 TypeScript 检查，并使用 Fixture 测试规则。
- 增加 CI 并发取消、受控缓存、Chromium PR Smoke、Linux/Windows 干净克隆验证。
- 保持 pre-commit 为 lint-staged；增加只读 `doctor` 与 `docs:check`。

Acceptance：本地和 CI 使用相同入口；PR 核心门禁目标中位数不超过 10 分钟；Windows/Linux 克隆证据有效。

Implemented：Node 与 pnpm 基线已统一；新增 `.node-version`、只读 `doctor`、离线 `docs:check`、跨平台 TypeScript Release Runner，并将 Chart 源码边界门禁迁入 TypeScript 与 Fixture 测试。CI 已按事件分层：Ubuntu 与 Windows 干净检出执行同一 `verify`，PR 执行 Chromium Smoke，`main`、过渡期 `main-admin` 与手动运行执行三浏览器和容器安全任务；同一 PR 的旧运行自动取消，pnpm 与 Playwright 缓存按 Lockfile 隔离，证据按 PR 14 天、主分支 30 天保留。

Executed（本地，pnpm 12.4.1 升级后）：冻结安装、`verify`、675 项覆盖率测试、生产审计、Mock 构建、Chromium/Firefox/WebKit E2E `149/149` 与最终生产构建恢复全部通过。Hosted CI 尚未运行，因此 Windows/Linux 托管克隆、PR 中位时长和容器任务仍需由提交后的 GitHub Actions 产生证据；在此之前不把 Phase 1 标记为 Executed。

Confirmed（Q1831–Q1835）：Phase 1 只有在新版 GitHub CI 实际通过并形成 Linux、Windows 与 Chromium 证据后才可标记为 Executed，分支保护继续留在远端治理阶段。pnpm 与 GitHub Actions 升级到兼容的最新稳定 Major；PR 只保留 Ubuntu `verify` 与 Chromium Smoke，Windows、三浏览器和容器转移到 `main`、手动或定期运行。生产审计继续属于 `verify` 的阻断步骤；`doctor` 补齐锁文件、环境变量和常见配置冲突诊断，且不得输出秘密值。

Confirmed（Q1836–Q1841）：CI 使用 SHA 固定的官方 `pnpm/setup v2` 统一安装 Node、pnpm 和 pnpm Store 缓存，`packageManager` 是 pnpm 12 的唯一版本来源；其余 Actions 同样使用最新稳定 Major 的完整 Commit SHA。PR 的 Ubuntu `verify` 与 Chromium Smoke 并行且共同阻断。完整 Windows、三浏览器和容器矩阵在 `main`、过渡期 `main-admin`、手动与每周任务运行，合入后移除 `main-admin` 触发器。Doctor 只阻断运行时、锁文件、危险公开环境配置和确定性配置冲突，端口占用与缺少可选浏览器仅警告。完成本地实现和验证后必须暂停，提供精确变更清单并再次取得 Commit/Push 授权。

Confirmed（Q1842–Q1845）：完整矩阵每周一北京时间 10:00 定期运行。Phase 1 只有在同一 Commit 的 `verify`、Chromium、Windows、三浏览器和容器任务全部通过后才具备远端完成证据。Doctor 检查实际存在的通用、Local、Development、Test 与 Production 环境文件，阻断未声明变量、危险公开密钥命名、非法布尔/URL 及生产启用 Mock，报告不得包含变量值。pnpm 精确升级到 `12.4.1`，由该版本重新生成 Lockfile，并使用冻结安装和完整 Release Gate 验证。

<!-- AI modified: record the confirmed schedule, same-commit evidence, safe env diagnosis, and pnpm lockfile migration. -->

Implemented（Q1846）：已按确认稿将 pnpm 固定为 `12.4.1`，使用该版本生成包含包管理器与应用依赖的双文档 Lockfile，并通过冻结安装。CI 使用 SHA 固定的 `pnpm/setup v2.1.0`、Checkout / Upload Artifact `v7.0.1`、Cache `v6.1.0`、Anchore Scan `v7.4.2` 与 SBOM `v0.24.2`。PR 的 `verify` 与 Chromium 并行；可信分支、手动和每周一 10:00（北京时间）执行 Windows、完整三浏览器与容器，Chromium 证据由完整三浏览器任务提供，不重复运行独立 Smoke。Doctor 补齐环境契约、锁文件与配置冲突检查，新增脱敏和 CI 事件契约 Fixture；Release Runner 使用 pnpm 原生执行路径，并在调用失败时继续尝试恢复生产构建。尚未 Commit/Push，分支保护未修改；新版完整本地与远端证据分别记录，不沿用升级前结果。

<!-- AI modified: distinguish implemented pnpm 12 closure from pending hosted CI evidence. -->

本轮精确变更清单（不含原工作区的其他未提交改动）：

- 配置：[`package.json`](../package.json)、[`pnpm-workspace.yaml`](../pnpm-workspace.yaml)、[`pnpm-lock.yaml`](../pnpm-lock.yaml)、[CI Workflow](../.github/workflows/ci.yml)。
- 工具与测试：[`doctor.ts`](../scripts/doctor.ts)、[`run-release-check.ts`](../scripts/run-release-check.ts)、[`tooling-scripts.spec.ts`](../src/__tests__/tooling-scripts.spec.ts)。
- 文档：[`README.md`](../README.md)、[`testing.md`](./testing.md)、[`deployment.md`](./deployment.md)、本工程优化计划、[技术开发文档](./product/03-technical-development.md)、[`e.md`](../e.md)。

Executed（2026-09-14，本地）：pnpm `12.4.1` 冻结安装、完整 `release:check` 退出码为 0；675 项测试（71 个文件）通过，包含 9 项工具 Fixture；覆盖率为 Statement `75.11%`、Branch `66.49%`、Function `71.20%`、Line `74.96%`。三浏览器 `149/149` 无重试通过（5.7 分钟），生产审计零已知漏洞；最终生产 `dist` 的 126 个 JS 资产和 4 个 PWA 图标门禁通过。最新 Doctor 的唯一版本来源与端口警告复核通过，文档门禁覆盖 32 个 Markdown 文件。Inspected：本机 Docker daemon 不可用，容器、Windows 和 Hosted CI 尚无本轮执行证据。Phase 1 仍为 Implemented，未 Commit/Push。

<!-- AI modified: hosted CI execution is authorized separately from the earlier local-only gate. -->

Confirmed（托管验收授权）：用户已授权整理本项目相关依赖迁移、安全基线和 Phase 1 工具链提交，推送到 `origin/main-admin` 并跟踪托管 CI；本地 `.codex` 配置不交付，不修改分支保护、不合并到 `main`、不发布制品。运行结果须关联实际 Commit SHA 和 Run URL；失败不得绕过门禁。Phase 1 在实际通过前保持 Implemented。

<!-- AI modified: retain failed hosted evidence rather than replacing it with local green results. -->

Executed（首次托管尝试）：相关变更已提交并推送到 `origin/main-admin`，Commit 为 `6fc447eefe648c059ba752e767177ccf10508f08`，见 [CI Run 34800164248](https://github.com/guoxk-me/gvueter/actions/runs/34800164248)。Linux `verify` 通过；Windows 在生产 API 契约门禁失败，原因是只使用 POSIX 分隔符排除测试与 Mock 文件。已新增实际过滤谓词的 Windows/POSIX 回归，并修正目录边界和 Chart 诊断路径输出；原缺陷在本地回归中已复现，修复仍需新版完整本地门禁与托管 CI 验证。Phase 1 保持 Implemented，不跳过 Windows 或放宽响应 Schema 要求。

Executed（Windows 兼容修复，本地）：实际谓词回归先失败、修复后 10 项工具 Fixture 全部通过；完整 `release:check` 退出码为 0，676 项测试、三浏览器 `149/149`、契约、文档、审计、Mock/生产构建及最终生产产物恢复通过。修复不改变业务 API 或组件契约，等待新 Commit 的完整托管矩阵。

<!-- AI modified: distinguish hosted failures, local reproduction, and human-gated baseline changes. -->

Executed / Inspected（托管复核）：首次 Run `34800164248` 最终为失败：Linux `verify` 通过，Windows 契约扫描失败；E2E 为 18 项截图失败、1 项 WebKit 分页 Flaky、130 项直接通过，容器任务未执行。Windows 路径修复已提交并推送为 `639d5e61fea7b1c1897d9c8f474ad45e9cd951d6`，见 [Run 34801243763](https://github.com/guoxk-me/gvueter/actions/runs/34801243763)：第二轮最终失败；Linux `verify` 通过，Windows 已通过契约门禁和 10 项工具 Fixture，但 PWA 测试导入虚拟模块时遭遇非法 Windows 文件 URL；E2E 为 131 项通过、18 项截图失败，本轮未出现 Flaky，容器任务未执行。

Implemented / Executed（PWA 测试入口，本地）：仅在 `pwa-manager.spec.ts` 模拟 `virtual:pwa-register/vue` 注册入口，保留安装提示行为断言；目标测试及完整 `release:check` 通过，退出码为 0：676 项单元测试、三浏览器 `149/149`（零失败、跳过、错误）、全部门禁和最终生产产物恢复通过。用户已授权将该修复与验收记录纳入本次本地提交；本轮不推送，仍未取得 Windows 托管通过证据。原 WebKit 分页用例在本地连续 10 次、零重试通过；首次 Linux 轨迹显示后退恢复时页面空白，第二轮未复现，尚未修改业务代码；本地结果不能替代托管验收。

Confirmed（基线授权）：用户已明确授权按 macOS/Linux 隔离 Chromium 截图、逐张检查后更新，保留 `0.01` / `0.005` 容差、几何与行为断言和 Flaky 阻断。实际截图确认旧基线缺少操作日志菜单，部分活跃账户率仍为 `75%`，当前 Fixture 为 `7/8 = 87.5%`；另有平台字体/渲染差异。截图路径已改为 `{platform}` 子目录；不修改业务逻辑、远端工作流或自动推送。

Executed / Inspected（PWA 托管复核）：本地 PWA 测试修复已提交为 `1ca4f4b`；[Run 34803798615](https://github.com/guoxk-me/gvueter/actions/runs/34803798615) 的 Windows 与 Linux `verify` 均通过，E2E 为 131 项通过、18 项截图失败，容器未执行。Dashboard 截图失败会中断同一用例中的后续页面，因此旧用户列表与组件中心截图不能据此认定为 Linux 已通过；两平台均需完整采集并无更新标志重跑。

Executed（基线迁移）：macOS/Linux 各 20 张当前截图已逐张对照旧资产审核，每个平台相关 25 项用例均无更新标志、零重试通过。macOS 冻结安装与完整 `release:check` 退出码为 0：676 项单元测试、三浏览器 `149/149`（零失败、跳过、错误）、所有本地门禁通过，最终生产 `dist` 的 126 个 JS 与 4 个 PWA 图标检查通过。Linux 在摘要固定的 Playwright `1.63.0` Ubuntu 24.04 amd64 容器中执行；Node `24.18.0` 官方包校验和、pnpm `12.4.1` 冻结安装、类型检查与 Mock 构建通过。18 张新 Linux 截图与最新托管 CI 实际截图按原容差对比全部通过；另外两张此前被前置失败阻断的页面已重新采集并回归。旧共享目录的 21 张图片移至临时备份，亦可从 Git 恢复，包含一张未被当前用例使用的旧重复资产。当前迁移未提交、未推送，仍需同 Commit 的新版托管矩阵与容器结果，Phase 1 保持 Implemented。

Inspected（Linux 采集环境）：官方镜像为 `mcr.microsoft.com/playwright:v1.63.0-noble@sha256:eff16c30e6f3f4af0a03fa4b706120d5e9b0891c344a27d64559aff5900a4a27`。镜像内 Node 已固定为仓库要求的 `24.18.0`，未修改项目依赖、业务代码或远端工作流。

Confirmed（基线托管验收授权）：用户已授权将本次平台截图基线迁移与相关文档提交并推送到 `origin/main-admin`，触发现有 CI；不修改远端保护、合并主干或发布制品。上述未提交、未推送记录为授权前状态；Phase 1 仍需新版同 Commit 的托管矩阵与容器结果才能收口。

Executed / Inspected（基线新版托管复核）：迁移已提交并推送为 `7951277`；[Run 34817039823](https://github.com/guoxk-me/gvueter/actions/runs/34817039823) 的 Linux/Windows `verify` 均通过，全部 Chromium 截图用例通过。E2E 为 148 项直接通过、1 项 WebKit Flaky：主题/密度用例刷新后等待 `.admin-layout`，10 秒内未找到元素，首次重试通过；`failOnFlakyTests` 按既定策略使任务退出码为 1，容器因此未执行。日志能确认失败发生在 Shell 恢复就绪阶段，不能据此认定为颜色/尺寸错误或 WebKit 运行时缺陷；需检查 Trace 和无重试复现后确定原因。本轮仅诊断并同步记录，未修改测试或应用，Phase 1 保持 Implemented。

Executed / Inspected（WebKit 刷新诊断）：原用例在 macOS 零重试 `20/20`，固定 Ubuntu/WebKit `1.63.0` 环境零重试 `29/30`；失败截图为空白，`#app` 无子节点。最小快速刷新探针最初失败 `3/5`，调用阶段探针失败 `3/3`，停在 Worker 注册或注销等待，尚未发出 MSW 启动握手；去掉应用注册前清理仍失败 `4/5`，不能采用删除 Firefox 兼容处理的方案。纯原生 Worker 页面在 Playwright `1.63.0` 和 `1.61.1` 各失败 `3/3`，说明中断安装的现象不依赖 Vue/MSW，也没有证据支持回退版本。

Implemented（主题用例前置条件）：`useThemeDensitySettings` 在写入设置前先等待可见 Shell，避免文档 load 已完成但 Mock/Vue 尚未挂载时就刷新并中断 Worker 安装。保留真实 reload、原 10 秒预算、全部主题/密度断言与 Flaky 阻断，不修改应用、生成 Worker、依赖或基线。独立探针中安装被连续刷新中断的问题仍可复现，并未由本次测试时序修复解决；PWA 运行时不属于本轮变更。

Executed / Inspected（验证隔离）：就绪探针并行验证最终为 `3/5`，后续失败包含 MSW 已激活、Shell 在采集截图时已渲染的延迟场景。并行原用例出现登录与总时长超时，已停止该轮；旧诊断容器的串行复验为 5 项通过、1 项登录验证码不可用、1 项中断、3 项未执行，不能当作成功证据。随后结束旧容器，在全新临时容器中隔离复验。

Executed（修复后，本地与隔离 Ubuntu）：冻结安装及完整 `release:check` 退出码 0，676 项单元测试、三浏览器 `149/149` 无重试通过，静态、文档、契约、安全、生产审计、Mock/生产构建及生产产物恢复全部通过。全新 Ubuntu 24.04 AMD64 容器使用固定 Playwright `1.63.0` 镜像、Node `24.18.0`、pnpm `12.4.1`，原主题用例串行三轮各 `10/10`，共 `30/30` 零重试通过；Linux 证据仅覆盖该目标用例，不代表完整 Linux E2E。诊断文件仅存临时目录，未进入仓库；未提交或推送本次修复，Phase 1 仍为 Implemented，待新版同 Commit 托管矩阵及容器验收。

Confirmed（主题修复提交授权）：用户已授权将本次测试时序修复与验收文档本地提交。本轮不推送；上述未提交记录为授权前状态，Phase 1 仍待新版同 Commit 托管验收。

### Phase 2 — 运行配置、PWA 与容器

Status：Planned

<!-- AI modified: distinguish Phase 2 design intake from implementation and pending Phase 1 hosted acceptance. -->

Confirmed（访谈启动）：用户已要求进入 Phase 2 方案细化；先核查现状并分轮收敛决策，最终确认前不修改实现。Phase 1 仍为 Implemented；主题修复已随 `88f7538` 推送至 `origin/main-admin`，本地 readiness 修复 `0e5312f` 尚未推送。本次进入访谈不构成提交、推送或部署授权。

Inspected（现状差距）：尚无公开运行配置加载器，API 与来源白名单仍由构建期变量提供；非 Mock 生产 PWA 默认启用，缺少默认关闭路径。

<!-- AI modified: record the reproduced readiness assertion failure separately from planned Phase 2 implementation. -->

Implemented / Executed（readiness 断言修复）：本地使用固定摘要的 Nginx 镜像、仓库配置与 Node 回显后端，复现 CI 在 `nginx`、`ok` 后退出码为 1。`/readyz` 实际成功代理 `/health/ready`，旧 `/healthz` 断言失败；CI 已改为校验 `/health/ready`，沿用既定部署契约。仓库 Dockerfile 的生产镜像构建及完整冒烟脚本均退出码为 0，覆盖非特权用户、存活与就绪、代理路径与请求头、SPA 回退、安全头和重置路径日志保护；本地 Docker 为 Linux arm64。冻结安装与 macOS 完整 `release:check` 退出码为 0：676 项单元测试、三浏览器 `149/149` 无重试、全部门禁及无 Mock 生产产物恢复通过。临时容器、网络与测试镜像已清理；用户已授权将本次修复与验收记录本地提交，本轮不推送，尚无修正后的托管 CI 证据，Phase 2 其他方案仍为 Planned。

Confirmed（Q1847–Q1852）：Phase 2 方案完整确认后可在本地实施，Phase 1 与 Phase 2 分别记录状态；不自动提交、推送或部署。公开配置使用同源 `/runtime-config.json`，Docker 启动时生成、普通静态托管单独提供，不改编译后的 JS。API、WebSocket 和来源白名单可在部署时调整；Mock 与 PWA 是否打包仍由构建决定，运行配置不能启用未打包能力。生产配置缺失、读取失败或校验失败时停止正常启动并提供安全错误与重试；一个 Minor 的 `VITE_*` 回退只用于显式旧版兼容模式。Docker 与普通静态托管同等支持并共享配置契约。参考容器保留同源 `/api`，Readiness 后端路径可配置，`gnester-lite` 的 `/api/v1` 和 `/health/ready` 仅作为接入示例。

Confirmed（Q1853–Q1866）：Runtime Config 使用带 `schemaVersion` 的闭合分组 Schema，在 Vue 创建前加载一次，会话内只读且响应 `no-store`。标准生产构建严格要求 Runtime Config；一个 Minor 的 `VITE_*` 回退只存在于显式 Legacy 构建并提示弃用。配置失败进入独立轻量恢复界面，仅显示安全错误分类与追踪码并允许手动重试。`VITE_ENABLE_PWA` 为严格布尔且默认关闭，显式开启才生成 PWA；Mock 与 PWA 同开时构建失败。关闭 PWA 的产物仍保留有界、项目作用域的旧 Worker/Cache 迁移，成功移除控制器时最多受控刷新一次，失败进入恢复界面。Docker 启动入口以共享 Schema 校验公开环境变量，将 JSON 写入声明的 `/tmp` tmpfs 并由 Nginx 精确映射；相同规则覆盖开发诊断、构建/部署检查、容器启动和浏览器加载。参考网关只接受格式合法的上游 Request ID，否则生成新 ID，传递给后端并回写响应；敏感路径不记录。`/healthz` 仅验证前端，`/readyz` 代理可配置后端路径。Nginx 启用文本资源 gzip，并固定 Runtime Config `no-store`、HTML/Worker `no-cache`、指纹资产 immutable。容器以非 root、只读根、显式 tmpfs、移除全部 Capabilities 和 `no-new-privileges` 运行完整 Smoke。可信 CI 构建 amd64/arm64，在原生 Runner 架构执行完整 Smoke、另一架构执行镜像结构与配置检查；多架构发布清单留在 Phase 5。

Confirmed（Q1867–Q1884）：Runtime Config 只接受当前 `schemaVersion`，未来版本必须显式迁移，禁止猜测兼容。API 默认同源路径，跨域仅允许 HTTPS 且需来源、CSP 与 CORS 同时授权；禁止凭据、查询和片段。Notification 可为空以明确关闭实时通知，非法值阻断配置，生产不得退化为内存伪通知。外部跳转与 iframe 使用两个独立的精确 HTTPS Origin 列表。恢复界面只显示稳定错误码、失败阶段、配置路径和本地追踪码；Runtime Config 必须同源、JSON MIME、成功响应、有大小上限且不承载秘密。旧 Worker/Cache 清理整体预算 5 秒，超时进入恢复；仅在控制器确实移除后使用 `sessionStorage` 防止当前 Tab 重复刷新。PWA 沿用显式安装与更新提示，更新前提醒保存工作，仍不缓存 API 或排队 Mutation。根路径和子路径部署均正式支持，Router、Runtime Config、PWA Scope、资产和回退遵循统一 Base 契约。Docker 使用 `PUBLIC_*` 生成浏览器配置，内部代理/CSP 变量独立；启动校验失败直接非零退出。上游 Request ID 只接受不超过 128 字符的受限 ASCII，否则生成 `$request_id`。Readiness Path 只能是无查询/片段的站内绝对路径。双架构构建在 `main`、过渡期 `main-admin`、手动和每周运行，PR 只运行静态与 Fixture 检查。提供不捆绑未固定后端的最小非生产 Compose 验收示例。门禁实际构建 PWA-off、PWA-on、Mock、Legacy 四类产物并验证非法组合；Runtime Config 启动/恢复覆盖三引擎，PWA 自动化以 Chromium 为主并补充 Safari/Firefox 人工抽样。

Confirmed（Q1885–Q1900）：Runtime Config V1 顶层固定为 `schemaVersion`、`api`、`notifications`、`navigation`，API Base 必填，其余分组也必须显式出现，并以 `null` 或空数组表达关闭能力，禁止用缺失字段触发隐式默认。配置路径相对应用 Base；资产、Router 和 PWA 使用同一 Base 契约。Legacy 仅在配置缺失或不可读取时整体回退编译配置；已读取但非法时必须失败，禁止逐字段混合。恢复页重试会重新读取并校验，成功后在当前文档中仅执行一次应用启动。参考容器从同一组已校验输入生成 Runtime Config 与 CSP；脚本使用固定版本 `jq` 安全生成 JSON，并通过共享 Fixture 对齐浏览器与容器校验。公开来源列表使用逗号分隔并逐项清理、校验；`API_UPSTREAM` 仅接受无凭据、路径、查询和片段的可信 HTTP(S) Origin。Compose 默认连接使用者提供的外部 API，独立 Smoke Profile 使用固定 Digest 的回显服务。V1 内保持 Schema 稳定，破坏性变化需原子发布并配套回滚或迁移。Runtime Config 上限为 32 KiB。旧 PWA 资产只按同源、当前 Base、脚本名白名单和项目 Cache 前缀识别；PWA-on 在启动前检查冲突 Worker，并在 Vue Shell 挂载后异步注册。CI 失败时上传脱敏配置报告、Manifest、容器日志、镜像元数据与 Trace，成功摘要记录双架构 Digest。迁移文档覆盖 `VITE_*` 转换、PWA 默认关闭、旧 Worker 清理、Docker/静态部署、回滚和一个 Minor 的 Legacy 截止期。

Confirmed（Q1901–Q1916）：应用在启动阶段创建类型化、只读的 Runtime Config 服务，HTTP、通知和导航只通过窄接口消费；配置不复制进 Pinia，业务模块不得直接读取 `import.meta.env`。实现使用少量职责明确的配置文件。开发、Mock 与测试使用经过同一 Schema 校验的确定性配置或 Fixture，Mock 强制关闭 PWA，非法组合在构建前失败。静态托管沿用相同配置契约，并提供校验命令、部署清单和线上 Header Smoke；参考容器自动生成 CSP。启动恢复界面内嵌最小中英文文案，配置首次请求超时 5 秒且不自动重试，用户可手动重试。Docker 公开变量固定为 `PUBLIC_API_BASE_URL`、`PUBLIC_NOTIFICATION_URL`、`PUBLIC_NOTIFICATION_ALLOWED_ORIGINS`、`PUBLIC_EXTERNAL_NAVIGATION_ORIGINS`、`PUBLIC_IFRAME_ORIGINS`。Base Path 保持构建期 `VITE_BASE_PATH`；Manifest、Router、资产、Worker、PWA Scope 和旧资产归属使用同一 Base。只读容器把生成配置及 Nginx 运行文件放在 `/tmp/gvueter-runtime` 与显式 tmpfs，镜像主配置不可变。固定 `jq` 版本并纳入 SBOM/扫描，Node 与 POSIX 校验共享允许/拒绝 Fixture。部署级 CSP 补充使用 `CSP_CONNECT_SRC_EXTRA` 和 `CSP_FRAME_SRC_EXTRA`，不得反向扩大应用白名单。访问日志不记录 Query、Authorization 或配置内容，认证、重置密码和 SSO 路径关闭访问日志。入口最终 `exec` Nginx，CI 验证 SIGTERM 后 10 秒内无遗留进程地退出。Compose 只依赖容器网络可解析的 API 上游，Smoke Profile 不依赖 `host.docker.internal`。

Confirmed（Q1917–Q1932）：Phase 2 按 Runtime Config、PWA 生命周期、容器/Nginx、CI 与部署文档四个可独立验证的纵向切片实施。浏览器 Schema 复用稳定版 Zod 3 并推导类型；配置加载器负责读取、校验和恢复界面，成功后仅调用一次 `bootstrapApplication(runtimeConfig)`，不写入 `window`。错误码稳定区分超时、HTTP、MIME、体积、JSON、Schema、版本和应用启动；测试通过显式注入 Fetch、超时和时钟，使用 Fixture/Fake Timer。启动顺序固定为配置校验、旧 Worker/冲突处理、Vue Shell 挂载、PWA-on 异步注册；不支持 Service Worker 时安全 No-op。参考 Nginx 提供 CSP、NoSniff、严格 Referrer Policy、最小 Permissions Policy 与防嵌入策略，HSTS 仅由确认全链路 HTTPS 的部署层开启。SPA Fallback 只服务页面导航，不掩盖 Runtime Config、资产、API 和健康端点错误。`/api` 默认保留原始 Path/Query，不猜测后端前缀。健康响应只暴露最小状态和 Request ID。镜像使用 Commit SHA Tag 与 OCI Labels，CI 保存架构 Digest、SBOM 和 Provenance；可修复的生产 Critical/High 漏洞阻断，例外必须有责任人、期限和补救。交付平台中立的配置、Docker、Compose、静态托管、子路径、PWA、迁移/回滚及排障文档。最终矩阵覆盖部署 Base、四种构建模式、合法/非法配置、三浏览器恢复、Chromium PWA、双架构镜像及容器权限/健康/代理/退出。方案状态更新为“已确认、待实施”，随后本地实现和验证，不自动提交、推送或部署。

<!-- AI modified: record the actual Phase 2 evidence separately from hosted CI acceptance. -->

Implemented / Executed（2026-09-15，本地）：公开 Runtime Config、显式构建开关与 Legacy 回退、Base-scoped Workbox 预缓存、非 root 只读参考容器、同源 API 网关、CI 双架构任务和平台中立部署文档已落地。冻结安装与 `release:check` 退出码为 0：72 个单元文件、689 项用例和覆盖率门禁通过；PWA Chromium 自动注册和静态预缓存通过；Runtime Config 启动失败/重试在 Chromium、Firefox、WebKit 通过，完整 E2E `155/155` 无重试通过。PWA-off、PWA-on、Mock、Legacy 构建及 Mock + PWA 拒绝门禁通过；最终恢复标准生产 PWA-off `dist`。本地 Docker 构建与安全 Smoke 已执行，包含生成配置/no-store、API Path/Query、健康、日志脱敏、只读根/非 root、无特权和 SIGTERM 快速退出。双架构镜像、Windows 与 Hosted CI 仍待同一 Commit 的托管验收；本轮未提交、推送或部署。

- 引入只含公开值的类型化运行时配置，并保留一个 Minor 的 `VITE_*` 回退迁移期。
- 在构建前校验 Development/Test/Production Profile、Mock、API、CSP 和允许来源。
- PWA 默认关闭；验证无 Worker/Mock 产物，并提供旧 Worker 注销和缓存清理迁移。
- 调整 Nginx 的 gzip、Request ID、CSP、缓存、Liveness 与 Readiness。
- 验证非 root、只读根文件系统兼容及 `linux/amd64`、`linux/arm64` 构建。

Acceptance：同一不可变产物可通过公开运行配置跨环境晋级；关闭 PWA 后不存在遗留控制；容器安全 Smoke 通过。

### Phase 3 — 契约、依赖与源码边界

Status：Planned

- 增加 `api:generate` 与 `api:check`，提交 OpenAPI 生成 DTO，Zod 保留在不可信边界。
- 引入 Knip：依赖问题立即阻断；文件与导出建立存量基线并阻断新增问题。
- 增加 Feature 公开入口、禁止方向、跨 Feature 深层导入和循环依赖门禁。
- 配置 Renovate 分组更新；增加 Locale 完整性、许可证清单和供应链检查。
- 保证生产构建排除 MSW、Mock 数据和开发 DevTools。

Acceptance：生成物无漂移，依赖和模块边界检查通过，生产产物扫描不含测试与开发入口。

### Phase 4 — 性能与测试

Status：Planned

- 为认证、权限、路由、API 设置 90/85/90/90 的关键模块覆盖率目标，全局基线不回退。
- 建立首屏 JS 总量、CSS、字体、请求数预算，并以当前真实构建加约 5% 波动作为初始门禁。
- 固定 Chromium、视口、CPU/网络和 Seed，测量 Login、Dashboard、User List、Role Permission、Appearance Drawer 与主路由切换。
- 使用 Small/Typical/Stress 数据档；Typical 阻断，Stress 记录趋势。
- 增加 Axe、关键键盘/焦点、生命周期、克制的 Chromium 视觉回归和三引擎行为测试。

Acceptance：性能门禁具有可复现环境和趋势；Flaky 重试通过仍失败；Release Gate 目标不超过 30 分钟。

### Phase 5 — Release、真实接入与维护

Status：Planned

- 使用 Conventional Commits 与 Release Please 维护 `0.x` Release PR。
- 生产产物只构建一次，发布 GHCR 多架构镜像并附 SPDX SBOM、Attestation、摘要和扫描结果。
- 使用临时、固定版本、确定性 Seed 的 `gnester-lite` 验证认证、权限、菜单、分页、Mutation、错误信封和 Request ID。
- 提供安全空实现的 Observability Adapter、可选 Sentry 示例与 Hidden Source Map 上传边界。
- 发布独立且明确标记的 GitHub Pages Mock Demo；生成 Release 证据与迁移清单。

Acceptance：受保护 Environment 批准后才发布；外部步骤持续失败时停止发布；Release 证据关联当前 Commit 和不可变制品。

### Phase 6 — 最终验收

Status：Planned

- 在干净环境执行 `verify`、`release:check`、真实后端 Smoke 和 Linux/Windows 克隆验证。
- 人工抽样 Safari/VoiceOver、NVDA/Firefox 或 Chrome、macOS 快速启动。
- 核对工程门禁与核心产品差距，两者均完成后才能发布 V1。
- 经用户再次确认后，才执行 `main-admin → main` PR、保护规则、Environment、GHCR、Pages 和正式 Release 等远端操作。

## 4. 状态规则

- **Planned**：决策和验收条件已确认，尚未修改实现。
- **Implemented**：代码或配置已完成，但未获得完整执行证据。
- **Executed**：列出的命令或 CI 已在对应 Commit 和环境真实通过。
- **Blocked**：存在明确外部依赖、权限或未关闭的产品前置项。

每次推进只更新真实状态，不用历史构建、旧截图或配置文件存在代替当前执行证据。
