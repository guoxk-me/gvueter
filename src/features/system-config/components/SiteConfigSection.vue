<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

defineProps<{ isDisabled: boolean }>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField v-slot="{ componentField }" name="site.siteName">
      <FormItem>
        <FormLabel>{{ t('systemConfig.site.siteName') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="site.supportEmail">
      <FormItem>
        <FormLabel>{{ t('systemConfig.site.supportEmail') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="email" autocomplete="email" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="site.publicUrl">
      <FormItem class="sm:col-span-2">
        <FormLabel>{{ t('systemConfig.site.publicUrl') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="url" inputmode="url" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="site.isMaintenanceMode">
      <FormItem class="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2">
        <div class="space-y-1">
          <FormLabel>{{ t('systemConfig.site.maintenanceMode') }}</FormLabel>
          <p class="text-sm text-muted-foreground">
            {{ t('systemConfig.site.maintenanceModeHint') }}
          </p>
        </div>
        <FormControl><Switch v-bind="componentField" :disabled="isDisabled" /></FormControl>
      </FormItem>
    </FormField>
  </div>
</template>
