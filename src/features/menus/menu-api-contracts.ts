import type { ManagedMenuInput, ManagedMenuListResponse, ManagedMenuRecord } from './types'
import type { NavigationAbilityRequirement } from '@/features/navigation'
import { z } from 'zod'
import {
  MANAGED_MENU_ACTIONS,
  MANAGED_MENU_COMPONENT_KEYS,
  MANAGED_MENU_ICON_KEYS,
  MANAGED_MENU_KINDS,
  MANAGED_MENU_SUBJECTS,
  PERMISSION_IDENTIFIER_PATTERN,
} from './types'

const MANAGED_MENU_ABILITY_SCHEMA: z.ZodType<NavigationAbilityRequirement> = z
  .object({
    action: z.enum(MANAGED_MENU_ACTIONS),
    subject: z.enum(MANAGED_MENU_SUBJECTS),
  })
  .strict()

export const MANAGED_MENU_INPUT_SCHEMA: z.ZodType<ManagedMenuInput, z.ZodTypeDef, unknown> = z
  .object({
    parentId: z.string().trim().min(1).max(200).nullable(),
    titleKey: z.string().trim().min(1).max(200),
    kind: z.enum(MANAGED_MENU_KINDS),
    path: z.string().max(1_000),
    targetUrl: z.string().max(4_000),
    routeName: z.string().max(200),
    // AI modified: structural parsing defers the component allow-list to the target policy so callers
    // receive a field-locatable MENU_TARGET_INVALID response instead of a generic body error.
    componentKey: z
      .string()
      .trim()
      .max(200)
      .transform(componentKey => componentKey as ManagedMenuInput['componentKey']),
    icon: z.enum(MANAGED_MENU_ICON_KEYS),
    requiredAbility: MANAGED_MENU_ABILITY_SCHEMA.optional(),
    permissionIdentifier: z.string().max(300).regex(PERMISSION_IDENTIFIER_PATTERN),
    hidden: z.boolean(),
    keepAlive: z.boolean(),
    order: z.number().int().min(0).max(1_000_000),
  })
  // AI modified: server-owned record fields are discarded safely when an editor resubmits a fetched row.
  .strip()

// AI modified: managed routes cannot be refreshed from an unchecked menu editor response.
export const MANAGED_MENU_RECORD_SCHEMA: z.ZodType<ManagedMenuRecord> = z
  .object({
    id: z.string().trim().min(1).max(200),
    parentId: z.string().trim().min(1).max(200).nullable(),
    titleKey: z.string().trim().min(1).max(200),
    kind: z.enum(MANAGED_MENU_KINDS),
    path: z.string().max(1_000),
    targetUrl: z.string().max(4_000).optional(),
    routeName: z.string().max(200),
    componentKey: z.union([z.literal(''), z.enum(MANAGED_MENU_COMPONENT_KEYS)]),
    icon: z.enum(MANAGED_MENU_ICON_KEYS).optional(),
    requiredAbility: MANAGED_MENU_ABILITY_SCHEMA.optional(),
    permissionIdentifier: z.string().max(300),
    hidden: z.boolean(),
    keepAlive: z.boolean().optional(),
    order: z.number().int().nonnegative(),
  })
  .strict()

export const MANAGED_MENU_LIST_RESPONSE_SCHEMA: z.ZodType<ManagedMenuListResponse> = z
  .object({
    items: z.array(MANAGED_MENU_RECORD_SCHEMA).max(500),
  })
  .strict()
