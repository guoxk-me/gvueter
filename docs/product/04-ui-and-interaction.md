# Gvueter Admin UI 与交互规范

<!-- AI modified: 汇总已确认的原型与交互规范，并显式区分设计目标、已有实现和待验收差异。 -->

> 更新日期：2026-09-20<br>
> 文档定位：V1 视觉、页面交互、组件组合和设计验收基线<br>
> 状态说明：已确认规则是交付目标；Inspected 表示已查阅仓库来源；静态画板不代表交互已经实现或通过测试。

相关文档：[产品总览](./01-product-overview.md)、[业务规则](./02-business-rules.md)、[技术开发](./03-technical-development.md)。本文件解释“如何呈现与操作”，权限判定、业务约束和接口语义仍由对应文档负责。

## 1. 使用范围与事实来源

本规范适用于后台 Shell、认证、Dashboard、用户/角色/菜单管理、示例中心，以及共享组件与状态。模板不是某个行业业务系统，界面应便于替换品牌、接入业务数据和扩展页面。

来源按职责使用：

- [产品与技术方案](../../e.md)：已确认的产品边界、核心能力和技术方向。
- [原型计划](../prototype-plan.md)：最新 Quiet Layers、组件、页面与 Sidebar 修订记录。
- `gvuter.pen`：设计资产、母版、实例、代表性静态状态与流程故事板。
- `/Users/guoxk/me/i/pen/basic.pen`：补充参考库；仅选择性吸收色阶、语义 Token 分类、组件状态组织、主题/响应式行为和交付治理思路，不作为第二套设计源，也不直接复制其变量、组件 ID 或 Master。
- [页面设计契约](../page-design-contract.md)、[UI 原语盘点](../ui-primitives.md)、[页面状态与 URL 契约](../page-state-and-url-contract.md)：已有实现的组合约束和工程事实；与新版产品决策冲突时作为迁移依据，不能反向覆盖新版原型。
- `src/`：实现现状。某个组件已经存在，不等于它已经符合本规范。

Layout / Design System 第一批运行实现已于 2026-09-20 落地；本文分别记录已实现内容和仍待迁移范围。历史文档中的测试和截图记录属于当时的证据，不能转述为本轮重新执行过的视觉或浏览器测试。

文中明确标为“本次细化建议 / 待评审”的交互是补充方案，不因出现在 UI 规范中自动成为已确认业务规则；确认前不计入正式验收门槛。

## 2. 视觉方向

### 2.1 Quiet Layers

正式方向是现代 SaaS Admin Dashboard：浅 Lavender 环境色、干净内容工作面、弱边界、Violet 状态线和选择性柔和阴影。

- 优先用留白、字号、字重、对齐和弱分隔表达层级。
- KPI 与简单摘要保持平面化；图表、列表、表格及需要浮起的主工作面按需使用 Surface。
- Header 不卡片化，Sidebar 不厚重；不将所有页面内容套进 Card。
- 不使用大面积灰色背景、密集边框或未经整合的上游默认样式。
- Dark 使用统一的中性暗色表面与可读边界，不采用黑 Sidebar 配白内容的割裂布局，也不以高饱和紫色铺满大面积背景。
- 错误、警告、成功等状态必须同时具备文字或图标线索，不能只依赖颜色。

`03D — Quiet Layers` 是正式视觉基线。`03A/03B/03C` 虽已同步新版菜单，但仍是 ARCHIVE；只保留探索主体视觉，不重新成为可选正式设计风格。

### 2.2 Token 分层

| 层级 | 职责 | 使用边界 |
| --- | --- | --- |
| Primitive | 基础色阶、间距、字阶、圆角等原始尺度 | 为语义层提供来源，不要求业务页面直接绑定具体色阶 |
| Semantic | 背景、前景、Primary、Surface、Muted、Stroke、状态和焦点等角色 | Light/Dark 和品牌切换在此建立完整映射 |
| Component | 少量确有独立规则的组件角色 | 复用语义层，不为每个页面建立专属主题体系 |

正式设计资产使用无版本号的 `gv-*` 命名空间。`p1-*`、`gv2-*`、`gv3-*` 和 `v2-*` 只保留在归档探索资产，不进入正式实例依赖。

Theme 状态分离 `selectedMode`、`resolvedMode` 和 `brandId`；根节点同时输出 `.dark`、`data-theme`、`data-brand` 与 `color-scheme`。表面分为 Background、Surface、Raised、Overlay，Sidebar 独立映射。Dark 使用暖 Stone/Charcoal，避免纯黑与大面积深紫；以亮度差和弱描边为主，阴影只强调 Overlay 与拖拽层。

功能状态色不随品牌改变，仅为 Light/Dark 调整对比度。图表使用独立分类色板，Chart-1 体现品牌，其他系列维持协调和稳定辨识，不借用 Success/Warning/Destructive。Focus、Selected、Active 分别通过 Ring、Soft Surface、强调线/前景色区分；插图映射 Primary、Primary Soft、Surface、Muted、Stroke。

工程中的 CSS 变量可保留适配 shadcn-vue 的命名，但必须建立清楚的语义映射。不能把“设计名不同”直接等同于错误，也不能用映射之名保留颜色、尺寸和状态行为的实际冲突。

### 2.3 字体、尺度与密度

| 项目 | 已确认基线 |
| --- | --- |
| 字体 | 本地 Inter Latin；中文回退系统字体，不依赖 Google Fonts |
| 间距 | 4px 网格 |
| 正文、常规数据 | 14px |
| 页面标题 | 28px / 700 |
| 区块标题 | 16px / 600 |
| KPI 数字 | 28px / 700 |
| 核心控件高度 | 32 / 36 / 40px；桌面常规 36px |
| 表格行 | 舒适约 44px，Compact 约 36px |
| 圆角 | 小控件 6px、常规容器 8px、大型 Overlay 10px |
| 移动关键操作区 | 至少 44px；视觉图形可小于可操作区域 |
| 默认桌面 Shell | Header 56px、页面边距 24px |

普通页面默认舒适密度，表格等密集区域可局部 Compact。密度变更同步控制行高、内边距和适用控件，不通过统一缩小所有文字实现紧凑效果。

长英文优先换行、重排或省略并提供完整信息；禁止为了塞入容器而临时缩小字号。按钮、标签与输入框高度不能因局部语言变化而失去一致性。

### 2.4 主题与外观设置

主题支持 Light、Dark、跟随系统；默认品牌 Violet，受控预设包括 Violet、Blue、Cyan、Green、Orange、Rose、Slate。

颜色、图表、边框、阴影、焦点、插图和功能状态一起切换。终端用户不直接输入任意品牌颜色，避免产生不可控对比度。

所有内置与项目 Palette 必须满足正文 `4.5:1`，大文字、图形和控件边界 `3:1`，并覆盖焦点与状态对比度。无效项目 Palette 不得出现在终端选项中，运行时回退 Violet。

Header 主题图标打开紧凑 Popover，并直接列出 Light、Dark、System；完整配置进入独立 Appearance Drawer。Drawer 只展示项目配置允许且已经验证的品牌预设、三种正式 Layout 与少量安全外观选项。Breadcrumb 图标依赖 Breadcrumb 开启，Tab 样式依赖 Tabs 开启；无折叠目标的布局不展示无效 Sidebar 配置。

Drawer 使用“主题模式 → 品牌色 → Layout → 界面显示 → 恢复设置”的单页纵向结构，顶部提供实时 Shell 预览；Desktop 宽 420px、Tablet 近全宽、Mobile 全屏。修改即时预览并保存，不提供“应用”按钮。内置七种品牌预设，项目可限制可见集合或通过强类型配置注册完整 Light/Dark Palette；运行界面不开放任意颜色。

`System` 作为独立偏好保存并实时响应操作系统变化。V1 按用户身份在本地保存带版本的外观偏好，迁移失败时安全回退，并为未来账号同步预留契约。普通页面固定 Comfortable，不提供全局 Compact；DataTable 等数据密集组件可局部切换密度。

主题切换不得重新加载应用或丢失路由、Tabs、查询缓存、表单草稿与滚动位置。颜色过渡控制在 `150–200ms`，Reduced Motion 下立即切换。

主题来源优先级为“当前用户偏好 → 项目默认”，只有保存为 System 时才读取并实时监听操作系统。游客偏好在用户首次登录且没有个人设置时继承；已有个人设置优先恢复，退出后恢复游客偏好或项目默认。同一用户多个标签页实时同步，迁移失败后 Drawer 内显示一次非阻断说明。

快速 Popover 使用图标、名称、说明和当前项 Check，并与 Drawer 共用 ThemeModeSelector。Drawer 的 Shell 缩略图只反馈结果，不直接承担控制。即时保存成功不弹 Toast，标题区短暂显示“已保存”；失败时显示可恢复警告。首屏在 Vue 挂载前应用 mode、brand 与 `color-scheme`，PWA 启用时浏览器主题色同步变化。

正式面板只提供 Sidebar、Top Navigation、Mixed 三种 Layout，不提供 `default/sm/md/lg` 全局组件尺寸，也不提供同时修改多类偏好的 Default/Ocean/Compact/Midnight 套装；后者如需演示只能进入示例中心。语言保留在 Header 独立入口。底部“恢复默认”经二次确认后只重置外观偏好。

内容宽度提供 Fluid/Centered，默认 Fluid；Centered 最大约 1600px，具体数值通过 Theme 原型复核。DataTable、复杂图表等页面可以声明 Fluid 覆盖，并显示当前页面覆盖说明。界面分区只显示项目已启用的 Breadcrumb、Tabs、Footer 与 Page Transition。Breadcrumb 关闭不改变 Header 高度；Tabs 关闭清理非当前缓存但保留当前任务；Footer 默认关闭；过渡仅 Off/Fade，Reduced Motion 下强制 Off。

Layout 切换仅重排 Shell，当前路由、Query、Tabs、表单草稿和滚动锚点保持，Appearance Drawer 不关闭。业务 Modal/Drawer 打开时 Header inert，不允许再叠加 Appearance Drawer。恢复默认回到当前项目配置值，不写死模板默认品牌或布局。

10 — Theme 规划为 Contract、Controls、Appearance Drawer、Theme Matrix、States & Responsive 五张 Candidate，位于 09E 之后。User Management 承担完整 Drawer 上下文，Dashboard 补充图表；七品牌使用紧凑矩阵，完整页面只验证 Violet Light/Dark、Blue Light、Orange Dark。Dark 局部样本覆盖 DataTable、表单、Popover、Drawer、Alert 和两类状态 SVG；响应式继续使用 1440、768×1024、390×844。

10A 为无 Admin Shell 的纵向规格板，只展开 Violet/Stone 代表 Primitive、完整 Semantic 和少量 Component Token，并同时说明名称、职责、Light/Dark 示例与使用边界。10B 的 System Trigger 使用 Monitor，约 280px Popover 显示三种模式和实时解析结果，选择后关闭，底部进入更多设置。

10C 固定 Header 显示标题、说明、保存状态与关闭按钮，Header 下方为不吸附的 16:9 Shell 实时预览。七品牌使用两列带文字和 Check 的选项；三种 Layout 使用结构缩略选择卡，窄屏纵向排列。Q1645 的回答曾误写为 Q1745，按上下文归一为 A。

10C 的 Breadcrumb、Tabs、Footer 使用 Switch，页面过渡 Off/Fade 使用分段选择；Fluid/Centered 使用带页面结构示意的双选卡。Layout 的选中态为品牌描边、轻 Ring 与 Check，品牌项为色点、名称、弱背景与 Check。Drawer 只固定 Header，Body 独立滚动并处理移动端安全区；恢复默认放在内容末尾，不设置固定 Footer。

10D 每个品牌至少展示主按钮、输入 Focus、Badge、选中表面、链接和分类图表色板，图表覆盖折线、柱状、环形。功能色通过 Alert、Badge、文字与图标组合展示，不能只靠颜色表达。Tablet Drawer 近全屏并保留约 48px 背景。Storage Failure 保留当前主题并在 Drawer 内提供重试；Migration Reset 回到项目默认，仅显示一次非阻断说明。

10E 的 Invalid Project Palette 仅作为开发者诊断契约，终端用户只使用安全回退主题。System OS Change 不改写 System 选择，只更新 resolvedMode；跨标签页默认静默同步，仅在打开的 Drawer 中短暂显示“已同步”。Storage Failure 可关闭 Drawer 并保留会话主题，Header 主题入口显示弱提示点，重新打开后继续重试。

Mobile Drawer 为不折叠的单页分区滚动，品牌项保持两列。420px Drawer 和 390px Mobile 都需验证英文长文本。模式、品牌、Layout 使用标准 Radio Group 语义、整项命中、方向键与可见 Focus；Overlay 关闭后焦点返回触发器。Saving/Saved 低干扰播报，Failed 提升优先级；Escape 关闭 Overlay 但不回滚即时设置。

Theme 代表页面必须复用相同内容、数据和滚动位置。10E 上方放三端真实界面，下方集中状态契约 Strip；验收同时覆盖引用完整性、无位图、语义 Token、Light/Dark 对比度、响应式溢出、英文压力与状态完整性。

七品牌展示顺序固定为 Violet、Blue、Cyan、Green、Orange、Rose、Slate；品牌 ID 稳定，名称跟随 Locale。Slate 保留为低彩度选项，但功能状态色不随品牌变化。Dark 中的品牌色仅用于交互、Focus、Chart-1 与小面积选中反馈，页面级对照固定为 Violet Light、Violet Dark、Blue Light、Orange Dark 的 `2×2` 矩阵。

Prototyped：`10A`–`10E` 五张 Candidate 已在 `gvuter.pen` 完成，并新增 ThemeModeSelector、BrandOption、LayoutOption、ThemeStatus 共享组件。所有主题图标、图表和状态图形使用语义 Token 驱动的矢量节点；`basic.pen` 仅作参考。预览见 `docs/assets/prototype/theme-10/`。该状态不等同于 Vue 运行代码已经实现。

Implemented / Inspected（2026-09-20，第一批）：运行 Shell 已收敛为 Sidebar、Top、Mixed 三种正式布局，旧布局偏好在读取时迁移；Sidebar / Rail / Mixed 次栏 / Flyout 使用 240 / 72 / 240 / 280px，Breadcrumb 进入 Header，搜索位于工具区首位。Quiet Layers、8px 基础圆角、暖 Stone/Charcoal Dark 和 150–200ms 动效已进入运行 Token；Appearance 面板只显示 Light/Dark/System、七种品牌、三布局与安全显示选项，不再显示混合 Preset、全局组件尺寸、语言或任意颜色。浏览器已检查 Sidebar 的 390/1024/1280、Top/Mixed 的 1280 以及 Light/Dark；这不代表 Theme 全部存储、同步、Palette 注册或所有 03–10 页面已经完成。

<!-- AI modified: 同步 Q1573–Q1692 确认并已绘制的 Theme 入口、品牌矩阵、状态响应式与验收结果。 -->

## 3. 页面与 Shell 结构

### 3.1 页面分区

页面由 Shell、Page Header、筛选/工具区、主体内容和适用的分页/反馈构成。业务页面不直接控制全局 Header、Breadcrumb 或 Tabs。

Page Header 负责标题、说明和页面操作；搜索表单负责筛选输入及适用的查询触发；DataTable 负责表格工作区；业务 Drawer 负责上下文编辑与详情。只有实际需要的区域才渲染，不保留空 Card 或占位工具栏。

主操作优先可见，次要操作在空间不足时进入可发现的操作菜单。危险操作与普通编辑操作区分并经过确认。窄屏允许标题和操作分行，不允许操作覆盖标题。

### 3.2 三种正式 Layout

| 布局 | 导航结构 | 规则 |
| --- | --- | --- |
| Sidebar，默认 | 左侧完整导航 + Header + Tabs + 内容 | 承载完整核心流程与主要状态矩阵 |
| Top Navigation | Header 中的顶层导航，目录展开子导航 | 保持全局工具可见，不靠挤压搜索或缩小菜单字号解决溢出 |
| Mixed | 72px 主模块 Rail + 按需 240px 上下文菜单 | 一级叶子页面不显示空二级栏；收缩后只保留一个 Rail，通过 Flyout 访问子菜单 |

三种布局共享授权菜单树、当前路由和 `activeMenu`，不各自维护一套权限模型。布局切换不得引入两列相邻的纯图标栏。

### 3.3 Header、Breadcrumb 与账号入口

- Breadcrumb 放在全局 Header 左侧，表达层级；不再单独占用桌面 Header 下方一整行。
- Header 右侧基线顺序：页面搜索、全屏、主题、语言、头像。若启用通知等增强入口，必须保持搜索第一、头像作为统一账号入口，并在布局验收中核对空间。
- Header 头像菜单承载个人信息、密码相关入口和退出登录；Sidebar、Rail、移动导航不重复放账号信息或头像菜单。
- 全屏入口作用于应用；表格和图表按需提供局部全屏，不能让两个入口含义混淆。
- Breadcrumb 与 Tabs 职责不同，同时存在；移动或低高度环境可压缩 Breadcrumb，不能把 Tabs 当作 Breadcrumb 替代品。

### 3.4 内容宽度与断点

| 视口 | 导航默认方式 | 内容验证重点 |
| --- | --- | --- |
| <1024px | 非常驻导航 Drawer | 完整导航可访问；正文单列或适合触控的重排 |
| 1024–1279px | 72px Rail | 仍保留桌面工作区，不能压垮表格或操作区 |
| ≥1280px | 240px 展开 Sidebar | 桌面用户偏好可覆盖初始展开状态 |
| 1440px | 主设计基准 | 验证三种正式布局与完整核心页面 |
| 1920px | Dashboard 内容约束在 1440px 左右 | 额外空间转化为留白，数据页可更宽 |
| 2560px | Dashboard 内容上限约 1600px | 不因宽屏无限增加信息列数 |

Form 和详情采用较窄阅读宽度；Table 可利用更宽工作区。页面不得整体横向溢出，表格和权限矩阵在自身容器内管理横向滚动。

## 4. Sidebar 与多级导航

### 4.1 展开与收缩

Sidebar 在 240px 与 72px 之间切换，主内容同步伸缩。展开态收缩按钮位于品牌栏右侧；收缩后 Logo 居中，右侧边缘提供独立展开入口。不能把 Logo 本身变成含义不清的唯一折叠按钮。

品牌栏固定，菜单区域独立滚动。当前页面改变时，将激活项滚入可视区域；滚动不移动品牌和折叠入口。

工作概览是一级页面；系统管理、运营、示例中心是目录。目录整行点击只控制展开，不同时跳转；允许多个目录展开。直接访问目录 URL 的重定向属于路由行为，不改变目录点击规则。

### 4.2 状态表现

| 对象 | 视觉与交互 |
| --- | --- |
| 默认项 | 中性文字与图标，适度 Hover 反馈 |
| 当前叶子 | 浅 Violet 背景 + 左侧细线 + 当前项语义 |
| 当前祖先 | 仅强调文字、图标和 Chevron，不伪装成第二个已选叶子 |
| 目录 | 行尾 Chevron，收起向右、展开向下 |
| 隐藏辅助页 | 通过 `activeMenu` 高亮所属可见菜单 |
| 无权目录 | 权限过滤后无可访问后代则整体隐藏 |
| Badge | 展开显示完整提示，收缩显示数字或圆点 |
| 外链 / iframe | 展开时显示行尾轻量标识，收缩时在 Tooltip/Flyout 解释 |
| 长名称 | 单行省略；Hover/Focus 可查看完整名称，不缩小字号 |
| 缺失图标 | 统一中性占位图标；开发环境提示配置问题 |

桌面顶层行高 40px、子级 38px，每级约 16px 缩进。正式产品导航最多三级，更深层级只在示例中心演示能力。

### 4.3 Collapsed Flyout

收缩态叶子图标带 Tooltip，点击直接导航；目录通过 Hover、Focus 或点击打开 280px Flyout。

- 只使用一个面板，通过缩进展示完整子树，不使用多列级联弹层。
- 触发器和面板之间保留指针交互桥，经过间隙不应误关闭。
- 指针离开约 200ms 后关闭；焦点仍在面板内时保持打开。
- 页面跳转、外部点击或 Esc 关闭；展开内部目录不关闭整个面板。
- 飞出层内容需要滚动时在面板内滚动，不能截断末尾菜单或把面板推出视口。

### 4.4 状态保存与权限更新

授权菜单树、当前路由与 `activeMenu` 共享；栏宽偏好与目录展开状态均按“用户身份 + Layout 类型”隔离。前者保存在 `localStorage`，后者保存在 `sessionStorage`。

同一 Layout 的 Sidebar、Rail 和移动 Drawer 共享目录展开状态。退出清理目录会话状态，保留该用户栏宽偏好；身份变化不得沿用上一用户的授权树。

首次进入自动展开当前页面祖先，其余读取会话记录。后台刷新导航配置时保留合法旧内容；成功后更新树，已失效页面按权限与路由规则回退，不保留可继续点击的无权入口。

### 4.5 移动导航与键盘

导航 Drawer 宽度是 `min(320px, 100vw - 48px)`，与业务编辑 Drawer 的移动全宽规则不同。页面点击后关闭，目录点击保持打开；再次打开保留本次会话状态。

关键操作区至少 44px。目录提供 `aria-expanded`、`aria-controls`；方向键移动焦点，左右键展开/收起，Enter/Space 执行，Esc 关闭 Flyout。焦点须始终可见，不能仅支持鼠标 Hover。

Sidebar 宽度与文字动效约 180ms，子树与 Chevron 约 150ms。Reduced Motion 下取消位移动效，状态变更和可操作性保持一致。

## 5. Tabs、KeepAlive 与页面搜索

Tabs 默认开启且可配置关闭，Dashboard Tab 固定。标签是页面任务身份，不是接口缓存；菜单、Breadcrumb、Tabs、KeepAlive 和搜索使用统一路由元数据。

- `tabKey` 表示标签实例，稳定 `cacheKey` 对应可缓存页面；不得用显示名称当身份。
- 已允许的筛选 Query 改变时更新同一逻辑 Tab 的 `fullPath`，不能每次搜索都新建一个同名标签。
- Tabs 默认会话存储，可配置持久化；只保存可恢复身份和必要 UI 状态，不保存接口响应。
- 刷新恢复先重新验证路由与权限；关闭标签、退出、身份变化清理对应 KeepAlive。
- 已确认 KeepAlive 默认 LRU 上限为 10，可配置；是否实际实现见差异清单，不将原型描述视为性能验证。
- 返回列表时区分页面局部状态与 Vue Query 缓存，保留筛选和合理浏览上下文，但不能显示上一身份的敏感数据。

页面搜索使用 Command Palette，V1 只搜索当前用户有权限的页面。有权限但菜单隐藏的辅助页可收录；依赖动态参数的页面只有合法参数齐全时才可跳转。

搜索结果标题、路径和上下文应能帮助区分重名页面。无结果与网络失败分开：前者提示调整关键词，后者按所属区域给出恢复动作。关闭搜索后焦点回到触发器，键盘可选择并进入结果。

## 6. Actions 与 Form Controls

### 6.1 操作组件

Button 的正式变体为 Primary、Secondary、Outline、Ghost、Destructive、Link；IconButton 使用相同层级。

按适用性覆盖 Default、Hover、Focus、Pressed、Disabled、Loading、Selected。Disabled 表示当前不能执行；未授权操作应隐藏，不能使用 Disabled 代替权限控制。

Loading 保持原宽度和主操作对比度，使用内联 Spinner 并阻止重复提交。只有图标的按钮必须有可访问名称，Tooltip 不能是唯一命名来源。

### 6.2 Field 与控件职责

Field 统一管理 Label、必填标记、说明和错误；Control 负责自身输入、选择、焦点和开关状态。错误信息靠近字段并与真实输入建立语义关联。

| 控件 | 适用范围 | 组合约束 |
| --- | --- | --- |
| Input / Textarea | 单行或多行输入 | 有明确标签；Placeholder 不替代 Label |
| Select | 短且固定的选项 | 不为少量固定项强加远程搜索 |
| Combobox | 搜索、远程选项或较多选项 | 选项查询用 Vue Query，输入词与弹层状态保留本地 |
| Checkbox / RadioGroup | 多选与互斥选择 | 标签可点击；紧凑视觉仍保证可操作范围 |
| Switch | 明确的开关语义 | 必须交代即时生效还是随表单提交 |
| DatePicker | V1 单日与日期范围 | 草稿和已应用查询条件分离，语言决定展示格式 |
| FileUpload | 选择和拖放上传 | 展示等待、上传中、成功、失败及适用的重试/取消 |

校验使用 VeeValidate + Zod；前端校验不能替代服务端校验。提交失败保留用户输入，服务端字段错误回填对应字段；提交后焦点定位首个无效字段，不能只弹一个 Toast。

冲突、部分成功和权限变化需要在当前任务上下文解释。不能因一次接口失败清空整个表单，也不能将已提交成功的部分误报为全部失败。

## 7. 认证页面与密码输入

### 7.1 Auth Shell 的含义

`05A — Auth Shell Pattern / Anatomy` 是结构规范，不是独立产品路由；它展示桌面 56/44 双栏、约 420px 认证内容宽度、品牌语境及主题/语言入口。

`05B — Login & States` 中的 Login Form Recipe 是唯一登录表单基准。05A 通过实例引用它说明外部结构，不能再维护另一份长相不同的登录表单。认证页不复用后台 Sidebar/Tabs Shell。

移动端聚焦认证任务，缩减品牌展示但保留登录、恢复和语言/主题能力。Dark 同样使用现代中性表面，不另造一套控件风格。

Implemented（首批运行实现）：[AuthLayout](../../src/layouts/AuthLayout.vue) 已采用桌面 `56/44` Quiet Layers 双栏与移动端精简 Shell，[LoginPage](../../src/pages/auth/LoginPage.vue) 复用唯一登录表单且不再套用厚重 Card。1440×900 实测左右宽约 `806/634px`，登录表单 `420px`；390×844 实测无水平溢出，账号、密码、验证码及主/SSO 操作在移动端均为 `44px`。Light/Dark 已完成浏览器视觉检查。

Implemented（Recovery Flow）：[ForgotPasswordPage](../../src/pages/auth/ForgotPasswordPage.vue)、[ResetPasswordPage](../../src/pages/auth/ResetPasswordPage.vue) 与 [SsoCallbackPage](../../src/pages/auth/SsoCallbackPage.vue) 已复用同一 `420px` 无 Card 认证配方。找回结果保持中性；重置成功、Token 失效与 SSO 失败均为可聚焦的页内状态，不依赖临时 Toast 表达关键恢复路径。

### 7.2 密码控件统一

登录、重置、确认密码、注册、Dark、移动和验证码状态共享密码输入原语：桌面 36px、移动 44px，6px 圆角、13px 掩码字体及统一左内边距，右侧只有 Eye Ghost IconButton。

显示/隐藏只改变掩码，不提交表单或丢失输入。按钮名称随状态更新；校验、禁用和自动填充属性传到真实输入。密码控件不使用携带邮箱语义的完整字段作为替身。

Implemented：[LoginForm](../../src/features/account/components/LoginForm.vue) 已改用共享 [PasswordField](../../src/components/admin/PasswordField.vue)，显示/隐藏按钮、自动填充、禁用与校验属性落到真实输入；Submitting 维持原输入内容和按钮几何，并暴露 `aria-busy` 与 `aria-live`。SSO 配置读取期间不渲染虚假入口，配置失败仍保留轻量重试。

共享 PasswordField 现已同时用于 Login 与 Reset；390px 实测输入组和显隐按钮操作区均为 `44px`，桌面仍回落为 `36px`，避免移动端只有图标可见但命中区域过小。

### 7.3 登录状态矩阵

| 状态 | 核心表现 | 不允许的退化 |
| --- | --- | --- |
| Default | 账号、密码、全宽主操作保持一致 | 各页面拼装不同基础登录表单 |
| Validation Error | 字段就近提示，首错可定位 | 只显示顶部错误或清空输入 |
| Submitting | 保留输入上下文，禁用编辑，Primary Pending 按钮 | 按钮宽度跳动、对比度丢失、重复请求 |
| Captcha Required | 在原核心表单上增加验证码槽位 | 用验证码替换密码字段或自行猜测触发阈值 |
| Account Locked | 表单级 Alert，按后端 `retryAfter` 展示恢复信息 | 前端自行决定锁定时间 |
| System Error | 保留表单，提供适用重试和 Request ID | 暴露内部堆栈、误称密码错误 |

Login State Strip 用 3×2 对照，六态共享约 420px 核心几何。Captcha 和 Alert 只是增量，Submitting 带 `aria-busy` 与适当的 `aria-live`。SSO Availability Error 独立于六个核心状态。

账号接受用户名或邮箱；V1 核心不承诺手机号登录，不提供“记住我”复选框。注册默认关闭，SSO 配置确定后才渲染入口。验证码、锁定和重置 Token 有效性以服务端为准。

安全反馈不能帮助枚举账号：格式问题可定位字段，认证失败使用安全且可恢复的提示；找回密码发送结果保持中性。重置成功、链接失效、SSO Callback 和可选注册各有独立流程状态。

认证运行迁移现已覆盖 Login、忘记密码、重置密码、Token 失效/成功与 SSO Callback，但不修改 OpenAPI 认证 DTO：用户名或邮箱、自适应 Captcha、后端 `retryAfter` / Request ID 仍是后续契约迁移，现有邮箱、始终验证码及前端 Demo 锁定不能视为目标状态已完成。可选注册页仍待项目配置能力落地。

Executed（2026-09-20）：认证相关 45 项单元测试、Type Check、ESLint 与生产构建通过；Chromium Axe 在 Login、Forgot Password、Reset Password、SSO Callback 及代表性后台页面的两组用例 `2/2` 通过。浏览器已检查 1440×900 Light、390×844 Dark、Token 失效和 SSO 失败，无水平溢出。

## 8. Dashboard 与权限状态

默认桌面信息顺序为页面操作、四项 KPI、8/4 趋势与角色分布、5/7 待处理事项与最近活动、全宽紧凑系统健康条。避免所有区域同等强调。

- KPI 与图表响应全局日期范围，其他模块保留各自时间口径；日期草稿不立即发请求。
- 趋势采用 Violet 主线和中性次线，角色分布用前五角色加“其他”的横向排名条形图。
- 首次加载只为有权且实际注册的模块显示几何匹配 Skeleton；KPI、图表和表格骨架分别匹配内容。
- 后台刷新保留旧内容，各区域独立展示刷新状态；局部失败不使整个 Dashboard 变为错误页。
- 权限变化重新计算模块并取消失去权限的查询；移除模块后重新排版，不保留空槽。
- 无可见模块保留 Dashboard Shell，展示中性页面状态和共享 Forbidden 矢量；不注册模块 Query、不显示加载骨架、不自动跳转 403。

390px 时 KPI 为 2×2，其后趋势、角色分布、待办、活动和系统健康单列排列。待办默认展示 3 条、活动 4 条并保留“查看全部”，健康指标采用 2×2 弱分隔。

移动日期选择用 Bottom Drawer：快捷范围、自定义起止、取消、应用；应用后关闭并保留旧数据刷新。日期面板在当前容器内展开，不嵌套 Drawer。

触摸图表保留定位线、数据点与固定读数区域，不把 Hover 作为读取数值的唯一方式。图表需随容器重测尺寸，减少轴标签时不删除指标含义。V1 Dashboard 不提供用户拖拽模块或布局持久化。

## 9. DataTable、SearchForm 与业务组合

### 9.1 唯一增强入口

轻量 `Table` 保留原生语义结构；业务列表统一以 `DataTable` 作为公开增强入口。原 ProTable 高级能力并入模块化 DataTable，不维护两个长期竞争的业务入口。

DataTable 显式区分 Local/Remote。简单静态表格不承担 Vue Query 和 TanStack Table 的运行成本；增强能力通过配置和高级插件启用，不能因为统一入口而强制每页加载所有功能。

SearchForm、DataTable、FormDrawer 独立可用。已确认提供 `ListWorkspace` 视觉 Shell 与 `useListWorkspace` 协调层，统一布局、已应用条件、URL、选择及 Drawer 上下文，不绑定业务 API，也不重复创建 Query 缓存。配置描述重复结构和行为，复杂单元格、特殊编辑器和业务动作保留类型化插槽/回调扩展；最终 Props/插件签名在实现迁移时定稿。

### 9.2 列表交互

- 默认搜索分离草稿与已应用条件，点击查询或适用字段 Enter 后生效并回第一页；重置立即恢复默认并查询。即时查询由页面显式启用。
- 默认将已应用筛选、分页、页大小和排序同步到白名单 URL，省略空值与默认值；浏览器前进/后退恢复可见控件，草稿和已选行不进入 URL。高级筛选展开状态保留在当前逻辑 Tab 会话。
- 表头排序状态、已选数量、可用批量操作和分页范围应清楚可见；不可选择行应有可理解原因。
- 表格、分页共用一个工作面，分页位于表格边界内；横向滚动只作用于表格区域。
- 行操作使用可发现的操作菜单，不依赖右键；危险操作有独立确认。
- Remote 模式管理取消、缓存、保留旧数据、重试、刷新及可选轮询；Mutation 成功精确更新或失效相关 Query，不全站盲目刷新。
- 首次加载显示匹配 Table Skeleton，刷新保留旧行并明确标记；仅在确认当前有权数据集本身无记录时用 First Use，筛选无结果用 Search Empty，明确无权用 Forbidden。空当前页不能推断全库为空。
- 默认每页 20 条，可选 20/50/100/200；默认页内选择，跨页保留须显式开启并展示范围。筛选、排序、页大小或显式刷新默认清空选择；列显隐、顺序和密度按用户与稳定 Table ID 记忆，可恢复默认。

### 9.3 虚拟滚动与树表

分页和虚拟滚动可以组合：单页 200 条也可以按配置开启虚拟滚动。分页决定获取的数据范围，虚拟化决定当前渲染的行；两者不能互相冒充，也没有“200 条必开”的固定门槛。

树表先将已展开节点形成可见行序列，再按稳定 `rowId` 虚拟化。折叠节点的后代不占可见行位置；远程未加载的后代不能通过本地虚拟化凭空获得。

需验证展开/折叠后的滚动位置、行高测量、焦点、选择与排序语义。插件组合没有经过验证时不承诺任意组合可用，复杂合并单元格或动态高度必须单独提供验收证据。

### 9.4 09A — 用户列表基准

<!-- AI modified: 将 Q1147–Q1246 确认的页面级构成接入已有 Master，并区分 09A 绘制与后续规划。 -->

`09A — List Workspace · CANDIDATE` 复用统一 Sidebar/Header/Breadcrumb/Tabs，激活用户管理。1440px 中文 Light 主页面展示正常已加载列表；平面 Page Header 使用“用户管理”和简短说明，右上只突出“新增用户”。SearchForm 用弱分隔与 DataTable 主工作面建立层次。

SearchForm 收起态首行四等分：关键词、状态、角色和按钮组各占一格；Label 与控件共同填满字段容器，查询、重置和更多筛选在按钮格内保持内容宽度、右对齐并与控件底部对齐。展开后，按钮组不固定在右上角：第一行补入部门，第二行由创建时间和最后登录时间各跨两格组成，按钮组跟随全部筛选字段落在最后一行并右对齐。时间范围采用带日历入口、开始日期、方向提示和结束日期的组合控件；中等宽度切为 `2×2`，移动端单列且操作组独占一行。

| 区域 | 已确认呈现 |
| --- | --- |
| 默认搜索 | 关键词、状态、角色、部门、查询/重置；更多条件原位展开创建及最后登录时间，移动端使用 Bottom Drawer |
| 条件摘要 | 仅非默认已应用条件出现，可逐个移除或清除全部；高级区域收起不隐藏生效状态 |
| Table Toolbar | 左侧导入/导出，右侧刷新/列设置/密度；按权限和配置显示，图标动作有名称或 Tooltip |
| Selection Bar | 在原 Toolbar 区域切换，显示数量、范围、清除及启用/停用/导出所选/删除；保留必要结构操作，不默认提供批量角色分配 |
| 用户与数据列 | Avatar + 姓名/邮箱两级信息；状态 Badge、角色、部门、最后登录、创建时间、操作 |
| 记录操作 | 姓名链接打开详情，直接显示编辑；More 包含查看、分配角色、启停、删除，危险动作确认；整行点击默认关闭 |
| 表格滚动 | 左侧 Checkbox/身份按场景固定，右侧固定操作；横纵滚动限于表格内部 |
| 分页与可见行 | 20 条当前页可由内部滚动视口露出约 8 条；“1–20 / 共 248 条”必须对应实际当前页范围，不能用 8 条数据伪装 20 条 |

Supporting Scenes 覆盖高级筛选展开、已应用条件、批量选择、首次加载、Refreshing、Search Empty、Error、Offline。主题化 SVG 插图直接融入工作面，不另加违和白底。画板按说明→完整主页面→Search/Selection 场景→Query 状态条→契约与响应式说明阅读。

移动端按列显式优先级保留关键信息，允许表格容器横向滚动，次要字段进入只读全宽 Drawer；行操作从桌面 DropdownMenu 改用 Bottom Drawer。桌面完整分页与页大小，移动端显示上一页/下一页及范围摘要。

### 9.5 09B — CRUD Flow

<!-- AI modified: 将 Q1247–Q1310 已确认并绘制的用户 CRUD 主流程与异常场景接入 UI 规范。 -->

`09B` 使用纯结构 BusinessDrawerShell 与 UserCrudRecipe 组合。桌面宽 640px，固定 Header/Footer、Body 独立滚动；表单采用单列弱分区，仅天然组合的短字段并排。Create、Detail、Edit 均在 User List Shell 中验证，不嵌套业务 Drawer。

- Create 包含姓名、唯一登录邮箱、国际手机号、单一主部门、多角色和邀请选项；不显示状态选择，主按钮随邀请选项显示“创建并发送邀请”或“创建用户”。角色为空时提示暂无业务权限。
- Detail 以身份摘要开场，按基础信息、组织归属、角色权限、账号活动分区；“编辑用户”为主操作，邀请、密码、状态、锁定和删除进入 More。待激活状态就近显示发送时间、有效期和重发入口。
- Edit 保持邮箱只读并提供同 Drawer 子流程；角色无分配权时只读。多角色选择、有效权限摘要和状态操作复用 Permission 规则。
- Loading 使用结构匹配 Skeleton；Submitting 保留正文并锁定关闭/取消/重复提交。422 同时显示顶部摘要和字段错误；409 只比较变化字段。邀请部分成功转为结果状态；403、远端删除和 Dirty Close 均保留草稿及明确恢复动作。
- 删除使用输入姓名/邮箱的 AlertDialog，只有已禁用用户可逻辑删除；成功 Toast 提供短时撤销。创建成功但不匹配当前筛选时保留筛选，并在 Toast 提供“查看新用户”。

两张 Candidate 为 Main `egyuC`（`56924, 4736`，`1840×3768`）与 States `b2EZ5`（`58884, 4736`，`1840×3510`）。响应式与代表性 Dark/英文仍留到 09E；静态原型不等于运行实现。

### 9.6 09C–09D 已绘制与 09E 后续规划

以下记录 09C–09D 已绘制 Candidate 及 09E 的后续范围；均不据此标记运行实现完成：

- `09C Form Recipes`：拆为 Basic、Content Workbench、Step、Dynamic 和 States 五组。Basic 为示例中心的团队资料独立页面，正文约 760px；Content Workbench 为内容管理中的公告/文章发布；Step 为示例中心四步内部集成应用；Dynamic 为示例中心的站内信、邮件、短信和 Webhook 通知规则。SearchForm 只引用 09A；主画板展示正常流程，异常集中到 States。本轮绘制范围为 1440px 中文 Light，390px、Dark 和英文仍由 09E 验收。
- Basic 使用名称、只读标识、联系邮箱、行业、规模、时区、简介和公开开关，底部为放弃修改/保存更改；保存后留在当前页。Step 左侧展示四个垂直步骤：基本信息、权限范围、环境与回调、确认创建，最终一步才创建资源。Dynamic 左侧为四渠道状态列表，右侧只显示当前渠道配置，整条规则统一保存。
- 页面型 Recipe 复用 `FormPageShell`，长流程按需组合 `DraftAdapter`；页面 Shell 不替代 Drawer，也不通过大 Card 包裹所有内容。Content 和 Step 可以恢复主体隔离的会话草稿，Basic 不启用持久草稿。
- Content Workbench 主区包含公告元数据、富文本正文和可选封面/附件，右侧窄摘要栏在视口内保持可见；底部固定区依次承载返回、预览、保存草稿和主操作发布。预览打开新的应用 Tab。自动保存成功显示最近保存时间，且以独立文案保留“未发布修改”；保存中或失败时离开需要确认。
- Step 的已完成节点可点击返回，未来节点保持锁定；成功状态集中展示可复制的 Client ID 和一次性 Secret。Dynamic 左侧渠道项显示启用与错误 Badge，右侧切换配置不弹确认；错误同时以顶部摘要、渠道标记和行内信息表达。关闭渠道保留非敏感输入，但敏感值只显示掩码或需重新验证。
- `09C.5 — States` 以一张画板按验证、提交、草稿、冲突和结果分区。校验在交互后的失焦出现，提交时摘要可定位首错；自动保存状态常驻标题或摘要，不为每次成功弹 Toast。草稿恢复与过期使用页内 Callout，409 通过页内提示进入差异 Drawer；上传失败在单文件上恢复。
- 窄屏下 Basic 保持单列、16px 边距和底部吸附操作；Content 将右侧发布摘要移动到正文下方并折叠；Step 将左侧垂直 Stepper 改为顶部紧凑进度和“第 N/4 步”；Dynamic 将渠道列表改为顶部横向滚动 Tabs，状态与错误 Badge 不丢失。
- 09C 最终拆为五张 Candidate，顺序为 Basic、Content、Step、Dynamic、States。四张主页面使用完整统一 Shell，States 使用局部上下文。Basic 为 760px 三组表单；Content 为自适应编辑区加约 320px 摘要；Step 为 240px Stepper 加 720px 正文；Dynamic 为顶部共享规则加渠道双区。
- 富文本工具栏单行放高频操作，低频项进入更多菜单；封面为紧凑 16:9 区域，附件为独立列表。Secret 默认遮挡并可显示/复制。渠道行同时展示图标、名称、开关和 Badge，激活态使用浅 violet 背景。States 避免满屏白色 Card，成功结果使用遵循 Not Found 视觉语言的主题化 SVG。
- 原型使用真实感中文内容，技术说明放在页面帧之外；全部控件优先引用 04B 共享资产。09C 只附响应式注释，移动端、Dark 与英文完整帧不提前侵入 09E。五张 Candidate 已绘制并保存；Basic、Step、Dynamic 的菜单上下文为“示例中心”，Content 为“内容管理”，且均保留共享 Shell Ref。
- `09D Advanced Operations`：按 Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States 五张 Candidate 组织，均位于示例中心。640px 导入 Drawer 展示上传→校验预览→结果，关闭后保留最近任务摘要；导出明确范围并持续展示异步状态。各场景复用同一 DataTable 入口并按需启用插件，只展示主流程、关键异常、结果和契约。本轮为 1440px 中文 Light，完整响应式、Dark 与英文仍归 09E。
- Import Drawer 以 CSV 为默认格式并提供版本化模板，XLSX 与字段映射按能力出现；上传后先展示预览、统计、重复策略和行级错误，再由用户确认。提交后可关闭并在页面查看任务摘要，错误文件和失败行重试从结果态进入。Export 明确当前页、已选记录、全部筛选结果及实际字段；小范围直接下载，大范围显示持续任务状态和下载入口。
- Export & Batch 对高影响操作使用 AlertDialog，结果摘要留在页面，逐项明细和失败重试进入 Drawer。Inline Edit 使用商品价格与库存：行尾显式进入编辑，单行编辑时显示保存/取消、校验与冲突反馈；脏行切换需要确认，保存后记录按当前筛选排序移动时明确提示。
- Tree Table 分别展示 Local 与 Remote 模式，节点内承载局部加载、错误和重试；搜索保留祖先路径，选择默认不级联，展开仅按当前 Tab 会话恢复。Virtual List 使用只读审计事件流、可预测行高和底部续载；阅读中到达的新事件显示计数入口，不造成滚动跳跃。
- 五张画板按 Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States 排列；前四张使用完整示例中心 Shell，States 使用局部上下文。Import 以用户列表和 640px Drawer 组合，预览使用统计摘要及紧凑错误表；Export 使用 480px Drawer，复杂配置可扩至 640px，批量结果明细进入独立 Drawer。
- Inline Edit 的活动商品行使用浅色层、明确边界和保存/取消，409 差异在行下展开。Remote 组织树为主场景，Local 以能力说明补充；审计事件详情进入右侧 Drawer，主列表不依赖任意动态高度。跨插件 States 继续复用主题化 SVG，不创建 09D 专属插图。
- 兼容矩阵以 Supported、Conditional、Experimental、Unsupported 四级展示；共享 Recipe 为 ImportDrawerRecipe、ExportDrawerRecipe、BatchResultDrawer、InlineEditRow 和 AsyncTaskSummary。键盘说明覆盖 Drawer 焦点、行编辑 Enter/Esc、树方向键和虚拟列表焦点锚点。
- 顶层画板保持 1840px 宽、内容自适应高度和 120px 间距；技术注释放在页面帧外。Import 主画面停留在校验预览，Inline Edit 主表只保留一条正常编辑行，Tree 展开三级，Virtual 视口展示约 10–12 条并使用“已加载 / Cursor / 总量未知”语义。
- States 按 Upload/Task、Mutation/Conflict、Tree/Virtual、Permission 分组。阶段任务使用 Progress，首次表格加载使用结构匹配 Skeleton，分支加载使用节点内 Spinner。中途失权只显示安全摘要，不保留受保护数据或可继续执行的控件。
- 兼容矩阵中 Remote/Pagination/Selection/Batch 为 Supported；行编辑与数据集变化、Tree/Virtual、Tree/Inline Edit 为 Conditional；Inline Edit/Virtual 和 Dynamic Height/Virtual 为 Experimental。画板完成后仍标记 Candidate，等待 09E 与运行验收。
- Import 统计显示 32 行中的 25 可导入、3 跳过、4 错误，错误表覆盖格式、重复、权限和公式风险。Export 以 20 条当前页、8 条已选和 1,284 条筛选结果对比直接与异步导出；Batch 结果显示 6 成功、1 跳过、1 冲突。行编辑 409 提供载入最新值或保留当前修改，不提供强制覆盖。
- Inline Edit 的金额输入按当前 Locale/Currency 显示，库存只接受非负整数；界面格式化不能改变最小货币单位整数的提交语义。库存为 0 时显示缺货，上架状态缺少价格或仓库时在当前行阻止保存。
- Tree 未加载节点显示后代提示，只读节点显示锁定；新增下级 Drawer 显示父级路径。Audit 使用本地化绝对时间、辅助相对时间和服务端脱敏详情。任务只有在服务端提供 completed/total 时显示百分比，否则使用不确定进度。
- 五页导航统一为“示例中心 > 高级操作 > 当前页面”，Tabs 为用户导入、导出与批量、行内编辑、组织树表、审计事件。每张画板帧外只保留数据契约、状态所有权、插件依赖和响应式规则四组注释。
- `09E States & Responsive`：作为代表性跨场景验收矩阵，而非组件图鉴或全部页面的全组合复制。1440px 继续作为 Desktop 基线，新增 768×1024 Tablet 与 390×844 Mobile；移动端应完成核心查询、查看、新建、编辑和必要审批，通过折叠、分步及全宽 Drawer 降低密度。
- 状态覆盖 Loading、Skeleton、Empty、Error、Offline、Forbidden、Search Empty、局部 Refreshing 与 Submitting。每种状态至少进入一个窄屏代表场景，高风险状态再补第二尺寸。Dark 使用完整 User List、编辑 Drawer和局部高级表格验证语义表面；英文对导航、筛选、表格列、Drawer、状态文案和按钮进行长文案压力测试。09E 完成后仍为 Candidate，运行时响应式、触控和浏览器行为另行验收。
- 768×1024 以 User List、展开筛选和近全宽 Edit Drawer 为代表。表格保留用户、状态、角色、最后登录与操作等优先列，次要信息进入详情；仅极端内容允许表格内部横向滚动。390×844 覆盖 User List、全屏 User Drawer、Step Form 和状态；用户数据改为弱分隔紧凑列表行，不使用逐项 Card 或桌面表格横向滚动。
- 高级 Dark 采用 Inline Edit；英文采用 768px 组合压力场景。Offline、Forbidden、Submitting 与阻断型 Error 同时验证 Tablet/Mobile。1024×768 不增加静态画板，沿用 Rail 契约并进入真实浏览器验收；原型只画应用视口，不增加设备外壳。
- 09E 分为 Responsive List、Mobile Flows、Responsive States、Dark、English Stress 五张 Candidate。Responsive List 同板比较完整 768/390px User List，并补导航 Drawer、筛选和选择模式。390px 常驻关键词与筛选入口，高级条件进入 Bottom Drawer；修改不即时请求，应用后查询并显示条件摘要。
- 移动批量选择通过明确入口开启，显示 Checkbox、数量和吸底操作栏；身份区域进入详情，编辑直接显示，其余动作进入 More。分页简化为上一页、当前页和下一页。768px Edit Drawer 为 720px、左侧保留 48px 上下文；390px 为 edge-to-edge 全屏，均固定 Header/Footer、Body 独立滚动。
- Mobile Step Form 使用“第 N/4 步”、当前步骤名和进度条，展开清单只允许返回已完成步骤。Mobile 使用单一页面滚动；Tablet DataTable 可使用受控内部滚动，打开业务 Drawer 后背景不参与纵向滚动。
- Responsive States 按 Query、Permission、Mutation 分组。首次 Loading 使用结构匹配 Skeleton；Refreshing 保留旧数据和操作上下文。First Use Empty 与 Search Empty 分别提供新增和清除筛选，均使用透明主题 SVG，不增加白色状态 Card。
- Offline 以 Tablet 有缓存降级和 Mobile 无缓存恢复成对验证；Forbidden 以 Tablet 页面级无权和 Mobile 编辑中失权成对验证；阻断 Error 分别使用列表首次失败和 Drawer 依赖数据失败。Submitting 保留表单和值并锁定可变控件、关闭和重复提交，失败后恢复草稿。
- Dark 画板分为完整 User List、打开 Edit Drawer 的列表、Inline Edit 活动行与 409。暗色层级依靠中性表面亮度差、弱描边和克制阴影，Violet 只用于强调、焦点和选择。英文采用真实业务文案，并主动覆盖约 30%–60% 的长度扩张。
- English Stress 中 Label 与说明可以换行，按钮主文案保持单行；姓名、邮箱和表格内容按列规则省略并提供 Tooltip，关键状态、验证和错误不得截断，也不通过缩小字号解决。场景同时采用 en-US 日期、时间、数字及复数格式，并加入较长英文姓名和角色名。
- Responsive List 复用 09A 数据。768px 主场景关闭导航 Drawer，另以 Supporting Scene 展示 320px 打开态；390px 首屏约五条紧凑记录。移动选择底栏显示数量、启用、停用和 More，导出/删除进入 More，删除仍需确认。
- Mobile Flows 使用 Edit User。字段全部单列，多角色和权限摘要自然换行；虚拟键盘出现时固定 Footer 位于可视安全区上方，Body 确保字段与错误不被遮挡。关闭后恢复筛选、页码、滚动位置与合法选择，浏览器返回优先关闭 Drawer。
- Mobile Step Form 以第 2 步“权限范围”为代表，步骤清单在页面内轻量展开，不再嵌套 Overlay。Filter Bottom Drawer 最大约 80dvh，固定 Header/Footer、Body 滚动，日期选择在当前 Drawer 内展开。
- Responsive States 以 Query、Permission、Mutation 的完整上下文和扁平片段组织，不使用白色 Card 墙。Tablet Query 展示 Skeleton、Refreshing、Search Empty、缓存 Offline 与首次加载 Error；Mobile 展示 First Use Empty 与无缓存 Offline。Permission 展示 Tablet 页面无权和 Mobile 编辑中失权；Mutation 展示双端 Submitting 与 Mobile Drawer 依赖加载失败。移动主恢复动作保持高可见，触控高度至少 44px。
- Dark 使用 Comfortable User List、正常 Edit Drawer 和 Compact Inline Edit 活动行/409，不重复 Light 对照。English Stress 使用 Light 768px，组合完整列表、展开筛选、编辑 Drawer 和状态/按钮压力片段。
- 09E 继续复用 Shell、控件、状态 SVG 与业务组件 Ref，仅为真实结构变化建立 Tablet/Mobile Variant。应用帧只保留产品文案，断点、滚动、状态归属和恢复契约放在画板外。
- 连续响应区间为 `<640px` Mobile、`640–1023px` Tablet、`1024–1279px` Rail Desktop、`≥1280px` Expanded Desktop。Shell 导航响应 viewport，SearchForm、DataTable 等内容组件优先响应容器宽度；390px 是静态采样点，正式运行下限为 360px。
- 触控端不能依赖 Hover Tooltip 获取全文；完整值进入详情、可展开文本或可访问名称。状态、选择、锁定、错误和禁用使用文字、图标或形状作为颜色之外的通道。过渡遵守 reduced-motion，关键含义不依赖动画。200% 缩放可以重排和增高，但不得覆盖信息或丢失操作。

## 10. Overlay 与统一 CRUD

### 10.1 选择规则

| 浮层 | 适用任务 | 核心边界 |
| --- | --- | --- |
| Tooltip | 非必要的补充说明 | 不承载必读错误或可交互任务 |
| DropdownMenu | 即时操作集合 | 触发器有名称，键盘和触控均可发现 |
| Popover | 轻量就地交互 | 不替代长表单或复杂业务流程 |
| Dialog | 短任务与紧凑决定 | 不继续作为核心 CRUD 编辑入口 |
| AlertDialog / 确认 Dialog | 删除、破坏性操作、放弃修改 | 明确对象、后果、取消与确认，提交期间受控 |
| BusinessDrawer | 新增、编辑、详情 | 固定 Header/Footer，Body 独立滚动 |
| 独立页面 | 复杂长流程 | 不强行塞入 Drawer 或多层模态框 |

底层可复用 shadcn-vue/Reka 的 Sheet、Dialog 等原语，公开业务语义统一；“统一使用 Drawer”不意味着将危险确认、Tooltip、通知也做成抽屉。

### 10.2 BusinessDrawer 契约

- 桌面默认 480px，复杂表单或详情 640px；Role Authorization 使用约 760px Large，768px 近全宽；视口小于 768px 时全宽，390px 角色编辑为全屏流程。
- Header 显示任务和必要上下文，Footer 保留取消/关闭与主操作；长内容不推动固定操作区离屏。
- 新增、编辑、详情采用同一结构；表单与 Mutation 由页面或 Recipe 组合，不让基础 Drawer 隐式调用业务接口。
- 关闭按钮、遮罩、Esc、取消及路由离开统一经过关闭规则；已修改内容须确认，取消放弃时回到原编辑内容。
- 提交期间防止重复动作；不可中断请求不能通过视觉关闭伪装成已取消，结束后再按实际结果处理。
- 可分享详情同步经过校验的 URL；新增/编辑草稿不写入可恢复 URL，不泄漏未提交内容。
- 禁止 Drawer 嵌套 Drawer；需要选择实体时使用适用的内嵌区域或轻量浮层，复杂流程转独立页。

移动短操作可用 Bottom Drawer，业务长编辑使用边缘全宽容器；导航 Drawer 单独遵守 320px/视口减 48px 规则。确认 Dialog 在移动仍可居中，不能为了外观统一而损害任务语义。

Overlay 使用 Anchor、Modal、Toast、Global Blocking 四个语义层，统一 Portal 与焦点策略。局部全屏需让相关浮层出现在可见容器中；关闭后焦点回到触发器或可靠后继目标。

### 10.3 角色管理与授权 Drawer

<!-- AI modified: 将已确认的 08 Permission 页面、树选择语义与异常反馈接入现有 DataTable / BusinessDrawer 交互体系。 -->

`08A` 采用 SearchForm + DataTable，关键词、角色类型、状态为默认筛选；列为名称、编码、类型、状态、用户数、权限摘要、更新时间和操作。名称打开只读 Drawer，用户数进入带角色筛选的 User Management Tab。摘要使用页面数、操作数、数据范围，补充说明支持 Hover/Focus；只显示操作者允许查看的统计，不泄露隐藏项。内置角色置顶，其余按更新时间倒序；行菜单按授权提供查看、编辑、复制、启用/停用、删除，无批量安全操作。

`08B` 复用统一 BusinessDrawer；Header 下为吸顶“基本信息 / 功能权限 / 数据范围”Tabs，提供区域摘要，固定 Footer 统一保存。基本信息含名称、编码、只读类型、状态、说明；编码创建后只读，系统角色仅名称/说明可编辑。复制进入创建模式，名称带“副本”，空编码获得焦点；不复制系统身份或用户关联。详情沿用只读模式，显示创建/修改人、时间及关联用户摘要；审计增强未启用时不显示无效历史入口。

功能权限区保持紧凑、弱分隔的树形工作面，不为每个节点加 Card：

- 模块使用标题、数量、弱分隔和 Chevron 建立层级；三态 Checkbox 与有边界的“全选本模块”组成明确点击区。页面行只保留访问 Checkbox、名称和操作数量，下面缩进展示紧凑操作选项。操作选项在桌面至少 `36px` 高、移动端至少 `44px` 高，使用边框、浅色选中面和标准 Checkbox 表达可点击性。页面访问不自动授予操作；高风险操作附轻量 Risk 标记。
- 名称为主要信息，稳定编码默认隐藏并通过“显示编码”Outline 控件按需查看；锁定项保留原位置和勾选状态，锁及“已授权 · 不可修改”紧邻名称。取消页面遇锁定操作时说明保留访问的原因，不能视觉上显示全部已清除。
- 搜索保留命中项及祖先，只过滤和定位，不直接修改草稿。工具栏将展开/收起合并为一个随当前状态切换的 Outline 按钮，不提供选择/清除当前搜索结果；模块批选只作用于该模块的可修改项，祖先上下文不扩大范围。
- 初始展开含已选权限的祖先，其余收起；本次 Drawer 会话记住展开。大型目录在可见节点超过阈值后虚拟化，滚动/焦点/勾选不随节点卸载丢失。
- 方向键移动和展开节点，Space 切换选择，Enter 打开节点详情；操作 Checkbox 和搜索具备明确名称。提交搜索后可将焦点移入首个结果，逐字输入时不抢走搜索焦点；无结果时留在搜索并播报结果状态。

数据范围使用五项纵向 Radio，每项带说明；选择自定义部门后内联展开可搜索多选树，以及“包含所选部门的下级部门”开关。说明包含未来新增下级的动态语义，摘要显示范围及来源，不把各角色范围错误汇总成适用于所有操作的一个全局“全部”。

`08C` 的 User Drawer 是唯一角色分配入口。使用可搜索多选 Combobox，选中角色显示类型、状态与简短摘要；既有停用角色标为“未生效”，不可新选，但已选区保留独立移除按钮。下方只读有效权限摘要说明角色来源与按资源/操作合成的结果，可展开查看各角色贡献；保存前显示新增/移除角色及有效范围变化，不复制完整权限编辑器。

### 10.4 Permission 状态与响应式

| 场景 | 呈现与恢复 |
| --- | --- |
| 首次加载 / 列表空 / 列表错误 | Shell 稳定；权限树几何匹配 Skeleton；Empty 与重试遵守共享 Feedback |
| 系统角色 / 锁定权限 | 保护字段与原位置锁定树说明只读原因；禁止把锁定显示为未选 |
| 无可授予权限 | 有可查看目录时显示只读树；没有可展示目录时用透明背景主题化 Forbidden，基本信息按授权可编辑 |
| 异常旧编码 | 顶部只读“异常授权项”，仅展示后端允许公开项；不以普通保存清理 |
| 角色版本冲突 / 目录更新 | Callout 说明变化并保留草稿；提供查看最新、复制草稿或重新加载，人工核对后再保存 |
| 自我失权 / 停用 / 权限收缩 | 保存前短确认 Dialog 展示可查看差异与准确人数标签，区分关联人数和实际失权人数 |
| 字段或节点失败 / 普通保存失败 | 定位对应 Tab/控件；一般错误在 Footer 上方 Callout 可重试，草稿保留 |
| 未保存离开 / Pending | 复用 Dirty Guard 和防重复提交；所有关闭入口遵守统一契约 |

`08D` 展示上述关键状态，锁定说明与目标权限保持相邻。`08E` 覆盖 1440px 约 760px Large、768px 近全宽和390px 全屏；移动树为单列、操作选项按两列换行，模块批选保持44px 点击区，“全部收起 / 显示编码”收敛到更多菜单，固定主动作始终可达。Light 中文为主流程，Dark 权限树与英文长文案验证语义颜色、锁定/选中差异、换行和焦点；不以缩字号或全页横向滚动解决窄屏问题。

## 11. Feedback 与异步状态

### 11.1 反馈升级与归属

按 `Transient → Inline → Blocking` 的影响范围选择反馈，同一事件只设一个主要反馈面。

Axios 负责统一错误结构与认证等全局策略，Vue Query 管理请求生命周期，所属页面或组件决定用户看到什么。不能 Axios、Query 回调和页面同时弹出相同错误 Toast。

| 状态 | 首选表现 | 恢复原则 |
| --- | --- | --- |
| 首次加载，无可用内容 | 几何匹配 Skeleton / AsyncState | 在实际请求区域表达忙碌，不虚构内容 |
| 后台刷新，有旧内容 | 保留内容 + 局部刷新提示 | 不切回整块骨架或整页 Loading |
| 成功空集合 | Empty / 表格空行 | 可创建时提供适用操作；无权限不展示创建 |
| 搜索空结果 | Search Empty | 调整或清除筛选，不标为接口错误 |
| 请求失败，无旧内容 | 区域 Error + 重试 | 只重试失败查询，保留合法会话 |
| 刷新失败，有旧内容 | Stale 内容 + 持续提示 | 说明可能不是最新数据，可局部重试 |
| 浏览器离线 | 全局 NetworkStatus | 页面不重复离线横幅，恢复后按查询策略处理 |
| 服务局部不可用 | 对应区域 Error | 不等同于浏览器断网或全系统停机 |
| Mutation Pending | 控件 Pending / Progress | 防重复，保持任务上下文 |
| 冲突 / 部分成功 | 当前表单或批处理结果详情 | 保留输入和成功部分，给出差异与失败项 |
| 403 / 404 / 500 | 对应页面级边界 | 区分无权、不存在和致命失败，不进入常驻导航 |
| 会话失效 | 会话边界与重新登录 | 清理受保护状态，保留安全的目标 URL |

Toast 只补充结果不明显的短暂反馈；长期错误和恢复动作保留在 Callout、AsyncState 或 PageState。全局 Blocking 仅用于确实阻断应用的状态，不用于普通列表刷新。

Skeleton 必须包括表格示例，覆盖列、行和必要工具区域；不得溢出所在容器。模块之间只要部分可用就优先保留可用部分，不能因一个图表失败而掩盖整个页面。

## 12. 语义插图系统

插图用于空、异常、恢复等功能场景；不以装饰图片填满高密度后台页面。六个稳定语义为 `empty`、`search-empty`、`forbidden`、`not-found`、`server-error`、`offline`。

视觉以用户认可的 Not Found 为基准：透明背景、细轮廓、浅纸面、折叠层次和少量强调色；弱化厚重立体与大块 Violet，不使用人物。

- 不在插图下增加违和白底 Card，尤其 Dashboard 无模块页与模块 Empty 区域。
- 标题、解释和 CTA 属于外层 EmptyState/PageState；SVG 不内嵌文字或按钮。模块纯插图表现仍由外层提供可访问状态语义。
- 六类插图采用 SVG/原生矢量母版，不接受 Empty、Forbidden 继续使用 PNG 回退，也不接受位图描摹或自动 Trace。
- 使用 Primary、Primary Soft、Surface、Muted、Stroke 五类角色；纸面、暗部、描边和强调色都随七种品牌与 Light/Dark 改变，不仅替换紫色主块。
- Server Error、Offline 可使用少量 Error/Warning 强调，仍服从统一构图和主题规则。
- `AppIllustration` 计划公开 `name`、`size`、`label`、`decorative`、`class`；标准尺寸 96/160/320px，默认装饰性，移动端适当缩小。
- 工程交付使用独立异步 SVG 注册表和按需加载，每份 SVG 不超过 30KB；体积、可访问性输出和按需加载仍需工程验收。

Inspected：原型计划记录六个矢量母版和主题/尺寸实例，并已同步 06B 无可见模块及模块 Empty。该记录不证明应用已经完成 AppIllustration、SVG 注册表或全部页面迁移。

## 13. 可访问性、动效与国际化

使用语义按钮、链接、输入、表格和标题；无名称图标、不可见焦点、仅 Hover 可达的操作不能通过验收。允许键盘跳过重复导航进入主内容。

- 对话框进入时焦点进入合理位置，Tab 不落到被遮挡背景；关闭时返回原触发器或合理后继目标。
- 表单错误关联输入，重要变化适度播报；Loading 区域标记忙碌，不能不停重复朗读整个页面。
- 图表、插图、Badge 和禁用状态提供相应语义，不只靠颜色或动画传达事实。
- 鼠标与键盘焦点不是同一状态；Focus 样式必须清晰但不过重。
- 中英文布局都可使用，不承诺 V1 RTL；日期、数字、时间范围使用语言相关展示，不拼接难以翻译的碎片句。
- 文案允许自然换行，表格、树、菜单按既定容器截断；完整信息可通过适当说明或展开获得。
- 控件反馈约 150ms，Overlay 约 200ms；Sidebar 特殊节奏见导航章节。Reduced Motion 取消位移动效，不影响状态切换、焦点或请求处理。

不在本规范中臆定尚未确认的全局快捷键、超时、z-index 数值或所有页面最大宽度。新增细节需在组件契约与真实页面中验证，再纳入正式基线。

## 14. 组件资产与画板索引

设计采用 Master + Instance。组件依次晋级 `Candidate → Validated → Stable`；至少用于一个真实核心页面后才能标记 Validated，绘制完成或依赖已安装不等于 Stable。

shadcn-vue/Reka UI 提供基础行为，Gvueter 统一 Token、变体、组合及验收，不为已有原语额外创建同义 API。Carousel、InputOTP 等库存不因保留依赖而自动进入稳定能力。

| 画板组 | 内容与地位 |
| --- | --- |
| 01A / 01B / 01C | 默认 Sidebar、可选 Top、可选 Mixed |
| 02A–02E | 移动、导航 Drawer、1024、1920、2560 响应式 |
| 03A / 03B / 03C | ARCHIVE 探索稿；菜单已统一，主体仍归档 |
| 03D | Quiet Layers 正式视觉基线 |
| 04A / 04B / 04B.0 | Foundations、母版与组件总览 |
| 04B.1 / 04B.2 / 04B.3 | Actions、Form Controls、Navigation |
| 04B.4 / 04B.5 / 04B.5.1 / 04B.6 | Data Display、Feedback、Illustration、Overlay |
| 05A / 05B / 05C / 05D | Auth Shell、登录六态、恢复流程、响应式与 Dark |
| 06A / 06B / 06C | Dashboard 默认、状态/权限、响应式/Dark |
| 07A / 07B / 07C / 07D | 导航流程、菜单工作区、编辑、状态/适配 |
| 08A / 08B / 08C / 08D / 08E | 已绘制 Candidate：角色列表、授权 Drawer、用户角色分配、边界状态、响应式/Dark；画板预览与首轮静态 QA 见[原型计划](../prototype-plan.md#08-permission-绘制与交付)，运行行为待实现验收 |
| 09A | 已绘制 Candidate：List Workspace（`v0QnE`，`54964, 4736`）；[整板](../assets/prototype/list-workspace-09A/v0QnE.png)与[主页面](../assets/prototype/list-workspace-09A/vElYB.png)。静态 QA 证据见[原型计划](../prototype-plan.md)，运行交互尚未验收 |
| 09B | 已绘制 Candidate：CRUD Main `egyuC` 与 States `b2EZ5`；复用 54 个 Ref，静态 QA 见[原型计划](../prototype-plan.md)，运行实现待迁移 |
| 09C | 已绘制 Candidate：Basic、Content、Step、Dynamic、States；导航上下文已修正，运行实现待迁移 |
| 09D | 已绘制 Candidate：Import、Export & Batch、Inline Edit、Tree Table、Virtual List & States；节点、引用、位图与逐张视觉 QA 证据见[原型计划](../prototype-plan.md#09d-绘制检查点)，运行实现待迁移 |
| 09E | 已绘制并修正五张 Candidate；表格列宽、Overlay 层级、Dark Drawer 与 Inline Edit 已统一，251 个 Ref 的结构检查、逐板视觉 QA 与五张整板 PNG 重导出均已完成，运行验收待实现 |

当前导航预览：[组件与状态](../assets/prototype/sidebar-v2/s39y8A.png)、[展开](../assets/prototype/sidebar-v2/dTY4Q.png)、[收缩与 Flyout](../assets/prototype/sidebar-v2/O3hauU.png)、[Mixed](../assets/prototype/sidebar-v2/kJw4N.png)、[移动导航](../assets/prototype/sidebar-v2/Lrga7.png)、[Dark](../assets/prototype/sidebar-v2/saEA3.png)、[权限缩略图补齐](../assets/prototype/sidebar-v2/EUzbj.png)。

原型是静态状态和流程说明，不承诺画板按钮可点击、树可展开、浏览器断点自动切换或缓存真实运行。设计 QA 与浏览器实现验收必须分别记录。

## 15. 已确认规范与实现差异

下表为 2026-09-05 的 Inspected 结果，不是代码缺陷修复或运行测试。差异编号与总览/技术文档对齐；本轮不改变现有实现。

| 差异 | 已确认目标 | 当前可见实现事实 | 后续验收 |
| --- | --- | --- | --- |
| GAP-01：表格双入口 | 业务增强统一 DataTable，轻量 Table 独立 | `components/data-table` 和 `components/pro-table` 并存，高级虚拟化等仍在 ProTable | 迁移调用、兼容出口和插件后验证功能不回退 |
| GAP-02：业务浮层 | CRUD 统一 BusinessDrawer，480/640px、Role 约760px Large、<768 全宽 | 存在 User/Menu/Department 等 FormDialog；admin Drawer 采用 Tailwind 的 sm/md/lg/xl 宽度，非确认尺寸体系 | 对齐新增、编辑、详情和 Dirty Guard；保留危险确认 Dialog |
| GAP-03：布局和导航尺寸 | 三种正式布局、240/72、Mixed 上下文 240、Flyout 280 | Implemented：三布局和 240/72/240/280px 已统一，旧布局标识读取时迁移 | 补全三布局中英文、键盘和 1440/1920/2560 验收 |
| GAP-03：Header | Breadcrumb 在 Header，搜索第一，统一工具顺序 | Implemented：Breadcrumb 已进入 Header；工具顺序为搜索、全屏、外观、语言、通知、头像 | 继续复核 Top/Mixed、长英文和 200% 缩放 |
| GAP-03：移动导航 | `min(320px, 100vw - 48px)` | Implemented：Sheet 使用 `min(20rem, 100vw - 3rem)`；390px 已浏览器检查 | 补 360、768、动态视口、键盘和焦点返回验收 |
| GAP-03 / 07：目录行为 | 当前祖先自动展开、用户+Layout 会话存储、Hover/Focus/点击 Flyout | Implemented：叶子选中使用软表面和强调线，祖先只强调文字；展开/Flyout 仍由组件本地状态管理 | 后续补用户+Layout 会话隔离和完整鼠标/键盘恢复测试 |
| GAP-07：缓存与会话 | Tabs 默认 sessionStorage；KeepAlive 默认上限10 | `stores/tabs.ts` 使用按用户隔离的 localStorage；`performance-budget.json` 上限20 | 保留现有身份隔离，补默认策略迁移与恢复/淘汰测试 |
| GAP-11：字体与密度 | 本地 Inter、桌面常规控件 36、表格舒适44/Compact36 | 本地 Inter 已实施；正式面板已移除全局组件尺寸，基础半径/表面 Token 已对齐，表格局部密度仍按组件验证 | 继续统一控件/表格尺寸矩阵并完成中英文复验 |
| GAP-11：受控品牌 | 七种受控预设，不允许任意颜色 | 正式面板只显示七品牌；兼容 Store 仍保留 custom 和语义颜色字段/API，但不构成产品入口 | 增加版本化迁移、项目 Palette 注册和对比度门禁后再清理兼容字段 |
| GAP-11：动效 | 控件150、Overlay200，Sidebar180/150 | CSS 与 Motion 契约已统一为 150/150/180/200ms；页面只暴露 Fade/Off，旧 Fade+Slide 迁移为 Fade | 继续复验 Reduced Motion、Overlay 与路由焦点连续性 |
| GAP-11：插图交付 | 六类主题化 SVG，异步注册表和页面统一使用 | 原型已有矢量母版记录；不将其等同于 `src` 中工程组件已交付 | 实现注册表、体积、颜色覆盖和无障碍输出门禁 |
| GAP-14：角色授权工作区 | SearchForm + DataTable、三 Tab 授权 Drawer、User 多角色分配 | RolesWorkspace 仍使用角色卡片和常驻权限矩阵，用户类型仍为单角色 | 按 08 目标迁移页面和契约，验证锁定/隐藏保留与原子保存 |

源代码入口：[布局定义](../../src/components/layout/layout-contract.ts)、[Shell](../../src/components/layout/ConfigurableAdminLayout.vue)、[Header](../../src/components/layout/AdminHeader.vue)、[导航节点](../../src/components/layout/AdminNavigationNode.vue)、[样式](../../src/assets/css/main.css)、[Drawer](../../src/components/admin/Drawer.vue)、[FormDialog](../../src/components/admin/FormDialog.vue)、[PasswordField](../../src/components/admin/PasswordField.vue)。

早期 [UI 原语盘点](../ui-primitives.md) 中对 Command、DatePicker、RadioGroup、ToggleGroup 等的延期或不适用结论，是已有代码库存评估；新版 04B Candidate 是设计范围。两者成熟度不同，应通过真实页面、API 和测试晋级解决，不能把画板直接写成稳定组件清单。

## 16. 可测验收与交付门禁

| 验收范围 | 必测组合 | 可观察通过条件 |
| --- | --- | --- |
| Shell / Sidebar | 展开、Rail、Mixed、Top、移动导航 | 尺寸正确；内容伸缩；唯一账号入口；无重复纯图标栏 |
| 多级导航 | 多目录、三级、隐藏页、权限空目录、长名称、Badge、外链 | 激活叶子/祖先准确；目录不误导航；Flyout不误关闭 |
| 键盘 | 目录方向键、搜索选择、Tabs、Overlay、表单首错 | 全流程可完成；焦点可见、合理进入和返回 |
| 认证 | 六核心态、恢复、Dark、390px | 密码控件一致；Pending不跳动；错误可恢复且不泄漏账号信息 |
| Dashboard | 首次加载、刷新、Stale、Empty、无模块、权限变化 | 无无权请求/占位；可用模块保留；不把局部故障扩大为全页 |
| Table / Form | Local/Remote、搜索/URL、分页、200行虚拟化、展开树、批处理 | 配置与视觉同步；容器内滚动；选中/焦点/数据身份稳定 |
| CRUD / Overlay | 新增、编辑、详情、脏退出、Pending、危险确认、局部全屏 | 正确容器；不嵌套Drawer；不丢输入；主动作可达 |
| Permission | 页面/操作分选、搜索批选、锁定/隐藏、范围并集、三类版本、390/768/1440 | 页面访问不意外授予操作；不越可授予边界；保留草稿与锁定依赖；摘要准确且无隐藏信息泄露 |
| 主题与插图 | 七品牌 × Light/Dark，六语义与三档尺寸 | 全部颜色角色跟随；无白底块、PNG回退或错误语义 |
| 响应式 | 390 / 768 / 1024 / 1280 / 1440 / 1920 / 2560 | 无页面级横向溢出；触控至少44；宽屏不无限扩列 |
| 国际化与动效 | 中/英文、舒适/Compact、正常/Reduced Motion | 不缩字号补洞；不裁切操作；禁用位移动效仍可完成任务 |

静态设计交付检查母版引用、Token、可见裁切、文字溢出、Flex 重叠和画板顺序；同步共享菜单时同时检查完整页面、状态缩略图、Dark、移动以及用户要求同步的 ARCHIVE。

实现交付通过组件/单元测试验证状态与键盘模型，浏览器测试验证跨页面流程、实际布局、URL 和焦点，再按项目门禁执行检查。截图只能证明被查看的静态状态，不能代替权限、取消、持久化或可访问性运行验证。

完成记录必须区分 Executed、Inspected、Assumed，并列明未验收组合。未执行的测试不能写“通过”；没有实际实现的能力不能因存在说明卡或示例画板而晋级为 Stable。
