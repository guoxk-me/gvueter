import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed } from "vue";

export type DraftStatus = "draft" | "pending" | "published";

export type WorkspaceDraft = {
  name: string;
  environment: string;
  region: string;
  inheritApprovals: boolean;
};

export type FeatureRolloutDraft = {
  label: string;
  mode: string;
  workspaceGuard: boolean;
  notifyOwners: boolean;
};

export type PermissionPolicyDraft = {
  name: string;
  targetRisk: string;
  dualApproval: boolean;
  auditTrace: boolean;
};

export type MenuRegistryDraft = {
  label: string;
  visibility: string;
  tenantFeature: boolean;
  roleReview: boolean;
};

type SavedDraftMeta = {
  updatedAt: string;
  status: DraftStatus;
};

export type SavedWorkspaceDraft = WorkspaceDraft & SavedDraftMeta;
export type SavedFeatureRolloutDraft = FeatureRolloutDraft & SavedDraftMeta;
export type SavedPermissionPolicyDraft = PermissionPolicyDraft & SavedDraftMeta;
export type SavedMenuRegistryDraft = MenuRegistryDraft & SavedDraftMeta;

type DraftSummary = {
  id: "workspace" | "feature-rollout" | "permission-policy" | "menu-registry";
  title: string;
  detail: string;
  routeName: string;
  icon: string;
  updatedAt: string;
  status: DraftStatus;
};

const defaultWorkspaceDraft: WorkspaceDraft = {
  name: "",
  environment: "Production",
  region: "Singapore",
  inheritApprovals: true,
};

const defaultFeatureRolloutDraft: FeatureRolloutDraft = {
  label: "Quarterly governance rollout",
  mode: "pilot",
  workspaceGuard: true,
  notifyOwners: true,
};

const defaultPermissionPolicyDraft: PermissionPolicyDraft = {
  name: "High-risk approval chain",
  targetRisk: "High",
  dualApproval: true,
  auditTrace: true,
};

const defaultMenuRegistryDraft: MenuRegistryDraft = {
  label: "Approvals center",
  visibility: "Feature-gated",
  tenantFeature: true,
  roleReview: true,
};

export const useGovernanceDraftsStore = defineStore("governance-drafts", () => {
  const workspaceDraft = useStorage<WorkspaceDraft>("gvueter-workspace-draft", {
    ...defaultWorkspaceDraft,
  });

  const featureRolloutDraft = useStorage<FeatureRolloutDraft>("gvueter-feature-rollout-draft", {
    ...defaultFeatureRolloutDraft,
  });

  const permissionPolicyDraft = useStorage<PermissionPolicyDraft>(
    "gvueter-permission-policy-draft",
    {
      ...defaultPermissionPolicyDraft,
    },
  );

  const menuRegistryDraft = useStorage<MenuRegistryDraft>("gvueter-menu-registry-draft", {
    ...defaultMenuRegistryDraft,
  });

  const savedWorkspaceDraft = useStorage<SavedWorkspaceDraft | null>(
    "gvueter-workspace-draft-saved",
    null,
  );
  const savedFeatureRolloutDraft = useStorage<SavedFeatureRolloutDraft | null>(
    "gvueter-feature-rollout-draft-saved",
    null,
  );
  const savedPermissionPolicyDraft = useStorage<SavedPermissionPolicyDraft | null>(
    "gvueter-permission-policy-draft-saved",
    null,
  );
  const savedMenuRegistryDraft = useStorage<SavedMenuRegistryDraft | null>(
    "gvueter-menu-registry-draft-saved",
    null,
  );

  const withMeta = <T extends Record<string, unknown>>(draft: T, status: DraftStatus) => ({
    ...draft,
    updatedAt: new Date().toISOString(),
    status,
  });

  const saveWorkspaceDraft = () => {
    savedWorkspaceDraft.value = withMeta(workspaceDraft.value, "draft");
  };

  const saveFeatureRolloutDraft = () => {
    savedFeatureRolloutDraft.value = withMeta(featureRolloutDraft.value, "draft");
  };

  const savePermissionPolicyDraft = () => {
    savedPermissionPolicyDraft.value = withMeta(permissionPolicyDraft.value, "draft");
  };

  const saveMenuRegistryDraft = () => {
    savedMenuRegistryDraft.value = withMeta(menuRegistryDraft.value, "draft");
  };

  const updateDraftStatus = (type: DraftSummary["id"], status: DraftStatus) => {
    const nextUpdatedAt = new Date().toISOString();

    if (type === "workspace" && savedWorkspaceDraft.value) {
      savedWorkspaceDraft.value = {
        ...savedWorkspaceDraft.value,
        status,
        updatedAt: nextUpdatedAt,
      };
    }

    if (type === "feature-rollout" && savedFeatureRolloutDraft.value) {
      savedFeatureRolloutDraft.value = {
        ...savedFeatureRolloutDraft.value,
        status,
        updatedAt: nextUpdatedAt,
      };
    }

    if (type === "permission-policy" && savedPermissionPolicyDraft.value) {
      savedPermissionPolicyDraft.value = {
        ...savedPermissionPolicyDraft.value,
        status,
        updatedAt: nextUpdatedAt,
      };
    }

    if (type === "menu-registry" && savedMenuRegistryDraft.value) {
      savedMenuRegistryDraft.value = {
        ...savedMenuRegistryDraft.value,
        status,
        updatedAt: nextUpdatedAt,
      };
    }
  };

  const clearDraft = (type: DraftSummary["id"]) => {
    if (type === "workspace") {
      savedWorkspaceDraft.value = null;
    }

    if (type === "feature-rollout") {
      savedFeatureRolloutDraft.value = null;
    }

    if (type === "permission-policy") {
      savedPermissionPolicyDraft.value = null;
    }

    if (type === "menu-registry") {
      savedMenuRegistryDraft.value = null;
    }
  };

  const resetEditableDraft = (type: DraftSummary["id"]) => {
    if (type === "workspace") {
      workspaceDraft.value = { ...defaultWorkspaceDraft };
    }

    if (type === "feature-rollout") {
      featureRolloutDraft.value = { ...defaultFeatureRolloutDraft };
    }

    if (type === "permission-policy") {
      permissionPolicyDraft.value = { ...defaultPermissionPolicyDraft };
    }

    if (type === "menu-registry") {
      menuRegistryDraft.value = { ...defaultMenuRegistryDraft };
    }
  };

  const clearDraftCompletely = (type: DraftSummary["id"]) => {
    clearDraft(type);
    resetEditableDraft(type);
  };

  const savedDraftCount = computed(() => {
    return [
      savedWorkspaceDraft.value,
      savedFeatureRolloutDraft.value,
      savedPermissionPolicyDraft.value,
      savedMenuRegistryDraft.value,
    ].filter(Boolean).length;
  });

  const statusCounts = computed(() => {
    return {
      draft: [
        savedWorkspaceDraft.value,
        savedFeatureRolloutDraft.value,
        savedPermissionPolicyDraft.value,
        savedMenuRegistryDraft.value,
      ].filter((item) => item?.status === "draft").length,
      pending: [
        savedWorkspaceDraft.value,
        savedFeatureRolloutDraft.value,
        savedPermissionPolicyDraft.value,
        savedMenuRegistryDraft.value,
      ].filter((item) => item?.status === "pending").length,
      published: [
        savedWorkspaceDraft.value,
        savedFeatureRolloutDraft.value,
        savedPermissionPolicyDraft.value,
        savedMenuRegistryDraft.value,
      ].filter((item) => item?.status === "published").length,
    };
  });

  const savedDraftSummaries = computed<DraftSummary[]>(() => {
    return [
      savedWorkspaceDraft.value
        ? {
            id: "workspace",
            title: savedWorkspaceDraft.value.name,
            detail: `${savedWorkspaceDraft.value.environment} · ${savedWorkspaceDraft.value.region}`,
            routeName: "workspaces",
            icon: "lucide:layers-3",
            updatedAt: savedWorkspaceDraft.value.updatedAt,
            status: savedWorkspaceDraft.value.status,
          }
        : null,
      savedFeatureRolloutDraft.value
        ? {
            id: "feature-rollout",
            title: savedFeatureRolloutDraft.value.label,
            detail: `${savedFeatureRolloutDraft.value.mode} rollout`,
            routeName: "feature-matrix",
            icon: "lucide:spline-pointer",
            updatedAt: savedFeatureRolloutDraft.value.updatedAt,
            status: savedFeatureRolloutDraft.value.status,
          }
        : null,
      savedPermissionPolicyDraft.value
        ? {
            id: "permission-policy",
            title: savedPermissionPolicyDraft.value.name,
            detail: `${savedPermissionPolicyDraft.value.targetRisk} risk policy`,
            routeName: "permissions",
            icon: "lucide:key-round",
            updatedAt: savedPermissionPolicyDraft.value.updatedAt,
            status: savedPermissionPolicyDraft.value.status,
          }
        : null,
      savedMenuRegistryDraft.value
        ? {
            id: "menu-registry",
            title: savedMenuRegistryDraft.value.label,
            detail: `${savedMenuRegistryDraft.value.visibility} visibility`,
            routeName: "menus",
            icon: "lucide:panel-left-open",
            updatedAt: savedMenuRegistryDraft.value.updatedAt,
            status: savedMenuRegistryDraft.value.status,
          }
        : null,
    ].filter((item): item is DraftSummary => Boolean(item));
  });

  return {
    clearDraft,
    clearDraftCompletely,
    featureRolloutDraft,
    menuRegistryDraft,
    permissionPolicyDraft,
    resetEditableDraft,
    savedDraftCount,
    savedDraftSummaries,
    savedFeatureRolloutDraft,
    savedMenuRegistryDraft,
    savedPermissionPolicyDraft,
    savedWorkspaceDraft,
    saveFeatureRolloutDraft,
    saveMenuRegistryDraft,
    savePermissionPolicyDraft,
    saveWorkspaceDraft,
    statusCounts,
    updateDraftStatus,
    workspaceDraft,
  };
});
