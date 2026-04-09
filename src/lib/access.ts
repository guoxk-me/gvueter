import type { RouteMeta } from "vue-router";

import type { AuthUser, UserRole } from "@/stores/auth";

export type AbilityAction = "view" | "manage" | "configure" | "approve" | "export";

export type AbilityResource =
  | "dashboard"
  | "users"
  | "roles"
  | "tenants"
  | "permissions"
  | "menus"
  | "settings"
  | "logs"
  | "profile"
  | "workspaces"
  | "featureMatrix";

export type Ability = {
  action: AbilityAction;
  resource: AbilityResource;
};

export type TenantFeatureKey =
  | "multiTenantRouting"
  | "workspaceSwitching"
  | "workflowApprovals"
  | "webhookDelivery"
  | "auditExports"
  | "directorySync";

export type TenantFeatureStatus = "enabled" | "pilot" | "planned" | "disabled";

const roleAbilityMap: Record<UserRole, Ability[]> = {
  "platform-admin": [
    { action: "view", resource: "dashboard" },
    { action: "view", resource: "users" },
    { action: "manage", resource: "users" },
    { action: "export", resource: "users" },
    { action: "view", resource: "roles" },
    { action: "manage", resource: "roles" },
    { action: "view", resource: "tenants" },
    { action: "manage", resource: "tenants" },
    { action: "view", resource: "permissions" },
    { action: "manage", resource: "permissions" },
    { action: "view", resource: "menus" },
    { action: "manage", resource: "menus" },
    { action: "configure", resource: "featureMatrix" },
    { action: "view", resource: "workspaces" },
    { action: "manage", resource: "workspaces" },
    { action: "view", resource: "settings" },
    { action: "configure", resource: "settings" },
    { action: "view", resource: "logs" },
    { action: "export", resource: "logs" },
    { action: "view", resource: "profile" },
  ],
  "workspace-admin": [
    { action: "view", resource: "dashboard" },
    { action: "view", resource: "users" },
    { action: "manage", resource: "users" },
    { action: "view", resource: "roles" },
    { action: "view", resource: "tenants" },
    { action: "view", resource: "permissions" },
    { action: "view", resource: "menus" },
    { action: "view", resource: "workspaces" },
    { action: "manage", resource: "workspaces" },
    { action: "view", resource: "settings" },
    { action: "configure", resource: "settings" },
    { action: "view", resource: "profile" },
  ],
  "security-analyst": [
    { action: "view", resource: "dashboard" },
    { action: "view", resource: "users" },
    { action: "view", resource: "roles" },
    { action: "view", resource: "tenants" },
    { action: "view", resource: "permissions" },
    { action: "view", resource: "menus" },
    { action: "view", resource: "logs" },
    { action: "export", resource: "logs" },
    { action: "view", resource: "profile" },
  ],
};

export function getRoleAbilities(role: UserRole | undefined) {
  if (!role) {
    return [];
  }

  return roleAbilityMap[role] ?? [];
}

export function hasAbility(user: AuthUser | null | undefined, ability: Ability) {
  return getRoleAbilities(user?.role).some(
    (item) => item.action === ability.action && item.resource === ability.resource,
  );
}

export function hasAllAbilities(user: AuthUser | null | undefined, abilities: Ability[] = []) {
  return abilities.every((ability) => hasAbility(user, ability));
}

export function isFeatureEnabled(status: TenantFeatureStatus | undefined) {
  return status === "enabled" || status === "pilot";
}

export function isRouteAccessible(
  meta: RouteMeta,
  user: AuthUser | null | undefined,
  featureResolver: (feature: TenantFeatureKey) => boolean,
) {
  const abilityAllowed = hasAllAbilities(user, meta.requiredAbilities ?? []);
  const featureAllowed = (meta.requiredFeatures ?? []).every((feature) => featureResolver(feature));

  return abilityAllowed && featureAllowed;
}
