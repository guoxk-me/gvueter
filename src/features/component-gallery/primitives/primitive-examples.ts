export type PrimitiveGapDecisionStatus = 'defer' | 'not-applicable'

export interface PrimitiveGapDecision {
  id: string
  name: string
  status: PrimitiveGapDecisionStatus
  reason: string
  alternative: string
}

export interface PrimitiveExamplesCopy {
  coverage: {
    title: string
    description: string
    directExamples: string
    catalogEntries: string
  }
  sections: {
    structureTitle: string
    structureDescription: string
    overlaysTitle: string
    overlaysDescription: string
    gapsTitle: string
    gapsDescription: string
  }
  structure: {
    navigationTitle: string
    navigationDescription: string
    breadcrumbLabel: string
    breadcrumbHome: string
    breadcrumbComponents: string
    breadcrumbCurrent: string
    actionMenu: string
    actionMenuLabel: string
    exportAction: string
    duplicateAction: string
    deleteAction: string
    actionSelected: string
    formTitle: string
    formDescription: string
    fieldLabel: string
    fieldPlaceholder: string
    fieldHelp: string
    fieldRequired: string
    save: string
    saved: string
    paginationLabel: string
    paginationStatus: string
    previousPage: string
    nextPage: string
    morePages: string
    panelsTitle: string
    panelsDescription: string
    primaryPanel: string
    secondaryPanel: string
    resizeHandle: string
    scrollAreaLabel: string
    activityEntries: readonly string[]
    tableTitle: string
    tableDescription: string
    tableCaption: string
    tableHeaders: readonly [string, string, string]
    tableRows: readonly (readonly [string, string, string])[]
  }
  overlays: {
    comparisonTitle: string
    comparisonDescription: string
    dialogName: string
    dialogUse: string
    dialogAvoid: string
    drawerName: string
    drawerUse: string
    drawerAvoid: string
    sheetName: string
    sheetUse: string
    sheetAvoid: string
    openDialog: string
    openDrawer: string
    openSheet: string
    close: string
    dialogTitle: string
    dialogDescription: string
    drawerTitle: string
    drawerDescription: string
    sheetTitle: string
    sheetDescription: string
    compositionTitle: string
    compositionDescription: string
    loadingLabel: string
    readyLabel: string
    refreshPreview: string
    refreshHelp: string
    previewReady: string
    toastMessage: string
    sidebarTitle: string
    sidebarDescription: string
    sidebarStatus: string
    sidebarSource: string
    shellOwner: string
    shellOwnerDescription: string
  }
  gaps: {
    statusLabel: string
    reasonLabel: string
    alternativeLabel: string
    defer: string
    notApplicable: string
    summary: string
  }
}

const ENGLISH_COPY: PrimitiveExamplesCopy = {
  coverage: {
    title: 'One foundation, no duplicate business layer',
    description:
      'The route exposes all 27 installed primitives through the catalog and adds focused live examples for previously underexposed building blocks. Higher-order behavior stays in shared admin components.',
    directExamples: '14 focused primitive examples',
    catalogEntries: '{count} inventoried primitives',
  },
  sections: {
    structureTitle: 'Structure, forms, and data',
    structureDescription:
      'Semantic foundations remain small. Routing, validation policy, pagination contracts, and server behavior belong to their business owners.',
    overlaysTitle: 'Overlay and feedback boundaries',
    overlaysDescription:
      'Dialog, Drawer, and Sheet share Reka focus behavior but solve different layout responsibilities. Loading feedback composes Skeleton, Tooltip, and Sonner without hiding essential status.',
    gapsTitle: 'Requested primitive decisions',
    gapsDescription:
      'Missing primitives are evaluated against current product behavior. Deferral is explicit and every decision names the existing alternative.',
  },
  structure: {
    navigationTitle: 'Breadcrumb and action menu',
    navigationDescription:
      'Breadcrumb supplies semantics; AppBreadcrumb owns route derivation. DropdownMenu keeps secondary actions keyboard and pointer reachable.',
    breadcrumbLabel: 'Example breadcrumb',
    breadcrumbHome: 'Workspace',
    breadcrumbComponents: 'Components',
    breadcrumbCurrent: 'Primitives',
    actionMenu: 'Record actions',
    actionMenuLabel: 'Available record actions',
    exportAction: 'Export record',
    duplicateAction: 'Duplicate record',
    deleteAction: 'Delete record',
    actionSelected: 'Selected action: {action}',
    formTitle: 'Form primitives and pagination',
    formDescription:
      'FormItem links labels, help, validation, and controls. Raw pagination exposes navigation mechanics; DataTable and ProTable own the shared server contract.',
    fieldLabel: 'Workspace name',
    fieldPlaceholder: 'Operations workspace',
    fieldHelp: 'Use a clear name that administrators can recognize.',
    fieldRequired: 'Enter a workspace name.',
    save: 'Validate form',
    saved: 'Form contract is valid for {name}.',
    paginationLabel: 'Primitive pagination example',
    paginationStatus: 'Page {page} of 5',
    previousPage: 'Previous page',
    nextPage: 'Next page',
    morePages: 'More pages',
    panelsTitle: 'Resizable and contained scrolling',
    panelsDescription:
      'The splitter is keyboard resizable. ScrollArea is reserved for genuinely bounded regions; document scrolling remains the default.',
    primaryPanel: 'Primary editor',
    secondaryPanel: 'Preview',
    resizeHandle: 'Resize editor and preview panels',
    scrollAreaLabel: 'Recent primitive decisions',
    activityEntries: [
      'Kept native document scrolling for route content.',
      'Reserved ScrollArea for this bounded audit history.',
      'Kept persisted split layouts outside the primitive.',
      'Preserved keyboard access to the resize handle.',
      'Used one semantic separator between unrelated regions.',
    ],
    tableTitle: 'Semantic table foundation',
    tableDescription:
      'Table keeps native structure and horizontal containment. Sorting, selection, editing, virtualization, and pagination stay in DataTable or ProTable.',
    tableCaption: 'Primitive ownership examples',
    tableHeaders: ['Surface', 'Primitive owns', 'Business owner'],
    tableRows: [
      ['Users', 'Rows and headers', 'DataTable filters and pagination'],
      ['Parameters', 'Cells and caption', 'ProTable editing and permissions'],
      ['Audit summary', 'Responsive overflow', 'Page query and export policy'],
    ],
  },
  overlays: {
    comparisonTitle: 'Choose by responsibility',
    comparisonDescription:
      'Position alone does not define an overlay. Choose the smallest boundary that preserves focus, context, and recovery.',
    dialogName: 'Dialog primitive',
    dialogUse: 'Use for a focused decision or compact task that temporarily blocks the page.',
    dialogAvoid: 'Avoid for long record exploration or persistent navigation.',
    drawerName: 'Admin Drawer',
    drawerUse:
      'Use for business detail or editing with standardized header, size, scrolling, and footer.',
    drawerAvoid: 'Avoid bypassing its wrapper with one-off sizing and close behavior.',
    sheetName: 'Sheet primitive',
    sheetUse: 'Use as infrastructure for mobile navigation or a specialized edge panel.',
    sheetAvoid:
      'Avoid using raw Sheet for ordinary business detail when Drawer already owns the contract.',
    openDialog: 'Open dialog',
    openDrawer: 'Open drawer',
    openSheet: 'Open sheet',
    close: 'Close',
    dialogTitle: 'Confirm primitive choice',
    dialogDescription: 'A compact modal task stays centered and returns focus to its trigger.',
    drawerTitle: 'Review workspace details',
    drawerDescription: 'The admin wrapper owns readable structure and a bounded content region.',
    sheetTitle: 'Infrastructure sheet',
    sheetDescription:
      'This raw edge panel demonstrates the foundation used by mobile shell surfaces.',
    compositionTitle: 'Skeleton + Tooltip + Sonner composition',
    compositionDescription:
      'Skeleton preserves known geometry, Tooltip supplements an already named control, and Sonner announces a transient result. The owning region retains aria-busy and visible ready text.',
    loadingLabel: 'Preview is loading',
    readyLabel: 'Preview is ready',
    refreshPreview: 'Refresh preview',
    refreshHelp: 'Load the preview and announce completion',
    previewReady: 'Primitive preview loaded with a persistent visible status.',
    toastMessage: 'Primitive preview refreshed',
    sidebarTitle: 'Sidebar family: inventoried, not authoritative',
    sidebarDescription:
      'The generated shadcn-vue Sidebar provider registers fixed positioning, mobile Sheet behavior, persistence, and a global shortcut. Mounting it here would create a second Shell contract.',
    sidebarStatus: 'Documentation-only preview',
    sidebarSource: 'Retained source: src/components/ui/sidebar',
    shellOwner: 'Authoritative Shell',
    shellOwnerDescription:
      'ConfigurableAdminLayout + AdminNavigation own breakpoints, deep menus, collapse state, flyouts, and mobile navigation.',
  },
  gaps: {
    statusLabel: 'Decision',
    reasonLabel: 'Why now',
    alternativeLabel: 'Current alternative',
    defer: 'Defer until a real workflow requires it',
    notApplicable: 'Not applicable to current business needs',
    summary: '{deferred} deferred · {notApplicable} not applicable',
  },
}

const CHINESE_COPY: PrimitiveExamplesCopy = {
  coverage: {
    title: '一套基础能力，不重复建设业务层',
    description:
      '本路由通过目录展示全部 27 个已安装 primitive，并为此前暴露不足的基础能力提供聚焦示例；高阶行为继续由共享后台组件负责。',
    directExamples: '14 个聚焦 primitive 示例',
    catalogEntries: '{count} 个已盘点 primitive',
  },
  sections: {
    structureTitle: '结构、表单与数据',
    structureDescription:
      '语义基础保持轻量；路由、校验策略、分页契约和服务端行为由各自业务组件负责。',
    overlaysTitle: '浮层与反馈边界',
    overlaysDescription:
      'Dialog、Drawer 和 Sheet 共享 Reka 的焦点行为，但承担不同布局责任；Loading 反馈组合 Skeleton、Tooltip 与 Sonner，同时保留关键可见状态。',
    gapsTitle: '候选 primitive 决策',
    gapsDescription:
      '按当前产品行为评估缺失 primitive；延期结论必须明确，并为每项给出现有替代方案。',
  },
  structure: {
    navigationTitle: 'Breadcrumb 与操作菜单',
    navigationDescription:
      'Breadcrumb 提供语义，AppBreadcrumb 负责路由推导；DropdownMenu 让次要操作同时支持键盘和指针。',
    breadcrumbLabel: '示例面包屑',
    breadcrumbHome: '工作区',
    breadcrumbComponents: '组件',
    breadcrumbCurrent: '基础组件',
    actionMenu: '记录操作',
    actionMenuLabel: '可用记录操作',
    exportAction: '导出记录',
    duplicateAction: '复制记录',
    deleteAction: '删除记录',
    actionSelected: '已选择操作：{action}',
    formTitle: 'Form primitive 与分页',
    formDescription:
      'FormItem 关联标签、说明、校验与控件；原始 Pagination 只提供导航机制，DataTable 和 ProTable 承担共享服务端契约。',
    fieldLabel: '工作区名称',
    fieldPlaceholder: '运营工作区',
    fieldHelp: '使用管理员容易识别的清晰名称。',
    fieldRequired: '请输入工作区名称。',
    save: '验证表单',
    saved: '{name} 的表单契约已通过校验。',
    paginationLabel: 'Primitive 分页示例',
    paginationStatus: '第 {page} / 5 页',
    previousPage: '上一页',
    nextPage: '下一页',
    morePages: '更多页码',
    panelsTitle: '可调整面板与受限滚动',
    panelsDescription:
      'Splitter 支持键盘调整；ScrollArea 只用于确实受限的区域，路由内容默认继续使用文档滚动。',
    primaryPanel: '主编辑器',
    secondaryPanel: '预览',
    resizeHandle: '调整编辑器与预览面板宽度',
    scrollAreaLabel: '近期 primitive 决策',
    activityEntries: [
      '路由内容继续使用原生文档滚动。',
      '仅在此受限审计历史中使用 ScrollArea。',
      '持久化分栏布局不下沉到 primitive。',
      '保留调整手柄的键盘操作能力。',
      '两个无关区域之间只使用一条语义分隔线。',
    ],
    tableTitle: '语义化 Table 基础',
    tableDescription:
      'Table 保留原生结构和横向溢出容器；排序、选择、编辑、虚拟滚动和分页继续由 DataTable 或 ProTable 负责。',
    tableCaption: 'Primitive 责任归属示例',
    tableHeaders: ['页面', 'Primitive 负责', '业务组件负责'],
    tableRows: [
      ['用户', '行与表头', 'DataTable 筛选与分页'],
      ['系统参数', '单元格与标题', 'ProTable 编辑与权限'],
      ['审计摘要', '响应式溢出', '页面查询与导出策略'],
    ],
  },
  overlays: {
    comparisonTitle: '按责任选择',
    comparisonDescription:
      '浮层不能只按出现位置定义；应选择能保留焦点、上下文和恢复入口的最小边界。',
    dialogName: 'Dialog primitive',
    dialogUse: '用于聚焦决策或紧凑任务，短暂阻断当前页面。',
    dialogAvoid: '不用于长记录浏览或持久导航。',
    drawerName: '后台 Drawer',
    drawerUse: '用于业务详情或编辑，统一标题、尺寸、滚动区和页脚。',
    drawerAvoid: '不要绕过包装层，逐页自定义尺寸和关闭行为。',
    sheetName: 'Sheet primitive',
    sheetUse: '作为移动导航或特殊边缘面板的基础设施。',
    sheetAvoid: '已有 Drawer 负责普通业务详情时，不直接使用原始 Sheet。',
    openDialog: '打开 Dialog',
    openDrawer: '打开 Drawer',
    openSheet: '打开 Sheet',
    close: '关闭',
    dialogTitle: '确认 primitive 选择',
    dialogDescription: '紧凑模态任务居中呈现，并在关闭后把焦点返回触发器。',
    drawerTitle: '查看工作区详情',
    drawerDescription: '后台包装层统一可读结构和受限内容滚动区。',
    sheetTitle: '基础设施 Sheet',
    sheetDescription: '此原始边缘面板展示移动端 Shell 表面使用的基础能力。',
    compositionTitle: 'Skeleton + Tooltip + Sonner 组合',
    compositionDescription:
      'Skeleton 保留已知几何，Tooltip 补充已有可读名称的控件，Sonner 宣告瞬时结果；所属区域仍保留 aria-busy 与可见完成状态。',
    loadingLabel: '预览加载中',
    readyLabel: '预览已就绪',
    refreshPreview: '刷新预览',
    refreshHelp: '加载预览并宣告完成',
    previewReady: 'Primitive 预览已加载，并保留持续可见状态。',
    toastMessage: 'Primitive 预览已刷新',
    sidebarTitle: 'Sidebar 系列：纳入盘点，但不是权威实现',
    sidebarDescription:
      '生成的 shadcn-vue Sidebar Provider 会注册固定定位、移动 Sheet、持久化和全局快捷键；在此挂载会形成第二套 Shell 契约。',
    sidebarStatus: '仅文档预览',
    sidebarSource: '保留源码：src/components/ui/sidebar',
    shellOwner: '权威 Shell',
    shellOwnerDescription:
      'ConfigurableAdminLayout + AdminNavigation 统一负责断点、深层菜单、折叠状态、Flyout 与移动导航。',
  },
  gaps: {
    statusLabel: '决策',
    reasonLabel: '当前原因',
    alternativeLabel: '现有替代方案',
    defer: '待真实流程需要时再引入',
    notApplicable: '当前业务不适用',
    summary: '{deferred} 项延期 · {notApplicable} 项不适用',
  },
}

const ENGLISH_GAP_DECISIONS = [
  {
    id: 'accordion',
    name: 'Accordion',
    status: 'defer',
    reason:
      'No current workflow needs multiple independently collapsible sections with shared keyboard semantics.',
    alternative:
      'Use native details for simple disclosure; use route sections or Tabs for major content.',
  },
  {
    id: 'alert',
    name: 'Alert',
    status: 'not-applicable',
    reason: 'Persistent admin feedback already has a domain-aware tone and dismissal contract.',
    alternative: 'Use Callout for guidance and AsyncState for loading, empty, or error boundaries.',
  },
  {
    id: 'command-combobox',
    name: 'Command / Combobox',
    status: 'defer',
    reason:
      'Search behavior currently differs between global navigation, remote entities, and local enum fields.',
    alternative: 'Use GlobalSearch, SearchableSelect, or Select according to the data source.',
  },
  {
    id: 'calendar-date-picker',
    name: 'Calendar / DatePicker',
    status: 'not-applicable',
    reason:
      'Date filters now use the installed Calendar and RangeCalendar primitives through typed business components.',
    alternative:
      'Use DateRangePicker for intervals and DateTimePicker for scheduling instead of native date inputs.',
  },
  {
    id: 'radio',
    name: 'Radio group',
    status: 'not-applicable',
    reason:
      'The current forms do not repeat a styled radio interaction often enough to justify a wrapper family.',
    alternative:
      'Use labelled native radio inputs through Form, or Select when choices are numerous.',
  },
  {
    id: 'slider',
    name: 'Slider',
    status: 'not-applicable',
    reason:
      'Administrative numeric settings require precise values and validation rather than approximate pointer input.',
    alternative: 'Use NumberField with explicit bounds and step controls.',
  },
  {
    id: 'toggle-group',
    name: 'ToggleGroup',
    status: 'not-applicable',
    reason: 'No current multi-toggle toolbar needs roving-focus semantics.',
    alternative:
      'Use Tabs for content views and named Button controls with aria-pressed for isolated toggles.',
  },
  {
    id: 'context-menu',
    name: 'ContextMenu',
    status: 'not-applicable',
    reason:
      'Core actions must remain discoverable on touch, keyboard, and assistive technology instead of relying on right-click.',
    alternative: 'Use DropdownMenu from a visible, named trigger.',
  },
  {
    id: 'menubar',
    name: 'Menubar',
    status: 'not-applicable',
    reason: 'The application is an administrative shell, not a desktop-document command surface.',
    alternative: 'Use top or side navigation for destinations and DropdownMenu for local actions.',
  },
  {
    id: 'navigation-menu',
    name: 'NavigationMenu',
    status: 'not-applicable',
    reason:
      'Dynamic multi-level navigation already has an authoritative permission-aware contract.',
    alternative: 'Use AdminNavigation and AdminTopNavigation; do not introduce a competing tree.',
  },
  {
    id: 'hover-card',
    name: 'HoverCard',
    status: 'not-applicable',
    reason: 'Essential administrative information must not be pointer-hover-only.',
    alternative:
      'Use Tooltip for supplementary hints and DetailDrawer or Dialog for actionable detail.',
  },
  {
    id: 'alert-dialog',
    name: 'AlertDialog',
    status: 'not-applicable',
    reason:
      'Consequential actions already use a business wrapper with pending and controlled-close behavior.',
    alternative: 'Use ConfirmAction or the admin Dialog wrapper.',
  },
  {
    id: 'carousel',
    name: 'Carousel',
    status: 'not-applicable',
    reason:
      'No current admin workflow benefits from hidden sequential panels or promotional browsing.',
    alternative: 'Use responsive card grids, tables, or a clearly labelled stepped workflow.',
  },
  {
    id: 'otp',
    name: 'OTP input',
    status: 'defer',
    reason:
      'Authentication currently has password, captcha, and reset-token flows but no approved MFA or one-time-code policy.',
    alternative:
      'Use a labelled Input with one-time-code autocomplete only when the server authentication contract is approved.',
  },
] as const satisfies readonly PrimitiveGapDecision[]

const CHINESE_GAP_DECISIONS = [
  {
    id: 'accordion',
    name: 'Accordion',
    status: 'defer',
    reason: '当前没有需要多个独立折叠区并共享键盘语义的真实流程。',
    alternative: '简单披露使用原生 details；主要内容使用独立路由区块或 Tabs。',
  },
  {
    id: 'alert',
    name: 'Alert',
    status: 'not-applicable',
    reason: '持久后台反馈已经具备业务化语气和关闭契约。',
    alternative: '说明与警告使用 Callout；Loading、Empty、Error 边界使用 AsyncState。',
  },
  {
    id: 'command-combobox',
    name: 'Command / Combobox',
    status: 'defer',
    reason: '全局导航、远程实体与本地枚举的搜索契约目前并不相同。',
    alternative: '按数据源分别使用 GlobalSearch、SearchableSelect 或 Select。',
  },
  {
    id: 'calendar-date-picker',
    name: 'Calendar / DatePicker',
    status: 'not-applicable',
    reason: '日期筛选已通过类型化业务组件组合已安装的 Calendar 与 RangeCalendar。',
    alternative: '区间使用 DateRangePicker，排期使用 DateTimePicker，不再使用原生日期输入。',
  },
  {
    id: 'radio',
    name: 'Radio group',
    status: 'not-applicable',
    reason: '现有表单没有频繁重复的样式化单选交互，不足以支撑一套包装组件。',
    alternative: '通过 Form 使用带标签的原生 radio；选项较多时使用 Select。',
  },
  {
    id: 'slider',
    name: 'Slider',
    status: 'not-applicable',
    reason: '后台数值设置要求精确值和校验，不适合近似的指针输入。',
    alternative: '使用带边界和步进控制的 NumberField。',
  },
  {
    id: 'toggle-group',
    name: 'ToggleGroup',
    status: 'not-applicable',
    reason: '当前没有需要 roving focus 的多切换工具栏。',
    alternative: '内容视图使用 Tabs；单独切换使用带可读名称和 aria-pressed 的 Button。',
  },
  {
    id: 'context-menu',
    name: 'ContextMenu',
    status: 'not-applicable',
    reason: '核心操作必须在触控、键盘和辅助技术中可发现，不能依赖右键。',
    alternative: '从可见且有名称的触发器打开 DropdownMenu。',
  },
  {
    id: 'menubar',
    name: 'Menubar',
    status: 'not-applicable',
    reason: '本项目是管理后台 Shell，不是桌面文档命令界面。',
    alternative: '页面目的地使用顶部或侧边导航，局部操作使用 DropdownMenu。',
  },
  {
    id: 'navigation-menu',
    name: 'NavigationMenu',
    status: 'not-applicable',
    reason: '动态多级导航已经有一套权威且感知权限的契约。',
    alternative: '使用 AdminNavigation 与 AdminTopNavigation，不引入竞争树。',
  },
  {
    id: 'hover-card',
    name: 'HoverCard',
    status: 'not-applicable',
    reason: '关键后台信息不能只在指针悬浮时出现。',
    alternative: '补充提示使用 Tooltip；可操作详情使用 DetailDrawer 或 Dialog。',
  },
  {
    id: 'alert-dialog',
    name: 'AlertDialog',
    status: 'not-applicable',
    reason: '高风险操作已经使用支持 pending 与受控关闭的业务包装层。',
    alternative: '使用 ConfirmAction 或后台 Dialog 包装组件。',
  },
  {
    id: 'carousel',
    name: 'Carousel',
    status: 'not-applicable',
    reason: '当前后台流程不需要隐藏的连续面板或营销式浏览。',
    alternative: '使用响应式卡片网格、表格或标签清晰的分步流程。',
  },
  {
    id: 'otp',
    name: 'OTP input',
    status: 'defer',
    reason: '认证当前包含密码、验证码和重置令牌，尚无批准的 MFA 或一次性验证码策略。',
    alternative: '服务端认证契约获批后，再使用带标签和 one-time-code autocomplete 的 Input。',
  },
] as const satisfies readonly PrimitiveGapDecision[]

// AI modified: keep the primitive audit bilingual without creating competing central keys during parallel module work.
export function getPrimitiveExamplesCopy(locale: string): PrimitiveExamplesCopy {
  return locale.toLowerCase().startsWith('zh') ? CHINESE_COPY : ENGLISH_COPY
}

export function getPrimitiveGapDecisions(locale: string): readonly PrimitiveGapDecision[] {
  return locale.toLowerCase().startsWith('zh') ? CHINESE_GAP_DECISIONS : ENGLISH_GAP_DECISIONS
}
