<script setup lang="ts">
import type { DictionaryEntry, DictionaryEntryInput } from '@/features/dictionaries/types'
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
import { DICTIONARY_COLORS, DICTIONARY_STATUSES } from '@/features/dictionaries/types'

const props = defineProps<{
  dictionaryEntry?: DictionaryEntry
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [input: DictionaryEntryInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.dictionaryEntry))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      label: z.string().trim().min(1, t('dictionaries.entryLabelRequired')),
      value: z.string().trim().min(1, t('dictionaries.entryValueRequired')),
      color: z.enum(DICTIONARY_COLORS),
      order: z.coerce.number().int().min(0, t('dictionaries.orderInvalid')),
      status: z.enum(DICTIONARY_STATUSES),
    }),
  ),
)
const { handleSubmit, resetForm } = useForm<DictionaryEntryInput>({
  validationSchema: formSchema,
})

watch(
  [open, () => props.dictionaryEntry],
  ([isOpen]) => {
    if (!isOpen) return

    // AI modified: each open starts from the selected entry or a deterministic semantic-token default.
    resetForm({
      values: {
        label: props.dictionaryEntry?.label ?? '',
        value: props.dictionaryEntry?.value ?? '',
        color: props.dictionaryEntry?.color ?? 'primary',
        order: props.dictionaryEntry?.order ?? 10,
        status: props.dictionaryEntry?.status ?? 'active',
      },
    })
  },
  { immediate: true },
)

const submitDictionaryEntry = handleSubmit((values) => {
  emit('save', {
    label: values.label.trim(),
    value: values.value.trim(),
    color: values.color,
    order: values.order,
    status: values.status,
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('dictionaries.editEntry') : t('dictionaries.createEntry')"
    :description="t('dictionaries.entryFormDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitDictionaryEntry"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="label">
        <FormItem>
          <FormLabel>{{ t('dictionaries.entryLabel') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="value">
        <FormItem>
          <FormLabel>{{ t('dictionaries.entryValue') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="color">
        <FormItem>
          <FormLabel>{{ t('dictionaries.color') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem v-for="color in DICTIONARY_COLORS" :key="color" :value="color">
                {{ t(`dictionaries.colors.${color}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="order">
        <FormItem>
          <FormLabel>{{ t('dictionaries.order') }}</FormLabel>
          <FormControl>
            <Input v-bind="componentField" type="number" min="0" :disabled="isSaving" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-slot="{ componentField }" name="status">
      <FormItem>
        <FormLabel>{{ t('dictionaries.status') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem v-for="status in DICTIONARY_STATUSES" :key="status" :value="status">
              {{ t(`dictionaries.${status}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
  </FormDialog>
</template>
