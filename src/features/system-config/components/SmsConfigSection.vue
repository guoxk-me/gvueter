<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SMS_PROVIDERS } from '@/features/system-config/types'

defineProps<{
  isDisabled: boolean
  secretMask: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField v-slot="{ componentField }" name="sms.provider">
      <FormItem>
        <FormLabel>{{ t('systemConfig.sms.provider') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isDisabled">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem v-for="provider in SMS_PROVIDERS" :key="provider" :value="provider">
              {{ t(`systemConfig.sms.providers.${provider}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="sms.senderName">
      <FormItem>
        <FormLabel>{{ t('systemConfig.sms.senderName') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="sms.accessKeyId">
      <FormItem>
        <FormLabel>{{ t('systemConfig.shared.accessKeyId') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" autocomplete="off" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="sms.accessKeySecret">
      <FormItem>
        <FormLabel>{{ t('systemConfig.shared.accessKeySecret') }}</FormLabel>
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
  </div>
</template>
