import type { RouteLocationRaw, RouteRecordRaw } from "vue-router";

export type NavigationItem = {
  name: string;
  titleKey: string;
  icon: string;
  to: RouteLocationRaw;
  requiredAbilities?: import("@/lib/access").Ability[];
  requiredFeatures?: import("@/lib/access").TenantFeatureKey[];
};

export type NavigationGroup = {
  id: string;
  titleKey: string;
  items: NavigationItem[];
};

const AppLayout = () => import("@/layouts/AppLayout.vue");
const AuthLayout = () => import("@/layouts/AuthLayout.vue");
const BlankLayout = () => import("@/layouts/BlankLayout.vue");

export const navigationGroups: NavigationGroup[] = [
  {
    id: "workspace",
    titleKey: "nav.workspace",
    items: [
      {
        name: "dashboard",
        titleKey: "nav.dashboard",
        icon: "lucide:layout-dashboard",
        to: { name: "dashboard" },
        requiredAbilities: [{ action: "view", resource: "dashboard" }],
      },
      {
        name: "users",
        titleKey: "nav.users",
        icon: "lucide:users-round",
        to: { name: "users" },
        requiredAbilities: [{ action: "view", resource: "users" }],
      },
      {
        name: "roles",
        titleKey: "nav.roles",
        icon: "lucide:shield-check",
        to: { name: "roles" },
        requiredAbilities: [{ action: "view", resource: "roles" }],
      },
    ],
  },
  {
    id: "governance",
    titleKey: "nav.governance",
    items: [
      {
        name: "tenants",
        titleKey: "nav.tenants",
        icon: "lucide:building-2",
        to: { name: "tenants" },
        requiredAbilities: [{ action: "view", resource: "tenants" }],
        requiredFeatures: ["multiTenantRouting"],
      },
      {
        name: "workspaces",
        titleKey: "nav.workspaces",
        icon: "lucide:layers-3",
        to: { name: "workspaces" },
        requiredAbilities: [{ action: "view", resource: "workspaces" }],
        requiredFeatures: ["workspaceSwitching"],
      },
      {
        name: "feature-matrix",
        titleKey: "nav.featureMatrix",
        icon: "lucide:spline-pointer",
        to: { name: "feature-matrix" },
        requiredAbilities: [{ action: "configure", resource: "featureMatrix" }],
        requiredFeatures: ["multiTenantRouting"],
      },
      {
        name: "logs",
        titleKey: "nav.logs",
        icon: "lucide:scan-eye",
        to: { name: "logs" },
        requiredAbilities: [{ action: "view", resource: "logs" }],
        requiredFeatures: ["auditExports"],
      },
    ],
  },
  {
    id: "platform",
    titleKey: "nav.platform",
    items: [
      {
        name: "settings",
        titleKey: "nav.settings",
        icon: "lucide:settings-2",
        to: { name: "settings" },
        requiredAbilities: [{ action: "view", resource: "settings" }],
      },
      {
        name: "permissions",
        titleKey: "nav.permissions",
        icon: "lucide:key-round",
        to: { name: "permissions" },
        requiredAbilities: [{ action: "view", resource: "permissions" }],
      },
      {
        name: "menus",
        titleKey: "nav.menus",
        icon: "lucide:panel-left-open",
        to: { name: "menus" },
        requiredAbilities: [{ action: "view", resource: "menus" }],
      },
      {
        name: "profile",
        titleKey: "nav.profile",
        icon: "lucide:user-round-cog",
        to: { name: "profile" },
        requiredAbilities: [{ action: "view", resource: "profile" }],
      },
    ],
  },
];

export const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    component: AuthLayout,
    children: [
      {
        path: "",
        name: "login",
        component: () => import("@/views/login/LoginView.vue"),
        meta: {
          publicOnly: true,
          titleKey: "auth.title",
        },
      },
    ],
  },
  {
    path: "/",
    component: AppLayout,
    meta: {
      requiresAuth: true,
    },
    children: [
      {
        path: "",
        redirect: { name: "dashboard" },
      },
      {
        path: "dashboard",
        name: "dashboard",
        component: () => import("@/views/dashboard/DashboardView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "dashboard.title",
          icon: "lucide:layout-dashboard",
          navGroup: "workspace",
          navOrder: 0,
          requiredAbilities: [{ action: "view", resource: "dashboard" }],
        },
      },
      {
        path: "users",
        name: "users",
        component: () => import("@/views/users/UsersView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.users.title",
          icon: "lucide:users-round",
          navGroup: "workspace",
          navOrder: 1,
          requiredAbilities: [{ action: "view", resource: "users" }],
        },
      },
      {
        path: "roles",
        name: "roles",
        component: () => import("@/views/roles/RolesView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.roles.title",
          icon: "lucide:shield-check",
          navGroup: "workspace",
          navOrder: 2,
          requiredAbilities: [{ action: "view", resource: "roles" }],
        },
      },
      {
        path: "tenants",
        name: "tenants",
        component: () => import("@/views/tenants/TenantsView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.tenants.title",
          icon: "lucide:building-2",
          navGroup: "governance",
          navOrder: 0,
          requiredAbilities: [{ action: "view", resource: "tenants" }],
          requiredFeatures: ["multiTenantRouting", "workspaceSwitching"],
        },
      },
      {
        path: "workspaces",
        name: "workspaces",
        component: () => import("@/views/workspaces/WorkspacesView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.workspaces.title",
          icon: "lucide:layers-3",
          navGroup: "governance",
          navOrder: 1,
          requiredAbilities: [{ action: "view", resource: "workspaces" }],
          requiredFeatures: ["workspaceSwitching"],
        },
      },
      {
        path: "feature-matrix",
        name: "feature-matrix",
        component: () => import("@/views/feature-matrix/FeatureMatrixView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.featureMatrix.title",
          icon: "lucide:spline-pointer",
          navGroup: "governance",
          navOrder: 2,
          requiredAbilities: [{ action: "configure", resource: "featureMatrix" }],
          requiredFeatures: ["multiTenantRouting"],
        },
      },
      {
        path: "settings",
        name: "settings",
        component: () => import("@/views/settings/SettingsView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.settings.title",
          icon: "lucide:settings-2",
          navGroup: "platform",
          navOrder: 0,
          requiredAbilities: [{ action: "view", resource: "settings" }],
        },
      },
      {
        path: "permissions",
        name: "permissions",
        component: () => import("@/views/permissions/PermissionsView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.permissions.title",
          icon: "lucide:key-round",
          navGroup: "platform",
          navOrder: 1,
          requiredAbilities: [{ action: "view", resource: "permissions" }],
        },
      },
      {
        path: "menus",
        name: "menus",
        component: () => import("@/views/menus/MenusView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.menus.title",
          icon: "lucide:panel-left-open",
          navGroup: "platform",
          navOrder: 2,
          requiredAbilities: [{ action: "view", resource: "menus" }],
        },
      },
      {
        path: "logs",
        name: "logs",
        component: () => import("@/views/logs/LogsView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.logs.title",
          icon: "lucide:scan-eye",
          navGroup: "governance",
          navOrder: 3,
          requiredAbilities: [{ action: "view", resource: "logs" }],
          requiredFeatures: ["auditExports"],
        },
      },
      {
        path: "profile",
        name: "profile",
        component: () => import("@/views/profile/ProfileView.vue"),
        meta: {
          requiresAuth: true,
          titleKey: "pages.profile.title",
          icon: "lucide:user-round-cog",
          navGroup: "platform",
          navOrder: 3,
          requiredAbilities: [{ action: "view", resource: "profile" }],
        },
      },
    ],
  },
  {
    path: "/403",
    component: BlankLayout,
    children: [
      {
        path: "",
        name: "forbidden",
        component: () => import("@/views/errors/ForbiddenView.vue"),
        meta: {
          titleKey: "pages.forbidden.title",
        },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    component: BlankLayout,
    children: [
      {
        path: "",
        name: "not-found",
        component: () => import("@/views/errors/NotFoundView.vue"),
        meta: {
          titleKey: "pages.notFound.title",
        },
      },
    ],
  },
];
