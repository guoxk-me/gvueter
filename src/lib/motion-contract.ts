import type { Transition } from 'motion-v'

// AI modified: one motion contract keeps Shell feedback consistent and inside the interaction budget.
export const ADMIN_MOTION_DURATION_MS = {
  fast: 120,
  standard: 180,
  emphasized: 240,
  overlay: 280,
} as const

const standardEase: [number, number, number, number] = [0.2, 0, 0, 1]
const exitEase: [number, number, number, number] = [0.4, 0, 1, 1]

export const ADMIN_MOTION_TRANSITIONS = {
  instant: {
    type: 'tween',
    duration: 0,
  },
  fast: {
    type: 'tween',
    duration: ADMIN_MOTION_DURATION_MS.fast / 1000,
    ease: standardEase,
  },
  standard: {
    type: 'tween',
    duration: ADMIN_MOTION_DURATION_MS.standard / 1000,
    ease: standardEase,
  },
  exit: {
    type: 'tween',
    duration: ADMIN_MOTION_DURATION_MS.fast / 1000,
    ease: exitEase,
  },
  layout: {
    type: 'tween',
    duration: ADMIN_MOTION_DURATION_MS.emphasized / 1000,
    ease: standardEase,
  },
} as const satisfies Record<'exit' | 'fast' | 'instant' | 'layout' | 'standard', Transition>

export const ADMIN_MOTION_VARIANTS = {
  label: {
    initial: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -4 },
  },
  sidebarTitle: {
    initial: { opacity: 0, y: -4 },
    visible: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -2 },
  },
} as const

export function loadAdminMotionFeatures() {
  return import('./motion-features').then(({ default: features }) => features)
}
