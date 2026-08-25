# CASL 权限与数据范围

CASL 是浏览器端的体验层权限模型。路由、菜单、`PermissionGate` 和按钮隐藏都不能替代后端鉴权；MSW handler 会再次验证 token、能力和数据范围，用于演示真实接口边界。

## 契约

```ts
type PermissionAction = 'read' | 'create' | 'update' | 'delete'
type PermissionSubject
  = | 'Dashboard'
    | 'User'
    | 'Content'
    | 'Analytics'
    | 'Settings'
    | 'RolePolicy'
    | 'Monitoring'
    | 'AuditLog'

interface RolePermission {
  action: PermissionAction
  subject: PermissionSubject
}

interface AuthorizationGrant extends RolePermission {
  permissionIdentifier: string
}

interface AuthorizationSnapshot {
  contractVersion: 1
  policyVersion: string
  grants: AuthorizationGrant[]
  dataScope: DataScopeGrant
}

type DataScope
  = | { scope: 'all' }
    | { scope: 'departmentTree' }
    | { scope: 'department' }
    | { scope: 'self' }
    | { scope: 'custom', departmentIds: string[] }
```

`/auth/login`、SSO exchange 与 `/auth/me` 必须原子返回后端选定的 `tenantId`、用户和 `AuthorizationSnapshot`。客户端提交的 tenant 只是选择提示，不能建立成员关系；`src/lib/ability.ts` 只把后端快照投影为单例 `appAbility`，不会再根据用户对象上的展示角色读取本地策略；缺少或不符合契约的快照按无权限处理。`src/features/roles/role-policy.ts` 只为 MSW 模拟服务端策略，数据范围投影位于 `src/features/roles/data-scope.ts`。

## 默认角色

| 能力                       | admin  | editor | viewer |
| -------------------------- | ------ | ------ | ------ |
| Dashboard / Analytics 读取 | 全部   | 允许   | 允许   |
| Content 读取               | 允许   | 允许   | 允许   |
| Content 创建、更新         | 允许   | 允许   | 拒绝   |
| User 读取                  | 全租户 | 部门树 | 拒绝   |
| Settings 读取/写入         | 允许   | 拒绝   | 拒绝   |
| RolePolicy 读取/写入       | 允许   | 拒绝   | 拒绝   |
| Monitoring 读取            | 允许   | 允许   | 允许   |
| Monitoring 操作            | 允许   | 拒绝   | 拒绝   |
| AuditLog 读取              | 允许   | 允许   | 拒绝   |

超级管理员默认拥有所有 subject 的四种显式动作和全部数据范围；模板不依赖难以审计的隐式 `manage all`。普通 `editor` / `viewer` 使用更窄的显式授权和数据范围，角色卡与执行层预览会直接展示差异。

## 三层执行

1. 动态导航编译器根据 `requiredAbility` 隐藏无权菜单，并记录被拒路径。
2. Vue Router 守卫在直接访问时检查路由 meta；无权账号进入 `/forbidden`。
3. API/MSW handler 使用 `authorizeMockPermission` 再次鉴权；用户列表在搜索和分页前应用服务端数据范围。角色策略使用独立 `RolePolicy` subject，避免把普通系统设置权限误当成角色授权权限。

## 五类示例与刷新闭环

| 权限层   | 模板中的真实示例                                                     | 最终执行方                                |
| -------- | -------------------------------------------------------------------- | ----------------------------------------- |
| 路由     | 动态路由 `meta.requiredAbility` 与直达 `/forbidden`                  | Router 仅做前端拦截，服务端仍校验页面请求 |
| 菜单     | `resolveBackendNavigation` 过滤无权分支并记录拒绝路径                | 后端返回菜单契约，前端负责可发现性        |
| 按钮     | 用户、内容、系统参数页面通过 `canAccess` / `PermissionGate` 控制操作 | 对应写接口再次鉴权                        |
| 字段     | 用户邮箱在无 `update User` 时脱敏，角色分配需要 `update RolePolicy`  | 服务端响应负责敏感字段裁剪或脱敏          |
| 数据范围 | `self`、部门、部门树、自定义部门、全部数据                           | 用户列表 handler 在搜索和分页前应用范围   |

权限矩阵支持只读、逐项编辑和“全部授予 / 全部清除”批量设置。保存的角色正好是当前登录角色时，客户端先重新读取 `/auth/me` 的新 `policyVersion` 与 grants，再更新 CASL、卸载并重装菜单/动态路由、清理不可用 Tab；若当前页面权限已被撤销则立即进入 `/forbidden`。角色保存响应本身不能直接给当前浏览器提权。

## 前后端不一致

前端能力来自最近一次后端授权快照，网络延迟或多端修改可能造成短暂不一致。`policyVersion` 变化会触发主体边界清理，避免复用旧菜单、查询缓存和 Tab。接口响应始终是最终结果：`401` 进入统一会话恢复/登录边界，`403` 保留业务上下文并显示服务端拒绝原因，`409` 显示策略冲突原因；客户端不会因按钮曾经可见而把失败当作成功。反方向上，即使前端隐藏了入口，生产后端也不能因此省略授权。

```vue
<PermissionGate action="update" subject="Settings">
  <Button>保存配置</Button>
</PermissionGate>
```

生产后端必须从已认证主体推导角色、租户与数据范围，不能信任客户端提交的角色名、CASL rules、部门 ID 或隐藏状态。按钮隐藏不等于权限控制。
