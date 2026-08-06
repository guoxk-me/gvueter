<script setup lang="ts">
import { House } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'
import { Button } from '@/components/ui/button'

withDefaults(defineProps<{ isNested?: boolean }>(), { isNested: false })

const { t } = useI18n()
</script>

<template>
  <!-- AI modified: authenticated catch-all routes reuse the Shell main landmark without nesting another. -->
  <component
    :is="isNested ? 'section' : 'main'"
    class="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center gap-5 px-6 text-center"
  >
    <p class="text-sm font-medium text-primary">404</p>
    <div class="space-y-2">
      <h1 class="text-3xl font-semibold">
        {{ t('errors.notFoundTitle') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('errors.notFoundDescription') }}
      </p>
    </div>
    <Button as-child>
      <RouterLink to="/">
        <House class="mr-2 size-4" aria-hidden="true" />
        {{ t('common.backToHome') }}
      </RouterLink>
    </Button>
  </component>
</template>
