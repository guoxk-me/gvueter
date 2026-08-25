import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import PageHeader from '@/components/admin/PageHeader.vue'
import { ADMIN_SHELL_METRICS } from '@/components/layout/layout-contract'

async function readWorkspaceFile(path: string): Promise<string> {
  return readFile(resolve(process.cwd(), path), 'utf8')
}

describe('admin page design contract', () => {
  it('keeps the shared title copy and actions shrinkable under long content', () => {
    const wrapper = shallowMount(PageHeader, {
      props: {
        title: 'A deliberately long administration page title that must remain readable',
        description:
          'Long translated descriptions wrap without moving the action group off screen.',
      },
      slots: {
        actions: '<button type="button">Primary action</button>',
      },
    })

    expect(wrapper.get('header').attributes('data-page-region')).toBe('header')
    expect(wrapper.get('[data-page-header-copy]').classes()).toContain('min-w-0')
    expect(wrapper.get('h1').classes()).toEqual(
      expect.arrayContaining(['break-words', 'text-pretty']),
    )
    expect(wrapper.get('[data-page-header-actions]').classes()).toEqual(
      expect.arrayContaining(['min-w-0', 'flex-wrap']),
    )
  })

  it('projects TypeScript Shell metrics into the CSS token contract', async () => {
    const source = await readWorkspaceFile('src/assets/css/main.css')

    expect(source).toContain(`--admin-shell-header-height: ${ADMIN_SHELL_METRICS.headerHeight};`)
    expect(source).toContain(
      `--admin-context-breadcrumb-height: ${ADMIN_SHELL_METRICS.breadcrumbHeight};`,
    )
    expect(source).toContain(`--admin-context-tabs-height: ${ADMIN_SHELL_METRICS.tabsHeight};`)
    expect(source).toContain(`--admin-touch-target: ${ADMIN_SHELL_METRICS.touchTarget};`)
    expect(source).toContain(`--breakpoint-lg: ${ADMIN_SHELL_METRICS.desktopBreakpoint};`)
    expect(source).toContain('@media (pointer: coarse)')
    expect(source).toContain('[data-admin-navigation-target]')
    expect(source).toContain('button,')
    expect(source).toContain('a[href],')
  })

  it('keeps narrow content overflow inside shared surfaces', async () => {
    const [searchForm, table, pageHeader, chart, permissionMatrix, treeView] = await Promise.all([
      readWorkspaceFile('src/components/admin/SearchForm.vue'),
      readWorkspaceFile('src/components/ui/table/Table.vue'),
      readWorkspaceFile('src/components/admin/PageHeader.vue'),
      readWorkspaceFile('src/components/ui/chart/ChartContainer.vue'),
      readWorkspaceFile('src/features/roles/components/RolePermissionMatrix.vue'),
      readWorkspaceFile('src/components/admin/TreeView.vue'),
    ])

    // AI modified: source assertions guard the responsive utility contract without viewport-dependent jsdom layout.
    expect(searchForm).toContain('sm:grid-cols-2 xl:grid-cols-4')
    expect(table).toContain('w-full overflow-auto')
    expect(pageHeader).toContain('flex-col')
    expect(pageHeader).toContain('sm:flex-row')
    expect(chart).toContain('min-w-0')
    expect(permissionMatrix).toContain('min-w-175')
    expect(treeView).toContain('min-w-0 truncate')
  })

  it('uses responsive Sheets for Shell workflows and preserves Dialog for atomic decisions', async () => {
    const [shell, appearancePanel, drawer, confirmation] = await Promise.all([
      readWorkspaceFile('src/components/layout/ConfigurableAdminLayout.vue'),
      readWorkspaceFile('src/components/layout/AppearancePanel.vue'),
      readWorkspaceFile('src/components/admin/Drawer.vue'),
      readWorkspaceFile('src/components/admin/ConfirmAction.vue'),
    ])

    expect(shell).toContain('<Sheet v-model:open="isMobileNavigationOpen">')
    expect(appearancePanel).toContain('<Sheet v-model:open="isOpen">')
    expect(drawer).toContain('<Sheet v-model:open="isOpen">')
    expect(confirmation).toContain('<Dialog v-model:open="isOpen">')
  })
})
