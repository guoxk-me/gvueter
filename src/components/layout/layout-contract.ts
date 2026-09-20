import type { LayoutMode } from '@/stores/appearance'

export type PrimaryNavigationPlacement = 'header' | 'rail' | 'sidebar'
export type SecondaryNavigationPlacement = 'horizontal' | 'none' | 'sidebar'
export type AdminNavigationVariant = 'horizontal' | 'rail' | 'vertical'
export type AdminBrandPlacement = 'header' | 'primary'
export type AdminCollapseTarget = 'none' | 'primary' | 'secondary'
export type AdminChildPresentation = 'flyout' | 'inline' | 'secondary'

// AI modified: Shell chrome, context rows, and coarse-pointer controls share explicit geometry.
export const ADMIN_SHELL_METRICS = {
  desktopBreakpointPx: 1024,
  desktopBreakpoint: '64rem',
  headerHeight: '3.5rem',
  tabsHeight: '2.5rem',
  touchTarget: '2.75rem',
  sidebarWidth: '15rem',
  railWidth: '4.5rem',
  navigationFlyoutWidth: '17.5rem',
} as const

export const ADMIN_DESKTOP_BREAKPOINT_PX = ADMIN_SHELL_METRICS.desktopBreakpointPx

export interface AdminLayoutDefinition {
  mode: LayoutMode
  gridTemplateAreas: string
  gridTemplateColumns: string
  gridTemplateRows: string
  previewGridTemplateColumns: string
  previewGridTemplateRows: string
  primaryNavigation: PrimaryNavigationPlacement
  secondaryNavigation: SecondaryNavigationPlacement
  brandPlacement: AdminBrandPlacement
  collapseTarget: AdminCollapseTarget
  childPresentation: AdminChildPresentation
  desktopBreakpoint: typeof ADMIN_DESKTOP_BREAKPOINT_PX
  canConfigureStickyHeader: boolean
}

export interface AdminNavigationWidths {
  primary: string
  secondary: string
}

const ADMIN_LAYOUT_DEFINITIONS = {
  sidebar: {
    mode: 'sidebar',
    gridTemplateAreas: '"primary header" "primary body"',
    gridTemplateColumns: 'var(--admin-sidebar-width) minmax(0, 1fr)',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    previewGridTemplateColumns: '0.8rem minmax(0, 1fr)',
    previewGridTemplateRows: '0.55rem minmax(0, 1fr)',
    primaryNavigation: 'sidebar',
    secondaryNavigation: 'none',
    brandPlacement: 'primary',
    collapseTarget: 'primary',
    childPresentation: 'inline',
    desktopBreakpoint: ADMIN_DESKTOP_BREAKPOINT_PX,
    canConfigureStickyHeader: false,
  },
  top: {
    mode: 'top',
    gridTemplateAreas: '"header" "body"',
    gridTemplateColumns: 'minmax(0, 1fr)',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    previewGridTemplateColumns: 'minmax(0, 1fr)',
    previewGridTemplateRows: '0.55rem minmax(0, 1fr)',
    primaryNavigation: 'header',
    secondaryNavigation: 'none',
    brandPlacement: 'header',
    collapseTarget: 'none',
    childPresentation: 'flyout',
    desktopBreakpoint: ADMIN_DESKTOP_BREAKPOINT_PX,
    canConfigureStickyHeader: false,
  },
  mixed: {
    mode: 'mixed',
    gridTemplateAreas: '"primary secondary header" "primary secondary body"',
    gridTemplateColumns: 'var(--admin-sidebar-width) var(--admin-secondary-width) minmax(0, 1fr)',
    gridTemplateRows: 'auto minmax(0, 1fr)',
    previewGridTemplateColumns: '0.45rem 0.75rem minmax(0, 1fr)',
    previewGridTemplateRows: '0.55rem minmax(0, 1fr)',
    primaryNavigation: 'rail',
    secondaryNavigation: 'sidebar',
    brandPlacement: 'primary',
    collapseTarget: 'secondary',
    childPresentation: 'secondary',
    desktopBreakpoint: ADMIN_DESKTOP_BREAKPOINT_PX,
    canConfigureStickyHeader: false,
  },
} as const satisfies Record<LayoutMode, AdminLayoutDefinition>

/**
 * Gives the shell one authoritative grid contract for every persisted layout mode.
 */
export function getAdminLayoutDefinition(layoutMode: LayoutMode): AdminLayoutDefinition {
  return ADMIN_LAYOUT_DEFINITIONS[layoutMode]
}

export function getAdminNavigationWidths(
  layoutMode: LayoutMode,
  isCollapsed: boolean,
): AdminNavigationWidths {
  const layoutDefinition = getAdminLayoutDefinition(layoutMode)
  const hasCollapsedTarget = isCollapsed && layoutDefinition.collapseTarget !== 'none'

  // AI modified: mixed mode collapses its secondary column to zero instead of creating a second rail.
  return {
    primary:
      layoutDefinition.primaryNavigation === 'header'
        ? '0rem'
        : layoutDefinition.primaryNavigation === 'rail'
          ? ADMIN_SHELL_METRICS.railWidth
          : hasCollapsedTarget && layoutDefinition.collapseTarget === 'primary'
            ? ADMIN_SHELL_METRICS.railWidth
            : ADMIN_SHELL_METRICS.sidebarWidth,
    secondary:
      layoutDefinition.secondaryNavigation !== 'sidebar'
        ? '0rem'
        : hasCollapsedTarget && layoutDefinition.collapseTarget === 'secondary'
          ? layoutMode === 'mixed'
            ? '0rem'
            : ADMIN_SHELL_METRICS.railWidth
          : ADMIN_SHELL_METRICS.sidebarWidth,
  }
}
