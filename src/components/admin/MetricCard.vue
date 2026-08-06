<script setup lang="ts">
import type { Component } from 'vue'
import { ArrowDownRight, ArrowUpRight, Minus } from '@lucide/vue'
import { computed } from 'vue'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const props = withDefaults(
  defineProps<{
    title: string
    value: string | number
    description?: string
    change?: string
    trend?: 'positive' | 'negative' | 'neutral'
    icon?: Component
    iconClass?: string
  }>(),
  {
    trend: 'neutral',
  },
)

const changeClass = computed(() => ({
  'text-success': props.trend === 'positive',
  'text-destructive': props.trend === 'negative',
  'text-muted-foreground': props.trend === 'neutral',
}))
</script>

<template>
  <Card>
    <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle class="text-sm font-medium text-muted-foreground">
        {{ title }}
      </CardTitle>
      <div
        v-if="icon"
        class="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary"
        :class="iconClass"
      >
        <component :is="icon" class="size-5" aria-hidden="true" />
      </div>
    </CardHeader>
    <CardContent>
      <div class="text-2xl font-bold text-foreground">
        {{ value }}
      </div>
      <div v-if="change || description" class="mt-1 flex items-center gap-1 text-xs">
        <span v-if="change" class="flex items-center gap-0.5 font-medium" :class="changeClass">
          <ArrowUpRight v-if="trend === 'positive'" class="size-3" aria-hidden="true" />
          <ArrowDownRight v-else-if="trend === 'negative'" class="size-3" aria-hidden="true" />
          <Minus v-else class="size-3" aria-hidden="true" />
          {{ change }}
        </span>
        <span v-if="description" class="text-muted-foreground">{{ description }}</span>
      </div>
    </CardContent>
  </Card>
</template>
