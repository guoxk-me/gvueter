import type { Transition } from 'motion-v'
import { useMotionConfig } from 'motion-v'
import { computed } from 'vue'
import { ADMIN_MOTION_TRANSITIONS } from '@/lib/motion-contract'

export function useAdminMotionTransition(transition: Transition) {
  const motionConfig = useMotionConfig()

  // AI modified: Motion-V snapshots declarative reduced-motion state, so each transition resolves it reactively.
  return computed(() =>
    motionConfig.value.skipAnimations ? ADMIN_MOTION_TRANSITIONS.instant : transition,
  )
}
