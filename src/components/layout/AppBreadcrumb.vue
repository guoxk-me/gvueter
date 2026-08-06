<script setup lang="ts">
import type { BreadcrumbItem as BreadcrumbItemType } from '@/router/types'
import { House } from '@lucide/vue'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

withDefaults(
  defineProps<{
    hasIcon?: boolean
  }>(),
  {
    hasIcon: false,
  },
)
const route = useRoute()
const { t } = useI18n()

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

function getBreadcrumbLabel(crumb: BreadcrumbItemType): string {
  return crumb.labelKey ? t(crumb.labelKey) : (crumb.label ?? '')
}
</script>

<template>
  <Breadcrumb v-if="crumbs.length">
    <!-- AI modified: context-bar height stays stable while long paths remain horizontally reachable. -->
    <BreadcrumbList class="flex-nowrap whitespace-nowrap">
      <template v-for="(crumb, index) in crumbs" :key="index">
        <BreadcrumbItem class="shrink-0">
          <!-- Last crumb = current page, no link -->
          <BreadcrumbPage
            v-if="index === crumbs.length - 1"
            class="inline-block max-w-[min(18rem,60vw)] truncate align-bottom"
            :title="getBreadcrumbLabel(crumb)"
          >
            <House
              v-if="hasIcon && index === 0"
              class="mr-1 inline size-3.5"
              data-breadcrumb-home-icon
              aria-hidden="true"
            />
            {{ getBreadcrumbLabel(crumb) }}
          </BreadcrumbPage>
          <BreadcrumbLink v-else-if="crumb.to" as-child>
            <RouterLink :to="crumb.to" :title="getBreadcrumbLabel(crumb)">
              <House
                v-if="hasIcon && index === 0"
                class="mr-1 inline size-3.5"
                data-breadcrumb-home-icon
                aria-hidden="true"
              />
              {{ getBreadcrumbLabel(crumb) }}
            </RouterLink>
          </BreadcrumbLink>
          <span v-else class="text-muted-foreground">
            <House
              v-if="hasIcon && index === 0"
              class="mr-1 inline size-3.5"
              data-breadcrumb-home-icon
              aria-hidden="true"
            />
            {{ getBreadcrumbLabel(crumb) }}
          </span>
        </BreadcrumbItem>
        <BreadcrumbSeparator v-if="index < crumbs.length - 1" />
      </template>
    </BreadcrumbList>
  </Breadcrumb>
</template>
