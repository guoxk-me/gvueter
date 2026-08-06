<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Textarea } from '@/components/ui/textarea'

withDefaults(
  defineProps<{
    language?: string
    label?: string
    placeholder?: string
    readOnly?: boolean
    showLineNumbers?: boolean
  }>(),
  {
    language: 'text',
    readOnly: false,
    showLineNumbers: true,
  },
)

const { t } = useI18n()
// AI modified: this component intentionally keeps native textarea semantics; IDE services remain an optional integration boundary.
const sourceCode = defineModel<string>({ default: '' })
const lineNumbers = computed(() =>
  Array.from(
    { length: Math.max(sourceCode.value.split(/\r?\n/).length, 1) },
    (_, lineIndex) => lineIndex + 1,
  ),
)
</script>

<template>
  <div class="overflow-hidden rounded-md border border-input bg-background">
    <div class="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-1.5">
      <span class="text-xs font-medium text-muted-foreground">
        {{ label ?? t('components.editors.codeLabel') }}
      </span>
      <!-- AI modified: language identifiers and source text must survive automatic translation unchanged. -->
      <span
        class="rounded bg-muted px-1.5 py-0.5 font-mono text-[0.7rem] uppercase text-muted-foreground"
        translate="no"
      >
        {{ language }}
      </span>
    </div>
    <div class="flex min-w-0 items-stretch">
      <ol
        v-if="showLineNumbers"
        class="min-w-10 shrink-0 border-r border-border bg-muted/30 px-2 py-2 text-right font-mono text-sm leading-6 text-muted-foreground select-none"
        aria-hidden="true"
      >
        <li v-for="lineNumber in lineNumbers" :key="lineNumber">
          {{ lineNumber }}
        </li>
      </ol>
      <Textarea
        v-model="sourceCode"
        :readonly="readOnly"
        :placeholder="placeholder ?? t('components.editors.codePlaceholder')"
        :aria-label="label ?? t('components.editors.codeLabel')"
        :spellcheck="false"
        class="min-h-48 min-w-0 resize-y rounded-none border-0 font-mono leading-6 shadow-none focus-visible:ring-0"
        translate="no"
      />
    </div>
  </div>
</template>
