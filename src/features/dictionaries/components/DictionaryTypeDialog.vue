<script setup lang="ts">
import type { DictionaryType, DictionaryTypeInput } from '@/features/dictionaries/types'
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
import { DICTIONARY_STATUSES } from '@/features/dictionaries/types'

const props = defineProps<{
  dictionaryType?: DictionaryType
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [input: DictionaryTypeInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.dictionaryType))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      code: z
        .string()
        .trim()
        .regex(/^[a-z][a-z0-9_]*$/, t('dictionaries.typeCodeInvalid')),
      name: z.string().trim().min(1, t('dictionaries.typeNameRequired')),
      description: z.string().trim().max(240, t('dictionaries.descriptionTooLong')),
      status: z.enum(DICTIONARY_STATUSES),
    }),
  ),
)
const { handleSubmit, resetForm } = useForm<DictionaryTypeInput>({
  validationSchema: formSchema,
})

watch(
  [open, () => props.dictionaryType],
  ([isOpen]) => {
    if (!isOpen)
      return

    // AI modified: reset from the selected server record whenever this reusable dialog opens.
    resetForm({
      values: {
        code: props.dictionaryType?.code ?? '',
        name: props.dictionaryType?.name ?? '',
        description: props.dictionaryType?.description ?? '',
        status: props.dictionaryType?.status ?? 'active',
      },
    })
  },
  { immediate: true },
)

const submitDictionaryType = handleSubmit((values) => {
  emit('save', {
    code: values.code.trim().toLowerCase(),
    name: values.name.trim(),
    description: values.description.trim(),
    status: values.status,
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('dictionaries.editType') : t('dictionaries.createType')"
    :description="t('dictionaries.typeFormDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitDictionaryType"
  >
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="code">
        <FormItem>
          <FormLabel>{{ t('dictionaries.typeCode') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="name">
        <FormItem>
          <FormLabel>{{ t('dictionaries.typeName') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-slot="{ componentField }" name="description">
      <FormItem>
        <FormLabel>{{ t('dictionaries.descriptionField') }}</FormLabel>
        <FormControl><Textarea v-bind="componentField" :disabled="isSaving" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
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
