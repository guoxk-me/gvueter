import "vue-router";

import type { Ability, TenantFeatureKey } from "@/lib/access";

declare module "vue-router" {
  interface RouteMeta {
    titleKey?: string;
    icon?: string;
    requiresAuth?: boolean;
    publicOnly?: boolean;
    navGroup?: string;
    navOrder?: number;
    hiddenInNav?: boolean;
    requiredAbilities?: Ability[];
    requiredFeatures?: TenantFeatureKey[];
  }
}

export {};
