import type { ProTableLabels } from '@/components/pro-table'

export type TableExampleId
  = | 'basic'
    | 'client-pagination'
    | 'server-pagination'
    | 'tree'
    | 'editable'
    | 'selection-bulk'
    | 'virtual-scroll'
    | 'complex-columns'
    | 'responsive'
    | 'states'

export type TableExampleGroup = 'foundations' | 'interaction' | 'scale' | 'resilience'

export const TABLE_EXAMPLE_GROUPS = ['foundations', 'interaction', 'scale', 'resilience'] as const
export const TABLE_TREE_EXPANDABLE_NODE_IDS = [
  'program-finance',
  'program-finance-ledger',
  'program-identity',
] as const
export const DEFAULT_TABLE_TREE_EXPANDED_NODE_IDS = [
  'program-finance',
  'program-finance-ledger',
] as const

export interface TableExampleScenario {
  id: TableExampleId
  group: TableExampleGroup
  sharedComponent: 'DataTable' | 'ProTable' | 'AsyncState + DataTable'
  behavior: string
  maturity: 'stable' | 'beta'
  testStatus: 'covered'
  accessibility: string
  limitation: string
}

export interface TableWorkOrder {
  id: string
  title: string
  owner: string
  status: 'open' | 'blocked' | 'done'
  priority: 'low' | 'medium' | 'high'
  region: string
  amount: number
  updatedAt: string
  children?: TableWorkOrder[]
}

interface ScenarioCopy {
  title: string
  description: string
}

export interface TableExamplesCopy {
  eyebrow: string
  title: string
  description: string
  implemented: string
  tested: string
  contract: {
    metadata: string
    notes: string
    behavior: string
    accessibility: string
    limitation: string
  }
  tabs: Record<TableExampleGroup, string>
  scenarios: Record<TableExampleId, ScenarioCopy>
  columns: {
    id: string
    title: string
    owner: string
    status: string
    priority: string
    region: string
    amount: string
    updatedAt: string
  }
  status: Record<TableWorkOrder['status'], string>
  priority: Record<TableWorkOrder['priority'], string>
  actions: {
    archive: string
    assign: string
    clear: string
    selected: string
    lastBulkAction: string
    noBulkAction: string
    lastEdit: string
    noEdit: string
    request: string
    retry: string
    ready: string
    loading: string
    empty: string
    error: string
  }
  messages: {
    noRows: string
    requestHint: string
    editHint: string
    responsiveHint: string
    virtualHint: string
    errorTitle: string
    errorDescription: string
    emptyTitle: string
    emptyDescription: string
  }
  server: {
    keyword: string
    status: string
    allStatuses: string
    canceledRequests: string
    latestResponse: string
  }
  tree: {
    loadState: string
    idle: string
    loading: string
    failed: string
    loaded: string
    retry: string
  }
  editing: {
    editRow: string
    save: string
    cancel: string
    refresh: string
    titleRequired: string
    ownerRequired: string
    saving: string
    saved: string
    failedRollback: string
    failureHint: string
  }
  selection: {
    filterStatus: string
    allStatuses: string
    delete: string
    refresh: string
    exportCurrentPage: string
    exportSelected: string
    exportAll: string
    pageState: string
    refreshPolicy: string
  }
  preferences: {
    reset: string
    saved: string
  }
  tableLabels: ProTableLabels
}

// AI modified: capability metadata makes every Table demo auditable without inferring support from screenshots.
export const TABLE_EXAMPLE_SCENARIOS: readonly TableExampleScenario[] = [
  {
    id: 'basic',
    group: 'foundations',
    sharedComponent: 'DataTable',
    behavior: 'Semantic typed rows with sorting and locale-aware business values.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'Semantic table headers and named pagination controls.',
    limitation: 'Intended for bounded client-side datasets.',
  },
  {
    id: 'client-pagination',
    group: 'foundations',
    sharedComponent: 'DataTable',
    behavior: 'Controlled zero-based client pagination with page-size reset and page clamping.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'Previous, next, and page-size controls retain accessible names.',
    limitation: 'Filtering remains the page owner’s responsibility.',
  },
  {
    id: 'server-pagination',
    group: 'foundations',
    sharedComponent: 'ProTable',
    behavior:
      'Manual pagination, sorting, and filtering share a URL-restorable request contract with cancellation and latest-request guards.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'Loading rows expose the table as busy while paging controls stay named.',
    limitation:
      'The transport is simulated in-browser; production pages replace only the adapter while preserving the request contract.',
  },
  {
    id: 'tree',
    group: 'interaction',
    sharedComponent: 'ProTable',
    behavior:
      'Native parent-child expansion keeps default three-level content visible and loads another branch asynchronously with retry.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'Every disclosure has an expand or collapse name and is keyboard operable.',
    limitation:
      'This is the complete Tree Table example; DepartmentTreeTable remains a flattened administration list. Tree virtualization still needs product-specific assistive-technology QA.',
  },
  {
    id: 'editable',
    group: 'interaction',
    sharedComponent: 'ProTable',
    behavior:
      'Typed cell and row edits validate, save optimistically, roll back deterministic failures, and clear drafts on refresh.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'The active editor is a named input with Enter and Escape behavior.',
    limitation:
      'The save adapter is simulated; production owners map the same transaction states to their mutation client.',
  },
  {
    id: 'selection-bulk',
    group: 'interaction',
    sharedComponent: 'DataTable',
    behavior:
      'Stable IDs preserve cross-page selection while filtering, refresh, page-size changes, deletion, and exports use explicit policies.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility:
      'Checkboxes and bulk buttons are named and the selection count is a status region.',
    limitation:
      'Exports use a browser CSV download; production pages should stream very large filtered exports from the server.',
  },
  {
    id: 'virtual-scroll',
    group: 'scale',
    sharedComponent: 'ProTable',
    behavior: 'A bounded viewport renders a virtual window over a large client collection.',
    maturity: 'beta',
    testStatus: 'covered',
    accessibility: 'The same table semantics and named controls remain available.',
    limitation:
      'Assistive-technology behavior for very large virtual tables requires product-specific QA.',
  },
  {
    id: 'complex-columns',
    group: 'scale',
    sharedComponent: 'ProTable',
    behavior:
      'Column visibility, drag ordering, pinning, density, sorting, and long-text policy persist as one versioned browser preference.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility:
      'Column controls are keyboard reachable and cells preserve readable text policies.',
    limitation:
      'Preferences are browser-local; authenticated products may replace storage with a user-settings API.',
  },
  {
    id: 'responsive',
    group: 'scale',
    sharedComponent: 'DataTable',
    behavior: 'The table owns horizontal overflow while the surrounding page remains width-safe.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility: 'Content remains in semantic cells instead of being duplicated into cards.',
    limitation:
      'Business owners must still prioritize which columns are essential on narrow screens.',
  },
  {
    id: 'states',
    group: 'resilience',
    sharedComponent: 'AsyncState + DataTable',
    behavior:
      'Ready, loading, empty, and recoverable error states share one explicit state switch.',
    maturity: 'stable',
    testStatus: 'covered',
    accessibility:
      'Loading is marked busy, errors expose retry, and state changes use visible text.',
    limitation: 'Offline, forbidden, and conflict states belong to the global page-state contract.',
  },
]

export function getTableExampleScenario(id: TableExampleId): TableExampleScenario {
  const scenario = TABLE_EXAMPLE_SCENARIOS.find(candidate => candidate.id === id)
  if (!scenario)
    throw new Error(`Unknown table example: ${id}`)
  return scenario
}

const owners = ['Avery Chen', 'Jordan Wu', 'Skyler Li', 'Morgan Xu'] as const
const regions = ['APAC', 'EMEA', 'North America', 'LATAM'] as const
const statuses: readonly TableWorkOrder['status'][] = ['open', 'blocked', 'done']
const priorities: readonly TableWorkOrder['priority'][] = ['high', 'medium', 'low']

// AI modified: deterministic edge-rich fixtures keep pagination and virtualization demos reproducible.
export const TABLE_WORK_ORDERS: readonly TableWorkOrder[] = Array.from(
  { length: 48 },
  (_, index) => ({
    id: `WO-${String(index + 1).padStart(4, '0')}`,
    title:
      index === 2
        ? 'Investigate a very long customer-impacting reconciliation identifier withoutbreakingcharacters-2026-Q3-region-apac'
        : `Operational review ${index + 1}`,
    owner: owners[index % owners.length] ?? owners[0],
    status: statuses[index % statuses.length] ?? 'open',
    priority: priorities[index % priorities.length] ?? 'medium',
    region: regions[index % regions.length] ?? 'APAC',
    amount: 1250 + index * 137,
    updatedAt: `2026-07-${String((index % 14) + 1).padStart(2, '0')}T08:30:00.000Z`,
  }),
)

export const TABLE_TREE_WORK_ORDERS: readonly TableWorkOrder[] = [
  {
    id: 'program-finance',
    title: 'Finance transformation program',
    owner: 'Avery Chen',
    status: 'open',
    priority: 'high',
    region: 'APAC',
    amount: 420_000,
    updatedAt: '2026-07-14T08:30:00.000Z',
    children: [
      {
        id: 'program-finance-ledger',
        title: 'Ledger migration',
        owner: 'Jordan Wu',
        status: 'blocked',
        priority: 'high',
        region: 'APAC',
        amount: 180_000,
        updatedAt: '2026-07-13T08:30:00.000Z',
        children: [
          {
            id: 'program-finance-ledger-audit',
            title: 'Audit evidence export',
            owner: 'Skyler Li',
            status: 'open',
            priority: 'medium',
            region: 'APAC',
            amount: 48_000,
            updatedAt: '2026-07-12T08:30:00.000Z',
          },
        ],
      },
      {
        id: 'program-finance-controls',
        title: 'Payment control review',
        owner: 'Morgan Xu',
        status: 'done',
        priority: 'medium',
        region: 'EMEA',
        amount: 96_000,
        updatedAt: '2026-07-10T08:30:00.000Z',
      },
    ],
  },
  {
    id: 'program-identity',
    title: 'Identity governance program',
    owner: 'Morgan Xu',
    status: 'open',
    priority: 'high',
    region: 'North America',
    amount: 315_000,
    updatedAt: '2026-07-11T08:30:00.000Z',
    children: [
      {
        id: 'program-identity-access',
        title: 'Quarterly access certification',
        owner: 'Avery Chen',
        status: 'open',
        priority: 'high',
        region: 'North America',
        amount: 135_000,
        updatedAt: '2026-07-09T08:30:00.000Z',
      },
    ],
  },
]

export const TABLE_EXAMPLES_COPY = {
  'en-US': {
    eyebrow: 'Component center · Tables',
    title: 'Table patterns for real administrative work',
    description:
      'Typed examples cover small lists, server state, hierarchy, editing, bulk work, large datasets, responsive columns, and recoverable states.',
    implemented: '10 implemented examples',
    tested: 'Behavior covered',
    contract: {
      metadata: 'Example metadata',
      notes: 'Contract notes',
      behavior: 'Behavior',
      accessibility: 'Accessibility',
      limitation: 'Limitation',
    },
    tabs: {
      foundations: 'Foundations',
      interaction: 'Interaction',
      scale: 'Scale & layout',
      resilience: 'States',
    },
    scenarios: {
      'basic': {
        title: 'Basic table',
        description:
          'A compact business list with typed columns, sorting, and locale-aware values.',
      },
      'client-pagination': {
        title: 'Client pagination',
        description:
          'The shared DataTable owns client paging, page-size reset, and valid-page clamping.',
      },
      'server-pagination': {
        title: 'Server pagination',
        description:
          'A manual ProTable sends zero-based page state and renders only the simulated response page.',
      },
      'tree': {
        title: 'Tree table',
        description: 'Expandable parent and child rows use the native ProTable sub-row contract.',
      },
      'editable': {
        title: 'Editable cells',
        description:
          'Double-click a title or owner, then press Enter to commit or Escape to cancel.',
      },
      'selection-bulk': {
        title: 'Selection and bulk actions',
        description:
          'Stable row IDs feed a status bar with explicit archive, assign, and clear actions.',
      },
      'virtual-scroll': {
        title: 'Virtual scrolling',
        description:
          'A bounded viewport presents 1,000 rows while rendering only the visible window.',
      },
      'complex-columns': {
        title: 'Complex column configuration',
        description:
          'Visibility, order, pinning, density, sorting, long text, and locale-aware values share one table.',
      },
      'responsive': {
        title: 'Responsive table',
        description:
          'Narrow containers scroll internally and keep the page free from horizontal overflow.',
      },
      'states': {
        title: 'Loading, empty, and error states',
        description:
          'Switch between the complete table lifecycle and recover from the error state with Retry.',
      },
    },
    columns: {
      id: 'Work order',
      title: 'Title',
      owner: 'Owner',
      status: 'Status',
      priority: 'Priority',
      region: 'Region',
      amount: 'Amount',
      updatedAt: 'Updated',
    },
    status: { open: 'Open', blocked: 'Blocked', done: 'Done' },
    priority: { low: 'Low', medium: 'Medium', high: 'High' },
    actions: {
      archive: 'Archive',
      assign: 'Assign owner',
      clear: 'Clear selection',
      selected: 'selected',
      lastBulkAction: 'Last bulk action',
      noBulkAction: 'No bulk action yet',
      lastEdit: 'Last edit',
      noEdit: 'No edit committed yet',
      request: 'Request contract',
      retry: 'Retry',
      ready: 'Ready',
      loading: 'Loading',
      empty: 'Empty',
      error: 'Error',
    },
    messages: {
      noRows: 'No work orders match this state.',
      requestHint:
        'The local adapter intentionally simulates latency and cancellation; production pages replace it with their query client.',
      editHint:
        'The table emits a typed editCommit event; this demo applies the committed value to its local owner state.',
      responsiveHint:
        'Resize the window or inspect this 360 px container. Overflow stays inside the table viewport.',
      virtualHint:
        'Only a bounded row window is mounted; sorting and pagination still use the shared state contract.',
      errorTitle: 'Work orders could not be loaded',
      errorDescription: 'The simulated request failed. Retry restores the ready state.',
      emptyTitle: 'No work orders',
      emptyDescription: 'Adjust the query or create the first work order.',
    },
    server: {
      keyword: 'Search title or owner',
      status: 'Status filter',
      allStatuses: 'All statuses',
      canceledRequests: 'Canceled requests',
      latestResponse: 'Latest response',
    },
    tree: {
      loadState: 'Async branch',
      idle: 'Expand Identity governance program to load its children.',
      loading: 'Loading child work orders…',
      failed: 'Child work orders could not be loaded.',
      loaded: 'Child work orders loaded.',
      retry: 'Retry child loading',
    },
    editing: {
      editRow: 'Edit first row',
      save: 'Save row',
      cancel: 'Cancel row edit',
      refresh: 'Refresh rows',
      titleRequired: 'Title must contain at least 5 characters.',
      ownerRequired: 'Owner must contain at least 2 characters.',
      saving: 'Saving changes…',
      saved: 'Changes saved.',
      failedRollback: 'Save failed; the previous row was restored.',
      failureHint: 'Include [fail] in a title to exercise rollback.',
    },
    selection: {
      filterStatus: 'Filter status',
      allStatuses: 'All statuses',
      delete: 'Delete selected',
      refresh: 'Refresh rows',
      exportCurrentPage: 'Export current page',
      exportSelected: 'Export selected',
      exportAll: 'Export all filtered',
      pageState: 'Page state',
      refreshPolicy:
        'Refresh and filtering clear selection; ordinary page navigation preserves stable IDs.',
    },
    preferences: {
      reset: 'Restore default columns',
      saved: 'Saved column preferences',
    },
    tableLabels: {
      columns: 'Columns',
      density: 'Density',
      densityCompact: 'Compact',
      densityStandard: 'Standard',
      densityComfortable: 'Comfortable',
      fullscreen: 'Fullscreen',
      exitFullscreen: 'Exit fullscreen',
      pinLeft: 'Pin left',
      pinRight: 'Pin right',
      unpin: 'Unpin',
      moveColumnUp: 'Move column up',
      moveColumnDown: 'Move column down',
      columnMoved: '{column} moved to position {position} of {total}',
      expand: 'Expand row',
      collapse: 'Collapse row',
      editCell: 'Double-click to edit',
      rowsPerPage: 'Rows per page',
      pageOf: 'Page {current} of {total}',
      previousPage: 'Previous page',
      nextPage: 'Next page',
      selectAll: 'Select all rows',
      selectRow: 'Select row',
      actions: 'Actions',
    },
  },
  'zh-CN': {
    eyebrow: '组件中心 · 表格',
    title: '面向真实管理工作的表格模式',
    description:
      '类型安全示例覆盖小型列表、服务端状态、层级、编辑、批量操作、大数据、响应式列与可恢复状态。',
    implemented: '10 个已实现示例',
    tested: '行为已覆盖',
    contract: {
      metadata: '示例元数据',
      notes: '契约说明',
      behavior: '行为',
      accessibility: '无障碍',
      limitation: '限制',
    },
    tabs: {
      foundations: '基础能力',
      interaction: '交互能力',
      scale: '规模与布局',
      resilience: '状态',
    },
    scenarios: {
      'basic': { title: '基础表格', description: '包含类型安全列、排序和本地化业务值的紧凑列表。' },
      'client-pagination': {
        title: '客户端分页',
        description: '共享 DataTable 负责客户端分页、每页行数重置与页码夹紧。',
      },
      'server-pagination': {
        title: '服务端分页',
        description: '手动 ProTable 发送零基页码状态，并只呈现模拟响应页。',
      },
      'tree': { title: '树形表格', description: '父子行通过 ProTable 原生子行契约展开和折叠。' },
      'editable': {
        title: '可编辑单元格',
        description: '双击标题或负责人，按 Enter 提交，按 Escape 取消。',
      },
      'selection-bulk': {
        title: '选择与批量操作',
        description: '稳定行 ID 驱动状态栏，并提供归档、分配和清除操作。',
      },
      'virtual-scroll': {
        title: '虚拟滚动',
        description: '固定高度视口呈现 1,000 行，同时只渲染可见窗口。',
      },
      'complex-columns': {
        title: '复杂列配置',
        description: '列显隐、排序、固定、密度、长文本和本地化数值在同一表格中协作。',
      },
      'responsive': {
        title: '响应式表格',
        description: '窄容器内部滚动，避免整个页面产生横向溢出。',
      },
      'states': {
        title: '加载、空与错误状态',
        description: '切换完整表格生命周期，并通过重试从错误状态恢复。',
      },
    },
    columns: {
      id: '工单',
      title: '标题',
      owner: '负责人',
      status: '状态',
      priority: '优先级',
      region: '区域',
      amount: '金额',
      updatedAt: '更新时间',
    },
    status: { open: '进行中', blocked: '阻塞', done: '已完成' },
    priority: { low: '低', medium: '中', high: '高' },
    actions: {
      archive: '归档',
      assign: '分配负责人',
      clear: '清除选择',
      selected: '项已选择',
      lastBulkAction: '最近批量操作',
      noBulkAction: '尚未执行批量操作',
      lastEdit: '最近编辑',
      noEdit: '尚未提交编辑',
      request: '请求契约',
      retry: '重试',
      ready: '就绪',
      loading: '加载中',
      empty: '空状态',
      error: '错误',
    },
    messages: {
      noRows: '当前状态下没有工单。',
      requestHint: '本地适配器有意模拟延迟和取消；生产页面应替换为自己的查询客户端。',
      editHint: '表格发出类型安全的 editCommit 事件；本示例由所有者状态应用提交值。',
      responsiveHint: '调整窗口宽度或查看这个 360px 容器；溢出始终限制在表格视口内。',
      virtualHint: 'DOM 中只挂载有限行窗口；排序和分页仍复用共享状态契约。',
      errorTitle: '无法加载工单',
      errorDescription: '模拟请求失败，重试后恢复就绪状态。',
      emptyTitle: '没有工单',
      emptyDescription: '请调整查询条件或创建第一条工单。',
    },
    server: {
      keyword: '搜索标题或负责人',
      status: '状态筛选',
      allStatuses: '全部状态',
      canceledRequests: '已取消请求',
      latestResponse: '最近响应',
    },
    tree: {
      loadState: '异步分支',
      idle: '展开“身份治理项目”以加载子级。',
      loading: '正在加载子工单…',
      failed: '无法加载子工单。',
      loaded: '子工单已加载。',
      retry: '重试子级加载',
    },
    editing: {
      editRow: '编辑首行',
      save: '保存行',
      cancel: '取消行编辑',
      refresh: '刷新行',
      titleRequired: '标题至少需要 5 个字符。',
      ownerRequired: '负责人至少需要 2 个字符。',
      saving: '正在保存更改…',
      saved: '更改已保存。',
      failedRollback: '保存失败，已恢复原行。',
      failureHint: '在标题中加入 [fail] 可验证回滚。',
    },
    selection: {
      filterStatus: '筛选状态',
      allStatuses: '全部状态',
      delete: '删除所选',
      refresh: '刷新行',
      exportCurrentPage: '导出当前页',
      exportSelected: '导出所选项',
      exportAll: '导出全部筛选结果',
      pageState: '分页状态',
      refreshPolicy: '刷新和筛选会清除选择；普通翻页通过稳定 ID 保留跨页选择。',
    },
    preferences: {
      reset: '恢复默认列',
      saved: '已保存列偏好',
    },
    tableLabels: {
      columns: '列',
      density: '密度',
      densityCompact: '紧凑',
      densityStandard: '标准',
      densityComfortable: '宽松',
      fullscreen: '全屏',
      exitFullscreen: '退出全屏',
      pinLeft: '固定到左侧',
      pinRight: '固定到右侧',
      unpin: '取消固定',
      moveColumnUp: '向上移动列',
      moveColumnDown: '向下移动列',
      columnMoved: '{column} 已移动到第 {position} 列，共 {total} 列',
      expand: '展开行',
      collapse: '折叠行',
      editCell: '双击编辑',
      rowsPerPage: '每页行数',
      pageOf: '第 {current} / {total} 页',
      previousPage: '上一页',
      nextPage: '下一页',
      selectAll: '选择全部行',
      selectRow: '选择行',
      actions: '操作',
    },
  },
} satisfies Record<'en-US' | 'zh-CN', TableExamplesCopy>

export function getTableExamplesCopy(locale: string): TableExamplesCopy {
  return locale.toLowerCase().startsWith('zh')
    ? TABLE_EXAMPLES_COPY['zh-CN']
    : TABLE_EXAMPLES_COPY['en-US']
}
