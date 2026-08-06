<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

defineProps<{
  isDisabled: boolean
  oauthSecretMask: string | null
  webhookSecretMask: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField v-slot="{ componentField }" name="thirdParty.isSsoEnabled">
      <FormItem class="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2">
        <div class="space-y-1">
          <FormLabel>{{ t('systemConfig.thirdParty.ssoEnabled') }}</FormLabel>
          <p class="text-sm text-muted-foreground">
            {{ t('systemConfig.thirdParty.ssoEnabledHint') }}
          </p>
        </div>
        <FormControl><Switch v-bind="componentField" :disabled="isDisabled" /></FormControl>
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="thirdParty.oauthClientId">
      <FormItem>
        <FormLabel>{{ t('systemConfig.thirdParty.oauthClientId') }}</FormLabel>
        <FormControl
          ><Input v-bind="componentField" autocomplete="off" :disabled="isDisabled"
        /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="thirdParty.oauthClientSecret">
      <FormItem>
        <FormLabel>{{ t('systemConfig.thirdParty.oauthClientSecret') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="new-password"
            :placeholder="oauthSecretMask ?? t('systemConfig.shared.notConfigured')"
            :disabled="isDisabled"
          />
        </FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('systemConfig.shared.secretRetainHint') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="thirdParty.webhookUrl">
      <FormItem class="sm:col-span-2">
        <FormLabel>{{ t('systemConfig.thirdParty.webhookUrl') }}</FormLabel>
        <FormControl
          ><Input v-bind="componentField" type="url" :disabled="isDisabled"
        /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="thirdParty.webhookSigningSecret">
      <FormItem class="sm:col-span-2">
        <FormLabel>{{ t('systemConfig.thirdParty.webhookSigningSecret') }}</FormLabel>
        <FormControl>
          <Input
            v-bind="componentField"
            type="password"
            autocomplete="new-password"
            :placeholder="webhookSecretMask ?? t('systemConfig.shared.notConfigured')"
            :disabled="isDisabled"
          />
        </FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('systemConfig.shared.secretRetainHint') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
  </div>
</template>
