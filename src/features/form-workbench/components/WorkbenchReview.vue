<script setup lang="ts">
import type { FormWorkbenchSubmitInput } from '@/features/form-workbench/types'
import { useI18n } from 'vue-i18n'

defineProps<{
  submission: FormWorkbenchSubmitInput
}>()

const { t } = useI18n()
</script>

<template>
  <dl class="grid gap-4 sm:grid-cols-2">
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.title') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{ submission.title }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.category') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{ t(`formWorkbench.categories.${submission.category}`) }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.reviewers') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{
          submission.reviewers.length
            ? submission.reviewers
                .map((reviewer) => t(`formWorkbench.reviewers.${reviewer}`))
                .join(', ')
            : t('common.noData')
        }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.region') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{
          submission.province
            ? `${t(`formWorkbench.provinces.${submission.province}`)} / ${t(`formWorkbench.cities.${submission.city}`)}`
            : t('common.noData')
        }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4 sm:col-span-2">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.address') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{ submission.address }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.attachments') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{ submission.attachmentNames.join(', ') || t('common.noData') }}
      </dd>
    </div>
    <div class="rounded-lg border border-border p-4">
      <dt class="text-xs text-muted-foreground">
        {{ t('formWorkbench.fields.images') }}
      </dt>
      <dd class="mt-1 text-sm font-medium">
        {{ submission.imageNames.join(', ') || t('common.noData') }}
      </dd>
    </div>
  </dl>
</template>
