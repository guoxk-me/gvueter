# 管理后台完整性迭代路线图

<!-- AI modified: aligned priorities and acceptance criteria with the 2026-07-14 audit findings. -->

## 1. 目标

将当前项目从“具备较多后台功能和组件的页面集合”完善为一套：

- 视觉一致、布局稳定的管理后台。
- 支持中文、英文和长文本的国际化后台。
- 组件完整、示例全面、文档清晰的组件体系。
- 具备可靠分页、筛选、表单、菜单和权限能力的业务模板。
- 有明确测试、性能、安全和无障碍验收标准的可维护项目。

## 2. 执行原则

- 优先解决底层状态契约和全局设计规则，不逐页堆补丁。
- 先检查现有实现，再决定补充、重构或新增，避免重复建设。
- 每轮迭代保持范围集中，并补齐相应测试。
- 所有页面和组件消费场景同时考虑中文、英文、桌面、移动端、明暗主题及适用的异常状态。
- 组件 Demo 不仅展示外观，还要展示真实业务组合、API、边界状态和使用限制。
- 问题结论区分 `Executed`、`Inspected`、`Assumed`，未执行的视觉或交互验证不得写成已完成。
- 可见的设置项必须产生可观察效果；不适用于当前布局的设置应隐藏、禁用或解释原因。
- 所有逻辑、行为或结构修改附近添加简短的 `AI modified` 原因注释。
- 每个阶段执行项目约定的 Type Check、Lint、Tests 和 Build；统一 `vp check`、`vp run check` 与 CI 的职责后，将完整必需命令集写入质量门禁。

## 3. P0：核心缺陷与基础体验

### 3.1 修复用户管理分页

#### 问题

用户管理使用受控服务端分页。运行时复现确认：请求参数、返回数据和 TanStack Table 内部状态会更新，但分页栏的页码、总页数和每页行数仍可能停留在初始值。

主根因是分页栏从稳定的 Table 实例读取状态，并使用 `computed` 缓存；Table 实例本身不是 Vue 响应式依赖，因此展示状态没有随受控分页模型更新。次要问题是 `setPageSize` 默认保留当前首行偏移，而项目已有业务分页组件采用“切换行数回到第一页”的规则。

同源问题同时存在于 `ProTablePagination` 和 `DataTablePagination`，影响范围不只用户管理，还包括系统参数以及岗位、菜单、部门、监控、字典、组件中心等 DataTable 使用方。

#### 任务

- [x] 明确统一规则：切换每页行数后回到第一页。
- [x] 分页栏显式接收响应式 `pagination` 和 `pageCount`，展示值不再依赖非响应式 Table 实例。
- [x] 同时修复 ProTable 和 DataTable 两套共享分页组件，避免只修用户管理。
- [x] 保证请求参数中 `pageIndex` 与 `pageSize` 原子更新，不出现中间错误状态。
- [x] 页码超过最后一页时自动回退到有效页码。
- [x] 对外部总数变化、删除末页数据和筛选结果收缩执行页码夹紧。
- [x] 校验每页行数选项，拒绝非法值和不在允许列表中的值。
- [x] 明确切换行数、筛选、排序和刷新时的行选择清理策略。
- [x] 明确跨页选择是保留、清空，还是支持“选择全部筛选结果”。
- [x] 将重要分页、筛选和排序状态同步到 URL。
- [x] 补充从小行数切到大行数、从大行数切到小行数的测试。
- [x] 补充末页切换、空数据、删除末页记录和快速连续切换测试。
- [x] ProTable 和 DataTable 各自覆盖页码文本、Select 显示值、请求参数和可见行数。
- [x] 覆盖总数为 0、刚好整页和最后一页不足一页三类数据边界。
- [x] 增加用户管理分页真实交互 E2E。

#### 验收标准

- 初始总数 8、每页 5 条时显示“第 1 / 2 页”和 5 行数据。
- 点击下一页后请求为 `page=2&pageSize=5`，显示“第 2 / 2 页”和 3 行数据。
- 切换到 10 条后请求为 `page=1&pageSize=10`，Select 显示 10，页码显示“第 1 / 1 页”，展示 8 行数据。
- 页面不出现旧页码、旧 Select 值、中间错误请求或不可恢复的空白页。
- 刷新和浏览器前进、后退能够恢复有效分页状态。
- ProTable、DataTable 的组件测试和用户管理 E2E 覆盖主要分页边界。

<!-- AI modified: recorded only the pagination work verified by component, URL, type/lint, and browser gates. -->

#### 阶段结果（2026-07-14）

- `Executed`：`vp run check` 通过；表格与 URL 定向测试 3 个文件共 24 项通过；用户管理分页真实交互 E2E 通过。
- `Executed`：E2E 同时断言 `page`/`pageSize` 请求参数、URL、页码文本、Select、可见行数、按钮状态、刷新恢复、历史恢复与刷新清理选择。
- `Inspected`：普通跨页保留稳定行 ID 选择；切换行数、筛选、排序和显式刷新清空选择。DataTable 为客户端表格，因此以原子 `paginationChange` 事件作为请求参数边界验证。
- `Assumed`：跨页“选择全部筛选结果”未作为默认语义；当前契约只保留逐行稳定 ID，完整批量选择能力在 Table 独立模块继续建设。

### 3.2 重构侧边栏折叠体验

#### 问题

当前 Shell 叠加了 56px Header、56px 品牌区、40px 折叠工具条、40px 二级侧栏标题，以及横向二级导航、Breadcrumb、Tabs、Footer 各自的边界。品牌区、折叠按钮区和侧栏分别绘线，导致多条横线、相邻双线和基线错位。

折叠按钮独占 40px 分隔行并孤立靠右，是视觉突兀的直接原因。混合布局收起后还可能形成两条相邻 icon rail；深层菜单每递归一层都会增加缩进竖线，进一步放大“线条过多”的问题。

#### 任务

- [x] 移除折叠按钮独占的 40px 工具条，将控制点整合进品牌区/Header，或放在主分隔线上。
- [x] 全局只保留一条主导航与内容区的垂直分隔线。
- [x] 将 Breadcrumb 与 Tabs 合并为统一 context bar，最多保留一条底部分隔线。
- [x] 相邻区域只允许一方绘制边界，用表面色差、间距和活动态表达其余层级。
- [x] 展开状态下将折叠按钮与 Logo、标题垂直对齐。
- [x] 收起状态使用 28–32px 的稳定图标入口或侧栏边缘控制点。
- [x] 统一折叠按钮尺寸、悬停态、焦点态、Tooltip 和动效。
- [x] 混合布局保留单一主 rail，二级侧栏收起到 0 或按需显示浮层，不形成双 rail。
- [x] 仅第一级子菜单保留轻微层级提示，三级、四级菜单不继续叠加竖线。
- [x] 使用菜单 `depth` 限制最大缩进，保证长英文仍有有效文本区域。
- [x] 将 `brandPlacement`、`collapseTarget`、`childPresentation` 和 `desktopBreakpoint` 纳入布局契约。
- [x] 区分“启动默认状态”和“当前运行状态”，避免 `sidebarDefault` 等命名与行为不符。
- [x] 隐藏或禁用当前布局不适用的 Sidebar、Sticky Header 设置。
- [x] 分别检查六种布局中的品牌、导航、折叠入口和内容边界。
- [x] 禁止 `transition-all`；优先使用 `transform` 和 `opacity`，必要的布局尺寸动画必须经过性能验证，并支持 `prefers-reduced-motion`。
- [x] 保留明确的 `aria-label`、键盘焦点和足够点击区域。

#### 验收标准

- 六种布局不存在多余双线、错位边界或孤立控件。
- Header、品牌区、导航和 context bar 基线误差不超过 1px。
- 展开和收起时视觉节奏稳定，不出现图标跳动、双 rail 或文本闪现。
- 明暗主题、中英文和不同组件密度下表现一致。

<!-- AI modified: recorded the Shell closure only after six-layout geometry and interaction gates passed. -->

#### 阶段结果（2026-07-14）

- `Executed`：六种布局展开/收起真实浏览器矩阵通过，断言单一 rail、单一边界所有者、统一 context bar、无页面横向溢出及 mixed 二级栏收起为 0。
- `Executed`：Shell、导航、Tabs 与顶部导航定向单元测试通过；`vp run check` 通过；源码扫描不存在 `transition-all`、`transition: all` 或遗留主题全属性动画变量。
- `Inspected`：折叠入口为 28px、位于 56px 品牌基线中心，具备 Tooltip、可读名称和焦点环；四项布局语义与 1024px 断点由单一契约提供。
- `Assumed`：Sticky Header 在当前内部滚动 Shell 中不适用，因此设置项隐藏，并在架构文档中记录而非提供无效果开关。

### 3.3 导航可达性与响应式契约

#### 问题

折叠状态会把带子级的节点视为 compact，同时禁止渲染 children。经典侧栏没有其他二级导航区域，因此折叠后分组页面不可访问。

桌面侧栏从 `md` 断点显示，但移动菜单按钮直到 `lg` 才隐藏，768–1023px 会同时出现两套入口。顶部菜单使用 `shrink-0` 和 `whitespace-nowrap`，空间不足时依赖右侧操作区背景遮挡溢出内容，没有真实的降级策略。

#### 任务

- [x] 折叠分组使用 flyout/popover 展示子级，不再通过隐藏 children 实现 compact。
- [x] Flyout 支持鼠标、键盘、焦点恢复、Escape 关闭和活动祖先高亮。
- [x] 六种布局从同一布局契约读取桌面导航断点。
- [x] 消除 768–1023px 同时出现桌面侧栏与移动菜单入口的问题。
- [x] 顶部导航明确采用“完整菜单 → More 溢出菜单 → 汉堡菜单”的降级顺序。
- [x] 搜索框在空间不足时优先退化成搜索图标，不与导航争抢固定宽度。
- [x] 禁止用 Header 右侧操作区背景遮盖菜单；导航区和操作区的边界矩形不得相交。
- [x] 覆盖 1、2、3、4 级菜单的鼠标、键盘、刷新恢复和权限过滤。
- [x] 选择一套权威 Sidebar 状态与交互契约，避免自定义 Shell 与未使用的 shadcn-vue Sidebar 双轨演进。

#### 验收标准

- 所有可见菜单目标在展开、折叠、桌面和移动端都可以通过鼠标和键盘进入。
- 中文、英文顶部导航在 1024、1280、1440 宽度下不与搜索、消息和账户操作重叠。
- 768–1023px 只出现一套明确的主导航入口。
- 刷新深层路由后能够恢复活动祖先、展开路径和焦点语义。

<!-- AI modified: recorded navigation closure after breakpoint, overflow, deep refresh, and focus gates passed. -->

#### 阶段结果（2026-07-14）

- `Executed`：Shell/navigation Chromium E2E 4/4 通过，覆盖六布局、768/1023/1024 断点、四级菜单鼠标与键盘遍历、Escape 焦点恢复、刷新后的活动祖先恢复，以及中英文 Full → More 降级。
- `Executed`：顶部导航在 1920/1440/1280/1024 下逐级收缩，浏览器矩形断言确认导航与搜索、通知、账户操作不相交；1024 以下只显示移动入口。
- `Executed`：权限单元测试确认普通访客看不到受限四级分支且直达深层路径进入拒绝集合；管理员可注册并刷新恢复深层路由。
- `Inspected`：自定义 `ConfigurableAdminLayout` 是唯一生产 Shell；未使用的 shadcn-vue Sidebar 仅保留为 primitive，职责边界已写入架构文档。

### 3.4 外链与 iframe 契约一致性

#### 问题

菜单保存接口允许任意 `http(s)` URL，但运行时导航只接受配置白名单中的来源。这会导致管理员保存成功后，菜单在运行时被静默过滤并消失。iframe 页面目前也缺少加载、失败、超时和恢复状态。

#### 任务

- [x] 菜单编辑、Mock、接口契约和运行时导航复用同一份 URL 校验策略。
- [x] 明确内部路由、外部新窗口链接和 iframe 三类目标的互斥字段与行为。
- [x] URL 被拒绝时返回可定位到字段的错误，不允许保存成功后静默隐藏。
- [x] 统一协议限制、来源白名单、尾斜杠、子域名和查询参数规则。
- [x] 外链保留真实链接语义、新窗口提示、外链图标和 `noopener`。
- [x] iframe 增加 Loading、Error、Timeout、Refresh、来源说明和新窗口打开入口。
- [x] 覆盖白名单命中、未命中、危险协议、失效地址和重定向场景。

#### 验收标准

- 任一菜单目标在保存时与运行时使用完全一致的校验结果。
- 无效目标无法保存并提供清晰原因；有效目标保存后不会从导航中消失。
- iframe 加载失败或超时时，用户能够重试、刷新或安全地在新窗口打开。

<!-- AI modified: recorded the verified target-policy and iframe recovery closure. -->

#### 阶段结果（2026-07-14）

- `Executed`：URL/菜单/导航/iframe 定向测试 4 个文件共 24 项通过；iframe 真实加载、来源、安全属性和 Refresh 恢复 E2E 通过；`vp run check` 通过。
- `Executed`：菜单三类目标复用共享互斥契约；Mock 对不一致字段返回 `422 MENU_TARGET_INVALID` 与 `details.fieldErrors`，有效 iframe 保存后仍存在于运行时导航。
- `Inspected`：外链使用真实 `<a>`、外链图标、`target="_blank"` 与 `noopener noreferrer`；iframe 保留无 `allow-same-origin` 的 sandbox。
- `Assumed`：浏览器前端无法可靠观察跨域最终重定向；已在安全/部署文档明确由后端重验证最终来源并由 CSP 约束，浏览器侧以 Error/Timeout/Retry 作为恢复方案。

### 3.5 国际化内容与布局韧性

#### 问题

中文和英文翻译键已经保持一致，自动化测试确认两端键集合相同且均超过 1300 个。迭代前问题主要不是漏翻译，而是布局没有承受英文长度：固定 Sidebar 宽度、全局 Button 单行不收缩、TableHead/TableCell 默认不换行、PageHeader 操作区不可收缩，以及顶部导航缺少溢出契约。

部分日期、时间和数字仍直接调用运行环境的 `toLocaleString()`，没有显式使用应用当前语言。

#### 任务

- [x] 建立中文和英文双语视觉回归矩阵。
- [x] 增加 130%–150% 文案膨胀的 pseudo-locale，不只测试当前英文文案。
- [x] 检查所有 Flex/Grid 文本子节点是否具备正确的 `min-width: 0`。
- [x] 为长文本明确选择换行、截断、滚动或扩大容器策略。
- [x] 导航文本被截断时必须提供 Tooltip 或其他完整文本入口。
- [x] Tabs 支持横向滚动并提供可感知的溢出提示。
- [x] 查询区和工具栏在中等宽度下能够合理换行。
- [x] PageHeader 的标题区可收缩，操作区可换行或按断点收入 More 菜单。
- [x] 基础 Button 保持合理默认，但允许 PageHeader、筛选器和设置卡片显式换行。
- [x] Table column meta 声明 `nowrap`、`truncate`、`wrap` 和合理最小宽度。
- [x] AppearancePanel 的固定 2/3/4 列网格在英文和 150% 文案下能够自适应降列。
- [x] Table、Select、Dialog、Drawer、Toast、Badge 和空状态验证长英文。
- [x] 减少依赖固定窄宽度的输入、选择器和操作区。
- [x] 日期、时间、数字和货币统一使用应用 locale 驱动的 `Intl.*`，清理直接依赖运行环境的 `toLocaleString()` 和 `toFixed()`。
- [x] 品牌名、代码和标识符使用适当的 `translate="no"`。
- [x] 测试超长英文、无空格标识符、长邮箱、长文件名和长错误信息。
- [x] 增加 320、375、390、768、1024、1280、1440、1920 宽度的关键页面截图测试。

#### 验收标准

- 中文和英文均无控件挤压、遮挡、异常溢出或不可操作情况。
- 150% 文案膨胀时核心页面仍无裁切、重叠、点击死区和意外横向滚动。
- 重要信息不会因无提示截断而丢失，日期和数字随应用语言正确变化。
- 固定宽度、换行和滚动策略在同类组件中保持一致。

<!-- AI modified: closed the long-content work only after repeatable browser screenshots and real portal/state rendering passed. -->

#### 阶段结果（2026-07-14）

- `Executed`：长文本 Chromium E2E 20/20 通过；中英文分别覆盖 320、375、390、768、1024、1280、1440、1920，并为 Dashboard 生成成对快照，另覆盖 Users、Components 与长标识符语义夹具。
- `Executed`：外观抽屉在 320/390/1024 的 150% 英文膨胀下通过自适应列数、按钮不相交、可滚动与无横向溢出断言；相关长文本状态及源码契约测试 2 个文件共 8 项通过。
- `Executed`：Mock 生产构建通过；源码扫描不存在直接依赖运行环境的 `toLocale*()`、`toFixed()`，不存在 `transition-all`；Select、Dialog、Drawer、Toast、Badge、Empty、Table 邮箱与上传文件名使用真实 DOM 验证。
- `Inspected`：人工查看 320 英文、768 中文与 1440 英文代表快照，确认标题、导航、卡片、图表占位和 Footer 无异常横向裁切或相互遮挡。
- `Assumed`：日期/金额的默认业务时区沿用应用配置与 `Asia/Shanghai` 开发环境；跨地区产品时区选择属于后续统一日期/时区契约，不在 P0 中硬编码新策略。

### 3.6 运行时启动与授权恢复闭环

#### 问题

完整浏览器审计发现四类会使管理模板不可用或失去授权边界的问题：浏览器 Mock 把 Vite 模块误判为未处理接口而导致白屏；SSO 数据片段被当作 CSS 锚点；身份服务短暂失败时路由守卫让公开恢复页面也无法进入；部门移动后继续依赖用户的历史路径授权。角色策略还允许管理员删除自身最后一条策略恢复通道。

#### 任务

- [x] 浏览器 Mock 只对同源 `/api` 命名空间保持未处理请求严格失败，放行 Vite 模块和公开资源。
- [x] 路由滚动只接受真实锚点，SSO ticket/error 数据片段不再进入 CSS selector。
- [x] 身份恢复短暂失败时保留可重试 Token，受保护页面回到带 redirect 的登录页，公开认证页面保持可达。
- [x] `departmentTree` 数据范围根据当前 `departmentId` 和实时部门树计算，列表、修改、删除使用同一服务端授权集合。
- [x] 拒绝删除仍有用户归属的部门，避免形成无法可靠授权的悬空身份。
- [x] 内置管理员必须保留 `read/update RolePolicy`；领域状态、API 和权限矩阵共同执行该不变量。
- [x] 补充资源边界、路由恢复、部门移动和角色自锁回归测试。

#### 验收标准

- Mock 开发入口、登录页和管理 Shell 可渲染，控制台无资源拦截、路由 selector 或框架错误。
- `/auth/me` 的临时 5xx 不会造成空白页或清除可恢复凭据，服务恢复后能够继续原导航。
- 部门移出当前范围后，其用户立即不可见且不可修改、删除；移入后即使展示路径未同步也立即可见。
- 任意写入入口都不能提交缺少两项恢复权限的管理员策略；失败返回稳定冲突码且不产生部分写入。

<!-- AI modified: record the runtime P0 closure around executable security invariants rather than UI visibility alone. -->

#### 阶段结果（2026-07-29）

- `Executed`：5 个定向测试文件共 71 项通过，覆盖浏览器 Mock 资源边界、SSO hash、会话恢复、部门实时范围和管理员角色恢复不变量。
- `Inspected`：授权判断不再读取 `departmentPath`；管理员恢复权限同时由纯领域状态、Mock API 和禁用的权限矩阵单元格保护。
- `Assumed`：真实身份服务、组织服务与角色服务仍须在服务端事务和集成测试中实现相同不变量；Mock 只能证明模板内的可执行契约。

## 4. P1：组件与示例体系

### 4.1 重组组件中心

#### 迭代前差距

组件中心目前约有 10 个标签页和 32 张 Demo 卡片，但仍是集中式陈列页。部分组件只在概览中被列出，例如 ProTable，并没有真实可操作示例；Demo 卡片也缺少 Props、Events、Slots、状态、限制和测试信息。

- [x] 将组件中心从大型标签页集合重组为清晰的模块和独立路由。
- [x] 区分“已实现但缺少展示”“需要增强”“确实缺失”的组件。
- [x] 为每项能力标记现状：已有实现、已有 Demo、已有测试、待增强、待新增。
- [x] 为每个组件提供概述、API、边界状态和注意事项；真实 Demo 标记基础与复杂场景，间接能力明确责任边界。
- [x] 展示 Props、Events、Slots 和 `v-model` 契约。
- [x] 提供可复制的有效导入代码，并在关联 Demo 中展示真实业务组合，避免生成缺少必填 Props 的无效模板。
- [x] 标记组件成熟度：实验、稳定、废弃。
- [x] 标记测试状态、无障碍状态、业务使用位置和已知限制。
- [x] 建立组件初始版本与迁移基线；后续只在发生真实变更时追加版本历史。

### 4.2 Table 独立模块

- [x] 基础 Table：静态数据、Loading、空数据、错误和搜索无结果。
- [x] DataTable：排序、筛选、分页和选择。
- [x] 服务端 Table：分页、排序、筛选、请求取消、竞态处理和 URL 恢复。
- [x] Tree Table：真实展开/收起、默认展开、异步加载、失败重试和 3+ 级嵌套。
- [x] 明确当前部门树表只是拍平后缩进展示，不将其标记为完整 Tree Table。
- [x] 将 ProTable 已有的树展开能力从单元测试带入真实 Gallery 示例。
- [x] 复杂 Table：固定列、列显隐、列排序、列拖拽和密度。
- [x] 可编辑 Table：单元格编辑、行编辑、校验、保存失败和回滚。
- [x] 批量操作：当前页选择、跨页选择、批量删除和批量导出。
- [x] 大数据 Table：虚拟滚动和性能边界。
- [x] 响应式 Table：横向滚动、次要列隐藏或卡片降级。
- [x] 长英文 Table：按列配置 `nowrap`、`truncate`、`wrap` 和最小宽度。
- [x] 导出当前页、选中项和全部筛选结果。
- [x] 列配置持久化及恢复默认设置。
- [x] 数据刷新后的选择状态和编辑状态处理。
- [x] 删除末页、切换每页行数和总数变化后的有效页处理。
- [x] 每个示例提供 Props、Events、Slots、限制、成熟度和测试状态。

### 4.3 Form 独立模块

当前 Form Workbench 已覆盖校验、联动、草稿、多步骤、权限、上传和富文本，是较完整的业务案例；但所谓动态 Schema 只描述少量固定字段，其余字段仍然硬编码，不能标记为完整 Schema 引擎。

- [x] 基础 Form：常用输入、选择、开关和日期。
- [x] 校验 Form：同步、异步和跨字段校验。
- [x] 动态 Form：条件字段、动态数组和字段增删。
- [x] 分步 Form：草稿、上一步、下一步和跨步骤校验。
- [x] 超级 Form：Schema 驱动、权限、联动、远程选项、上传、富文本和离开确认。
- [x] 编辑回填、重置、脏状态和离开页面确认。
- [x] 服务端错误映射到具体字段。
- [x] 提交状态、防重复提交及聚焦首个错误字段。
- [x] 文件上传和普通字段联合提交。
- [x] 隐藏条件字段后的值清理策略。
- [x] 草稿自动保存、Schema 版本迁移和旧草稿兼容。
- [x] 长英文标签、只读字段和移动端布局。

### 4.4 上传与拖拽

当前 FileUpload 主要完成本地文件选择、类型/大小/数量校验和预览，文件模型尚未包含真实上传生命周期。拖拽上传和 Table 列拖动也不能替代通用拖拽能力。

- [x] 单文件、多文件和图片上传。
- [x] 文件类型、大小、数量及文件名限制。
- [x] 定义上传状态模型：等待、上传中、成功、失败、取消，以及服务端文件标识。
- [x] 真实传输进度、暂停、继续、重试、取消、部分成功和结果回填。
- [x] 区分拖拽上传与通用可排序拖拽，分别定义组件职责。
- [x] 通用拖拽覆盖列表排序、卡片排序和跨容器移动。
- [x] 为拖拽提供键盘和按钮替代操作。
- [x] 图片预览、裁剪、删除确认和错误恢复。
- [x] 大文件、分片上传、断点续传和重复文件策略按真实业务需要评估。
- [x] 超长文件名及英文错误提示适配。

### 4.5 筛选器与选择器

- [x] 普通 Select、搜索 Select 和多选。
- [x] UserSelector、RoleSelector 和 DictSelect。
- [x] 树形选择、级联选择和远程搜索。
- [x] DateRangePicker 和快捷时间范围。
- [x] 高级筛选器、已选条件标签和保存筛选方案。
- [x] 筛选状态同步 URL。
- [x] 依赖选择器联动、选项失效和上游值变化后的清理策略。
- [x] 远程搜索支持防抖、取消旧请求、竞态保护和失败重试。
- [x] 空结果、加载失败、重试、清空和远程无结果状态。

### 4.6 编辑器与内容组件

- [x] RichTextEditor 覆盖粘贴、媒体、只读、禁用、校验错误和长内容。
- [x] 定义富文本客户端消毒、服务端消毒和允许标签/属性契约。
- [x] MarkdownEditor 提供真实 Markdown 解析与预览，不把转义原文本标记为完整渲染。
- [x] CodeEditor 和语言切换 Demo。
- [x] JSONViewer Demo。
- [x] 只读、禁用、错误、超长内容和复制场景。
- [x] Markdown 链接、图片、代码块和原始 HTML 的安全策略。
- [x] 富文本、图表和编辑器保持路由级按需加载，不进入无关页面首包。

### 4.7 图标体系

- [x] Lucide 图标总览、分类、搜索和复制名称。
- [x] 将当前仅包含少量白名单图标的 IconSelector 扩展为可搜索、可分类的完整 Demo。
- [x] 后台菜单安全图标注册表说明。
- [x] 图标尺寸、颜色、状态和无障碍规范。
- [x] 提供空图标、未知图标 fallback 和自定义 SVG 接入规范。
- [x] 禁止将任意后端字符串直接解析为动态组件。

### 4.8 shadcn-vue / Reka primitives

- [x] 盘点现有约 27 类 primitives、版本、业务使用位置和重复封装。
- [x] 优先展示现有但未进入 Gallery 的 Breadcrumb、DropdownMenu、Form、Pagination、Resizable、ScrollArea、Separator、Sheet、Skeleton、Sonner、Table 和 Tooltip；Sidebar 只记录非权威边界，不挂载第二套 Provider。
- [x] 评估 Accordion、Alert、Command、Combobox，并记录新增、替代或延期决定。
- [x] 评估 Calendar、Date Picker、Radio Group、Slider、Toggle Group，并记录复用或延期决定。
- [x] 评估 Context Menu、Menubar、Navigation Menu、Hover Card，并记录现有可发现替代方案。
- [x] 评估 Alert Dialog、Carousel 和 Input OTP；没有真实业务契约时保持延期或不适用。
- [x] 展示 Dialog、Drawer、Sheet 的适用场景差异。
- [x] 展示 Skeleton、Toast、Tooltip 的组合状态。
- [x] 每个拟新增 primitive 先确认业务使用场景，避免与现有业务组件重复建设。
- [x] 明确业务组件、primitive 和页面组合层的职责边界。

<!-- AI modified: P1 component closure is recorded only after unit, build, browser interaction, and visual gates passed. -->

#### 阶段结果（2026-07-15）

- `Executed`：组件中心拆为 Table、Form、Upload/Drag、Selection、Editors、Icons、Primitives、Patterns 独立路由；统一目录记录实现、Demo、测试、成熟度、无障碍、限制、使用位置，以及初始版本与迁移基线。
- `Executed`：Table 共享/URL 定向 4 文件 39 项、Form 2 文件 16 项、上传/拖拽/编辑器 3 文件 23 项、目录/选择/图标/primitives 5 文件 31 项，以及编辑器安全 2 文件 15 项均通过；全量 Type Check 与生产构建通过。
- `Executed`：Chromium 组件门禁 3/3 通过，在 390 中文深色与 1280 英文浅色逐页断言八个组件路由无横向溢出、标题无遮挡、焦点可达，并覆盖 Table、Form、键盘拖拽、远程选择、富文本消毒、图标搜索、Dialog 焦点恢复及 reduced motion。
- `Inspected`：人工检查 390px Table 与 1280px Form 稳定基线；部门树表明确保持“拍平缩进”标签，完整异步 Tree Table 由 Gallery 独立示例承担。
- `不适用/替代`：Alert 由 Callout/AsyncState，Radio 由原生控件/Select，Slider 由 NumberField，Toggle Group 由 Tabs/`aria-pressed`，Context Menu/Menubar/Navigation Menu/Hover Card/Alert Dialog/Carousel 分别由现有可发现导航、Tooltip/Drawer、ConfirmAction 或业务组合承担。Accordion、Command/Combobox、Calendar/DatePicker、OTP 在没有真实业务消费方和后端契约前标记为延后，不为数量补齐重复 primitive；决策与替代方案记录在 `docs/ui-primitives.md`。

<!-- AI modified: the P1 regression record distinguishes executable closure from the earlier gallery baseline. -->

#### P1 回归闭环（2026-07-29）

- `Executed`：Schema Form 以一个真实 `multipart/form-data` 命令联合提交 JSON 字段与原生 `File` 字节；Mock 服务端严格校验字段、数量、名称、类型、扩展名、签名和 8 MiB 上限，成功响应返回字段及文件回执，冲突与字段错误继续映射并聚焦到所属控件。
- `Executed`：敏感审批人字段只在具备写权限时进入可提交投影；权限撤销会清除旧值且不会触发不可写字段校验。DictSelect 的静态/远程数据源互斥并提供可见重试，MultiSelect 补齐组合框键盘模型、禁用项跳过和焦点恢复。
- `Executed`：查询参数更新复用一个逻辑页签和缓存实例；路由离场动画不再阻塞 KeepAlive 新页面，并立即以 `inert`/`aria-hidden` 隔离旧页面，三浏览器导航回归确认切换期间只有当前页面进入可访问性树。
- `Inspected`：组件目录的导入示例、Demo 可用性、初始版本和路由数量已与源码一致，不再把间接 Sidebar 演示或无效组件标签描述为可复制实现。

## 5. P1：菜单、路由与权限

### 5.1 菜单和路由

当前菜单数据和导航组件具备递归基础，但示例数据主要只有两级；折叠可达性和外链一致性已提升为 P0，本节负责补齐完整业务 Demo 与异常输入。

- [x] 支持并演示三级、四级菜单嵌套。
- [x] 当前路由自动展开全部祖先节点。
- [x] 折叠状态下子菜单通过浮层访问，并复用 P0 导航契约。
- [x] 横向菜单按“完整菜单 → More → 汉堡菜单”处理溢出和长英文。
- [x] 外链使用真实链接语义、新窗口提示和外链图标。
- [x] iframe 复用 P0 URL 白名单，并包含加载、失败、刷新、超时和来源说明。
- [x] 支持隐藏菜单但允许直接访问的路由。
- [x] 处理无权限菜单和无权限直达页面。
- [x] 菜单标题在语言切换后立即更新。
- [x] 防御重复 ID、循环父子关系、非法 URL 和未知组件。
- [x] 保存失败时提供字段级原因，运行时不得静默过滤已成功保存的菜单。
- [x] 菜单编辑器增加层级预览和安全排序。
- [x] 完善键盘导航、焦点管理和 Escape 关闭行为。

### 5.2 权限体系

- [x] 演示路由、菜单、按钮、字段和数据范围权限。
- [x] 演示超级管理员与普通管理员差异。
- [x] 权限变化后及时更新菜单、路由和页面操作。
- [x] 前端权限与服务端权限不一致时提供清晰处理。
- [x] 权限矩阵支持只读、编辑和批量设置场景。
- [x] 文档明确：前端隐藏不能替代服务端授权校验。

<!-- AI modified: menu and permission completion records both reused P0 contracts and newly verified mutation/refresh behavior. -->

#### 阶段结果（2026-07-15）

- `Executed`：运行时拒绝重复 ID、循环对象、非法内部路径、未知组件和互斥字段；保存端复用同一目标策略并返回字段级 `422`，菜单编辑器展示四级祖先、同级位置、排序冲突、父级能力与循环约束。
- `Executed`：权限工作区展示路由、菜单、按钮、字段、数据范围五层效果，以及超级管理员全权限、普通角色、只读、逐项编辑、全部授予/清除；活动角色撤权会同步更新 Ability、菜单、动态路由、Tabs 与当前页面并进入 Forbidden。
- `Executed`：全量 Type Check 通过；导航、菜单、路由、角色、Ability 定向 6 文件 57/57，通过相关 18 文件 scoped lint。
- `Inspected`：折叠 Flyout、顶部 More/汉堡、活动祖先、隐藏路由、语言即时更新和 iframe/外链继续复用已验证的 P0 契约。
- `Assumed`：真实生产授权服务不在仓库内；MSW 重复服务端授权与字段错误只能验证前后端边界示例，不能替代生产 API 的鉴权、租户和数据范围测试。

## 6. P1：全局页面体验

### 6.1 页面设计规范

- [x] 定义页面标题、描述和操作区的标准结构。
- [x] 定义查询区、内容区、分页区的间距和层级。
- [x] 统一 Header、Sidebar、Tabs 和 Breadcrumb 高度基线。
- [x] 将 Breadcrumb 与 Tabs 统一为 context bar，并定义有/无 Tabs 的稳定高度。
- [x] 统一背景、边框、阴影、圆角和间距 Token。
- [x] 规定相邻 Shell 区域由哪一侧绘制分隔线，禁止双边界。
- [x] 明确 Card、Dialog、Drawer 和 Sheet 的使用边界。
- [x] 统一主操作、次操作和危险操作的顺序与视觉层级。
- [x] 外观设置只展示当前布局适用的选项，并为每项设置增加可观察的生效验收。
- [x] 修正外观面板预览与真实布局契约不一致的情况。
- [x] 将规则固化到可复用布局和组合组件中。

### 6.2 页面状态完整性

每个业务页面检查：

- [x] 首次加载。
- [x] 局部刷新。
- [x] 空数据。
- [x] 搜索无结果。
- [x] 接口失败。
- [x] 网络断开。
- [x] 权限不足。
- [x] 数据冲突或数据已被修改。
- [x] 提交成功、失败和部分成功。
- [x] 会话过期。
- [x] 重试和恢复入口。

### 6.3 URL 状态同步

- [x] 分页和每页行数。
- [x] 搜索关键词和筛选条件。
- [x] 排序字段。
- [x] 当前 Tab。
- [x] 展开的树节点。
- [x] 当前部门、字典或分类。
- [x] 可分享的详情 Drawer 状态。
- [x] 刷新、前进和后退行为。

<!-- AI modified: page states and URL ownership are closed through one typed vocabulary and allow-listed query contract. -->

#### 状态与 URL 结果（2026-07-15）

- `Executed`：新增 ready/loading/refreshing/empty/search-empty/error/offline/forbidden/conflict/success/partial-success/session-expired 类型与 `PageStatePanel`/Patterns 交互示例；`docs/page-state-and-url-contract.md` 逐页记录适用性与恢复入口，避免向不适用页面硬塞全局状态。
- `Executed`：allow-list URL composable 支持默认值省略、未知值清理、无关 query 保留、push/replace、动态服务端 ID、列表去重、显式空状态与 Back/Forward；已接入 Content/Operation Log Drawer、Monitoring、System Config、Dictionary 以及 Table 分组和树展开。
- `Executed`：全量 Type Check、目标 29 文件 lint、9 个 URL/PageState 测试文件 56 项及生产构建通过。
- `Inspected`：分页/筛选/排序由共享 Table 契约负责；Operation Log 仅在列表返回 ID 后激活 Drawer deep link，拒绝任意 query 直接触发详情请求。
- `Assumed`：生产跨页分享 Operation Log 详情需要同时分享分页/筛选，或由后端提供可验证 ID 入口；当前默认 Mock 页面的已知 ID 分享路径已验证。

### 6.4 响应式设计

- [x] Sidebar、Header 和移动导航从同一契约读取断点。
- [x] 查询条件在窄屏折叠或分组展示。
- [x] Table 在窄屏滚动、隐藏次要列或降级为卡片。
- [x] 操作按钮在空间不足时收进 More 菜单。
- [x] 移动端 Dialog 在适合场景下转为 Sheet。
- [x] 双列表单降为单列。
- [x] 长标题和 Breadcrumb 合理截断或折行。
- [x] 图表、权限矩阵、树和复杂筛选适配窄屏。
- [x] 所有触控目标具备足够尺寸。

<!-- AI modified: page-design completion is backed by reusable contracts and one measurable browser matrix. -->

#### 页面设计与响应式结果（2026-07-28）

- `Executed`：`PageHeader`、SearchForm、Table surface、context bar 与六种 Shell 共用页面间距、区域高度、单边界和 64rem/1024px 断点；Card/Dialog/Drawer/Sheet、主次/危险操作及 More 降级边界记录在 `docs/page-design-contract.md`。
- `Executed`：Appearance preview 与实时 Shell 读取同一 layout definition；浏览器逐项验证 boxed/fluid、侧栏初始状态、水印、Breadcrumb/图标、Tabs/样式、Footer、页面动效的可观察目标，并确认 sticky Header 与无折叠目标的侧栏设置保持隐藏。
- `Executed`：页面、布局、外观、对比度和无障碍目标 9 个测试文件 98/98；Shell 10/10 覆盖 6 布局 × 中英文 × 390/768/1024/1280/1440、顶部 More、四级 Flyout、明暗主题、密度、动效、跳过导航与粗指针 44px 目标。
- `Inspected`：查询区单列降级、双列表单、Table/权限矩阵横向容器、长标题/Breadcrumb、Chart/Tree `min-width: 0` 与移动 Sheet 均由共享消费组件承担，不逐页复制媒体查询。
- `Assumed`：320px/1920px 保留为边界 smoke；完整支持矩阵以路线图规定的五档宽度为准，业务接入新的超密操作区时仍需遵守 More 规则并增加对应回归。

## 7. P2：工程完整性

### 7.1 自定义指令

只为明确的 DOM 行为使用指令，业务状态优先使用组件和 composable。

- [x] 评估并实现 `v-permission`。
- [x] 评估并实现 `v-copy`。
- [x] 优先评估更明确的 `v-debounce-click` 和 `v-long-press`，不创建泛化的数据处理指令。
- [x] 评估 `v-autofocus` 和 `v-click-outside`，避免与已有组件重复。
- [x] `v-throttle` 仅在明确的高频 DOM 事件场景中评估，不作为数量型补齐任务。
- [x] PermissionGate、CopyButton 或 composable 已能解决时，不重复实现同职责指令。
- [x] 不与现有水印、Loading 组件形成双轨职责。
- [x] 为每个指令提供参数、修饰符、生命周期、清理行为和 Demo。
- [x] 补充卸载清理、键盘操作和无障碍测试。

#### 指令评估结果（不适用，2026-07-15）

- `不适用/替代`：`v-permission`、`v-copy`、`v-debounce-click`、`v-long-press`、`v-autofocus`、`v-click-outside`、`v-throttle` 均没有满足“裸 DOM 生命周期且现有能力无法表达”的新增条件；分别由 PermissionGate/CASL/服务端鉴权、CopyButton、pending/request composable、可见按钮、VeeValidate/Reka 焦点契约、Reka overlay、ResizeObserver/虚拟滚动器承担。
- `不适用/替代`：因为本轮没有合格指令，参数、修饰符、Demo 和指令卸载测试不适用；不创建空壳 API。若未来达到 `docs/dom-capability-decisions.md` 的复评门槛，必须同时补齐生命周期、清理、键盘与无障碍测试。
- `Executed`：`dom-capability-decisions.spec.ts` 2/2 通过，断言七项决策、权威替代能力以及生产源码没有第二套 `app.directive`/候选指令注册；scoped lint 通过。

### 7.2 无障碍

- [x] 图标按钮具有可读名称和 Tooltip。
- [x] 表单控件与 Label 正确关联。
- [x] Dialog、Drawer 和菜单正确管理焦点。
- [x] 表单错误后聚焦第一个错误字段。
- [x] 菜单、树、Table、Select 和 Tabs 支持键盘操作。
- [x] 拖拽能力提供非拖拽替代方案。
- [x] 状态不能只通过颜色表达。
- [x] 明暗主题满足基本对比度。
- [x] Toast 和异步更新使用可感知的实时区域。
- [x] 页面提供跳转到主要内容的入口。
- [x] 正常动效和 `prefers-reduced-motion` 均覆盖路由、Sheet、Sidebar 和 View Transition。

<!-- AI modified: accessibility completion combines source-wide invariants with real keyboard and motion checks. -->

#### 无障碍结果（2026-07-28）

- `Executed`：icon Button 从可读名称派生原生 Tooltip/title，源码门禁拒绝未命名 icon callsite；重复筛选器使用唯一 Label ID，Tabs 使用 roving tabindex 与 Arrow/Home/End/Delete，Dialog/Drawer/菜单恢复焦点。
- `Executed`：共享 FormDialog 与分步 Form Workbench 在校验后聚焦第一个可操作错误，复合富文本/日期控件暴露 invalid 状态；拖拽 Demo 同时提供移动按钮和键盘操作，状态文本、Toast、网络与异步反馈使用可感知语义。
- `Executed`：明暗主题 40 组语义文字/表面组合达到 4.5:1；真实浏览器验证 skip link、粗指针 44px，以及正常/reduced motion 下 route、Sheet、Sidebar、View Transition 行为；相关 9 文件 98/98、Shell 10/10 通过。
- `Assumed`：自动语义、焦点和对比度测试不能替代每种 OS/浏览器/屏幕阅读器组合的人工使用评估；模板发布方仍应按目标辅助技术清单抽样验收。

### 7.3 安全

- [x] 富文本和 Markdown 防止 XSS。
- [x] iframe 使用来源白名单。
- [x] 外链保存、Mock、接口和运行时复用同一校验策略，拒绝危险 URL。
- [x] 文件上传不只依赖扩展名和前端 MIME。
- [x] 防止 CSV 公式注入。
- [x] 文件名、路径和下载名安全处理。
- [x] 敏感字段按权限脱敏。
- [x] Token 和会话过期统一处理。
- [x] 动态菜单组件只允许安全注册表中的键。
- [x] 形成安全边界文档和对应测试。

#### 安全结果（2026-07-15）

- `Executed`：富文本采用标签/属性/URL allow-list，Markdown 使用 typed VNode renderer 且原始 HTML 保持文本；外链/iframe 保存、Mock 和运行时共享精确来源策略，动态菜单组件与图标只解析固定注册表。
- `Executed`：上传同时检查扩展名、MIME、大小、文件名和常见文件签名，下载名再次清理；CSV 导入拒绝公式前缀且导出再次中和；配置、用户与操作日志按权限/公开字段重建脱敏响应。
- `Executed`：`security`、编辑器、URL、上传、CSV/业务组件、会话边界和菜单 7 个测试文件 43/43 通过；`docs/security.md` 记录客户端与服务端消毒、授权、重定向、存储、审计和 CSP 边界。
- `Assumed`：签名 Token、病毒扫描、最终重定向、持久审计、租户隔离、服务端数据范围和生产 CSP 必须由真实后端/边缘验证，前端与 MSW 不能提供这些保证。

### 7.4 性能

- [x] 定义大表格启用虚拟滚动的阈值。
- [x] 大型树支持按需加载。
- [x] 页面路由和重型组件按需加载。
- [x] 富文本、图表和编辑器避免进入无关页面首包。
- [x] 搜索请求支持防抖和取消旧请求。
- [x] KeepAlive 和多页签缓存具有数量上限和释放策略。
- [x] 图表在隐藏 Tab、尺寸变化后正确重绘。
- [x] 定义首包、首屏、路由切换和交互性能预算。

<!-- AI modified: performance completion is backed by runtime lifecycle tests and a production bundle gate. -->

#### 性能结果（2026-07-28）

- `Executed`：共享性能契约定义 Table 200 行虚拟滚动、Tree 100 节点按需加载、KeepAlive 20 页上限，以及首包、异步 chunk、首屏、路由和交互预算；Tree 支持加载、错误、重试和缓存失效，Chart 在激活、可见性和尺寸变化后重绘。
- `Executed`：搜索选择器取消旧请求并拒绝过期响应；路由页面、Quill、图表和编辑器保持异步分块，生产 manifest 中全部 JavaScript 资产由 `check:bundle` 自动检查。
- `Executed`：性能、图表、树和相关契约测试随 14 个目标测试文件 91/91 通过；完整 Type Check、`vp run check` 与 `vp run build` 通过，Bundle budget 明确通过。
- `Assumed`：首屏和交互毫秒预算是模板发布门槛，真实线上 Web Vitals、设备分位数和网络条件需由部署后的 RUM/CI 浏览器环境持续采集。

### 7.5 可观测性

- [x] 全局 Vue 错误处理和 Promise 异常处理。
- [x] 统一接口错误分类和用户提示。
- [x] 错误信息包含可执行的下一步操作。
- [x] 展示请求 ID，便于联调和排查。
- [x] 支持业务操作日志、登录日志和权限变化日志。
- [x] 预留前端错误上报接口。

#### 可观测性结果（2026-07-15）

- `Executed`：应用在插件和路由前安装 Vue error handler 与 `unhandledrejection` 监听；vendor-neutral reporter 注册/清理接口和 `admin:frontend-error` 浏览器事件只发送受限诊断字段，不发送组件状态或请求 payload。
- `Executed`：`ApiError` 统一 canceled/authentication/authorization/conflict/validation/timeout/network/server/client/contract/unknown 分类及 sign-in/request-access/refresh/review-input/retry/contact-support 动作，优先展示服务端 `X-Request-ID` 并以客户端 UUID 回退；`AsyncState` 展示恢复建议和请求 ID。
- `Executed`：Monitoring 与内容操作日志覆盖登录、业务操作、API、异常和权限变更示例；可观测性、AsyncState、API/HTTP、Monitoring、内容与角色 7 个测试文件 51/51 通过，scoped lint 与 Type Check 通过。
- `Assumed`：生产 reporter、采样、release/source map、保留周期、数据驻留和告警路由需要部署方接入；接口与隐私边界记录在 `docs/observability.md`。

### 7.6 Mock 与接口契约

- [x] 统一请求、响应和分页结构。
- [x] 统一错误结构、空值和可选字段规则。
- [x] 统一文件上传和日期时区规范。
- [x] 引入或维护 OpenAPI/Schema 契约。
- [x] 增加接口契约测试。
- [x] Mock 覆盖延迟、超时、401、403、409、422 和 500。
- [x] Mock 数据覆盖长文本、空字段、异常字段和大量数据。

<!-- AI modified: the API contract is closed through executable schemas, documented wire rules, and deterministic failure fixtures. -->

#### Mock 与接口结果（2026-07-28）

- `Executed`：Zod 契约统一 JSON、成功信封、分页、错误详情、上传、ISO 日期时间与 IANA 时区；`docs/api-contracts.md` 和 `docs/openapi.yaml` 明确请求 ID、空值、可选字段和前后端职责。
- `Executed`：HTTP 层将 401/403/409/422/超时/网络/5xx/契约错误映射为稳定分类与下一步动作，Mock 提供可重复的延迟、超时、401、403、409、422、500 场景。
- `Executed`：API/HTTP/可观测性/异步状态及相关目标测试随 14 个文件 91/91 通过；示例数据 9 文件 70/70、完整 Type Check、`vp run check` 和生产构建通过。
- `Executed`：2026-07-29 契约门禁双向核对全部 78 个 Mock operation，29 个 JSON Mock 读取点均强制请求 schema，73 个生产请求调用点均强制响应 schema；OpenAPI 的所有 JSON 写入正文均引用关闭额外字段的领域 DTO，二进制媒体类型与下载头独立校验。
- `Assumed`：接入真实后端后，服务端仍需发布其实现版本的响应契约，并在集成 CI 对本仓库 OpenAPI/Zod 消费契约执行兼容性校验；仓库不伪造尚不存在的服务端生成物。

## 8. 测试与视觉验收体系

### 8.1 测试分层

- [x] 工具函数和业务规则单元测试。
- [x] 组件交互测试。
- [x] 页面与接口组合测试。
- [x] 核心用户流程 E2E。
- [x] 多布局、多语言和多主题视觉回归。

### 8.2 核心流程

- [x] 登录、退出和会话过期。
- [x] 用户增删改查、导入和批量操作。
- [x] Table 分页、排序、筛选和选择。
- [x] Form 校验、草稿、提交和错误恢复。
- [x] 权限变化和无权限访问。
- [x] 多级菜单、外链和 iframe。
- [x] 中文、英文切换。
- [x] 六种布局切换和侧栏折叠。
- [x] 明暗主题和不同组件密度。
- [x] 移动端导航和关键业务操作。

### 8.3 关键组合矩阵

核心矩阵必须覆盖以下组合，不以“容器可见”代替交互和视觉验收：

| 范围       | 组合                                          | 必须断言                                      |
| ---------- | --------------------------------------------- | --------------------------------------------- |
| Shell 基线 | 6 种布局 × 中文/英文 × 390/768/1024/1280/1440 | 无意外横向滚动、区域遮挡、双线和基线错位      |
| Sidebar    | 适用布局 × 展开/收起 × 1/2/3/4 级菜单         | 鼠标和键盘均可访问、Flyout 可关闭、焦点可恢复 |
| 顶部导航   | 中文/英文 × 1024/1280/1440                    | 导航与右侧操作区不相交，More 降级有效         |
| 内容膨胀   | 核心组件 × 100%/150% 文案                     | 无裁切、重叠、点击死区；截断值可读取          |
| 动效       | 正常 / reduced motion                         | 正常模式连贯，减少动效模式无非必要动画        |
| 主题抽样   | 明亮/深色 × 标准/紧凑密度                     | 对比度、边界和活动态一致                      |

320px 和 1920px 作为边界 smoke，核心回归使用统一的 390/768/1024/1280/1440 宽度集合。

<!-- AI modified: acceptance is recorded only after unit, browser geometry, workflows, and inspected snapshots agree. -->

#### 测试与视觉结果（2026-07-29）

- `Executed`：完整 Vitest 基线为 65 个测试文件、618 项测试；覆盖工具/规则、组件交互、页面与 MSW/API 组合、契约及安全边界。
- `Executed`：完整浏览器套件 123/123 通过（Chromium 58、Firefox 32、WebKit 33），且无重试；核心流程覆盖登录/退出/会话、用户 CRUD/CSV/批量操作、Table 请求参数与 URL/排序/行数/按钮、Form 草稿、Schema multipart 文件与 409 恢复、权限撤销、缓存路由、四级菜单、外链、iframe、离线恢复和 390px 搜索/选择。
- `Executed`：Shell 几何矩阵覆盖 6 种布局 × 中英文 × 390/768/1024/1280/1440；另覆盖 Sidebar 展开/收起与 1–4 级菜单、顶部导航 1024/1280/1440、普通/减少动效、明暗主题和标准/紧凑密度。
- `Executed`：21 张确定性 Chromium 像素基线覆盖核心长文本宽度和代表性组件模块；截图固定时间、语言、时区、字体、主题、动效、caret、遮罩和差异阈值，几何断言独立验证无溢出、无遮挡、无双线、菜单可达和焦点恢复。
- `Inspected`：组件中心 390px 中文与 Form 1280px 英文基线更新前逐张对比 expected/actual/diff，确认差异分别来自独立模块重构和第七个可达字段控件示例；重试图像一致且更新后非更新模式通过。
- `Assumed`：像素回归以 Chromium 为发布基线；真实 VoiceOver/NVDA、Firefox/Safari 字体栅格与生产设备分位数仍需部署方持续验证。

### 8.4 质量门禁一致性

#### 闭环结果

迭代前的存量格式基线阻断已在独立机械格式阶段处理。当前 Oxfmt 是唯一格式化器，Oxlint 与语义 ESLint 各自保留明确职责；应用、单测、配置和 Playwright 项目共同进入 TypeScript build gate。

#### 任务

- [x] 明确完整必需命令集：`vp check`、`vp run check`、`vp test run`、无 Mock 生产构建、Mock 预览构建及 CI E2E。
- [x] 对齐 AGENTS、README、CI 和 Vite+ 配置中的质量命令说明。
- [x] 单独处理存量格式化，避免与功能迭代混在同一个大范围变更中。
- [x] 格式基线清理完成后恢复统一的 `vp check` 门禁。
- [x] 分页测试同时断言 UI 显示、请求参数、数据行数和按钮状态，不再只断言事件 payload。
- [x] E2E 布局测试从“容器可见”升级为无溢出、无遮挡和菜单可达性断言。
- [x] 为视觉回归建立稳定数据、字体、时区、语言和截图容差。

#### 质量门禁结果（2026-07-29）

- `Executed`：全库 `vp check` 确认 700 个文件格式正确、665 个文件无 Oxlint 警告或错误；`vp run check` 的全项目 `vue-tsc --build` 与 ESLint 通过。
- `Executed`：`vp run test:coverage`、契约/安全/测试清单/生产依赖审计、无 Mock `vp run build`、Mock `VITE_ENABLE_MOCKS=true vp run build`、`CI=true VITE_ENABLE_MOCKS=true vp run test:e2e`、CI 非交互冻结安装与 `git diff --check` 均通过；生产 bundle budget 通过。
- `Inspected`：格式等价 ESLint 规则明确交由 Oxfmt，未通过关闭 Vue/TypeScript/项目语义规则掩盖问题；pnpm workspace 规则保持启用并校验与冻结锁文件兼容的 `shellEmulator` 设置。
- `Inspected`：`AGENTS.md`、README、`docs/testing.md`、部署文档和 GitHub Actions 使用同一命令职责；Mock `dist` 仅用于浏览器验收，发布前必须以 `VITE_ENABLE_MOCKS=false` 重建，产物门禁会拒绝真实 Mock 入口或 worker 泄漏到生产 `dist`。
- `Assumed`：CI 外部网络、浏览器下载镜像和部署凭据不由仓库测试控制；冻结安装和本地 Chromium 结果证明仓库内契约，不替代托管环境健康度。

## 9. 示例数据要求

- [x] 包含中文名、英文名和超长姓名。
- [x] 包含长邮箱、空头像和长文件名。
- [x] 包含启用、停用、锁定、待审核等状态。
- [x] 包含真实组织层级和权限关系。
- [x] 包含边界日期、时区、金额、百分比和空值。
- [x] 包含空数据、异常数据和大量数据。
- [x] 中英文内容均具有合理业务语义。

<!-- AI modified: example-data completion records the representative fixtures without widening public domain states. -->

### 示例数据结果（2026-07-28）

- `Executed`：用户、内容文件、字典、部门、菜单、角色、Table 与 Monitoring fixtures 覆盖中英文身份、超长姓名/邮箱/双语文件名、空头像、四级组织与权限关系、金额/百分比/空值、异常和大数据。
- `Executed`：偏移时间 `2026-06-30T09:30:00-07:00` 跨 UTC/Asia/Shanghai 日期边界，显示契约测试同时覆盖时区、金额、百分比和空值；9 个代表性测试文件 70/70 通过。
- `Inspected`：`locked` 与 `pending` 保留为 `account_status` 字典示例，不擅自扩张仅支持 active/suspended 的公开用户写入 API；完整清单和维护约束见 `docs/example-data.md`。
- `Assumed`：真实生产规模、租户分布和脱敏样本不在仓库内；当前确定性 fixtures 用于功能、边界和视觉回归，不代表容量压测数据。

## 10. 建议执行顺序

1. 修复 ProTable、DataTable 的共享分页响应式契约并补齐交互测试。
2. 修复折叠多级菜单不可达、断点冲突和顶部导航遮挡。
3. 统一外链保存/运行时策略，并补齐 iframe 失败与恢复状态。
4. 重构 Shell 几何、分隔线、折叠入口和设置有效性。
5. 修复国际化长文本与 locale 格式化，建立统一视觉矩阵。
6. 重组组件中心，优先拆出 Table 和 Form 独立模块。
7. 完善筛选、选择、上传、拖拽、编辑器、图标和 shadcn-vue 展示。
8. 统一页面状态、URL 状态、权限边界和错误恢复。
9. 按真实业务需要补充指令、无障碍、安全、性能、可观测性和接口契约。
10. 对齐质量命令，清理存量格式基线，闭环 E2E 与视觉回归。

## 11. 单项功能完成定义

每新增或修改一个组件、页面或业务能力，必须满足：

- [x] 功能实现完成，未留下死代码和临时占位。
- [x] 中文和英文可用。
- [x] 明亮和深色主题可用。
- [x] 页面和业务组件在桌面、平板和移动端可用；primitive 在消费容器中不阻碍响应式。
- [x] 适用的异步或数据型组件覆盖 Loading、Empty、Error、Disabled、Readonly 状态。
- [x] 150% 文案膨胀下无裁切、重叠和点击死区。
- [x] 可见设置产生可观察效果，不适用设置已隐藏、禁用或说明。
- [x] 分页、筛选、排序、Tab 等可分享状态按契约同步 URL。
- [x] 远程请求具备适用的取消、竞态保护、重试和错误恢复。
- [x] 键盘、焦点和辅助技术行为合理。
- [x] 安全和权限边界明确。
- [x] Demo、API 和使用说明齐全。
- [x] 至少包含一个真实业务组合示例。
- [x] 未重复已有组件职责。
- [x] 项目当前约定的 Type Check、Lint、Tests 和 Build 通过，并记录实际执行命令。
- [x] 高风险交互具有 E2E 或视觉验证。
- [x] 交付结论标记为 Executed、Inspected 或 Assumed，不夸大未执行验证。

<!-- AI modified: the shared completion definition closes only after catalog, source, and executable-gate audits agree. -->

### 完成定义结果（2026-07-29）

- `Executed`：组件目录不再含 `implementation/demo/test: missing`；8 个组件专项路由均可达，Form 字段控件与 SearchForm Demo 在路由重构后仍真实挂载，Patterns 进入双语模块矩阵。
- `Executed`：Table/Form/上传拖拽/筛选选择/编辑器/图标/primitives/业务模式均有可交互示例、状态与契约说明；ActivityTimeline、AsyncState、BulkActionBar、ConfirmAction、MetricCard、NetworkStatus、SearchForm 和 WorkflowStepper 的目录证据已与真实测试/消费位置同步。
- `Executed`：最终 TypeScript、格式、Lint、618 项单元/组件/组合测试、123 项三浏览器 E2E/视觉、生产与 Mock 构建、bundle budget、冻结安装和差异完整性门禁通过。
- `Inspected`：源码扫描无 `transition-all`、TypeScript `any`、业务 `normalize*`、TODO/FIXME/WIP、死注释或不可达 Demo；生成文件中的 lint/TS 标记和 Markdown 的“不执行原始 HTML”属于明确工具/安全边界。
- `Inspected`：权限、外链、iframe、富文本/Markdown、上传/CSV、敏感字段、动态菜单、错误上报和服务端授权边界均有代码、测试或部署文档证据。
- `Assumed`：真实服务端实现版本的响应兼容性、生产 CSP/CORS、RUM/错误上报后端、跨浏览器像素、真实屏幕阅读器和租户数据规模由集成/部署环境负责；仓库提供了请求 DTO、消费端响应 schema 与验收入口，但不伪造外部系统通过结论。

## 12. 最终已知事实

以下事实对应 2026-07-29 完整迭代与最终门禁后的工作区：

- 组件中心由 8 个独立专项路由承载，目录为每个组件记录实现、Demo、测试、增强、成熟度、API、状态、限制、无障碍、业务消费和迁移信息；不存在未说明的 missing 状态。
- ProTable 与 DataTable 共用响应式分页规则；分页、筛选、排序、刷新、选择清理、页码夹紧和 URL 恢复由共享契约及浏览器联合断言覆盖。
- Shell 采用统一 64rem 桌面断点，六种布局、双 rail、context bar、Sidebar/Flyout、顶部导航 More 与移动汉堡降级均通过几何和交互矩阵。
- 中文与英文键集合自动校验一致且均超过 1300 个；长文本、150% 文案膨胀、locale-aware 日期/数字/金额和 Asia/Shanghai 管理时区有确定性回归。
- 外链、iframe、富文本/Markdown、上传/CSV、敏感字段、动态菜单与权限均使用共享安全/授权边界；前端可见性不替代服务端授权。
- 完整测试基线为 65 个 Vitest 文件、618 项测试，以及 123 项三浏览器 E2E/视觉测试（Chromium 58、Firefox 32、WebKit 33）和 21 张 Chromium 像素基线；核心 Shell 矩阵为 6 布局 × 2 语言 × 5 宽度。
- `vp check`、`vp run check`、契约/安全/测试清单/生产依赖审计、`vp run test:coverage`、无 Mock/Mock `vp run build`、全量 E2E、CI 非交互冻结安装与 `git diff --check` 构成统一发布门禁；Mock 构建不可部署。
- Oxfmt 是唯一机械格式化器；Oxlint 与 Vue/TypeScript/pnpm/项目语义 ESLint 各自保留职责，Playwright 源码已进入根 TypeScript project reference。
- 仓库内仍明确保留的外部假设是：真实后端领域契约与数据授权、生产安全响应头、错误/RUM 接收端、跨浏览器/辅助技术验证和生产规模容量数据需要在部署环境闭环。
