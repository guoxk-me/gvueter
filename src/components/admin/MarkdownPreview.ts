import type { VNode, VNodeChild } from 'vue'
import type { MarkdownBlock, MarkdownInline } from './markdown-content'
import { defineComponent, h } from 'vue'
import { readMarkdown } from './markdown-content'

function inlineChildren(nodes: readonly MarkdownInline[]): VNodeChild[] {
  return nodes.map((node) => {
    if (node.kind === 'text')
      return node.text
    if (node.kind === 'strong')
      return h('strong', inlineChildren(node.children))
    if (node.kind === 'emphasis')
      return h('em', inlineChildren(node.children))
    if (node.kind === 'code')
      return h('code', { class: 'rounded bg-muted px-1 py-0.5 font-mono text-[0.9em]' }, node.text)
    if (node.kind === 'image') {
      if (!node.source) {
        return h(
          'span',
          { 'class': 'text-muted-foreground', 'data-unsafe-image': '' },
          `[Image blocked: ${node.alt}]`,
        )
      }
      return h('img', {
        src: node.source,
        alt: node.alt,
        loading: 'lazy',
        class: 'my-3 max-w-full rounded-md border',
      })
    }
    if (!node.href) {
      return h(
        'span',
        { 'class': 'text-muted-foreground underline decoration-dotted', 'data-unsafe-link': '' },
        inlineChildren(node.children),
      )
    }
    const isExternal = /^https?:/i.test(node.href)
    return h(
      'a',
      {
        href: node.href,
        class: 'font-medium text-primary underline underline-offset-4',
        target: isExternal ? '_blank' : undefined,
        rel: isExternal ? 'noopener noreferrer nofollow' : undefined,
      },
      inlineChildren(node.children),
    )
  })
}

function blockNode(block: MarkdownBlock, index: number): VNode {
  if (block.kind === 'heading') {
    return h(
      `h${block.level}`,
      { key: index, class: 'mt-4 scroll-m-20 font-semibold first:mt-0' },
      inlineChildren(block.children),
    )
  }
  if (block.kind === 'paragraph') {
    const lines = block.lines.flatMap((line, lineIndex) => [
      ...(lineIndex > 0 ? [h('br')] : []),
      ...inlineChildren(line),
    ])
    return h('p', { key: index, class: 'my-3 break-words leading-6' }, lines)
  }
  if (block.kind === 'quote') {
    return h(
      'blockquote',
      { key: index, class: 'my-3 border-l-4 border-border pl-4 text-muted-foreground' },
      inlineChildren(block.children),
    )
  }
  if (block.kind === 'code') {
    return h(
      'pre',
      {
        key: index,
        class: 'my-3 max-w-full overflow-auto rounded-md bg-muted p-3 text-xs',
        translate: 'no',
      },
      [h('code', { 'data-language': block.language }, block.source)],
    )
  }
  if (block.kind === 'separator')
    return h('hr', { key: index, class: 'my-4 border-border' })
  const listTag = block.ordered ? 'ol' : 'ul'
  return h(
    listTag,
    {
      key: index,
      class: block.ordered ? 'my-3 list-decimal space-y-1 pl-6' : 'my-3 list-disc space-y-1 pl-6',
    },
    block.entries.map((entry, entryIndex) => h('li', { key: entryIndex }, inlineChildren(entry))),
  )
}

export default defineComponent({
  name: 'MarkdownPreview',
  props: {
    source: { type: String, required: true },
    label: { type: String, required: true },
    allowedImageOrigins: { type: Array<string>, default: () => [] },
  },
  setup(props) {
    return () =>
      h(
        'article',
        {
          'class':
            'min-h-48 min-w-0 break-words rounded-md border border-input bg-muted/20 px-4 py-3 text-sm text-foreground',
          'aria-label': props.label,
          'data-testid': 'markdown-preview',
        },
        readMarkdown(props.source, props.allowedImageOrigins).map(blockNode),
      )
  },
})
