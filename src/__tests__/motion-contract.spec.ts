import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { mount } from '@vue/test-utils'
import { MotionConfig } from 'motion-v'
import { describe, expect, it } from 'vite-plus/test'
import { defineComponent, h, nextTick, shallowRef } from 'vue'
import { useAdminMotionTransition } from '@/composables/use-admin-motion-transition'
import {
  ADMIN_MOTION_DURATION_MS,
  ADMIN_MOTION_TRANSITIONS,
  loadAdminMotionFeatures,
} from '@/lib/motion-contract'
import { PERFORMANCE_BUDGET } from '@/lib/performance-contract'

describe('admin motion contract', () => {
  it('keeps shared timings responsive and inside the layout budget', () => {
    expect(ADMIN_MOTION_DURATION_MS).toEqual({
      fast: 120,
      standard: 180,
      emphasized: 240,
      overlay: 280,
    })
    expect(ADMIN_MOTION_DURATION_MS.emphasized).toBeLessThanOrEqual(
      PERFORMANCE_BUDGET.layoutTransitionMilliseconds,
    )
    expect(ADMIN_MOTION_TRANSITIONS.layout.duration).toBe(
      ADMIN_MOTION_DURATION_MS.emphasized / 1000,
    )
  })

  it('keeps CSS consumers aligned with the Motion timing contract', async () => {
    const mainCss = await readFile(resolve(process.cwd(), 'src/assets/css/main.css'), 'utf8')

    // AI modified: source-level tokens prevent overlays and route effects from drifting from Motion.
    expect(mainCss).toContain('--motion-duration-fast: 120ms')
    expect(mainCss).toContain('--motion-duration-standard: 180ms')
    expect(mainCss).toContain('--motion-duration-emphasized: 240ms')
    expect(mainCss).toContain('--motion-duration-overlay: 280ms')
  })

  it('loads the motion feature bundle through the async admin boundary', async () => {
    const features = await loadAdminMotionFeatures()

    expect(features.renderer).toBeTypeOf('function')
    expect(features.features.length).toBeGreaterThan(0)
  })

  it('reacts to reduced-motion changes without remounting the consuming component', async () => {
    const shouldReduceMotion = shallowRef(false)
    const MotionTransitionProbe = defineComponent({
      setup() {
        const transition = useAdminMotionTransition(ADMIN_MOTION_TRANSITIONS.layout)
        return () => h('output', { 'data-duration': transition.value.duration })
      },
    })
    const MotionTransitionHost = defineComponent({
      setup() {
        return () =>
          h(MotionConfig, { skipAnimations: shouldReduceMotion.value }, () =>
            h(MotionTransitionProbe),
          )
      },
    })
    const wrapper = mount(MotionTransitionHost)

    expect(wrapper.get('output').attributes('data-duration')).toBe('0.24')

    shouldReduceMotion.value = true
    await nextTick()

    expect(wrapper.get('output').attributes('data-duration')).toBe('0')
  })
})
