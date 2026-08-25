<script setup lang="ts">
import { computed, nextTick, reactive, shallowRef, useTemplateRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getCurrencyLabel } from '@/lib/display-format'
import FormExampleFrame from './FormExampleFrame.vue'

type EnvironmentId = 'development' | 'production' | 'staging'
type RegionId = 'ap-southeast' | 'eu-central' | 'us-east'
type BackupPolicy = 'daily' | 'none' | 'weekly'

interface ProvisioningRequest {
  projectName: string
  ownerEmail: string
  environment: EnvironmentId
  regions: RegionId[]
  hasDatabase: boolean
  backupPolicy: BackupPolicy
  approverEmail: string
  justification: string
  budgetLimit: number | null
}

type ProvisioningErrorKey
  = | 'approverEmail'
    | 'backupPolicy'
    | 'budgetLimit'
    | 'justification'
    | 'ownerEmail'
    | 'projectName'
    | 'regions'
type ProvisioningErrors = Partial<Record<ProvisioningErrorKey, string>>

const regionOptions: readonly RegionId[] = ['ap-southeast', 'eu-central', 'us-east']
const environmentRates: Record<EnvironmentId, number> = {
  development: 240,
  staging: 680,
  production: 1_900,
}

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        title: '超级 Form：云环境开通',
        description: '一个完整业务示例串联条件字段、跨字段规则、预算估算、草稿、审批与最终提交。',
        states: ['草稿', '字段联动', '预算不足', '待审批', '已提交'],
        statesLabel: '超级表单支持的状态',
        identity: '申请信息',
        projectName: '项目名称',
        ownerEmail: '负责人邮箱',
        infrastructure: '环境与区域',
        environment: '环境级别',
        environments: { development: '开发', staging: '预发布', production: '生产' },
        regions: '部署区域',
        regionLabels: {
          'ap-southeast': '亚太东南',
          'eu-central': '欧洲中部',
          'us-east': '美国东部',
        },
        database: '开通托管数据库',
        backupPolicy: '备份策略',
        backupPolicies: { daily: '每日备份', none: '不备份', weekly: '每周备份' },
        governance: '治理与预算',
        approverEmail: '生产审批人邮箱',
        justification: '业务理由',
        budgetLimit: '月度预算上限',
        decreaseBudget: '降低预算上限',
        increaseBudget: '提高预算上限',
        estimate: '月度费用估算',
        baseCost: '环境基础费用',
        regionCost: '多区域费用',
        databaseCost: '数据库与备份',
        total: '预计总额',
        saveDraft: '保存本页草稿',
        submit: '提交开通申请',
        submitting: '正在提交…',
        errors: {
          projectName: '项目名称至少需要 3 个字符。',
          ownerEmail: '请输入有效的负责人邮箱。',
          regions: '至少选择一个部署区域。',
          backupPolicy: '开通数据库时必须选择备份策略。',
          approverEmail: '生产环境需要有效的审批人邮箱。',
          justification: '生产环境的业务理由至少需要 30 个字符。',
          budgetLimit: '预算上限必须覆盖当前月度费用估算。',
        },
        invalidSummary: '申请包含未满足的业务规则，请修正后重新提交。',
        draftSaved: '草稿已保存在当前示例会话中。',
        success: '云环境开通申请已提交并进入审批队列。',
        notes:
          '生产环境和数据库开关联动出审批人与备份字段；预算规则使用当前选择的实时估算。错误仍与原字段关联，并在提交后聚焦第一个失败项。',
      }
    : {
        title: 'Super form: cloud environment provisioning',
        description:
          'A complete business example combines conditional fields, cross-field policy, cost estimation, drafts, approval, and final submission.',
        states: ['Draft', 'Dependent fields', 'Budget gap', 'Approval required', 'Submitted'],
        statesLabel: 'Supported super form states',
        identity: 'Request identity',
        projectName: 'Project name',
        ownerEmail: 'Owner email',
        infrastructure: 'Environment and regions',
        environment: 'Environment tier',
        environments: { development: 'Development', staging: 'Staging', production: 'Production' },
        regions: 'Deployment regions',
        regionLabels: {
          'ap-southeast': 'Asia Pacific Southeast',
          'eu-central': 'Europe Central',
          'us-east': 'US East',
        },
        database: 'Provision a managed database',
        backupPolicy: 'Backup policy',
        backupPolicies: { daily: 'Daily backup', none: 'No backup', weekly: 'Weekly backup' },
        governance: 'Governance and budget',
        approverEmail: 'Production approver email',
        justification: 'Business justification',
        budgetLimit: 'Monthly budget limit',
        decreaseBudget: 'Decrease budget limit',
        increaseBudget: 'Increase budget limit',
        estimate: 'Monthly cost estimate',
        baseCost: 'Environment base',
        regionCost: 'Additional regions',
        databaseCost: 'Database and backup',
        total: 'Estimated total',
        saveDraft: 'Save in-page draft',
        submit: 'Submit provisioning request',
        submitting: 'Submitting…',
        errors: {
          projectName: 'The project name must contain at least 3 characters.',
          ownerEmail: 'Enter a valid owner email.',
          regions: 'Select at least one deployment region.',
          backupPolicy: 'Choose a backup policy when a database is provisioned.',
          approverEmail: 'Production requires a valid approver email.',
          justification: 'Production justification must contain at least 30 characters.',
          budgetLimit: 'The budget limit must cover the current monthly estimate.',
        },
        invalidSummary: 'The request has unmet business rules. Correct them and submit again.',
        draftSaved: 'The draft is saved for this example session.',
        success: 'The cloud provisioning request entered the approval queue.',
        notes:
          'Production and database choices reveal approver and backup fields. The budget rule uses the live estimate from current selections. Errors stay linked to their fields and submission focuses the first failure.',
      },
)

const formElement = useTemplateRef<HTMLFormElement>('superForm')
const request = reactive<ProvisioningRequest>({
  projectName: 'Merchant insights workspace',
  ownerEmail: 'platform-owner@example.com',
  environment: 'staging',
  regions: ['ap-southeast'],
  hasDatabase: false,
  backupPolicy: 'none',
  approverEmail: '',
  justification: 'Provide a governed analytics workspace for the merchant success team.',
  budgetLimit: 2_500,
})
const errors = reactive<ProvisioningErrors>({})
const statusMessage = shallowRef('')
const isSubmitting = shallowRef(false)

const regionCost = computed(() => Math.max(request.regions.length - 1, 0) * 180)
const databaseCost = computed(() =>
  request.hasDatabase
    ? 520 + (request.backupPolicy === 'daily' ? 160 : request.backupPolicy === 'weekly' ? 80 : 0)
    : 0,
)
const monthlyCost = computed(
  () => environmentRates[request.environment] + regionCost.value + databaseCost.value,
)
const monthlyCostLabel = computed(() =>
  getCurrencyLabel(monthlyCost.value, {
    locale: locale.value,
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
)
const baseCostLabel = computed(() =>
  getCurrencyLabel(environmentRates[request.environment], {
    locale: locale.value,
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
)
const regionCostLabel = computed(() =>
  getCurrencyLabel(regionCost.value, {
    locale: locale.value,
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
)
const databaseCostLabel = computed(() =>
  getCurrencyLabel(databaseCost.value, {
    locale: locale.value,
    currency: 'USD',
    maximumFractionDigits: 0,
  }),
)

function updateRegion(region: RegionId, value: boolean | 'indeterminate'): void {
  const isSelected = request.regions.includes(region)
  if (value === true && !isSelected)
    request.regions.push(region)
  if (value !== true && isSelected)
    request.regions.splice(request.regions.indexOf(region), 1)
  delete errors.regions
}

function updateDatabase(value: boolean): void {
  request.hasDatabase = value
  if (!value) {
    request.backupPolicy = 'none'
    delete errors.backupPolicy
  }
}

function updateBudgetLimit(event: Event): void {
  const rawBudget = (event.target as HTMLInputElement).value
  const budget = Number(rawBudget)
  request.budgetLimit = rawBudget && Number.isFinite(budget) ? budget : null
}

function validateRequest(): boolean {
  for (const errorKey of Object.keys(errors) as ProvisioningErrorKey[]) delete errors[errorKey]

  if (request.projectName.trim().length < 3)
    errors.projectName = copy.value.errors.projectName
  if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(request.ownerEmail.trim()))
    errors.ownerEmail = copy.value.errors.ownerEmail
  if (!request.regions.length)
    errors.regions = copy.value.errors.regions
  if (request.hasDatabase && request.backupPolicy === 'none')
    errors.backupPolicy = copy.value.errors.backupPolicy
  if (request.environment === 'production') {
    if (!/^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/.test(request.approverEmail.trim()))
      errors.approverEmail = copy.value.errors.approverEmail
    if (request.justification.trim().length < 30)
      errors.justification = copy.value.errors.justification
  }
  if (request.budgetLimit === null || request.budgetLimit < monthlyCost.value)
    errors.budgetLimit = copy.value.errors.budgetLimit

  return Object.keys(errors).length === 0
}

async function focusFirstError(): Promise<void> {
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

function saveDraft(): void {
  statusMessage.value = copy.value.draftSaved
}

async function submitRequest(): Promise<void> {
  statusMessage.value = ''
  if (!validateRequest()) {
    statusMessage.value = copy.value.invalidSummary
    await focusFirstError()
    return
  }

  isSubmitting.value = true
  try {
    // AI modified: the example exposes the pending boundary while keeping submission deterministic and offline-safe.
    await Promise.resolve()
    statusMessage.value = copy.value.success
  }
  finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <FormExampleFrame
    id="super-form-example"
    sequence="05 · BUSINESS"
    :title="copy.title"
    :description="copy.description"
    :states="copy.states"
    :states-label="copy.statesLabel"
  >
    <div
      class="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.7fr)_minmax(16rem,0.7fr)] xl:items-start"
    >
      <form
        ref="superForm"
        class="min-w-0 space-y-5"
        novalidate
        :aria-busy="isSubmitting"
        aria-labelledby="super-form-example-title"
        @submit.prevent="submitRequest"
      >
        <fieldset class="grid min-w-0 gap-4 rounded-lg border border-border p-4 lg:grid-cols-2">
          <legend class="px-1 text-xs font-semibold text-muted-foreground">
            {{ copy.identity }}
          </legend>
          <div class="space-y-2">
            <Label for="super-project-name">{{ copy.projectName }}</Label>
            <Input
              id="super-project-name"
              v-model="request.projectName"
              :aria-invalid="Boolean(errors.projectName)"
              aria-describedby="super-project-name-error"
            />
            <p id="super-project-name-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.projectName }}
            </p>
          </div>
          <div class="space-y-2">
            <Label for="super-owner-email">{{ copy.ownerEmail }}</Label>
            <Input
              id="super-owner-email"
              v-model="request.ownerEmail"
              type="email"
              autocomplete="email"
              :aria-invalid="Boolean(errors.ownerEmail)"
              aria-describedby="super-owner-email-error"
            />
            <p id="super-owner-email-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.ownerEmail }}
            </p>
          </div>
        </fieldset>

        <fieldset class="grid min-w-0 gap-4 rounded-lg border border-border p-4 lg:grid-cols-2">
          <legend class="px-1 text-xs font-semibold text-muted-foreground">
            {{ copy.infrastructure }}
          </legend>
          <div class="space-y-2">
            <Label for="super-environment">{{ copy.environment }}</Label>
            <select
              id="super-environment"
              v-model="request.environment"
              class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <option value="development">
                {{ copy.environments.development }}
              </option>
              <option value="staging">
                {{ copy.environments.staging }}
              </option>
              <option value="production">
                {{ copy.environments.production }}
              </option>
            </select>
          </div>
          <div class="space-y-2">
            <span id="super-regions-label" class="text-sm font-medium">{{ copy.regions }}</span>
            <div
              class="grid gap-2"
              role="group"
              aria-labelledby="super-regions-label"
              :aria-invalid="Boolean(errors.regions)"
              aria-describedby="super-regions-error"
            >
              <div v-for="region in regionOptions" :key="region" class="flex items-center gap-2">
                <Checkbox
                  :id="`super-region-${region}`"
                  :model-value="request.regions.includes(region)"
                  @update:model-value="updateRegion(region, $event)"
                />
                <Label :for="`super-region-${region}`">{{ copy.regionLabels[region] }}</Label>
              </div>
            </div>
            <p id="super-regions-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.regions }}
            </p>
          </div>
          <div class="flex min-w-0 items-center gap-3 lg:col-span-2">
            <Switch
              id="super-database"
              :model-value="request.hasDatabase"
              @update:model-value="updateDatabase"
            />
            <Label for="super-database" class="min-w-0 break-words">{{ copy.database }}</Label>
          </div>
          <div v-if="request.hasDatabase" class="space-y-2 lg:col-span-2">
            <Label for="super-backup-policy">{{ copy.backupPolicy }}</Label>
            <select
              id="super-backup-policy"
              v-model="request.backupPolicy"
              class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              :aria-invalid="Boolean(errors.backupPolicy)"
              aria-describedby="super-backup-policy-error"
            >
              <option value="none">
                {{ copy.backupPolicies.none }}
              </option>
              <option value="weekly">
                {{ copy.backupPolicies.weekly }}
              </option>
              <option value="daily">
                {{ copy.backupPolicies.daily }}
              </option>
            </select>
            <p id="super-backup-policy-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.backupPolicy }}
            </p>
          </div>
        </fieldset>

        <fieldset class="grid min-w-0 gap-4 rounded-lg border border-border p-4 lg:grid-cols-2">
          <legend class="px-1 text-xs font-semibold text-muted-foreground">
            {{ copy.governance }}
          </legend>
          <div v-if="request.environment === 'production'" class="space-y-2">
            <Label for="super-approver-email">{{ copy.approverEmail }}</Label>
            <Input
              id="super-approver-email"
              v-model="request.approverEmail"
              type="email"
              autocomplete="email"
              :aria-invalid="Boolean(errors.approverEmail)"
              aria-describedby="super-approver-email-error"
            />
            <p
              id="super-approver-email-error"
              class="min-h-5 text-xs text-destructive"
              role="alert"
            >
              {{ errors.approverEmail }}
            </p>
          </div>
          <div
            class="space-y-2"
            :class="request.environment === 'production' ? '' : 'lg:col-span-2'"
          >
            <Label for="super-budget-limit">{{ copy.budgetLimit }}</Label>
            <input
              id="super-budget-limit"
              :value="request.budgetLimit ?? ''"
              type="number"
              min="0"
              step="100"
              inputmode="decimal"
              class="h-9 w-full min-w-0 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"
              :aria-invalid="Boolean(errors.budgetLimit)"
              aria-describedby="super-budget-limit-error"
              @input="updateBudgetLimit"
            >
            <p id="super-budget-limit-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.budgetLimit }}
            </p>
          </div>
          <div class="space-y-2 lg:col-span-2">
            <Label for="super-justification">{{ copy.justification }}</Label>
            <Textarea
              id="super-justification"
              v-model="request.justification"
              :aria-invalid="Boolean(errors.justification)"
              aria-describedby="super-justification-error"
            />
            <p id="super-justification-error" class="min-h-5 text-xs text-destructive" role="alert">
              {{ errors.justification }}
            </p>
          </div>
        </fieldset>

        <div class="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" @click="saveDraft">
            {{ copy.saveDraft }}
          </Button>
          <Button type="submit" :disabled="isSubmitting">
            {{ isSubmitting ? copy.submitting : copy.submit }}
          </Button>
        </div>
        <p data-testid="super-form-status" class="min-h-5 text-sm" aria-live="assertive">
          {{ statusMessage }}
        </p>
      </form>

      <aside
        class="sticky top-4 min-w-0 rounded-xl border border-primary/20 bg-primary/4 p-4"
        aria-labelledby="super-estimate-title"
      >
        <h3 id="super-estimate-title" class="text-sm font-semibold">
          {{ copy.estimate }}
        </h3>
        <dl class="mt-4 space-y-3 text-sm">
          <div class="flex min-w-0 justify-between gap-4">
            <dt class="min-w-0 break-words text-muted-foreground">
              {{ copy.baseCost }}
            </dt>
            <dd class="shrink-0 font-mono tabular-nums">
              {{ baseCostLabel }}
            </dd>
          </div>
          <div class="flex min-w-0 justify-between gap-4">
            <dt class="min-w-0 break-words text-muted-foreground">
              {{ copy.regionCost }}
            </dt>
            <dd class="shrink-0 font-mono tabular-nums">
              {{ regionCostLabel }}
            </dd>
          </div>
          <div class="flex min-w-0 justify-between gap-4">
            <dt class="min-w-0 break-words text-muted-foreground">
              {{ copy.databaseCost }}
            </dt>
            <dd class="shrink-0 font-mono tabular-nums">
              {{ databaseCostLabel }}
            </dd>
          </div>
          <div
            class="flex min-w-0 justify-between gap-4 border-t border-primary/20 pt-3 font-semibold"
          >
            <dt>{{ copy.total }}</dt>
            <dd data-testid="super-form-total" class="shrink-0 font-mono tabular-nums">
              {{ monthlyCostLabel }}
            </dd>
          </div>
        </dl>
      </aside>
    </div>

    <template #notes>
      {{ copy.notes }}
    </template>
  </FormExampleFrame>
</template>
