<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/components/admin'
import ComponentCenterModuleNav from '../components/ComponentCenterModuleNav.vue'
import ComponentDemoCard from '../components/ComponentDemoCard.vue'
import ComponentModuleCatalog from '../components/ComponentModuleCatalog.vue'
import AccessibleDragBoard from './components/AccessibleDragBoard.vue'
import UploadLifecycleDemo from './components/UploadLifecycleDemo.vue'
import UploadMediaDemo from './components/UploadMediaDemo.vue'

const { locale } = useI18n()
const messages = {
  'en-US': {
    title: 'Upload & drag operations',
    description:
      'Production-shaped file lifecycle and accessible ordering examples, kept separate because uploading bytes and rearranging business records have different contracts.',
    uploadTitle: 'Chunked upload lifecycle',
    uploadDescription:
      'Validates local selection, sends acknowledged chunks, and demonstrates progress, pause, resume, cancellation, retry, partial success, server errors, and result fill.',
    dragTitle: 'Sortable list and cross-container board',
    dragDescription:
      'Cards support pointer drag, same-list ordering, cross-lane movement, Alt+Arrow keyboard commands, and visible button alternatives for touch and assistive workflows.',
    mediaTitle: 'Single, multiple, image, crop, delete, and recovery',
    mediaDescription:
      'Image selection releases previews, destructive clearing is confirmed, crop output is bounded, and a broken source has an explicit recovery action.',
    lifecycleTitle: 'Contract boundary',
    lifecycleDescription:
      'FileUpload owns safe local selection. The queue owns network status, server identity, retry policy, and cleanup. Generic sorting never pretends to be file transfer.',
  },
  'zh-CN': {
    title: '上传与拖拽操作',
    description: '分别展示接近生产的文件生命周期和可访问排序；字节上传与业务记录重排使用不同契约。',
    uploadTitle: '分片上传生命周期',
    uploadDescription:
      '完成本地校验、服务端确认分片，并展示进度、暂停、继续、取消、重试、部分成功、服务端错误和结果回填。',
    dragTitle: '列表排序与跨容器看板',
    dragDescription:
      '支持指针拖拽、同列表排序、跨列移动、Alt+方向键，以及适用于触控和辅助操作的可见按钮替代入口。',
    mediaTitle: '单文件、多文件、图片、裁剪、删除与恢复',
    mediaDescription:
      '图片选择会释放预览资源，破坏性清理需要确认，裁剪输出有边界，损坏来源提供明确恢复入口。',
    lifecycleTitle: '契约边界',
    lifecycleDescription:
      'FileUpload 负责安全的本地选择；队列负责网络状态、服务端标识、重试和清理；通用排序不会冒充文件传输。',
  },
} as const
const copy = computed(() => messages[locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'])
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader eyebrow="Component Center" :title="copy.title" :description="copy.description" />
    <ComponentCenterModuleNav />

    <ComponentDemoCard :title="copy.uploadTitle" :description="copy.uploadDescription">
      <UploadLifecycleDemo />
      <template #usage>
        FileUpload selection → acknowledged chunk queue → server file ID and result URL
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard :title="copy.dragTitle" :description="copy.dragDescription">
      <AccessibleDragBoard />
      <template #usage>
        Pointer drag + Alt/Arrow keyboard movement + explicit move buttons
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard :title="copy.mediaTitle" :description="copy.mediaDescription">
      <UploadMediaDemo />
    </ComponentDemoCard>

    <aside class="rounded-xl border bg-muted/30 p-4">
      <h2 class="font-semibold">
        {{ copy.lifecycleTitle }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ copy.lifecycleDescription }}
      </p>
    </aside>
    <ComponentModuleCatalog :modules="['uploads']" />
  </section>
</template>
