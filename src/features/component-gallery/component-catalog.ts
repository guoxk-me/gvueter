export type ComponentCatalogKind = 'business' | 'table' | 'ui-primitive'

export type ComponentCatalogModule =
  | 'data-display'
  | 'editors'
  | 'feedback'
  | 'forms'
  | 'icons'
  | 'primitives'
  | 'selection'
  | 'shell'
  | 'tables'
  | 'uploads'
  | 'workflow'

export type ComponentImplementationStatus = 'implemented' | 'missing' | 'partial'
export type ComponentDemoStatus = 'available' | 'indirect' | 'missing'
export type ComponentTestStatus = 'covered' | 'indirect' | 'missing' | 'partial'
export type ComponentEnhancementStatus = 'none' | 'planned' | 'required'
// AI modified: deprecated remains an explicit migration state instead of being conflated with planned work.
export type ComponentMaturity = 'beta' | 'deprecated' | 'experimental' | 'planned' | 'stable'
export type ComponentAccessibilityStatus = 'documented' | 'partial' | 'unknown'

export interface ComponentCatalogContract {
  props: readonly string[]
  events: readonly string[]
  slots: readonly string[]
  models: readonly string[]
}

export interface ComponentCatalogAvailability {
  implementation: ComponentImplementationStatus
  demo: ComponentDemoStatus
  test: ComponentTestStatus
  enhancement: ComponentEnhancementStatus
}

export interface ComponentCatalogAccessibility {
  status: ComponentAccessibilityStatus
  notes: readonly string[]
}

export interface ComponentCatalogTests {
  locations: readonly string[]
  coverage: string
}

export interface ComponentCatalogRelease {
  version: string
  migrationNote: string
}

export interface ComponentCatalogEntry {
  id: string
  kind: ComponentCatalogKind
  module: ComponentCatalogModule
  displayName: string
  sourcePath: string | null
  availability: ComponentCatalogAvailability
  maturity: ComponentMaturity
  summary: string
  businessScenarios: readonly string[]
  contract: ComponentCatalogContract
  states: readonly string[]
  limitations: readonly string[]
  accessibility: ComponentCatalogAccessibility
  demoLocations: readonly string[]
  tests: ComponentCatalogTests
  businessUsages: readonly string[]
  release: ComponentCatalogRelease
}

// AI modified: keep factual component maturity and evidence in one typed source before the gallery is split into routes.
export const adminComponentCatalog = [
  {
    id: 'activity-timeline',
    kind: 'business',
    module: 'workflow',
    displayName: 'ActivityTimeline',
    sourcePath: 'src/components/admin/ActivityTimeline.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Displays ordered audit or workflow activity with typed tones and timestamps.',
    businessScenarios: ['Audit history', 'Approval activity', 'Case progression'],
    contract: { props: ['entries', 'emptyLabel'], events: [], slots: ['entry'], models: [] },
    states: ['populated', 'empty', 'custom entry'],
    limitations: [
      'Timestamps are rendered as supplied; callers must apply locale-aware formatting.',
    ],
    accessibility: {
      status: 'partial',
      notes: ['Uses an ordered list; decorative indicators are hidden from assistive technology.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsWorkflowDemo.vue'],
    tests: {
      locations: ['src/__tests__/workflow-feedback-components.spec.ts'],
      coverage: 'Empty, ordered-entry, description, and timestamp rendering are asserted.',
    },
    businessUsages: [],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; add locale-aware timestamp ownership before stable promotion.',
    },
  },
  {
    id: 'application-error-boundary',
    kind: 'business',
    module: 'feedback',
    displayName: 'ApplicationErrorBoundary',
    sourcePath: 'src/components/admin/ApplicationErrorBoundary.vue',
    availability: {
      implementation: 'implemented',
      demo: 'indirect',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Replaces fatal rendering, navigation, and lazy-asset failures with one privacy-safe reload surface.',
    businessScenarios: [
      'Root render recovery',
      'Lazy route failure recovery',
      'Stale deployment recovery',
    ],
    contract: {
      props: ['reloadApplication'],
      events: [],
      slots: ['default'],
      models: [],
    },
    states: ['ready content', 'Vue runtime failure', 'navigation failure', 'asset-preload failure'],
    limitations: [
      'Recovery deliberately performs a full user-approved reload; local query failures remain owned by AsyncState.',
      'Bootstrap failures use the native-DOM fallback because Vue has not mounted yet.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'The fallback exposes an h1, assertive alert, focused main landmark, and native reload button.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/PageStateGallery.vue'],
    tests: {
      locations: ['src/__tests__/application-recovery.spec.ts', 'e2e/release-recovery.spec.ts'],
      coverage:
        'Render capture, redaction, focus, preload deduplication, native bootstrap fallback, and a failed emitted route chunk are asserted.',
    },
    businessUsages: ['Root application shell'],
    release: {
      version: '0.1.0',
      migrationNote:
        'Keep this boundary above providers and RouterView; report local API failures through their owning query boundary.',
    },
  },
  {
    id: 'async-state',
    kind: 'business',
    module: 'feedback',
    displayName: 'AsyncState',
    sourcePath: 'src/components/admin/AsyncState.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary:
      'Coordinates loading, error, empty, and success presentation for asynchronous content.',
    businessScenarios: ['Query result boundaries', 'Dashboard panels', 'Retryable detail loading'],
    contract: {
      props: [
        'isLoading',
        'isEmpty',
        'error',
        'emptyTitle',
        'emptyDescription',
        'errorTitle',
        'retryLabel',
      ],
      events: ['retry'],
      slots: ['default', 'loading', 'empty', 'error'],
      models: [],
    },
    states: ['loading', 'error', 'empty', 'success'],
    limitations: [
      'Offline, forbidden, conflict, and partial-success variants require caller-specific content.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Loading content exposes aria-busy; error and empty actions remain keyboard reachable.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
      'src/features/component-gallery/components/ComponentsOperationsDemo.vue',
    ],
    tests: {
      locations: ['src/__tests__/async-state.spec.ts'],
      coverage:
        'Loading, error, empty, success precedence, typed diagnostics, live semantics, slots, and retry are asserted.',
    },
    businessUsages: ['Component gallery asynchronous query examples'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; expand state taxonomy without changing the existing success slot.',
    },
  },
  {
    id: 'bulk-action-bar',
    kind: 'business',
    module: 'tables',
    displayName: 'BulkActionBar',
    sourcePath: 'src/components/admin/BulkActionBar.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Presents contextual operations for a non-empty row selection.',
    businessScenarios: ['Bulk archive', 'Batch status change', 'Selection clearing'],
    contract: {
      props: ['selectedCount', 'selectionLabel', 'clearLabel'],
      events: ['clear'],
      slots: ['default'],
      models: [],
    },
    states: ['hidden at zero', 'selected'],
    limitations: ['Does not own selection persistence or server-side bulk mutation progress.'],
    accessibility: {
      status: 'documented',
      notes: ['Selection count is exposed as a status and actions use native buttons.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsOperationsDemo.vue'],
    tests: {
      locations: ['src/__tests__/table-examples.spec.ts'],
      coverage:
        'The real selection table asserts zero-state hiding, count display, bulk action, clear event, and dismissal.',
    },
    businessUsages: ['Component gallery bulk order operations'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; consumers retain ownership of selection policy.',
    },
  },
  {
    id: 'page-state-panel',
    kind: 'business',
    module: 'feedback',
    displayName: 'PageStatePanel',
    sourcePath: 'src/components/admin/PageStatePanel.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Presents the shared typed page-state vocabulary with live-region and recovery-action semantics.',
    businessScenarios: [
      'Query recovery',
      'Offline and authorization feedback',
      'Conflict and partial-success recovery',
      'Session expiry',
    ],
    contract: {
      props: [
        'state',
        'title',
        'description',
        'headingLevel',
        'primaryActionLabel',
        'secondaryActionLabel',
      ],
      events: ['primaryAction', 'secondaryAction'],
      slots: ['details'],
      models: [],
    },
    states: [
      'ready',
      'loading',
      'refreshing',
      'empty',
      'search-empty',
      'error',
      'fatal-error',
      'offline',
      'forbidden',
      'conflict',
      'success',
      'partial-success',
      'session-expired',
    ],
    limitations: [
      'The page owner supplies domain copy and performs recovery; the panel does not fetch data, authorize, or redirect.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Assertive states use alert semantics, progress states expose busy, and recovery controls are native buttons.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/PageStateGallery.vue'],
    tests: {
      locations: ['src/__tests__/page-state.spec.ts'],
      coverage:
        'Taxonomy completeness, live semantics, recovery actions, and interactive Gallery recovery are asserted.',
    },
    businessUsages: [
      'Component-center page-state matrix',
      'Shared state contract for administrative pages',
    ],
    release: {
      version: '0.0.0',
      migrationNote:
        'Use AsyncState for simple query slots and PageStatePanel when a domain boundary needs typed recovery semantics.',
    },
  },
  {
    id: 'callout',
    kind: 'business',
    module: 'feedback',
    displayName: 'Callout',
    sourcePath: 'src/components/admin/Callout.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Shows persistent or dismissible contextual feedback in semantic tones.',
    businessScenarios: ['Validation guidance', 'Security warning', 'Success notice'],
    contract: {
      props: ['title', 'description', 'tone', 'dismissible', 'closeLabel'],
      events: ['update:visible'],
      slots: ['default', 'actions'],
      models: ['visible'],
    },
    states: ['info', 'success', 'warning', 'error', 'dismissed'],
    limitations: ['Visibility persistence is intentionally owned by the caller.'],
    accessibility: {
      status: 'documented',
      notes: ['Warning and error tones use alert; informational tones use status.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFeedbackDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Dismissal and controlled visibility are asserted.',
    },
    businessUsages: ['Content administration guidance'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'code-editor',
    kind: 'business',
    module: 'editors',
    displayName: 'CodeEditor',
    sourcePath: 'src/components/admin/CodeEditor.vue',
    availability: {
      implementation: 'partial',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'experimental',
    summary: 'Provides an escaped, controlled code textarea with optional visual line numbers.',
    businessScenarios: ['Configuration snippets', 'Template source', 'Read-only code inspection'],
    contract: {
      props: ['language', 'label', 'placeholder', 'readOnly', 'showLineNumbers'],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['editable', 'read-only', 'single-line', 'multi-line'],
    limitations: [
      'This is a textarea, not an IDE integration; it has no syntax highlighting, diagnostics, completion, or worker lifecycle.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Retains native textarea semantics and an explicit accessible label; visual line numbers are hidden.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/translation-boundaries.spec.ts',
      ],
      coverage:
        'Controlled editing, read-only mode, line numbers, and translation boundaries are asserted.',
    },
    businessUsages: ['Component gallery editor example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; introduce a separate IDE adapter instead of silently changing textarea semantics.',
    },
  },
  {
    id: 'confirm-action',
    kind: 'business',
    module: 'feedback',
    displayName: 'ConfirmAction',
    sourcePath: 'src/components/admin/ConfirmAction.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Wraps a trigger and confirmation dialog for consequential actions.',
    businessScenarios: ['Delete confirmation', 'Archive confirmation', 'Sensitive action approval'],
    contract: {
      props: [
        'title',
        'description',
        'triggerLabel',
        'confirmLabel',
        'cancelLabel',
        'pendingLabel',
        'triggerVariant',
        'confirmVariant',
        'isPending',
        'closeOnConfirm',
      ],
      events: ['confirm', 'update:open'],
      slots: ['trigger'],
      models: ['open'],
    },
    states: ['closed', 'open', 'pending'],
    limitations: [
      'The caller owns mutation errors and must disable automatic close for asynchronous confirmation.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses the Reka dialog focus trap and native buttons with visible labels.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFeedbackDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/workflow-feedback-components.spec.ts',
        'src/__tests__/accessibility-contracts.spec.ts',
      ],
      coverage:
        'Pending, confirmation, controlled close policy, dialog naming, Escape, and focus restoration are asserted.',
    },
    businessUsages: ['Component gallery destructive action example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; preserve controlled open state for asynchronous owners.',
    },
  },
  {
    id: 'copy-button',
    kind: 'business',
    module: 'feedback',
    displayName: 'CopyButton',
    sourcePath: 'src/components/admin/CopyButton.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Copies a text value with supported, success, and error feedback hooks.',
    businessScenarios: ['Copy identifiers', 'Copy JSON', 'Copy share links'],
    contract: {
      props: [
        'value',
        'label',
        'copiedLabel',
        'unsupportedLabel',
        'copiedDuring',
        'disabled',
        'iconOnly',
        'variant',
        'size',
      ],
      events: ['copied', 'error'],
      slots: [],
      models: [],
    },
    states: ['ready', 'copied', 'unsupported', 'disabled', 'error'],
    limitations: ['Clipboard permission and browser support determine whether copying succeeds.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Icon-only mode retains an accessible name and visible state text for non-icon mode.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsBusinessDemo.vue',
      'src/features/component-gallery/components/ComponentsWorkflowDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/business-selection-components.spec.ts',
      ],
      coverage:
        'Exercised indirectly by detail and JSON components; clipboard failure is not directly asserted.',
    },
    businessUsages: ['DetailDescriptions copyable fields', 'JSONViewer copy action'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; add direct clipboard permission tests before stable promotion.',
    },
  },
  {
    id: 'csv-export-button',
    kind: 'business',
    module: 'tables',
    displayName: 'CsvExportButton',
    sourcePath: 'src/components/admin/CsvExportButton.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Exports typed row projections to a formula-safe UTF-8 CSV file.',
    businessScenarios: ['Filtered data export', 'Audit export', 'Operational reporting'],
    contract: {
      props: ['rows', 'columns', 'fileName', 'label', 'disabled'],
      events: ['export'],
      slots: [],
      models: [],
    },
    states: ['ready', 'empty disabled', 'explicitly disabled'],
    limitations: [
      'Runs entirely in the browser and is unsuitable for very large or server-authoritative exports.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses a native labeled button and communicates disabled state.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsOperationsDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage:
        'The ExportButton wrapper verifies formula-safe download behavior and row-count reporting.',
    },
    businessUsages: ['Component gallery order export'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; server export should remain a separate contract.',
    },
  },
  {
    id: 'date-range-picker',
    kind: 'business',
    module: 'forms',
    displayName: 'DateRangePicker',
    sourcePath: 'src/components/admin/DateRangePicker.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Selects an ISO-date interval from native date inputs or supplied presets.',
    businessScenarios: ['Report period', 'Log retention filter', 'Order date filter'],
    contract: {
      props: [
        'presets',
        'label',
        'placeholder',
        'startLabel',
        'endLabel',
        'applyLabel',
        'clearLabel',
        'invalidRangeLabel',
        'min',
        'max',
      ],
      events: ['update:modelValue', 'update:open'],
      slots: [],
      models: ['modelValue', 'open'],
    },
    states: ['closed', 'draft', 'invalid range', 'applied', 'cleared'],
    limitations: [
      'Date-only ISO strings are used; time-of-day and timezone selection are outside this component.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'The trigger has a stable caller-provided name, native date inputs are labelled, and popover focus behavior comes from Reka.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsOperationsDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: ['src/__tests__/selection-examples.spec.ts'],
      coverage:
        'Named trigger, invalid-range guard, preset application, controlled output, and clear flow are asserted.',
    },
    businessUsages: ['Component gallery order filters'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; retain date-only semantics when adding locale display.',
    },
  },
  {
    id: 'department-tree',
    kind: 'business',
    module: 'selection',
    displayName: 'DepartmentTree',
    sourcePath: 'src/components/admin/DepartmentTree.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Adapts department records into a selectable or checkable hierarchical tree.',
    businessScenarios: ['Data-scope assignment', 'Department picker', 'Permission scope selection'],
    contract: {
      props: [
        'departments',
        'disabledIds',
        'label',
        'emptyLabel',
        'expandLabel',
        'collapseLabel',
        'expandAll',
        'checkable',
        'selectable',
      ],
      events: ['update:modelValue', 'update:checkedIds'],
      slots: [],
      models: ['modelValue', 'checkedIds'],
    },
    states: ['empty', 'expanded', 'collapsed', 'selected', 'checked', 'disabled'],
    limitations: [
      'This is a tree selector, not the DepartmentTreeTable feature; the latter currently flattens rows and simulates hierarchy with indentation.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Delegates ARIA tree, roving focus, keyboard expansion, and checked state to TreeView.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage:
        'Hierarchy level, disabled selection, controlled selection, and dedicated-route composition are asserted.',
    },
    businessUsages: ['RolePermissionMatrix department data-scope editor'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; a native tree-table must be introduced as a separate capability.',
    },
  },
  {
    id: 'detail-descriptions',
    kind: 'business',
    module: 'data-display',
    displayName: 'DetailDescriptions',
    sourcePath: 'src/components/admin/DetailDescriptions.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Renders responsive labeled detail fields with status and copy affordances.',
    businessScenarios: ['Record details', 'Audit metadata', 'Read-only profile summary'],
    contract: {
      props: ['items', 'columns', 'emptyText', 'bordered'],
      events: [],
      slots: ['value'],
      models: [],
    },
    states: [
      'one to three columns',
      'empty field',
      'copyable field',
      'status field',
      'custom value',
    ],
    limitations: ['Callers own locale-aware formatting before passing display values.'],
    accessibility: {
      status: 'documented',
      notes: ['Uses semantic description-list markup and labeled copy actions.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Responsive values, status tone, and copy label are asserted.',
    },
    businessUsages: ['Component gallery record detail example'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'detail-drawer',
    kind: 'business',
    module: 'data-display',
    displayName: 'DetailDrawer',
    sourcePath: 'src/components/admin/DetailDrawer.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Provides a controlled drawer composition for record details.',
    businessScenarios: ['View row details', 'Inspect audit record', 'Side-by-side editing context'],
    contract: {
      props: ['title', 'description', 'side', 'size', 'contentClass'],
      events: ['update:open'],
      slots: ['default', 'headerActions', 'footer'],
      models: ['open'],
    },
    states: ['closed', 'open', 'custom header actions', 'custom footer'],
    limitations: ['Unsaved-change confirmation remains the consumer responsibility.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Inherits modal focus management, close naming, and focus return from Drawer and Reka Sheet.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsCrudDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Controlled open detail content is rendered and asserted.',
    },
    businessUsages: ['Component gallery customer detail flow'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'dialog',
    kind: 'business',
    module: 'feedback',
    displayName: 'Dialog',
    sourcePath: 'src/components/admin/Dialog.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Provides a sized, scroll-safe controlled business dialog shell.',
    businessScenarios: [
      'Create or edit record',
      'Review details',
      'Confirm multi-field operations',
    ],
    contract: {
      props: ['title', 'description', 'size', 'contentClass'],
      events: ['update:open'],
      slots: ['default', 'headerActions', 'footer'],
      models: ['open'],
    },
    states: ['closed', 'open', 'scrolling', 'long translated header'],
    limitations: [
      'Mutation lifecycle, dirty-state guards, and form semantics belong to specialized wrappers.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Uses Reka dialog focus trap, labeled title, localized close control, and focus return.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/long-text-states.spec.ts',
      ],
      coverage: 'Controlled close, localization, and long-header wrapping are asserted.',
    },
    businessUsages: ['ImportDialog', 'FormDialog', 'Administrative record editors'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; prefer FormDialog for submit semantics.',
    },
  },
  {
    id: 'dict-select',
    kind: 'business',
    module: 'selection',
    displayName: 'DictSelect',
    sourcePath: 'src/components/admin/DictSelect.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary:
      'Selects an enabled dictionary option from static data or the dictionary query composable.',
    businessScenarios: [
      'Status selection',
      'Configurable enum fields',
      'Dictionary-backed filters',
    ],
    contract: {
      props: ['code', 'label', 'placeholder', 'disabled', 'options', 'showStatus'],
      events: ['change', 'update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['loading', 'populated', 'empty', 'disabled option', 'selected'],
    limitations: ['No saved scheme, dependency chain, or remote search interface is exposed.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Provides a stable business label and inherits keyboard selection and focus handling from the Select primitive.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsBusinessDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage:
        'Static selection metadata, disabled options, and a named trigger in the selection route are asserted.',
    },
    businessUsages: ['Component gallery dictionary status example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; dependent or remote selectors should use dedicated contracts.',
    },
  },
  {
    id: 'drawer',
    kind: 'business',
    module: 'feedback',
    displayName: 'Drawer',
    sourcePath: 'src/components/admin/Drawer.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Provides a controlled, sized and scroll-safe business sheet shell.',
    businessScenarios: ['Detail inspection', 'Settings editor', 'Mobile task flow'],
    contract: {
      props: ['title', 'description', 'side', 'size', 'contentClass'],
      events: ['update:open'],
      slots: ['default', 'headerActions', 'footer'],
      models: ['open'],
    },
    states: ['closed', 'open', 'four sides', 'scrolling', 'long translated header'],
    limitations: ['Unsaved-change protection and nested navigation are consumer concerns.'],
    accessibility: {
      status: 'documented',
      notes: ['Uses Reka sheet focus management, localized close naming, and focus return.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsBusinessDemo.vue',
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/long-text-states.spec.ts',
        'src/__tests__/primitive-examples.spec.ts',
      ],
      coverage:
        'Controlled close, localization, long-header wrapping, and the Dialog/Drawer/Sheet selection boundary are asserted.',
    },
    businessUsages: ['DetailDrawer', 'Administrative contextual panels'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'empty-state',
    kind: 'business',
    module: 'feedback',
    displayName: 'EmptyState',
    sourcePath: 'src/components/admin/EmptyState.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Communicates empty or no-result states with optional recovery actions.',
    businessScenarios: ['No records', 'Search without results', 'First-use onboarding'],
    contract: {
      props: ['title', 'description', 'icon'],
      events: [],
      slots: ['icon', 'actions'],
      models: [],
    },
    states: ['empty', 'described', 'custom icon', 'actionable', 'long text'],
    limitations: ['Error and retry semantics should be supplied through AsyncState.'],
    accessibility: {
      status: 'documented',
      notes: ['Uses a heading and keeps action controls in normal tab order.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFeedbackDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/long-text-states.spec.ts',
      ],
      coverage: 'Long text and wrapping actions are asserted.',
    },
    businessUsages: ['AsyncState empty and error fallback'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'export-button',
    kind: 'business',
    module: 'tables',
    displayName: 'ExportButton',
    sourcePath: 'src/components/admin/ExportButton.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Localizes and delegates typed client-side CSV export.',
    businessScenarios: [
      'Export visible rows',
      'Download filtered records',
      'Small administrative reports',
    ],
    contract: {
      props: ['rows', 'columns', 'fileName', 'label', 'disabled'],
      events: ['export'],
      slots: [],
      models: [],
    },
    states: ['ready', 'empty disabled', 'explicitly disabled'],
    limitations: [
      'Shares CsvExportButton client-memory limits and is not a background export job.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses a native labelled button with disabled state.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage:
        'Download delegation, formula safety, URL release, and exported count are asserted.',
    },
    businessUsages: ['Component gallery customer export'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; use CsvExportButton only when custom localization is required.',
    },
  },
  {
    id: 'file-upload',
    kind: 'business',
    module: 'uploads',
    displayName: 'FileUpload',
    sourcePath: 'src/components/admin/FileUpload.vue',
    availability: {
      implementation: 'partial',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary:
      'Validates local drag-drop or file-dialog selections and maintains a controlled file list.',
    businessScenarios: ['Attachment selection', 'CSV import selection', 'Image source selection'],
    contract: {
      props: [
        'accept',
        'allowedExtensions',
        'allowedMimeTypes',
        'maxFiles',
        'maxSize',
        'multiple',
        'disabled',
        'label',
        'description',
        'browseLabel',
        'removeLabel',
        'class',
      ],
      events: ['change', 'rejected', 'update:modelValue'],
      slots: ['content'],
      models: ['modelValue'],
    },
    states: ['idle', 'drag over', 'at limit', 'disabled', 'accepted', 'rejected', 'removed'],
    limitations: [
      'Only local selection is implemented: no network progress, cancel, retry, pause, resume, partial success, server error, or result backfill exists.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'The drop zone is a native button, file rows are announced, and remove actions have file-specific labels.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/file-upload.spec.ts', 'src/__tests__/long-text-states.spec.ts'],
      coverage: 'Accept/reject behavior, cleanup, and long-text containment are asserted.',
    },
    businessUsages: ['FormWorkbench attachments', 'ImportDialog local file selection'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; add an explicit upload-task contract instead of overloading FileUploadEntry.',
    },
  },
  {
    id: 'file-upload-item',
    kind: 'business',
    module: 'uploads',
    displayName: 'FileUploadItem',
    sourcePath: 'src/components/admin/FileUploadItem.vue',
    availability: {
      implementation: 'implemented',
      demo: 'indirect',
      test: 'indirect',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Renders one selected local file with preview, locale-aware size, and remove action.',
    businessScenarios: ['Attachment row', 'Image selection preview', 'Local upload queue'],
    contract: { props: ['entry', 'removeLabel'], events: ['remove'], slots: [], models: [] },
    states: ['image preview', 'document icon', 'generic file', 'removable'],
    limitations: [
      'The entry contains only id and File; it has no remote upload lifecycle or server result.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Images use the safe file name as alt text and remove controls include the file name.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/file-upload.spec.ts'],
      coverage:
        'Rendered indirectly through FileUpload; no direct icon, preview, or remove-row test exists.',
    },
    businessUsages: ['FileUpload internal row renderer'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; remote task presentation should use a separate row contract.',
    },
  },
  {
    id: 'form-dialog',
    kind: 'business',
    module: 'forms',
    displayName: 'FormDialog',
    sourcePath: 'src/components/admin/FormDialog.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Adds native form submission and pending actions to the business Dialog shell.',
    businessScenarios: ['Create record', 'Edit record', 'Short administrative form'],
    contract: {
      props: [
        'title',
        'description',
        'submitLabel',
        'submittingLabel',
        'cancelLabel',
        'isSubmitting',
      ],
      events: ['submit', 'update:open'],
      slots: ['default', 'footer'],
      models: ['open'],
    },
    states: ['closed', 'editing', 'submitting', 'custom footer'],
    limitations: [
      'Validation schema, server field errors, and unsaved-change protection remain caller-owned.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Associates the external footer submit button with the native form and inherits dialog focus behavior.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsCrudDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Native submit emission from the external footer action is asserted.',
    },
    businessUsages: ['Component gallery customer editor'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; validation integrations should wrap rather than replace the native form.',
    },
  },
  {
    id: 'icon-selector',
    kind: 'business',
    module: 'icons',
    displayName: 'IconSelector',
    sourcePath: 'src/components/admin/IconSelector.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Searches and categorizes a broad static Lucide registry while emitting only a stable audited key.',
    businessScenarios: ['Menu icon selection', 'Dashboard shortcut icon', 'Safe dynamic icon key'],
    contract: {
      props: [
        'placeholder',
        'label',
        'clearLabel',
        'searchPlaceholder',
        'emptyLabel',
        'disabled',
        'clearable',
      ],
      events: ['update:modelValue', 'update:open'],
      slots: [],
      models: ['modelValue', 'open'],
    },
    states: [
      'closed',
      'open',
      'searching',
      'category filtered',
      'no results',
      'selected',
      'cleared',
      'disabled',
    ],
    limitations: [
      'The registry is a curated administrative subset rather than every Lucide export; backend use remains restricted to the smaller managed-menu allowlist, and custom SVG components require explicit local registration.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Uses a named combobox, searchable categorized listbox, named options, visible keyboard focus, result announcements, and decorative SVG hiding.',
      ],
    },
    demoLocations: ['src/features/component-gallery/icons/IconExamplesPage.vue'],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/icon-examples.spec.ts',
      ],
      coverage:
        'Stable-key selection, search, categories, empty results, copy feedback, menu allowlist parity, and unknown-key fallback are asserted.',
    },
    businessUsages: ['Component gallery icon selection and menu-icon design reference'],
    release: {
      version: '0.1.0',
      migrationNote:
        'Existing keys remain valid; navigation and IconSelector now share the same static component registry and explicit fallback.',
    },
  },
  {
    id: 'image-cropper',
    kind: 'business',
    module: 'uploads',
    displayName: 'ImageCropper',
    sourcePath: 'src/components/admin/ImageCropper.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'planned',
    },
    maturity: 'experimental',
    summary: 'Selects, positions, zooms, and crops a local image to a bounded Blob output.',
    businessScenarios: ['Avatar crop', 'Logo preparation', 'Thumbnail crop'],
    contract: {
      props: ['src', 'aspectRatio', 'outputWidth', 'outputType', 'quality', 'maxFileSize'],
      events: ['cropped', 'error'],
      slots: [],
      models: [],
    },
    states: ['empty', 'selected', 'adjusting', 'cropping', 'complete', 'error'],
    limitations: [
      'Canvas memory, EXIF orientation, animated images, and server upload are not handled.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Native range and file controls are available; pointer positioning needs fuller keyboard and announcement coverage.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-selection-components.spec.ts'],
      coverage:
        'Crop rectangle bounds are unit-tested; component interaction and canvas output are not.',
    },
    businessUsages: ['Component gallery image preparation example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; preserve Blob output if orientation support is added.',
    },
  },
  {
    id: 'image-upload',
    kind: 'business',
    module: 'uploads',
    displayName: 'ImageUpload',
    sourcePath: 'src/components/admin/ImageUpload.vue',
    availability: {
      implementation: 'partial',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary: 'Restricts local file selection to common web images and owns preview URL cleanup.',
    businessScenarios: [
      'Gallery selection',
      'Avatar source selection',
      'Content image attachments',
    ],
    contract: {
      props: [
        'maxFiles',
        'maxSize',
        'multiple',
        'disabled',
        'label',
        'description',
        'browseLabel',
        'removeLabel',
        'class',
      ],
      events: ['change', 'rejected', 'update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['empty', 'selected previews', 'removed', 'rejected', 'disabled'],
    limitations: [
      'Only local preview lifecycle exists; it has no transport progress, pause, retry, cancellation, or server result.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Delegates keyboard selection and labeled removal to Upload and provides file-name alt text.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Preview URL creation and cleanup on unmount are asserted.',
    },
    businessUsages: ['FormWorkbench image selection'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; transport state must use an explicit upload-task contract.',
    },
  },
  {
    id: 'import-dialog',
    kind: 'business',
    module: 'uploads',
    displayName: 'ImportDialog',
    sourcePath: 'src/components/admin/ImportDialog.vue',
    availability: {
      implementation: 'partial',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary: 'Collects one validated local import file and delegates submission to its owner.',
    businessScenarios: ['CSV user import', 'Spreadsheet batch import', 'Configuration import'],
    contract: {
      props: [
        'title',
        'description',
        'accept',
        'maxSize',
        'isImporting',
        'uploadDescription',
        'importLabel',
        'importingLabel',
        'cancelLabel',
      ],
      events: ['import', 'rejected', 'update:open'],
      slots: [],
      models: ['open'],
    },
    states: ['closed', 'awaiting file', 'file selected', 'importing', 'rejected'],
    limitations: [
      'Parsing, row validation, partial success, server field errors, cancellation, and result backfill are external.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses the accessible Dialog and Upload contracts with pending button state.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Validated file selection and import event payload are asserted.',
    },
    businessUsages: ['UsersPage CSV import flow'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; keep import-result state outside the file selection component.',
    },
  },
  {
    id: 'json-viewer',
    kind: 'business',
    module: 'editors',
    displayName: 'JSONViewer',
    sourcePath: 'src/components/admin/JSONViewer.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Safely serializes, validates, collapses, and copies JSON-compatible values as text.',
    businessScenarios: ['API payload inspection', 'Configuration preview', 'Operation-log detail'],
    contract: {
      props: ['value', 'label', 'invalidLabel', 'expandLabel', 'collapseLabel', 'copyLabel'],
      events: ['update:collapsed'],
      slots: [],
      models: ['collapsed'],
    },
    states: ['expanded', 'collapsed', 'invalid', 'copyable'],
    limitations: [
      'No syntax tree, key search, large-value virtualization, circular-reference view, or redaction policy is implemented.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Invalid input uses alert and controls are explicitly named; serialized content remains escaped text.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/translation-boundaries.spec.ts',
      ],
      coverage:
        'Valid, invalid, collapsed, copied representation, and translation boundaries are asserted.',
    },
    businessUsages: ['Component gallery payload inspection'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; add redaction before using with sensitive payloads.',
    },
  },
  {
    id: 'markdown-editor',
    kind: 'business',
    module: 'editors',
    displayName: 'MarkdownEditor',
    sourcePath: 'src/components/admin/MarkdownEditor.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Edits Markdown source and renders a typed safe preview without injecting raw HTML.',
    businessScenarios: [
      'Safe Markdown drafting',
      'Knowledge-base preview',
      'Untrusted content inspection',
    ],
    contract: {
      props: [
        'label',
        'previewLabel',
        'placeholder',
        'readOnly',
        'disabled',
        'error',
        'allowedImageOrigins',
      ],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: [
      'editable',
      'read-only',
      'disabled',
      'error',
      'headings',
      'lists',
      'links',
      'images',
      'code blocks',
      'blocked unsafe content',
    ],
    limitations: [
      'The typed renderer intentionally supports a bounded Markdown subset; raw HTML stays text, images require an allowed origin, and GFM tables and task lists are not implemented.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Uses a labelled native textarea, an alert for validation errors, and semantic preview elements without v-html.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue',
      'src/features/component-gallery/editors/EditorExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/editor-security.spec.ts',
      ],
      coverage:
        'Controlled editing, safe links and images, code, raw HTML blocking, read-only, disabled, and error states are asserted.',
    },
    businessUsages: ['Component gallery safe-source example'],
    release: {
      version: '0.1.0',
      migrationNote:
        'Preview changed from escaped plain text to a typed renderer; raw HTML remains non-executable and image origins are opt-in.',
    },
  },
  {
    id: 'metric-card',
    kind: 'business',
    module: 'data-display',
    displayName: 'MetricCard',
    sourcePath: 'src/components/admin/MetricCard.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Displays a compact KPI value with optional icon, comparison, and semantic trend.',
    businessScenarios: ['Dashboard KPI', 'Operational health summary', 'Period comparison'],
    contract: {
      props: ['title', 'value', 'description', 'change', 'trend', 'icon', 'iconClass'],
      events: [],
      slots: [],
      models: [],
    },
    states: ['neutral', 'positive', 'negative', 'with icon', 'without comparison'],
    limitations: [
      'Numbers and percentages are rendered as supplied; locale formatting belongs to callers.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Trend icon is decorative, but trend meaning currently relies on visible text and color together.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsDataDemo.vue'],
    tests: {
      locations: ['src/__tests__/workflow-feedback-components.spec.ts'],
      coverage: 'Long KPI values and explicit positive trend text and styling are asserted.',
    },
    businessUsages: ['Dashboard metric grid'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; keep value formatting outside the component.',
    },
  },
  {
    id: 'network-status',
    kind: 'business',
    module: 'feedback',
    displayName: 'NetworkStatus',
    sourcePath: 'src/components/admin/NetworkStatus.vue',
    availability: {
      implementation: 'implemented',
      demo: 'indirect',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'experimental',
    summary: 'Shows a global offline banner and a recovery toast based on browser connectivity.',
    businessScenarios: ['Global offline awareness', 'Connectivity recovery feedback'],
    contract: { props: [], events: [], slots: [], models: [] },
    states: ['online hidden', 'offline visible', 'restored toast'],
    limitations: [
      'Navigator online state cannot prove API reachability and there is no retry or degraded-service classification.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Offline state uses an assertive live region; recovery is delegated to the toast system.',
      ],
    },
    demoLocations: ['src/App.vue'],
    tests: {
      locations: ['e2e/vue.spec.ts'],
      coverage:
        'A real Chromium context asserts offline banner visibility and the restored-connection toast.',
    },
    businessUsages: ['Global application shell'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; distinguish browser offline from API outage before stable promotion.',
    },
  },
  {
    id: 'number-field',
    kind: 'business',
    module: 'forms',
    displayName: 'NumberField',
    sourcePath: 'src/components/admin/NumberField.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Provides bounded numeric entry with keyboard input and increment controls.',
    businessScenarios: ['Quantity entry', 'Retry count', 'Capacity configuration'],
    contract: {
      props: [
        'id',
        'min',
        'max',
        'step',
        'placeholder',
        'disabled',
        'decrementLabel',
        'incrementLabel',
        'class',
      ],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['empty', 'bounded', 'minimum', 'maximum', 'disabled'],
    limitations: ['Locale decimal separators and arbitrary-precision values are not supported.'],
    accessibility: {
      status: 'documented',
      notes: ['Uses a native number input and explicitly named increment and decrement controls.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Bounded increment behavior and emitted value are asserted.',
    },
    businessUsages: ['Component gallery form example'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; do not use for currency precision.',
    },
  },
  {
    id: 'page-header',
    kind: 'business',
    module: 'shell',
    displayName: 'PageHeader',
    sourcePath: 'src/components/admin/PageHeader.vue',
    availability: {
      implementation: 'implemented',
      demo: 'indirect',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Standardizes page title, description, eyebrow, supporting content, and actions.',
    businessScenarios: ['List page header', 'Workspace introduction', 'Detail-page actions'],
    contract: {
      props: ['title', 'description', 'eyebrow'],
      events: [],
      slots: ['default', 'actions'],
      models: [],
    },
    states: ['title only', 'described', 'eyebrow', 'actions', 'long translated copy'],
    limitations: ['Breadcrumb and tabs belong to the shared context bar, not this component.'],
    accessibility: {
      status: 'documented',
      notes: ['Renders the page heading as h1 and preserves wrapping and action reachability.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsGallery.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts', 'src/__tests__/content-admin.spec.ts'],
      coverage: 'Long-title containment, action wrapping, and page composition are asserted.',
    },
    businessUsages: ['All administrative route pages'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; keep breadcrumb and tabs out of PageHeader.',
    },
  },
  {
    id: 'pagination',
    kind: 'business',
    module: 'tables',
    displayName: 'Pagination',
    sourcePath: 'src/components/admin/Pagination.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Provides controlled one-based pagination and validated page-size selection.',
    businessScenarios: ['Server list pagination', 'Search-result paging', 'Audit-log paging'],
    contract: {
      props: ['total', 'pageSizeOptions', 'siblingCount', 'disabled', 'showPageSize'],
      events: ['change', 'update:page', 'update:pageSize'],
      slots: [],
      models: ['page', 'pageSize'],
    },
    states: [
      'first page',
      'middle page',
      'last page',
      'empty total',
      'disabled',
      'page-size change',
    ],
    limitations: [
      'URL synchronization and request cancellation remain page-level responsibilities.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses labelled pagination controls and disabled boundary buttons.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Controlled next-page state and emitted server snapshot are asserted.',
    },
    businessUsages: ['Component gallery server pagination example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; this contract is one-based unlike TanStack table state.',
    },
  },
  {
    id: 'password-field',
    kind: 'business',
    module: 'forms',
    displayName: 'PasswordField',
    sourcePath: 'src/components/admin/PasswordField.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Wraps password entry with a separately controlled visibility toggle.',
    businessScenarios: ['Login secret', 'Password change', 'Credential configuration'],
    contract: {
      props: ['id', 'placeholder', 'autocomplete', 'disabled', 'showLabel', 'hideLabel'],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['hidden', 'visible', 'disabled'],
    limitations: ['Strength, breach checks, and policy validation are separate concerns.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Visibility control has state-specific accessible names and does not mutate the secret.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Visibility toggle and model stability are asserted.',
    },
    businessUsages: ['Account authentication and password-change forms'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'permission-gate',
    kind: 'business',
    module: 'feedback',
    displayName: 'PermissionGate',
    sourcePath: 'src/components/admin/PermissionGate.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Conditionally renders UI from the shared reactive CASL ability.',
    businessScenarios: ['Button permission', 'Section visibility', 'Read-only fallback'],
    contract: {
      props: ['action', 'subject', 'fallback'],
      events: [],
      slots: ['default', 'fallback'],
      models: [],
    },
    states: ['allowed', 'denied with slot', 'denied with text', 'denied hidden'],
    limitations: ['This is presentation only and never replaces server-side authorization.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Fallback text uses status semantics; consumers must preserve navigation and focus when content disappears.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsDiscoveryDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Reactive policy changes and allowed/denied output are asserted.',
    },
    businessUsages: ['Role-aware administrative actions'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; server authorization remains mandatory.',
    },
  },
  {
    id: 'progress-bar',
    kind: 'business',
    module: 'feedback',
    displayName: 'ProgressBar',
    sourcePath: 'src/components/admin/ProgressBar.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Displays bounded determinate progress with semantic tones.',
    businessScenarios: ['Import progress', 'Batch operation progress', 'Storage usage'],
    contract: {
      props: ['value', 'max', 'label', 'showValue', 'tone', 'class'],
      events: [],
      slots: [],
      models: [],
    },
    states: ['zero', 'partial', 'complete', 'over maximum', 'tone variants'],
    limitations: ['Indeterminate progress and task cancellation are not represented.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Exposes progressbar role, bounded current value, minimum, maximum, and optional label.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFeedbackDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Out-of-range clamping, ARIA value, and visible width are asserted.',
    },
    businessUsages: ['Component gallery asynchronous progress example'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; add an explicit indeterminate mode if required.',
    },
  },
  {
    id: 'qr-code',
    kind: 'business',
    module: 'data-display',
    displayName: 'QRCode',
    sourcePath: 'src/components/admin/QRCode.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'planned',
    },
    maturity: 'experimental',
    summary: 'Renders a theme-aware QR code canvas with safe optional download naming.',
    businessScenarios: ['Share link', 'Authenticator enrollment', 'Device pairing'],
    contract: {
      props: [
        'value',
        'size',
        'margin',
        'errorCorrectionLevel',
        'foreground',
        'background',
        'downloadFileName',
        'downloadable',
      ],
      events: ['rendered', 'error'],
      slots: [],
      models: [],
    },
    states: ['rendering', 'rendered', 'empty error', 'render error', 'downloadable'],
    limitations: [
      'Payload sensitivity, expiration, and server-side enrollment policy are caller responsibilities.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Canvas has supporting text and the download action is named; a non-visual payload description depends on caller context.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-selection-components.spec.ts'],
      coverage: 'Download name sanitization is unit-tested; canvas rendering and errors are not.',
    },
    businessUsages: ['Component gallery secure-share example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; never embed long-lived secrets without product review.',
    },
  },
  {
    id: 'rich-text-editor',
    kind: 'business',
    module: 'editors',
    displayName: 'RichTextEditor',
    sourcePath: 'src/components/admin/RichTextEditor.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary:
      'Edits controlled HTML through Quill and emits only the documented client-side allowlist.',
    businessScenarios: ['Announcement authoring', 'Email body editing', 'Content drafting'],
    contract: {
      props: [
        'placeholder',
        'readOnly',
        'disabled',
        'error',
        'label',
        'allowedImageOrigins',
        'toolbar',
      ],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: [
      'editable',
      'read-only',
      'disabled',
      'empty',
      'validation error',
      'custom toolbar',
      'blocked unsafe content',
    ],
    limitations: [
      'Client sanitation is defense in depth only; storage and delivery services must sanitize again, and external image origins are opt-in.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'The editor group has a readable name and associated alert; Quill toolbar screen-reader behavior still requires browser/assistive-technology verification.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFormDemo.vue',
      'src/features/component-gallery/editors/EditorExamplesPage.vue',
    ],
    tests: {
      locations: ['src/__tests__/editor-security.spec.ts'],
      coverage:
        'Tag, attribute, link, image-origin, script, event-handler, and unsafe-protocol boundaries are asserted.',
    },
    businessUsages: ['FormWorkbench rich-content field'],
    release: {
      version: '0.1.0',
      migrationNote:
        'HTML emitted by the component is now client-sanitized; server sanitation remains mandatory and consumers should verify their allowed-image policy.',
    },
  },
  {
    id: 'role-selector',
    kind: 'business',
    module: 'selection',
    displayName: 'RoleSelector',
    sourcePath: 'src/components/admin/RoleSelector.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Adapts configured user roles into a searchable, disable-aware selector.',
    businessScenarios: ['User role assignment', 'Role filter', 'Access-policy editing'],
    contract: {
      props: [
        'roles',
        'disabledRoles',
        'placeholder',
        'searchPlaceholder',
        'emptyLabel',
        'clearLabel',
        'label',
        'disabled',
        'clearable',
      ],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['closed', 'searching', 'selected', 'disabled role', 'cleared'],
    limitations: [
      'Role availability is static and does not express tenant- or policy-dependent server validation.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Delegates named combobox, listbox, and keyboard behavior to SearchableSelect.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage: 'Stable role-key selection and dedicated-route composition are asserted.',
    },
    businessUsages: ['Administrative user forms'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; server policy must revalidate submitted roles.',
    },
  },
  {
    id: 'search-form',
    kind: 'business',
    module: 'forms',
    displayName: 'SearchForm',
    sourcePath: 'src/components/admin/SearchForm.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary: 'Renders a typed field-driven search form with immutable search and reset snapshots.',
    businessScenarios: ['List query area', 'Report filters', 'Administrative search'],
    contract: {
      props: ['fields', 'defaultValues', 'searchLabel', 'resetLabel', 'isSearching'],
      events: ['search', 'reset', 'update:modelValue'],
      slots: ['actions'],
      models: ['modelValue'],
    },
    states: ['idle', 'editing', 'searching', 'submitted', 'reset'],
    limitations: [
      'Supports basic search, text, number, and select fields only; advanced dependent filters and URL synchronization are external.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Uses role search, labelled native inputs, and explicit submit and reset buttons.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/pro-table.spec.ts',
        'src/__tests__/accessibility-contracts.spec.ts',
      ],
      coverage:
        'Immutable submission, restoration of defaults, and unique label-control relationships are asserted.',
    },
    businessUsages: ['UsersPage query area', 'MonitoringPage filter bar'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; advanced filters should compose dedicated controls rather than expand field mapping indefinitely.',
    },
  },
  {
    id: 'searchable-select',
    kind: 'business',
    module: 'selection',
    displayName: 'SearchableSelect',
    sourcePath: 'src/components/admin/SearchableSelect.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary:
      'Provides a virtualized searchable single-select with controlled query and highlight state.',
    businessScenarios: [
      'Large option selection',
      'Remote-search adapter',
      'Role and user picker foundation',
    ],
    contract: {
      props: [
        'options',
        'placeholder',
        'searchPlaceholder',
        'emptyLabel',
        'loadingLabel',
        'clearLabel',
        'label',
        'disabled',
        'isLoading',
        'clearable',
        'class',
      ],
      events: [
        'search',
        'select',
        'update:modelValue',
        'update:open',
        'update:query',
        'update:highlightedIndex',
      ],
      slots: ['option'],
      models: ['modelValue', 'open', 'query', 'highlightedIndex'],
    },
    states: [
      'closed',
      'open',
      'searching',
      'loading',
      'empty',
      'selected',
      'cleared',
      'disabled option',
    ],
    limitations: [
      'It is single-select only; request cancellation, stale-response policy, dependency chains, saved schemes, and URL synchronization belong to owners.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Implements combobox, searchbox, listbox, option state, active descendant, and keyboard navigation.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsDiscoveryDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/admin-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage:
        'Filtering, option visibility, controlled selection, remote race ownership, and dedicated-route composition are asserted.',
    },
    businessUsages: ['RoleSelector', 'UserSelector'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; MultiSelect, TreeSelect, and Cascader need separate interaction contracts.',
    },
  },
  {
    id: 'status-tag',
    kind: 'business',
    module: 'data-display',
    displayName: 'StatusTag',
    sourcePath: 'src/components/admin/StatusTag.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Displays a compact business status using semantic design-token tones.',
    businessScenarios: ['Record status', 'Health state', 'Permission state'],
    contract: { props: ['label', 'tone', 'dot', 'class'], events: [], slots: [], models: [] },
    states: ['destructive', 'neutral', 'primary', 'secondary', 'success', 'warning', 'without dot'],
    limitations: ['Callers must provide a meaningful text label; color is supplementary only.'],
    accessibility: {
      status: 'documented',
      notes: ['Status meaning is always present as text and the colored dot is decorative.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Semantic success token output is asserted.',
    },
    businessUsages: ['Dictionary values', 'Detail descriptions', 'Administrative status columns'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial catalog baseline; no migration is required.',
    },
  },
  {
    id: 'tag-input',
    kind: 'business',
    module: 'forms',
    displayName: 'TagInput',
    sourcePath: 'src/components/admin/TagInput.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary:
      'Collects a controlled list of unique text tags with bounded entry and rejection reasons.',
    businessScenarios: ['Resource tags', 'Search keywords', 'Notification recipients'],
    contract: {
      props: ['id', 'placeholder', 'maxTags', 'disabled', 'removeLabel', 'class'],
      events: ['rejected', 'update:modelValue'],
      slots: ['tag'],
      models: ['modelValue'],
    },
    states: ['empty', 'populated', 'at limit', 'duplicate rejected', 'disabled'],
    limitations: [
      'No remote suggestions, token validation schema, or drag ordering is implemented.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Native input remains focusable and every remove action includes its tag label.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Accepted batch and case-insensitive duplicate rejection are asserted.',
    },
    businessUsages: ['Component gallery form example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; ordering should use a separate accessible drag contract.',
    },
  },
  {
    id: 'tree-view',
    kind: 'business',
    module: 'selection',
    displayName: 'TreeView',
    sourcePath: 'src/components/admin/TreeView.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Renders a controlled selectable or checkable tree with roving keyboard focus.',
    businessScenarios: ['Permission hierarchy', 'Department scope', 'Category browser'],
    contract: {
      props: [
        'nodes',
        'label',
        'emptyLabel',
        'selectable',
        'checkable',
        'includeParentWhenChecked',
        'expandAll',
        'expandLabel',
        'collapseLabel',
        'checkLabel',
        'loadingLabel',
        'retryLoadLabel',
        'loadChildren',
      ],
      events: [
        'select',
        'check',
        'load',
        'loadError',
        'update:selectedId',
        'update:checkedIds',
        'update:expandedIds',
      ],
      slots: ['node', 'empty'],
      models: ['selectedId', 'checkedIds', 'expandedIds'],
    },
    states: [
      'empty',
      'collapsed',
      'expanded',
      'selected',
      'checked',
      'mixed hierarchy',
      'disabled',
      'loading children',
      'load failed',
      'retry',
    ],
    limitations: [
      'Virtualization, drag sorting, and search filtering remain separate capabilities; callers should enable lazy loading before a branch reaches the published large-tree threshold.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Implements ARIA tree/treeitem levels, roving focus, arrow navigation, selection, checkbox labels, aria-busy, and a polite lazy-load status.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsHierarchyDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/admin-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage:
        'Hierarchy rendering, parent checking, selection, expansion, lazy success/failure/retry, controlled models, and route composition are asserted.',
    },
    businessUsages: ['DepartmentTree', 'Permission hierarchy examples'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Nodes may now declare hasChildren with loadChildren; existing eager children remain unchanged.',
    },
  },
  {
    id: 'upload',
    kind: 'business',
    module: 'uploads',
    displayName: 'Upload',
    sourcePath: 'src/components/admin/Upload.vue',
    availability: {
      implementation: 'partial',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary: 'Localizes and forwards the controlled FileUpload selection contract.',
    businessScenarios: [
      'Generic attachment selection',
      'Import file selection',
      'Custom drop-zone composition',
    ],
    contract: {
      props: [
        'accept',
        'allowedExtensions',
        'allowedMimeTypes',
        'maxFiles',
        'maxSize',
        'multiple',
        'disabled',
        'label',
        'description',
        'browseLabel',
        'removeLabel',
        'class',
      ],
      events: ['change', 'rejected', 'update:modelValue'],
      slots: ['content'],
      models: ['modelValue'],
    },
    states: ['idle', 'drag over', 'selected', 'rejected', 'at limit', 'disabled'],
    limitations: [
      'Despite its name, it selects local files only and has no upload transport lifecycle.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Delegates native button, live file list, and named removal behavior to FileUpload.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsBusinessDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Shared validation and controlled payload forwarding are asserted.',
    },
    businessUsages: ['ImageUpload', 'ImportDialog', 'Content FilePanel'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; retain local-selection meaning until a transport task API is designed.',
    },
  },
  {
    id: 'user-selector',
    kind: 'business',
    module: 'selection',
    displayName: 'UserSelector',
    sourcePath: 'src/components/admin/UserSelector.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Searches users remotely while exposing only a controlled numeric identifier.',
    businessScenarios: ['Owner assignment', 'Approver selection', 'Operator filter'],
    contract: {
      props: [
        'placeholder',
        'searchPlaceholder',
        'emptyLabel',
        'loadingLabel',
        'errorLabel',
        'clearLabel',
        'label',
        'disabled',
        'clearable',
        'pageSize',
        'status',
      ],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['loading', 'searching', 'empty', 'error', 'selected', 'suspended disabled', 'cleared'],
    limitations: [
      'Single selection only; pagination beyond the configured first page and cross-request result announcements are not exposed.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Delegates combobox and keyboard behavior to SearchableSelect and renders a visible query error.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsSelectionDisplayDemo.vue',
      'src/features/component-gallery/selection/SelectionExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/business-selection-components.spec.ts',
        'src/__tests__/selection-examples.spec.ts',
      ],
      coverage:
        'Remote query, option selection, numeric-ID-only output, and dedicated-route composition are asserted.',
    },
    businessUsages: ['Component gallery assignment example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; multi-user selection requires a separate privacy-reviewed contract.',
    },
  },
  {
    id: 'workflow-stepper',
    kind: 'business',
    module: 'workflow',
    displayName: 'WorkflowStepper',
    sourcePath: 'src/components/admin/WorkflowStepper.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Displays bounded current, completed, and upcoming workflow steps.',
    businessScenarios: ['Multi-step form', 'Approval workflow', 'Setup wizard'],
    contract: {
      props: ['steps', 'clickable'],
      events: ['update:modelValue'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['complete', 'current', 'upcoming', 'clickable', 'read-only'],
    limitations: [
      'Validation, navigation guards, skipped states, and error states are not modeled.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Current step uses aria-current; disabled buttons are skipped, but the ordered list has no aggregate progress announcement.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsWorkflowDemo.vue'],
    tests: {
      locations: [
        'src/__tests__/workflow-feedback-components.spec.ts',
        'src/__tests__/form-examples.spec.ts',
      ],
      coverage:
        'Bounds, click updates, aria-current, and a real stepped-form progression are asserted.',
    },
    businessUsages: ['Component gallery approval example'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; richer workflow states should extend the step type explicitly.',
    },
  },
] as const satisfies readonly ComponentCatalogEntry[]

// AI modified: Table demo evidence is promoted only after the independent route and behavior tests exist.
export const tableComponentCatalog = [
  {
    id: 'data-table',
    kind: 'table',
    module: 'tables',
    displayName: 'DataTable',
    sourcePath: 'src/components/data-table/DataTable.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'stable',
    summary:
      'Provides typed client-side sorting, pagination, selection, loading, empty, and declarative column text behavior.',
    businessScenarios: [
      'Administrative CRUD lists',
      'Client-side result sets',
      'Selectable operational tables',
    ],
    contract: {
      props: [
        'columns',
        'data',
        'emptyMessage',
        'isLoading',
        'defaultPageSize',
        'pageSizeOptions',
        'getRowId',
        'enableRowSelection',
        'getRowCanSelect',
      ],
      events: [
        'paginationChange',
        'sortingChange',
        'selectionChange',
        'update:pagination',
        'update:sorting',
        'update:selectedRowIds',
      ],
      slots: ['cell'],
      models: ['pagination', 'sorting', 'selectedRowIds'],
    },
    states: [
      'loading',
      'empty',
      'sorted',
      'paginated',
      'selected',
      'page-size change',
      'clamped last page',
      'long-text columns',
    ],
    limitations: [
      'The component is client-side only and does not own filtering, request cancellation, URL state, column configuration, editing, virtualization, or native tree expansion.',
      'DepartmentTreeTable currently preflattens department records and renders indentation inside DataTable; it is not a native tree-table implementation.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Uses semantic table markup and labelled pagination controls; sortable-header announcements and complex-table guidance need broader verification.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsCrudDemo.vue',
      'src/features/component-gallery/components/ComponentsDataDemo.vue',
      'src/features/component-gallery/components/ComponentsOperationsDemo.vue',
      'src/features/component-gallery/table/TableExamplesModule.vue',
    ],
    tests: {
      locations: ['src/__tests__/data-table.spec.ts'],
      coverage:
        'UI rows, page state, page-size validation, clamping, sorting, selection, and column text policy are asserted.',
    },
    businessUsages: [
      'MenusTable',
      'PositionsTable',
      'DictionaryEntryTable',
      'Monitoring tables',
      'DepartmentTreeTable',
    ],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; introduce server and tree examples without changing the shared zero-based pagination model.',
    },
  },
  {
    id: 'pro-table',
    kind: 'table',
    module: 'tables',
    displayName: 'ProTable',
    sourcePath: 'src/components/pro-table/ProTable.vue',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary:
      'Provides a configurable TanStack table with client or server state, editing, expansion, selection, virtualization, pinning, density, and fullscreen controls.',
    businessScenarios: [
      'Large administrative lists',
      'Server-paginated records',
      'Inline-editable configuration tables',
    ],
    contract: {
      props: [
        'columns',
        'data',
        'labels',
        'emptyMessage',
        'isLoading',
        'rowCount',
        'pageSizeOptions',
        'manualPagination',
        'manualSorting',
        'manualFiltering',
        'enableRowSelection',
        'enableExpanding',
        'enableVirtualization',
        'virtualHeight',
        'virtualOverscan',
        'enableColumnControls',
        'enableColumnOrdering',
        'enableColumnPinning',
        'enableDensity',
        'enableFullscreen',
        'getRowId',
        'getSubRows',
        'getRowCanSelect',
        'getRowCanExpand',
      ],
      events: [
        'paginationChange',
        'sortingChange',
        'filterChange',
        'selectionChange',
        'expandedChange',
        'editCommit',
      ],
      slots: [
        'cell',
        'expanded-row',
        'toolbar-leading',
        'toolbar-import',
        'toolbar-export',
        'toolbar-print',
      ],
      models: [
        'pagination',
        'sorting',
        'columnFilters',
        'selectedRowIds',
        'columnVisibility',
        'columnOrder',
        'columnPinning',
        'expanded',
        'density',
      ],
    },
    states: [
      'client data',
      'server data',
      'loading',
      'empty',
      'sorted',
      'filtered',
      'selected',
      'editing',
      'expanded',
      'virtualized',
      'pinned',
      'fullscreen',
      'density variants',
    ],
    limitations: [
      'The manual server example uses a deterministic in-browser adapter; production authentication, transport, and error classification remain API-layer responsibilities.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Selection and expansion controls are named and keyboard usable; grid-level editing, column movement, fullscreen, and virtualized-row behavior need a dedicated audit.',
      ],
    },
    demoLocations: ['src/features/component-gallery/table/TableExamplesModule.vue'],
    tests: {
      locations: ['src/__tests__/pro-table.spec.ts'],
      coverage:
        'Client/server pagination, sorting, filtering state, selection policy, editing, expansion, virtualization, column controls, loading, and empty states are asserted.',
    },
    businessUsages: ['UserTable', 'SystemParametersTable'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial catalog baseline; preserve the shared pagination contract while adding route-level examples.',
    },
  },
] as const satisfies readonly ComponentCatalogEntry[]

export const uiPrimitiveCatalog = [
  {
    id: 'ui-avatar',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Avatar',
    sourcePath: 'src/components/ui/avatar',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'shadcn-vue/Reka avatar family with image and fallback primitives.',
    businessScenarios: ['User identity', 'Assignee list', 'Profile summary'],
    contract: {
      props: ['class', 'delayMs', 'src', 'alt'],
      events: ['loadingStatusChange'],
      slots: ['default'],
      models: [],
    },
    states: ['image loaded', 'loading', 'fallback'],
    limitations: ['Business initials and privacy rules remain caller-owned.'],
    accessibility: {
      status: 'documented',
      notes: [
        'Avatar images require meaningful alt text; decorative avatars should use empty alt text.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsDataDemo.vue'],
    tests: {
      locations: ['src/__tests__/dashboard.spec.ts'],
      coverage:
        'Exercised indirectly in dashboard composition; image failure behavior is not directly asserted.',
    },
    businessUsages: ['Dashboard activity and user identity surfaces'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; compose this family instead of creating business-specific avatar wrappers.',
    },
  },
  {
    id: 'ui-badge',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Badge',
    sourcePath: 'src/components/ui/badge',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Styled compact label primitive with semantic variants.',
    businessScenarios: ['Counts', 'Categories', 'Non-domain labels'],
    contract: { props: ['variant', 'class', 'as'], events: [], slots: ['default'], models: [] },
    states: ['default', 'secondary', 'destructive', 'outline', 'long text'],
    limitations: ['Use StatusTag when a business status needs explicit tone semantics.'],
    accessibility: {
      status: 'documented',
      notes: ['Meaning must be present in text and never rely on color alone.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsDataDemo.vue',
      'src/features/component-gallery/components/ComponentsCrudDemo.vue',
    ],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts'],
      coverage: 'Long translated content containment is asserted indirectly.',
    },
    businessUsages: ['Table counts', 'Gallery maturity labels', 'Dashboard summaries'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; prefer StatusTag for domain status.',
    },
  },
  {
    id: 'ui-breadcrumb',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Breadcrumb',
    sourcePath: 'src/components/ui/breadcrumb',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Semantic breadcrumb family with link, page, separator, and ellipsis pieces.',
    businessScenarios: ['Route hierarchy', 'Deep detail context'],
    contract: { props: ['class', 'asChild', 'href'], events: [], slots: ['default'], models: [] },
    states: ['linked ancestor', 'current page', 'ellipsis', 'long path'],
    limitations: ['Route derivation and responsive collapse are owned by AppBreadcrumb.'],
    accessibility: {
      status: 'documented',
      notes: ['Uses navigation and ordered-list semantics with an explicit current page.'],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts', 'src/__tests__/layout-shell.spec.ts'],
      coverage: 'Direct breadcrumb semantics and indirect Shell route composition are asserted.',
    },
    businessUsages: ['AppBreadcrumb and AdminContextBar'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; keep route logic in the layout adapter.',
    },
  },
  {
    id: 'ui-button',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Button',
    sourcePath: 'src/components/ui/button',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Variant and size aware button primitive with polymorphic rendering.',
    businessScenarios: ['Primary actions', 'Toolbar actions', 'Icon controls'],
    contract: {
      props: ['variant', 'size', 'as', 'asChild', 'class', 'disabled'],
      events: ['click'],
      slots: ['default'],
      models: [],
    },
    states: ['variants', 'sizes', 'disabled', 'focus visible', 'icon only'],
    limitations: ['Icon-only consumers must always provide an accessible name.'],
    accessibility: {
      status: 'documented',
      notes: ['Native button semantics are the default and focus-visible styling is included.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFormDemo.vue',
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/admin-components.spec.ts',
        'src/__tests__/business-components.spec.ts',
      ],
      coverage:
        'Widely exercised through business interactions; variant rendering is not isolated.',
    },
    businessUsages: ['All administrative actions'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; do not wrap simple business actions without added behavior.',
    },
  },
  {
    id: 'ui-card',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Card',
    sourcePath: 'src/components/ui/card',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Composable card surface with header, title, description, content, footer, and action pieces.',
    businessScenarios: ['Dashboard panel', 'Metric grouping', 'Settings section'],
    contract: { props: ['class'], events: [], slots: ['default'], models: [] },
    states: ['header', 'content', 'footer', 'action', 'long text'],
    limitations: [
      'Cards do not add interaction semantics; clickable cards need a real link or button.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Consumers choose appropriate heading and landmark hierarchy.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentDemoCard.vue'],
    tests: {
      locations: ['src/__tests__/dashboard.spec.ts'],
      coverage:
        'Exercised through dashboard compositions; individual subcomponents are not isolated.',
    },
    businessUsages: ['Dashboard panels', 'Component demo cards', 'Configuration sections'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; business cards should compose these pieces.',
    },
  },
  {
    id: 'ui-chart',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Chart',
    sourcePath: 'src/components/ui/chart',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Chart styling, legend, and tooltip adapters for Unovis visualizations.',
    businessScenarios: ['Trend chart', 'Distribution chart', 'Dashboard visualization'],
    contract: {
      props: ['config', 'cursor', 'hideLabel', 'hideIndicator', 'indicator', 'nameKey', 'labelKey'],
      events: [],
      slots: ['default'],
      models: [],
    },
    states: [
      'chart content',
      'tooltip',
      'legend',
      'theme variants',
      'container resize',
      'hidden Tab restore',
    ],
    limitations: [
      'Accessible data tables, keyboard exploration, and empty or error states remain chart-owner responsibilities.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Visual legends exist; equivalent tabular data and non-pointer exploration are not provided by the primitive.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsDataDemo.vue'],
    tests: {
      locations: ['src/__tests__/dashboard.spec.ts', 'src/__tests__/chart-lifecycle.spec.ts'],
      coverage:
        'Dashboard rendering plus visible resize, duplicate-bound coalescing, and observer cleanup are asserted.',
    },
    businessUsages: ['Dashboard registration and role-distribution charts'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; pair every business chart with an accessible data alternative.',
    },
  },
  {
    id: 'ui-checkbox',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Checkbox',
    sourcePath: 'src/components/ui/checkbox',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Reka checkbox wrapper with checked, unchecked, and indeterminate states.',
    businessScenarios: ['Form boolean', 'Row selection', 'Tree checking'],
    contract: {
      props: ['modelValue', 'defaultValue', 'disabled', 'required', 'name', 'value', 'id', 'class'],
      events: ['update:modelValue'],
      slots: ['default'],
      models: ['modelValue'],
    },
    states: ['checked', 'unchecked', 'indeterminate', 'disabled'],
    limitations: ['Requires an associated visible or accessible label from the consumer.'],
    accessibility: {
      status: 'documented',
      notes: ['Reka supplies checkbox semantics and keyboard toggling.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/data-table.spec.ts', 'src/__tests__/admin-components.spec.ts'],
      coverage: 'Exercised through row selection and TreeView checking.',
    },
    businessUsages: ['DataTable selection', 'ProTable selection', 'TreeView checks'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; keep selection policy in owning components.',
    },
  },
  {
    id: 'ui-dialog',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Dialog primitives',
    sourcePath: 'src/components/ui/dialog',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Reka dialog family with trigger, overlay, content, scroll content, header, footer, title, description, and close pieces.',
    businessScenarios: ['Modal prompt', 'Business Dialog foundation', 'Short focused task'],
    contract: {
      props: ['open', 'defaultOpen', 'modal', 'class', 'closeLabel'],
      events: ['update:open'],
      slots: ['default'],
      models: ['open'],
    },
    states: ['closed', 'open', 'modal', 'scrolling'],
    limitations: [
      'Use the admin Dialog or FormDialog for standardized business layout and localization.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka owns focus trapping, escape handling, outside dismissal, labeling, and focus return.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/admin-components.spec.ts',
      ],
      coverage:
        'The raw dialog opens with dialog semantics; admin wrappers cover controlled close and business composition.',
    },
    businessUsages: ['Admin Dialog', 'FormDialog', 'ConfirmAction'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; business code should normally use the admin wrapper.',
    },
  },
  {
    id: 'ui-dropdown-menu',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'DropdownMenu',
    sourcePath: 'src/components/ui/dropdown-menu',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Reka dropdown-menu family with grouped, checkbox, radio, shortcut, separator, and submenu pieces.',
    businessScenarios: ['Row actions', 'Header account menu', 'Column configuration menu'],
    contract: {
      props: ['open', 'defaultOpen', 'modal', 'dir', 'class', 'inset', 'variant'],
      events: ['update:open', 'select'],
      slots: ['default'],
      models: ['open', 'modelValue'],
    },
    states: ['closed', 'open', 'checked', 'radio selected', 'submenu', 'disabled'],
    limitations: [
      'Business authorization must remove or disable actions before they reach the menu.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka supplies menu roles, typeahead, arrow navigation, escape handling, and focus return.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/layout-shell.spec.ts',
        'src/__tests__/pro-table.spec.ts',
      ],
      coverage:
        'Keyboard opening and action selection are asserted directly; Shell and table controls provide business coverage.',
    },
    businessUsages: ['AdminHeader account actions', 'ProTable column controls'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; permission filtering remains outside this primitive.',
    },
  },
  {
    id: 'ui-form',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Form primitives',
    sourcePath: 'src/components/ui/form',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'beta',
    summary:
      'vee-validate field context adapters for control, label, description, and validation message composition.',
    businessScenarios: ['Validated settings form', 'Account form', 'Record editor'],
    contract: { props: ['name', 'class', 'asChild'], events: [], slots: ['default'], models: [] },
    states: ['valid', 'invalid', 'described', 'required'],
    limitations: [
      'Schema choice, server errors, and dynamic workflows remain responsibilities of the dedicated Form module rather than the primitive family.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Connects controls to generated ids, descriptions, and error messages through field context.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
      'src/features/component-gallery/forms/FormExamplesPage.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/form-examples.spec.ts',
        'src/__tests__/form-workbench.spec.ts',
      ],
      coverage:
        'Direct label, description, validation, and submit behavior plus six route-level form patterns are asserted.',
    },
    businessUsages: ['Account forms', 'Administrative record forms'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; document composition before adding alternative form abstractions.',
    },
  },
  {
    id: 'ui-input',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Input',
    sourcePath: 'src/components/ui/input',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Styled native input with controlled model support.',
    businessScenarios: ['Text entry', 'Search', 'Email and numeric fields'],
    contract: {
      props: ['modelValue', 'defaultValue', 'type', 'class', 'disabled'],
      events: ['update:modelValue', 'input', 'change'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['empty', 'filled', 'disabled', 'invalid', 'focus visible'],
    limitations: ['Labels, descriptions, and validation messages must be composed explicitly.'],
    accessibility: {
      status: 'documented',
      notes: ['Preserves native input semantics and forwards ids and ARIA attributes.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFormDemo.vue',
      'src/features/component-gallery/components/ComponentsCrudDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/account-auth-ui.spec.ts',
        'src/__tests__/admin-components.spec.ts',
      ],
      coverage: 'Widely exercised through labelled forms and business controls.',
    },
    businessUsages: ['Search forms', 'Account forms', 'Administrative editors'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; use specialized business fields only when behavior is added.',
    },
  },
  {
    id: 'ui-label',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Label',
    sourcePath: 'src/components/ui/label',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Styled label primitive forwarding Reka label semantics.',
    businessScenarios: ['Form field naming', 'Editor labels', 'Filter labels'],
    contract: { props: ['for', 'asChild', 'class'], events: [], slots: ['default'], models: [] },
    states: ['enabled', 'disabled peer', 'long text'],
    limitations: ['The for value must match the owned form control id.'],
    accessibility: {
      status: 'documented',
      notes: ['Provides native label activation and association when for is supplied.'],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFormDemo.vue',
      'src/features/component-gallery/components/ComponentsCrudDemo.vue',
    ],
    tests: {
      locations: ['src/__tests__/account-auth-ui.spec.ts'],
      coverage: 'Exercised indirectly by user-facing form labels.',
    },
    businessUsages: ['All labelled administrative forms'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; no migration is required.',
    },
  },
  {
    id: 'ui-pagination',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Pagination primitives',
    sourcePath: 'src/components/ui/pagination',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Reka pagination family with page, edge, previous, next, and ellipsis pieces.',
    businessScenarios: ['List paging', 'Search results', 'Table paging foundation'],
    contract: {
      props: [
        'page',
        'defaultPage',
        'itemsPerPage',
        'total',
        'siblingCount',
        'showEdges',
        'disabled',
      ],
      events: ['update:page'],
      slots: ['default'],
      models: ['page'],
    },
    states: ['first', 'middle', 'last', 'ellipsis', 'disabled'],
    limitations: [
      'Use admin Pagination or table pagination adapters for business totals and page-size behavior.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Provides pagination navigation and labelled boundary controls through composed pieces.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
      'src/features/component-gallery/components/ComponentsBusinessDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/data-table.spec.ts',
      ],
      coverage:
        'Direct primitive navigation and the shared admin/table pagination contracts are asserted.',
    },
    businessUsages: ['Admin Pagination', 'DataTablePagination', 'ProTablePagination'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; do not bypass shared pagination validation.',
    },
  },
  {
    id: 'ui-popover',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Popover',
    sourcePath: 'src/components/ui/popover',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Reka popover family with trigger, anchor, and positioned content.',
    businessScenarios: ['Compact editor', 'Searchable selector', 'Date-range picker'],
    contract: {
      props: ['open', 'defaultOpen', 'modal', 'class', 'side', 'align', 'sideOffset'],
      events: ['update:open'],
      slots: ['default'],
      models: ['open'],
    },
    states: ['closed', 'open', 'positioned', 'modal'],
    limitations: [
      'Use Dialog for tasks that require a stronger modal boundary or substantial content.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka manages trigger relationships, escape dismissal, outside interaction, and focus behavior.',
      ],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFeedbackDemo.vue'],
    tests: {
      locations: ['src/__tests__/admin-components.spec.ts'],
      coverage: 'Exercised indirectly through SearchableSelect and other popover-based controls.',
    },
    businessUsages: ['SearchableSelect', 'DateRangePicker', 'IconSelector'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; keep business search behavior in selector components.',
    },
  },
  {
    id: 'ui-resizable',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Resizable panels',
    sourcePath: 'src/components/ui/resizable',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'planned',
    },
    maturity: 'beta',
    summary: 'Reka splitter wrappers for keyboard-resizable panel groups and handles.',
    businessScenarios: ['Editor split view', 'Master-detail workspace'],
    contract: {
      props: [
        'direction',
        'autoSaveId',
        'defaultLayout',
        'minSize',
        'maxSize',
        'collapsible',
        'withHandle',
        'class',
      ],
      events: ['layout', 'resize', 'collapse', 'expand'],
      slots: ['default'],
      models: [],
    },
    states: ['horizontal', 'vertical', 'collapsed', 'dragging'],
    limitations: [
      'The example documents responsive ownership, but persisted layout policy and direct keyboard-resize verification remain future work.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Reka splitter semantics support keyboard resizing; target sizes and narrow-screen replacement need verification.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts'],
      coverage:
        'Direct panel and named-handle rendering is asserted; resize deltas, collapse, and persistence remain untested.',
    },
    businessUsages: [],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; validate a real workspace need before adding a business wrapper.',
    },
  },
  {
    id: 'ui-scroll-area',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'ScrollArea',
    sourcePath: 'src/components/ui/scroll-area',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Reka scroll-area viewport and scrollbar wrappers with themed controls.',
    businessScenarios: ['Long menus', 'Compact side panels', 'Contained history'],
    contract: {
      props: ['type', 'scrollHideDelay', 'dir', 'class', 'orientation'],
      events: ['scroll'],
      slots: ['default'],
      models: [],
    },
    states: ['vertical', 'horizontal', 'both axes', 'overflowing'],
    limitations: [
      'Native document scrolling should remain the default unless a contained viewport is required.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Viewport remains focus-visible; keyboard and screen-reader behavior depends on contained content.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts'],
      coverage:
        'A named, focusable bounded viewport is asserted; wheel, keyboard scrolling, and scrollbar geometry remain untested.',
    },
    businessUsages: ['Long primitive-side content where explicitly composed'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; avoid nested scroll areas without a documented need.',
    },
  },
  {
    id: 'ui-select',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Select primitives',
    sourcePath: 'src/components/ui/select',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary:
      'Reka single-select family with groups, items, labels, separators, value, and scrolling controls.',
    businessScenarios: ['Enum field', 'Page-size selection', 'Settings choice'],
    contract: {
      props: [
        'modelValue',
        'defaultValue',
        'open',
        'defaultOpen',
        'disabled',
        'required',
        'name',
        'autocomplete',
        'dir',
      ],
      events: ['update:modelValue', 'update:open'],
      slots: ['default'],
      models: ['modelValue', 'open'],
    },
    states: ['closed', 'open', 'selected', 'placeholder', 'disabled', 'grouped', 'scrolling'],
    limitations: [
      'Search, multiple selection, hierarchy, and remote loading require dedicated components.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka supplies combobox/listbox semantics, typeahead, keyboard selection, and focus management.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/components/ComponentsFormDemo.vue',
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
    ],
    tests: {
      locations: ['src/__tests__/business-components.spec.ts', 'src/__tests__/data-table.spec.ts'],
      coverage: 'Exercised through DictSelect and pagination page-size selection.',
    },
    businessUsages: ['Administrative forms', 'Pagination', 'Appearance settings'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; use SearchableSelect when option discovery is required.',
    },
  },
  {
    id: 'ui-separator',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Separator',
    sourcePath: 'src/components/ui/separator',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Horizontal or vertical visual separator with optional semantic exposure.',
    businessScenarios: ['Toolbar grouping', 'Menu grouping', 'Panel division'],
    contract: {
      props: ['orientation', 'decorative', 'asChild', 'class'],
      events: [],
      slots: [],
      models: [],
    },
    states: ['horizontal', 'vertical', 'decorative', 'semantic'],
    limitations: [
      'Do not use multiple adjacent separators to compensate for unclear surface ownership.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Defaults to decorative; semantic separators must be intentionally requested.'],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts'],
      coverage:
        'Direct semantic separator composition is rendered; vertical orientation is not isolated.',
    },
    businessUsages: ['Menu and toolbar grouping'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; shell boundary ownership remains in layout contracts.',
    },
  },
  {
    id: 'ui-sheet',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Sheet primitives',
    sourcePath: 'src/components/ui/sheet',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Reka sheet family for side-positioned modal content.',
    businessScenarios: ['Drawer foundation', 'Mobile navigation', 'Contextual settings'],
    contract: {
      props: ['open', 'defaultOpen', 'modal', 'side', 'class', 'closeLabel'],
      events: ['update:open'],
      slots: ['default'],
      models: ['open'],
    },
    states: ['closed', 'open', 'top', 'right', 'bottom', 'left'],
    limitations: [
      'Use admin Drawer or DetailDrawer for standardized business headers, sizing, scrolling, and localization.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka manages modal labeling, focus trap, escape handling, outside dismissal, and focus return.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
      'src/features/component-gallery/components/ComponentsBusinessDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/business-components.spec.ts',
        'src/__tests__/layout-shell.spec.ts',
      ],
      coverage:
        'The raw Sheet opens with dialog semantics; Drawer and mobile Shell composition remain covered indirectly.',
    },
    businessUsages: ['Admin Drawer', 'DetailDrawer', 'Mobile navigation'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; business code should normally use an admin wrapper.',
    },
  },
  {
    id: 'ui-sidebar',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Sidebar primitives',
    sourcePath: 'src/components/ui/sidebar',
    availability: {
      implementation: 'implemented',
      // AI modified: the Gallery documents Sidebar ownership but intentionally does not mount its Provider.
      demo: 'indirect',
      test: 'partial',
      enhancement: 'none',
    },
    maturity: 'beta',
    summary:
      'Generated shadcn-vue sidebar family with provider, rail, groups, menus, and mobile sheet behavior.',
    businessScenarios: ['Alternative application sidebar composition'],
    contract: {
      props: ['defaultOpen', 'open', 'side', 'variant', 'collapsible', 'class'],
      events: ['update:open'],
      slots: ['default'],
      models: ['open'],
    },
    states: ['expanded', 'collapsed', 'icon rail', 'mobile sheet'],
    limitations: [
      'The application Shell uses ConfigurableAdminLayout and AdminNavigation as the authoritative architecture; this unused primitive family must not become a second competing sidebar contract.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'Provider includes a keyboard shortcut and mobile sheet; project-specific menu depth and flyout behavior are not represented.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts'],
      coverage:
        'The documentation example asserts that no nested Sidebar provider is mounted; runtime behavior stays intentionally unadopted.',
    },
    businessUsages: [],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; retain for upstream compatibility but do not adopt without an explicit shell migration decision.',
    },
  },
  {
    id: 'ui-skeleton',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Skeleton',
    sourcePath: 'src/components/ui/skeleton',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Token-based animated placeholder block for known loading geometry.',
    businessScenarios: ['Table loading', 'Card loading', 'Detail placeholder'],
    contract: { props: ['class'], events: [], slots: [], models: [] },
    states: ['animated placeholder', 'custom geometry'],
    limitations: ['Consumers must match final layout and provide aria-busy on the owning region.'],
    accessibility: {
      status: 'partial',
      notes: [
        'The block is visual only; loading announcements belong to its owning region and reduced-motion CSS.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
    ],
    tests: {
      locations: ['src/__tests__/primitive-examples.spec.ts', 'src/__tests__/pro-table.spec.ts'],
      coverage:
        'Direct aria-busy loading-to-ready composition and ProTable loading rows are asserted.',
    },
    businessUsages: ['ProTable loading rows', 'Dashboard placeholders'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; pair with semantic loading state.',
    },
  },
  {
    id: 'ui-sonner',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Sonner',
    sourcePath: 'src/components/ui/sonner',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'required',
    },
    maturity: 'beta',
    summary:
      'Theme-integrated vue-sonner toaster with status-specific icons and long-text wrapping.',
    businessScenarios: ['Mutation result', 'Copy feedback', 'Connectivity recovery'],
    contract: {
      props: ['position', 'duration', 'visibleToasts', 'closeButton', 'richColors', 'class'],
      events: [],
      slots: [],
      models: [],
    },
    states: ['success', 'info', 'warning', 'error', 'loading', 'dismissed'],
    limitations: [
      'Critical or persistent errors require an in-page state; toast announcements and deduplication policy need explicit validation.',
    ],
    accessibility: {
      status: 'partial',
      notes: [
        'vue-sonner supplies live announcements, but priority, duration, and actionable-toast keyboard behavior need project tests.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
      'src/features/component-gallery/components/ComponentsFeedbackDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/long-text-states.spec.ts',
      ],
      coverage:
        'A direct success announcement and long unbroken error rendering are asserted; deduplication and actionable-toast policy remain backlog.',
    },
    businessUsages: ['Administrative mutation feedback', 'NetworkStatus recovery'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; establish global error classification before adding toast variants.',
    },
  },
  {
    id: 'ui-switch',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Switch',
    sourcePath: 'src/components/ui/switch',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Reka binary switch with explicit paint and thumb transitions.',
    businessScenarios: ['Boolean setting', 'Feature toggle field', 'Immediate preference'],
    contract: {
      props: ['modelValue', 'defaultValue', 'disabled', 'required', 'name', 'value', 'id', 'class'],
      events: ['update:modelValue'],
      slots: ['thumb'],
      models: ['modelValue'],
    },
    states: ['on', 'off', 'disabled', 'focus visible'],
    limitations: [
      'Requires a persistent visible label and should not replace a checkbox for multi-select choices.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Reka supplies switch role and keyboard toggling; consumers provide the label.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/appearance.spec.ts'],
      coverage: 'Exercised indirectly through controlled appearance preferences.',
    },
    businessUsages: ['Appearance and configuration boolean fields'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; no migration is required.',
    },
  },
  {
    id: 'ui-table',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Table primitives',
    sourcePath: 'src/components/ui/table',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'covered',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Semantic table family with responsive overflow viewport and structural pieces.',
    businessScenarios: ['Simple read-only table', 'DataTable foundation', 'ProTable foundation'],
    contract: { props: ['class'], events: [], slots: ['default'], models: [] },
    states: ['header', 'body', 'footer', 'caption', 'empty', 'horizontal overflow'],
    limitations: [
      'Sorting, pagination, selection, editing, and virtualization belong to DataTable or ProTable.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Preserves native table semantics; consumers own captions, header scopes, and complex-table descriptions.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveStructureExamples.vue',
      'src/features/component-gallery/components/ComponentsDataDemo.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/data-table.spec.ts',
        'src/__tests__/pro-table.spec.ts',
      ],
      coverage:
        'Direct caption/header semantics and both higher-order table contracts are asserted.',
    },
    businessUsages: ['DataTable', 'ProTable', 'Administrative data views'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; do not recreate table behavior at the primitive layer.',
    },
  },
  {
    id: 'ui-tabs',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Tabs',
    sourcePath: 'src/components/ui/tabs',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Reka tabs family with root, list, trigger, and panel pieces.',
    businessScenarios: ['Settings sections', 'Detail categories', 'Gallery navigation'],
    contract: {
      props: ['modelValue', 'defaultValue', 'orientation', 'dir', 'activationMode', 'class'],
      events: ['update:modelValue'],
      slots: ['default'],
      models: ['modelValue'],
    },
    states: ['active', 'inactive', 'disabled', 'horizontal', 'vertical'],
    limitations: [
      'Route-level component modules should use independent routes rather than one oversized tab surface.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Reka supplies tablist, tab, tabpanel, roving focus, and activation semantics.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsGallery.vue'],
    tests: {
      locations: ['src/__tests__/admin-tabs.spec.ts'],
      coverage:
        'The separate route-tab layout is tested; base primitive activation is exercised indirectly.',
    },
    businessUsages: ['Current component gallery', 'Tabbed administrative content'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; component-center route splitting will reduce reliance on a single tab root.',
    },
  },
  {
    id: 'ui-textarea',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Textarea',
    sourcePath: 'src/components/ui/textarea',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'indirect',
      enhancement: 'none',
    },
    maturity: 'stable',
    summary: 'Styled native multiline input with controlled model support.',
    businessScenarios: ['Description field', 'Plain-text editor', 'Long-form notes'],
    contract: {
      props: ['modelValue', 'defaultValue', 'class', 'disabled', 'readonly'],
      events: ['update:modelValue', 'input', 'change'],
      slots: [],
      models: ['modelValue'],
    },
    states: ['empty', 'filled', 'read-only', 'disabled', 'resizable'],
    limitations: [
      'Labels, validation, character budgets, and rich content are composed separately.',
    ],
    accessibility: {
      status: 'documented',
      notes: ['Preserves native textarea semantics and forwards ids and ARIA attributes.'],
    },
    demoLocations: ['src/features/component-gallery/components/ComponentsFormDemo.vue'],
    tests: {
      locations: ['src/__tests__/business-selection-components.spec.ts'],
      coverage: 'Exercised through MarkdownEditor and CodeEditor controlled behavior.',
    },
    businessUsages: ['Search and record forms', 'CodeEditor', 'MarkdownEditor'],
    release: {
      version: '0.0.0',
      migrationNote: 'Initial primitive inventory; no migration is required.',
    },
  },
  {
    id: 'ui-tooltip',
    kind: 'ui-primitive',
    module: 'primitives',
    displayName: 'Tooltip',
    sourcePath: 'src/components/ui/tooltip',
    availability: {
      implementation: 'implemented',
      demo: 'available',
      test: 'partial',
      enhancement: 'planned',
    },
    maturity: 'stable',
    summary: 'Reka tooltip provider, root, trigger, and content wrappers.',
    businessScenarios: [
      'Icon-control description',
      'Collapsed navigation label',
      'Supplementary explanation',
    ],
    contract: {
      props: [
        'open',
        'defaultOpen',
        'delayDuration',
        'disableHoverableContent',
        'class',
        'side',
        'align',
      ],
      events: ['update:open'],
      slots: ['default'],
      models: ['open'],
    },
    states: ['closed', 'delayed open', 'keyboard focus', 'positioned'],
    limitations: [
      'Tooltips cannot contain essential instructions or replace a visible label for complex controls.',
    ],
    accessibility: {
      status: 'documented',
      notes: [
        'Reka connects trigger and tooltip content and supports pointer and keyboard focus activation.',
      ],
    },
    demoLocations: [
      'src/features/component-gallery/primitives/components/PrimitiveOverlayExamples.vue',
    ],
    tests: {
      locations: [
        'src/__tests__/primitive-examples.spec.ts',
        'src/__tests__/layout-shell.spec.ts',
        'src/__tests__/admin-navigation.spec.ts',
      ],
      coverage:
        'A directly named icon trigger and indirect Shell focus affordances are asserted; delayed hover timing remains untested.',
    },
    businessUsages: ['Shell collapse controls', 'Collapsed navigation', 'Icon-only actions'],
    release: {
      version: '0.0.0',
      migrationNote:
        'Initial primitive inventory; essential names must remain in aria-label even when a tooltip exists.',
    },
  },
] as const satisfies readonly ComponentCatalogEntry[]

// AI modified: consumers retain the full status union even when the current audited catalog has no missing evidence.
export const componentCatalog: readonly ComponentCatalogEntry[] = [
  ...adminComponentCatalog,
  ...tableComponentCatalog,
  ...uiPrimitiveCatalog,
]
