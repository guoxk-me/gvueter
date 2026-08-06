<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'

interface DependentOption {
  value: string
  label: string
  parentValue: string
}

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        organization: '业务组织',
        organizationPlaceholder: '选择业务组织',
        team: '团队',
        teamPlaceholder: '先选择业务组织',
        member: '审批人',
        memberPlaceholder: '先选择团队',
        resetNotice: '改变上游选择时，下游团队和审批人会立即清空，避免提交失效 ID。',
        current: '当前依赖值',
        names: {
          commerce: '商业化事业群',
          platform: '平台事业群',
          growth: '增长团队',
          payments: '支付团队',
          frontend: '前端平台团队',
          security: '安全平台团队',
          luna: '林晓月',
          ethan: '陈思远',
          iris: '吴雪',
          henry: '郑航',
        },
      }
    : {
        organization: 'Business organization',
        organizationPlaceholder: 'Choose an organization',
        team: 'Team',
        teamPlaceholder: 'Choose an organization first',
        member: 'Approver',
        memberPlaceholder: 'Choose a team first',
        resetNotice:
          'Changing an upstream selection immediately clears stale team and approver IDs.',
        current: 'Current dependency values',
        names: {
          commerce: 'Commerce Group',
          platform: 'Platform Group',
          growth: 'Growth Team',
          payments: 'Payments Team',
          frontend: 'Frontend Platform',
          security: 'Security Platform',
          luna: 'Luna Lin',
          ethan: 'Ethan Chen',
          iris: 'Iris Wu',
          henry: 'Henry Zheng',
        },
      },
)

const organizationId = shallowRef('')
const teamId = shallowRef('')
const memberId = shallowRef('')
const organizations = computed(() => [
  { value: 'commerce', label: copy.value.names.commerce },
  { value: 'platform', label: copy.value.names.platform },
])
const teams = computed<readonly DependentOption[]>(() =>
  [
    { value: 'growth', label: copy.value.names.growth, parentValue: 'commerce' },
    { value: 'payments', label: copy.value.names.payments, parentValue: 'commerce' },
    { value: 'frontend', label: copy.value.names.frontend, parentValue: 'platform' },
    { value: 'security', label: copy.value.names.security, parentValue: 'platform' },
  ].filter((team) => team.parentValue === organizationId.value),
)
const members = computed<readonly DependentOption[]>(() =>
  [
    { value: 'luna', label: copy.value.names.luna, parentValue: 'growth' },
    { value: 'ethan', label: copy.value.names.ethan, parentValue: 'payments' },
    { value: 'iris', label: copy.value.names.iris, parentValue: 'security' },
    { value: 'henry', label: copy.value.names.henry, parentValue: 'frontend' },
  ].filter((member) => member.parentValue === teamId.value),
)

function chooseOrganization(event: Event): void {
  const select = event.currentTarget
  if (!(select instanceof HTMLSelectElement)) return

  // AI modified: an upstream change clears every dependent ID before new options are exposed.
  organizationId.value = select.value
  teamId.value = ''
  memberId.value = ''
}

function chooseTeam(event: Event): void {
  const select = event.currentTarget
  if (!(select instanceof HTMLSelectElement)) return

  teamId.value = select.value
  memberId.value = ''
}
</script>

<template>
  <div class="min-w-0 space-y-4">
    <div class="grid min-w-0 gap-4 md:grid-cols-3">
      <div class="min-w-0 space-y-1.5">
        <label for="dependent-organization" class="text-xs font-medium">{{
          copy.organization
        }}</label>
        <select
          id="dependent-organization"
          :value="organizationId"
          class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px]"
          @change="chooseOrganization"
        >
          <option value="">
            {{ copy.organizationPlaceholder }}
          </option>
          <option
            v-for="organization in organizations"
            :key="organization.value"
            :value="organization.value"
          >
            {{ organization.label }}
          </option>
        </select>
      </div>
      <div class="min-w-0 space-y-1.5">
        <label for="dependent-team" class="text-xs font-medium">{{ copy.team }}</label>
        <select
          id="dependent-team"
          :value="teamId"
          :disabled="!organizationId"
          class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
          @change="chooseTeam"
        >
          <option value="">
            {{ copy.teamPlaceholder }}
          </option>
          <option v-for="team in teams" :key="team.value" :value="team.value">
            {{ team.label }}
          </option>
        </select>
      </div>
      <div class="min-w-0 space-y-1.5">
        <label for="dependent-member" class="text-xs font-medium">{{ copy.member }}</label>
        <select
          id="dependent-member"
          v-model="memberId"
          :disabled="!teamId"
          class="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-10 w-full min-w-0 rounded-md border bg-background px-3 text-sm outline-none focus-visible:ring-[3px] disabled:opacity-50"
        >
          <option value="">
            {{ copy.memberPlaceholder }}
          </option>
          <option v-for="member in members" :key="member.value" :value="member.value">
            {{ member.label }}
          </option>
        </select>
      </div>
    </div>
    <p class="break-words text-xs text-muted-foreground">
      {{ copy.resetNotice }}
    </p>
    <p
      data-testid="dependent-selection-summary"
      class="break-words rounded-lg border border-dashed bg-muted/20 p-3 text-xs"
      role="status"
      aria-live="polite"
    >
      <span class="font-semibold">{{ copy.current }}:</span>
      organization={{ organizationId || '—' }} · team={{ teamId || '—' }} · member={{
        memberId || '—'
      }}
    </p>
  </div>
</template>
