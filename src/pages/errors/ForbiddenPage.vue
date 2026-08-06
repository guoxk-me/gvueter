<script setup lang="ts">
import { ShieldX } from '@lucide/vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { Button } from '@/components/ui/button'

const router = useRouter()
const { t } = useI18n()

function returnToDashboard() {
  router.push({ name: 'dashboard' })
}
</script>

<template>
  <section class="mx-auto flex max-w-lg flex-col items-center gap-5 py-24 text-center">
    <div
      class="flex size-14 items-center justify-center rounded-full bg-destructive/10 text-destructive"
    >
      <ShieldX class="size-7" aria-hidden="true" />
    </div>
    <div class="space-y-2">
      <h1 class="text-2xl font-semibold">
        {{ t('errors.forbiddenTitle') }}
      </h1>
      <p class="text-sm text-muted-foreground">
        {{ t('errors.forbiddenDescription') }}
      </p>
    </div>
    <Button @click="returnToDashboard">
      {{ t('common.backToDashboard') }}
    </Button>
  </section>
</template>
