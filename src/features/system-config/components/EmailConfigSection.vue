<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

defineProps<{
  isDisabled: boolean
  secretMask: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField v-slot="{ componentField }" name="email.host">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.host') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.port">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.port') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="number" min="1" max="65535" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.username">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.username') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" autocomplete="username" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.password">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.password') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="new-password"
            :placeholder="secretMask ?? t('systemConfig.shared.notConfigured')"
            :disabled="isDisabled"
          />
        </FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('systemConfig.shared.secretRetainHint') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.fromName">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.fromName') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.fromAddress">
      <FormItem>
        <FormLabel>{{ t('systemConfig.email.fromAddress') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="email" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="email.isSecure">
      <FormItem class="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2">
        <div class="space-y-1">
          <FormLabel>{{ t('systemConfig.email.secure') }}</FormLabel>
          <p class="text-sm text-muted-foreground">
            {{ t('systemConfig.email.secureHint') }}
          </p>
        </div>
        <FormControl><Switch v-bind="componentField" :disabled="isDisabled" /></FormControl>
      </FormItem>
    </FormField>
  </div>
</template>
