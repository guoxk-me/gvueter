import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'
import { defineComponent, h, nextTick } from 'vue'
import ChartContainer from '@/components/ui/chart/ChartContainer.vue'
import { componentToString } from '@/components/ui/chart/utils'

class ChartResizeObserver implements ResizeObserver {
  static latest: ChartResizeObserver | undefined

  constructor(private readonly callback: ResizeObserverCallback) {
    ChartResizeObserver.latest = this
  }

  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}

  notify(width: number, height: number): void {
    this.callback(
      [
        {
          contentRect: { width, height } as DOMRectReadOnly,
        } as ResizeObserverEntry,
      ],
      this,
    )
  }
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ChartResizeObserver)
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    window.setTimeout(callback, 0, 0),
  )
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => window.clearTimeout(frame))
})

afterEach(() => {
  ChartResizeObserver.latest = undefined
  vi.unstubAllGlobals()
})

describe('ChartContainer lifecycle', () => {
  it('bounds cached tooltip markup across many unique payloads', () => {
    const tooltipCallbacks: NonNullable<ReturnType<typeof componentToString>>[] = []
    let renderCount = 0
    const TooltipContent = defineComponent({
      props: { payload: { type: Number, required: true } },
      setup(props) {
        return () => {
          renderCount += 1
          return h('span', String(props.payload))
        }
      },
    })
    const TooltipHarness = defineComponent({
      setup() {
        const tooltipMarkup = componentToString(
          { users: { label: 'Users', color: '#000' } },
          TooltipContent,
        )
        if (tooltipMarkup) tooltipCallbacks.push(tooltipMarkup)
        return () => h('div')
      },
    })
    const wrapper = mount(TooltipHarness)
    const tooltipMarkup = tooltipCallbacks[0]
    if (!tooltipMarkup) throw new Error('Expected the tooltip renderer to initialize')

    for (let payload = 0; payload <= 200; payload += 1) tooltipMarkup(payload, payload)
    tooltipMarkup(0, 0)

    const circularPayload: { self?: unknown } = {}
    circularPayload.self = circularPayload
    expect(() => tooltipMarkup(circularPayload, 0)).not.toThrow()

    // AI modified: the oldest payload is rendered again after the 200-entry cache bound evicts it.
    expect(renderCount).toBe(203)
    wrapper.unmount()
  })

  it('keeps caller-provided ids safe for the generated CSS selector', () => {
    const wrapper = mount(ChartContainer, {
      props: {
        id: 'operations/chart "east"',
        config: { users: { label: 'Users', color: '#000' } },
      },
    })
    const chartId = wrapper.get('[data-slot="chart"]').attributes('data-chart')

    expect(chartId).toMatch(/^chart-[\w-]+$/)
    expect(wrapper.get('style').text()).toContain(`[data-chart="${chartId}"]`)
  })

  it('changes the slot revision after a visible size change and ignores duplicate bounds', async () => {
    const ChartConsumer = defineComponent({
      setup() {
        return () =>
          h(
            ChartContainer,
            {
              config: { users: { label: 'Users', color: '#000' } },
            },
            {
              default: ({ revision }: { revision: number }) =>
                h(
                  'span',
                  {
                    'data-testid': 'revision',
                  },
                  String(revision),
                ),
            },
          )
      },
    })
    const wrapper = mount(ChartConsumer)

    expect(wrapper.get('[data-testid="revision"]').text()).toBe('0')
    ChartResizeObserver.latest?.notify(640, 256)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await nextTick()
    expect(wrapper.get('[data-testid="revision"]').text()).toBe('1')

    ChartResizeObserver.latest?.notify(640, 256)
    await new Promise((resolve) => window.setTimeout(resolve, 0))
    await nextTick()
    expect(wrapper.get('[data-testid="revision"]').text()).toBe('1')
  })

  it('disconnects resize observation when the chart unmounts', () => {
    const disconnect = vi.spyOn(ChartResizeObserver.prototype, 'disconnect')
    const wrapper = mount(ChartContainer, {
      props: { config: { users: { label: 'Users', color: '#000' } } },
    })

    wrapper.unmount()
    expect(disconnect).toHaveBeenCalledOnce()
  })
})
