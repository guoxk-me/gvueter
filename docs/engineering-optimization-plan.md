# 11 工程优化实施清单

> 状态：In progress。Q1693–Q1817 已确认；Phase 0 已执行，Phase 1 已实现并通过本地 Release Gate，Phase 2–6 与远端仓库设置仍为计划。

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

### Phase 2 — 运行配置、PWA 与容器

Status：Planned

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
