<script setup lang="ts">
import { Plus, Trash2 } from '@lucide/vue'
import { computed, reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import FormExampleFrame from './FormExampleFrame.vue'

interface DynamicContact {
  id: string
  email: string
  responsibility: 'approver' | 'observer' | 'owner'
}

const maximumContacts = 4
let contactSequence = 1

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: '动态 Form：通知联系人',
        description: '通过稳定 ID 增删重复字段组，并在提交时检查必填、格式和重复邮箱。',
        states: ['单行', '新增行', '重复值', '达到上限'],
        statesLabel: '动态表单支持的状态',
        contact: (index: number) => `联系人 ${index + 1}`,
        email: '工作邮箱',
        responsibility: '通知职责',
        responsibilities: { approver: '审批人', observer: '抄送观察人', owner: '处置负责人' },
        remove: (index: number) => `移除联系人 ${index + 1}`,
        add: '添加联系人',
        save: '保存通知方案',
        required: '请输入有效的工作邮箱。',
        duplicate: '每位联系人必须使用不同的邮箱。',
        invalidSummary: '请修正标记的联系人后再次保存。',
        minimum: '通知方案至少保留一位联系人。',
        limit: `最多可以添加 ${maximumContacts} 位联系人。`,
        saved: (count: number) => `已保存包含 ${count} 位联系人的通知方案。`,
        notes:
          '字段组使用稳定业务 ID，而不是数组下标作为渲染 key；移除按钮包含联系人序号，屏幕阅读器可区分每个操作。',
      }
    : {
        title: 'Dynamic form: notification contacts',
        description:
          'Stable IDs support repeatable field groups, with required, format, and duplicate-email checks on save.',
        states: ['Single row', 'Added row', 'Duplicate value', 'Limit reached'],
        statesLabel: 'Supported dynamic form states',
        contact: (index: number) => `Contact ${index + 1}`,
        email: 'Work email',
        responsibility: 'Notification responsibility',
        responsibilities: { approver: 'Approver', observer: 'Observer', owner: 'Resolution owner' },
        remove: (index: number) => `Remove contact ${index + 1}`,
        add: 'Add contact',
        save: 'Save notification plan',
        required: 'Enter a valid work email.',
        duplicate: 'Each contact must use a different email.',
        invalidSummary: 'Correct the marked contacts and save again.',
        minimum: 'Keep at least one contact in the notification plan.',
        limit: `You can add up to ${maximumContacts} contacts.`,
        saved: (count: number) => `Saved a notification plan with ${count} contacts.`,
        notes:
          'Each group uses a stable business ID rather than its array position as the render key. Remove buttons include the contact number so assistive technology can distinguish each action.',
      },
)

const contacts = reactive<DynamicContact[]>([
  { id: 'notification-contact-1', email: 'incident-owner@example.com', responsibility: 'owner' },
])
const contactErrors = reactive<Record<string, string>>({})
const statusMessage = shallowRef('')

function addContact(): void {
  if (contacts.length >= maximumContacts) {
    statusMessage.value = copy.value.limit
    return
  }
  contactSequence += 1
  contacts.push({
    id: `notification-contact-${contactSequence}`,
    email: '',
    responsibility: 'observer',
  })
  statusMessage.value = ''
}

function removeContact(contactId: string): void {
  if (contacts.length === 1) {
    statusMessage.value = copy.value.minimum
    return
  }
  const contactIndex = contacts.findIndex((contact) => contact.id === contactId)
  if (contactIndex === -1) return
  contacts.splice(contactIndex, 1)
  delete contactErrors[contactId]
  statusMessage.value = ''
}

function saveContacts(): void {
  for (const contactId of Object.keys(contactErrors)) delete contactErrors[contactId]

  const knownEmails = new Set<string>()
  for (const contact of contacts) {
    const email = contact.email.trim().toLowerCase()
    if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(email)) {
      contactErrors[contact.id] = copy.value.required
      continue
    }
    if (knownEmails.has(email)) {
      contactErrors[contact.id] = copy.value.duplicate
      continue
    }
    knownEmails.add(email)
  }

  // AI modified: dynamic-row errors remain scoped to stable contact IDs after insertions and removals.
  statusMessage.value = Object.keys(contactErrors).length
    ? copy.value.invalidSummary
    : copy.value.saved(contacts.length)
}
</script>

<template>
  <FormExampleFrame
    id="dynamic-form-example"
    sequence="03 · DYNAMIC"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <form
      class="space-y-4"
      novalidate
      aria-labelledby="dynamic-form-example-title"
      @submit.prevent="saveContacts"
    >
      <fieldset
        v-for="(contact, index) in contacts"
        :key="contact.id"
        class="grid min-w-0 gap-4 rounded-lg border border-border p-4 lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)_auto] lg:items-end"
      >
        <legend class="px-1 text-xs font-semibold text-muted-foreground">
          {{ copy.contact(index) }}
        </legend>
        <div class="min-w-0 space-y-2">
          <Label :for="`${contact.id}-email`">{{ copy.email }}</Label>
          <Input
            :id="`${contact.id}-email`"
            v-model="contact.email"
            type="email"
            autocomplete="email"
            :aria-invalid="Boolean(contactErrors[contact.id])"
            :aria-describedby="`${contact.id}-error`"
          />
          <p :id="`${contact.id}-error`" class="min-h-5 text-xs text-destructive" role="alert">
            {{ contactErrors[contact.id] }}
          </p>
        </div>
        <div class="min-w-0 space-y-2">
          <Label :for="`${contact.id}-responsibility`">{{ copy.responsibility }}</Label>
          <select
            :id="`${contact.id}-responsibility`"
            v-model="contact.responsibility"
            class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="owner">
              {{ copy.responsibilities.owner }}
            </option>
            <option value="approver">
              {{ copy.responsibilities.approver }}
            </option>
            <option value="observer">
              {{ copy.responsibilities.observer }}
            </option>
          </select>
        </div>
        <Button
          type="button"
          variant="outline"
          size="icon"
          :disabled="contacts.length === 1"
          :aria-label="copy.remove(index)"
          :title="copy.remove(index)"
          @click="removeContact(contact.id)"
        >
          <Trash2 class="size-4" aria-hidden="true" />
        </Button>
      </fieldset>

      <div class="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          :disabled="contacts.length >= maximumContacts"
          @click="addContact"
        >
          <Plus class="size-4" aria-hidden="true" />
          {{ copy.add }}
        </Button>
        <Button type="submit">
          {{ copy.save }}
        </Button>
      </div>
      <p data-testid="dynamic-form-status" class="min-h-5 text-sm" aria-live="assertive">
        {{ statusMessage }}
      </p>
    </form>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
