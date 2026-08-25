<script setup lang="ts">
import type { FileUploadEntry } from '@/components/admin'
import { computed, onBeforeUnmount, ref, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { ConfirmAction, ImageCropper, ImageUpload } from '@/components/admin'
import { Button } from '@/components/ui/button'

const { locale } = useI18n()
const messages = {
  'en-US': {
    single: 'Single image',
    multiple: 'Multiple images',
    crop: 'Crop and recover',
    clear: 'Delete selected images',
    clearTitle: 'Delete all selected images?',
    clearDescription:
      'This demonstrates the confirmation boundary used before removing persisted media.',
    confirm: 'Delete images',
    cancel: 'Keep images',
    simulateError: 'Simulate load failure',
    recover: 'Restore sample',
    result: 'Cropped result',
    evaluation: 'Large-file decision',
    evaluationText:
      'The Gallery uses 64 KiB chunks so progress is observable. Production should switch to object-storage multipart above 10 MiB, use 5 MiB or provider-required chunks, hash each chunk, expire sessions, and deduplicate by server digest—not by file name alone.',
  },
  'zh-CN': {
    single: '单图片',
    multiple: '多图片',
    crop: '裁剪与错误恢复',
    clear: '删除已选图片',
    clearTitle: '删除全部已选图片？',
    clearDescription: '此处展示删除已持久化媒体前应使用的确认边界。',
    confirm: '删除图片',
    cancel: '保留图片',
    simulateError: '模拟加载失败',
    recover: '恢复示例',
    result: '裁剪结果',
    evaluation: '大文件评估结论',
    evaluationText:
      'Gallery 使用 64 KiB 分片以便观察进度。生产环境应在 10 MiB 以上切换对象存储分片上传，使用 5 MiB 或服务商要求的分片、逐片哈希、过期会话，并按服务端摘要去重，不能只依赖文件名。',
  },
} as const
const copy = computed(() => messages[locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'])
const singleImage = ref<FileUploadEntry[]>([])
const galleryImages = ref<FileUploadEntry[]>([])
const croppedImageUrl = shallowRef<string>()
const sampleSource = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#0891b2"/></linearGradient></defs>
    <rect width="900" height="600" fill="url(#g)"/><circle cx="450" cy="300" r="150" fill="white" opacity=".86"/>
    <text x="450" y="320" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#111827">MEDIA</text>
  </svg>
`)}`
const cropSource = shallowRef(sampleSource)

function clearImages(): void {
  singleImage.value = []
  galleryImages.value = []
}

function showCroppedImage(image: Blob): void {
  if (croppedImageUrl.value)
    URL.revokeObjectURL(croppedImageUrl.value)
  croppedImageUrl.value = URL.createObjectURL(image)
}

onBeforeUnmount(() => {
  if (croppedImageUrl.value)
    URL.revokeObjectURL(croppedImageUrl.value)
})
</script>

<template>
  <div class="space-y-6">
    <div class="grid min-w-0 gap-5 xl:grid-cols-2">
      <section class="min-w-0 space-y-2" aria-labelledby="single-image-title">
        <h3 id="single-image-title" class="font-semibold">
          {{ copy.single }}
        </h3>
        <ImageUpload v-model="singleImage" :multiple="false" :max-files="1" />
      </section>
      <section class="min-w-0 space-y-2" aria-labelledby="multiple-image-title">
        <h3 id="multiple-image-title" class="font-semibold">
          {{ copy.multiple }}
        </h3>
        <ImageUpload v-model="galleryImages" :max-files="4" />
      </section>
    </div>

    <ConfirmAction
      :title="copy.clearTitle"
      :description="copy.clearDescription"
      :trigger-label="copy.clear"
      :confirm-label="copy.confirm"
      :cancel-label="copy.cancel"
      confirm-variant="destructive"
      @confirm="clearImages"
    />

    <section class="space-y-3" aria-labelledby="crop-recovery-title">
      <div class="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <h3 id="crop-recovery-title" class="font-semibold">
          {{ copy.crop }}
        </h3>
        <div class="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            @click="cropSource = '/missing-gallery-image.png'"
          >
            {{ copy.simulateError }}
          </Button>
          <Button type="button" size="sm" variant="outline" @click="cropSource = sampleSource">
            {{ copy.recover }}
          </Button>
        </div>
      </div>
      <!-- AI modified: the demo exposes load failure and an explicit recovery path instead of a permanently broken preview. -->
      <ImageCropper
        :src="cropSource"
        :aspect-ratio="16 / 9"
        :output-width="640"
        @cropped="showCroppedImage"
      />
      <img
        v-if="croppedImageUrl"
        :src="croppedImageUrl"
        :alt="copy.result"
        class="max-h-48 max-w-full rounded-md border"
      >
    </section>

    <aside class="rounded-lg border bg-muted/30 p-4">
      <h3 class="font-semibold">
        {{ copy.evaluation }}
      </h3>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ copy.evaluationText }}
      </p>
    </aside>
  </div>
</template>
