# Gvueter Admin 产品与技术方案

<!-- AI modified: 将零散需求及原型一致性基线整理为已确认的 V1 产品与技术方案。 -->

> 文档状态：V1 确认稿<br>
> 产品形态：可直接二次开发的生产级 Vue Admin Template

## 01 项目定位与技术方案

Gvueter Admin 不是某个具体业务系统，而是一套克隆即可运行、可直接用于新项目的后台管理基础模板。它兼顾开箱即用与长期二次开发，优先级为：**快速启动 > 工程实践 > 示例丰富度**。

- 前端优先，同时提供通用 API/OpenAPI 契约；`gnester-lite` 仅作为接入示例。
- V1 提供完整工程，不提供脚手架生成器；生成式脚手架留作后续能力。
- 注册页面可选，默认关闭，由项目配置决定是否启用。
- 认证、权限、路由和布局属于核心能力；SSO、多租户、PWA、监控和审计属于增强能力。
- 支持最近两个版本的 Chrome、Edge、Firefox 和 Safari。
- 区分固定基线与可替换模块，避免业务项目被单一后端或 UI 实现绑定。

固定技术基线：Vue 3、TypeScript、Vite、Vue Router、Pinia、Axios、TanStack Vue Query、Tailwind CSS、shadcn-vue/Reka UI、CASL、VeeValidate、Zod、Vue I18n、Vitest 和 Playwright。

可替换模块包括后端服务、认证提供方、图表实现、主题品牌、Mock 数据源和增强能力适配器。

## 02 信息架构

核心功能按后台业务职责组织；组件类型只用于示例中心。示例中心集中管理，并支持通过配置整体关闭。

```text
工作概览（Dashboard，一级页面）

系统管理
├── 用户管理
├── 角色管理（包含菜单、按钮权限和数据范围配置）
└── 菜单管理

运营
├── 表单工作台
├── 内容管理
└── 运维与审计（增强能力）
    ├── 监控
    └── 审计日志

示例中心（可关闭）
├── Form
├── Table
├── Chart
├── Dialog / Drawer / CRUD
├── Upload / Draggable
└── Error Log 等示例
```

- 不设置独立 Permission Management 页面，权限配置收敛到角色编辑流程。
- 产品导航正式支持三级；四级及以上只作为动态多级菜单能力 Demo。
- 页面搜索以当前用户权限和导航为准，也可收录有权限但未显示在菜单中的页面。
- 403、404、500、登录回调和密码流程是独立流程节点，不进入常驻导航。
- 登录后默认进入 Dashboard，并为角色首页和上次访问页面预留扩展点。

## 03 Layout 原型

V1 提供三种正式布局：侧边栏布局、顶部导航布局、混合布局。其他组合只作为内部实验或后续扩展，不作为稳定能力承诺。

- Header、Breadcrumb、Tabs 和内容区保持清晰分层，不进行卡片化包装。
- Breadcrumb 表达层级，Tabs 支持多任务，两者同时保留；低高度或移动端可压缩 Breadcrumb。
- Tabs 默认开启，可以通过配置关闭，并与 KeepAlive 页面缓存协同工作。
- Header 提供全局全屏入口，表格、图表等数据密集组件可按需提供局部全屏。
- Header 头像菜单是统一的账号入口；Sidebar、折叠 Rail 和移动导航 Drawer 不重复展示用户身份或账号菜单。
- 仅展示当前布局确实能够生效的外观配置项。
- Sidebar 展开/收缩宽度为 `240/72px`，主内容同步伸缩；收缩入口位于品牌栏右侧，收缩后 Logo 居中并提供独立展开入口。
- `≥1280px` 默认展开，`1024–1279px` 默认收缩，`<1024px` 使用宽度为 `min(320px, 100vw - 48px)` 的导航 Drawer；桌面用户偏好可覆盖默认值。导航 Drawer 与移动端全宽业务编辑 Drawer 分别定义尺寸。
- 混合布局使用 `72px` 主模块 Rail；当前模块为工作概览等叶子页面时不显示空二级栏，目录模块可显示 `240px` 上下文菜单。收缩后只保留一个 Rail，子菜单通过 Flyout 访问。
- 各 Layout 共享授权菜单树、当前路由和 `activeMenu`；栏宽偏好使用 `localStorage`，目录展开状态使用 `sessionStorage`，均按“用户身份 + Layout 类型”隔离。同一 Layout 内的 Sidebar、Rail 和移动 Drawer 共享目录状态；退出清理目录会话状态，保留该用户的栏宽偏好。

原型使用 Pencil 绘制，并重点验证 1440、1920、2560 宽屏及移动端压缩效果。

## 04 Design System

整体采用现代 SaaS Admin Dashboard 风格，品牌色沿用 Tailwind `violet` 色系。

<!-- AI modified: 记录 basic.pen 的参考边界，避免形成第二套设计源。 -->

`/Users/guoxk/me/i/pen/basic.pen` 作为补充参考库使用：可吸收色阶、语义 Token 分类、组件状态组织、主题/响应式行为和交付治理思路，但不直接复制其变量、组件 ID 或 Master。`gvuter.pen` 的 `gv-*` Token、04B Masters、既定尺寸和业务场景验收仍是本项目唯一基线。

- 正式视觉方向采用 `Quiet Layers`：浅 Lavender 作为环境色，内容工作面保持干净；Violet 用于状态线和主操作，阴影仅用于关键工作面。
- 简洁、精致、信息密度适中，优先通过留白、排版和弱分隔建立层级。
- 避免厚重 Sidebar、大面积灰色背景、过多边框和“所有内容都装进 Card”的传统后台风格。
- 圆角偏小且不使用直角，整体利落但不生硬。
- 普通页面使用舒适密度，表格等数据密集场景可单独切换 Compact。
- 颜色全部通过语义化 Token 表达，保证 Light、Dark 和品牌切换的一致性。
- 正式设计资产统一使用无版本号的 `gv-*` Token 命名空间，按 Primitive、Semantic、Component 三层组织；探索稿中的版本化 Token 不进入实现。
- Shell 与桌面控件采用统一尺寸基线：Header 56px、页面边距 24px、常规控件 36px；页面标题为 28px/700、区块标题为 16px/600。
- 提供受控品牌色方案，不允许终端用户任意输入可能破坏对比度的颜色。
- 控件、状态、焦点环、错误提示和键盘操作遵循统一交互与可访问性规范。
- 字体使用本地 Inter Latin 字符集，中文回退系统字体，不依赖 Google Fonts。
- Core Components 以 shadcn-vue/Reka UI 为实现基础，Gvueter 负责统一 Token、变体和验收标准，不额外包装同义组件 API。
- 组件资产采用 Master + Instance，并通过 `Candidate → Validated → Stable` 晋级；至少进入一个真实核心页面后才能标记 Validated。
- Core 控件尺寸使用 32/36/40px，移动端关键触控区域至少为 44px。

## 05 Login

认证流程包括登录、退出、忘记密码、重置密码和可选注册；同时预留 SSO 接入边界。

- 登录页保持聚焦，不复用后台 Shell。
- 注册入口默认隐藏；开启后提供独立页面。
- 登录失败应区分账号、密码、验证码、网络和服务端异常，并给出可恢复动作。
- 登录成功后加载用户、授权快照和动态导航，再进入目标页面。
- 支持 `sessionStorage` 与 `localStorage` 两种 Access Token 持久化策略，由项目配置决定；Refresh Token 不暴露给 JavaScript，推荐由后端通过 Secure、HttpOnly Cookie 管理和轮换。
- 退出、会话失效、账号或租户变化时，清理权限、动态路由、Tabs、受保护 Query Cache 和实时连接。

## 06 Dashboard

Dashboard 是默认首页，也是模板的数据展示与组合能力示范。

- 包含指标概览、趋势图、角色分布、部门排行、动态、任务、通知和快捷入口。
- 信息按“概览—趋势—待办—动态”建立阅读顺序，不堆砌等权 Card。
- 每个数据区域独立处理首次加载、刷新、空状态、错误和重试。
- 实时数据采用 SSE；通过 `eventsource-client` 携带 Bearer Token，并统一处理断线重连、事件恢复、会话失效和页面离开后的连接释放。
- 图表必须响应容器尺寸、支持 Light/Dark，并提供无数据与不可用状态。

## 07 Router / Menu

<!-- AI modified: 固化 Q1069 确认的可收缩 Sidebar 与多级导航契约，统一正式布局的行为边界。 -->

- 静态路由承载登录、错误页和基础 Shell；业务导航由后端菜单动态生成。
- 后端只能返回约定的 `componentKey`，前端通过白名单映射懒加载组件，禁止直接执行后端传入的组件路径。
- 菜单、路由、Breadcrumb、Tabs、KeepAlive 和页面搜索共享同一份路由元数据。
- 支持隐藏路由、外链、iframe、三级正式菜单及四级以上能力 Demo。
- 菜单变更后重新编译动态路由；退出或身份切换时完整卸载旧路由。
- Tabs 只记录可恢复的页面身份；KeepAlive 使用稳定 `cacheKey`，不能把服务端数据持久化为页面缓存。
- 未授权路由进入 403，未知路由进入 404；两者不作为常驻菜单项。
- 工作概览为一级页面；系统管理、运营和示例中心为目录。目录整行点击只切换展开，允许多个目录同时展开；当前页面祖先自动展开，直接访问目录 URL 时才按路由契约重定向。顶层菜单展示位置不改变既有 `routeKey` 或 URL。
- 当前叶子使用浅 Violet 背景和左侧强调线，祖先只强调文字、图标和 Chevron；隐藏页面通过 `activeMenu` 定位可见菜单。权限过滤后没有可访问后代的目录整体隐藏。
- 收缩态页面图标显示 Tooltip 并直接导航；目录通过 Hover、Focus 或点击打开 `280px` 单个 Flyout，以缩进展示完整子树，不使用多列级联。跳转、外部点击或 Esc 关闭，鼠标离开约 `200ms` 后关闭，指针经过间隙或焦点仍在面板内时保留。
- 品牌栏固定，导航独立滚动；当前页面变化后将激活项滚入可视区域。长名称单行省略并提供 Tooltip；收缩态 Badge 使用数字或圆点，分组标题隐藏文字但保留分隔和可访问名称。
- 移动导航纵向展开目录并允许多个目录同时展开，页面跳转后关闭 Drawer；再次打开保留本次会话状态。一级/子级桌面行高为 `40/38px`，移动端可操作区域至少 `44px`。
- 目录声明 `aria-expanded/controls`，方向键移动焦点，左右键展开/收起，Enter/Space 执行，Esc 关闭 Flyout；焦点样式清晰可见。宽度与文字动效约 `180ms`，子树和 Chevron 约 `150ms`，Reduced Motion 下取消位移动效。
- 所有页面 Shell 统一使用新版 Sidebar 与 MenuItem / SubMenu，旧 NavItem 仅作为 Legacy 母版保留。按用户补充确认，`03A/03B/03C` 探索稿保留 ARCHIVE 标记和页面主体视觉，侧栏同步共享 `240px` Expanded Sidebar（`BGWfu`），包含折叠入口与可展开目录；`03B` 使用 Dark 主题。

## 08 Permission

<!-- AI modified: 固化 Q1070–Q1146 确认的角色授权方案，并明确权限联动与受保护授权的保存边界。 -->

本阶段采用纯 RBAC：一个用户可拥有多个角色，启用角色的 Allow 权限取并集；V1 不引入 Deny、用户级权限覆盖或角色继承。权限编辑集中在角色管理，角色分配集中在 User Drawer；不增加独立 Permission Management 页面。

- Role 页面复用 SearchForm + DataTable；关键词、类型、状态筛选，展示名称、编码、类型、状态、用户数、权限摘要、更新时间和操作。内置角色置顶，其余按更新时间倒序；提供查看、编辑、复制、启用/停用、删除，不提供批量安全操作。
- 新增、编辑和只读详情复用 Role BusinessDrawer，采用“基本信息 / 功能权限 / 数据范围”三个吸顶 Tabs 与统一保存。1440px 下使用约 760px Large，768px 近全宽，390px 全屏；Header/Footer 固定，正文独立滚动。
- 基本信息包含名称、编码、类型、状态和说明。编码以小写字母开头，允许数字、`-`、`_`、`:`，全局唯一且创建后只读。内置角色只可修改名称和说明；Super Admin 的全权限标记由后端保护，自动覆盖未来权限。
- 功能权限使用可搜索的“目录 → 页面 → 操作”层级树。目录三态批选与页面访问 Checkbox 语义分开：勾选页面只授予访问权；选择操作保留页面和祖先；取消页面只清除可修改操作，锁定后代所需的页面访问仍须保留并说明。隐藏页面可授权但不进入菜单。
- 搜索保留命中节点及祖先，只负责过滤和定位，不直接修改授权。展开/收起全部合并为随当前状态变化的单一按钮；批量修改收敛到模块级“全选本模块”，且只作用于可修改项。权限编码默认隐藏、按需查看，高风险操作使用轻量标记；大型可见树按阈值启用虚拟滚动。
- 数据范围包含本人、本部门、本部门及下级、自定义部门、全部，只作用于声明支持该范围的资源与操作。同一资源/操作的有效范围，仅合并实际授予该操作的启用角色；其他角色的“全部数据”不能扩大无关操作。自定义部门使用可搜索多选树与“包含下级部门”开关，启用后动态包含新增下级；空集合不等于全部。
- 后端区分可修改、可见锁定和完全隐藏权限；锁定项解释“无权变更”，隐藏项不下发。客户端只提交可修改集，后端在版本校验后的原子事务中保留锁定、隐藏及未清理的异常授权；不得将可见树当作完整权限集覆盖，摘要数字同样遵守可见边界。
- 角色停用后不再参与授权，已分配用户保留关联并显示“未生效”；停用角色不可新分配。关联用户数与实际失权人数分别表达。有用户关联的角色禁止删除。复制打开创建 Drawer，名称带“副本”、编码留空并聚焦、默认启用；只复制后端可授予配置，不复制超级标记、系统类型或用户关联。空权限角色允许保存但明确提示。
- User Drawer 使用可搜索角色多选，展示类型、状态、权限摘要和有效授权来源；已分配的停用角色提供独立移除入口。Role 的用户数量入口跳转到带角色筛选的用户 Tab。保存前说明新增/移除角色及有效权限变化。
- 基本信息、功能权限和数据范围以带角色版本号的原子快照统一提交；移除权限、缩小范围或停用等高影响修改先在确认 Dialog 展示差异与影响用户数。字段/节点错误就近定位，一般失败在 Footer 上方提供重试并保留草稿。
- 角色版本冲突或授权目录版本变化保留草稿，要求重新读取并人工核对，不自动覆盖或合并。修改自身角色导致失权时提前警告；保存后刷新权威授权并进入仍可访问页面。请求或推送发现授权快照版本变化后重新获取，同步路由、菜单、操作和受保护缓存。
- 前端 CASL 只承担体验投影，后端独立校验每个受保护接口。授权快照缺失、过期或异常时默认拒绝；普通 403 保留会话，明确账号停用或会话撤销才清理会话。
- 保留创建/修改人及时间，完整历史跳转到可选审计能力；覆盖加载、空、错误、只读、锁定、异常编码、版本冲突和自我失权。无可授予权限但有可查看目录时保留只读树；没有可展示目录才使用主题化 Forbidden 插图，基本信息按授权继续编辑。

原型按 `08A Role Management`、`08B Role Authorization`、`08C User Role Assignment`、`08D States & Boundaries`、`08E Responsive & Dark` 五组推进；Light 中文为主，补充 Dark 权限树、英文长文案及 390/768/1440px 验证。具体业务规则、实现契约与交互分别收敛到 [业务规则](docs/product/02-business-rules.md)、[技术开发](docs/product/03-technical-development.md)和 [UI 与交互](docs/product/04-ui-and-interaction.md)；绘制及 QA 证据另见原型计划，不据本节宣称代码已完成。

## 09 Table / Form

<!-- AI modified: 固化 Q1147–Q1246 已确认的页面组合、列表生命周期与分阶段原型范围。 -->

Table 和 Form 是核心生产能力。本阶段复用已有 `04B` 组件与 `08` 权限模式，形成真实管理页面和示例中心 Recipe，以 User Management 验证完整 CRUD，高级能力另用中性业务场景。

- 业务列表只提供一个增强入口 `DataTable`，高级能力通过可选插件接入；简单静态结构保留轻量 `Table`。SearchForm、DataTable、Form 和 BusinessDrawer 独立可用，上层提供 `ListWorkspace` 视觉 Shell 与 `useListWorkspace` 协调查询条件、URL、选择及 Drawer，均不绑定业务 API。
- 默认搜索草稿与已应用条件分离，查询或适用字段 Enter 后生效并回第一页；重置立即恢复默认并查询。URL 只同步白名单中的已应用筛选、分页、页大小和排序，省略空值与默认值；草稿和已选行不写入 URL。高级筛选展开状态在当前逻辑 Tab 中记忆，非默认生效条件显示可移除摘要。
- Remote DataTable 默认每页 20 条，提供 20/50/100/200，具体接口可收紧；默认页内选择，跨页选择显式开启并展示范围。筛选、排序、页大小变化或显式刷新默认清空选择；列显隐、顺序和密度按用户与稳定 Table ID 保存，支持恢复默认。
- 首次加载使用 Table Skeleton，刷新保留旧行并明确标记。仅在权威信息确认当前有权数据集本身无记录时显示 First Use；筛选无结果显示 Search Empty，明确拒绝访问显示 Forbidden，不能仅凭当前空页推断原因。状态插图继续使用主题化透明 SVG。
- 新增、编辑和详情统一 BusinessDrawer，默认取消/保存，服务端成功后关闭并精确更新或失效相关 Query，保留筛选及合法页码。新记录不在当前结果中时提供“查看新记录”，不强插旧结果；删除使页码失效时回到最近合法页。只有低风险可回滚开关可选乐观更新，用户启停使用 Badge 与明确操作确认。
- Form 使用 VeeValidate + Zod；首次 Blur 或提交显示错误，已有错误后随输入重验，提交摘要定位首个可修正字段。409 在原 Drawer 中保留草稿并比较差异，不默认强制覆盖。草稿默认不持久化，长流程通过按身份隔离的安全适配器显式开启；提交与远程数据由 Vue Query 管理。
- 导入、导出、批量操作及部分成功属于可选增强 Recipe。导入按上传→校验预览→结果推进，保留行级错误且只重试修正后的失败行；大范围导出使用后端异步任务，当前页/少量所选可直接导出。插件只承诺已验证组合。

### 原型范围与顺序

| 组 | 已确认范围 | 推进状态 |
| --- | --- | --- |
| 09A List Workspace | 用户列表主页面、搜索/选择场景、Query 状态与契约说明 | 已绘制 Candidate，静态 QA 与节点证据见原型计划 |
| 09B CRUD Flow | 640px User Drawer；创建、详情、编辑、邀请、删除与完整异常恢复 | 已绘制 Candidate，静态 QA 与节点证据见原型计划 |
| 09C Form Recipes | Basic/Search Form、内容发布工作台、四步创建应用、通知规则 Dynamic Form | 已绘制 Candidate，导航上下文已修正；运行实现待迁移 |
| 09D Advanced Operations | 导入导出、批量结果、单行编辑、组织树表、虚拟列表与插件限制 | 已绘制 Candidate，静态 QA 与节点证据见原型计划 |
| 09E States & Responsive | 以 768×1024 与 390×844 为关键视口，对代表性列表、Drawer、表单、异步状态、Dark 与英文长文案进行跨场景验收 | 已绘制五张 Candidate，结构与逐板视觉 QA 已完成；运行验收待实现 |

09A 复用统一 Sidebar/Header/Breadcrumb/Tabs，激活用户管理。平面 Page Header 仅突出“新增用户”；收起态搜索首行由关键词、状态、角色和按钮组四等分，按钮组在自己的栅格内保持内容宽度并右对齐。展开态按表单顺序自然重排：第一行显示关键词、状态、角色和部门，第二行的创建时间与最后登录时间各跨两格，最后一行再显示右对齐的按钮组，不将操作固定在右上角。时间范围使用明确区分开始日期与结束日期的组合控件；中等宽度采用 `2×2` 等宽布局，移动端单列。Table Toolbar 左侧导入/导出，右侧刷新/列设置/密度；Selection Bar 在同一区域切换，提供启用、停用、导出所选和删除，按权限呈现且不默认提供批量角色分配。

用户列采用 Avatar、姓名和邮箱；其余为状态、角色、部门、最后登录、创建时间及操作。姓名打开详情，编辑直接显示，其他动作进入 More；固定列按场景保留左侧身份与右侧操作。1440px 主画板以表格内部滚动视口展示约 8 条可见记录，当前页实际为 20 条时才标注“1–20 / 共 248 条”，不能将 8 条静态数据误标为 20 条。桌面完整分页，移动端简化分页；移动端列按明确优先级保留，次要信息在全宽详情 Drawer 查看。

画板阅读顺序为说明、1440px 正常主页面、Search/Selection Supporting Scenes、Query 状态条与契约/响应式说明；高级筛选、已应用条件、批量选择、首次加载、Refreshing、Search Empty、Error、Offline 均有对应场景。原型保持 Candidate；后续工程实现与运行验收单独记录。

已绘制 `09A — List Workspace · CANDIDATE`（`v0QnE`，位于 `54964, 4736`），可查看[整板预览](docs/assets/prototype/list-workspace-09A/v0QnE.png)和[用户列表主页面](docs/assets/prototype/list-workspace-09A/vElYB.png)。角色名称沿用 08 的既有角色集合，包括 Support Agent。

<!-- AI modified: 同步 09B 用户 CRUD 原型、账号生命周期和实现边界。 -->

`09B` 新增纯结构 BusinessDrawerShell 与 UserCrudRecipe；Main `egyuC`（`56924, 4736`，`1840×3768`）覆盖 Create、Detail、Edit 和逻辑删除，States `b2EZ5`（`58884, 4736`，`1840×3510`）覆盖 Loading、Submitting、422、409、邀请部分成功、Dirty Close、403、远端删除及局部查询失败。用户采用唯一登录邮箱、选填国际手机号、单一主部门和多角色；创建默认待激活并按选项发送邀请，激活后修改邮箱进入重新验证子流程。删除仅允许已禁用用户，使用高影响确认并提供短时撤销。

09A–09E 已完成静态 Candidate；当前运行实现仍是 Dialog、临时密码与单角色模型，不能据原型宣称迁移已经完成。09E 的 Pencil 结构、逐板视觉检查与整板预览已完成，真实断点、触控、键盘、缩放和运行交互尚未验收；证据以[原型计划](docs/prototype-plan.md)为准。

<!-- AI modified: 同步 Q1311–Q1320 确认的 09C Form Recipes 结构与归属。 -->

09C 规划为五组：Basic、Content Workbench、Step、Dynamic 与 States。团队资料 Basic、四步内部集成应用和站内信/邮件/短信/Webhook 通知规则位于可关闭的示例中心；公告/文章 Content Workbench 位于内容管理。SearchForm 复用 09A，不重复绘制。现有表单、草稿、公告、Step 与 Schema 模块只作为复用来源；本阶段先绘制 1440px 中文 Light，响应式、Dark 和英文视觉验收留到 09E。该段记录分组确认时的规划，当前交付状态见本节后文。

<!-- AI modified: 同步 Q1321–Q1334 的 09C Recipe 数据范围和组件边界。 -->

Basic 团队资料使用名称、创建后只读标识、联系邮箱、行业、规模、默认时区、简介和公开开关，不重复演示图片上传；保存成功留在页面并更新基线。公告是 Content Workbench 的首个具体场景。内部集成应用按基本信息、权限范围、环境与回调、确认创建四步推进，最终一步才原子创建，之前可恢复身份隔离的会话草稿。通知规则采用左侧渠道状态、右侧当前配置，条件限制为事件、受众和可选发送限制，四渠道原子保存。

09C 目标新增无业务字段的 `FormPageShell` 和可选 `DraftAdapter`；Content 与 Step 使用草稿适配器，Basic 默认不持久化。Q1321–Q1334 已确认；该段不代表运行实现已经完成。

<!-- AI modified: 同步 Q1335–Q1348 确认的 09C 关键表单交互。 -->

Content Workbench 使用公告字段、富文本正文、可选封面/附件、固定发布操作区和右侧发布摘要；预览进入新的只读应用 Tab。远程自动保存采用 800ms debounce，并区分本地 Dirty 与未发布修改。Step 允许返回已完成阶段，最终一次性展示 Client ID/Secret。Dynamic 为四渠道提供固定核心字段，切换渠道不局部提交，关闭时保留非敏感配置，配置错误通过摘要、渠道 Badge 与行内错误联合定位。Q1335–Q1348 已确认；当前原型交付状态见本节后文，运行实现仍未完成。

<!-- AI modified: 同步 Q1349–Q1365 确认的 09C States 和响应式规则。 -->

09C States 集中按验证、提交、草稿、冲突和结果组织；自动保存不使用成功 Toast，恢复和过期草稿采用页内提示，离线草稿与远程保存明确区分，409 使用差异 Drawer 且禁止强制覆盖。权限撤回隐藏受保护内容并停止提交，单文件上传可独立恢复，一次性 Secret 受离开保护。移动端分别将 Basic 收为单列、Content 摘要下移折叠、Step 改为顶部紧凑进度、Dynamic 改为顶部渠道 Tabs。Q1349–Q1365 已确认；移动端运行与完整视觉验收仍由 09E 负责。

<!-- AI modified: 同步 Q1366–Q1383 与 09C 首轮绘制状态。 -->

<!-- AI modified: 同步 09C 导航上下文修正完成状态。 -->

09C 已按 Basic、Content、Step、Dynamic、States 绘制五张 Candidate 并保存，主页面沿用统一 Shell 与 04B 共享资产，States 使用扁平分区和主题化 SVG；画板顺序、120px 间距、84 个 Ref、无位图插图及静态 QA 已检查。四张主画板继续引用共享 Shell：Basic、Step、Dynamic 已选中“示例中心”，Content 已选中“内容管理”，错误的“用户管理”选中态已清除，Breadcrumb 与 Tabs 同步匹配。09C 仍未实现到运行代码。

<!-- AI modified: 同步 Q1366–Q1383 的 09C 最终视觉与绘制边界。 -->

09C 最终为 Basic、Content、Step、Dynamic、States 五张 Candidate；主页面共用完整 Admin Shell，States 只保留局部上下文。视觉继续依靠留白、弱分隔和 Soft Layers：Basic 760px 正文、Content 自适应编辑区加 320px 摘要、Step 240px/720px 双区、Dynamic 顶部共享规则加渠道双区。控件引用 04B 共享资产，成功插图使用主题化 SVG，真实中文内容与画板外规格注释分离。本轮只附响应式规则，完整移动端/Dark/英文仍归 09E。Q1366–Q1383 已确认并完成 Candidate 绘制与导航上下文修正。

<!-- AI modified: 同步 Q1384–Q1393 确认的 09D Advanced Operations 第一轮决策。 -->

09D 采用可二次开发的 Recipe 优先定位，第一版覆盖导入、导出、批量操作、单行编辑、树形表格和虚拟滚动，拆为 Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States 五张 Candidate，统一归入可关闭的示例中心。业务增强只公开一个 DataTable，高级能力通过可选插件接入，页面 Recipe 负责组合业务流程；示例分别使用用户、商品、价格、组织和审计事件等真实数据。

导入校验、全量导出、批量写入、权限、幂等与冲突以服务端为权威，前端负责流程与可恢复状态。仅承诺经过验证的插件组合，未验证组合明确标记为实验性或不支持。每项能力绘制主流程、关键异常、结果和契约说明；09D 本轮先完成 1440px 中文 Light，移动端、Dark 和英文完整帧仍由 09E 验收。Q1384–Q1393 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1394–Q1409 确认的 09D 导入、导出与批量边界。 -->

09D Import 使用 640px 三步 BusinessDrawer；CSV 为稳定基线，XLSX 和字段映射按需启用。固定业务示例提供版本化模板，前端仅做快速预检，服务端负责权威解析和校验，预览后由用户确认；重复项默认跳过，更新已有记录需要端点显式支持。导入采用统一任务模型，部分成功保留成功行并允许只重试修正后的失败行；提交后可以关闭 Drawer，页面保留最近任务摘要，关闭不等于取消任务。

Export 覆盖当前页、已选记录和全部筛选结果，默认使用当前可见列但受服务端字段清单约束；CSV 默认、XLSX 可选。小范围直接下载，全部筛选结果进入异步任务，当前页面持续展示状态与下载入口。创建任务和下载时都重新鉴权。Batch 端点显式声明原子或部分成功，前端按逐项权威结果呈现。Q1394–Q1409 已确认，09D 仍未绘制或实现。

<!-- AI modified: 同步 Q1410–Q1429 确认的 09D 高级交互语义。 -->

高影响批量操作通过 AlertDialog 确认数量、范围和后果，页面保留结果摘要，Drawer 展示逐项明细并只重试失败目标。Inline Edit 使用商品价格与库存场景，通过明确按钮进入，默认同时编辑一行，行尾保存/取消；常规写入等待服务端权威响应，409 保留草稿与差异，脏行切换需要用户决定，保存后按真实筛选排序重新定位。

Tree Table 显式区分 Local 完整树与 Remote 懒加载树；父子选择默认独立，可选级联必须说明未加载后代。展开状态仅在当前逻辑 Tab 会话内恢复，分支加载失败局部重试，搜索保留祖先但不修改真实展开/选择，同级排序不破坏层级。Virtual List 使用只读审计事件和 Cursor/Infinite Query，默认可预测行高、底部预取与局部重试；新事件以计数入口提示并保持阅读位置，不与选择、批量或行编辑强行组合。Q1410–Q1429 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1430–Q1452 确认的 09D 画板与共享组件范围。 -->

09D 五张画板按 Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States 排列，前四张使用完整示例中心 Shell，States 使用局部上下文。Import 以用户列表和 640px 三步 Drawer 表达；Export 使用 480px Drawer并与商品批量操作共板；Inline Edit 显式编辑售价、库存、状态和仓库；Tree Table 以 Remote 组织树为主；Virtual List 使用结构化审计事件和详情 Drawer。

状态区统一覆盖 Loading、Error、Empty、Conflict、Partial Success 和 Permission，并复用现有主题化 SVG。新增 ImportDrawerRecipe、ExportDrawerRecipe、BatchResultDrawer、InlineEditRow 和 AsyncTaskSummary 作为页面组合层，不塞入 DataTable 内部。插件矩阵使用 Supported、Conditional、Experimental、Unsupported 四级，并定义 Drawer、行编辑、树表与虚拟列表的键盘验收。Q1430–Q1452 已确认，09D 尚未绘制或实现。

<!-- AI modified: 同步 Q1453–Q1474 确认的 09D 视觉、兼容矩阵和任务安全。 -->

09D 继续使用 1840px 顶层画板、内容自适应高度和 120px 间距，技术说明放在页面帧外。Import 主画面展示校验预览，Export 展示范围与字段选择，Batch 展示归档确认和部分成功；Inline Edit 主表只保留一条正常编辑行，Tree 展开三级，Virtual 显示约 10–12 条事件并明确 Cursor 与总量未知。States 按任务、冲突、树/虚拟化和权限分组，Loading 按影响范围使用 Progress、Skeleton 或节点 Spinner。

Remote 分页、选择和批量操作为 Supported；行编辑与排序/筛选/分页、树与虚拟化、树与行编辑为 Conditional；行编辑与虚拟化、动态高度与虚拟化为 Experimental。服务端任务保持权威，前端只在按用户隔离的 sessionStorage 中保存非敏感任务 ID；轮询支持退避和后台降频，短时下载地址过期后重新鉴权。原型只定义 200 行、三级树和长事件流的性能测试场景，不宣称未测量的 FPS。Q1453–Q1474 已确认，09D 绘制完成后仍保持 Candidate，当前尚未绘制或实现。

<!-- AI modified: 同步 Q1475–Q1495 的 09D 最终数据与任务契约。 -->

Import 示例为 32 行，其中 25 条可导入、3 条跳过、4 条错误，覆盖必填、邮箱格式、重复、无权角色和公式前缀风险；错误文件不泄露服务端或敏感数据。Export 展示商品字段和 20 条当前页、8 条已选、1,284 条筛选结果；Batch 的 8 条结果为 6 成功、1 权限跳过、1 版本冲突。Inline Edit 的金额按 Locale/Currency 显示并以最小货币单位整数提交，库存为非负整数；同时遵守库存与上架联动和无强制覆盖的 409 恢复。

Tree 区分不可见与只读节点，未加载分支显示后代提示，新增下级明确父级路径。Audit 使用绝对时间、辅助相对时间、确定性 Cursor 和服务端脱敏投影。任务统一为 queued、running、succeeded、partially_succeeded、failed、cancelled、expired；百分比只来自真实进度，未知结果先以幂等键查询。导航统一为“示例中心 > 高级操作 > 当前页面”，画板外只保留数据契约、状态所有权、插件依赖和响应式规则。Q1475–Q1495 已全部确认，09D 设计树已收口；当时尚未绘制，当前状态见下文。

<!-- AI modified: 同步 09D Candidate 的完整绘制与静态 QA 结果。 -->

09D 已在 `gvuter.pen` 完成 Import `JndVT`、Export & Batch `cMkWZ`、Inline Edit `B6usiA`、Tree Table `M2AlM`、Virtual List & States `K9TpAb` 五张 1840×1556 Candidate，位置与 120px 顶层间距已执行检查。五张画板均已补全 Header、完整 Shell 主场景和画板外契约区，合计复用 95 个递归 Ref；缺失 Ref 和位图节点均为 0。已逐张放大复核主画面；Import 步骤数字的两处字面白色实现时应转为语义 Token。原型静态交付已完成，运行代码、交互、性能和断点验收仍未执行。

<!-- AI modified: 同步 Q1496–Q1503 确认的 09E 定位、覆盖范围与交付边界。 -->

09E 定位为跨场景验收矩阵，不重复制作组件图鉴，也不为全部业务页生成全组合变体。Desktop 继续以 1440px 为基线，新增 768×1024 Tablet 与 390×844 Mobile 关键画板；1920/2560 通过伸缩规则和后续运行验收覆盖。移动端应完成核心查询、查看、新建、编辑和必要审批，通过折叠、分步与全宽 Drawer 降低密度，而非只读或照搬桌面。

状态范围覆盖 Loading、Skeleton、Empty、Error、Offline、Forbidden、Search Empty、局部 Refreshing 与 Submitting，采用代表性组合确保每种状态至少经过一个窄屏场景，高风险状态再补第二尺寸。Dark 以完整 User List、编辑 Drawer 和局部高级表格为代表；英文重点测试导航、筛选、表格列、Drawer、状态文案和按钮的长文案压力。09E 完成后仍标记 Candidate，真实 CSS、浏览器、触控和断点行为必须在实现阶段另行验收。Q1496–Q1503 已确认，画板拆分与具体规则仍在访谈中。

<!-- AI modified: 同步 Q1504–Q1512 确认的 09E 代表页面和窄屏呈现策略。 -->

Tablet 使用 User List 验证完整页面、展开筛选与近全宽 Edit Drawer；表格保留用户、状态、角色、最后登录和操作等优先列，次要信息进入详情，仅在极端情况下允许表格内部横向滚动。Mobile 覆盖 User List、全屏 User Drawer、Step Form 与代表状态；用户表在 390px 改为带弱分隔的紧凑列表行，展示身份摘要、状态和主操作，不改成逐项 Card，也不照搬横向滚动表格。

Dark 高级数据场景使用 Inline Edit，检查活动行、输入、错误和 409 冲突。英文以 768px 组合压力场景覆盖 Shell、SearchForm、DataTable、Edit Drawer、状态文案和按钮。Offline、Forbidden、Submitting 与阻断型 Error 同时验证 768/390px；1024×768 不单独绘制，沿用 Rail 规则并留给浏览器验收。所有响应式原型只绘制应用视口与安全/滚动边界，不加设备外壳。Q1504–Q1512 已确认。

<!-- AI modified: 同步 Q1513–Q1523 确认的 09E 画板架构和窄屏核心交互。 -->

09E 拆为 Responsive List、Mobile Flows、Responsive States、Dark、English Stress 五张 Candidate。Responsive List 同板并列完整 768/390px User List，并补导航 Drawer、筛选与选择模式。Mobile 只在页面保留关键词和筛选入口，其他条件进入 Bottom Drawer；字段修改先形成草稿，点击“应用筛选”才查询，应用后显示条件摘要。批量模式通过明确“选择”入口进入，显示 Checkbox、数量和底部操作栏；身份区域进入详情，编辑直接显示，其余动作进入 More。移动分页仅保留上一页、当前页和下一页。

768px Edit Drawer 使用 720px 近全宽结构，左侧保留 48px 上下文；390px User Drawer 使用 edge-to-edge 全屏结构，二者均固定 Header/Footer 并独立滚动 Body。Mobile Step Form 默认显示“第 N/4 步”、当前步骤名和进度条，点击展开步骤清单且只允许返回已完成步骤。Mobile 页面使用单一纵向滚动；Tablet DataTable 可保留受控内部滚动，业务 Drawer 打开后只滚动 Drawer Body。Q1513–Q1523 已确认。

<!-- AI modified: 同步 Q1524–Q1534 确认的 09E 状态分组、Dark 场景与英文文案策略。 -->

Responsive States 按 Query、Permission、Mutation 分组。首次加载使用匹配 Tablet 表格或 Mobile 紧凑列表的 Skeleton，保留 Shell、标题和筛选；Refreshing 保留旧数据和上下文，只在数据区域提示后台刷新。首次 Empty 提供新增，Search Empty 提供清除筛选，均使用透明背景主题 SVG。

Offline 在 768px 展示有缓存降级、保留列表并暂停写入，在 390px 展示无缓存插图和重试。Forbidden 在 768px 展示页面进入前无权，在 390px 展示编辑中失权并清除受保护内容。阻断型 Error 分别使用列表首次请求失败和 Drawer 依赖数据失败；Submitting 保留字段与草稿，锁定可变控件、关闭和重复提交，失败后恢复草稿。

Dark 画板包含完整 1440px User List、打开 Edit Drawer 的列表以及 Inline Edit 活动行与 409；依靠中性暗色表面、亮度差、弱描边和克制阴影建立层级，Violet 只用于强调、焦点和选择。英文采用真实业务文案并主动制造约 30%–60% 的长度增长。Q1524–Q1534 已确认；英文溢出与 Locale 格式仍待确认。

<!-- AI modified: 同步 Q1535–Q1536 确认的英文溢出和 Locale 压力规则。 -->

英文场景中表单 Label 与说明可自然换行，按钮主文案保持单行；姓名、邮箱和表格内容按列契约省略并通过 Tooltip 提供完整值，关键状态、验证和错误文案不得截断或靠缩小字号容纳。场景同时使用 en-US 日期、时间、数字与复数规则，并加入较长英文姓名和角色名。Q1535–Q1536 已确认。

<!-- AI modified: 同步 Q1537–Q1547 确认的 09E Responsive List 与 Mobile Flows 场景。 -->

09E 复用 09A 的用户、角色、状态和数量。Tablet 主场景关闭导航 Drawer，Header 保留菜单入口，Supporting Scene 展示 320px 打开态。Mobile 首屏显示约五条完整紧凑记录和简化分页；批量模式底栏显示数量、启用、停用和 More，导出与删除进入 More，删除仍需确认。

Mobile Flows 使用已有用户的 Edit Drawer，字段全部单列，多角色和权限摘要自然换行，不增加分区 Card。虚拟键盘出现时 Footer 保持在可视安全区上方，Body 确保当前字段和错误不被遮挡。Step Form 停留在第 2 步“权限范围”，顶部步骤导航在页面内轻量展开，已完成步骤可返回、未来步骤禁用。关闭业务 Drawer 后恢复筛选、页码、列表滚动位置和合法选择，浏览器返回优先关闭 Drawer。高级筛选 Bottom Drawer 自适应至最大约 80dvh，固定 Header/Footer、Body 滚动，日期选择在当前 Drawer 内展开。Q1537–Q1547 已确认。

<!-- AI modified: 同步 Q1548–Q1562 确认的 09E 后三板内容、资产复用和交付证据。 -->

Responsive States 在透明工作面上按 Query、Permission、Mutation 使用完整上下文和扁平片段组织，不创建白色状态 Card。Query 的 Tablet 场景覆盖 Skeleton、Refreshing、Search Empty、缓存 Offline 与首次加载 Error，Mobile 覆盖 First Use Empty 与无缓存 Offline；Permission 覆盖 Tablet 页面无权和 Mobile 编辑中失权；Mutation 覆盖双端 Submitting 与 Mobile Drawer 依赖加载失败。移动状态动作突出主恢复路径，次动作降级，点击高度至少 44px。

Dark 使用 Comfortable User List、正常 Edit Drawer，以及 Compact Inline Edit 活动行与 409，不重复 Light 对照；英文在 Light 768px 中组合完整列表、展开 SearchForm、Edit Drawer 与状态/按钮压力片段。09E 继续通过 Ref 复用 Shell、控件和状态 SVG，只为真实结构变化新增 Tablet/Mobile Variant，不解除实例临摹或让 Desktop Master 承担冲突布局。

五张顶层画板延续 1840px 宽、自适应高度、120px 间距并排列在 09D 后。真实 UI 与画板外 Contract 分离。绘制后检查顺序、间距、缺失 Ref、位图、旧 Token、硬编码颜色、裁切、重叠、英文溢出、状态插图与关键截图，并将整板和局部预览导出至 `docs/assets/prototype/states-responsive-09E/`。本阶段只修改 Pencil 原型、预览和产品文档，不修改 Vue 运行代码。Q1548–Q1562 已确认。

<!-- AI modified: 同步 Q1563–Q1572 确认的 09E 响应区间、可访问性与运行验收边界。 -->

响应区间为 `<640px` Mobile 紧凑列表与全屏业务 Drawer、`640–1023px` 优先级列 DataTable/非常驻导航/近全宽 Drawer、`1024–1279px` 72px Rail 与桌面表格、`≥1280px` 240px Sidebar 与完整桌面布局。Shell 导航响应 viewport，SearchForm、DataTable 等内容组件优先响应自身容器。正式运行支持下限为 360px；390px 是原型采样点，360px 与 200% 缩放在实现阶段验证无整页横向溢出、核心信息或动作丢失。

触控端不能依赖 Hover Tooltip 获取完整信息，Mobile 应通过详情 Drawer、可展开文本或可访问名称提供全文。画板外记录 Drawer 焦点循环和焦点返回、提交失败聚焦首错、状态恢复动作键盘可达、busy/status/alert 语义与字段错误关联。状态、选择、锁定、错误和禁用均需文字、图标或形状作为颜色之外的识别方式。过渡保持克制并遵守 reduced-motion，关键含义不依赖动画。后续运行证据必须覆盖真实断点、360px、200% 缩放、虚拟键盘、触控、键盘、辅助技术、Light/Dark 与中英文；当前均未执行。Q1563–Q1572 已确认，09E 设计树已收口。

<!-- AI modified: 更新 09E 样式修正、逐板静态验收和预览交付状态。 -->

09E 五张 Candidate 已写入 `gvuter.pen`：Responsive List `E900dw`（`80444,4736`，`1840×2620`）、Mobile Flows `E900mb`（`82404,4736`，`1840×1400`）、Responsive States `E900t1`（`84364,4736`，`1840×2320`）、Dark `E900wo`（`86324,4736`，`1840×3160`）、English Stress `E90257`（`88284,4736`，`1840×1900`）。本轮修正了 Tablet、缓存状态与英文压力场景的表格列宽坍缩，补齐导航/筛选 Overlay 的绝对布局，并重建 Dark Drawer 与 Inline Edit。结构检查共计 251 个 09E Ref，缺失引用、重复 ID、位图、09E 硬编码 Fill/Stroke 与比例列宽均为 0，顶层位置保持 120px 间距。Pencil 已重新载入并逐板检查整体裁切、重叠、Drawer 可见性、Dark 层级、英文压力和状态插图；五张整板 PNG 已重新导出到 [`docs/assets/prototype/states-responsive-09E/`](docs/assets/prototype/states-responsive-09E/)。当前状态为“静态 Candidate 已验收，运行验收待实现”。

## 10 Theme

- 支持 Light、Dark 和跟随系统模式。
- Header 主题入口打开紧凑 Popover，直接选择 Light、Dark 或 System；完整品牌色、Layout 和安全外观选项进入独立 Appearance Drawer。
- Appearance Drawer 使用单页纵向分区和实时 Shell 预览：Desktop 420px、Tablet 近全宽、Mobile 全屏；所有设置即时预览并立即保存，不增加“应用”按钮。
- `System` 作为持久化状态保存并实时响应操作系统主题变化，不在选择时固化为 Light 或 Dark。
- 主题、语义色、图表色、边框、阴影、焦点环和状态色使用统一 Token。
- 运行状态分离 `selectedMode`、`resolvedMode` 与 `brandId`；DOM 同时设置兼容 shadcn-vue 的 `.dark`、`data-theme`、`data-brand` 和 `color-scheme`。
- 中性表面使用 Background、Surface、Raised、Overlay 四级，Sidebar 单独语义映射。Dark 采用偏暖 Stone/Charcoal，不使用纯黑或大面积深紫；主要依靠表面亮度差和弱描边，阴影只用于 Overlay 与拖拽层。
- Success、Warning、Destructive、Info 保持稳定功能语义，只按 Light/Dark 校准，不随品牌染色。图表使用独立分类色板：Chart-1 体现品牌，其余色保持协调和分类稳定，不复用功能状态色。
- Focus、Selected、Active 分别使用 Ring、Soft Surface、强调线/前景色。六类状态插图继续映射 Primary、Primary Soft、Surface、Muted、Stroke 五个角色。
- 品牌色提供受控预设，默认使用 Violet；终端用户只看到项目配置允许且经过验证的预设和外观选项。
- 模板内置七种品牌预设，项目可通过强类型配置限制或注册同时覆盖 Light/Dark 且通过对比度校验的新 Palette；运行界面不提供任意颜色输入。
- Palette 门禁要求正文至少 `4.5:1`，大文字及图形/控件边界至少 `3:1`，并单独校验焦点和状态。失败时开发与 CI 阻断，生产运行拒绝注册并回退 Violet。
- 普通页面保持 Comfortable，不提供会统一压缩表单和触控区的全局 Compact；DataTable 等数据密集组件自行提供局部密度设置。
- Layout 只展示 Sidebar、Top Navigation、Mixed 三种正式方案；语言继续作为 Header 独立入口。Default/Ocean/Compact/Midnight 混合套装和 `default/sm/md/lg` 全局组件尺寸退出正式 Appearance 设置，前者如需展示仅作为示例中心 Demo Recipe。
- 内容宽度提供 Fluid 和 Centered，默认 Fluid；Centered 默认最大约 1600px，最终数值通过原型复核。DataTable、复杂图表等页面可声明 Fluid 覆盖，并提示当前页面存在覆盖。
- 界面显示只提供项目已启用的 Breadcrumb、Tabs、Footer、Page Transition。Breadcrumb 隐藏不改变 Header 高度；Tabs 关闭时清理非当前页面缓存但保留当前任务；Footer 默认关闭；页面过渡只提供 Off/Fade，Reduced Motion 强制 Off。
- 仅展示当前布局可生效的设置，并允许恢复默认值。
- Layout 切换保留当前路由、Query、Tabs、表单草稿和滚动锚点，只重排 Shell；Appearance Drawer 保持打开。业务 Drawer/Dialog 打开时 Header inert，不允许叠加 Appearance Drawer。
- Drawer 底部提供“恢复默认”，二次确认后回到当前项目定义的默认外观，不影响登录、业务数据或当前任务。
- V1 按用户身份在本地保存带版本的偏好，提供兼容或重置策略，并为未来账号同步预留契约。
- 启动优先读取当前用户偏好，不存在时使用项目默认；只有保存状态为 System 时才解析操作系统主题。登录前的游客偏好在用户首次登录且没有个人设置时继承，已有个人设置则优先恢复；退出后恢复游客偏好或项目默认，不能继续暴露上一账号的外观。
- 偏好使用“项目 + 用户身份 + Schema Version”命名空间，并通过 Storage/BroadcastChannel 在同一用户的多个标签页实时同步。旧数据迁移失败时安全回退，在 Appearance Drawer 内显示一次非阻断说明。
- Vue 挂载前同步设置 mode、brand 与 `color-scheme`，避免首屏闪烁；PWA 启用时浏览器 `theme-color` 跟随当前主题，PWA 关闭时不生成无效配置。
- 主题切换采用 `150–200ms` 的克制颜色过渡，Reduced Motion 下立即切换；切换不得重载应用或清除路由、Tabs、查询缓存、表单草稿与滚动位置。
- 快速 Popover 使用带图标、说明和当前 Check 的三行选项，与 Drawer 共用 ThemeModeSelector；Drawer 顶部 Shell 缩略图只负责实时预览，不形成第二套控制入口。自动保存成功只在标题区短暂显示“已保存”，失败时显示可恢复警告，不连续弹出 Toast。
- 10 — Theme 拆为五张 Candidate：10A Contract、10B Controls、10C Appearance Drawer、10D Theme Matrix、10E States & Responsive。完整设置使用 User Management 作为上下文，Dashboard 图表用于补充分类色验证；七品牌采用紧凑矩阵，页面级只验证 Violet Light、Violet Dark、Blue Light、Orange Dark。
- 10A 不使用 Admin Shell，按状态模型、Token 层级、表面、颜色、对比度五个规范区块纵向排列；展示 Violet/Stone 代表 Primitive、完整 Semantic 与少量 Component Token，并标注名称、职责、Light/Dark 示例值和使用边界。
- 10B 的 Header Trigger 在 System 下显示 Monitor，Tooltip 说明当前解析模式。约 280px Popover 使用图标、名称、说明和 Check；System 行实时显示解析结果，选择后立即关闭，底部“更多外观设置”进入完整 Drawer。
- 10C Drawer 固定 Header 包含标题、说明、自动保存状态与关闭按钮；其下为非固定的 16:9 Shell 预览。七品牌使用两列带名称与 Check 的选项，三种 Layout 使用结构缩略选择卡并在窄屏纵向排列。
- 10C 中 Breadcrumb、Tabs、Footer 使用 Switch，页面过渡使用“关闭 / 淡入”分段选择；Fluid/Centered 使用带页面示意的双选卡。Layout 选中态采用品牌色描边、轻 Ring 与 Check，品牌项采用色块、名称、弱背景与 Check。
- Drawer 仅固定 Header，内容区独立滚动并兼容移动端安全区；恢复默认位于滚动内容末尾，不增加固定 Footer。保存失败保留当前内存主题并提供就地重试；迁移失败回到项目默认，只在 Drawer 内显示一次非阻断说明。
- 10D 的每个品牌最小样本包含主按钮、输入 Focus、Badge、选中表面、链接和图表色板；图表覆盖折线、柱状和环形，功能色同时通过 Alert、Badge、文字与图标验证，不能只依赖颜色。Tablet Drawer 近全屏并保留约 48px 背景上下文。
- 10D 额外覆盖 Violet Light/Dark 与 Blue Light 的 Dashboard 图表对照，以及 DataTable、表单、Popover、Drawer、Alert、Empty/Forbidden SVG 的 Dark 局部样本。10E 延续 1440、768×1024、390×844，并覆盖 Saving、Saved、Storage Failure、Migration Reset、System OS Change 和 Invalid Project Palette。
- 10E 中 Invalid Project Palette 只进入开发者诊断契约，终端用户使用回退后的 Violet；System 变化只更新 resolvedMode，跨标签页静默同步，Drawer 打开时可短暂显示“已同步”。Storage Failure 允许关闭 Drawer并保留当前会话主题，Header 入口以弱提示点保留风险，重新打开后可重试。
- Mobile Drawer 继续单页分区滚动，品牌项保持两列；420px Drawer 和 390px Mobile 都提供英文长文本压力样本。Theme 单选组采用标准 Radio 语义、整行/整卡命中、方向键和可见 Focus；关闭 Overlay 后焦点返回触发器，保存失败使用更高优先级播报。
- 10E 上半部展示三端真实界面，下半部使用统一状态契约 Strip。代表主题页面固定相同内容、数据和滚动位置；最终同时检查结构引用、无位图、Token、Light/Dark 对比度、三端溢出、英文压力与状态完整性。
- 七品牌最终顺序为 Violet、Blue、Cyan、Green、Orange、Rose、Slate；展示名称跟随 Locale，稳定的品牌 ID 不随语言变化。Slate 作为低彩度受控方案保留，但不能改变 Success、Warning、Destructive、Info 的固定语义。
- Dark 主题中的品牌色只用于交互、Focus、Chart-1 与小面积选中反馈，表面继续使用暖 Stone/Charcoal。页面级主题矩阵固定为 Violet Light、Violet Dark、Blue Light、Orange Dark 的 `2×2` 同内容对照。
- `10A`–`10E` 已在 `gvuter.pen` 中完成 Candidate 绘制，统一放置在 `y=13000` 的新行，宽度 1840px、水平间距 120px；新增并复用 ThemeModeSelector、BrandOption、LayoutOption、ThemeStatus 组件。所有图标与插图均使用语义 Token 驱动的矢量节点，`basic.pen` 仅作为参考，不复制其 Master 或变量。
- 本阶段只完成原型，不代表 Theme Store、Palette 注册、首屏恢复、跨标签同步或响应式运行行为已经实现。最终预览位于 `docs/assets/prototype/theme-10/`。
- V1 完成中英文和核心可访问性，不承诺 RTL。

<!-- AI modified: 同步 Q1573–Q1692 确认并已绘制的 Theme 交付、品牌顺序、Dark 范围与验收状态。 -->

## 11 工程优化

本阶段以 V1 发布就绪为目标，不进行无边界的全面重构。实施优先级固定为正确性与安全、可复现构建、测试、性能、开发体验；只修复会影响发布门禁的实现差距，纯业务与视觉重构回到对应功能阶段。

- Node.js 固定一个当前 LTS 主版本，并让 `engines`、CI、容器和文档保持一致。
- CI 采用分层策略：PR 执行快速核心门禁，主分支与 Release 执行完整门禁和跨浏览器验证；本地提供 `pnpm run verify` 对齐 PR 核心门禁。
- 新门禁先清理存量基线再改为阻断，不长期保留允许失败。性能由 Bundle 预算、代表流程浏览器测量及明确的设备、网络、数据规模共同验收。
- PR 以 Chromium 为主要反馈，Release 自动验证 Chromium、Firefox、WebKit，并补充真实 Safari 人工验收。
- 依赖每周分组更新，安全修复单独加急；更新必须连同锁文件并通过完整门禁，不自动合并所有依赖 PR。
- PWA、监控、SSO、多租户等增强能力只保留清晰扩展边界和接入文档，默认关闭，并验证关闭后不存在入口、运行副作用或生产产物。
- V1 采用 Git Tag、Changelog 和干净克隆 Smoke Test 发布，暂不制作 npm CLI；快速启动目标为新使用者按 README 在约 10 分钟内使用 Mock 启动，并能明确切换到真实 API。
- `main` 是唯一正式主干；确认后的 `main-admin` 成果合入 `main`，CI、保护规则和 Release 均以 `main` 为准。V1 只承诺 Node 24 LTS，最低补丁版本在工具链、容器与 CI 中一致固定。
- `pnpm run verify` 包含只读 CI 诊断、类型、Lint、文档、契约、安全静态检查、Inventory、生产审计、覆盖率、生产构建及 Bundle/PWA 产物检查；`pnpm run release:check` 再加入 Mock 构建、三引擎 E2E 和生产产物恢复。容器验证在 Phase 2 收口前由主分支 CI 独立执行。
- 覆盖率先冻结现有全局基线并禁止回退；认证、权限、路由、API 等关键模块设置更高目标，再逐步提高全局门槛。Release 对 `gnester-lite` 运行最小真实后端 Smoke，第三方后端可以复用同一套接入测试。
- Bundle 与首屏总传输预算进入门禁；时间指标先在固定参考环境校准再阻断。首屏预算包含静态 JS、CSS、字体和请求数。随附 Nginx 默认启用 gzip，外部 CDN/Ingress 替代时也必须验证真实响应压缩。
- 生产依赖 High/Critical 零容忍：优先升级依赖链，无法安全升级时移除或替换能力。供应链覆盖生产及构建工具风险、历史 Secret Scan、SBOM、容器扫描和 CodeQL，许可证先生成报告。
- pre-commit 维持快速 lint-staged；不可绕过的完整规则由 CI 承担。关键发布脚本逐步迁移为受 TypeScript 检查的实现，并使用 Fixture 验证规则。
- 使用 Renovate 每周分组更新依赖，安全更新单独提交且不自动合并。GitHub Release 自动附带 Changelog、校验后的源码包与容器镜像，但不替业务项目自动部署生产环境。
- Observability 使用稳定 Adapter，核心默认安全空实现，可提供 Sentry 接入示例。干净克隆在 Linux 与 Windows 自动验证，macOS 在 Release 阶段人工抽样。
- `main` 启用保护规则：`verify` 与 Chromium Smoke 必须通过，至少一次 Review，代码变化后旧批准失效，禁止直接 Push 和 Force Push。`main-admin` 通过保留历史的 Pull Request 合入；首个 Release 完成后归档旧 `admin` 与 `main-admin`。
- 生产代码验证后只构建一次不可变产物，容器扫描和 Release 复用该产物；Mock E2E 使用独立测试产物。版本继续保持 `0.x`，通过 Release Please 维护 Release PR，使用 Conventional Commits 生成 SemVer Tag、Changelog 与 GitHub Release，核心契约稳定后再进入 `1.0.0`。
- 参考容器发布至 GHCR，附 SPDX SBOM、Artifact Attestation、镜像摘要和漏洞扫描结果。真实 `gnester-lite` Smoke 使用临时、固定版本、确定性 Seed 的容器，验证 Health、认证生命周期、当前身份、权限/菜单、分页、可回滚 Mutation、错误信封和 Request ID。
- 认证、权限、路由、API 的初始覆盖率目标为 Statements/Lines/Functions 90%、Branches 85%；全局阈值维持当前基线且只能提高。性能固定 Chromium、视口、CPU/网络及 Seed，分开采样冷启动和热导航，多次运行取中位数并保留趋势。
- 首屏总量门禁以当前真实构建为基线并预留约 5% 波动，先禁止增长，再专项下调。环境使用类型化 Schema 和 Development/Test/Production Profile，在构建前校验 URL、Mock、CSP 和必要来源。
- Source Map 使用 Hidden 模式，仅在启用监控 Adapter 时上传并绑定 Release SHA，不随站点公开。Observability 只接收 Release、环境、路由模板、错误分类、Request ID、功能模块和安全上下文；禁止 Token、密码、表单正文及原始响应。
- PWA 默认关闭不仅要求新构建无 Worker 产物和注册，还必须为曾启用版本提供一次受控的旧 Worker 注销与缓存清理迁移。
- README 只承载约 10 分钟快速启动和常用命令，复杂接入、部署、测试与安全规则进入 `docs/`。提供只读 `pnpm run doctor` 检查 Node/pnpm、锁文件、环境变量、端口、浏览器依赖及常见冲突，只报告问题和建议，不修改用户环境。
- V1 使用集中式项目配置、`.env.example` 与初始化清单帮助二次开发，不提前实现生成器。示例中心、注册、PWA 等功能开关使用类型化 Schema；矛盾配置在开发与构建阶段明确失败。
- 测试按职责分层：纯规则使用单元测试，组件交互使用组件测试，跨模块关键旅程使用 E2E，避免重复断言。Flaky 即使重试通过仍视为失败并保留 Trace，不允许长期隔离或无限重试。
- 视觉回归由 Chromium 覆盖少量稳定关键组件和代表页面，三引擎继续验证行为。无障碍使用 Axe、关键键盘/焦点自动化，并在 Release 人工抽样 VoiceOver/Safari 与 NVDA/Firefox 或 Chrome。
- Knip 的未使用依赖和遗漏依赖立即阻断；未使用文件与导出先建立存量基线，新增问题阻断，存量按模块清零。Renovate 按 Runtime、Vue 核心、构建、测试、GitHub Actions、Docker 分组，Major 单独 PR。
- 许可证建立 Allow/Deny/Review 清单，未知许可证和强 Copyleft 人工审查，明确禁止项阻断。`docs:check` 校验脚本引用、环境变量清单、内部链接和生成片段，不自动重写产品说明。
- Changelog 记录功能、配置、公共契约、迁移、安全和影响使用者的重大依赖变化，不复制全部 Commit。发布和校验逻辑使用 Node/TypeScript，避免依赖 Bash、`sed`、`rm` 等平台命令。
- CI 证据保留期为：PR 失败 14 天、主分支 30 天、Release 关键证据随 Release 长期保存。
- 同一不可变前端构建通过非敏感运行时配置跨环境晋级。配置只允许 API 地址和公开功能开关等公开值，优先级为运行时公开配置、构建期安全默认值、项目默认值；非法配置明确阻止受影响能力。数据库凭证、私钥、对象存储密钥、监控上传 Token、后端 Secret 等永不进入 `VITE_*` 或浏览器配置。
- 参考边缘层在缺少 Request ID 时生成并向后端转发、向客户端返回。生产 CSP 默认禁用 `unsafe-eval` 并尽量避免 `unsafe-inline`，受控配置生成 API、WebSocket、Frame 和字体来源。指纹资源长期 immutable，HTML 与运行时配置 no-cache，认证、权限及敏感 API no-store。
- Liveness 只验证静态前端，Readiness 可以检查后端依赖，但后端不可用不能触发前端容器重启循环。回滚按镜像 Digest 指向上一已验证版本，至少保留当前和前一版本；运行时配置与本地状态迁移保持向后兼容。
- Theme、Tabs、导航等本地状态使用顺序、幂等、带版本的窄迁移，失败只重置对应命名空间。OpenAPI 使用 `api:generate` 生成并提交 DTO，`api:check` 在临时目录重新生成后检查漂移；Zod 只验证 API、运行配置、Storage、插件等不可信边界。
- 性能代表场景为 Login、Dashboard、User List/DataTable、Role Permission、Appearance Drawer 和主路由切换。固定 Seed 提供 Small、Typical、Stress 三档，硬门禁使用 Typical，Stress 用于趋势与专项回归；生命周期测试覆盖重复路由、Drawer、账号切换和 KeepAlive 淘汰。
- GHCR 发布 `linux/amd64` 与 `linux/arm64` 镜像；容器默认非 root、兼容只读根文件系统、显式临时目录、最小运行时镜像并提供可验证健康检查。
- V1 保持单应用仓库；只有出现至少两个可独立发布的包时再考虑 Monorepo。Feature 通过窄公共入口互相消费，共享基础层不得反向依赖业务；只有真实跨模块消费者存在时才创建入口。ESLint 在 CI 中阻断禁止方向、跨 Feature 深层导入和循环依赖。
- 路由页面、图表、富文本、地图、拖拽和高级表格插件动态加载，认证与基础 Shell 保持轻量同步路径。登录后只按权限、网络和访问概率预取首屏及当前导航近邻。
- 组件清单继续使用 Candidate、Validated、Stable；至少被一个真实核心页面使用，并通过文档、测试和可访问性验收后才可 Stable。
- MSW 提供可组合的 Happy、Empty、Error、Offline、Permission、Slow 场景。Mutation 使用每测试隔离、固定 Seed 的内存数据集并自动重置；生产编译入口彻底排除 Worker、Handler、Mock 数据和相关 Chunk。
- API 错误稳定分类为 Validation、Authentication、Authorization、Conflict、Rate Limit、Offline/Network、Server、Cancelled、Unknown。Axios 不做通用自动重试；Vue Query 只重试安全幂等查询，Mutation 显式声明幂等与恢复。过期查询使用 AbortSignal，上传和服务端任务维持独立生命周期。
- 业务日志统一进入 Logger/Observability Adapter，生产禁止随意 `console.*`。Feature Flag 只控制能力部署与开放，Permission 继续由前后端授权决定。CI 校验 Locale Key、占位参数和未使用 Key，缺失翻译阻断构建。
- Vue、Vue Query 和 Mock DevTools 只在开发模式按需加载，并检查生产产物无入口。Bundle 分析在本地按需与 Release 生成，普通 PR 仅在预算超限时上传定位报告。
- CI 对同一 PR 取消过期运行，`main` 与 Release 运行不取消。只缓存 pnpm Store、Playwright 浏览器和 Docker BuildKit 层，不跨不兼容锁文件缓存 `node_modules` 或业务 `dist`。PR 门禁中位数目标不超过 10 分钟，Release Gate 不超过 30 分钟。
- E2E 先按浏览器和稳定场景并行，单浏览器超过时限后再引入固定 Shard。构建工具 High/Critical 同样阻断 Release；不可达例外和其他门禁例外必须记录 Issue、责任人、范围、依据与到期时间，到期自动恢复阻断。
- Observability 完整采集未捕获错误和发布异常，性能事件按配置采样，重复错误聚合并经过隐私过滤。模板只定义级别、Adapter 和示例规则；接收人、阈值、保留期和数据驻留由接入项目配置。
- Release 可部署独立、明确标记为 Demo 的 Mock 站点，不使用生产凭证，也不把 Demo 构建作为正式制品。`0.x` 的 Breaking Change 仍必须在 Release Notes 中提供配置、API、本地状态和组件迁移步骤；通常至少保留一个 Minor 的弃用提示，安全或错误契约可带迁移说明立即移除。
- 仓库提供 Bug、Feature、Regression、Documentation 模板和指向 GitHub Private Vulnerability Reporting 的安全政策。Release PR 合并后仍需受保护 Environment 人工批准，才能推送 GHCR 与创建最终 Release。
- `11` 阶段不新增产品 UI Candidate，以工程执行计划、流程和真实 CI/测试证据交付；只有用户可见状态变化时才修订原型。实施顺序为安全与 CI、Node/脚本/门禁、PWA 与运行配置、OpenAPI/Knip、性能与测试、Release/文档。
- 阶段完成要求当前源码在干净环境通过 `verify` 与 `release:check`，并具备真实 Smoke、Linux/Windows 克隆、制品证明和文档一致性的当前 Commit 证据。
- 实施拆为安全基线、CI/工具链、运行配置/PWA、契约/依赖、性能/测试、Release/文档六个可独立验证的变更组。现有已修改和未跟踪文件均视为用户资产，只触碰当前阶段必要内容并精确选择提交范围。
- 已完成全量应用依赖刷新与兼容迁移并更新 Lockfile。TanStack Table 已升级到 `9.2.4`，DataTable 与 ProTable 使用各自的显式 Feature Profile；现有公开组件契约保持不变，单一 DataTable 合并继续作为后续专项。列固定持久化状态由 `left/right` 升级为逻辑方向 `start/end`，读取旧版偏好时自动迁移。Vitest 与 V8 Coverage 已同步升级到 `5.0.0`，Vue Runtime/Compiler 统一为 `3.5.42`，Playwright 升级到 `1.63.0`。TypeScript 暂留 `6.0.3`，等待 typescript-eslint 正式支持 TypeScript 7；Zod 暂留 `3.25.76`，等待 VeeValidate 5 稳定版后协同迁移。安全 Override 保持 Nano ID `3.3.18` 和 `resolve@1.22.11`，Node 类型保持 24.x。
- 依赖刷新后的本地 Release Gate 已执行通过：冻结安装、静态检查、契约、安全、测试清单、生产审计、665 项覆盖率测试、Mock/生产构建及三浏览器 E2E `149/149` 全部通过；Playwright `1.63.0` 的 WebKit 代表集连续三轮 `42/42` 无重试通过，完整矩阵也无重试通过。Firefox 冷启动的 MSW Worker 绑定采用 10 秒断言预算，最终 `dist` 为无 Mock 生产构建。
- Operations Demo 的日期逻辑已迁移到 `@internationalized/date`，并删除 `dayjs`；通用格式化继续使用 `Intl`。工程工具优先使用 GitHub Action 或平台能力；只有本地也必须复现时才作为 Catalog 管理的开发依赖。
- `11` 完成只代表工程基线完成；最终 V1 Release 仍需等待 DataTable、权限、Theme、认证等核心产品差距关闭，不能用 CI 通过替代功能验收。
- 运行时公开配置首个 Minor 保留 `VITE_*` 构建期回退并提示弃用，下一 Breaking 版本移除旧入口。GitHub 分支保护、Environment、GHCR、Pages、漏洞私密报告、分支合并和正式发布等远端变更必须在实际执行前再次核对目标并取得确认。
- 在线 Demo 默认部署到 GitHub Pages，使用独立且明确标记的 Mock 构建。GHCR 可见性继承仓库：开源仓库公开，私有 Fork 不强制公开。
- 每个 Release 保存简洁证据清单，包含 Commit、Node/pnpm、门禁结果、浏览器、制品摘要、已知限制和迁移链接。PR 核心门禁不依赖外部服务；Release 外部步骤有限重试，持续失败则停止发布。
- 工程优化进度使用 Planned、Implemented、Executed、Blocked 四种状态，每项关联真实命令或 CI 证据。
- Q1817 已确认设计树收口。本阶段先交付 `docs/engineering-optimization-plan.md` 的六阶段实施清单，不立即执行代码改造；后续由用户明确选择开始批次。
- Phase 0 的稳定图表能力为 Line、Bar、Donut，地图仅可作为未来独立插件。业务不得直接依赖第三方图表组件，统一使用项目类型化入口；视觉对齐 10D 语义而非像素复制旧库，并覆盖可访问替代、Pointer/键盘/触摸和 Shell 生命周期。
- 用户确认继续采用 shadcn-vue 推荐的 Unovis。MapLibre 漏洞本身严重，但当前 Line/Bar/Donut 使用路径不触达地图 attribution；安全基线不得将此推断等同于漏洞消失，仍需保留产物证据、源码禁用规则和上游升级跟踪。
- 日期迁移保持既定 Locale、业务时区、空值和包含边界；依赖通过 pnpm 正常更新 Lockfile，未经完整验证的跨 Major Override 和永久 Audit Ignore 均禁止。回归覆盖 Dashboard、组件中心、Light/Dark、中英文、响应式、Reduced Motion 和 Bundle；视觉快照需审查后更新。
- Phase 0 已执行：业务图表只通过项目 Chart 入口使用 Unovis 直接子路径；源码和生产产物门禁同时排除地图渲染器。`ChartContainer` 已覆盖尺寸、可见性、主题、Locale、Tabs/KeepAlive 恢复与卸载清理，Dashboard 和组件中心均提供非视觉数据替代。本轮不改变图表视觉，因此未更新视觉基线。
- Phase 0 当前证据为冻结安装、静态/契约/安全/清单门禁、666 项覆盖率测试、Mock/生产构建、`61.11 KiB gzip` Chart 异步块、三浏览器 E2E `149/149` 以及生产/开发依赖零已知漏洞。传递依赖通过精确补丁线 Override 修复，没有宽泛 Audit Ignore。
- Phase 1 已实现：Node 统一为 `>=24.18.0 <25`，pnpm 固定 `12.4.1`，新增 `.node-version`、只读 `doctor`、离线 `docs:check`、`verify` 与保证恢复生产产物的跨平台 `release:check`；Chart 源码边界门禁进入 TypeScript 检查并增加 Fixture 测试。
- CI 已分为 Ubuntu `verify`、Windows 干净检出、PR Chromium Smoke，以及 `main` / 过渡期 `main-admin` / 手动运行的三浏览器和容器任务；同一 PR 自动取消旧运行，pnpm 与 Playwright 缓存按 Lockfile 隔离，证据保留期为 PR 14 天、主分支 30 天。
- Phase 1 在 pnpm 12.4.1 升级后的本地证据为冻结安装、`verify`、675 项覆盖率测试、生产审计零已知漏洞、Mock 构建、三浏览器 E2E `149/149` 和最终无 Mock 生产构建恢复。远端工作流尚未触发，Windows/Linux 托管证据、PR 中位时长与容器证据待 GitHub Actions 运行后补录，因此当前状态为 Implemented。
- Q1831–Q1835 确认 Phase 1 的收口标准：新版 GitHub CI 必须实际通过并形成 Linux、Windows、Chromium 证据，分支保护留到远端治理阶段；pnpm 与 GitHub Actions 升级到兼容的最新稳定 Major。
- PR 只保留 Ubuntu `verify` 与 Chromium Smoke；Windows、完整三浏览器和容器验证进入 `main`、手动或定期运行。生产依赖审计继续留在 `verify` 并失败关闭。`doctor` 补齐锁文件、环境变量和常见配置冲突，只报告问题与变量名，不输出配置值或秘密。
- Q1836–Q1841 确认使用 SHA 固定的官方 `pnpm/setup v2` 统一安装 Node 24、pnpm 12 和 pnpm Store 缓存，`packageManager` 是 pnpm 版本唯一来源；其他 Actions 同样升级到稳定 Major 的完整 Commit SHA。
- PR 的 Ubuntu `verify` 与 Chromium Smoke 并行且共同阻断。完整 Windows、三浏览器和容器矩阵覆盖 `main`、过渡期 `main-admin`、手动和每周任务；合入后移除 `main-admin` 触发器。Doctor 采用阻断与警告分级；本地验证完成后先暂停并报告，未经再次授权不 Commit/Push。
- Q1842–Q1845 确认完整矩阵每周一北京时间 10:00 运行；`verify`、Chromium、Windows、三浏览器和容器必须在同一 Commit 全部通过，Phase 1 才可标记 Executed。
- Doctor 检查实际存在的通用、Local、Development、Test 和 Production 环境文件，只报告文件、变量名与问题类型；未声明变量、危险的公开密钥命名、非法布尔/URL 及 Production Mock 阻断。pnpm 精确升级到 `12.4.1`，并由相同版本重新生成 Lockfile、执行冻结安装和完整 Release Gate。

<!-- AI modified: 同步 Q1842–Q1845 对定期矩阵、同 Commit 证据、安全诊断和 pnpm 12 迁移的确认。 -->

- Q1846 已实施：pnpm 固定 `12.4.1`，双文档 Lockfile 由同版本生成并通过冻结安装；CI 统一用官方 `pnpm/setup v2.1.0`，所有 Actions 固定稳定版本的完整 SHA。
- PR 的 `verify` 与 Chromium 并行；可信分支、手动和每周一北京时间 10:00 执行 Windows、三浏览器与容器，可信运行的 Chromium 证据由三浏览器任务提供，不重复 Smoke。Doctor 新增实际环境/锁文件诊断、脱敏 Fixture 和 CI 事件契约；Release Runner 复用 pnpm 原生执行路径，调用失败仍尝试生产产物恢复。
- 当前 Phase 1 保持 Implemented，升级后本地和托管证据分开记录。本轮未 Commit/Push，未修改远端保护；本机 Docker daemon 未启动，不能宣称容器验证已执行通过。

<!-- AI modified: 同步本轮已实施范围与托管证据边界。 -->

### API 与数据

<!-- AI modified: 托管验收执行授权与此前的本地验证范围分开记录。 -->

- 用户已授权整理相关依赖升级、安全基线与 Phase 1 工具链提交并推送到 `origin/main-admin`，跟踪并补录本次托管 CI；本地 `.codex` 不提交，不修改分支保护、不合并到 `main`、不发布制品。Phase 1 在托管验收实际通过前保持 Implemented。

- 首次已推送 Commit `6fc447e`，见 [托管 Run 34800164248](https://github.com/guoxk-me/gvueter/actions/runs/34800164248)：Linux `verify` 通过，Windows 契约门禁因路径分隔符导致测试/Mock 未排除而失败。原问题已由真实过滤谓词的 Windows/POSIX 回归复现，已修正路径边界并统一 Chart 诊断路径；仍需新版完整本地和托管验证，不降低 Schema 门禁、不跳过 Windows。

- Windows 路径兼容修复已通过完整本地 `release:check`：10 项工具 Fixture、676 项单元测试、三浏览器 `149/149`、全部门禁和生产产物恢复通过；仍需新 Commit 的托管矩阵，Phase 1 暂不标记 Executed。

- 首次托管 E2E 实际为 18 项截图失败、1 项 WebKit 分页 Flaky、130 项直接通过，容器未执行。Windows 路径修复已推送为 `639d5e6`，见 [新版 Run 34801243763](https://github.com/guoxk-me/gvueter/actions/runs/34801243763)：第二轮最终失败；Linux `verify` 通过，Windows 契约和工具回归通过，但 PWA 虚拟模块导入仍失败；E2E 为 131 项通过、18 项截图失败，本轮无 Flaky，容器未执行。已添加仅该测试文件的注册入口模拟，本地目标测试与静态检查通过，尚未提交；WebKit 分页本地连续 10 次零重试通过，首次 Linux 后退轨迹页面空白，尚未改业务行为。
- PWA 测试入口修复已通过完整本地 `release:check`（退出码 0）：676 项单元测试、三浏览器 `149/149`（零失败、跳过、错误）、全部门禁与生产产物恢复通过；用户已授权将修复和验收记录纳入本次本地提交，本轮不推送，仍需 Windows 托管验证。
- 待授权提案：旧截图缺少操作日志菜单，活跃率仍为 `75%`，当前 Fixture 为 `87.5%`；拟逐张验收并隔离 macOS/Linux Chromium 基线，不提高原容差、不删除几何/行为断言、不接纳 Flaky。批量更新被安全审查阻止，等待用户明确批准；原基线与路径配置未改变，Phase 1 仍为 Implemented。

- OpenAPI 是前后端传输契约的事实来源，使用 `openapi-typescript` 生成 TypeScript DTO 类型。
- 生成结果提交仓库，CI 检查是否与 OpenAPI 同步；Zod 继续负责运行时校验。
- Axios 统一处理请求头、超时、错误信封、请求 ID、上传下载和认证失效。
- Vue Query 管理服务端状态；Pinia 只保存跨页面客户端状态和偏好。
- MSW 提供确定性 Mock，生产构建不得包含或启动 Mock。

### 依赖与组件

- 保留 shadcn-vue Carousel、InputOTP 及其依赖，先作为未开放组件库存；补齐 Demo、测试和文档后再标记为稳定组件。
- 保留二维码 Demo；移除 `dayjs`，日期处理统一使用 `@internationalized/date` 与 `Intl`。
- 引入 Knip：未使用依赖和遗漏依赖阻断 CI，未使用文件和导出先只生成报告。
- Vue/VueUse 等稳定框架 API 可以自动导入；业务组件和工具函数保持显式导入。
- PWA 依赖保留但默认关闭，未启用时不得生成或注册 Service Worker。

### 质量门禁

- TypeScript 严格模式，ESLint 负责语义检查和格式化。
- Vitest 覆盖单元与组件测试，Playwright 覆盖登录、权限、导航和关键业务流程。
- CI 执行类型检查、Lint、测试、构建、OpenAPI 契约检查、依赖安全审计、Knip 和 Bundle 预算检查。
- 目录按职责组织，优先采用 `features` 垂直模块；避免为了“架构感”创建大量只有一个文件的目录。

建议目录：

```text
src/
├── api/
├── assets/
├── components/
├── composables/
├── config/
├── directives/
├── features/
├── layouts/
├── locales/
├── plugins/
├── router/
├── stores/
├── styles/
├── types/
├── utils/
└── pages/
```

## V1 验收标准

- 克隆、安装依赖并配置环境变量后可以直接启动。
- 登录、权限、动态路由、菜单、Tabs、KeepAlive、主题和核心管理页面形成完整闭环。
- 示例中心可以整体关闭，关闭后不影响核心后台能力。
- Light/Dark、中英文、舒适/Compact 及主要响应式宽度均可正常使用。
- API 可以由 MSW 切换至任意符合 OpenAPI 契约的后端。
- 类型检查、Lint、测试、构建、安全审计和契约检查全部通过。
