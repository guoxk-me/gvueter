# Gvueter Admin V2 原型计划

<!-- AI modified: 记录重新规划后的 Pencil 原型阶段、门禁、一致性基线与验收范围。 -->

## 目标

将现有 Design System 规格板重构为可指导前端实现和视觉验收的产品原型。V2 同时重审信息架构、Layout 和视觉方向，但继续遵守已确认的产品边界。

## 当前实施优先级

<!-- AI modified: record that the next delivery phase is prototype-to-code convergence, not performance baselining. -->

03–10 的主要画板已经形成 Candidate，但静态原型完成不等于 Vue 页面、运行交互或浏览器验收完成。当前暂停工程优化 Phase 4 性能基线，优先按 `Layout / Design System → Login → Dashboard → Router / Menu → Permission → Table / Form → Theme` 将已确认方案迁入运行代码。每一批以真实页面消费、Light/Dark、中文/英文、响应式、键盘/焦点和关键状态验收作为 Candidate 晋级依据；性能门禁在代表性页面稳定后恢复。

Implemented / Inspected（2026-09-20）：第一批 Layout / Design System 已迁入运行代码，包含三种正式 Layout、240/72px 导航、Header Breadcrumb、工具区顺序、移动导航、Quiet Layers、暖色 Dark、基础圆角/动效和受控 Appearance 入口。真实浏览器已检查 Sidebar 390/1024/1280、Top/Mixed 1280 及 Light/Dark；完整三布局 × 中英文 × 全宽度矩阵及 Login 之后各阶段仍未完成，因此总体状态保持“原型到代码迁移中”。

## 事实来源

- 产品规则以 `e.md` 为准。
- 视觉、布局与组件状态以 `gvuter.pen` 的 V2 区域为准。
- 当前实现只作为事实参考，不能自动覆盖新版产品或原型决策。
- 发现冲突时先停止下游扩展，回到对应门禁确认。

## 画板结构

```text
ARCHIVE
00 MAP
01 VISUAL DIRECTIONS
02 FOUNDATIONS
03 CORE COMPONENTS
04 BUSINESS PATTERNS
05 WIREFRAMES
06 HI-FI PAGES
07 RESPONSIVE / DARK / STATES
08 FLOWS / HANDOFF
```

现有 8 个画板整体保留在 Archive，不再作为 V2 组件或 Token 的直接依赖。

## 阶段与门禁

1. 使用相同 Dashboard 内容制作三个 1440px Light Layout 原型：侧边栏、顶部导航和混合布局。
2. Layout 经确认后，再验证视觉方向、响应式压缩和默认 Shell。
3. 视觉与 Layout 方向经确认后，建立 Foundations 与 Core Components Alpha。
4. 先完成结构级 Wireframe，再形成高保真页面。
5. 通过真实页面验证 Candidate 组件，并按 `Candidate → Validated → Stable` 晋级。
6. 补充响应式、Dark、英文和页面状态矩阵。
7. 完成静态流程故事板与 Handoff 标注。

每个阶段单独验收，未通过门禁时不扩展下一阶段。

## Design System 基线

- V2 视觉方向已确认采用 `Quiet Layers`：以浅 Lavender 环境色、干净工作面、弱边界和 Violet 状态线为基底，只为关键工作面提供柔和层级。
- Token 分为 Primitive、Semantic 和少量 Component 三层。
- 正式资产统一使用无版本号的 `gv-*` Token 命名空间；`p1-*`、`gv2-*`、`gv3-*` 和 `v2-*` 仅允许存在于归档探索稿，不得被正式画板或实现继续引用。
- 使用 4px 间距网格。
- 桌面正文与数据基线为 14px。
- 页面标题使用 28px/700，区块标题使用 16px/600，指标数字使用 28px/700。
- 常规控件高 36px，舒适表格行约 44px，Compact 表格行约 36px。
- 小控件、常规容器、大型 Overlay 圆角分别以 6px、8px、10px 为基线。
- 默认品牌色为 Violet；受控品牌预设包括 Violet、Blue、Cyan、Green、Orange、Rose 和 Slate。
- 所有语义 Token 同时定义 Light/Dark；核心组件和代表页验证 Dark。
- Carousel 与 InputOTP 保留在库存，不进入 Alpha。

Alpha 优先覆盖导航、表单、数据展示、反馈和 Overlay 的高频组件。首批 Business Pattern 包括 Page Header、Filter Bar、Table Workspace、BusinessDrawer、Detail Drawer、Permission Matrix、Page State 和 Bulk Action Bar。

## Shell 基线

- 默认采用侧边栏布局；顶部导航和混合布局作为可选正式布局保留。
- 主设计宽度 1440px；Header 56px、Sidebar 240px、折叠宽度 72px、页面边距 24px。
- 侧边栏布局承载完整流程。
- 顶部和混合布局各验证 Dashboard 与 User Management。
- 混合布局采用 72px 主模块 Rail；工作概览等一级叶子页面不显示空二级栏，目录模块可使用 240px 当前模块菜单。副菜单收缩后只保留一个 Rail，通过 Flyout 访问子菜单。
- 桌面布局将 Breadcrumb 放在全局 Header 左侧；Tabs 独占下一行上下文区，Dashboard Tab 固定。
- Header 右侧操作顺序为页面搜索、全屏、主题、语言和头像；页面搜索使用 Command Palette，并按权限过滤结果。头像菜单是唯一账号入口，Sidebar、折叠 Rail 和移动导航 Drawer 不重复展示用户身份。
- 数据页可使用更宽内容区；Dashboard 设置合理最大宽度；Form/详情使用较窄阅读宽度。

## 业务浮层契约

- 业务新增、编辑和详情统一使用 BusinessDrawer。
- 桌面默认宽度 480px，复杂表单/详情使用 640px；角色授权使用约 760px Large，在 768px 视口下近全宽，小于 768px 时全宽。
- Header/Footer 固定，内容区独立滚动。
- 已修改内容关闭时必须确认。
- 可分享的详情同步 URL；新增和编辑状态不写入可恢复 URL。
- 禁止 Drawer 嵌套 Drawer。
- 危险确认继续使用 AlertDialog/Dialog；Popover、通知和 Appearance Sheet 保留各自职责。

## 首批页面

1. Login
2. Dashboard
3. User Management
4. Role + Permission Matrix
5. Menu Management
6. Table Examples
7. Form Workbench

核心流程覆盖登录与恢复、用户 CRUD、角色授权、菜单管理、页面搜索、Tabs 与 KeepAlive。Pencil 使用静态故事板和 Flow Overview 表达关键节点，不模拟不存在的点击交互。

## 验证矩阵

- `390px`：Login、移动导航、Dashboard、User、Role Permission。
- `768px`：Table、Role Permission。
- `1440px`：全部核心页面与三个视觉方向。
- `1920/2560px`：Shell、Dashboard、User Table 拉伸验收。
- Dark：Login、Dashboard、User Table、Permission Matrix 和一个 Overlay。
- 国际化：中文为主；Shell、Table、Form 和错误状态提供英文压力测试。
- 状态：Pattern 层覆盖 Loading、Empty、Error、Offline 等完整规范；页面绘制关键组合。

## 当前执行范围

第一阶段 Layout 原型已确认，包含：

- `01A — Sidebar Layout / Dashboard`
- `01B — Top Navigation Layout / Dashboard`
- `01C — Hybrid Layout / Dashboard`

三张画板使用相同 Dashboard 内容，只比较导航占用、内容起点、Breadcrumb/Tabs 层级和宽屏空间。

第一阶段已确认选择 `01A — Sidebar Layout` 作为默认 Shell；`01B` 和 `01C` 保留用于展示可替换布局能力。

第二阶段响应式结构原型已完成并暂停验收，包含：

- `02A — Sidebar Responsive / Mobile Base · 390`
- `02B — Sidebar Responsive / Mobile Navigation Drawer · 390`
- `02C — Sidebar Responsive / Compact Desktop · 1024`
- `01A — Sidebar Layout / Dashboard · DEFAULT`，作为 1440px 中间基准
- `02D — Sidebar Responsive / Wide Desktop · 1920`
- `02E — Sidebar Responsive / Ultra Wide · 2560`

当前响应式规则如下：

- 小于 1024px 时移除常驻 Sidebar；390px 隐藏 Breadcrumb、保留压缩 Tabs，导航通过宽度为 `min(320px, 100vw - 48px)` 的 Drawer 恢复完整信息。导航 Drawer 不采用业务编辑 Drawer 的移动端全宽规则。
- 1024–1279px 默认将 Sidebar 收缩为 72px 图标 Rail，保留 Breadcrumb、Tabs 和完整 Dashboard 工作区；1280px 及以上默认展开，桌面用户偏好可覆盖默认值。
- 1440px 使用 240px Sidebar 与 24px 页面边距，作为默认桌面基准。
- 1920px 的 Dashboard 主内容约束在 1440px 左右并居中。
- 2560px 的 Dashboard 主内容上限约 1600px，额外宽度转化为留白，不增加信息列数。

第二阶段响应式结构已确认。第三阶段视觉方向验证已完成三张探索稿，并形成一张 A+C 融合确认稿：

- `03A — Visual Exploration / Quiet Precision · ARCHIVE`：近白画布、弱边界、低圆角，以 Violet 导航状态线作为主要识别点。
- `03B — Visual Exploration / Modern Dark · ARCHIVE`：整体使用中性暗色表面和弱边界，Violet 只承担状态与交互，不使用传统黑侧栏与白内容拼接。
- `03C — Visual Exploration / Soft Layers · ARCHIVE`：浅 Lavender 画布与白色轻浮层，强调柔和阴影和空间层次。
- `03D — Visual Direction / Quiet Layers`：保留 A 的克制结构、弱边界与 Violet 状态线，吸收 C 的浅 Lavender 氛围和选择性浮层；指标区继续平面化，仅为趋势、动态、表格与主操作提供轻阴影。

四案保持相同 Sidebar Layout、Dashboard 内容和信息密度，只比较色彩、材质与层级。三种正式桌面布局及 Sidebar 响应式系列已统一采用 Header Breadcrumb 和右侧优先页面搜索。`03D` 已晋级为正式视觉基线。

第四阶段已经开始：`04A — Design System / Foundations` 已建立 Light/Dark 语义色、Inter 字阶、4px 间距体系、舒适与 Compact 密度、小圆角、两级选择性阴影和可见焦点状态。

一致性回基已经完成：`01A–01C`、`02A–02E`、`03D` 和 `04A` 均采用同一套 `gv-*` Token 与 Quiet Layers 视觉基线；Header 为 56px，桌面常规控件为 36px，桌面页面边距为 24px。所有正式画板均已通过布局问题与旧 Token 引用检查。

<!-- AI modified: 将 basic.pen 定义为可选择性吸收的参考资产，而不是新的原型真相源。 -->

`/Users/guoxk/me/i/pen/basic.pen` 可作为 Design System 参考库：优先借鉴其 Violet/Warm Stone 色阶、语义 Token 分层、组件状态组织、响应式/主题行为清单和交付治理结构。它使用独立的变量命名与组件 ID，不能直接替换或混入 `gvuter.pen` 的 `gv-*` Token 和 04B Masters；具体控件仍以 `gvuter.pen` 的已确认尺寸、交互契约与业务验证为准。

`04B — Core Components Alpha` 的范围与门禁已经冻结，并开始建立以下首批资产：

- `04B — Core Components / Masters · CANDIDATE`：保存可复用母版，页面和规范展示只使用 Instance。
- `04B.0 — Core Components / Overview · CANDIDATE`：记录六个组件族、成熟度路径、实例预览和真实页面验证映射。
- `04B.1 — Core Components / Actions · CANDIDATE`：覆盖 Button、IconButton、Toggle 和 ToggleGroup 的正式变体、尺寸、交互状态与使用契约。
- `04B.2 — Core Components / Form Controls · CANDIDATE`：覆盖 Field、Input、Textarea、Select、Combobox、Checkbox、RadioGroup、Switch、DatePicker 和 FileUpload，并提供关键状态与浮层内容示例。
- `04B.3 — Core Components / Navigation · CANDIDATE`：覆盖 Breadcrumb、Tabs、Pagination、CommandPalette，以及 Sidebar、MenuItem、SubMenu 和 Collapsed Flyout 母版，包括响应式适配、状态矩阵、键盘模型与数据契约。
- `04B.4 — Core Components / Data Display · CANDIDATE`：覆盖 Avatar、Badge、Separator、Table、DataTable 和 Card，并验证 Vue Query、树形虚拟化、响应式与代表性 Dark 状态。
- `04B.5 — Core Components / Feedback · CANDIDATE`：覆盖 Alert、Toast、Progress、Spinner、Skeleton 和 Empty，并通过反馈升级阶梯验证 Callout、AsyncState、PageState、NetworkStatus 与 Global Loading 的职责边界。
- `04B.5.1 — Illustration System · CANDIDATE`：定义 Empty、Search Empty、Forbidden、Not Found、Server Error 和 Offline 六类语义插图，以及主题、尺寸、可访问性和交付契约。
- `04B.6 — Core Components / Overlay · CANDIDATE`：覆盖 Tooltip、DropdownMenu、Popover、Dialog、AlertDialog 和 Drawer，并通过 BusinessDrawer、FormDrawer Recipe、Dirty Guard、响应式与代表性 Dark 场景验证业务浮层契约。

组件尺寸采用 `32/36/40px`，移动端关键触控区域至少 `44px`；控件反馈与 Overlay 动效基线分别为 `150ms` 和 `200ms`。正式资产必须使用 `gv-*` Token。组件依次经过 `Candidate → Validated → Stable`，不得仅因绘制完成而标记为稳定。

Actions 的 Button 变体固定为 Primary、Secondary、Outline、Ghost、Destructive 和 Link；IconButton 使用相同的视觉层级。状态矩阵按适用性覆盖 Default、Hover、Focus、Pressed、Disabled、Loading 和 Selected。Loading 保持原宽度并阻止重复操作；未授权操作应隐藏，不能用 Disabled 代替权限控制。

Form Controls 由 Field 统一管理 Label、Required、Description 和 Error；Control 只负责自身交互状态。Select 用于短且固定的选项，Combobox 用于搜索、远程数据和大量选项；远程选项、加载与重试由 Vue Query 管理，输入词与浮层开关保留在组件本地。DatePicker V1 覆盖单日和日期范围，FileUpload 覆盖默认、拖拽悬停、上传中和失败状态。

Navigation 以标准化后的 Route Record 与强类型 Route Meta 作为唯一真相源，权限过滤和异常数据校验在进入组件前完成。各 Layout 共享授权菜单树、当前路由与 `activeMenu`；栏宽偏好使用 `localStorage`，目录展开状态使用 `sessionStorage`，均按“用户身份 + Layout 类型”隔离。同一 Layout 内的 Sidebar、Rail 和移动 Drawer 共享目录状态；退出清理目录会话状态，保留该用户的栏宽偏好。Tabs 使用 `tabKey` 统一实例身份、会话恢复与 KeepAlive 淘汰；Pagination 区分 Page、Compact 和 Cursor；CommandPalette V1 仅搜索有权限的页面。DropdownMenu、Tooltip、Dialog 和 Drawer 容器由 `04B.6 — Overlay` 提供，Navigation 只定义触发器、内容结构和调用契约。

Data Display 保留轻量语义原语 Table，并将 DataTable 作为业务列表的唯一公开增强入口；原 ProTable 能力迁入模块化 DataTable，旧导出只作短期弃用兼容。DataTable 支持显式 Local/Remote 模式，调用方提供类型化 `queryKey`、`queryFn`、响应适配器与 Mutation；组件统一处理 Vue Query 的分页参数、取消、缓存、保留旧数据、重试、刷新和可选轮询。分页与虚拟滚动可以组合；树形场景先将已展开节点拍平成可见行，再按稳定 `rowId` 虚拟化。SearchForm、DataTable 与 FormDrawer 保持独立，第 09 阶段再定义 DataList/CRUD 页面组合层。

Feedback 按 `Transient → Inline → Blocking` 的影响范围升级，并确保同一事件只有一个主要反馈面。Axios 只负责错误标准化和 401/403 等全局策略，Vue Query 管理请求生命周期，最终反馈由所属页面或组件根据上下文决定。首次加载使用 Skeleton，后台刷新保留旧内容，Mutation 优先使用控件 Pending；Toast 只补充结果不明显的短暂反馈，持续错误与恢复动作留在 Callout、AsyncState 或 PageState。浏览器离线使用全局 NetworkStatus，单个 API 服务异常保留在对应区域；路由无权限、路由不存在和页面级致命失败分别进入 403、404、500 系统边界。

<!-- AI modified: 记录语义插图系统的主题、组件与交付边界，避免页面各自引入不一致图片。 -->

`04B.5.1 — Illustration System · CANDIDATE`（Board `gNxcs`，`1840×2420`）位于 `19604, 9076`，在 `04B.5` 下方保持 `120px` 间距。V1 只覆盖功能性语义插图，普通高密度后台页面不添加装饰图片；认证品牌插图作为后续独立增强。

- 六个稳定语义键为 `empty`、`search-empty`、`forbidden`、`not-found`、`server-error` 和 `offline`。页面标题、解释与恢复动作继续由 `EmptyState` / `PageState` 管理，插图本身不嵌入文字或 CTA。
- 视觉采用透明背景的 Soft 2.5D Violet 对象隐喻，不使用人物。基础颜色由 `Primary`、`Primary Soft`、`Surface`、`Muted` 和 `Stroke` 五个语义 Token 组成，并通过 `color-mix(in oklch)` 跟随品牌；Server Error 与 Offline 可分别使用少量 Error/Warning 强调色。
- `AppIllustration` 只暴露 `name`、`size`、`label`、`decorative` 和 `class`。标准尺寸为 `96 / 160 / 320px`；移动端缩小语义插图并隐藏纯装饰插图。默认 `decorative=true`，有意义状态由外层状态组件提供可访问名称。
- 工程交付采用独立异步 SVG 注册表、固定几何和按需加载；每个 SVG 源文件不超过 `30KB`，不接受位图描摹或自动 Trace。SVG 通过完整视觉和工程 QA 后才成为正式单一真相源。
- ImageGen 参考概念保存在 `docs/assets/prototype/illustration-concepts/`。最新视觉修订以用户认可的 Not Found 为基准：保留其地图构图，其他五张沿用细轮廓、浅纸面、折叠层次和少量强调色，弱化厚重立体与大块 Violet。通过编辑和复用已有矢量路径完成调整；Forbidden 的盾牌与锁细节采用项目内 `@lucide/vue` 的 ISC 授权几何。
- 六张母版均为原生矢量节点，Empty 与 Forbidden 已移除 PNG 回退及待补标记。母版 ID 分别为 Empty `r2I5Yd`、Search Empty `JVcwh`、Forbidden `aAM9h`、Not Found `sJJIj`、Server Error `qL3C1`、Offline `m66yF`。36 个主题与尺寸实例复用这些母版，三档尺寸统一按 50% 展示。
- 插图只使用 `gv-primary` 与 `gv-illustration-primary-soft / surface / muted / stroke` 五种颜色角色。四个插图专用角色都定义七种品牌与 Light/Dark 的完整组合；纸面、描边和暗部随品牌改变，避免只切换强调色、其余部分仍然偏紫。原生矢量母版无图片填充、固定色值或残留渐变。

本次画板已完成各语义卡与七品牌 Light/Dark 的视觉检查，36 个实例无缺失引用，布局检查无裁切问题。整板预览见 `docs/assets/prototype/illustration-v3-review/gNxcs.png`，主题对照见同目录的 `goBLm.png`；临时主题测试画板已移除，导出证据保留。SVG 源文件体积和可访问性输出仍是待执行的工程门禁，不能视为已经通过。按用户指定，已将 `06B` 的 No Visible Modules 页面与模块空数据场景分别同步为共享 Forbidden、Empty 矢量实例；其他页面的插图迁移仍待后续安排。

Overlay 按 `Anchored → Modal → Business Flow` 的任务影响逐级选择：Tooltip 只补充非必要说明，DropdownMenu 承载即时操作，Popover 承载轻量交互，Dialog 处理短任务，AlertDialog 保护高风险决策，Drawer 处理复杂表单与详情。shadcn-vue/Reka 原语只负责浮层、焦点、Portal 和键盘模型；BusinessDrawer 统一固定 Header、可滚动 Body、固定 Footer、关闭原因和异步 `beforeClose`，Vue Query、Vee Validate、Mutation 与错误映射由页面或 Recipe 组合。侧边业务 Drawer 内部复用 Sheet，移动端短操作使用 Vaul Bottom Drawer，公开语义统一为 Drawer；390px 复杂流程转为近全屏。Overlay 使用 Anchor、Modal、Toast、Global Blocking 四级语义层，局部全屏允许覆盖 Portal 容器；脏数据、Pending、Dark、中英文、Reduced Motion 和焦点返回均属于验收范围。

<!-- AI modified: 记录已确认并通过视觉 QA 的认证原型、状态矩阵与安全边界。 -->

第五阶段认证原型已经完成首轮 Candidate，并形成四组画板：

- `05A — Auth Shell Pattern / Anatomy · CANDIDATE`：定义 1440px 的 `56/44` 双栏结构、约 420px 的认证内容宽度、可替换品牌语境、全局语言/主题入口与克制的 Quiet Layers 表面关系；它是结构规范，不是独立产品路由。
- `05B — Login & States · CANDIDATE`：覆盖账号密码登录、配置驱动的单 Provider SSO、可选注册入口，以及 Default、Validation、Submitting、Captcha、Locked、System Error 状态。
- `05C — Recovery Flow · CANDIDATE`：覆盖找回密码、中性发送结果、邮件链接重置、Token 失效、重置成功、SSO Callback 与可选注册分支。
- `05D — Responsive & Dark · CANDIDATE`：验证现代中性 Dark 登录页，以及 `390×844` 的默认登录和 Captcha Required 移动状态。

认证体验继续复用 `04B` 的 Button、IconButton、Field、Input、Alert、Separator、Spinner 与 Badge 母版，并新增 Provider 无关的 `Captcha Slot / Image / CANDIDATE`。`05B` 的 `Auth / Login Form Recipe · CANDIDATE` 是唯一正式登录表单基准，`05A` 仅以实例引用该 Recipe 来说明 Shell 的结构。Auth Shell 是可组合页面模式，不封装成不可拆的单一组件。

密码输入统一使用从 `05B` 提取的 `Auth / Password Input / Default · CANDIDATE`（桌面 `36px`）与 Mobile 变体（`44px`）：保持原 Input 的边界、`6px` 圆角、`13px` 掩码字体和左侧内容间距，只在右侧保留 Lucide Eye Ghost IconButton。登录、重置密码、确认密码、注册、Dark、Mobile 与 Captcha 状态不得再使用携带邮箱语义的完整 `Field / Input / Default` 代替密码控件。

`05B` 的 Login State Strip 使用 `3×2` 比较矩阵。Default、Validation Error、Submitting、Captcha Required、Account Locked 与 System Error 六张状态卡必须共享同一套 `420px` 登录核心基线：账号 Field、独立密码标签、统一 Password Input 与全宽主按钮；Captcha 和表单级 Alert 只作为状态增量插入，不能替代核心表单。Submitting 只禁用可编辑控件并保留输入上下文，Pending 主按钮维持 Primary 对比度、使用内联 Spinner 且不改变几何，同时承担防重复提交、`aria-busy` 与 `aria-live` 语义。SSO Availability Error 属于独立 Auxiliary State，不计入六个核心登录状态。

认证安全与交互边界如下：

- 登录字段默认接受用户名或邮箱；手机号登录不进入 V1 核心范围。
- 不提供“记住我”复选框。默认使用标签页会话；持久续期由后端 `HttpOnly Cookie` 契约负责，Refresh Token 不暴露给 JavaScript。
- Captcha 由服务端风险策略触发，并允许项目配置 `always / adaptive / off`；前端不自行决定失败阈值。
- 账号锁定、剩余次数与 `retryAfter` 由后端权威返回；字段问题就近显示，锁定使用表单级 Alert，系统异常保留可复制 Request ID。
- SSO 默认支持一个由后端配置的 Provider；配置确定前不渲染入口，发现配置错误时保留轻量重试。
- 注册页面可选且默认关闭；找回密码始终返回中性结果，一次性重置 Token 只通过邮件链接进入正式流程。

四组画板已经与 `03D`、`04B.2` 和 `04B.5` 完成可见对照 QA：无文字溢出、画板重叠、旧 Token、硬编码 Fill、缺失引用或未完成 Placeholder；移动端关键操作区保持至少 `44px`。

<!-- AI modified: 记录 Dashboard 阶段的产品契约、首张高保真画板与后续状态范围。 -->

第六阶段 Dashboard 已完成默认桌面 Candidate：

- `06A — Dashboard Overview · CANDIDATE`（Board `d2g0br`，`1840×1488`）：包含居中的 `1440×1280` 完整页面（`YnUBw`），位于 `31444, 4736`，与 `05D` 保持 `120px` 间距。
- 页面沿用 `03D` 的 Sidebar、Header Breadcrumb、Tabs 和 Quiet Layers；Header 搜索仍位于右侧操作区首位，头像只保留在 Header。
- 默认内容顺序为页面操作、四项 KPI、`8/4` 活跃趋势与角色分布、`5/7` 待处理事项与最近活动，以及全宽紧凑系统健康条。KPI 与图表受全局日期范围影响，其他模块保留各自时间范围。
- 趋势图使用 Violet 主线与中性次线；角色分布使用前五角色加“其他”的横向排名条形图。页面以留白、排版和弱分隔建立层级，只为图表和列表提供必要 Surface。
- 刷新保留旧数据并独立更新可见查询；后台失败保留 Stale 内容并提供局部重试。权限变化立即重新计算模块并取消无权查询；无可见模块时保留 Dashboard Shell 和中性 Page State。

<!-- AI modified: 补充 Dashboard 状态、权限过滤和 Vue Query 生命周期的视觉验收结果。 -->

`06B — States & Permissions · CANDIDATE`（Board `SglJa`，`1840×5354`）已经完成，位于 `33404, 4736`，与 `06A` 保持 `120px` 间距：

- `First Loading`（`FMi36`）与 `No Visible Modules`（`g6wY9`）均使用真实 `1440×1280` 页面；前者只为权限过滤后的可见模块显示几何匹配 Skeleton，后者保留 Shell、不注册模块 Query，中央使用透明背景的 Forbidden 矢量实例（`W4dnA0`，引用母版 `aAM9h`，`320×240`），已移除该页面的 PNG 插图。预览见 `docs/assets/prototype/illustration-v3-review/g6wY9.png`。
- 模块状态区（`S8Sk5`）改为同一“活跃趋势”模块的三态横向对照：Background Refresh（`re9Hd`）、Partial Error/Stale（`WF7DU`）和 Empty（`L8RkXo`）。三者保持相同标题、时间信息、状态带、内容区和底部动作位置；Refresh 与 Stale 保留旧图表，Empty 内容区移除白色底板、边框和说明文字，居中使用透明背景的共享 Empty 矢量实例（`ZnmjB`，引用母版 `r2I5Yd`，`160×120`），已移除原 PNG。预览见 `docs/assets/prototype/illustration-v3-review/L8RkXo.png`。状态契约（`a3uunC`）下移为独立全宽表格，不再与运行态示例混排。
- 权限对比包含 Standard Admin（`NSnLB`）、Super Admin（`P01hIm`）和 Minimal Permission（`zynp6`）。Super 增加按可见性懒加载的安全与风险模块；Minimal 只注册两个 KPI 与趋势 Query，并重新排列网格而不保留空槽。
- 状态契约（`a3uunC`）区分 `isPending && !data`、`isFetching && data`、`isError && data`、成功空集合与权限过滤后 Registry 为空；表格采用与 DataTable 一致的中文表头、状态图标、双层信息单元格、紧凑行高和弱斑马纹。运行时契约（`VqzcY`）及生命周期（`Dy2E5`）覆盖范围切换、请求取消、身份/权限变更、敏感缓存清理、Drawer 关闭、健康轮询暂停和 Reduced Motion。

06B 共复用 `69` 个有效 Ref，已与 `06A`、`03D`、`04B.4` 和 `04B.5` 完成同画面对照；本次同步另行检查 No Visible Modules 页与模块空数据场景，无图片填充、裁切或缺失引用。

<!-- AI modified: 固化 06C 响应式、英文压力和移动端交互的已确认原型，避免跨端重新定义组件。 -->

`06C — Responsive & Dark · CANDIDATE`（Board `QOgWM`，`1840×5464`）已绘制，位于 `35364, 4736`，与 `06B` 保持 `120px` 间距：

- Desktop Dark（`jjiyt`，`1440×1280`）复用 `06A` 的完整 Shell、模块和主题 Token；趋势次线使用可读的中性色，保留 Violet 主线。
- Desktop English（`nvcYb`，`1440×1440`）保留完整页面信息；标题与操作分行，KPI 对比和口径、健康指标时间范围自然换行，不通过缩小字号容纳英文。
- Mobile Light（`mw3gP`，`390×2384`）展示完整纵向页面。导航通过 Drawer 访问，隐藏 Breadcrumb、压缩 Tabs，搜索仍是 Header 右侧首项，头像仅在 Header。KPI 使用 `2×2`；其后依次单列展示趋势、角色分布、待办、最近活动与系统健康。待办默认 `3` 条、活动默认 `4` 条，保留“查看全部”；健康指标采用 `2×2` 弱分隔布局。
- 日期交互（`WH1ip`，`390×844`）复用 Bottom Drawer：快捷范围、自定义起止日期、取消与应用。草稿不触发查询；应用后关闭并保留旧数据刷新。日期面板在当前 Drawer 内展开，不嵌套抽屉。
- 趋势触摸样例（`hUMjz`）保留原图路径与时间范围，仅减少轴标签；定位线、数据点与图下固定读数区同步，读数为交互示意数据。英文移动压力片段（`nMeZY`，`390×1510`）覆盖长标题、日期筛选、完整 KPI 和长列表文案；列表时间与状态可移至次行。

Executed：保存并重新加载文件后检查 `114` 个有效 Ref，无缺失引用、可见节点裁切、Flex 子项重叠或硬编码 Fill/Stroke。Inspected：桌面 Dark、完整移动页面、英文压力片段与日期/图表交互已逐块截图检查。预览位于 `docs/assets/prototype/dashboard-06c/`。本阶段为静态原型，查询、触摸、键盘和响应式运行行为仍需在实现阶段验证；V1 不提供用户拖拽或布局持久化。

<!-- AI modified: 固化已确认的 Router/Menu 原型范围与静态验收证据，区分设计契约和运行时实现。 -->

第七阶段 `07 — Router / Menu` 已完成四组 Candidate，按顺序位于 `06C` 右侧，画板宽度均为 `1840px`、间距 `120px`：

- `07A — Navigation Flow`（`u0aZTI`，Sidebar 修订后为 `1840×3662`）：完整菜单进入页，以及页面搜索、Tabs 操作、KeepAlive 返回和刷新恢复五个关键场景；补充同一 1440px 视口的收缩侧栏与 Flyout 对照。
- `07B — Menu Workspace`（`pXknl`，`1840×1739`）：`1440×1140` 桌面 Tree DataTable（`BvmQ6`），六列呈现名称、类型、路径/目标、有效状态、排序和操作；补充保留祖先的搜索结果与行操作菜单。V1 不提供批量修改或拖拽排序。
- `07C — Menu Editing`（`sYDY1`，`1840×3636`）：目录、页面、外链和 iframe 四类 `640px` BusinessDrawer，包含只读 routeKey、未保存路由预览、路径冲突、图标选择、叶子删除确认与离开保护。保存后立即生效，不另设发布流程；有子节点时禁止直接删除。
- `07D — States & Adaptation`（`W6tzAd`，`1840×4899`）：完整 Dark 桌面、`390px` 移动树列表与全宽编辑器、`640px` 英文长文案抽屉，以及首次加载/失败、后台刷新失败、403、404、页面加载失败、iframe 局部错误、配置隔离和空导航 Minimal Shell。状态插图复用透明背景的主题化矢量母版。

菜单、Breadcrumb、Tabs、KeepAlive 和页面搜索共享路由元数据；后端动态导航通过白名单 `componentKey` 接入。隐藏不等于停用，父节点停用只影响后代有效状态而不覆盖自身配置。正式导航保持三级以内，更深层级仅用于示例中心能力展示。

Tabs 默认使用 sessionStorage 保存身份和必要 UI 状态，可配置持久存储，但不持久化接口响应；刷新后重新校验路由与权限。KeepAlive 默认 LRU 上限为 10（可配置），关闭标签、退出或身份变化清理相应缓存。隐藏动态页面只有具备合法参数时才能作为可跳转搜索结果。跨域 iframe 错误只展示已验证原因或中性提示，不假定能够识别外部服务的具体故障。

Executed：文件保存并重新载入后，四组画板的 `128` 个直接 Ref 均有效；检查未发现可见裁切、Flex 子项重叠或硬编码 Fill/Stroke。Inspected：桌面 Light/Dark、四类编辑器、移动端、搜索、透明状态插图及确认流程已逐块截图检查。预览位于 `docs/assets/prototype/router-menu-07/`。本阶段仅为静态原型，权限校验、持久化、焦点、键盘和请求生命周期仍需在实现阶段验证。

<!-- AI modified: 记录 Q1069 确认的 Sidebar 重绘范围，消除旧 64px 基线和跨布局状态描述的歧义。 -->

## Sidebar 与多级导航修订

Q1024–Q1069 已全部确认采用 A，按以下契约统一 `04B.3` 导航母版、`01A–01C`、`02A–02E`、`03D`、06 Dashboard 与 07 Router/Menu 正式画板。用户后续确认“03A/03B/03C 一起统一”，三张探索稿的 Sidebar 也纳入同步；其 ARCHIVE 标记与页面主体视觉继续保留。

- Sidebar 为 `240px ↔ 72px`，内容区同步伸缩。展开态品牌栏右侧提供收缩入口；收缩后 Logo 居中，独立展开入口停靠右侧边缘。品牌栏固定，导航列表独立滚动。
- 工作概览作为一级页面，系统管理、运营和示例中心作为目录。原有表单工作台、内容管理与运维审计能力仍保留，由产品信息架构归入运营职责；展示层级调整不更改既有 `routeKey` 和 URL。
- 目录整行点击只切换展开，允许多个目录同时展开；首次进入自动展开当前页面祖先，其余读取会话状态。直接访问目录 URL 时才执行路由重定向，隐藏辅助页通过 `activeMenu` 高亮所属菜单，无可访问后代的目录隐藏。
- 桌面一级/子级行高为 `40/38px`，每级约 `16px` 缩进；当前叶子采用浅 Violet 背景及左侧细线，祖先仅强调文字、图标和 Chevron。目录 Chevron 位于行尾，收起向右、展开向下；长名称单行省略并通过 Hover/Focus Tooltip 显示完整内容。
- 收缩态页面直接导航并提供 Tooltip；目录通过 Hover、Focus 或点击打开 `280px` 单面板 Flyout，使用缩进展示完整子树。面板与触发器之间保留指针交互桥；跳转、外部点击或 Esc 关闭，指针离开约 `200ms` 后关闭，焦点留在面板内时保持打开。
- 展开态显示完整 Badge，收缩态以数字或圆点提示；分组标题收缩后隐藏文字，保留弱分隔、间距与可访问名称。缺少图标时使用统一中性占位图标并在开发环境提示配置；外链和 iframe 在展开态以行尾轻量标识说明，收缩态在 Tooltip/Flyout 中说明。
- 移动导航 Drawer 使用 `min(320px, 100vw - 48px)`，纵向展开目录且允许多个目录同时展开；点击页面后关闭，展开目录不关闭，再次打开保持本次会话状态。关键操作区域至少 `44px`，不展示重复账号入口。
- 目录提供 `aria-expanded/controls`；方向键移动焦点，左右键展开/收起，Enter/Space 执行，Esc 关闭 Flyout。宽度与文字动效约 `180ms`，子树与 Chevron 约 `150ms`；Reduced Motion 下取消位移动效。配置后台刷新保留合法旧导航，新配置成功后更新树，失效当前页按既定规则回退。

验收覆盖展开/收缩、当前祖先、三级菜单、长文本、Badge、外链、Flyout、权限空目录、Light/Dark、移动 Drawer 和键盘焦点。`04B.3` 修订后为 `1840×6240`；旧 NavItem 仅作为 Legacy 母版保留，不再用于任何页面 Shell。所有页面菜单复用新的 MenuItem / SubMenu；`03A/03B/03C` 使用共享 Expanded Sidebar（`BGWfu`），保留 `240px` 宽度、品牌栏折叠入口和可展开目录，其中 `03B` 使用 Dark 主题。

预览：[导航组件与状态矩阵](./assets/prototype/sidebar-v2/s39y8A.png)、[桌面展开](./assets/prototype/sidebar-v2/dTY4Q.png)、[桌面收缩与 Flyout](./assets/prototype/sidebar-v2/O3hauU.png)、[Mixed 上下文菜单](./assets/prototype/sidebar-v2/kJw4N.png)、[移动导航](./assets/prototype/sidebar-v2/Lrga7.png)、[Dark 侧栏](./assets/prototype/sidebar-v2/saEA3.png)、[03A 统一侧栏](./assets/prototype/sidebar-v2/JdyfU.png)、[03B Dark 统一侧栏](./assets/prototype/sidebar-v2/xQBgZ.png)、[03C 统一侧栏](./assets/prototype/sidebar-v2/D1Qbjo.png)。

Executed：首次同步范围内 447 个直接 Ref 均有效，可见内容裁切、Flex 子项重叠和顶层画板重叠检查均为 0；`pnpm run check` 通过。Inspected：展开/收缩、Flyout、Mixed、移动 Drawer、Dark 与英文状态已逐块截图核对。补查发现 `06B` 三个权限场景缩略图仍使用占位菜单，现已替换为共享 Collapsed Sidebar，并复核无可见裁切；参见[权限场景补齐预览](./assets/prototype/sidebar-v2/EUzbj.png)。后续 `03A/03B/03C` 的菜单同步采用上述扩展范围，首次同步统计不作为这三张画板的验收证据。静态原型只展示状态和契约，实际焦点、持久化、响应式切换和动态权限行为仍需在实现阶段验证。

## 08 Permission 绘制与交付

<!-- AI modified: 同步 Q1070–Q1146 已确认的权限原型、画板定位与静态验收证据，避免把设计完成当作运行实现。 -->

Q1146 A 已执行。五组 Candidate 位于 `07D` 右侧，统一宽 `1840px`、纵坐标 `4736`、横向间距 `120px`；沿用共享 Sidebar、Header、DataTable、BusinessDrawer 与主题化矢量插图。

| 画板 | 节点 | 位置 / 尺寸 | 已绘制内容 |
| --- | --- | --- | --- |
| [08A Role Management](./assets/prototype/permission-08/k4BAo.png) | `k4BAo` | `45164, 4736` / `1840×1703` | SearchForm + DataTable、六个示例角色、行菜单、复制与删除限制 |
| [08B Role Authorization](./assets/prototype/permission-08/z7U2e2.png) | `z7U2e2` | `47124, 4736` / `1840×3348` | 基本信息、分组式页面/操作授权树、原版对照、数据范围、Super Admin 只读边界 |
| [08C User Role Assignment](./assets/prototype/permission-08/ys1U6.png) | `ys1U6` | `49084, 4736` / `1840×1800` | 关联用户入口、多角色选择、停用角色移除、按资源展示有效授权来源 |
| [08D States & Boundaries](./assets/prototype/permission-08/FXRpF.png) | `FXRpF` | `51044, 4736` / `1840×2982` | Loading、搜索空、失败、无可授予项、只读、版本冲突、节点校验、保存差异、自我失权、停用和删除确认 |
| [08E Responsive & Dark](./assets/prototype/permission-08/dsyem.png) | `dsyem` | `53004, 4736` / `1840×3946` | 1440px Dark、768px 近全宽 Drawer、390px 全屏、英文长文案及精简移动工具菜单 |

主要样例 Operations Manager 展示 5 个页面、6 个操作与 18 位关联用户；页面勾选不隐式授予操作。Super Admin 显示“全部”，不使用固定权限计数。用户组合 Operations Manager 与 Auditor 后按资源/操作合成有效范围，审计的全部范围不能扩大用户或内容操作的范围。已分配的停用角色保留可见并可独立移除，不允许新选。

角色编辑统一使用三个 Tab 的 BusinessDrawer；普通业务编辑不改用 Dialog。高影响确认仍使用 AlertDialog。授权保存提交可编辑范围及版本，受保护、隐藏与未知权限由后端保留；节点校验、角色版本冲突、权限目录变化与网络失败分别呈现，保存失败保留草稿，不表达为部分提交成功。

<!-- AI modified: 同步功能权限树的点击感修订及所有响应式状态，避免主样例与 Dark、平板、移动端和英文画板继续分叉。 -->

功能权限树已由旧的连续技术树调整为“模块分组 → 页面访问 → 紧凑操作组”。页面叶子移除重复文件图标，权限编码默认隐藏；桌面操作选项使用 `36px` 有边界点击区，移动端使用两列 `44px` 点击区。模块三态 Checkbox 与“全选本模块”组合为 Outline 控件，锁定状态通过灰色勾选、紧邻名称的锁和“已授权 · 不可修改”共同表达。

搜索仅过滤和定位，不再提供“选择结果 / 清除结果”。展开与收起合并为单一状态按钮；展开状态显示“全部收起”，折叠后切换为“全部展开”。移动端更多菜单只保留“全部收起 / 显示编码”。相同结构已经同步到 08B Light、08D 只读状态，以及 08E 的 Dark、768px、390px 和英文场景；旧权限树仅保留在 08B 底部对照区，不再作为正式场景实例。

Executed：已保存到 `/Users/guoxk/me/i/pen/gvuter.pen`，导出五张整板及九张关键场景预览。五组画板的 100 个直接 Ref 均可解析；可见裁切、旧 Token、硬编码 Fill/Stroke/Effect 检查均为 0，已清除绘制 Placeholder；`pnpm run check` 通过。

Inspected：角色列表、权限树、数据范围、用户角色分配、冲突和确认、透明状态插图、Dark、平板、移动端和英文场景已逐块截图检查。权限树修订后，Light、Dark、平板、移动端和英文场景均保持 7 个页面节点、5 个已选页面、9 个操作节点和6个已选操作；08B、08D、08E 无可见裁切、旧 Token 或硬编码颜色。原型仍为 Candidate；实际授权、原子保存、查询缓存、键盘/焦点和响应式运行行为留待实现验收，本次不修改应用权限逻辑或 API。

产品规则已同步至 [产品确认稿](../e.md)、[产品概览](./product/01-product-overview.md)、[业务规则](./product/02-business-rules.md#3-角色权限与数据范围)、[技术契约](./product/03-technical-development.md#103-permission-阶段的已确认目标契约)和 [UI 与交互](./product/04-ui-and-interaction.md#103-角色管理与授权-drawer)。

## 09A List Workspace 绘制与交付

<!-- AI modified: 记录已确认的 09A 页面组合、复用资产和静态证据，保持后续阶段与运行实现的状态清晰。 -->

Q1147–Q1246 全部采用 A，并确认开始绘制及修正 SearchForm 等分布局；后续确认收起态按钮组计入首行四格，两个时间范围各跨两格。展开态进一步修正为自然流式顺序：部门补入第一行，按钮组移动至全部筛选项之后。`09A — List Workspace · CANDIDATE`（`v0QnE`）位于 `08E` 右侧 `54964, 4736`，尺寸 `1840×4252`，间距 `120px`。复用 08C 用户管理 Shell、现有 DataTable、按钮、输入、分页与主题化 SVG Master；示例角色沿用 08 的角色集合。

| 场景 | 节点 / 预览 | 内容 |
| --- | --- | --- |
| 整板 | [v0QnE](./assets/prototype/list-workspace-09A/v0QnE.png) | 默认页面 → 搜索 → 选择与菜单 → 查询状态 → 组合与适配契约 |
| 用户列表 / 1440 | [vElYB](./assets/prototype/list-workspace-09A/vElYB.png) | 新增主操作、常用筛选、用户复合单元格、状态 Badge、独立编辑入口及分页 |
| 搜索 | [Gy8xn](./assets/prototype/list-workspace-09A/Gy8xn.png) | 高级条件原位展开、已应用条件摘要、移除与清除全部 |
| 批量选择 | [i81OyA](./assets/prototype/list-workspace-09A/i81OyA.png) | 当前页三条选中、半选表头、启用/停用/导出/删除与清除选择 |
| 操作菜单 | [YwU61](./assets/prototype/list-workspace-09A/YwU61.png) | 行操作、列设置、密度和导出范围；密度与导出分别展示 |
| 查询状态 | [q2GDX](./assets/prototype/list-workspace-09A/q2GDX.png) | Loading、Refreshing、Search Empty、First Use、Error 与 Offline |

主表展示约八行的内部视口，本页为二十条、总数为 248；下方明确提示继续滚动查看余下十二条。该画法表达运行时的内部滚动，不将八行样例误写成完整二十条结果。搜索显式提交，重置恢复默认并立即查询；筛选、排序、页大小或显式刷新后默认清空选择。页面操作与表格操作分层，用户状态变更遵守高影响确认，角色分配独立授权。

SearchForm 已按统一四格规则修正：主页面收起态的关键词、状态、角色和按钮组均为 `279px`。展开场景第一行的关键词、状态、角色和部门均为 `339px`；创建时间和最后登录时间各为 `688px`、分别跨两格，并改为清晰区分开始日期与结束日期的组合控件。按钮组不固定在右上角，而是在日期范围之后独占一行、内部保持按钮原始宽度并右对齐。响应式目标为中等宽度 `2×2`、移动端单列。

Loading 与 Refreshing 的局部表格均为 `708×256`，表头、三行和底部结构对应。First Use 只在可以确认数据集为空且允许新增时出现；筛选空与首次失败使用无背景共享 SVG。离线且已有缓存时保留记录与持续提示，需网络的写操作暂停。

Executed：重新读取后画板状态有效，已移除绘制 Placeholder，导出六张预览。递归检查画板及实例覆盖中的 132 个 Ref，涉及 24 个 Master，缺失引用为 0；可见裁切、同层布局重叠、旧颜色 Token 与硬编码 Fill/Stroke/Effect 均为 0。`pnpm run check` 通过。

Inspected：主页面、搜索、批量选择、菜单与查询状态已进行截图复核；数量文本挤压、密度图标和示例角色命名差异已修正。静态原型不代表 Query、权限、键盘焦点、滚动和批量操作已实现或通过运行验收。

09A–09E 均已交付静态 Candidate；09B–09E 的结构、预览和静态 QA 记录见后续章节。运行实现与浏览器验收仍需单独推进。

## 09B CRUD Flow 绘制与交付

<!-- AI modified: 记录 Q1247–Q1310 确认的用户 CRUD Recipe、账号生命周期和异常恢复原型。 -->

Q1247–Q1310 采用推荐方案。复用 09A User List、04B.6 Overlay、08C 多角色与权限摘要、08D 冲突/确认以及 07C 长表单结构；现有 `YRpw7` 作为 Legacy 保留，不在本轮大范围迁移历史画板。新增纯结构 `BusinessDrawerShell / 640 · CANDIDATE`（`bXxF3`）与业务组合 `UserCrudRecipe / Edit User · CANDIDATE`（`wEhHea`），通用 Shell 不绑定用户接口或字段。

| 画板 | 节点 | 位置与尺寸 | 内容 |
| --- | --- | --- | --- |
| `09B — CRUD Flow / Main · CANDIDATE` | `egyuC` | `56924, 4736`；`1840×3768` | User List 上下文中的 Create、Detail、Edit，以及删除确认与撤销链路 |
| `09B — CRUD Flow / States · CANDIDATE` | `b2EZ5` | `58884, 4736`；`1840×3510` | Loading、Submitting、422、409、邀请部分成功、Dirty Close、403、远端删除、局部选项失败与筛选外创建成功 |

主流程节点为 Create `jz6eC`、Detail `G84xAb`、Edit `a3R0PQ`、Delete Flow `xXoNE`。用户表单采用 640px 单列弱分区：姓名、唯一登录邮箱、国际手机号、单一主部门、多角色与有效权限摘要；创建默认待激活并可选择是否发送邀请，编辑邮箱进入同一 Drawer 的独立子流程。详情用身份摘要及基础、组织、权限、活动四个弱分区，不堆叠 Card。

状态节点为 Edit Loading `Cmv7W`、Submitting `oDayD`、422 `jhqXL`、409 `CjCYs`、邀请部分成功 `feuT5`、Dirty Close `Lg9u7`、权限被收回 `jef1n`、远端删除 `Zcfij`、局部选项失败 `q5tTy`、筛选外创建成功 `aMzjT`。冲突和权限变化均保留草稿；账号创建成功但邀请失败转为结果状态，不允许再次创建同一账号。

Executed：已保存到 `/Users/guoxk/me/i/pen/gvuter.pen`。Main 画板含 11 个直接 Ref，States 画板含 21 个直接 Ref，复用 09A 上下文 22 个 Ref，本轮新增结构合计 54 个 Ref。静态检查显示可见裁切、旧 Token、硬编码 Fill、缺失 Ref、Placeholder 与顶层画板重叠均为 0；两张顶层画板保持 `120px` 间距。

Inspected：当前应用仍使用 `UserFormDialog`、临时密码和单角色模型；本轮只完成 Candidate 原型和目标契约，不据此宣称 Vue Query、邀请投递、多角色、软删除、邮箱验证、焦点或响应式行为已经实现。

## 09C Form Recipes 决策记录

<!-- AI modified: 同步 Q1311–Q1320 已确认的 09C 分组、页面归属和复用范围。 -->

09C 拆为五组 Candidate：`09C.1 Basic Form`、`09C.2 Content Workbench`、`09C.3 Step Form`、`09C.4 Dynamic Form`、`09C.5 States`。Basic 使用“团队资料设置”的独立页面，正文约 760px 且不使用大 Card；Content Workbench 使用公告/文章发布场景并归属内容管理；四步 Step Form 使用内部集成应用；Dynamic Form 使用站内信、邮件、短信和 Webhook 通知规则。Basic、Step、Dynamic 位于示例中心，Content Workbench 位于内容管理。

SearchForm 已由 09A 完整表达，09C 仅引用其契约，不重复制图。现有 Gallery、FormWorkbench、Announcement、SchemaDrivenForm 和 Stepper 作为字段、验证、草稿及生命周期来源重新组合，不直接改名冒充 09C。主画板展示正常流程，专属与共通异常集中到 `09C.5`。本阶段只绘制 1440px 中文 Light 并定义响应式规则；390px、Dark 和英文验收仍归 09E。

阶段记录：Q1311–Q1320 确认时尚未绘制 Candidate；当前交付状态见本节后文，运行代码仍未修改。

Q1321–Q1334 继续采用推荐方案。Basic 团队资料包含名称、创建后只读的唯一标识、联系邮箱、行业、规模、默认时区、简介和公开资料开关，不在本 Recipe 重复演示图片上传；底部为放弃修改/保存更改，成功后留在当前页并更新基线。Content Workbench 以公告发布为正式示例，并保留扩展为文章的 Recipe 能力。

四步内部集成应用依次为基本信息、权限范围、环境与回调、确认创建；仅最终确认时原子创建，前几步可通过按主体隔离、带版本的 `sessionStorage` 草稿恢复。Dynamic Form 使用左侧渠道与状态、右侧当前渠道配置；规则限制为单一触发事件、目标受众和可选发送限制，整条规则原子保存。

09C 新增目标 `FormPageShell`，统一页面标题、正文宽度、状态和操作区但不绑定业务字段；现有安全草稿逻辑提炼为可选 `DraftAdapter`，首个消费者为 Content Workbench 和 Step Form，Basic Form 不承担草稿持久化成本。阶段记录：Q1321–Q1334 已确认；当前交付状态见本节后文，运行代码仍未修改。

<!-- AI modified: 同步 Q1335–Q1348 的 09C 内容发布、步骤导航与动态渠道交互。 -->

Q1335–Q1348 采用推荐方案。Content Workbench 的公告字段为标题、摘要、分类、优先级、可见范围、富文本正文、可选封面/附件和发布时间；Markdown 作为另一种可配置 Recipe，不在同一草稿中切换。固定操作区为返回、预览、保存草稿、发布，右侧摘要持续展示状态、分类/优先级、可见范围、发布时间、校验状态和最近保存时间；预览在新的应用 Tab 中只读打开并保留编辑上下文。

草稿停止输入 800ms 后自动保存，并在失焦或页面隐藏前补充保存；远程保存成功后清除本地 Dirty，但保留“存在未发布修改”状态，保存中或失败时离开仍需拦截。Step 已完成阶段可返回、未来阶段锁定，创建成功页一次性展示 Client ID 与 Secret，并要求确认已保存。Dynamic 的站内信、邮件、短信和 Webhook 使用固定核心字段；关闭渠道保留非敏感配置且不参与发送，敏感凭证不完整回显。切换渠道不触发提交或确认，错误以顶部摘要、渠道 Badge 和可定位的行内错误联合呈现。阶段记录：Q1335–Q1348 已确认；当前原型已绘制，运行实现仍待完成。

<!-- AI modified: 同步 Q1349–Q1365 的 09C States、恢复策略与响应式决策。 -->

`09C.5 — States` 使用单张画板，按验证、提交、草稿、冲突和结果分区，覆盖字段验证、Submitting、422、409、草稿恢复、自动保存失败、离线、权限撤回和成功结果。客户端字段在交互后的失焦显示错误，提交时完整校验并聚焦首错；自动保存状态常驻标题或摘要区，成功不弹 Toast。草稿恢复使用带时间的非阻塞页内提示，无效或过期草稿明确丢弃；离线只承诺本地会话草稿，联网后校验版本再重试。

409 保留草稿，以页内提示和差异 Drawer 恢复，不允许强制覆盖。权限撤回后禁止提交并隐藏受保护内容，只在当前会话暂存用户已输入内容；Step 草稿过期需重新开始，一次性 Secret 未确认保存前触发离开确认。跨渠道错误可从摘要切换到对应渠道并聚焦字段，上传失败按文件重试或移除。

响应式规则为：Basic 保持单列并在窄屏使用 16px 边距与底部吸附操作；Content 的右侧摘要在窄屏移到正文下方并可折叠；Step 从桌面左侧垂直导航收缩为移动端顶部紧凑进度；Dynamic 从左侧渠道列表收缩为顶部横向渠道 Tabs，保留状态与错误 Badge。阶段记录：Q1349–Q1365 已确认；当前原型已绘制，完整移动端视觉帧与运行实现仍待完成。

<!-- AI modified: 同步 Q1366–Q1383 的最终视觉规则与 09C 首轮绘制证据。 -->

09C 使用五张独立 Candidate，按 Basic、Content、Step、Dynamic、States 排列。四张主 Recipe 使用统一完整 Admin Shell，States 使用局部业务上下文。Basic 以三组轻量分区、760px 正文和吸附操作区组成；Content 使用自适应编辑区、约 320px sticky 摘要、高频单行工具栏、16:9 封面和独立附件列表；Step 使用约 240px Stepper 与约 720px 正文；Dynamic 先展示全宽共享规则，再展示渠道列表和当前配置。States 以留白和扁平样例面为主，成功结果使用可主题化 SVG。

所有样例使用真实感中文内容，技术注释位于页面帧外。页面优先引用 04B Form、Feedback、Overlay、Navigation 资产，缺失变体先补共享组件。响应式本轮只附规则注释，完整移动端、Dark 与英文帧仍归 09E。Q1366–Q1383 已确认。

Executed：已保存五张顶层画板至 `/Users/guoxk/me/i/pen/gvuter.pen`：Basic `mhkAC`（`60844,4736`，`1840×1304`）、Content `wQhjU`（`62804,4736`，`1840×1304`）、Step `yT9M0`（`64764,4736`，`1840×1304`）、Dynamic `JsI75`（`66724,4736`，`1840×1304`）、States `hjQSX`（`68684,4736`，`1840×1760`）。相邻顶层画板均为 `120px`，合计 84 个 Ref，未发现 PNG/JPEG/WebP 插图。

<!-- AI modified: 记录 09C 导航上下文修正及实例覆盖验证结果。 -->

Executed：四张主画板继续引用共享 Shell `bGtge`，未解除组件引用。Basic、Step、Dynamic 通过 `S3XCA/RpnPw/*` 将“示例中心”设为当前菜单，Content 通过 `S3XCA/In6iZ/*` 将“内容管理”设为当前菜单；四张画板均通过 `S3XCA/vKqVn/*` 清除继承的“用户管理”选中态。Breadcrumb 与 Tabs 同步覆盖为各自 Recipe 上下文。

Inspected：Basic 与 Content 已放大复核菜单视觉，四张主画板的保存文件均检查了 Shell Ref、菜单、Breadcrumb 和 Tabs 的 descendant overrides；Step 与 Dynamic 使用与 Basic 相同的“示例中心”覆盖集合。09C 的导航上下文修正已完成，运行代码仍未修改。

<!-- AI modified: 同步 Q1366–Q1383 的 09C 最终画板结构和视觉执行规则。 -->

09C 使用五张独立 Candidate，按 Basic、Content、Step、Dynamic、States 排列。四张主 Recipe 使用统一完整 Admin Shell，States 使用带真实上下文的局部样例。Basic 以基本信息、区域偏好和公开设置分组，760px 正文与轻量吸附操作区不使用大 Card；Content 使用自适应编辑区与约 320px sticky 摘要，富文本工具栏只直接展示高频能力，封面为紧凑 16:9 上传区，附件使用独立任务列表。

Step 使用约 240px 左侧垂直 Stepper 与约 720px 正文，成功 Secret 默认遮挡、可显示或复制，并持续提示仅可查看一次。Dynamic 的共享规则位于顶部全宽区域，下方使用带图标、开关、状态/错误 Badge 的渠道列表和当前渠道配置，激活项使用浅 violet 层。States 依赖标题、留白和扁平样例面，避免每个状态都装入白色 Card；成功结果使用可跟随主题色的小型 SVG，并沿用 Not Found 的视觉语言。

所有样例使用真实感中文内容；用户可见文案与画板外规格注释分离。页面优先引用 04B 的 Form、Feedback、Overlay、Navigation 组件，缺失变体先补组件而非页面内临摹。响应式本轮只附规则注释，移动端视觉帧留到 09E。执行时先统一 Shell 和基础 Ref，再依次绘制五张画板并做菜单、组件、间距与画板顺序的全局检查。Status：Q1366–Q1383 已确认，等待最终绘制确认，运行代码仍未修改。

## 09D Advanced Operations 决策记录

<!-- AI modified: 同步 Q1384–Q1393 确认的 09D 定位、画板结构与实现边界。 -->

09D 采用 Recipe 优先定位：交付可直接用于二次开发的高级操作范例，Demo 用于验证能力，不退化为组件展厅。第一版同时覆盖导入、导出、批量操作、单行编辑、树形表格和虚拟滚动，并拆为 `09D.1 Import`、`09D.2 Export & Batch`、`09D.3 Inline Edit`、`09D.4 Tree Table`、`09D.5 Virtual List & States` 五张独立 Candidate。

所有页面归入可整体关闭的“示例中心”。业务增强继续只有一个公开 `DataTable` 入口，高级能力通过可选插件接入，页面 Recipe 负责业务流程组合；不为每项能力再建立平行表格组件，也不让基础列表默认承担全部运行成本。示例分别采用用户导入导出、商品批量操作、价格行编辑、组织树表和审计事件虚拟列表，以真实数据结构验证对应能力。

服务端负责导入校验、全量导出、批量写入、权限、幂等与冲突判定；前端负责流程编排、可恢复状态和结果呈现。插件只承诺经过验证的组合，未验证组合明确标记为实验性或不支持。本轮先绘制 1440px 中文 Light；移动端、Dark 和英文完整帧继续由 09E 统一验收。每项能力覆盖主流程、关键异常、结果状态和契约说明。Status：Q1384–Q1393 已确认，尚未绘制 09D Candidate，也未修改运行代码。

<!-- AI modified: 同步 Q1394–Q1409 确认的导入、导出与批量任务契约。 -->

Import 使用 640px BusinessDrawer，按上传、校验预览、导入结果三步推进。CSV 是稳定基线，XLSX 通过可选适配器接入；示例提供版本化固定模板，通用 Recipe 预留可选字段映射步骤。前端只做大小、扩展名等快速预检，服务端重新解析并权威校验；校验完成后必须由用户明确确认导入。重复记录默认跳过，只有端点声明支持时才允许更新已有记录。

导入统一使用任务模型，小文件可以快速完成，大文件沿用同一契约异步执行。部分成功保留成功行，结果提供行级失败原因、错误文件和仅重试修正失败行的入口。上传或校验阶段可以取消；提交后允许关闭 Drawer 并在列表页保留任务摘要，只有服务端明确支持时才展示取消任务。

Export 明确区分当前页、已选记录和全部筛选结果；字段以服务端允许清单为边界，默认采用当前可见列并允许增减。CSV 为默认稳定格式，XLSX 是可选增强；当前页或少量已选记录直接下载，全部筛选结果进入异步任务。当前页面持续展示任务状态和下载入口，并为未来任务中心预留接入点。创建任务和下载文件时均重新校验权限、数据范围、字段权限与有效期。

Batch 端点必须显式声明原子或部分成功模式；前端按权威结果呈现，不得把部分成功伪装成全部成功。Q1394–Q1409 已确认；Q1410 的批量确认与结果反馈仍待选择，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1410–Q1429 确认的批量反馈、行编辑、树表与虚拟列表行为。 -->

高影响批量操作使用 AlertDialog 明确数量、范围和后果；结果在页面保留摘要，并可进入 Drawer 查看逐项明细和重试失败目标。Inline Edit 使用商品价格与库存场景，通过明确编辑按钮进入，默认同时只编辑一行。行尾提供保存/取消，Enter 与 Esc 仅在不劫持复杂控件时作为快捷键；价格、库存等写入等待服务端成功，只有低风险可回滚字段按配置启用乐观更新。

行编辑携带版本并在 409 时保留输入、展示差异和载入最新值；脏行阻止直接切换，用户选择保存、放弃或继续当前编辑。保存成功后按权威筛选与排序重新计算位置，记录移动或离开当前结果时给出明确说明。

Tree Table 显式区分 Local 完整树与 Remote 懒加载树。父子选择默认独立，可按业务开启级联并说明半选及未加载后代；展开状态只在当前逻辑 Tab 会话内记忆，恢复时过滤不存在或无权节点。远程子节点在当前分支内显示 Loading、Error 与 Retry；搜索只投影命中项和祖先，不改变真实展开/选择；排序限于同级兄弟，Remote 顺序由服务端权威返回。

Virtual List 使用只读审计事件流和 Cursor/Infinite Query。默认固定或可预测行高，动态高度列为需独立验收的增强；接近末端预取下一 Cursor，追加时保持滚动锚点，失败在底部局部重试。用户离开顶部时新事件不强制改变位置，而显示“有 N 条新事件”入口。审计示例不叠加选择、批量或行编辑，通用插件兼容性由组合矩阵单独说明。Q1410–Q1429 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1430–Q1452 确认的 09D 画板构图、共享 Recipe 与验收范围。 -->

五张 Candidate 按 Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States 排列。前四张使用完整统一 Admin Shell 并选中“示例中心”，States 使用局部上下文。Import 以用户列表为背景打开 640px Drawer：上传步骤展示格式限制、版本模板、拖拽文件、重复策略和可选字段映射入口；预览步骤用统计摘要与紧凑 DataTable 展示行号、关键字段、处理结果及可筛选错误，覆盖 Uploading、Validating、Ready、Importing、Partial Success、Failed 与 Completed。

Export & Batch 上半区展示 480px Export Drawer，复杂字段时可扩至 640px；下半区展示商品批量上架、下架、导出和高影响归档的选择、AlertDialog 及结果 Drawer。结果摘要显示成功、失败、跳过数量和详情入口，失败项可重试。Inline Edit 以商品名称和 SKU 为只读身份，编辑售价、库存、状态和仓库；活动行使用浅色编辑层、明确边界、保存/取消和紧凑字段错误，409 在行下展开差异区。

Tree Table 主场景为 Remote 组织树，列为组织名称、负责人、成员数、状态、更新时间与操作，第一列承载层级和展开；Local 模式以差异说明呈现。节点提供查看、编辑、新增下级和更多菜单，移动节点保持未启用增强。Virtual List 使用结构化审计事件行，展示时间、操作者、动作、对象、结果、来源和详情；详情进入右侧 Drawer，动态行高只作实验性对照。

States 汇总各插件的 Loading、Error、Empty、Conflict、Partial Success 和 Permission 状态，继续复用 04B.5.1 主题化 SVG。新增共享组合层 `ImportDrawerRecipe`、`ExportDrawerRecipe`、`BatchResultDrawer`、`InlineEditRow` 和 `AsyncTaskSummary`，不放入 DataTable 内部。兼容矩阵使用 Supported、Conditional、Experimental、Unsupported 四级；键盘验收覆盖 Drawer 焦点、行编辑 Enter/Esc、树方向键、虚拟列表焦点锚点和错误定位。Q1430–Q1452 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1453–Q1474 确认的 09D 视觉规格、兼容矩阵与任务安全。 -->

09D 顶层画板延续 1840px 宽度、内容自适应高度与 120px 间距，技术说明全部位于页面帧外。Import 主场景停留在校验预览；Export 展示范围与字段选择，Batch 展示商品归档确认及部分成功；Inline Edit 主表只展示一条正常编辑行，错误与冲突下移到 Supporting States；Tree 展开到三级并包含正常、加载和失败分支；Virtual 视口展示约 10–12 条事件，明确已加载数量、Cursor 状态及总量未知。

States 按 Upload/Task、Mutation/Conflict、Tree/Virtual、Permission 分组。阶段型任务使用 Progress，表格首次加载使用结构匹配 Skeleton，树分支使用节点内 Spinner。无权入口隐藏；任务中途失权时停止动作、保留不泄露受保护明细的安全摘要并允许退出。

插件矩阵确认：Remote + Pagination + Selection + Batch 为 Supported，跨页选择需显式启用；Inline Edit + Sort/Filter/Pagination、Tree + Virtualization、Tree + Inline Edit 为 Conditional，分别要求 Dirty Guard、稳定 ID/可见行拍平/可预测高度/锚点测试，以及明确可编辑节点且不与拖拽并用；Inline Edit + Virtualization 和 Dynamic Height + Virtualization 为 Experimental，不进入 V1 稳定承诺。

服务端任务保持权威，前端只按用户在 `sessionStorage` 保存非敏感任务 ID，并通过 Vue Query 查询恢复。轮询使用退避、后台降频和取消，未来可替换 SSE/WebSocket 而不改变页面契约；下载地址短时受控，过期后重新授权生成。静态原型以 200 行分页虚拟化、树展开和长事件流定义性能测试场景，不宣称未经测量的 FPS。组件优先复用 04B、09A 与 BusinessDrawer，缺失变体先补共享资产；09D 完成绘制后仍保持 Candidate。Q1453–Q1474 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1475–Q1495 的 09D 示例数据、任务协议与导航规则。 -->

Import 示例文件为 32 行，其中 25 条可导入、3 条跳过、4 条错误；代表性错误覆盖必填、邮箱格式、重复邮箱、无权角色和公式前缀风险。错误文件只保留允许回传的原始字段，并增加行号、错误编码和说明，不包含无权或敏感的服务端记录。

Export 示例字段为商品名称、SKU、状态、分类、售价、库存、仓库和更新时间，成本等敏感字段按权限隐藏；范围分别展示当前页 20 条、已选 8 条和筛选结果 1,284 条。Batch 主场景使用当前页 8 条选择，结果为 6 条成功、1 条权限跳过、1 条版本冲突失败；跨页选择只在规格中说明。Inline Edit 的金额按当前 Locale/Currency 显示并以最小货币单位整数提交，库存使用非负整数；库存为 0 可保存并显示缺货，上架商品缺少价格或仓库时阻止保存。409 提供载入最新值或保留当前修改继续调整，不提供强制覆盖。

Tree 的未加载分支显示远程后代数量，加载后以稳定 ID 合并；不可见节点不返回，可见但不可编辑节点保留锁定状态。新增下级入口只在具备目标父节点创建权限时出现，Drawer 明确父级路径。Audit 列表显示本地化绝对时间并以相对时间辅助，详情保留原始时区；敏感内容由服务端投影脱敏。事件按服务端时间与稳定事件 ID 倒序，Cursor 使用同一稳定顺序。

通用任务状态为 queued、running、succeeded、partially_succeeded、failed、cancelled、expired。只有服务端提供真实 completed/total 时显示确定进度，否则使用不确定 Progress；提交携带幂等键，结果未知时先查询原任务。五页 Breadcrumb 统一为“示例中心 > 高级操作 > 当前页面”，Tabs 分别为用户导入、导出与批量、行内编辑、组织树表、审计事件。每张画板帧外注释只保留数据契约、状态所有权、插件依赖和响应式规则。Q1475–Q1495 已全部确认，09D 设计树已收口；当时尚未绘制，当前状态见下方交付记录。

### 09D 绘制检查点

<!-- AI modified: 记录 09D Candidate 的完整绘制与静态 QA 结果。 -->

Executed：已在 `gvuter.pen` 创建并保存五张 1840×1556 Candidate，坐标依次为 `70644/72604/74564/76524/78484, 4736`，顶层间距均为 120px。节点为 Import `JndVT`、Export & Batch `cMkWZ`、Inline Edit `B6usiA`、Tree Table `M2AlM`、Virtual List & States `K9TpAb`。

Executed：五张画板均已补全为 Header、1440×1040 主场景和 1440×260 画板外契约三段结构。Import 完成校验预览 Drawer；Export & Batch 完成范围/字段 Drawer、归档确认和部分成功结果；Inline Edit 完成单行编辑、字段错误、409 和 Dirty Guard；Tree Table 完成三级 Remote Lazy 树、局部加载/失败/只读/未加载后代；Virtual List & States 完成 11 条审计事件、局部重试、四组 States、Plugin Matrix 与 Async Task Contract。

Inspected：五张画板的顶层子节点均为 3，递归 Ref 数分别为 19/8/29/19/20，共 95 个；全文档缺失 Ref 为 0，09D 位图节点为 0。已逐张放大复核 Import、Export & Batch、Inline Edit、Tree Table 和 Virtual List & States，未见主画面裁切或顶层重叠；Import 的两个步骤数字仍使用字面白色 `#FFFFFF`，视觉语义正确，实现时应映射为语义化 primary-foreground Token。这些 Candidate 已完成静态原型交付，不代表运行代码已实现或通过交互/性能验收。

## 09E States & Responsive 规划

<!-- AI modified: 记录 Q1496–Q1503 确认的 09E 顶层验收策略，供后续画板拆分继续收敛。 -->

09E 是代表性跨场景验收矩阵，不是响应式组件图鉴，也不为所有既有页面制作 Desktop/Tablet/Mobile/Dark/English 的笛卡尔积。1440px Desktop 继续作为既有基线；本阶段新增 768×1024 Tablet 与 390×844 Mobile 精确视口，1920/2560 只记录伸缩规则并留给真实浏览器验证。

移动端必须允许完成核心查询、查看、新建、编辑与必要审批，通过信息优先级、折叠、分步、简化分页和全宽 Drawer 适配，不照搬桌面密度。状态覆盖 Loading、Skeleton、Empty、Error、Offline、Forbidden、Search Empty、局部 Refreshing 与 Submitting；每种状态至少进入一个窄屏代表场景，高风险状态再补充另一尺寸，不绘制无价值的全组合。

Dark 代表范围为完整 User List、编辑 Drawer 与一个数据密集型高级表格局部场景。英文压力范围为导航、筛选表单、表格列、Drawer 字段、状态文案和操作按钮，不要求复制全部中文画板。最终交付继续标记 `CANDIDATE`；静态原型只形成视觉和交互契约，不能替代 CSS、浏览器、触控、键盘与真实断点验收。Status：Q1496–Q1503 已确认；画板架构、代表页面和组合矩阵仍在访谈，尚未绘制。

<!-- AI modified: 记录 Q1504–Q1512 确认的代表场景、表格适配和原型外框规则。 -->

768×1024 以 User List 为代表，包含完整页面、展开 SearchForm 与近全宽 Edit Drawer。DataTable 保留用户、状态、角色、最后登录和操作等优先列；次要列进入详情，只有极端内容才允许表格内部横向滚动。390×844 覆盖 User List、全屏 User Drawer、Step Form 和代表状态；用户记录改为弱分隔的紧凑列表行，只保留身份摘要、状态和主操作，不使用逐项 Card 或桌面表格横向滚动。

高级 Dark 选择 Inline Edit，覆盖活动行、输入控件、错误、保存/取消和 409 冲突。英文使用 768px 专门组合场景，对 Header、导航、SearchForm、DataTable、Edit Drawer、状态文案和按钮施加长文案压力。Offline、Forbidden、Submitting 与阻断型 Error 同时进入 Tablet 和 Mobile；1024×768 不另画，按已确认 Rail 契约在实现阶段验证。全部画板只呈现应用视口并标注尺寸、安全区与滚动边界，不添加设备模型。Status：Q1504–Q1512 已确认；下一轮继续收敛画板架构与页面重排规则。

<!-- AI modified: 记录 Q1513–Q1523 确认的五板结构、移动筛选和 Drawer/Stepper 规则。 -->

09E 拆为五张 Candidate：`09E.1 Responsive List`、`09E.2 Mobile Flows`、`09E.3 Responsive States`、`09E.4 Dark`、`09E.5 English Stress`。Responsive List 将完整 768px 与 390px User List 同板并列，并在下方展示导航 Drawer、筛选和选择模式。

390px 页面仅常驻关键词和筛选按钮，高级条件进入 Bottom Drawer；字段修改为草稿，点击“应用筛选”后查询并展示条件摘要。Toolbar 通过“选择”进入批量模式，随后显示 Checkbox、已选数量和吸底操作栏。身份区域进入详情，编辑为直接动作，其余进入 More；分页简化为上一页、当前页和下一页，不改变服务端分页契约。

768px Edit Drawer 宽 720px，左侧保留 48px 页面上下文；390px User Drawer 为 edge-to-edge 全屏。两者固定 Header/Footer、Body 独立滚动。Mobile Step Form 显示“第 N/4 步”、当前步骤名与进度条，点击后展开只允许访问已完成步骤的清单。Mobile 使用单一页面纵向滚动；Tablet DataTable 可以受控内部滚动，Drawer 打开后只滚动 Drawer Body。Status：Q1513–Q1523 已确认；状态、Dark 和英文细节继续访谈。

<!-- AI modified: 记录 Q1524–Q1534 确认的状态矩阵、Dark 画板内容和英文压力来源。 -->

Responsive States 按 Query、Permission、Mutation 三组组织。首次 Loading 使用结构匹配 Skeleton，保留 Shell、标题和筛选；Refreshing 保留旧数据并在数据区轻量提示。First Use Empty 使用新增动作，Search Empty 使用清除筛选，二者均直接融入工作面并复用透明背景主题 SVG。

高风险成对场景为：Tablet Offline 保留缓存并暂停写操作，Mobile Offline 无缓存且提供重试；Tablet Forbidden 为页面级无权，Mobile Forbidden 为编辑中权限撤回并移除受保护内容；Tablet 阻断 Error 为列表首次请求失败，Mobile 阻断 Error 为 Drawer 依赖数据失败；Submitting 在两端保留字段和值、锁定可变控件与关闭/重复提交，失败后恢复草稿。

Dark 画板包含完整 1440px User List、打开 Edit Drawer 的完整场景，以及 Inline Edit 活动行与 409 局部状态。层级依靠中性暗色表面、亮度差、弱描边和克制阴影，Violet 仅承担强调、焦点与选择。English Stress 使用真实业务英文，并选取较中文长约 30%–60% 的标签、角色、状态和动作。Status：Q1524–Q1534 已确认；Q1535–Q1536 待答，尚未绘制。

<!-- AI modified: 记录 Q1535–Q1536 确认的英文排版与 en-US 格式验收规则。 -->

English Stress 中表单 Label 与辅助说明允许自然换行，操作按钮主文案保持单行；姓名、邮箱和表格单元格按列策略省略，并以 Tooltip 提供完整值。关键状态、验证和错误不得截断，也不得缩小字号规避溢出。样例同时采用 en-US 日期、时间、数字和复数文案，并包含较长英文姓名与角色名。Status：Q1535–Q1536 已确认；具体场景内容继续访谈。

<!-- AI modified: 记录 Q1537–Q1547 确认的前两张 09E 画板内容与移动流程恢复规则。 -->

Responsive List 复用 09A 的同一组用户、角色、状态和数量。768px 主页面默认关闭导航 Drawer，Header 显示菜单入口；Supporting Scene 展示 320px 导航 Drawer 打开态。390×844 首屏展示约五条完整紧凑记录、筛选摘要和简化分页。批量模式底栏显示已选数量、启用、停用和 More；导出与删除进入 More，删除继续使用确认流程。

Mobile Flows 使用 Edit User 作为全屏 Drawer 主场景。字段全部单列，多角色和权限摘要自然换行，分区依靠标题、留白和弱分隔。虚拟键盘出现后 Footer 保持在可视安全区上方，Body 可将当前字段及错误滚入无遮挡区域。关闭 Drawer 恢复筛选、页码、列表滚动位置和合法选择；浏览器返回优先关闭 Drawer。

Mobile Step Form 停留在第 2 步“权限范围”。点击顶部进度后在当前页面内展开四步清单，已完成步骤可返回，当前步骤明确，未来步骤禁用。Filter Bottom Drawer 自适应内容、最大约 80dvh，Header/Footer 固定、Body 滚动，日期选择在当前容器内展开而不嵌套 Drawer。Status：Q1537–Q1547 已确认；其余三张画板与最终 QA 继续访谈。

<!-- AI modified: 记录 Q1548–Q1562 确认的后三张 09E 画板、画布规格和静态交付范围。 -->

Responsive States 不制作 Card 墙：每组保留一个完整业务上下文，其余为透明工作面上的扁平状态片段。Query 的 Tablet 场景包含结构 Skeleton、Refreshing、Search Empty、缓存 Offline 和首次加载 Error，Mobile 包含 First Use Empty 与无缓存 Offline。Permission 包含 Tablet 页面无权和 Mobile 编辑中失权；Mutation 包含 Tablet/Mobile Submitting 和 Mobile Drawer 依赖加载失败。移动状态的主恢复动作保持高可见或全宽，次动作降级，点击高度至少 44px。

Dark 使用 Comfortable 完整 User List、正常编辑状态的 Edit Drawer，以及 Compact Inline Edit 活动行与 409；不再复制 Light 对照。English Stress 使用 Light 主题，在 768px 画板中组合完整 User List、展开 SearchForm、Edit Drawer 和状态/按钮压力片段。

Shell、控件、状态 SVG 和业务组件继续使用 Ref；只有结构真正改变时新增 Tablet/Mobile Variant，不解除实例后临摹，也不让 Desktop Master 同时承担冲突布局。五张顶层画板延续 1840px 宽、自适应高度和 120px 间距，排列在 09D 后。产品文案留在应用帧内，断点、状态归属、滚动和恢复规则放在画板外 Contract 区。

完成后检查画板顺序/间距、缺失 Ref、位图、旧 Token、硬编码颜色、裁切、重叠、英文溢出、状态插图和关键场景截图。五张整板预览导出到 `docs/assets/prototype/states-responsive-09E/` 并回链本文件。本阶段只更新 `gvuter.pen`、预览和产品文档，不修改 Vue 运行代码。Status：Q1548–Q1562 已确认，五张 Candidate 与整板预览已交付；运行验收待实现。

<!-- AI modified: 记录 Q1563–Q1572 确认的 09E 连续响应区间与后续运行证据矩阵。 -->

连续响应规则为：`<640px` 使用 Mobile 紧凑列表和全屏业务 Drawer；`640–1023px` 使用优先级列 DataTable、非常驻导航和近全宽 Drawer；`1024–1279px` 使用 72px Rail 与桌面表格；`≥1280px` 使用 240px Sidebar 与完整布局。Shell 导航依据 viewport，SearchForm、DataTable 等内容组件优先依据容器宽度。正式支持下限为 360px，09E 仍使用 390px 作为静态采样点；360px 和 200% 缩放留给运行验收，允许重排与增高，但不允许整页横向溢出、信息覆盖或核心动作消失。

触控端不得依赖 Hover Tooltip；完整值需在详情 Drawer、可展开文本或可访问名称中提供。Contract 区记录 Drawer 焦点循环及返回、提交失败聚焦首错、恢复动作键盘可达、busy/status/alert 语义和错误字段关联。选择、锁定、错误、禁用及状态均使用颜色之外的文字、图标或形状；过渡克制且遵守 reduced-motion，任务理解不依赖动画。

后续运行矩阵必须覆盖真实区间断点、360px、200% 缩放、虚拟键盘、触控、键盘焦点、辅助技术通知、Light/Dark 和中英文；静态 Candidate 完成时这些仍标记为未执行。Status：Q1563–Q1572 已确认，09E 设计树已收口。

### 09E 确定性绘制检查点

<!-- AI modified: 更新五张 09E Candidate 的样式修正、结构检查与导出证据。 -->

| 画板 | 节点 | 位置与尺寸 | 递归 Ref |
| --- | --- | --- | ---: |
| [`09E.1 — Responsive List · CANDIDATE`](./assets/prototype/states-responsive-09E/09E.1-responsive-list.png) | `E900dw` | `80444,4736` / `1840×2620` | 120 |
| [`09E.2 — Mobile Flows · CANDIDATE`](./assets/prototype/states-responsive-09E/09E.2-mobile-flows.png) | `E900mb` | `82404,4736` / `1840×1400` | 31 |
| [`09E.3 — Responsive States · CANDIDATE`](./assets/prototype/states-responsive-09E/09E.3-responsive-states.png) | `E900t1` | `84364,4736` / `1840×2320` | 49 |
| [`09E.4 — Dark · CANDIDATE`](./assets/prototype/states-responsive-09E/09E.4-dark.png) | `E900wo` | `86324,4736` / `1840×3160` | 13 |
| [`09E.5 — English Stress · CANDIDATE`](./assets/prototype/states-responsive-09E/09E.5-english-stress.png) | `E90257` | `88284,4736` / `1840×1900` | 38 |

Executed：五张画板已写入 `/Users/guoxk/me/i/pen/gvuter.pen`，相邻 x 坐标均相差 1960px，即保持 1840px 画板宽度与 120px 间距。样式修正将 Tablet、缓存状态和英文压力场景的表格改为稳定的数字列宽，补齐导航/筛选 Overlay 的绝对布局，并重建 Dark Drawer 与 Inline Edit，避免文字纵向坍缩和遮罩层失效。09E 合计 251 个递归 Ref；09E 范围内缺失 Ref、重复 ID、PNG/JPEG/WebP/Bitmap 节点、硬编码 Fill/Stroke 和比例列宽均为 0。

Inspected：Pencil 已重新加载实际文件并依次选中五张顶层画板检查。整体布局均落在画板内，未见明显裁切或同层重叠；Tablet 表格保持可读的优先级列，导航 Drawer 与 Bottom Drawer 可见，390px 场景未设计整页横向滚动，Dark 保持语义表面和遮罩层级，英文长文案未出现逐字纵排，状态插图继续使用透明主题 SVG。五张 PNG 已按画板原始尺寸重新导出并验证为有效文件。该结论仅覆盖静态视觉，不代表断点、触控、键盘焦点、动态视口、200% 缩放或 Vue Query 运行行为通过。

## 10 Theme 规划

<!-- AI modified: 记录 Q1573–Q1581 确认的 Theme 顶层交付、入口和运行连续性。 -->

10 — Theme 同时交付 Theme Token 契约、Header 快速切换 Popover、完整 Appearance Drawer 和代表页面主题矩阵。Header Popover 只负责 Light、Dark、System 三种模式；Appearance Drawer 管理项目允许的品牌预设、三种正式 Layout 和少量经过验证的安全外观选项，不能开放任意颜色或底层设计参数。

`System` 作为独立偏好保存并实时响应操作系统变化。V1 偏好按用户身份保存在当前设备，数据带版本、迁移和安全回退，并预留未来账号同步契约。主题切换原地完成，采用 `150–200ms` 克制颜色过渡，Reduced Motion 下立即生效；不得重载应用或丢失路由、Tabs、查询缓存、表单草稿和滚动位置。普通页面固定 Comfortable，DataTable 等数据密集组件局部管理 Compact，不提供全局 Compact。Status：Q1573–Q1581 已确认，Drawer 信息架构、品牌/图表 Token 和异常恢复仍在访谈。

<!-- AI modified: 记录 Q1582–Q1592 确认的 Appearance Drawer 信息架构和旧能力收敛。 -->

Appearance Drawer 使用主题模式、品牌色、Layout、界面显示、恢复设置的单页纵向结构，顶部提供实时 Shell 预览；Desktop 宽 420px，Tablet 近全宽，Mobile 全屏。设置即时预览并立即保存。内置七种品牌 Palette，项目通过强类型配置决定可见白名单，也可注册完成 Light/Dark 映射并通过对比度校验的新 Palette；终端用户不输入任意颜色。

正式面板移除 Default/Ocean/Compact/Midnight 这类跨颜色、布局、密度和开关的混合 Preset，以及 `default/sm/md/lg` 全局组件尺寸；混合 Preset 如保留只能进入示例中心。Layout 仅保留 Sidebar、Top Navigation、Mixed，语言保持 Header 独立入口。底部“恢复默认”经二次确认后重置全部外观偏好，但不得影响身份和业务任务。Status：Q1582–Q1592 已确认，主题状态优先级、跨标签页同步、Token 细节与画板拆分仍在访谈。

<!-- AI modified: 记录 Q1593–Q1604 确认的 Theme 来源优先级、账号隔离、首屏与保存反馈。 -->

启动优先使用当前用户已保存偏好，不存在时回退项目默认；System 只在被明确保存时实时解析操作系统。游客在登录前的偏好可作为首次登录继承值，已有个人设置优先；退出后恢复游客偏好或项目默认。存储使用“项目 + 用户身份 + Schema Version”命名空间，同一用户的标签页通过 Storage/BroadcastChannel 实时同步。迁移失败安全回退，并在 Appearance Drawer 内显示一次非阻断说明。

Vue 挂载前同步写入 mode、brand 与 `color-scheme`；PWA 启用时同步浏览器 `theme-color`，关闭时不输出无效配置。快速 Popover 以图标、名称、说明和 Check 展示三种模式，并与 Drawer 共用 ThemeModeSelector。Shell 缩略图只做实时反馈。自动保存成功不弹 Toast，仅在标题区短暂显示“已保存”；保存失败才显示可恢复警告。Status：Q1593–Q1604 已确认，Token、Dark 表面、图表和插图映射仍在访谈。

<!-- AI modified: 记录 Q1605–Q1616 确认的 Theme 状态模型、语义表面与颜色门禁。 -->

Theme 状态分离 `selectedMode`、`resolvedMode` 和 `brandId`；根节点保留 shadcn-vue 兼容 `.dark`，并设置 `data-theme`、`data-brand` 与 `color-scheme`。语义表面为 Background、Surface、Raised、Overlay 四级，Sidebar 独立映射。Dark 使用偏暖 Stone/Charcoal，Violet 只承担交互强调；层级主要依靠亮度差和弱描边，阴影只用于 Overlay 与拖拽层。

Success、Warning、Destructive、Info 保持固定功能语义，只针对 Light/Dark 校准。分类图表不复用功能色，Chart-1 使用品牌色，其余系列保持协调和稳定辨识。Focus、Selected、Active 分别使用 Ring、Soft Surface、强调线/前景色。状态插图继续使用 Primary、Primary Soft、Surface、Muted、Stroke 五角色。Palette 必须通过正文 `4.5:1`、大文字及图形/控件 `3:1`、焦点和状态专项检查；开发或 CI 不通过即失败，生产拒绝注册并回退 Violet。Status：Q1605–Q1616 已确认，界面选项、布局切换保护和画板拆分仍在访谈。

<!-- AI modified: 记录 Q1617–Q1628 确认的外观选项、布局切换和任务保护。 -->

内容宽度仅有 Fluid/Centered，默认 Fluid；Centered 最大宽度暂按约 1600px 绘制并在 Theme 原型中复核。DataTable、复杂图表等页面可声明 Fluid 覆盖，并向用户说明当前页面覆盖。界面分区只显示项目启用的 Breadcrumb、Tabs、Footer 与 Page Transition：Breadcrumb 关闭不改变 Header 高度；Tabs 关闭清理非当前页面缓存但保留当前路由、Query 与表单；Footer 默认关闭；过渡仅 Off/Fade，Reduced Motion 强制 Off。

Sidebar、Top Navigation、Mixed 切换只重排 Shell，保留当前路由、Query、Tabs、表单草稿和滚动锚点，Appearance Drawer 始终保持打开。业务 Drawer/Dialog 打开时 Header inert，不能叠加 Appearance Drawer。恢复默认以当前项目配置为准，不写死 Violet/Light/Sidebar。Status：Q1617–Q1628 已确认，10 的画板架构、状态矩阵与验收样本继续访谈。

<!-- AI modified: 记录 Q1629–Q1640 确认的 10 Theme 五板架构、代表页面和状态范围。 -->

10 — Theme 拆为五张 Candidate：`10A Theme Contract` 展示状态模型、Token 分层、四级表面、功能色、图表色、插图映射和对比度门禁；`10B Theme Controls` 展示 Header Trigger、三模式 Popover、交互状态、System 变化与 Reduced Motion；`10C Appearance Drawer` 使用完整 User Management 和 420px Drawer，并补充滚动后的下半段；`10D Theme Matrix` 展示紧凑七品牌矩阵及代表性页面；`10E States & Responsive` 收纳专属状态和三端适配。

七品牌不制作 Light/Dark 全组合完整页面；页面级代表组合为 Violet Light、Violet Dark、Blue Light、Orange Dark。Dashboard 图表对照覆盖 Violet Light/Dark 和 Blue Light，验证独立分类色板。Dark 局部样本包括 DataTable、表单、Popover、Drawer、Alert、Empty/Forbidden SVG。10E 延续 1440、768×1024、390×844，并覆盖 Saving、Saved、Storage Failure、Migration Reset、System OS Change 和 Invalid Project Palette。五张顶层画板位于 09E 之后，继续保持 1840px 宽和 120px 间距。Status：Q1629–Q1640 已确认，逐板组件形态、状态反馈和验收细节继续访谈。

<!-- AI modified: 记录 Q1641–Q1652 确认的 10A–10C 信息组织与控件外观。 -->

10A 不使用 Admin Shell，按状态模型、Token 层级、表面、颜色、对比度五段纵向组织。只展开 Violet/Stone 代表 Primitive，完整展示 Semantic 与少量必要 Component Token；每个色块标注 Token 名、语义职责、Light/Dark 示例值和使用边界，不做纯 HEX 色板。

10B 的 Header Trigger 在选中 System 时使用 Monitor，而不是按 resolvedMode 偷换成 Sun/Moon；Tooltip 和 System 行分别说明当前解析模式。Popover 约 280px，三行选项具备图标、名称、说明和 Check，选择即关闭，底部“更多外观设置”进入 10C。10C 固定 Header 展示标题、说明、保存状态和关闭；其下放置非固定 16:9 Shell 实时预览。品牌选项为两列“色点 + 名称 + Check”，Layout 为三张结构缩略选择卡，窄屏纵排。Status：Q1641–Q1652 已确认；用户误写的 Q1745 按上下文归一为 Q1645。

<!-- AI modified: 记录 Q1653–Q1664 确认的 Drawer 控件、滚动结构、矩阵样本和失败状态。 -->

10C 的布尔显示项 Breadcrumb、Tabs、Footer 使用 Switch，页面过渡 Off/Fade 使用分段选择；Fluid/Centered 使用带简化页面示意的双选卡。Layout 卡选中时使用品牌色描边、轻 Ring 与 Check，不铺满品牌色；品牌项使用色点、名称、弱品牌背景与 Check。Drawer 只固定 Header，Body 独立滚动并处理移动端底部安全区，不设置固定 Footer；恢复默认置于滚动内容末尾。

10D 的七品牌紧凑矩阵每项至少验证主按钮、输入 Focus、Badge、选中表面、链接与分类图表色板；图表样本覆盖折线、柱状和环形。Success、Warning、Destructive、Info 通过 Alert、Badge、文字和图标组合验证，禁止只靠颜色区分。Tablet Drawer 近全屏但保留约 48px 背景上下文。Storage Failure 保留当前内存主题，在 Drawer 内警告并允许重试；Migration Reset 安全回到项目默认，只显示一次非阻断说明。Status：Q1653–Q1664 已确认，下一轮收敛 10E 状态、响应式、无障碍与验收细节。

<!-- AI modified: 记录 Q1665–Q1678 确认的 10E 状态归属、三端行为、可访问性和验收规则。 -->

10E 将 Invalid Project Palette 放在开发者诊断契约中，终端用户只看到回退后的 Violet。System OS Change 保留 selectedMode=System，只更新 resolvedMode 并原地过渡；跨标签页默认静默同步，Drawer 打开时短暂显示“已同步”。Storage Failure 允许关闭 Drawer、保留会话内主题，并在 Header 主题入口留下弱提示点；重新打开后可重试。

390×844 Mobile 使用单页分区滚动，不用 Accordion 或向导；品牌项保持两列，并提供完整可访问名称。420px Drawer 与 390px Mobile 各增加英文长文本压力样本。模式、品牌和 Layout 都使用 Radio Group 语义，整行/整卡可点击，支持方向键与可见 Focus；打开后进入标题或首个控件，关闭后焦点返回 Header 触发器。Saving/Saved 使用克制状态区，Failed 使用更高优先级播报；Escape 关闭当前顶层 Overlay，不回滚即时设置。

10D 各代表页面固定相同内容、数据和滚动位置。10E 上方展示三端真实界面，下方集中状态契约 Strip，避免为每个状态复制 Shell。最终验收同时覆盖结构引用、无位图、Token 使用、Light/Dark 对比度、三端溢出、英文压力和状态完整性。Status：Q1665–Q1678 已确认，进入绘制前最后收口。

<!-- AI modified: 记录 Q1679–Q1692 的最终 Theme 选择以及五张 Candidate 的实际交付证据。 -->

Q1679–Q1692 全部采用推荐方案。品牌顺序固定为 Violet、Blue、Cyan、Green、Orange、Rose、Slate，界面名称随 Locale 翻译而品牌 ID 保持稳定；Slate 继续作为低彩度选项。Dark 中品牌色只用于交互、Focus、Chart-1 和小面积选中反馈，主体表面维持暖 Stone/Charcoal。代表页面使用 `2×2` 同内容矩阵：Violet Light、Violet Dark、Blue Light、Orange Dark。

已在 `/Users/guoxk/me/i/pen/gvuter.pen` 完成五张 Candidate：`10A — Theme Contract`（`tCL2h`）、`10B — Theme Controls`（`RGSPA`）、`10C — Appearance Drawer`（`RMFEr`）、`10D — Theme Matrix`（`rfTTK`）、`10E — States & Responsive`（`hGeJn`）。画板统一位于 `y=13000` 新行，宽 1840px、间距 120px。复用项目现有 Shell、表格和状态资产，并新增 ThemeModeSelector、BrandOption、LayoutOption、ThemeStatus 四类共享组件；`basic.pen` 仅作参考。图标、图表和状态图形均为语义 Token 驱动的矢量节点，不使用 PNG。

Executed：五张画板的引用、硬编码颜色、位图、Placeholder 和布局问题检查均为零；最终 PNG 已重新导出到 `docs/assets/prototype/theme-10/10A-theme-contract.png`、`10B-theme-controls.png`、`10C-appearance-drawer.png`、`10D-theme-matrix.png`、`10E-states-responsive.png`。Inspected：重点复核了 Drawer 上下段、七品牌矩阵、Light/Dark 对照、真实折线图和三端状态。Status：原型已完成，Theme 运行代码尚未实现。

## 完成定义

视觉方向已经确认；Design System 资产完成晋级；7 个核心页面完成高保真；关键流程故事板齐全；响应式、Dark、中英文和状态矩阵全部通过验收。
