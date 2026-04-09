export type TrendPoint = {
  month: string;
  workspaceGrowth: number;
  auditEvents: number;
};

export type ActivityItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  type: "tenant" | "security" | "system" | "approval";
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
  team: string;
  role: string;
  status: "Active" | "Invited" | "Suspended";
};

export type RoleRecord = {
  id: string;
  name: string;
  scope: string;
  members: number;
  permissions: string;
};

export type TenantRecord = {
  id: string;
  name: string;
  plan: string;
  region: string;
  members: number;
  status: "Healthy" | "Attention";
  capabilities: Record<
    import("@/lib/access").TenantFeatureKey,
    import("@/lib/access").TenantFeatureStatus
  >;
};

export type WorkspaceRecord = {
  id: string;
  tenantId: string;
  name: string;
  environment: "Production" | "Staging" | "Sandbox";
  members: number;
  region: string;
};

export type AuditRecord = {
  id: string;
  actor: string;
  action: string;
  scope: string;
  result: "Success" | "Review" | "Blocked";
  time: string;
};

export type SavedViewRecord = {
  id: string;
  label: string;
  description: string;
};

export type PermissionRecord = {
  id: string;
  area: string;
  action: string;
  resource: string;
  roles: string[];
  risk: "Low" | "Medium" | "High";
};

export type MenuRecord = {
  id: string;
  label: string;
  group: string;
  routeName: string;
  icon: string;
  visibility: "Visible" | "Feature-gated" | "Role-gated";
};

export const dashboardMetrics = [
  {
    id: "tenants",
    icon: "lucide:building-2",
    labelKey: "dashboard.metrics.tenants",
    value: "128",
    delta: "+18% YoY",
  },
  {
    id: "users",
    icon: "lucide:users-round",
    labelKey: "dashboard.metrics.users",
    value: "42.8K",
    delta: "+9.4% this month",
  },
  {
    id: "approvals",
    icon: "lucide:shield-check",
    labelKey: "dashboard.metrics.approvals",
    value: "356",
    delta: "24 pending review",
  },
  {
    id: "uptime",
    icon: "lucide:activity",
    labelKey: "dashboard.metrics.uptime",
    value: "99.98%",
    delta: "SLA green across regions",
  },
] as const;

export const trendData: TrendPoint[] = [
  { month: "Jan", workspaceGrowth: 128, auditEvents: 76 },
  { month: "Feb", workspaceGrowth: 156, auditEvents: 84 },
  { month: "Mar", workspaceGrowth: 174, auditEvents: 97 },
  { month: "Apr", workspaceGrowth: 188, auditEvents: 112 },
  { month: "May", workspaceGrowth: 214, auditEvents: 134 },
  { month: "Jun", workspaceGrowth: 246, auditEvents: 126 },
  { month: "Jul", workspaceGrowth: 268, auditEvents: 141 },
  { month: "Aug", workspaceGrowth: 292, auditEvents: 153 },
  { month: "Sep", workspaceGrowth: 326, auditEvents: 149 },
  { month: "Oct", workspaceGrowth: 344, auditEvents: 167 },
  { month: "Nov", workspaceGrowth: 368, auditEvents: 172 },
  { month: "Dec", workspaceGrowth: 402, auditEvents: 190 },
];

export const activityFeed: ActivityItem[] = [
  {
    id: "act-1",
    title: "New tenant capability pack enabled",
    description: "Violet Labs unlocked workflow, webhooks and audit exports.",
    time: "5 minutes ago",
    type: "tenant",
  },
  {
    id: "act-2",
    title: "Security review completed",
    description: "Platform admin approved an elevated role binding request.",
    time: "21 minutes ago",
    type: "security",
  },
  {
    id: "act-3",
    title: "Cross-region sync stabilized",
    description: "Background replication queue returned to nominal latency.",
    time: "43 minutes ago",
    type: "system",
  },
  {
    id: "act-4",
    title: "Approval workflow updated",
    description: "Finance workspace now requires dual approval for exports.",
    time: "1 hour ago",
    type: "approval",
  },
];

export const users: UserRecord[] = [
  {
    id: "USR-1001",
    name: "Maya Chen",
    email: "maya@violetlabs.io",
    team: "Platform",
    role: "Platform Admin",
    status: "Active",
  },
  {
    id: "USR-1002",
    name: "Luca Park",
    email: "luca@northlane.co",
    team: "Security",
    role: "Security Analyst",
    status: "Active",
  },
  {
    id: "USR-1003",
    name: "Isla Morgan",
    email: "isla@neonmesh.com",
    team: "Finance Ops",
    role: "Approver",
    status: "Invited",
  },
  {
    id: "USR-1004",
    name: "Noah Patel",
    email: "noah@orbitshift.ai",
    team: "Tenant Success",
    role: "Workspace Admin",
    status: "Suspended",
  },
  {
    id: "USR-1005",
    name: "Ava Reed",
    email: "ava@violetlabs.io",
    team: "Product Ops",
    role: "Analyst",
    status: "Active",
  },
];

export const roles: RoleRecord[] = [
  {
    id: "ROL-01",
    name: "Platform Admin",
    scope: "Global",
    members: 8,
    permissions: "All modules, tenant switching, audit actions",
  },
  {
    id: "ROL-02",
    name: "Security Analyst",
    scope: "Global",
    members: 14,
    permissions: "Audit center, access logs, policy review",
  },
  {
    id: "ROL-03",
    name: "Workspace Admin",
    scope: "Tenant",
    members: 36,
    permissions: "Members, settings, billing-safe ops",
  },
  {
    id: "ROL-04",
    name: "Approver",
    scope: "Workflow",
    members: 58,
    permissions: "Approval inbox, sign-off, export review",
  },
];

export const tenants: TenantRecord[] = [
  {
    id: "TEN-001",
    name: "Violet Labs",
    plan: "Enterprise Plus",
    region: "Singapore",
    members: 128,
    status: "Healthy",
    capabilities: {
      multiTenantRouting: "enabled",
      workspaceSwitching: "enabled",
      workflowApprovals: "enabled",
      webhookDelivery: "enabled",
      auditExports: "enabled",
      directorySync: "pilot",
    },
  },
  {
    id: "TEN-002",
    name: "Northlane Capital",
    plan: "Enterprise",
    region: "Frankfurt",
    members: 86,
    status: "Attention",
    capabilities: {
      multiTenantRouting: "enabled",
      workspaceSwitching: "enabled",
      workflowApprovals: "pilot",
      webhookDelivery: "enabled",
      auditExports: "enabled",
      directorySync: "planned",
    },
  },
  {
    id: "TEN-003",
    name: "Orbit Shift",
    plan: "Scale",
    region: "Virginia",
    members: 54,
    status: "Healthy",
    capabilities: {
      multiTenantRouting: "enabled",
      workspaceSwitching: "pilot",
      workflowApprovals: "planned",
      webhookDelivery: "pilot",
      auditExports: "pilot",
      directorySync: "disabled",
    },
  },
  {
    id: "TEN-004",
    name: "Neon Mesh",
    plan: "Enterprise",
    region: "Tokyo",
    members: 102,
    status: "Healthy",
    capabilities: {
      multiTenantRouting: "enabled",
      workspaceSwitching: "enabled",
      workflowApprovals: "enabled",
      webhookDelivery: "pilot",
      auditExports: "enabled",
      directorySync: "planned",
    },
  },
];

export const workspaces: WorkspaceRecord[] = [
  {
    id: "WS-001",
    tenantId: "TEN-001",
    name: "Core Platform",
    environment: "Production",
    members: 42,
    region: "Singapore",
  },
  {
    id: "WS-002",
    tenantId: "TEN-001",
    name: "Approvals Pilot",
    environment: "Staging",
    members: 18,
    region: "Singapore",
  },
  {
    id: "WS-003",
    tenantId: "TEN-002",
    name: "Capital Ops",
    environment: "Production",
    members: 26,
    region: "Frankfurt",
  },
  {
    id: "WS-004",
    tenantId: "TEN-002",
    name: "Security Lab",
    environment: "Sandbox",
    members: 12,
    region: "Frankfurt",
  },
  {
    id: "WS-005",
    tenantId: "TEN-003",
    name: "Growth Console",
    environment: "Production",
    members: 21,
    region: "Virginia",
  },
  {
    id: "WS-006",
    tenantId: "TEN-004",
    name: "Tokyo Hub",
    environment: "Production",
    members: 37,
    region: "Tokyo",
  },
];

export const auditLogs: AuditRecord[] = [
  {
    id: "AUD-9132",
    actor: "Maya Chen",
    action: "Updated tenant feature matrix",
    scope: "Violet Labs",
    result: "Success",
    time: "2026-04-09 09:42",
  },
  {
    id: "AUD-9131",
    actor: "Luca Park",
    action: "Revoked compromised session",
    scope: "Northlane Capital",
    result: "Success",
    time: "2026-04-09 09:18",
  },
  {
    id: "AUD-9129",
    actor: "System",
    action: "Scheduled audit bundle export",
    scope: "Global",
    result: "Review",
    time: "2026-04-09 08:55",
  },
  {
    id: "AUD-9124",
    actor: "Ava Reed",
    action: "Attempted policy override",
    scope: "Orbit Shift",
    result: "Blocked",
    time: "2026-04-09 08:14",
  },
  {
    id: "AUD-9117",
    actor: "Noah Patel",
    action: "Provisioned workspace role set",
    scope: "Neon Mesh",
    result: "Success",
    time: "2026-04-09 07:51",
  },
];

export const notificationItems = [
  "2 approval chains need reassignment",
  "Audit export package is ready to download",
  "One tenant is nearing feature quota",
] as const;

export const savedViews: Record<"users" | "tenants" | "logs", SavedViewRecord[]> = {
  users: [
    {
      id: "security-core",
      label: "Security Core",
      description: "Focus on platform and security operators only.",
    },
    {
      id: "pending-invites",
      label: "Pending Invites",
      description: "Surface users still waiting to join managed workspaces.",
    },
  ],
  tenants: [
    {
      id: "enterprise-only",
      label: "Enterprise Only",
      description: "Filter on higher-tier tenants with governance-heavy capability packs.",
    },
    {
      id: "needs-attention",
      label: "Needs Attention",
      description: "Highlight tenants that should be reviewed by platform ops.",
    },
  ],
  logs: [
    {
      id: "blocked-actions",
      label: "Blocked Actions",
      description: "A fast view into denied or prevented operations.",
    },
    {
      id: "high-risk",
      label: "High-Risk Scope",
      description: "Sensitive tenant-wide actions and global overrides only.",
    },
  ],
};

export const workspaceViews: SavedViewRecord[] = [
  {
    id: "production-only",
    label: "Production Only",
    description: "Focus on high-impact workspaces with live operator traffic.",
  },
  {
    id: "pilot-zones",
    label: "Pilot Zones",
    description: "Surface workspaces where new capability packs are being trialed.",
  },
];

export const permissionViews: SavedViewRecord[] = [
  {
    id: "high-risk",
    label: "High Risk",
    description: "Sensitive permission points that deserve explicit review.",
  },
  {
    id: "role-gaps",
    label: "Role Coverage",
    description: "Find ability records that are narrow or currently under-assigned.",
  },
];

export const menuViews: SavedViewRecord[] = [
  {
    id: "feature-gated",
    label: "Feature Gated",
    description: "Menus that only appear for tenants with certain capability packs.",
  },
  {
    id: "role-gated",
    label: "Role Gated",
    description: "Menus hidden from narrower operators by default.",
  },
];

export const permissions: PermissionRecord[] = [
  {
    id: "PERM-001",
    area: "Identity",
    action: "manage",
    resource: "users",
    roles: ["Platform Admin", "Workspace Admin"],
    risk: "Medium",
  },
  {
    id: "PERM-002",
    area: "Governance",
    action: "manage",
    resource: "tenants",
    roles: ["Platform Admin"],
    risk: "High",
  },
  {
    id: "PERM-003",
    area: "Governance",
    action: "export",
    resource: "logs",
    roles: ["Platform Admin", "Security Analyst"],
    risk: "High",
  },
  {
    id: "PERM-004",
    area: "Configuration",
    action: "configure",
    resource: "settings",
    roles: ["Platform Admin", "Workspace Admin"],
    risk: "Medium",
  },
  {
    id: "PERM-005",
    area: "Navigation",
    action: "manage",
    resource: "menus",
    roles: ["Platform Admin"],
    risk: "Medium",
  },
  {
    id: "PERM-006",
    area: "Feature Control",
    action: "configure",
    resource: "featureMatrix",
    roles: ["Platform Admin"],
    risk: "High",
  },
];

export const menus: MenuRecord[] = [
  {
    id: "MENU-001",
    label: "Executive Dashboard",
    group: "Workspace",
    routeName: "dashboard",
    icon: "lucide:layout-dashboard",
    visibility: "Visible",
  },
  {
    id: "MENU-002",
    label: "Workspaces",
    group: "Governance",
    routeName: "workspaces",
    icon: "lucide:layers-3",
    visibility: "Feature-gated",
  },
  {
    id: "MENU-003",
    label: "Feature Matrix",
    group: "Governance",
    routeName: "feature-matrix",
    icon: "lucide:spline-pointer",
    visibility: "Feature-gated",
  },
  {
    id: "MENU-004",
    label: "Permissions",
    group: "Platform",
    routeName: "permissions",
    icon: "lucide:key-round",
    visibility: "Role-gated",
  },
  {
    id: "MENU-005",
    label: "Menu Registry",
    group: "Platform",
    routeName: "menus",
    icon: "lucide:panel-left-open",
    visibility: "Role-gated",
  },
];

export const tenantCapabilities = [
  { key: "multiTenantRouting", name: "Multi-tenant routing", status: "Enabled" },
  { key: "workflowApprovals", name: "Workflow approvals", status: "Pilot" },
  { key: "webhookDelivery", name: "Webhook delivery", status: "Enabled" },
  { key: "directorySync", name: "Directory sync", status: "Planned" },
] as const;
