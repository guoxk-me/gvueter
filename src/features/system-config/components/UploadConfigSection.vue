<script setup lang="ts">
import type { UploadProvider } from '@/features/system-config/types'
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
import { Switch } from '@/components/ui/switch'
import { UPLOAD_PROVIDERS } from '@/features/system-config/types'

defineProps<{
  isDisabled: boolean
  provider: UploadProvider
  secretMask: string | null
}>()

const { t } = useI18n()
</script>

<template>
  <div class="grid gap-5 sm:grid-cols-2">
    <FormField v-slot="{ componentField }" name="upload.provider">
      <FormItem>
        <FormLabel>{{ t('systemConfig.upload.provider') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isDisabled">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="providerOption in UPLOAD_PROVIDERS"
              :key="providerOption"
              :value="providerOption"
            >
              {{ t(`systemConfig.upload.providers.${providerOption}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="upload.maxFileSizeMb">
      <FormItem>
        <FormLabel>{{ t('systemConfig.upload.maxFileSize') }}</FormLabel>
        <FormControl>
          <Input v-bind="componentField" type="number" min="1" max="200" :disabled="isDisabled" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="upload.allowedExtensions">
      <FormItem class="sm:col-span-2">
        <FormLabel>{{ t('systemConfig.upload.allowedExtensions') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('systemConfig.upload.allowedExtensionsHint') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
    <!-- AI modified: local storage never asks administrators for browser-visible object-store credentials. -->
    <template v-if="provider === 's3'">
      <FormField v-slot="{ componentField }" name="upload.endpointUrl">
        <FormItem class="sm:col-span-2">
          <FormLabel>{{ t('systemConfig.upload.endpointUrl') }}</FormLabel>
          <FormControl>
            <Input
              v-bind="componentField"
              type="url"
              inputmode="url"
              autocomplete="off"
              :disabled="isDisabled"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.region">
        <FormItem>
          <FormLabel>{{ t('systemConfig.upload.region') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.bucketName">
        <FormItem>
          <FormLabel>{{ t('systemConfig.upload.bucketName') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.pathPrefix">
        <FormItem>
          <FormLabel>{{ t('systemConfig.upload.pathPrefix') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isDisabled" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.publicBaseUrl">
        <FormItem>
          <FormLabel>{{ t('systemConfig.upload.publicBaseUrl') }}</FormLabel>
          <FormControl>
            <Input
              v-bind="componentField"
              type="url"
              inputmode="url"
              autocomplete="off"
              :disabled="isDisabled"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.accessKeyId">
        <FormItem>
          <FormLabel>{{ t('systemConfig.shared.accessKeyId') }}</FormLabel>
          <FormControl>
            <Input v-bind="componentField" autocomplete="off" :disabled="isDisabled" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="upload.accessKeySecret">
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
      <FormField v-slot="{ componentField }" name="upload.isPathStyle">
        <FormItem
          class="flex items-center justify-between gap-4 rounded-lg border p-4 sm:col-span-2"
        >
          <div class="space-y-1">
            <FormLabel>{{ t('systemConfig.upload.pathStyle') }}</FormLabel>
            <p class="text-sm text-muted-foreground">
              {{ t('systemConfig.upload.pathStyleHint') }}
            </p>
          </div>
          <FormControl><Switch v-bind="componentField" :disabled="isDisabled" /></FormControl>
        </FormItem>
      </FormField>
    </template>
  </div>
</template>
