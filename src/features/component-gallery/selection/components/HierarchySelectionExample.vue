<script setup lang="ts">
import type { CascaderOption } from '../selection-examples'
import type { DepartmentRecord } from '@/features/departments/types'
import { computed, shallowRef } from 'vue'
import { useI18n } from 'vue-i18n'
import { DepartmentTree } from '@/components/admin'
import CascaderField from './CascaderField.vue'

const { locale } = useI18n()
const copy = computed(() =>
  locale.value.startsWith('zh')
    ? {
        tree: 'TreeSelect · 部门范围',
        treeEmpty: '暂无部门',
        expand: '展开部门',
        collapse: '收起部门',
        cascade: 'Cascader · 服务部署区域',
        cascadePlaceholder: '逐级选择部署位置',
        cascadeEmpty: '当前层级没有可选项',
        levels: ['区域', '国家或地区', '可用区'],
        selected: '当前层级选择',
        names: {
          company: '示例科技集团',
          product: '产品中心',
          design: '体验设计组',
          platform: '平台工程组',
          legacy: '历史运营组（不可选）',
          asia: '亚洲',
          europe: '欧洲',
          china: '中国',
          singapore: '新加坡',
          germany: '德国',
          shanghai: '上海可用区',
          beijing: '北京可用区',
          central: '中部可用区',
          frankfurt: '法兰克福可用区',
        },
      }
    : {
        tree: 'TreeSelect · department scope',
        treeEmpty: 'No departments are available',
        expand: 'Expand department',
        collapse: 'Collapse department',
        cascade: 'Cascader · service deployment region',
        cascadePlaceholder: 'Choose each deployment level',
        cascadeEmpty: 'No options are available at this level',
        levels: ['Region', 'Country', 'Availability zone'],
        selected: 'Current hierarchy selection',
        names: {
          company: 'Example Technology Group',
          product: 'Product Center',
          design: 'Experience Design',
          platform: 'Platform Engineering',
          legacy: 'Legacy Operations (unavailable)',
          asia: 'Asia',
          europe: 'Europe',
          china: 'China',
          singapore: 'Singapore',
          germany: 'Germany',
          shanghai: 'Shanghai zone',
          beijing: 'Beijing zone',
          central: 'Central zone',
          frankfurt: 'Frankfurt zone',
        },
      },
)

const selectedDepartmentId = shallowRef<string>()
const checkedDepartmentIds = shallowRef<string[]>([])
const deploymentPath = shallowRef<string[]>([])

const departments = computed<readonly DepartmentRecord[]>(() => [
  { id: 'company', name: copy.value.names.company, parentId: null, order: 1, status: 'active' },
  {
    id: 'product',
    name: copy.value.names.product,
    parentId: 'company',
    order: 1,
    status: 'active',
  },
  { id: 'design', name: copy.value.names.design, parentId: 'product', order: 1, status: 'active' },
  {
    id: 'platform',
    name: copy.value.names.platform,
    parentId: 'product',
    order: 2,
    status: 'active',
  },
  {
    id: 'legacy',
    name: copy.value.names.legacy,
    parentId: 'company',
    order: 2,
    status: 'disabled',
  },
])
const deploymentOptions = computed<readonly CascaderOption[]>(() => [
  {
    value: 'asia',
    label: copy.value.names.asia,
    children: [
      {
        value: 'china',
        label: copy.value.names.china,
        children: [
          { value: 'shanghai', label: copy.value.names.shanghai },
          { value: 'beijing', label: copy.value.names.beijing },
        ],
      },
      {
        value: 'singapore',
        label: copy.value.names.singapore,
        children: [{ value: 'central', label: copy.value.names.central }],
      },
    ],
  },
  {
    value: 'europe',
    label: copy.value.names.europe,
    children: [
      {
        value: 'germany',
        label: copy.value.names.germany,
        children: [{ value: 'frankfurt', label: copy.value.names.frankfurt }],
      },
    ],
  },
])
</script>

<template>
  <div class="grid min-w-0 gap-5 xl:grid-cols-2">
    <div class="min-w-0 rounded-lg border bg-muted/15 p-4">
      <DepartmentTree
        v-model="selectedDepartmentId"
        v-model:checked-ids="checkedDepartmentIds"
        :departments="departments"
        :label="copy.tree"
        :empty-label="copy.treeEmpty"
        :expand-label="copy.expand"
        :collapse-label="copy.collapse"
        checkable
      />
    </div>
    <div class="min-w-0 rounded-lg border bg-muted/15 p-4">
      <CascaderField
        v-model="deploymentPath"
        :options="deploymentOptions"
        :label="copy.cascade"
        :level-labels="copy.levels"
        :placeholder="copy.cascadePlaceholder"
        :empty-label="copy.cascadeEmpty"
      />
    </div>
    <p
      class="break-words rounded-lg border border-dashed bg-muted/20 p-3 text-xs text-muted-foreground xl:col-span-2"
      role="status"
      aria-live="polite"
    >
      <span class="font-semibold text-foreground">{{ copy.selected }}:</span>
      department={{ selectedDepartmentId ?? '—' }} · checked={{
        checkedDepartmentIds.join(', ') || '—'
      }}
      · cascade={{ deploymentPath.join(' / ') || '—' }}
    </p>
  </div>
</template>
