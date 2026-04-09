import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed } from "vue";

import { workspaces, tenants } from "@/data/admin";
import { isFeatureEnabled, type TenantFeatureKey } from "@/lib/access";

export const useTenantStore = defineStore("tenant", () => {
  const currentTenantId = useStorage("gvueter-tenant", tenants[0]?.id ?? "");
  const currentWorkspaceId = useStorage("gvueter-workspace", workspaces[0]?.id ?? "");

  const currentTenant = computed(() => {
    return tenants.find((tenant) => tenant.id === currentTenantId.value) ?? tenants[0];
  });

  const availableTenants = computed(() => tenants);

  const availableWorkspaces = computed(() =>
    workspaces.filter((workspace) => workspace.tenantId === currentTenant.value?.id),
  );

  const currentWorkspace = computed(() => {
    return (
      availableWorkspaces.value.find((workspace) => workspace.id === currentWorkspaceId.value) ??
      availableWorkspaces.value[0] ??
      null
    );
  });

  const featureStatus = (feature: TenantFeatureKey) => {
    return currentTenant.value?.capabilities[feature];
  };

  const hasFeature = (feature: TenantFeatureKey) => isFeatureEnabled(featureStatus(feature));

  const switchTenant = (tenantId: string) => {
    currentTenantId.value = tenantId;

    const nextWorkspace = workspaces.find((workspace) => workspace.tenantId === tenantId);

    if (nextWorkspace) {
      currentWorkspaceId.value = nextWorkspace.id;
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return;
    }

    currentTenantId.value = workspace.tenantId;
    currentWorkspaceId.value = workspaceId;
  };

  return {
    availableTenants,
    availableWorkspaces,
    currentTenant,
    currentTenantId,
    currentWorkspace,
    currentWorkspaceId,
    featureStatus,
    hasFeature,
    switchTenant,
    switchWorkspace,
  };
});
