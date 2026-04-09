export default {
  app: {
    name: "GVueter Full Admin",
    description:
      "A premium multi-tenant control center for operations, identity and tenant governance.",
  },
  common: {
    search: "Search routes, users, tenants...",
    open: "Open",
    save: "Save changes",
    cancel: "Cancel",
    dashboard: "Dashboard",
    status: "Status",
    active: "Active",
    workspace: "Workspace",
    locale: "Language",
    tenant: "Tenant",
    profile: "Profile",
    signOut: "Sign out",
  },
  auth: {
    welcome: "Everything your enterprise admin needs, in one system.",
    title: "Sign in to the full workspace",
    subtitle:
      "Switch across tenants, govern access, review audit trails and keep your control surface beautiful.",
    email: "Work email",
    password: "Password",
    signIn: "Enter admin console",
    quickStart: "Quick access",
    demoHint: "Use one of the seeded personas for instant preview.",
  },
  nav: {
    workspace: "Workspace",
    governance: "Governance",
    platform: "Platform",
    dashboard: "Executive Dashboard",
    users: "Users",
    roles: "Roles",
    tenants: "Tenants",
    workspaces: "Workspaces",
    featureMatrix: "Feature Matrix",
    settings: "Settings",
    permissions: "Permissions",
    menus: "Menu Registry",
    logs: "Audit Center",
    profile: "Profile",
  },
  dashboard: {
    title: "Executive Dashboard",
    description: "Keep tenant growth, audit intensity and platform reliability within reach.",
    highlight: "Premium full edition",
    trendTitle: "Tenant growth vs audit activity",
    trendDescription: "Twelve-month signal combining workspace expansion and governance traffic.",
    activityTitle: "Operations pulse",
    tenantTitle: "Tenant capabilities",
    metrics: {
      tenants: "Managed tenants",
      users: "Identity footprint",
      approvals: "Approval events",
      uptime: "Platform uptime",
    },
  },
  pages: {
    users: {
      title: "Users",
      description: "Monitor identities, assign role scopes and keep workspace membership clean.",
    },
    roles: {
      title: "Roles",
      description: "Shape your permission model with clear scopes and reusable policies.",
    },
    tenants: {
      title: "Tenants",
      description:
        "Operate a full multi-tenant product with room for workspace-level customization.",
    },
    workspaces: {
      title: "Workspaces",
      description: "Manage environment-specific operator zones inside each tenant.",
    },
    featureMatrix: {
      title: "Feature Matrix",
      description: "Control which tenant capability packs are enabled, piloted or planned.",
    },
    settings: {
      title: "Settings",
      description: "Control the appearance, defaults and governance posture of the full edition.",
    },
    permissions: {
      title: "Permissions",
      description:
        "Inspect ability coverage, risk level and role assignment for governance-critical actions.",
    },
    menus: {
      title: "Menu Registry",
      description:
        "Review route-to-menu bindings and understand which entries are feature or role gated.",
    },
    logs: {
      title: "Audit Center",
      description: "Track access-sensitive actions with before/after friendly visibility.",
    },
    profile: {
      title: "Profile",
      description: "Personal identity, working preferences and operator habits in one place.",
    },
    forbidden: {
      title: "Access forbidden",
      description: "Your current role does not include this capability.",
    },
    notFound: {
      title: "Page not found",
      description: "The route may be disabled by feature flags or simply not exist yet.",
    },
  },
  topbar: {
    theme: "Theme studio",
    notifications: "Notifications",
    switchTenant: "Switch tenant",
    switchWorkspace: "Switch workspace",
  },
  permissions: {
    allowed: "Allowed",
    restricted: "Restricted",
    noRouteAccess: "This role cannot open the selected route in the current tenant context.",
  },
};
