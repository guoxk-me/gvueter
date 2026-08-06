import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vite-plus/test'
import { nextTick } from 'vue'
import ActivityTimeline from '@/components/admin/ActivityTimeline.vue'
import ConfirmAction from '@/components/admin/ConfirmAction.vue'
import MetricCard from '@/components/admin/MetricCard.vue'
import WorkflowStepper from '@/components/admin/WorkflowStepper.vue'
import { i18n } from '@/i18n'

enableAutoUnmount(afterEach)

describe('workflow and feedback components', () => {
  it('renders an empty activity boundary and ordered audit entries', async () => {
    const wrapper = mount(ActivityTimeline, {
      props: { entries: [], emptyLabel: 'No audit activity' },
      global: { plugins: [i18n] },
    })

    expect(wrapper.text()).toContain('No audit activity')
    await wrapper.setProps({
      entries: [
        {
          id: 'submitted',
          title: 'Request submitted',
          description: 'Alex submitted the access request.',
          occurredAt: '2026-07-16 09:30',
          tone: 'info' as const,
        },
        {
          id: 'approved',
          title: 'Request approved',
          occurredAt: '2026-07-16 09:45',
          tone: 'success' as const,
        },
      ],
    })

    expect(wrapper.findAll('ol > li')).toHaveLength(2)
    expect(wrapper.findAll('time').map((time) => time.text())).toEqual([
      '2026-07-16 09:30',
      '2026-07-16 09:45',
    ])
    expect(wrapper.text()).toContain('Alex submitted the access request.')
  })

  it('keeps a pending confirmation open and closes only when its owner allows it', async () => {
    const wrapper = mount(ConfirmAction, {
      attachTo: document.body,
      props: {
        open: true,
        title: 'Delete audit export?',
        triggerLabel: 'Delete export',
        confirmLabel: 'Delete',
        pendingLabel: 'Deleting…',
        cancelLabel: 'Cancel',
        closeOnConfirm: false,
        isPending: true,
      },
      global: { plugins: [i18n] },
    })
    await nextTick()

    const pendingButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.includes('Deleting…'),
    )
    expect(pendingButton?.disabled).toBe(true)

    await wrapper.setProps({ isPending: false })
    const confirmButton = [...document.body.querySelectorAll<HTMLButtonElement>('button')].find(
      (button) => button.textContent?.trim() === 'Delete',
    )
    expect(confirmButton).toBeDefined()
    confirmButton?.click()
    await nextTick()

    expect(wrapper.emitted('confirm')).toHaveLength(1)
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()

    await wrapper.setProps({ closeOnConfirm: true })
    confirmButton?.click()
    await flushPromises()
    expect(wrapper.emitted('confirm')).toHaveLength(2)
    expect(document.body.querySelector('[role="dialog"]')).toBeNull()
  })

  it('renders explicit KPI trend meaning for long operational values', () => {
    const wrapper = mount(MetricCard, {
      props: {
        title: 'Quarterly access reviews completed',
        value: '12,345 / 12,500',
        change: '+8.4%',
        description: 'compared with the previous quarter',
        trend: 'positive',
      },
    })

    expect(wrapper.text()).toContain('12,345 / 12,500')
    expect(wrapper.text()).toContain('+8.4%')
    expect(wrapper.get('.text-success').text()).toContain('+8.4%')
  })

  it('bounds the active workflow step and emits keyboard-clickable step changes', async () => {
    const wrapper = mount(WorkflowStepper, {
      props: {
        modelValue: 1,
        clickable: true,
        steps: [
          { id: 'details', title: 'Details' },
          { id: 'review', title: 'Review' },
          { id: 'submit', title: 'Submit' },
        ],
      },
    })

    const stepButtons = wrapper.findAll('button')
    expect(stepButtons[1]?.attributes('aria-current')).toBe('step')
    await stepButtons[2]?.trigger('click')
    expect(wrapper.emitted('update:modelValue')).toContainEqual([2])

    await wrapper.setProps({ modelValue: 99 })
    expect(wrapper.findAll('button')[2]?.attributes('aria-current')).toBe('step')
  })
})
