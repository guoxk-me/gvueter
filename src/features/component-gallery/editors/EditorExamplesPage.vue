<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  CodeEditor,
  JSONViewer,
  MarkdownEditor,
  PageHeader,
  RichTextEditor,
} from '@/components/admin'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ComponentCenterModuleNav from '../components/ComponentCenterModuleNav.vue'
import ComponentDemoCard from '../components/ComponentDemoCard.vue'
import ComponentModuleCatalog from '../components/ComponentModuleCatalog.vue'

const { locale } = useI18n()
const messages = {
  'en-US': {
    title: 'Editors & safe content',
    description:
      'Real Markdown rendering, sanitized rich text, native code editing, and JSON inspection with explicit security and maturity boundaries.',
    markdownTitle: 'Markdown editor and rendered preview',
    markdownDescription:
      'Headings, emphasis, lists, links, images, quotes, and code blocks render from a typed tree. Raw HTML stays text; unsafe URLs and unapproved image origins are blocked.',
    richTitle: 'Rich text lifecycle',
    richDescription:
      'Quill supports editing, paste, toolbar media, read-only, disabled, validation error, and long content. Emitted HTML is client-sanitized and still requires server sanitation.',
    codeTitle: 'Code editor boundary',
    codeDescription:
      'The existing component is intentionally a controlled textarea with line numbers. Language switching is metadata; IDE diagnostics and workers require a separate adapter.',
    jsonTitle: 'JSON viewer states',
    jsonDescription:
      'Valid and invalid payloads, collapse state, long content, and copy actions remain machine-readable and escaped.',
    securityTitle: 'Content security contract',
    securityDescription:
      'Client sanitation protects preview surfaces, but storage and delivery APIs must sanitize again. Markdown never executes raw HTML; external images require an explicit origin allowlist.',
    readOnly: 'Read-only',
    disabled: 'Disabled',
    invalid: 'Show validation error',
    paste: 'Simulate pasted HTML',
    media: 'Insert allowed media',
    longContent: 'Load long content',
    editorError: 'Provide an accessible summary before publishing this content.',
    validJson: 'Valid JSON',
    invalidJson: 'Invalid JSON',
  },
  'zh-CN': {
    title: '编辑器与安全内容',
    description:
      '展示真实 Markdown 渲染、富文本消毒、原生代码编辑和 JSON 查看，并明确安全与成熟度边界。',
    markdownTitle: 'Markdown 编辑与渲染预览',
    markdownDescription:
      '通过类型化渲染树支持标题、强调、列表、链接、图片、引用和代码块；原始 HTML 保持文本，危险 URL 与未授权图片来源会被阻止。',
    richTitle: '富文本生命周期',
    richDescription:
      'Quill 覆盖编辑、粘贴、工具栏媒体、只读、禁用、校验错误和长内容；输出 HTML 经过客户端消毒，服务端仍必须再次消毒。',
    codeTitle: '代码编辑器边界',
    codeDescription:
      '现有组件明确是带行号的受控文本框；语言切换仅为元数据，IDE 诊断和 Worker 需要独立适配器。',
    jsonTitle: 'JSON 查看状态',
    jsonDescription: '覆盖有效/无效数据、折叠、长内容和复制，始终保持机器内容不翻译且安全转义。',
    securityTitle: '内容安全契约',
    securityDescription:
      '客户端消毒保护预览界面，存储和分发接口仍须再次消毒；Markdown 不执行原始 HTML，外部图片必须显式加入来源白名单。',
    readOnly: '只读',
    disabled: '禁用',
    invalid: '显示校验错误',
    paste: '模拟粘贴 HTML',
    media: '插入允许的媒体',
    longContent: '加载长内容',
    editorError: '发布内容前请补充可访问的摘要。',
    validJson: '有效 JSON',
    invalidJson: '无效 JSON',
  },
} as const
const copy = computed(() => messages[locale.value === 'zh-CN' ? 'zh-CN' : 'en-US'])

const markdown = ref(`# Release checklist

Use **server authorization** and [review the policy](https://example.com/policy).

- Validate the request
- Record the request ID

> Raw HTML is shown as text: <img src=x onerror=alert(1)>

\`\`\`ts
const requestId = 'req_2026_07_14'
\`\`\`

![Local architecture diagram](/mock-assets/architecture.png)
![Blocked tracker](https://tracker.invalid/pixel.png)`)
const richText = ref(
  '<h2>Release briefing</h2><p><strong>Review</strong> the access policy before publishing.</p>',
)
const isRichTextReadOnly = ref(false)
const isRichTextDisabled = ref(false)
const hasRichTextError = ref(false)
const richTextToolbar: unknown[] = [
  [{ header: [2, 3, false] }],
  ['bold', 'italic', 'link', 'image'],
  [{ list: 'ordered' }, { list: 'bullet' }],
  ['clean'],
]
const sourceLanguage = ref('typescript')
const sourceCode = ref(`interface ReleaseRequest {
  requestId: string
  approved: boolean
}`)
const jsonPayload = ref<unknown>({
  requestId: 'req_2026_07_14',
  status: 'approved',
  permissions: ['content:read', 'content:publish'],
})

function showValidJson(): void {
  jsonPayload.value = {
    requestId: 'req_2026_07_14',
    status: 'approved',
    nested: { region: 'Asia/Shanghai', attempts: 1 },
  }
}

function showInvalidJson(): void {
  jsonPayload.value = '{"requestId":'
}

function showPastedRichText(): void {
  // AI modified: unsafe pasted markup makes the client sanitation boundary observable in the live example.
  richText.value =
    '<h2 onclick="alert(1)">Pasted briefing</h2><script>alert(1)</scr' +
    'ipt><p>Review <strong>access</strong>.</p>'
}

function showRichTextMedia(): void {
  richText.value =
    '<h2>Architecture</h2><p>Approved local media:</p><img src="/mock-assets/architecture.png" alt="Architecture diagram">'
}

function showLongRichText(): void {
  richText.value = Array.from(
    { length: 16 },
    (_, paragraphIndex) =>
      `<p><strong>Section ${paragraphIndex + 1}.</strong> This deliberately long administrative content verifies wrapping, scrolling, selection, and validation states without truncating the stored value.</p>`,
  ).join('')
}
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader eyebrow="Component Center" :title="copy.title" :description="copy.description" />
    <ComponentCenterModuleNav />

    <ComponentDemoCard :title="copy.markdownTitle" :description="copy.markdownDescription">
      <MarkdownEditor v-model="markdown" />
      <template #usage>
        Typed Markdown tree; no innerHTML; links and image origins use separate allow rules.
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard :title="copy.richTitle" :description="copy.richDescription">
      <div class="flex min-w-0 flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          :variant="isRichTextReadOnly ? 'default' : 'outline'"
          @click="isRichTextReadOnly = !isRichTextReadOnly"
        >
          {{ copy.readOnly }}
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="isRichTextDisabled ? 'default' : 'outline'"
          @click="isRichTextDisabled = !isRichTextDisabled"
        >
          {{ copy.disabled }}
        </Button>
        <Button
          type="button"
          size="sm"
          :variant="hasRichTextError ? 'destructive' : 'outline'"
          @click="hasRichTextError = !hasRichTextError"
        >
          {{ copy.invalid }}
        </Button>
        <Button type="button" size="sm" variant="outline" @click="showPastedRichText">
          {{ copy.paste }}
        </Button>
        <Button type="button" size="sm" variant="outline" @click="showRichTextMedia">
          {{ copy.media }}
        </Button>
        <Button type="button" size="sm" variant="outline" @click="showLongRichText">
          {{ copy.longContent }}
        </Button>
      </div>
      <RichTextEditor
        v-model="richText"
        :read-only="isRichTextReadOnly"
        :disabled="isRichTextDisabled"
        :error="hasRichTextError ? copy.editorError : ''"
        :toolbar="richTextToolbar"
      />
      <pre
        class="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs"
        translate="no"
        >{{ richText }}</pre
      >
      <template #usage>
        Client allowlist + server sanitation boundary; scripts, event handlers, unsafe URLs, and
        unapproved images are removed.
      </template>
    </ComponentDemoCard>

    <ComponentDemoCard :title="copy.codeTitle" :description="copy.codeDescription">
      <div class="max-w-xs">
        <Select v-model="sourceLanguage">
          <SelectTrigger aria-label="Source language">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="typescript"> TypeScript </SelectItem>
            <SelectItem value="json"> JSON </SelectItem>
            <SelectItem value="sql"> SQL </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <CodeEditor v-model="sourceCode" :language="sourceLanguage" />
    </ComponentDemoCard>

    <ComponentDemoCard :title="copy.jsonTitle" :description="copy.jsonDescription">
      <div class="flex min-w-0 flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" @click="showValidJson">
          {{ copy.validJson }}
        </Button>
        <Button type="button" size="sm" variant="outline" @click="showInvalidJson">
          {{ copy.invalidJson }}
        </Button>
      </div>
      <JSONViewer :value="jsonPayload" />
    </ComponentDemoCard>

    <aside class="rounded-xl border border-warning/40 bg-warning/5 p-4">
      <h2 class="font-semibold">
        {{ copy.securityTitle }}
      </h2>
      <p class="mt-1 text-sm text-muted-foreground">
        {{ copy.securityDescription }}
      </p>
    </aside>
    <ComponentModuleCatalog :modules="['editors']" />
  </section>
</template>
