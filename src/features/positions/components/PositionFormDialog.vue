<script setup lang="ts">
import type { PositionInput, PositionRecord } from '@/features/positions/types'
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
import { POSITION_STATUSES } from '@/features/positions/types'

const props = defineProps<{
  position?: PositionRecord
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [input: PositionInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.position))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      code: z
        .string()
        .trim()
        .regex(/^[a-z][a-z0-9-]*$/, t('positions.codeInvalid')),
      name: z.string().trim().min(1, t('positions.nameRequired')),
      description: z.string().trim().max(240),
      order: z.coerce.number().int().min(0),
      status: z.enum(POSITION_STATUSES),
    }),
  ),
)
const { handleSubmit, resetForm } = useForm<PositionInput>({ validationSchema: formSchema })

watch(
  [open, () => props.position],
  ([isOpen]) => {
    if (!isOpen)
      return

    resetForm({
      values: {
        code: props.position?.code ?? '',
        name: props.position?.name ?? '',
        description: props.position?.description ?? '',
        order: props.position?.order ?? 10,
        status: props.position?.status ?? 'active',
      },
    })
  },
  { immediate: true },
)

const submitPosition = handleSubmit((values) => {
  emit('save', {
    ...values,
    code: values.code.trim().toLowerCase(),
    name: values.name.trim(),
    description: values.description.trim(),
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('positions.edit') : t('positions.create')"
    :description="t('positions.formDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitPosition"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="code">
        <FormItem>
          <FormLabel>{{ t('positions.code') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>{{ t('positions.name') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>{{ t('positions.descriptionField') }}</FormLabel>
        <FormControl><Textarea v-bind="componentField" :disabled="isSaving" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="order">
        <FormItem>
          <FormLabel>{{ t('positions.order') }}</FormLabel>
          <FormControl>
            <Input v-bind="componentField" type="number" min="0" :disabled="isSaving" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="status">
        <FormItem>
          <FormLabel>{{ t('positions.status') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem v-for="status in POSITION_STATUSES" :key="status" :value="status">
                {{ t(`positions.${status}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  </FormDialog>
</template>
