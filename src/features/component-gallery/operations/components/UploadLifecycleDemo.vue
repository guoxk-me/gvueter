<script setup lang="ts">
import type {
  DemoUploadChunkReceipt,
  DemoUploadCompletion,
  DemoUploadTask,
} from '../upload-lifecycle'
import type { FileUploadRejection, FileUploadRejectReason } from '@/components/admin'
import {
  Ban,
  CirclePause,
  CirclePlay,
  FilePlus2,
  RefreshCw,
  RotateCcw,
  UploadCloud,
} from '@lucide/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { FileUpload, ProgressBar } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { EMPTY_RESPONSE_SCHEMA } from '@/lib/api-contracts'
import { del, post } from '@/lib/http'
import { createDemoUploadTask, DEMO_UPLOAD_CHUNK_SIZE } from '../upload-lifecycle'
import {
  DEMO_UPLOAD_CHUNK_RECEIPT_SCHEMA,
  DEMO_UPLOAD_COMPLETION_SCHEMA,
} from '../upload-lifecycle-api-contracts'

const { locale, t } = useI18n()

const messages = {
  'en-US': {
    selectionLabel: 'Select files for the lifecycle queue',
    selectionDescription:
      'Selection validates names, type, size, count, and duplicates before network work starts.',
    browseLabel: 'Choose files',
    addScenario: 'Add partial-success scenario',
    startAll: 'Start waiting uploads',
    clearFinished: 'Clear finished',
    waiting: 'Waiting',
    uploading: 'Uploading',
    paused: 'Paused',
    succeeded: 'Succeeded',
    failed: 'Failed',
    canceled: 'Canceled',
    pause: 'Pause',
    resume: 'Resume',
    retry: 'Retry',
    cancel: 'Cancel',
    remove: 'Remove',
    serverId: 'Server file ID',
    resultUrl: 'Result URL',
    summary: 'Queue result',
    empty: 'Select files or add the deterministic scenario to exercise the complete lifecycle.',
    failure: 'The mock server rejected one chunk. Retry continues at the failed chunk.',
    rejectedSelection: 'Some files were not added. Resolve each validation error and try again.',
  },
  'zh-CN': {
    selectionLabel: '选择进入上传生命周期队列的文件',
    selectionDescription: '网络传输前统一校验文件名、类型、大小、数量和重复文件。',
    browseLabel: '选择文件',
    addScenario: '添加部分成功场景',
    startAll: '开始等待中的上传',
    clearFinished: '清理已结束项',
    waiting: '等待',
    uploading: '上传中',
    paused: '已暂停',
    succeeded: '成功',
    failed: '失败',
    canceled: '已取消',
    pause: '暂停',
    resume: '继续',
    retry: '重试',
    cancel: '取消',
    remove: '移除',
    serverId: '服务端文件 ID',
    resultUrl: '结果地址',
    summary: '队列结果',
    empty: '请选择文件，或添加可重复的场景以验证完整生命周期。',
    failure: 'Mock 服务拒绝了一个分片；重试会从失败分片继续。',
    rejectedSelection: '部分文件未加入队列，请处理每项校验错误后重试。',
  },
} as const

const copy = computed(() => messages[locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'])
const tasks = ref<DemoUploadTask[]>([])
const rejectedFiles = ref<FileUploadRejection[]>([])
const controllers = new Map<string, AbortController>()
const rejectionMessageKeys: Record<FileUploadRejectReason, string> = {
  duplicate: 'components.upload.duplicate',
  'file-too-large': 'components.upload.fileTooLarge',
  'invalid-file-name': 'components.upload.invalidFileName',
  'invalid-type': 'components.upload.invalidType',
  'max-files': 'components.upload.maxFiles',
}

const completedCount = computed(
  () => tasks.value.filter((task) => task.status === 'succeeded').length,
)
const failedCount = computed(() => tasks.value.filter((task) => task.status === 'failed').length)
const canceledCount = computed(
  () => tasks.value.filter((task) => task.status === 'canceled').length,
)
const waitingCount = computed(() => tasks.value.filter((task) => task.status === 'waiting').length)
const queueSummary = computed(
  () =>
    `${completedCount.value} ${copy.value.succeeded} · ${failedCount.value} ${copy.value.failed} · ${canceledCount.value} ${copy.value.canceled}`,
)

onBeforeUnmount(() => {
  for (const controller of controllers.values()) controller.abort()
  controllers.clear()
})

function addFiles(files: File[]): void {
  rejectedFiles.value = []
  const existingFiles = new Set(
    tasks.value.map((task) => `${task.file.name}:${task.file.size}:${task.file.lastModified}`),
  )
  const newTasks = files
    .filter((file) => !existingFiles.has(`${file.name}:${file.size}:${file.lastModified}`))
    .map(createDemoUploadTask)
  tasks.value.push(...newTasks)
}

function reportRejectedFiles(rejections: FileUploadRejection[]): void {
  // AI modified: lifecycle validation failures stay visible instead of disappearing behind the local selector boundary.
  rejectedFiles.value = rejections
}

function addPartialSuccessScenario(): void {
  // AI modified: deterministic files make success, partial failure, retry, and result fill reproducible in the Gallery.
  const scenarioFiles = [
    new File([new Uint8Array(150_000)], 'customer-export-success.csv', {
      type: 'text/csv',
      lastModified: 1,
    }),
    new File([new Uint8Array(180_000)], 'customer-export-retry-once.csv', {
      type: 'text/csv',
      lastModified: 2,
    }),
    new File([new Uint8Array(96_000)], 'customer-avatar-success.png', {
      type: 'image/png',
      lastModified: 3,
    }),
  ]
  addFiles(scenarioFiles)
}

function statusLabel(task: DemoUploadTask): string {
  return copy.value[task.status]
}

function statusVariant(task: DemoUploadTask): 'default' | 'destructive' | 'outline' | 'secondary' {
  if (task.status === 'succeeded') return 'default'
  if (task.status === 'failed') return 'destructive'
  if (task.status === 'uploading') return 'secondary'
  return 'outline'
}

async function uploadTask(task: DemoUploadTask): Promise<void> {
  if (!['waiting', 'paused', 'failed'].includes(task.status)) return

  task.status = 'uploading'
  task.error = undefined
  const controller = new AbortController()
  controllers.set(task.id, controller)

  try {
    for (let chunkIndex = task.completedChunks; chunkIndex < task.totalChunks; chunkIndex += 1) {
      const chunk = task.file.slice(
        chunkIndex * DEMO_UPLOAD_CHUNK_SIZE,
        Math.min((chunkIndex + 1) * DEMO_UPLOAD_CHUNK_SIZE, task.file.size),
      )
      const receipt = await post<DemoUploadChunkReceipt>(
        `/component-gallery/uploads/${task.id}/chunks/${chunkIndex}`,
        chunk,
        {
          responseSchema: DEMO_UPLOAD_CHUNK_RECEIPT_SCHEMA,
          signal: controller.signal,
          headers: {
            'Content-Type': 'application/octet-stream',
            'X-Demo-File-Name': encodeURIComponent(task.file.name),
            'X-Demo-Total-Chunks': String(task.totalChunks),
            'X-Demo-Fail-Once': task.file.name.includes('retry-once') ? 'true' : 'false',
          },
        },
      )
      task.completedChunks = Math.max(task.completedChunks, receipt.receivedChunkCount)
      task.progress = Math.round((task.completedChunks / task.totalChunks) * 100)
    }

    const completion = await post<DemoUploadCompletion>(
      `/component-gallery/uploads/${task.id}/complete`,
      {
        fileName: task.file.name,
        mimeType: task.file.type,
        totalChunks: task.totalChunks,
      },
      {
        responseSchema: DEMO_UPLOAD_COMPLETION_SCHEMA,
        signal: controller.signal,
      },
    )
    task.serverFileId = completion.serverFileId
    task.resultUrl = completion.resultUrl
    task.progress = 100
    task.status = 'succeeded'
  } catch (error) {
    if (controller.signal.aborted) return
    task.status = 'failed'
    task.error = error instanceof Error ? error.message : copy.value.failure
  } finally {
    if (controllers.get(task.id) === controller) controllers.delete(task.id)
  }
}

function startWaitingUploads(): void {
  for (const task of tasks.value.filter((task) => task.status === 'waiting')) void uploadTask(task)
}

function pauseTask(task: DemoUploadTask): void {
  if (task.status !== 'uploading') return
  task.status = 'paused'
  controllers.get(task.id)?.abort()
}

function resumeTask(task: DemoUploadTask): void {
  if (task.status !== 'paused') return
  task.status = 'waiting'
  void uploadTask(task)
}

function retryTask(task: DemoUploadTask): void {
  if (task.status !== 'failed') return
  task.status = 'waiting'
  void uploadTask(task)
}

function cancelTask(task: DemoUploadTask): void {
  if (['succeeded', 'canceled'].includes(task.status)) return
  task.status = 'canceled'
  task.error = undefined
  controllers.get(task.id)?.abort()
  // AI modified: cancellation cleanup is best-effort, but a malformed success envelope is still rejected.
  void del<null>(`/component-gallery/uploads/${task.id}`, {
    responseSchema: EMPTY_RESPONSE_SCHEMA,
  }).catch(() => undefined)
}

function removeTask(task: DemoUploadTask): void {
  controllers.get(task.id)?.abort()
  tasks.value = tasks.value.filter((candidate) => candidate.id !== task.id)
}

function clearFinished(): void {
  tasks.value = tasks.value.filter((task) =>
    ['waiting', 'uploading', 'paused', 'failed'].includes(task.status),
  )
}
</script>

<template>
  <div class="space-y-5">
    <!-- AI modified: independent extension and MIME allowlists must both pass before transfer starts. -->
    <FileUpload
      accept="image/*,.csv,.pdf"
      :allowed-extensions="['.png', '.jpg', '.jpeg', '.csv', '.pdf']"
      :allowed-mime-types="['image/png', 'image/jpeg', 'text/csv', 'application/pdf']"
      :max-files="8"
      :max-size="8 * 1024 * 1024"
      :label="copy.selectionLabel"
      :description="copy.selectionDescription"
      :browse-label="copy.browseLabel"
      @change="(entries) => addFiles(entries.map((entry) => entry.file))"
      @rejected="reportRejectedFiles"
    />

    <div
      v-if="rejectedFiles.length > 0"
      class="min-w-0 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm"
      role="alert"
    >
      <p class="font-medium text-destructive">
        {{ copy.rejectedSelection }}
      </p>
      <ul class="mt-2 space-y-1 text-muted-foreground">
        <li
          v-for="rejection in rejectedFiles"
          :key="`${rejection.file.name}:${rejection.reason}`"
          class="min-w-0 break-all"
          :title="rejection.file.name"
        >
          <span class="font-medium text-foreground">{{ rejection.file.name }}</span>
          — {{ t(rejectionMessageKeys[rejection.reason], { count: 1 }) }}
        </li>
      </ul>
    </div>

    <div class="flex min-w-0 flex-wrap gap-2">
      <Button type="button" variant="outline" @click="addPartialSuccessScenario">
        <FilePlus2 class="size-4" aria-hidden="true" />
        {{ copy.addScenario }}
      </Button>
      <Button type="button" :disabled="waitingCount === 0" @click="startWaitingUploads">
        <UploadCloud class="size-4" aria-hidden="true" />
        {{ copy.startAll }}
      </Button>
      <Button
        type="button"
        variant="ghost"
        :disabled="completedCount + canceledCount === 0"
        @click="clearFinished"
      >
        <RotateCcw class="size-4" aria-hidden="true" />
        {{ copy.clearFinished }}
      </Button>
    </div>

    <p class="text-sm text-muted-foreground" role="status" aria-live="polite">
      <span class="font-medium text-foreground">{{ copy.summary }}:</span>
      {{ queueSummary }}
    </p>

    <p
      v-if="tasks.length === 0"
      class="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"
    >
      {{ copy.empty }}
    </p>

    <ul v-else class="space-y-3" aria-label="Upload lifecycle queue">
      <li
        v-for="task in tasks"
        :key="task.id"
        class="min-w-0 space-y-3 rounded-lg border bg-card p-4"
        :data-upload-status="task.status"
      >
        <div class="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium" :title="task.file.name">
              {{ task.file.name }}
            </p>
            <p class="text-xs text-muted-foreground">
              {{ task.completedChunks }} / {{ task.totalChunks }} chunks
            </p>
          </div>
          <Badge :variant="statusVariant(task)">
            {{ statusLabel(task) }}
          </Badge>
        </div>

        <ProgressBar
          :value="task.progress"
          :label="task.file.name"
          :tone="
            task.status === 'failed'
              ? 'destructive'
              : task.status === 'succeeded'
                ? 'success'
                : 'default'
          "
        />

        <div
          v-if="task.serverFileId"
          class="grid min-w-0 gap-1 text-xs text-muted-foreground sm:grid-cols-2"
        >
          <p class="min-w-0 break-words" translate="no">
            <span class="font-medium text-foreground">{{ copy.serverId }}:</span>
            {{ task.serverFileId }}
          </p>
          <p class="min-w-0 break-all" translate="no">
            <span class="font-medium text-foreground">{{ copy.resultUrl }}:</span>
            {{ task.resultUrl }}
          </p>
        </div>
        <p v-if="task.error" class="break-words text-sm text-destructive" role="alert">
          {{ task.error || copy.failure }}
        </p>

        <div class="flex min-w-0 flex-wrap gap-2">
          <Button
            v-if="task.status === 'uploading'"
            type="button"
            size="sm"
            variant="outline"
            @click="pauseTask(task)"
          >
            <CirclePause class="size-4" aria-hidden="true" /> {{ copy.pause }}
          </Button>
          <Button v-if="task.status === 'paused'" type="button" size="sm" @click="resumeTask(task)">
            <CirclePlay class="size-4" aria-hidden="true" /> {{ copy.resume }}
          </Button>
          <Button v-if="task.status === 'failed'" type="button" size="sm" @click="retryTask(task)">
            <RefreshCw class="size-4" aria-hidden="true" /> {{ copy.retry }}
          </Button>
          <Button
            v-if="['waiting', 'uploading', 'paused', 'failed'].includes(task.status)"
            type="button"
            size="sm"
            variant="outline"
            @click="cancelTask(task)"
          >
            <Ban class="size-4" aria-hidden="true" /> {{ copy.cancel }}
          </Button>
          <Button v-else type="button" size="sm" variant="ghost" @click="removeTask(task)">
            {{ copy.remove }}
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>
