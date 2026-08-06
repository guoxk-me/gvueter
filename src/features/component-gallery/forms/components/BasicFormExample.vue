<script setup lang="ts">
import { computed, reactive, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import FormExampleFrame from './FormExampleFrame.vue'

interface BasicProfile {
  displayName: string
  role: 'operator' | 'owner' | 'reviewer'
  summary: string
  isVisible: boolean
}

const initialProfile: BasicProfile = {
  displayName: 'Avery Chen',
  role: 'owner',
  summary: 'Owns customer onboarding controls and the weekly readiness review.',
  isVisible: true,
}

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: '基础 Form：团队资料',
        description: '使用受控输入完成最常见的编辑、保存和恢复默认值流程。',
        states: ['可编辑', '已保存', '已重置'],
        statesLabel: '基础表单支持的状态',
        displayName: '显示名称',
        role: '职责',
        roles: { operator: '运营专员', owner: '流程负责人', reviewer: '合规复核人' },
        summary: '职责说明',
        visible: '在团队目录中显示',
        reset: '恢复示例',
        save: '保存资料',
        saved: (name: string) => `已保存 ${name} 的团队资料。`,
        resetDone: '已恢复基础表单的示例值。',
        notes:
          '适用场景：资料编辑、偏好设置和单屏配置。保存结果通过 polite 实时区域反馈，不依赖短暂 Toast。',
      }
    : {
        title: 'Basic form: team profile',
        description: 'Controlled inputs cover the common edit, save, and restore-default workflow.',
        states: ['Editable', 'Saved', 'Reset'],
        statesLabel: 'Supported basic form states',
        displayName: 'Display name',
        role: 'Responsibility',
        roles: {
          operator: 'Operations specialist',
          owner: 'Process owner',
          reviewer: 'Compliance reviewer',
        },
        summary: 'Responsibility summary',
        visible: 'Show in the team directory',
        reset: 'Restore example',
        save: 'Save profile',
        saved: (name: string) => `Saved the team profile for ${name}.`,
        resetDone: 'Restored the basic form example values.',
        notes:
          'Use for profile editing, preferences, and single-screen configuration. A polite live region preserves the result beyond a transient toast.',
      },
)

const profile = reactive<BasicProfile>({ ...initialProfile })
const statusMessage = shallowRef('')

function saveProfile(): void {
  // AI modified: the demo keeps a persistent confirmation so save behavior is observable to every user.
  statusMessage.value = copy.value.saved(profile.displayName.trim() || initialProfile.displayName)
}

function resetProfile(): void {
  Object.assign(profile, initialProfile)
  statusMessage.value = copy.value.resetDone
}
</script>

<template>
  <FormExampleFrame
    id="basic-form-example"
    sequence="01 · BASIC"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <form
      class="grid gap-5 lg:grid-cols-2"
      aria-labelledby="basic-form-example-title"
      @submit.prevent="saveProfile"
    >
      <div class="space-y-2">
        <Label for="basic-profile-name">{{ copy.displayName }}</Label>
        <Input id="basic-profile-name" v-model="profile.displayName" autocomplete="name" required />
      </div>
      <div class="space-y-2">
        <Label for="basic-profile-role">{{ copy.role }}</Label>
        <select
          id="basic-profile-role"
          v-model="profile.role"
          class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="operator">
            {{ copy.roles.operator }}
          </option>
          <option value="owner">
            {{ copy.roles.owner }}
          </option>
          <option value="reviewer">
            {{ copy.roles.reviewer }}
          </option>
        </select>
      </div>
      <div class="space-y-2 lg:col-span-2">
        <Label for="basic-profile-summary">{{ copy.summary }}</Label>
        <Textarea id="basic-profile-summary" v-model="profile.summary" class="min-h-24" />
      </div>
      <div class="flex min-w-0 items-center gap-3 lg:col-span-2">
        <Switch id="basic-profile-visible" v-model="profile.isVisible" />
        <Label for="basic-profile-visible" class="min-w-0 break-words">{{ copy.visible }}</Label>
      </div>
      <div class="flex flex-wrap justify-end gap-2 lg:col-span-2">
        <Button type="button" variant="outline" @click="resetProfile">
          {{ copy.reset }}
        </Button>
        <Button type="submit">
          {{ copy.save }}
        </Button>
      </div>
      <p
        data-testid="basic-form-status"
        class="min-h-5 text-sm text-success lg:col-span-2"
        aria-live="polite"
      >
        {{ statusMessage }}
      </p>
    </form>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
