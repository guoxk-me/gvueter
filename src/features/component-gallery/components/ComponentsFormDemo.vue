<script setup lang="ts">
import type { AcceptableValue } from 'reka-ui'
import type { FileUploadEntry, FileUploadRejection, TagInputRejection } from '@/components/admin'
import type { SearchFormField, SearchFormValues } from '@/components/admin/search-form'
import { computed, reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { toast } from 'vue-sonner'
import {
  FileUpload,
  NumberField,
  PasswordField,
  RichTextEditor,
  SearchForm,
  TagInput,
} from '@/components/admin'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import ComponentDemoCard from './ComponentDemoCard.vue'

const { t } = useI18n()

const draftProfile = reactive({
  name: 'Alex Morgan',
  summary: 'Design system owner for the operations platform.',
  role: 'editor',
  receivesUpdates: true,
  isPublic: false,
})
const attachments = shallowRef<FileUploadEntry[]>([])
const articleContent = shallowRef(
  '<p>Use this editor for announcements, knowledge-base entries, and richer admin content.</p>',
)
const projectTags = shallowRef(['growth', 'priority'])
const seatCount = shallowRef<number | null>(12)
const passwordValue = shallowRef('change-me')
type UserSearchPreviewValues = SearchFormValues & { keyword: string; status: string }
const defaultUserSearch: UserSearchPreviewValues = { keyword: '', status: 'all' }
const userSearch = shallowRef<UserSearchPreviewValues>({ ...defaultUserSearch })
const appliedUserSearch = shallowRef<UserSearchPreviewValues>({ ...defaultUserSearch })
const userSearchFields = computed<readonly SearchFormField<UserSearchPreviewValues>[]>(() => [
  {
    name: 'keyword',
    label: t('components.form.searchKeyword'),
    type: 'search',
    placeholder: t('users.searchPlaceholder'),
  },
  {
    name: 'status',
    label: t('components.form.searchStatus'),
    type: 'select',
    options: [
      { label: t('users.statusAll'), value: 'all' },
      { label: t('users.active'), value: 'active' },
      { label: t('users.suspended'), value: 'suspended' },
    ],
  },
])

function updateRole(value: AcceptableValue): void {
  if (value === 'admin' || value === 'editor' || value === 'viewer') draftProfile.role = value
}

function updateUpdates(value: boolean | 'indeterminate'): void {
  draftProfile.receivesUpdates = value === true
}

function handleRejectedFiles(rejections: FileUploadRejection[]): void {
  const firstRejection = rejections[0]
  if (!firstRejection) return

  const messageKey = `components.upload.${firstRejection.reason}`
  toast.error(t(messageKey, { count: rejections.length }))
}

function saveDraft(): void {
  toast.success(t('components.form.saved'))
}

function handleRejectedTags(rejections: TagInputRejection[]): void {
  const firstRejection = rejections[0]
  if (!firstRejection) return

  if (firstRejection.reason === 'duplicate') {
    toast.error(t('components.form.tagDuplicate'))
    return
  }
  if (firstRejection.reason === 'max-tags') {
    toast.error(t('components.form.tagMaxTags'))
    return
  }
  toast.error(t('components.form.tagEmpty'))
}

function applyUserSearch(values: UserSearchPreviewValues): void {
  // AI modified: the Demo exposes the immutable query snapshot consumed by a real list request.
  appliedUserSearch.value = { ...values }
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <ComponentDemoCard
      :title="t('components.form.controlsTitle')"
      :description="t('components.form.controlsDescription')"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-2 sm:col-span-2">
          <Label for="component-demo-name">{{ t('components.form.name') }}</Label>
          <Input id="component-demo-name" v-model="draftProfile.name" autocomplete="name" />
        </div>
        <div class="space-y-2">
          <Label for="component-demo-role">{{ t('components.form.role') }}</Label>
          <Select :model-value="draftProfile.role" @update:model-value="updateRole">
            <SelectTrigger id="component-demo-role" class="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="admin">
                {{ t('roles.admin') }}
              </SelectItem>
              <SelectItem value="editor">
                {{ t('roles.editor') }}
              </SelectItem>
              <SelectItem value="viewer">
                {{ t('roles.viewer') }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div class="flex items-end gap-4 pb-1">
          <div class="flex items-center gap-2">
            <Checkbox
              id="component-demo-updates"
              :model-value="draftProfile.receivesUpdates"
              @update:model-value="updateUpdates"
            />
            <Label for="component-demo-updates">{{ t('components.form.updates') }}</Label>
          </div>
          <div class="flex items-center gap-2">
            <Switch
              id="component-demo-public"
              :model-value="draftProfile.isPublic"
              @update:model-value="draftProfile.isPublic = $event"
            />
            <Label for="component-demo-public">{{ t('components.form.public') }}</Label>
          </div>
        </div>
        <div class="space-y-2 sm:col-span-2">
          <Label for="component-demo-summary">{{ t('components.form.summary') }}</Label>
          <Textarea id="component-demo-summary" v-model="draftProfile.summary" />
        </div>
      </div>
      <template #usage> &lt;Input v-model="profile.name" /&gt; </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.form.uploadTitle')"
      :description="t('components.form.uploadDescription')"
    >
      <FileUpload
        v-model="attachments"
        accept="image/*,.pdf"
        :max-files="3"
        :max-size="5 * 1024 * 1024"
        :label="t('components.upload.label')"
        :description="t('components.upload.description')"
        :browse-label="t('components.upload.browse')"
        :remove-label="t('components.upload.remove')"
        @rejected="handleRejectedFiles"
      />
      <template #usage> &lt;FileUpload v-model="attachments" accept="image/*,.pdf" /&gt; </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.form.advancedTitle')"
      :description="t('components.form.advancedDescription')"
    >
      <form class="space-y-4" @submit.prevent>
        <div class="space-y-2">
          <Label for="component-demo-tags">{{ t('components.form.tags') }}</Label>
          <TagInput
            id="component-demo-tags"
            v-model="projectTags"
            :max-tags="5"
            :placeholder="t('components.form.tagPlaceholder')"
            :remove-label="t('components.form.removeTag')"
            @rejected="handleRejectedTags"
          />
        </div>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="component-demo-seat-count">{{ t('components.form.seatCount') }}</Label>
            <NumberField
              id="component-demo-seat-count"
              v-model="seatCount"
              :min="1"
              :max="100"
              :decrement-label="t('components.form.decrement')"
              :increment-label="t('components.form.increment')"
            />
          </div>
          <div class="space-y-2">
            <Label for="component-demo-password">{{ t('components.form.password') }}</Label>
            <PasswordField
              id="component-demo-password"
              v-model="passwordValue"
              autocomplete="new-password"
              :show-label="t('auth.showPassword')"
              :hide-label="t('auth.hidePassword')"
            />
          </div>
        </div>
      </form>
      <template #usage>
        &lt;TagInput v-model="tags" /&gt; · &lt;NumberField v-model="seats" :min="1" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      class="xl:col-span-2"
      :title="t('components.form.editorTitle')"
      :description="t('components.form.editorDescription')"
    >
      <RichTextEditor
        v-model="articleContent"
        :placeholder="t('components.form.editorPlaceholder')"
      />
      <div class="flex justify-end">
        <Button @click="saveDraft">
          {{ t('components.form.saveDraft') }}
        </Button>
      </div>
      <template #usage> &lt;RichTextEditor v-model="articleContent" /&gt; </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      class="xl:col-span-2"
      :title="t('components.form.searchTitle')"
      :description="t('components.form.searchDescription')"
    >
      <SearchForm
        v-model="userSearch"
        :fields="userSearchFields"
        :default-values="defaultUserSearch"
        :search-label="t('common.search')"
        :reset-label="t('common.reset')"
        @search="applyUserSearch"
        @reset="applyUserSearch"
      />
      <p class="text-sm text-muted-foreground" role="status" aria-live="polite">
        {{
          t('components.form.searchApplied', {
            keyword: appliedUserSearch.keyword || '—',
            status: appliedUserSearch.status,
          })
        }}
      </p>
      <template #usage>
        &lt;SearchForm v-model="filters" :fields="fields" @search="fetchUsers" /&gt;
      </template>
    </ComponentDemoCard>
  </div>
</template>
