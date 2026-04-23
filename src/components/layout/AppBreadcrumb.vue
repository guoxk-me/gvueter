<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import type { BreadcrumbItem as BreadcrumbItemType } from '@/router/types'

const route = useRoute()

/**
 * Build crumbs from route.meta.breadcrumb, falling back to route.meta.title.
 * The last item is always treated as the current page (no link).
 */
const crumbs = computed<BreadcrumbItemType[]>(() => {
  if (route.meta.breadcrumb?.length) {
    return route.meta.breadcrumb
  }
  if (route.meta.title) {
    return [{ label: route.meta.title }]
  }
  return []
})
</script>

<template>
  <Breadcrumb v-if="crumbs.length">
    <BreadcrumbList>
      <template v-for="(crumb, index) in crumbs" :key="index">
        <BreadcrumbItem>
          <!-- Last crumb = current page, no link -->
          <BreadcrumbPage v-if="index === crumbs.length - 1">
            {{ crumb.label }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else-if="crumb.to" as-child>
            <RouterLink :to="crumb.to">{{ crumb.label }}</RouterLink>
          </BreadcrumbLink>
          <span v-else class="text-muted-foreground">{{ crumb.label }}</span>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < crumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
