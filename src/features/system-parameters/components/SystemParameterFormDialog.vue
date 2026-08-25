<script setup lang="ts">
import type { SystemParameterInput, SystemParameterRecord } from '../types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { FormDialog } from '@/components/admin'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { SYSTEM_PARAMETER_KEY_PATTERN, SYSTEM_PARAMETER_STATUSES } from '../types'

const props = defineProps<{
  parameter?: SystemParameterRecord
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [input: SystemParameterInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.parameter))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      key: z
        .string()
        .trim()
        .regex(SYSTEM_PARAMETER_KEY_PATTERN, t('systemParameters.validation.key'))
        .max(120),
      value: z.string().trim().min(1, t('systemParameters.validation.value')).max(2_000),
      description: z.string().trim().max(240, t('systemParameters.validation.description')),
      status: z.enum(SYSTEM_PARAMETER_STATUSES),
    }),
  ),
)
const { handleSubmit, resetForm } = useForm<SystemParameterInput>({
  validationSchema: formSchema,
})

watch(
  [open, () => props.parameter],
  ([isOpen]) => {
    if (!isOpen)
      return

    resetForm({
      values: {
        key: props.parameter?.key ?? '',
        value: props.parameter?.value ?? '',
        description: props.parameter?.description ?? '',
        status: props.parameter?.status ?? 'active',
      },
    })
  },
  { immediate: true },
)

const submitParameter = handleSubmit((input) => {
  // AI modified: trim the external contract at the form boundary so cache and API keys stay stable.
  emit('save', {
    key: input.key.trim().toLowerCase(),
    value: input.value.trim(),
    description: input.description.trim(),
    status: input.status,
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('systemParameters.edit') : t('systemParameters.create')"
    :description="t('systemParameters.formDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitParameter"
  >
    <FormField v-slot="{ componentField }" name="key">
      <FormItem>
        <FormLabel>{{ t('systemParameters.key') }}</FormLabel>
        <FormControl>
          <!-- AI modified: machine configuration identifiers and values remain byte-for-byte stable. -->
          <Input
            v-bind="componentField"
            autocomplete="off"
            :disabled="isSaving"
            placeholder="system.example_key"
            translate="no"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="value">
      <FormItem>
        <FormLabel>{{ t('systemParameters.value') }}</FormLabel>
        <FormControl>
          <Textarea
            v-bind="componentField"
            :disabled="isSaving"
            class="min-h-24 font-mono"
            translate="no"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>{{ t('systemParameters.descriptionField') }}</FormLabel>
        <FormControl>
          <Textarea v-bind="componentField" :disabled="isSaving" />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="status">
      <FormItem>
        <FormLabel>{{ t('systemParameters.status') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="parameterStatus in SYSTEM_PARAMETER_STATUSES"
              :key="parameterStatus"
              :value="parameterStatus"
            >
              {{ t(`systemParameters.${parameterStatus}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
  </FormDialog>
</template>
