<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Card, CardContent } from '@/components/ui/card'
import AdvancedFilterExample from './components/AdvancedFilterExample.vue'
import DependentSelectionExample from './components/DependentSelectionExample.vue'
import HierarchySelectionExample from './components/HierarchySelectionExample.vue'
import IdentitySelectionExample from './components/IdentitySelectionExample.vue'
import RemoteSearchExample from './components/RemoteSearchExample.vue'
import SelectionExampleFrame from './components/SelectionExampleFrame.vue'

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        coverageTitle: '从单值选择到可分享筛选工作台',
        coverageDescription:
          '每个示例独立说明受控值、异常状态、限制、测试成熟度与键盘路径；窄屏自动变为单列，不依赖横向滚动完成操作。',
        navigationLabel: '筛选器与选择器示例导航',
        metadata: {
          scenario: '业务场景',
          contract: 'Props / Events / v-model',
          accessibility: '无障碍',
          limitation: '限制',
          maturity: '成熟度',
          testStatus: '测试状态',
          states: '覆盖状态',
        },
        links: [
          {
            id: 'selection-identity',
            label: '基础与业务选择器',
            detail: 'Select · MultiSelect · User · Role · Dict',
          },
          { id: 'selection-hierarchy', label: '树形与级联', detail: 'TreeSelect · Cascader' },
          { id: 'selection-dependent', label: '依赖选择', detail: '上游变化清理下游值' },
          { id: 'selection-remote', label: '远程搜索', detail: '防抖 · 取消 · 竞态 · 重试' },
          { id: 'selection-filters', label: '高级筛选', detail: '标签 · 方案 · URL 同步' },
        ],
        examples: {
          identity: {
            title: '基础、可搜索、多选与业务选择器',
            description:
              '在同一受控值边界内展示普通 Select、SearchableSelect、MultiSelect、UserSelector、RoleSelector 和 DictSelect。',
            scenario: '工单优先级、发布环境、负责人、角色和字典状态编辑。',
            contract: '所有控件通过 v-model 输出稳定 ID/键；选项与可读标签由调用方提供。',
            accessibility: '命名 combobox/listbox、键盘选择、禁用项和可移除标签均保留可读名称。',
            limitation:
              'UserSelector 仅查询配置页大小的首批结果；服务端仍须校验提交的角色和字典值。',
            maturity: 'Stable foundations · Beta composition',
            testStatus: '组件交互与页面组合测试覆盖',
            states: ['默认', '搜索', '多选', '禁用项', '清空', '远程加载'],
          },
          hierarchy: {
            title: 'TreeSelect 与 Cascader',
            description: '保留部门上下文和禁用节点，同时通过逐级选择输出完整部署路径。',
            scenario: '数据范围分配、组织选择、部署区域和分层分类。',
            contract: 'DepartmentTree: modelValue + checkedIds；Cascader: string[] 路径。',
            accessibility:
              '树使用 ARIA tree/roving focus；级联每一级都是具名 Select 并实时播报路径。',
            limitation: '当前为同步有限树；异步子节点和大树虚拟化需要独立数据契约。',
            maturity: 'Stable tree · Beta cascader',
            testStatus: '层级、禁用节点和路径截断测试覆盖',
            states: ['展开', '折叠', '选择', '勾选', '禁用', '祖先切换'],
          },
          dependent: {
            title: '依赖选择与失效值清理',
            description:
              '组织、团队、审批人形成明确依赖链；任一上游改变都会同步清除不再有效的下游 ID。',
            scenario: '审批人分配、区域门店选择、产品与版本联动。',
            contract: '每个原生 select 输出单一 ID；上游处理函数原子更新依赖状态。',
            accessibility: '原生标签与禁用状态可被浏览器和辅助技术直接理解。',
            limitation: '示例数据为本地数据；远程依赖源还需复用请求取消与错误恢复策略。',
            maturity: 'Stable pattern',
            testStatus: '下游禁用与清理行为测试覆盖',
            states: ['未选择', '可选', '完整链路', '上游切换', '下游清理'],
          },
          remote: {
            title: '远程搜索与请求竞态',
            description:
              '展示防抖、AbortController、只允许最新请求发布结果、空结果、错误、重试、选择和清空。',
            scenario: '大规模员工目录、远程资产和审计主体查找。',
            contract:
              'searchOptions(query, signal) → Promise<SelectionOption[]>；选择仅保留稳定 value。',
            accessibility: '具名 combobox/listbox、状态实时区域、可见错误与重试按钮。',
            limitation: '示例未实现服务端分页；真实接口还应记录 request ID 并限制查询频率。',
            maturity: 'Beta',
            testStatus: '防抖、取消、乱序响应、错误、重试与清空测试覆盖',
            states: ['Idle', 'Debounce', 'Loading', 'Ready', 'Empty', 'Error', 'Retry'],
          },
          filters: {
            title: '高级筛选、标签、保存方案与 URL',
            description:
              '区分草稿和已应用状态，将状态、区域、能力与日期同步到 allow-list URL 查询参数并持久化命名方案。',
            scenario: '人员目录、审计日志、报表和可分享的运营视图。',
            contract:
              'draftFilters → applyFilters；URL、标签和已应用状态使用同一 SelectionFilters 契约。',
            accessibility:
              '所有字段均具名，筛选标签可逐项移除，保存和应用结果通过 live region 播报。',
            limitation: 'localStorage 方案仅属于当前浏览器；跨设备方案需要后端授权与版本迁移。',
            maturity: 'Beta',
            testStatus: 'URL allow-list、恢复、方案校验、应用、清除与标签移除测试覆盖',
            states: ['草稿', '已应用', '标签', '保存方案', '恢复', '清除', '无效 URL'],
          },
        },
      }
    : {
        coverageTitle: 'From one value to a shareable filter workbench',
        coverageDescription:
          'Each example states its controlled-value boundary, failure states, limitations, test maturity, and keyboard path. Narrow screens collapse to one column without requiring horizontal scrolling.',
        navigationLabel: 'Filter and selection example navigation',
        metadata: {
          scenario: 'Business scenario',
          contract: 'Props / events / v-model',
          accessibility: 'Accessibility',
          limitation: 'Limitation',
          maturity: 'Maturity',
          testStatus: 'Test status',
          states: 'Covered states',
        },
        links: [
          {
            id: 'selection-identity',
            label: 'Core & business selectors',
            detail: 'Select · MultiSelect · User · Role · Dict',
          },
          { id: 'selection-hierarchy', label: 'Tree & cascade', detail: 'TreeSelect · Cascader' },
          {
            id: 'selection-dependent',
            label: 'Dependent selection',
            detail: 'Clear stale descendants',
          },
          {
            id: 'selection-remote',
            label: 'Remote search',
            detail: 'Debounce · abort · race · retry',
          },
          {
            id: 'selection-filters',
            label: 'Advanced filters',
            detail: 'Tags · schemes · URL state',
          },
        ],
        examples: {
          identity: {
            title: 'Core, searchable, multi, and business selectors',
            description:
              'Ordinary Select, SearchableSelect, MultiSelect, UserSelector, RoleSelector, and DictSelect share explicit controlled-value boundaries.',
            scenario:
              'Ticket priority, release environment, owner, role, and dictionary-backed status editing.',
            contract:
              'Every control emits a stable ID or key through v-model; callers provide options and readable labels.',
            accessibility:
              'Named combobox/listbox controls, keyboard selection, disabled options, and removable tags retain readable names.',
            limitation:
              'UserSelector searches only its configured first page; the server must still validate submitted roles and dictionary values.',
            maturity: 'Stable foundations · Beta composition',
            testStatus: 'Component interaction and page composition covered',
            states: ['Default', 'Search', 'Multiple', 'Disabled', 'Clear', 'Remote loading'],
          },
          hierarchy: {
            title: 'TreeSelect and Cascader',
            description:
              'The tree preserves department context and disabled nodes while the cascade emits a complete deployment path.',
            scenario:
              'Data-scope assignment, organization selection, deployment regions, and hierarchical categories.',
            contract: 'DepartmentTree: modelValue + checkedIds; Cascader: string[] path.',
            accessibility:
              'The tree uses ARIA tree and roving focus; each cascade level is a named Select with a live path announcement.',
            limitation:
              'This is a synchronous bounded tree; lazy children and large-tree virtualization need separate data contracts.',
            maturity: 'Stable tree · Beta cascader',
            testStatus: 'Hierarchy, disabled-node, and descendant-path truncation covered',
            states: ['Expanded', 'Collapsed', 'Selected', 'Checked', 'Disabled', 'Ancestor change'],
          },
          dependent: {
            title: 'Dependent selection and stale-value cleanup',
            description:
              'Organization, team, and approver form an explicit dependency chain; any upstream change clears invalid descendant IDs.',
            scenario:
              'Approver assignment, region/store selection, and product/version dependencies.',
            contract:
              'Each native select emits one ID; upstream handlers update dependency state atomically.',
            accessibility:
              'Native labels and disabled state are directly understood by browsers and assistive technology.',
            limitation:
              'The example uses local options; remote dependencies must also reuse cancellation and recovery policies.',
            maturity: 'Stable pattern',
            testStatus: 'Descendant enablement and cleanup behavior covered',
            states: [
              'Unselected',
              'Enabled',
              'Complete chain',
              'Upstream change',
              'Descendants cleared',
            ],
          },
          remote: {
            title: 'Remote search and request races',
            description:
              'Demonstrates debounce, AbortController, newest-request publication, empty, error, retry, selection, and clear states.',
            scenario: 'Large employee directories, remote assets, and audit-subject discovery.',
            contract:
              'searchOptions(query, signal) → Promise<SelectionOption[]>; selection retains only a stable value.',
            accessibility:
              'Named combobox/listbox, live state announcements, visible error, and a retry button.',
            limitation:
              'Server pagination is not included; production APIs should also record request IDs and rate-limit queries.',
            maturity: 'Beta',
            testStatus: 'Debounce, abort, stale response, error, retry, and clear covered',
            states: ['Idle', 'Debounce', 'Loading', 'Ready', 'Empty', 'Error', 'Retry'],
          },
          filters: {
            title: 'Advanced filters, tags, saved schemes, and URL state',
            description:
              'Draft and applied state stay separate while status, region, skills, and dates synchronize through allow-listed URL parameters and named schemes.',
            scenario: 'People directories, audit logs, reports, and shareable operational views.',
            contract:
              'draftFilters → applyFilters; URL, tags, and applied state share one SelectionFilters contract.',
            accessibility:
              'Every field is named, filter tags are independently removable, and save/apply results use a live region.',
            limitation:
              'localStorage schemes belong to this browser; cross-device schemes require authorized server storage and version migration.',
            maturity: 'Beta',
            testStatus:
              'URL allow-list, restore, scheme validation, apply, clear, and tag removal covered',
            states: ['Draft', 'Applied', 'Tags', 'Saved scheme', 'Restore', 'Clear', 'Invalid URL'],
          },
        },
      },
)
</script>

<template>
  <div class="min-w-0 space-y-6">
    <!-- AI modified: selection capabilities are addressable sections instead of another nested tab surface. -->
    <Card class="border-primary/20 bg-primary/3">
      <CardContent
        class="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-center"
      >
        <div class="min-w-0 space-y-1">
          <h2 class="break-words text-sm font-semibold">
            {{ copy.coverageTitle }}
          </h2>
          <p class="break-words text-xs leading-5 text-muted-foreground">
            {{ copy.coverageDescription }}
          </p>
        </div>
        <nav :aria-label="copy.navigationLabel">
          <ol class="grid min-w-0 gap-2 sm:grid-cols-2 xl:grid-cols-5">
            <li v-for="(link, index) in copy.links" :key="link.id" class="min-w-0">
              <a
                :href="`#${link.id}`"
                class="focus-visible:ring-ring flex h-full min-w-0 gap-2 rounded-lg border bg-background px-3 py-2 outline-none hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-2"
              >
                <span class="font-mono text-[10px] font-semibold text-primary"
                  >0{{ index + 1 }}</span
                >
                <span class="min-w-0">
                  <span class="block break-words text-xs font-medium">{{ link.label }}</span>
                  <span class="mt-0.5 block break-words text-[10px] text-muted-foreground">{{
                    link.detail
                  }}</span>
                </span>
              </a>
            </li>
          </ol>
        </nav>
      </CardContent>
    </Card>

    <SelectionExampleFrame
      id="selection-identity"
      sequence="01"
      v-bind="copy.examples.identity"
      :metadata-labels="copy.metadata"
    >
      <IdentitySelectionExample />
    </SelectionExampleFrame>
    <SelectionExampleFrame
      id="selection-hierarchy"
      sequence="02"
      v-bind="copy.examples.hierarchy"
      :metadata-labels="copy.metadata"
    >
      <HierarchySelectionExample />
    </SelectionExampleFrame>
    <SelectionExampleFrame
      id="selection-dependent"
      sequence="03"
      v-bind="copy.examples.dependent"
      :metadata-labels="copy.metadata"
    >
      <DependentSelectionExample />
    </SelectionExampleFrame>
    <SelectionExampleFrame
      id="selection-remote"
      sequence="04"
      v-bind="copy.examples.remote"
      :metadata-labels="copy.metadata"
    >
      <RemoteSearchExample />
    </SelectionExampleFrame>
    <SelectionExampleFrame
      id="selection-filters"
      sequence="05"
      v-bind="copy.examples.filters"
      :metadata-labels="copy.metadata"
    >
      <AdvancedFilterExample />
    </SelectionExampleFrame>
  </div>
</template>
