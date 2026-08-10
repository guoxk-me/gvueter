<script setup lang="ts">
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

defineProps<{
  title: string
  description: string
}>()

defineSlots<{
  default?: () => unknown
  usage?: () => unknown
}>()
</script>

<template>
  <!-- AI modified: demo cards may shrink as grid items so wide examples stay locally contained. -->
  <Card class="min-w-0">
    <CardHeader>
      <CardTitle class="text-base">
        {{ title }}
      </CardTitle>
      <CardDescription>{{ description }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <slot />
      <div
        v-if="$slots.usage"
        class="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs text-muted-foreground"
      >
        <slot name="usage" />
      </div>
    </CardContent>
  </Card>
</template>
