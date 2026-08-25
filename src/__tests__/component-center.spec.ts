import type { VueWrapper } from '@vue/test-utils'
import type {
  ComponentCatalogEntry,
  ComponentCatalogModule,
} from '@/features/component-gallery/component-catalog'
import type { ComponentCenterModuleDefinition } from '@/features/component-gallery/component-center-modules'
import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import {
  componentCatalog,
  tableComponentCatalog,
} from '@/features/component-gallery/component-catalog'
import { componentCenterModules } from '@/features/component-gallery/component-center-modules'
import { componentModuleExamples } from '@/features/component-gallery/component-module-examples'
import ComponentCatalogModuleView from '@/features/component-gallery/components/ComponentCatalogModuleView.vue'
import ComponentModuleCatalog from '@/features/component-gallery/components/ComponentModuleCatalog.vue'
import ComponentsGallery from '@/features/component-gallery/components/ComponentsGallery.vue'
import { i18n, setLocale } from '@/i18n'
import { adminNavigationItems } from '@/router/admin-navigation'
import adminRoutes from '@/router/routes/admin'

const mountedViews: VueWrapper[] = []
const tableCatalogFixtures = [
  tableComponentCatalog[0],
  {
    ...tableComponentCatalog[1],
    availability: {
      ...tableComponentCatalog[1].availability,
      demo: 'missing',
    },
    demoLocations: [],
  },
] as const satisfies readonly ComponentCatalogEntry[]

async function mountTableCatalog(): Promise<VueWrapper> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/components', component: { template: '<div />' } },
      { path: '/components/table', component: { template: '<div />' } },
    ],
  })
  await router.push('/components/table')
  await router.isReady()

  const tableDefinition = componentCenterModules.find(
    componentModule => componentModule.id === 'tables',
  )
  if (!tableDefinition)
    throw new Error('Missing table module definition')

  const wrapper = mount(ComponentCatalogModuleView, {
    props: {
      definition: tableDefinition as ComponentCenterModuleDefinition,
      entries: tableCatalogFixtures,
    },
    global: { plugins: [router, i18n] },
  })
  mountedViews.push(wrapper)
  return wrapper
}

beforeEach(() => {
  setLocale('en-US')
})

afterEach(() => {
  for (const mountedView of mountedViews) mountedView.unmount()
  mountedViews.length = 0
})

describe('component center route modules', () => {
  it('renders module destinations and navigates without tab-only state', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/components', component: { template: '<div />' } },
        ...componentCenterModules.map(componentModule => ({
          path: componentModule.path,
          component: { template: '<div />' },
        })),
      ],
    })
    await router.push('/components')
    await router.isReady()
    const wrapper = mount(ComponentsGallery, {
      global: { plugins: [router, i18n] },
    })
    mountedViews.push(wrapper)

    const moduleLinks = wrapper
      .findAll('a')
      .filter(link =>
        componentCenterModules.some(
          componentModule => componentModule.path === link.attributes('href'),
        ),
      )
    expect(moduleLinks).toHaveLength(componentCenterModules.length)
    expect(wrapper.text()).toContain('Inventoried components')
    expect(wrapper.text()).toContain(String(componentCatalog.length))

    await moduleLinks[0]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe(componentCenterModules[0].path)
  })

  it('gives every catalog family exactly one stable route owner', () => {
    const ownedCatalogModules = componentCenterModules.flatMap(
      componentModule => componentModule.catalogModules,
    )
    const catalogModules = [
      ...new Set<ComponentCatalogModule>(componentCatalog.map(component => component.module)),
    ]

    expect(new Set(ownedCatalogModules).size).toBe(ownedCatalogModules.length)
    expect([...ownedCatalogModules].sort()).toEqual(catalogModules.sort())
    expect(
      new Set(componentCenterModules.map(componentModule => componentModule.path)).size,
    ).toBe(componentCenterModules.length)
  })

  it('makes every independent module discoverable from global search', () => {
    const searchablePaths = adminNavigationItems.map(navigationItem => navigationItem.to)

    for (const componentModule of componentCenterModules)
      expect(searchablePaths).toContain(componentModule.path)
  })

  it('registers every module path before the authenticated catch-all route', () => {
    const adminRoot = adminRoutes.find(route => route.name === 'admin-root')
    const staticPaths = adminRoot?.children?.map(route => `/${route.path}`) ?? []

    for (const componentModule of componentCenterModules)
      expect(staticPaths).toContain(componentModule.path)

    expect(staticPaths.indexOf('/components/table')).toBeLessThan(
      staticPaths.indexOf('/:pathMatch(.*)*'),
    )
  })

  it('keeps existing interactive examples in fixed local module registries', () => {
    expect(componentModuleExamples.selection?.map(example => example.id)).toEqual([
      'discovery',
      'hierarchy',
      'selection-display',
    ])
    expect(componentModuleExamples.patterns?.map(example => example.id)).toEqual([
      'page-states',
      'data',
      'feedback',
      'operations',
      'crud',
      'workflow',
      'business',
    ])
  })

  it('filters catalog records through visible user controls', async () => {
    const wrapper = await mountTableCatalog()
    const firstTable = tableCatalogFixtures[0]
    const secondTable = tableCatalogFixtures[1]

    expect(wrapper.findAll('[data-component-catalog-entry]')).toHaveLength(2)
    await wrapper.find('input[type="search"]').setValue(firstTable.displayName)

    expect(wrapper.find(`[data-component-catalog-entry="${firstTable.id}"]`).exists()).toBe(true)
    expect(wrapper.find(`[data-component-catalog-entry="${secondTable.id}"]`).exists()).toBe(false)

    await wrapper.find('input[type="search"]').setValue('')
    const missingDemoButton = wrapper
      .findAll('button')
      .find(button => button.text().includes('Missing demo'))
    expect(missingDemoButton).toBeDefined()
    await missingDemoButton!.trigger('click')

    const missingDemoIds = tableCatalogFixtures
      .filter(component => component.availability.demo === 'missing')
      .map(component => component.id)
    expect(
      wrapper
        .findAll('[data-component-catalog-entry]')
        .map(card => card.attributes('data-component-catalog-entry')),
    ).toEqual(missingDemoIds)
  })

  it('renders the public documentation contract and evidence labels', async () => {
    const wrapper = await mountTableCatalog()

    expect(wrapper.text()).toContain('Implementation')
    expect(wrapper.text()).toContain('Demo')
    expect(wrapper.text()).toContain('Test')
    expect(wrapper.text()).toContain('Enhancement')
    expect(wrapper.text()).toContain('API contract')
    expect(wrapper.text()).toContain('Copyable import')
    expect(wrapper.text()).toContain('import DataTable from \'@/components/data-table/DataTable\'')
    expect(wrapper.text()).not.toContain('<DataTable />')
    expect(wrapper.text()).toContain('Accessibility and test evidence')
    expect(wrapper.text()).toContain('Version and migration')
  })

  it('keeps the complete component contract reachable from dedicated demo routes', async () => {
    const wrapper = mount(ComponentModuleCatalog, {
      props: { modules: ['tables'] },
      global: { plugins: [i18n] },
    })
    mountedViews.push(wrapper)

    // AI modified: dedicated routes document every component owned by the module, not only the two table engines.
    expect(wrapper.findAll('[data-component-catalog-entry]')).toHaveLength(
      componentCatalog.filter(entry => entry.module === 'tables').length,
    )
    await wrapper.get('input[type="search"]').setValue('ProTable')
    expect(wrapper.findAll('[data-component-catalog-entry]')).toHaveLength(1)
    expect(wrapper.text()).toContain('Props')
    expect(wrapper.text()).toContain('Version and migration')
  })
})
