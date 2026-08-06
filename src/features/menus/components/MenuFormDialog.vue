<script setup lang="ts">
import type { ManagedMenuTargetIssue } from '@/features/menus/menu-target-contract'
import type { ManagedMenuInput, ManagedMenuRecord } from '@/features/menus/types'
import type { AppAction, AppSubject } from '@/lib/ability'
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
import { Switch } from '@/components/ui/switch'
import {
  canManagedMenuHaveChildren,
  getManagedMenuAncestors,
  getManagedMenuDescendantIds,
  getManagedMenuOrderPreview,
} from '@/features/menus/menu-hierarchy'
import { getManagedMenuTargetDecision } from '@/features/menus/menu-target-contract'
import {
  MANAGED_MENU_ACTIONS,
  MANAGED_MENU_COMPONENT_KEYS,
  MANAGED_MENU_ICON_KEYS,
  MANAGED_MENU_KINDS,
  MANAGED_MENU_SUBJECTS,
  PERMISSION_IDENTIFIER_PATTERN,
} from '@/features/menus/types'
import { navigationAllowedOrigins } from '@/features/navigation/navigation-url-policy'

const props = defineProps<{
  menu?: ManagedMenuRecord
  menus: ManagedMenuRecord[]
  isSaving: boolean
}>()
const emit = defineEmits<{
  save: [input: ManagedMenuInput]
}>()
const ABILITY_ACTION_OPTIONS = ['none', ...MANAGED_MENU_ACTIONS] as const
const ABILITY_SUBJECT_OPTIONS = ['none', ...MANAGED_MENU_SUBJECTS] as const
const COMPONENT_KEY_OPTIONS = ['none', ...MANAGED_MENU_COMPONENT_KEYS] as const

interface ManagedMenuFormValues {
  parentId: string
  titleKey: string
  kind: ManagedMenuInput['kind']
  path: string
  targetUrl: string
  routeName: string
  componentKey: (typeof COMPONENT_KEY_OPTIONS)[number]
  icon: ManagedMenuInput['icon']
  abilityAction: (typeof ABILITY_ACTION_OPTIONS)[number]
  abilitySubject: (typeof ABILITY_SUBJECT_OPTIONS)[number]
  permissionIdentifier: string
  hidden: boolean
  keepAlive: boolean
  order: number
}

const open = defineModel<boolean>('open', { default: false })
const { t } = useI18n()

function getTargetIssueMessage(issue: ManagedMenuTargetIssue): string {
  if (issue === 'EMPTY_URL') return t('menus.targetUrlRequired')
  if (issue === 'PATH_REQUIRED') return t('menus.pathRequired')
  if (issue === 'ROUTE_NAME_REQUIRED') return t('menus.routeNameRequired')
  if (issue === 'COMPONENT_REQUIRED' || issue === 'IFRAME_COMPONENT_REQUIRED')
    return t('menus.componentKeyRequired')
  if (issue === 'INVALID_PATH') return t('menus.pathInvalid')
  if (issue === 'INVALID_ROUTE_NAME') return t('menus.routeNameInvalid')
  if (issue === 'UNKNOWN_COMPONENT') return t('menus.componentKeyUnknown')
  if (issue === 'ROUTE_FIELD_NOT_ALLOWED' || issue === 'TARGET_URL_NOT_ALLOWED_FOR_MENU')
    return t('menus.targetFieldsConflict')
  return t('menus.targetUrlNotAllowed')
}

const isEditing = computed(() => Boolean(props.menu))
const hasChildren = computed(() =>
  Boolean(props.menu && props.menus.some((menu) => menu.parentId === props.menu?.id)),
)
const parentOptions = computed(() => {
  const unavailableMenuIds = props.menu
    ? getManagedMenuDescendantIds(props.menus, props.menu.id)
    : new Set<string>()
  if (props.menu) unavailableMenuIds.add(props.menu.id)
  return props.menus.filter(
    (menu) => !unavailableMenuIds.has(menu.id) && canManagedMenuHaveChildren(menu),
  )
})
// AI modified: hierarchy placement is validated before save so a valid leaf route cannot become an unsafe parent.
const formSchema = computed(() =>
  toTypedSchema(
    z
      .object({
        parentId: z.string(),
        titleKey: z.string().trim().min(1, t('menus.titleKeyRequired')),
        kind: z.enum(MANAGED_MENU_KINDS),
        path: z.string().trim(),
        targetUrl: z.string().trim(),
        routeName: z.string().trim(),
        componentKey: z.enum(COMPONENT_KEY_OPTIONS),
        icon: z.enum(MANAGED_MENU_ICON_KEYS),
        abilityAction: z.enum(ABILITY_ACTION_OPTIONS),
        abilitySubject: z.enum(ABILITY_SUBJECT_OPTIONS),
        permissionIdentifier: z
          .string()
          .trim()
          .regex(PERMISSION_IDENTIFIER_PATTERN, t('menus.permissionIdentifierInvalid')),
        hidden: z.boolean(),
        keepAlive: z.boolean(),
        order: z.coerce.number().int().min(0),
      })
      .refine(
        (values) => (values.abilityAction === 'none') === (values.abilitySubject === 'none'),
        { path: ['abilityAction'], message: t('menus.abilityPairRequired') },
      )
      .superRefine((values, context) => {
        const parentId = values.parentId === 'root' ? null : values.parentId
        const parentMenu = parentId ? props.menus.find((menu) => menu.id === parentId) : undefined
        if (parentId && (!parentMenu || !canManagedMenuHaveChildren(parentMenu))) {
          context.addIssue({
            code: 'custom',
            path: ['parentId'],
            message: t('menus.parentInvalid'),
          })
        }

        const placement = getManagedMenuOrderPreview(
          props.menus,
          props.menu?.id,
          parentId,
          values.order,
        )
        if (placement.hasOrderConflict) {
          context.addIssue({
            code: 'custom',
            path: ['order'],
            message: t('menus.orderConflict'),
          })
        }

        const isGroupTarget =
          values.kind === 'menu' &&
          !values.path.trim() &&
          !values.routeName.trim() &&
          values.componentKey === 'none'
        if (hasChildren.value && !isGroupTarget) {
          context.addIssue({
            code: 'custom',
            path: ['kind'],
            message: t('menus.parentTargetConflict'),
          })
        }

        const targetDecision = getManagedMenuTargetDecision(
          {
            kind: values.kind,
            path: values.path,
            routeName: values.routeName,
            componentKey: values.componentKey === 'none' ? '' : values.componentKey,
            targetUrl: values.targetUrl,
          },
          {
            baseOrigin: typeof window === 'undefined' ? undefined : window.location.origin,
            allowedOrigins: navigationAllowedOrigins,
          },
        )
        for (const [field, issue] of Object.entries(targetDecision.fieldErrors)) {
          if (issue) {
            context.addIssue({
              code: 'custom',
              path: [field],
              message: getTargetIssueMessage(issue),
            })
          }
        }
      }),
  ),
)
const { handleSubmit, resetForm, setFieldValue, values } = useForm<ManagedMenuFormValues>({
  validationSchema: formSchema,
})

const selectedParentId = computed(() =>
  values.parentId && values.parentId !== 'root' ? values.parentId : null,
)
const hierarchyPreview = computed(() => [
  ...getManagedMenuAncestors(props.menus, selectedParentId.value).map((menu) => ({
    key: menu.id,
    label: t(menu.titleKey),
  })),
  {
    key: 'current-menu',
    label: values.titleKey?.trim() || t('menus.untitledPreview'),
  },
])
const orderPreview = computed(() =>
  getManagedMenuOrderPreview(
    props.menus,
    props.menu?.id,
    selectedParentId.value,
    Number.isFinite(values.order) ? values.order : 0,
  ),
)

watch(
  () => values.kind,
  (kind) => {
    // AI modified: switching target kinds clears hidden incompatible fields before validation and save.
    if (kind === 'menu') {
      setFieldValue('targetUrl', '')
    } else if (kind === 'external') {
      setFieldValue('path', '')
      setFieldValue('routeName', '')
      setFieldValue('componentKey', 'none')
    } else {
      setFieldValue('componentKey', 'iframe')
    }
  },
)

watch(
  [open, () => props.menu],
  ([isOpen]) => {
    if (!isOpen) return

    resetForm({
      values: {
        parentId: props.menu?.parentId ?? 'root',
        titleKey: props.menu?.titleKey ?? '',
        kind: props.menu?.kind ?? 'menu',
        path: props.menu?.path ?? '',
        targetUrl: props.menu?.targetUrl ?? '',
        routeName: props.menu?.routeName ?? '',
        componentKey: props.menu?.componentKey || 'none',
        icon: props.menu?.icon ?? 'dashboard',
        abilityAction: props.menu?.requiredAbility?.action ?? 'none',
        abilitySubject: props.menu?.requiredAbility?.subject ?? 'none',
        permissionIdentifier: props.menu?.permissionIdentifier ?? '',
        hidden: props.menu?.hidden ?? false,
        keepAlive: props.menu?.keepAlive ?? true,
        order: props.menu?.order ?? 10,
      },
    })
  },
  { immediate: true },
)

const submitMenu = handleSubmit((formValues) => {
  const hasAbility = formValues.abilityAction !== 'none' && formValues.abilitySubject !== 'none'
  emit('save', {
    parentId: formValues.parentId === 'root' ? null : formValues.parentId,
    titleKey: formValues.titleKey.trim(),
    kind: formValues.kind,
    path: formValues.kind === 'external' ? '' : formValues.path.trim(),
    targetUrl: formValues.kind === 'menu' ? '' : formValues.targetUrl.trim(),
    routeName: formValues.kind === 'external' ? '' : formValues.routeName.trim(),
    componentKey:
      formValues.kind === 'iframe'
        ? 'iframe'
        : formValues.kind === 'external' || formValues.componentKey === 'none'
          ? ''
          : formValues.componentKey,
    icon: formValues.icon,
    requiredAbility: hasAbility
      ? {
          action: formValues.abilityAction as AppAction,
          subject: formValues.abilitySubject as AppSubject,
        }
      : undefined,
    permissionIdentifier: formValues.permissionIdentifier.trim(),
    hidden: formValues.hidden,
    keepAlive: formValues.keepAlive,
    order: formValues.order,
  })
})
</script>

<template>
  <FormDialog
    v-model:open="open"
    :title="isEditing ? t('menus.edit') : t('menus.create')"
    :description="t('menus.formDescription')"
    :submit-label="t('common.save')"
    :submitting-label="t('common.saving')"
    :cancel-label="t('common.cancel')"
    :is-submitting="isSaving"
    @submit="submitMenu"
  >
    <!-- AI modified: preview the effective ancestor trail and sibling position before persistence. -->
    <div
      class="space-y-2 rounded-lg border border-border bg-muted/20 p-3"
      data-testid="menu-hierarchy-preview"
      aria-live="polite"
    >
      <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {{ t('menus.hierarchyPreview') }}
      </p>
      <ol
        class="flex flex-wrap items-center gap-1 text-sm"
        :aria-label="t('menus.hierarchyPreview')"
      >
        <li>{{ t('menus.root') }}</li>
        <li
          v-for="previewNode in hierarchyPreview"
          :key="previewNode.key"
          class="flex items-center gap-1"
        >
          <span aria-hidden="true">/</span>
          <span>{{ previewNode.label }}</span>
        </li>
      </ol>
      <p class="text-xs text-muted-foreground">
        {{
          t('menus.orderPosition', {
            current: orderPreview.position,
            total: orderPreview.siblingCount,
          })
        }}
        <span v-if="orderPreview.previousMenu">
          · {{ t('menus.afterMenu', { name: t(orderPreview.previousMenu.titleKey) }) }}
        </span>
        <span v-if="orderPreview.nextMenu">
          · {{ t('menus.beforeMenu', { name: t(orderPreview.nextMenu.titleKey) }) }}
        </span>
      </p>
      <p v-if="hasChildren" class="text-xs text-warning">
        {{ t('menus.parentTargetHint') }}
      </p>
    </div>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="parentId">
        <FormItem>
          <FormLabel>{{ t('menus.parent') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem value="root">
                {{ t('menus.root') }}
              </SelectItem>
              <SelectItem
                v-for="parentMenu in parentOptions"
                :key="parentMenu.id"
                :value="parentMenu.id"
              >
                {{ t(parentMenu.titleKey) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="kind">
        <FormItem>
          <FormLabel>{{ t('menus.kind') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving || hasChildren">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem v-for="kind in MANAGED_MENU_KINDS" :key="kind" :value="kind">
                {{ t(`menus.kinds.${kind}`) }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-slot="{ componentField }" name="titleKey">
      <FormItem>
        <FormLabel>{{ t('menus.titleKey') }}</FormLabel>
        <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-if="values.kind !== 'external'" v-slot="{ componentField }" name="path">
        <FormItem>
          <FormLabel>{{ t('menus.path') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-if="values.kind !== 'external'" v-slot="{ componentField }" name="routeName">
        <FormItem>
          <FormLabel>{{ t('menus.routeName') }}</FormLabel>
          <FormControl><Input v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-if="values.kind !== 'menu'" v-slot="{ componentField }" name="targetUrl">
      <FormItem>
        <FormLabel>{{ t('menus.targetUrl') }}</FormLabel>
        <FormControl
          ><Input
            v-bind="componentField"
            :disabled="isSaving"
            placeholder="https://example.com/help"
        /></FormControl>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-if="values.kind === 'menu'" v-slot="{ componentField }" name="componentKey">
      <FormItem>
        <FormLabel>{{ t('menus.componentKey') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="none">
              {{ t('menus.noComponent') }}
            </SelectItem>
            <SelectItem
              v-for="componentKey in MANAGED_MENU_COMPONENT_KEYS"
              :key="componentKey"
              :value="componentKey"
            >
              {{ componentKey }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <FormField v-slot="{ componentField }" name="icon">
      <FormItem>
        <FormLabel>{{ t('menus.icon') }}</FormLabel>
        <Select v-bind="componentField" :disabled="isSaving">
          <FormControl>
            <SelectTrigger class="w-full">
              <SelectValue />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem v-for="icon in MANAGED_MENU_ICON_KEYS" :key="icon" :value="icon">
              {{ icon }}
            </SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="abilityAction">
        <FormItem>
          <FormLabel>{{ t('menus.abilityAction') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem v-for="action in ABILITY_ACTION_OPTIONS" :key="action" :value="action">
                {{ action === 'none' ? t('menus.noAbility') : action }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="abilitySubject">
        <FormItem>
          <FormLabel>{{ t('menus.abilitySubject') }}</FormLabel>
          <Select v-bind="componentField" :disabled="isSaving">
            <FormControl>
              <SelectTrigger class="w-full">
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              <SelectItem
                v-for="subject in ABILITY_SUBJECT_OPTIONS"
                :key="subject"
                :value="subject"
              >
                {{ subject === 'none' ? t('menus.noAbility') : subject }}
              </SelectItem>
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
    <FormField v-slot="{ componentField }" name="permissionIdentifier">
      <FormItem>
        <FormLabel>{{ t('menus.permissionIdentifier') }}</FormLabel>
        <FormControl
          ><Input v-bind="componentField" :disabled="isSaving" placeholder="system:menu:update"
        /></FormControl>
        <p class="text-xs text-muted-foreground">
          {{ t('menus.permissionIdentifierHint') }}
        </p>
        <FormMessage />
      </FormItem>
    </FormField>
    <div class="grid gap-4 sm:grid-cols-2">
      <FormField v-slot="{ componentField }" name="order">
        <FormItem>
          <FormLabel>{{ t('menus.order') }}</FormLabel>
          <FormControl
            ><Input v-bind="componentField" type="number" min="0" :disabled="isSaving"
          /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="hidden">
        <FormItem
          class="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
        >
          <FormLabel>{{ t('menus.hidden') }}</FormLabel>
          <FormControl><Switch v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
      <FormField v-slot="{ componentField }" name="keepAlive">
        <FormItem
          class="flex items-center justify-between rounded-md border border-border px-3 py-2.5"
        >
          <FormLabel>{{ t('menus.keepAlive') }}</FormLabel>
          <FormControl><Switch v-bind="componentField" :disabled="isSaving" /></FormControl>
          <FormMessage />
        </FormItem>
      </FormField>
    </div>
  </FormDialog>
</template>
