<script setup lang="ts">
import type { AdminIconKey } from '@/components/admin'
import type { DepartmentRecord } from '@/features/departments/types'
import type { UserRole } from '@/features/users/types'
import { onBeforeUnmount, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CodeEditor,
  DepartmentTree,
  IconSelector,
  ImageCropper,
  JSONViewer,
  MarkdownEditor,
  QRCode,
  RoleSelector,
  UserSelector,
} from '@/components/admin'
import ComponentDemoCard from './ComponentDemoCard.vue'

const { t } = useI18n()
const selectedUserId = shallowRef<number>()
const selectedRole = shallowRef<UserRole>()
const selectedIcon = shallowRef<AdminIconKey>()
const selectedDepartmentId = shallowRef<string>()
const markdownSource = shallowRef(
  '# Release checklist\n\n- Verify permissions\n- Publish changelog',
)
const jsonSource = shallowRef('{\n  "feature": "admin-components",\n  "enabled": true\n}')
const sourceCode = shallowRef(
  'const canPublish = ability.can(\'update\', \'Settings\')\n\nexport { canPublish }',
)
const croppedImageUrl = shallowRef<string>()
const cropperDemoSource = `data:image/svg+xml,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" width="900" height="600">
    <defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#2563eb"/><stop offset="1" stop-color="#22c55e"/></linearGradient></defs>
    <rect width="900" height="600" fill="url(#g)"/><circle cx="450" cy="300" r="150" fill="white" opacity=".85"/>
    <text x="450" y="320" text-anchor="middle" font-family="sans-serif" font-size="56" fill="#0f172a">ADMIN</text>
  </svg>
`)}`

function showCroppedImage(image: Blob): void {
  if (croppedImageUrl.value)
    URL.revokeObjectURL(croppedImageUrl.value)
  croppedImageUrl.value = URL.createObjectURL(image)
}

onBeforeUnmount(() => {
  if (croppedImageUrl.value)
    URL.revokeObjectURL(croppedImageUrl.value)
})

const departments: readonly DepartmentRecord[] = [
  { id: 'company', name: 'Acme Group', parentId: null, order: 1, status: 'active' },
  { id: 'product', name: 'Product', parentId: 'company', order: 1, status: 'active' },
  { id: 'engineering', name: 'Engineering', parentId: 'product', order: 1, status: 'active' },
  { id: 'legacy', name: 'Legacy Operations', parentId: 'company', order: 2, status: 'disabled' },
]
</script>

<template>
  <div class="mt-4 grid gap-4 xl:grid-cols-2">
    <ComponentDemoCard
      :title="t('components.selectors.title')"
      :description="t('components.selectors.description')"
    >
      <div class="grid gap-4 sm:grid-cols-2">
        <div class="space-y-1.5">
          <UserSelector v-model="selectedUserId" />
          <p class="text-xs text-muted-foreground">
            {{ t('components.selectors.selectedId', { id: selectedUserId ?? '—' }) }}
          </p>
        </div>
        <div class="space-y-1.5">
          <RoleSelector v-model="selectedRole" />
          <p class="text-xs text-muted-foreground">
            {{ t('components.selectors.selectedKey', { key: selectedRole ?? '—' }) }}
          </p>
        </div>
        <div class="space-y-1.5 sm:col-span-2">
          <IconSelector v-model="selectedIcon" />
          <p class="text-xs text-muted-foreground">
            {{ t('components.selectors.selectedKey', { key: selectedIcon ?? '—' }) }}
          </p>
        </div>
      </div>
      <template #usage>
        &lt;UserSelector v-model="userId" /&gt; · &lt;RoleSelector v-model="role" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.selectors.departmentTitle')"
      :description="t('components.selectors.departmentDescription')"
    >
      <DepartmentTree v-model="selectedDepartmentId" :departments="departments" />
      <p class="text-sm text-muted-foreground">
        {{ t('components.selectors.selectedId', { id: selectedDepartmentId ?? '—' }) }}
      </p>
      <template #usage>
        &lt;DepartmentTree v-model="departmentId" :departments="departments" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      class="xl:col-span-2"
      :title="t('components.editors.markdownTitle')"
      :description="t('components.editors.markdownDescription')"
    >
      <MarkdownEditor v-model="markdownSource" />
      <template #usage>
        &lt;MarkdownEditor v-model="markdown" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.editors.codeTitle')"
      :description="t('components.editors.codeDescription')"
    >
      <CodeEditor v-model="sourceCode" language="typescript" />
      <template #usage>
        &lt;CodeEditor v-model="source" language="typescript" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.editors.jsonTitle')"
      :description="t('components.editors.jsonDescription')"
    >
      <CodeEditor v-model="jsonSource" language="json" :show-line-numbers="false" />
      <JSONViewer :value="jsonSource" />
      <template #usage>
        &lt;JSONViewer :value="responsePayload" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.media.cropperTitle')"
      :description="t('components.media.cropperDescription')"
    >
      <ImageCropper
        :src="cropperDemoSource"
        :aspect-ratio="16 / 9"
        :output-width="640"
        @cropped="showCroppedImage"
      />
      <img
        v-if="croppedImageUrl"
        :src="croppedImageUrl"
        :alt="t('components.media.croppedResult')"
        class="max-h-40 rounded-md border"
      >
      <template #usage>
        &lt;ImageCropper :aspect-ratio="16 / 9" @cropped="uploadAvatar" /&gt;
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard
      :title="t('components.media.qrCodeTitle')"
      :description="t('components.media.qrCodeDescription')"
    >
      <QRCode
        value="https://example.com/admin/access"
        error-correction-level="H"
        download-file-name="admin-access.png"
      />
      <template #usage>
        &lt;QRCode :value="shareUrl" error-correction-level="H" /&gt;
      </template>
    </ComponentDemoCard>
  </div>
</template>
