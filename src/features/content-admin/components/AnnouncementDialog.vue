<script setup lang="ts">
import type {
  AnnouncementInput,
  AnnouncementRecord,
} from '@/features/content-admin/types/announcements'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { FormDialog, RichTextEditor } from '@/components/admin'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAnnouncementTextPreview } from '@/features/content-admin/content-admin-rules'
import { ANNOUNCEMENT_PRIORITIES } from '@/features/content-admin/types/announcements'

const props = defineProps<{
  announcement?: AnnouncementRecord
  isSaving: boolean
}>()
const emit = defineEmits<{
  save: [input: AnnouncementInput]
}>()
const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.announcement))
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      title: z.string().trim().min(2, t('contentAdmin.announcements.validation.title')),
      content: z
        .string()
        .refine(
          content => Boolean(getAnnouncementTextPreview(content)),
          t('contentAdmin.announcements.validation.content'),
        ),
      priority: z.enum(ANNOUNCEMENT_PRIORITIES),
    }),
  ),
)
const { handleSubmit, resetForm, setFieldValue, values } = useForm<AnnouncementInput>({
  validationSchema: formSchema,
})
const contentModel = computed({
  get: () => values.content,
  set: content => setFieldValue('content', content),
})

watch(
  [open, () => props.announcement],
  ([isOpen]) => {
    if (!isOpen)
      return
    // AI modified: the dialog edits a fresh copy so cancellation never mutates a cached record.
    resetForm({
      values: {
        title: props.announcement?.title ?? '',
        content: props.announcement?.content ?? '',
        priority: props.announcement?.priority ?? 'normal',
      },
    })
  },
  { immediate: true },
)

const submitAnnouncement = handleSubmit(input =>
  emit('save', {
    title: input.title.trim(),
    content: input.content,
    priority: input.priority,
  }),
)
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="
      isEditing ? t('contentAdmin.announcements.edit') : t('contentAdmin.announcements.create')
    "
    :description="t('contentAdmin.announcements.formDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitAnnouncement"
  >
    <FormField v-slot="{ componentField }" name="title">
      <FormItem>
        <FormLabel>{{ t('contentAdmin.announcements.fields.title') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="priority">
      <FormItem>
        <FormLabel>{{ t('contentAdmin.announcements.fields.priority') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem
              v-for="priority in ANNOUNCEMENT_PRIORITIES"
              :key="priority"
              :value="priority"
            >
              {{ t(`contentAdmin.announcements.priorities.${priority}`) }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField name="content">
      <FormItem>
        <FormLabel>{{ t('contentAdmin.announcements.fields.content') }}</FormLabel>
        <FormControl>
          <RichTextEditor
            v-model="contentModel"
            :read-only="isSaving"
            :placeholder="t('contentAdmin.announcements.contentPlaceholder')"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
  </FormDialog>
</template>
