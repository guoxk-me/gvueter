<script setup lang="ts">
import type { AdminIconCategory, AdminIconOption } from '@/components/admin/icon-selector'
import { SearchX } from '@lucide/vue'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import CopyButton from '@/components/admin/CopyButton.vue'
import EmptyState from '@/components/admin/EmptyState.vue'
import { ADMIN_ICON_CATEGORIES, ADMIN_ICON_OPTIONS } from '@/components/admin/icon-selector'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

const { locale, t } = useI18n()
const searchQuery = shallowRef('')
const selectedCategory = shallowRef<AdminIconCategory | 'all'>('all')

const visibleIconOptions = computed(() => {
  const requestedText = searchQuery.value.trim().toLocaleLowerCase(locale.value)

  // AI modified: gallery filtering derives only from the audited registry and never touches package-wide dynamic exports.
  return ADMIN_ICON_OPTIONS.filter((option) => {
    if (selectedCategory.value !== 'all' && option.category !== selectedCategory.value)
      return false
    if (!requestedText)
      return true

    return [
      option.key,
      option.lucideName,
      getIconLabel(option),
      getCategoryLabel(option.category),
    ].some(searchableText =>
      searchableText.toLocaleLowerCase(locale.value).includes(requestedText),
    )
  })
})

function getIconLabel(option: AdminIconOption): string {
  return option.labelKey ? t(option.labelKey) : option.lucideName
}

function getCategoryLabel(category: AdminIconCategory): string {
  return t(`components.selectors.iconCategories.${category}`)
}

function clearFilters(): void {
  searchQuery.value = ''
  selectedCategory.value = 'all'
}
</script>

<template>
  <Card data-testid="icon-catalog-explorer">
    <CardHeader>
      <CardTitle>{{ t('components.iconGallery.explorerTitle') }}</CardTitle>
      <CardDescription>{{ t('components.iconGallery.explorerDescription') }}</CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
      <div class="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0 flex-1 lg:max-w-xl">
          <label for="icon-catalog-search" class="mb-1.5 block text-sm font-medium">
            {{ t('components.iconGallery.searchLabel') }}
          </label>
          <Input
            id="icon-catalog-search"
            v-model="searchQuery"
            type="search"
            :placeholder="t('components.iconGallery.searchPlaceholder')"
          />
        </div>
        <p class="shrink-0 text-sm text-muted-foreground" role="status" aria-live="polite">
          {{
            t('components.iconGallery.results', {
              visible: visibleIconOptions.length,
              total: ADMIN_ICON_OPTIONS.length,
            })
          }}
        </p>
      </div>

      <div
        class="flex min-w-0 flex-wrap gap-2"
        :aria-label="t('components.iconGallery.categoriesLabel')"
      >
        <Button
          type="button"
          size="sm"
          :variant="selectedCategory === 'all' ? 'default' : 'outline'"
          :aria-pressed="selectedCategory === 'all'"
          @click="selectedCategory = 'all'"
        >
          {{ t('components.iconGallery.allCategories') }}
        </Button>
        <Button
          v-for="category in ADMIN_ICON_CATEGORIES"
          :key="category"
          type="button"
          size="sm"
          :variant="selectedCategory === category ? 'default' : 'outline'"
          :aria-pressed="selectedCategory === category"
          @click="selectedCategory = category"
        >
          {{ getCategoryLabel(category) }}
        </Button>
      </div>

      <ul v-if="visibleIconOptions.length > 0" class="icon-catalog-grid" aria-live="polite">
        <li
          v-for="option in visibleIconOptions"
          :key="option.key"
          class="flex min-w-0 flex-col rounded-lg border bg-background p-3"
          :data-icon-key="option.key"
        >
          <div class="flex min-w-0 items-start justify-between gap-2">
            <div
              class="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground"
            >
              <!-- AI modified: dynamic rendering receives a local Component object, never the searched text or a backend string. -->
              <component :is="option.component" class="size-5" aria-hidden="true" />
            </div>
            <Badge v-if="option.isMenuSafe" variant="secondary" class="max-w-full text-[10px]">
              {{ t('components.iconGallery.menuSafe') }}
            </Badge>
          </div>
          <code
            class="mt-3 truncate text-sm font-semibold"
            translate="no"
            :title="option.lucideName"
          >
            {{ option.lucideName }}
          </code>
          <span class="mt-0.5 truncate text-xs text-muted-foreground" :title="option.key">
            {{ option.key }} · {{ getCategoryLabel(option.category) }}
          </span>
          <CopyButton
            class="mt-3 self-start"
            :value="option.lucideName"
            :label="t('components.iconGallery.copyName')"
            :copied-label="t('components.iconGallery.copiedName')"
            variant="ghost"
            size="sm"
          />
        </li>
      </ul>
      <EmptyState
        v-else
        :icon="SearchX"
        :title="t('components.iconGallery.emptySearchTitle')"
        :description="t('components.iconGallery.emptySearchDescription')"
      >
        <template #actions>
          <Button type="button" variant="outline" @click="clearFilters">
            {{ t('components.iconGallery.clearFilters') }}
          </Button>
        </template>
      </EmptyState>
    </CardContent>
  </Card>
</template>

<style scoped>
.icon-catalog-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 10rem), 1fr));
  gap: 0.75rem;
}
</style>
