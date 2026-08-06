import type { Component } from 'vue'
import { enableAutoUnmount, flushPromises, shallowMount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import TableExamplesPage from '@/pages/admin/components/TableExamplesPage.vue'
import ContentAdminPage from '@/pages/admin/ContentAdminPage.vue'
import DictionariesPage from '@/pages/admin/DictionariesPage.vue'
import MonitoringPage from '@/pages/admin/MonitoringPage.vue'
import SystemConfigPage from '@/pages/admin/SystemConfigPage.vue'

enableAutoUnmount(afterEach)

async function getPageRouter(path: string, component: Component) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/page', component }],
  })
  await router.push(path)
  await router.isReady()
  return router
}

describe('page URL state integrations', () => {
  it('shares Content tabs and only opens an allowlisted operation-log detail', async () => {
    const router = await getPageRouter(
      '/page?contentTab=files&operationLog=unknown&keep=1',
      ContentAdminPage,
    )
    const ContentAdminWorkspaceStub = defineComponent({
      props: {
        activeTab: { type: String, default: '' },
        selectedOperationLogId: { type: String, default: '' },
      },
      emits: ['update:activeTab', 'update:selectedOperationLogId', 'operationLogOptionsReady'],
      template: `
        <div>
          <output data-testid="content-state">{{ activeTab }}|{{ selectedOperationLogId }}</output>
          <button data-testid="logs-tab" @click="$emit('update:activeTab', 'operation-logs')">Logs</button>
          <button data-testid="log-options" @click="$emit('operationLogOptionsReady', ['log-4'])">Options</button>
          <button data-testid="open-log" @click="$emit('update:selectedOperationLogId', 'log-4')">Open</button>
          <button data-testid="close-log" @click="$emit('update:selectedOperationLogId', undefined)">Close</button>
        </div>
      `,
    })
    const wrapper = shallowMount(ContentAdminPage, {
      global: { plugins: [router], stubs: { ContentAdminWorkspace: ContentAdminWorkspaceStub } },
    })

    expect(wrapper.get('[data-testid="content-state"]').text()).toBe('files|')
    await wrapper.get('[data-testid="log-options"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ contentTab: 'files', keep: '1' }),
    )
    await wrapper.get('[data-testid="logs-tab"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query.contentTab).toBe('operation-logs'),
    )
    await wrapper.get('[data-testid="open-log"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="content-state"]').text()).toBe('operation-logs|log-4')
      expect(router.currentRoute.value.query.operationLog).toBe('log-4')
    })
    await wrapper.get('[data-testid="close-log"]').trigger('click')
    await vi.waitFor(() => expect(router.currentRoute.value.query.operationLog).toBeUndefined())

    router.back()
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="content-state"]').text()).toBe('operation-logs|log-4'),
    )
  })

  it('syncs Monitoring and System Config tabs with distinct allowlisted keys', async () => {
    const MonitoringWorkspaceStub = defineComponent({
      props: { activeTab: { type: String, default: '' } },
      emits: ['update:activeTab'],
      template:
        '<button data-testid="monitoring-state" @click="$emit(\'update:activeTab\', \'jobs\')">{{ activeTab }}</button>',
    })
    const monitoringRouter = await getPageRouter('/page?monitoringTab=logs', MonitoringPage)
    const monitoringWrapper = shallowMount(MonitoringPage, {
      global: {
        plugins: [monitoringRouter],
        stubs: { MonitoringWorkspace: MonitoringWorkspaceStub },
      },
    })
    expect(monitoringWrapper.get('[data-testid="monitoring-state"]').text()).toBe('logs')
    await monitoringWrapper.get('[data-testid="monitoring-state"]').trigger('click')
    await vi.waitFor(() =>
      expect(monitoringRouter.currentRoute.value.query).toEqual({ monitoringTab: 'jobs' }),
    )

    const SystemConfigWorkspaceStub = defineComponent({
      props: { activeSection: { type: String, default: '' } },
      emits: ['update:activeSection'],
      template:
        '<button data-testid="config-state" @click="$emit(\'update:activeSection\', \'email\')">{{ activeSection }}</button>',
    })
    const systemConfigRouter = await getPageRouter(
      '/page?configSection=third-party',
      SystemConfigPage,
    )
    const configWrapper = shallowMount(SystemConfigPage, {
      global: {
        plugins: [systemConfigRouter],
        stubs: { SystemConfigWorkspace: SystemConfigWorkspaceStub },
      },
    })
    expect(configWrapper.get('[data-testid="config-state"]').text()).toBe('third-party')
    await configWrapper.get('[data-testid="config-state"]').trigger('click')
    await vi.waitFor(() =>
      expect(systemConfigRouter.currentRoute.value.query).toEqual({ configSection: 'email' }),
    )
  })

  it('delays Dictionary type restoration until server IDs are allowlisted', async () => {
    const router = await getPageRouter('/page?dictionaryType=account-status', DictionariesPage)
    const DictionaryWorkspaceStub = defineComponent({
      props: { selectedDictionaryTypeId: { type: String, default: '' } },
      emits: ['update:selectedDictionaryTypeId', 'dictionaryTypeOptionsReady'],
      template: `
        <div>
          <output data-testid="dictionary-state">{{ selectedDictionaryTypeId }}</output>
          <button data-testid="dictionary-options" @click="$emit('dictionaryTypeOptionsReady', ['account-status', 'announcement-priority']); $emit('update:selectedDictionaryTypeId', 'account-status')">Options</button>
          <button data-testid="dictionary-select" @click="$emit('update:selectedDictionaryTypeId', 'announcement-priority')">Select</button>
        </div>
      `,
    })
    const wrapper = shallowMount(DictionariesPage, {
      global: { plugins: [router], stubs: { DictionaryWorkspace: DictionaryWorkspaceStub } },
    })

    expect(wrapper.get('[data-testid="dictionary-state"]').text()).toBe('')
    await wrapper.get('[data-testid="dictionary-options"]').trigger('click')
    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="dictionary-state"]').text()).toBe('account-status')
      expect(router.currentRoute.value.query).toEqual({})
    })
    await wrapper.get('[data-testid="dictionary-select"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({ dictionaryType: 'announcement-priority' }),
    )

    router.back()
    await flushPromises()
    await vi.waitFor(() =>
      expect(wrapper.get('[data-testid="dictionary-state"]').text()).toBe('account-status'),
    )
  })

  it('keeps Table Gallery group and expanded tree state separate from server table query keys', async () => {
    const router = await getPageRouter(
      '/page?tableGroup=interaction&tableTree=program-identity&page=3&sortBy=owner',
      TableExamplesPage,
    )
    const TableExamplesModuleStub = defineComponent({
      props: {
        activeGroup: { type: String, default: '' },
        expandedTreeNodeIds: { type: Array<string>, default: () => [] },
      },
      emits: ['update:activeGroup', 'update:expandedTreeNodeIds'],
      template: `
        <div>
          <output data-testid="table-state">{{ activeGroup }}|{{ expandedTreeNodeIds.join(',') }}</output>
          <button data-testid="table-scale" @click="$emit('update:activeGroup', 'scale')">Scale</button>
          <button data-testid="table-collapse" @click="$emit('update:expandedTreeNodeIds', [])">Collapse</button>
        </div>
      `,
    })
    const wrapper = shallowMount(TableExamplesPage, {
      global: { plugins: [router], stubs: { TableExamplesModule: TableExamplesModuleStub } },
    })

    expect(wrapper.get('[data-testid="table-state"]').text()).toBe('interaction|program-identity')
    await wrapper.get('[data-testid="table-scale"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toMatchObject({
        tableGroup: 'scale',
        page: '3',
        sortBy: 'owner',
      }),
    )
    await wrapper.get('[data-testid="table-collapse"]').trigger('click')
    await vi.waitFor(() =>
      expect(router.currentRoute.value.query).toEqual({
        tableGroup: 'scale',
        tableTree: 'none',
        page: '3',
        sortBy: 'owner',
      }),
    )
  })
})
