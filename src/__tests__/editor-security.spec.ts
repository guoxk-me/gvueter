import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { defineComponent, nextTick } from 'vue'
import { readMarkdown } from '@/components/admin/markdown-content'
import MarkdownEditor from '@/components/admin/MarkdownEditor.vue'
import {
  RICH_TEXT_ALLOWED_ATTRIBUTES,
  RICH_TEXT_ALLOWED_TAGS,
  sanitizeRichTextHtml,
} from '@/components/admin/rich-text-safety'
import RichTextEditor from '@/components/admin/RichTextEditor.vue'
import { i18n, setLocale } from '@/i18n'

describe('safe editor rendering contracts', () => {
  it('creates typed Markdown blocks for real headings, lists, links, images, and code', () => {
    const blocks = readMarkdown(`# Heading

- first
- second

[Policy](https://example.com/policy)

\`\`\`ts
const approved = true
\`\`\`

![Local](/images/local.png)
![Remote](https://tracker.invalid/pixel.png)`)

    expect(blocks.map(block => block.kind)).toEqual([
      'heading',
      'list',
      'paragraph',
      'code',
      'paragraph',
    ])
    expect(blocks.find(block => block.kind === 'code')).toMatchObject({ language: 'ts' })
    const imageBlocks = blocks.filter(block => block.kind === 'paragraph')
    const imageBlock = imageBlocks[imageBlocks.length - 1]
    expect(imageBlock).toMatchObject({
      lines: [
        [{ kind: 'image', source: '/images/local.png' }],
        [{ kind: 'image', source: undefined }],
      ],
    })
  })

  it('renders Markdown without creating raw HTML or executable URLs', () => {
    setLocale('en-US')
    const wrapper = mount(MarkdownEditor, {
      props: {
        modelValue:
          '# Safe heading\n\n<script>alert(1)</script>\n\n[Unsafe](javascript:alert(1))\n\n![Local](/safe.png)',
      },
      global: { plugins: [i18n] },
    })
    const preview = wrapper.get('[data-testid="markdown-preview"]')

    expect(preview.get('h1').text()).toBe('Safe heading')
    expect(preview.find('script').exists()).toBe(false)
    expect(preview.text()).toContain('<script>alert(1)</script>')
    expect(preview.find('[data-unsafe-link]').exists()).toBe(true)
    expect(preview.find('a').exists()).toBe(false)
    expect(preview.get('img').attributes()).toMatchObject({ src: '/safe.png', loading: 'lazy' })
  })

  it('allows remote Markdown images only for an explicit HTTPS origin', () => {
    const [allowedBlock] = readMarkdown(
      '![Architecture](https://cdn.example.com/architecture.png)',
      ['https://cdn.example.com'],
    )
    const [blockedBlock] = readMarkdown('![Tracker](https://tracker.invalid/pixel.png)', [
      'https://cdn.example.com',
    ])

    expect(allowedBlock).toMatchObject({
      kind: 'paragraph',
      lines: [[{ kind: 'image', source: 'https://cdn.example.com/architecture.png' }]],
    })
    expect(blockedBlock).toMatchObject({
      kind: 'paragraph',
      lines: [[{ kind: 'image', source: undefined }]],
    })
  })

  it('blocks Markdown links and images that use backslashes to escape the current origin', () => {
    const crossOriginPath = String.raw`/\evil.example/phishing`
    const [block] = readMarkdown(
      `[Unsafe](${crossOriginPath}) ![Tracker](${crossOriginPath}/pixel.png)`,
    )

    expect(block).toMatchObject({
      kind: 'paragraph',
      lines: [
        [
          { kind: 'link', href: undefined },
          { kind: 'text', text: ' ' },
          { kind: 'image', source: undefined },
        ],
      ],
    })
  })

  it('sanitizes Quill HTML to an explicit tag, attribute, link, and image allowlist', () => {
    const safeHtml = sanitizeRichTextHtml(`
      <h2 onclick="steal()">Release</h2>
      <script>alert(1)</script>
      <p style="background:url(javascript:steal())">Review <strong>access</strong>.</p>
      <a href="javascript:steal()" target="_self">Unsafe link</a>
      <a href="https://example.com/policy">Safe link</a>
      <img src="/images/safe.png" onerror="steal()" alt="Architecture">
      <img src="https://tracker.invalid/pixel.png" alt="Tracker">
    `)

    expect(safeHtml).toContain('<h2>Release</h2>')
    expect(safeHtml).not.toContain('script')
    expect(safeHtml).not.toContain('onclick')
    expect(safeHtml).not.toContain('style=')
    expect(safeHtml).not.toContain('javascript:')
    expect(safeHtml).toContain('<a>Unsafe link</a>')
    expect(safeHtml).toContain('href="https://example.com/policy"')
    expect(safeHtml).toContain('rel="noopener noreferrer nofollow"')
    expect(safeHtml).toContain('src="/images/safe.png"')
    expect(safeHtml).toContain('loading="lazy"')
    expect(safeHtml).toContain('[Image blocked: Tracker]')
  })

  it('blocks rich-text links and images that use backslashes to escape the current origin', () => {
    const crossOriginPath = String.raw`/\evil.example/phishing`
    const safeHtml = sanitizeRichTextHtml(`
      <a href="${crossOriginPath}">Unsafe link</a>
      <img src="${crossOriginPath}/pixel.png" alt="Tracker">
    `)

    expect(safeHtml).toContain('<a>Unsafe link</a>')
    expect(safeHtml).not.toContain('href=')
    expect(safeHtml).not.toContain('evil.example')
    expect(safeHtml).toContain('[Image blocked: Tracker]')
  })

  it('allows an external rich-text image only when its origin is explicit', () => {
    const safeHtml = sanitizeRichTextHtml(
      '<img src="https://cdn.example.com/diagram.png" alt="Diagram">',
      { allowedImageOrigins: ['https://cdn.example.com'] },
    )
    expect(safeHtml).toContain('src="https://cdn.example.com/diagram.png"')
    expect(safeHtml).toContain('alt="Diagram"')
  })

  it('publishes the exact rich-text tag and generated-attribute contract', () => {
    expect(RICH_TEXT_ALLOWED_TAGS).toContain('IMG')
    expect(RICH_TEXT_ALLOWED_TAGS).not.toContain('IFRAME')
    expect(RICH_TEXT_ALLOWED_ATTRIBUTES).toEqual({
      global: ['class'],
      A: ['href', 'rel', 'target'],
      IMG: ['src', 'alt', 'loading'],
    })
  })

  it('sanitizes restored and pasted rich text while preserving disabled and error semantics', async () => {
    const QuillEditorStub = defineComponent({
      props: {
        content: { type: String, default: '' },
        enable: { type: Boolean, default: true },
        readOnly: { type: Boolean, default: false },
      },
      emits: ['update:content'],
      setup(_props, { emit }) {
        const pasteContent = () =>
          emit(
            'update:content',
            '<h2 onclick="steal()">Pasted</h2><script>steal()</script><img src="/safe.png" onerror="steal()"><img src="https://tracker.invalid/pixel.png" alt="Tracker">',
          )
        return { pasteContent }
      },
      template:
        '<button type="button" data-quill-stub :data-content="content" :data-enable="String(enable)" :data-read-only="String(readOnly)" @click="pasteContent">Paste</button>',
    })
    const wrapper = mount(RichTextEditor, {
      props: {
        modelValue: '<p onclick="steal()">Restored</p>',
        readOnly: true,
        error: 'Content summary is required.',
      },
      global: { plugins: [i18n], stubs: { QuillEditor: QuillEditorStub } },
    })
    await nextTick()

    const restoredEvents = wrapper.emitted('update:modelValue') ?? []
    const restoredContent = restoredEvents[restoredEvents.length - 1]?.[0]
    expect(restoredContent).toBe('<p>Restored</p>')
    expect(wrapper.get('[data-quill-stub]').attributes()).toMatchObject({
      'data-enable': 'false',
      'data-read-only': 'true',
    })
    expect(wrapper.get('[role="group"]').attributes('aria-invalid')).toBe('true')
    expect(wrapper.get('[role="alert"]').text()).toBe('Content summary is required.')

    await wrapper.setProps({ readOnly: false, disabled: true, error: '' })
    expect(wrapper.get('[data-quill-stub]').attributes()).toMatchObject({
      'data-enable': 'false',
      'data-read-only': 'true',
    })
    expect(wrapper.find('[role="alert"]').exists()).toBe(false)

    await wrapper.setProps({ disabled: false })
    await wrapper.get('[data-quill-stub]').trigger('click')
    const pastedEvents = wrapper.emitted('update:modelValue') ?? []
    const pastedContent = String(pastedEvents[pastedEvents.length - 1]?.[0])
    expect(pastedContent).toContain('<h2>Pasted</h2>')
    expect(pastedContent).toContain('src="/safe.png"')
    expect(pastedContent).toContain('[Image blocked: Tracker]')
    expect(pastedContent).not.toContain('script')
    expect(pastedContent).not.toContain('onclick')
    expect(pastedContent).not.toContain('onerror')
  })
})
