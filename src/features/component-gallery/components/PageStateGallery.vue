<script setup lang="ts">
import type { PageStateKind, PageStateRecoveryAction } from '@/components/admin'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { PAGE_STATE_CONTRACTS, PAGE_STATE_KINDS, PageStatePanel } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface StateCopy {
  label: string
  title: string
  description: string
  primaryAction?: string
  secondaryAction?: string
}

interface GalleryCopy {
  title: string
  description: string
  previewLabel: string
  matrixTitle: string
  matrixDescription: string
  surface: string
  blocking: string
  recovery: string
  yes: string
  no: string
  noRecovery: string
  recovered: string
  states: Record<PageStateKind, StateCopy>
  recoveryLabels: Record<PageStateRecoveryAction, string>
}

const { locale } = useI18n()
const activeState = shallowRef<PageStateKind>('loading')
const recoveryMessage = shallowRef('')
const galleryCopy = computed<GalleryCopy>(() =>
  locale.value.toLowerCase().startsWith('zh')
    ? {
        title: '页面状态与恢复契约',
        description:
          '首次加载、局部刷新、空数据、搜索无结果、失败、离线、无权限、冲突、部分成功和会话过期使用同一类型词汇，但只出现在适用边界。',
        previewLabel: '选择可交互状态',
        matrixTitle: '适用范围矩阵',
        matrixDescription: '状态契约明确阻断范围、实时区域和恢复动作；业务页面只组合适用项。',
        surface: '边界',
        blocking: '阻断内容',
        recovery: '恢复动作',
        yes: '是',
        no: '否',
        noRecovery: '无需动作',
        recovered: '已执行恢复入口并回到可用状态。',
        states: {
          ready: { label: '就绪', title: '数据可用', description: '内容已加载并可以继续操作。' },
          loading: {
            label: '首次加载',
            title: '正在加载页面',
            description: '保留稳定布局并为异步区域标记 busy。',
          },
          refreshing: {
            label: '局部刷新',
            title: '正在刷新最新数据',
            description: '保留已有内容，避免局部刷新造成页面闪空。',
          },
          empty: {
            label: '空数据',
            title: '尚无业务记录',
            description: '这是有效的空集合，不是接口失败。',
            primaryAction: '创建记录',
          },
          'search-empty': {
            label: '搜索无结果',
            title: '没有符合条件的记录',
            description: '保留查询条件并提供清除筛选入口。',
            primaryAction: '清除筛选',
          },
          error: {
            label: '接口失败',
            title: '数据暂时无法加载',
            description: '错误信息提供可执行的下一步，而不是只显示错误码。',
            primaryAction: '重试',
          },
          'fatal-error': {
            label: '应用故障',
            title: '应用暂时无法继续运行',
            description: '致命渲染或资源加载故障会进入全局恢复边界，并且不展示底层错误。',
            primaryAction: '刷新应用',
          },
          offline: {
            label: '网络断开',
            title: '当前处于离线状态',
            description: '保留已有会话与内容，恢复网络后可以重试。',
            primaryAction: '重试',
          },
          forbidden: {
            label: '权限不足',
            title: '没有访问此内容的权限',
            description: '前端反馈不会替代服务端授权校验。',
            primaryAction: '返回工作台',
          },
          conflict: {
            label: '数据冲突',
            title: '记录已被其他人修改',
            description: '先刷新服务端版本，再决定是否重新应用本地更改。',
            primaryAction: '加载最新版本',
            secondaryAction: '查看差异',
          },
          success: {
            label: '提交成功',
            title: '更改已保存',
            description: '成功反馈确认业务结果并保持下一步清晰。',
          },
          'partial-success': {
            label: '部分成功',
            title: '部分记录已处理',
            description: '成功项不会被失败项掩盖，并提供失败明细。',
            primaryAction: '查看失败明细',
          },
          'session-expired': {
            label: '会话过期',
            title: '登录状态已过期',
            description: '清理受保护缓存，并保留当前地址作为登录后返回目标。',
            primaryAction: '重新登录',
          },
        },
        recoveryLabels: {
          none: '无需动作',
          retry: '重试',
          'reset-search': '清除筛选',
          reconnect: '恢复网络',
          return: '安全返回',
          reload: '刷新版本',
          review: '查看明细',
          'sign-in': '重新登录',
        },
      }
    : {
        title: 'Page-state and recovery contract',
        description:
          'Initial loading, refresh, empty, no results, failure, offline, forbidden, conflict, partial success, and session expiry share typed vocabulary while remaining scoped to applicable boundaries.',
        previewLabel: 'Choose an interactive state',
        matrixTitle: 'Applicability matrix',
        matrixDescription:
          'The contract states blocking scope, live announcement, and recovery actions; pages compose only relevant states.',
        surface: 'Surface',
        blocking: 'Blocks content',
        recovery: 'Recovery',
        yes: 'Yes',
        no: 'No',
        noRecovery: 'No action',
        recovered: 'The recovery entry ran and returned to usable content.',
        states: {
          ready: {
            label: 'Ready',
            title: 'Data is available',
            description: 'The content is loaded and ready for the next operation.',
          },
          loading: {
            label: 'Initial loading',
            title: 'Loading the page',
            description: 'The layout stays stable while the async region is marked busy.',
          },
          refreshing: {
            label: 'Local refresh',
            title: 'Refreshing current data',
            description: 'Existing content remains visible instead of flashing to an empty page.',
          },
          empty: {
            label: 'Empty',
            title: 'No business records yet',
            description: 'This is a valid empty collection, not an API failure.',
            primaryAction: 'Create record',
          },
          'search-empty': {
            label: 'No search results',
            title: 'No records match',
            description: 'The query stays visible and offers a clear-filter recovery.',
            primaryAction: 'Clear filters',
          },
          error: {
            label: 'API error',
            title: 'Data could not be loaded',
            description:
              'The message provides an executable next step instead of only an error code.',
            primaryAction: 'Retry',
          },
          'fatal-error': {
            label: 'Application failure',
            title: 'The application cannot continue',
            description:
              'Fatal render or asset failures enter the global recovery boundary without exposing diagnostics.',
            primaryAction: 'Reload application',
          },
          offline: {
            label: 'Offline',
            title: 'You are offline',
            description:
              'Existing session and content stay intact; retry after connectivity returns.',
            primaryAction: 'Retry',
          },
          forbidden: {
            label: 'Forbidden',
            title: 'You cannot access this content',
            description: 'Client feedback never substitutes for server authorization.',
            primaryAction: 'Back to dashboard',
          },
          conflict: {
            label: 'Conflict',
            title: 'Someone else changed this record',
            description:
              'Load the server version before deciding whether to reapply local changes.',
            primaryAction: 'Load latest',
            secondaryAction: 'Review differences',
          },
          success: {
            label: 'Success',
            title: 'Changes were saved',
            description:
              'Success feedback confirms the business outcome and keeps the next step clear.',
          },
          'partial-success': {
            label: 'Partial success',
            title: 'Some records were processed',
            description: 'Successful rows remain visible and failed details stay actionable.',
            primaryAction: 'Review failures',
          },
          'session-expired': {
            label: 'Session expired',
            title: 'Your session has expired',
            description:
              'Protected cache is cleared and the current URL becomes the post-login return target.',
            primaryAction: 'Sign in again',
          },
        },
        recoveryLabels: {
          none: 'No action',
          retry: 'Retry',
          'reset-search': 'Clear filters',
          reconnect: 'Reconnect',
          return: 'Safe return',
          reload: 'Reload version',
          review: 'Review details',
          'sign-in': 'Sign in again',
        },
      },
)
const activeCopy = computed(() => galleryCopy.value.states[activeState.value])

function recoverFromState(): void {
  recoveryMessage.value = galleryCopy.value.recovered
  activeState.value = 'ready'
}

function selectPageState(stateKind: PageStateKind): void {
  // AI modified: keep state selection atomic and formatter-safe while clearing stale recovery feedback.
  activeState.value = stateKind
  recoveryMessage.value = ''
}
</script>

<template>
  <!-- AI modified: one interactive matrix documents shared states without forcing inapplicable states into every page. -->
  <section
    class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)]"
    data-testid="page-state-gallery"
  >
    <Card class="min-w-0">
      <CardHeader>
        <CardTitle>{{ galleryCopy.title }}</CardTitle>
        <CardDescription>{{ galleryCopy.description }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="space-y-2">
          <p class="text-sm font-medium">
            {{ galleryCopy.previewLabel }}
          </p>
          <div class="flex min-w-0 flex-wrap gap-2" aria-label="Page states">
            <Button
              v-for="stateKind in PAGE_STATE_KINDS"
              :key="stateKind"
              type="button"
              size="sm"
              :variant="activeState === stateKind ? 'default' : 'outline'"
              :aria-pressed="activeState === stateKind"
              @click="selectPageState(stateKind)"
            >
              {{ galleryCopy.states[stateKind].label }}
            </Button>
          </div>
        </div>

        <PageStatePanel
          :state="activeState"
          :title="activeCopy.title"
          :description="activeCopy.description"
          :primary-action-label="activeCopy.primaryAction"
          :secondary-action-label="activeCopy.secondaryAction"
          @primary-action="recoverFromState"
          @secondary-action="recoverFromState"
        >
          <template v-if="recoveryMessage" #details>
            <p data-testid="page-state-recovery-message">
              {{ recoveryMessage }}
            </p>
          </template>
        </PageStatePanel>
      </CardContent>
    </Card>

    <Card class="min-w-0">
      <CardHeader>
        <CardTitle>{{ galleryCopy.matrixTitle }}</CardTitle>
        <CardDescription>{{ galleryCopy.matrixDescription }}</CardDescription>
      </CardHeader>
      <CardContent class="space-y-3">
        <article
          v-for="stateKind in PAGE_STATE_KINDS"
          :key="stateKind"
          class="rounded-lg border p-3 text-sm"
          :data-state-contract="stateKind"
        >
          <div class="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <h3 class="font-medium">
              {{ galleryCopy.states[stateKind].label }}
            </h3>
            <Badge variant="outline">
              {{ PAGE_STATE_CONTRACTS[stateKind].surface }}
            </Badge>
          </div>
          <dl class="mt-2 grid gap-1 text-xs text-muted-foreground">
            <div class="flex justify-between gap-3">
              <dt>{{ galleryCopy.blocking }}</dt>
              <dd>
                {{
                  PAGE_STATE_CONTRACTS[stateKind].blocksContent ? galleryCopy.yes : galleryCopy.no
                }}
              </dd>
            </div>
            <div class="flex justify-between gap-3">
              <dt>{{ galleryCopy.recovery }}</dt>
              <dd class="text-right">
                {{
                  PAGE_STATE_CONTRACTS[stateKind].recoveryActions
                    .map((action) => galleryCopy.recoveryLabels[action])
                    .join(' · ') || galleryCopy.noRecovery
                }}
              </dd>
            </div>
          </dl>
        </article>
      </CardContent>
    </Card>
  </section>
</template>
