<script setup lang="ts">
import { LazyMotion, MotionConfig, useReducedMotion } from 'motion-v'
import ConfigurableAdminLayout from '@/components/layout/ConfigurableAdminLayout.vue'
import { useThemeColor } from '@/composables/useThemeColor'
import { loadAdminMotionFeatures } from '@/lib/motion-contract'

// AI modified: activate document tokens before the configurable shell renders its regions.
useThemeColor()
const shouldReduceMotion = useReducedMotion()
</script>

<template>
  <!-- AI modified: authenticated motion features load lazily and reduced-motion users receive final states. -->
  <LazyMotion :features="loadAdminMotionFeatures" strict>
    <MotionConfig reduced-motion="user" :skip-animations="shouldReduceMotion">
      <ConfigurableAdminLayout />
    </MotionConfig>
  </LazyMotion>
</template>
