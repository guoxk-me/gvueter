<script setup lang="ts">
import type { DepartmentInput, DepartmentRecord } from '@/features/departments/types'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { z } from 'zod'
import { FormDialog } from '@/components/admin'
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getDepartmentDescendantIds } from '@/features/departments/department-tree'
import { DEPARTMENT_STATUSES } from '@/features/departments/types'

interface DepartmentFormValues {
  name: string
  parentId: string
  order: number
  status: DepartmentInput['status']
}

const props = defineProps<{
  department?: DepartmentRecord
  departments: DepartmentRecord[]
  isSaving: boolean
}>()

const emit = defineEmits<{
  save: [input: DepartmentInput]
}>()

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()
const isEditing = computed(() => Boolean(props.department))
const parentOptions = computed(() => {
  const unavailableDepartmentIds = props.department
    ? getDepartmentDescendantIds(props.departments, props.department.id)
    : new Set<string>()
  if (props.department)
    unavailableDepartmentIds.add(props.department.id)
  return props.departments.filter(department => !unavailableDepartmentIds.has(department.id))
})
const formSchema = computed(() =>
  toTypedSchema(
    z.object({
      name: z.string().trim().min(1, t('departments.nameRequired')),
      parentId: z.string(),
      order: z.coerce.number().int().min(0),
      status: z.enum(DEPARTMENT_STATUSES),
    }),
  ),
)
const { handleSubmit, resetForm } = useForm<DepartmentFormValues>({
  validationSchema: formSchema,
})

watch(
  [open, () => props.department],
  ([isOpen]) => {
    if (!isOpen)
      return

    resetForm({
      values: {
        name: props.department?.name ?? '',
        parentId: props.department?.parentId ?? 'root',
        order: props.department?.order ?? 10,
        status: props.department?.status ?? 'active',
      },
    })
  },
  { immediate: true },
)

const submitDepartment = handleSubmit((values) => {
  emit('save', {
    name: values.name.trim(),
    parentId: values.parentId === 'root' ? null : values.parentId,
    order: values.order,
    status: values.status,
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('departments.edit') : t('departments.create')"
    :description="t('departments.formDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitDepartment"
  >
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>{{ t('departments.name') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="parentId">
      <FormItem>
        <FormLabel>{{ t('departments.parent') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="root">
              {{ t('departments.root') }}
            </SelectItem>
            <SelectItem
              v-for="parentDepartment in parentOptions"
              :key="parentDepartment.id"
              :value="parentDepartment.id"
            >
              {{ parentDepartment.name }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="order">
        <FormItem>
          <FormLabel>{{ t('departments.order') }}</FormLabel>
          <FormControl>
            <Input v-bind="componentField" type="number" min="0" :disabled="isSaving" />
          </FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="status">
        <FormItem>
          <FormLabel>{{ t('departments.status') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem v-for="status in DEPARTMENT_STATUSES" :key="status" :value="status">
                {{ t(`departments.${status}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  </FormDialog>
</template>
