<script setup lang="ts">
import type { ComponentModuleExample } from '../component-module-examples'
import { useI18n } from 'vue-i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const props = defineProps<{
  examples: readonly ComponentModuleExample[]
}>()

const { t } = useI18n()
</script>

<template>
  <section
    v-if="examples.length > 0"
    class="min-w-0 space-y-3"
    aria-labelledby="component-module-examples-title"
  >
    <div class="space-y-1">
      <h2 id="component-module-examples-title" class="text-lg font-semibold">
        {{ t('components.center.examples.title') }}
      </h2>
      <p class="text-sm text-muted-foreground">
        {{ t('components.center.examples.description') }}
      </p>
    </div>

    <Tabs :default-value="props.examples[0]?.id">
      <div class="relative min-w-0 overflow-x-auto pb-1">
        <TabsList class="h-auto min-w-max justify-start">
          <TabsTrigger v-for="example in examples" :key="example.id" :value="example.id">
            {{ t(example.titleKey) }}
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent v-for="example in examples" :key="example.id" :value="example.id" class="mt-3">
        <component :is="example.component" />
      </TabsContent>
    </Tabs>
  </section>
</template>
