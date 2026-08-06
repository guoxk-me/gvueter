<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { PageHeader } from '@/components/admin'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import ComponentCenterModuleNav from '../components/ComponentCenterModuleNav.vue'
import ComponentModuleCatalog from '../components/ComponentModuleCatalog.vue'
import ComponentsFormDemo from '../components/ComponentsFormDemo.vue'
import BasicFormExample from './components/BasicFormExample.vue'
import DynamicFormExample from './components/DynamicFormExample.vue'
import SchemaDrivenFormExample from './components/SchemaDrivenFormExample.vue'
import SteppedFormExample from './components/SteppedFormExample.vue'
import SuperFormExample from './components/SuperFormExample.vue'
import ValidationFormExample from './components/ValidationFormExample.vue'

defineOptions({ name: 'FormExamplesPage' })

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        eyebrow: '组件中心 · Form',
        title: '完整表单模式',
        description:
          '从轻量资料编辑到受业务规则约束的资源申请，展示验证、动态字段、分步流转、状态反馈与无障碍契约。',
        ready: '7 个可交互示例',
        navigationLabel: '表单示例导航',
        coverageTitle: '复杂度随业务增长，而不是随组件数量增长',
        coverageDescription:
          '每个示例聚焦一种真实责任；所有输入都有可读名称，错误与保存结果通过实时区域反馈。',
        fieldControlsTitle: '字段控件',
        links: [
          { id: 'basic-form-example', label: '基础表单', detail: '编辑与重置' },
          { id: 'validation-form-example', label: '校验表单', detail: '字段与服务端错误' },
          { id: 'dynamic-form-example', label: '动态表单', detail: '增删重复字段组' },
          { id: 'stepped-form-example', label: '分步表单', detail: '逐步校验与复核' },
          { id: 'super-form-example', label: '超级表单', detail: '联动、预算与审批' },
          { id: 'schema-driven-form-example', label: 'Schema 表单', detail: '权限、上传与富文本' },
          { id: 'field-control-examples', label: '字段控件', detail: '输入、标签与文件' },
        ],
      }
    : {
        eyebrow: 'Component center · Form',
        title: 'Complete form patterns',
        description:
          'From lightweight profile editing to policy-bound resource requests, with validation, dynamic fields, stepped review, state feedback, and accessibility contracts.',
        ready: '7 interactive examples',
        navigationLabel: 'Form example navigation',
        coverageTitle: 'Complexity follows the business, not the component count',
        coverageDescription:
          'Each example owns one realistic responsibility. Every input has a readable name, while errors and saved outcomes use live feedback.',
        fieldControlsTitle: 'Field controls',
        links: [
          { id: 'basic-form-example', label: 'Basic form', detail: 'Edit and reset' },
          {
            id: 'validation-form-example',
            label: 'Validation form',
            detail: 'Field and server errors',
          },
          { id: 'dynamic-form-example', label: 'Dynamic form', detail: 'Repeatable field groups' },
          { id: 'stepped-form-example', label: 'Stepped form', detail: 'Gated review flow' },
          { id: 'super-form-example', label: 'Super form', detail: 'Dependencies and approval' },
          {
            id: 'schema-driven-form-example',
            label: 'Schema form',
            detail: 'Permission, upload, rich text',
          },
          { id: 'field-control-examples', label: 'Field controls', detail: 'Inputs, tags, files' },
        ],
      },
)
</script>

<template>
  <section class="min-w-0 space-y-6">
    <PageHeader :eyebrow="copy.eyebrow" :title="copy.title" :description="copy.description">
      <template #actions>
        <Badge variant="secondary">
          {{ copy.ready }}
        </Badge>
      </template>
    </PageHeader>

    <ComponentCenterModuleNav />

    <!-- AI modified: the coverage rail makes the six form responsibilities directly addressable without a large tab surface. -->
    <Card class="border-primary/20 bg-primary/3">
      <CardContent
        class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.6fr)] lg:items-center"
      >
        <div class="min-w-0 space-y-1">
          <h2 class="break-words text-sm font-semibold">
            {{ copy.coverageTitle }}
          </h2>
          <p class="break-words text-xs leading-5 text-muted-foreground">
            {{ copy.coverageDescription }}
          </p>
        </div>
        <nav :aria-label="copy.navigationLabel">
          <ol class="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            <li v-for="(link, index) in copy.links" :key="link.id" class="min-w-0">
              <a
                :href="`#${link.id}`"
                class="group flex h-full min-w-0 items-start gap-2 rounded-lg border border-border bg-background px-3 py-2 text-left outline-none transition-[color,background-color,border-color,box-shadow] hover:border-primary/40 hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span class="font-mono text-[10px] font-semibold text-primary"
                  >0{{ index + 1 }}</span
                >
                <span class="min-w-0">
                  <span class="block break-words text-xs font-medium">{{ link.label }}</span>
                  <span class="mt-0.5 block break-words text-[10px] text-muted-foreground">{{
                    link.detail
                  }}</span>
                </span>
              </a>
            </li>
          </ol>
        </nav>
      </CardContent>
    </Card>

    <BasicFormExample />
    <ValidationFormExample />
    <DynamicFormExample />
    <SteppedFormExample />
    <SuperFormExample />
    <SchemaDrivenFormExample />
    <!-- AI modified: the reusable field-control gallery remains reachable after the former tab surface was removed. -->
    <section id="field-control-examples" aria-labelledby="field-control-examples-title">
      <h2 id="field-control-examples-title" class="sr-only">
        {{ copy.fieldControlsTitle }}
      </h2>
      <ComponentsFormDemo />
    </section>
    <ComponentModuleCatalog :modules="['forms']" />
  </section>
</template>
