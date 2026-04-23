# CASL 权限系统集成说明

## 改动概览

本次改动为项目引入了基于 CASL 的细粒度权限控制系统，覆盖权限定义、响应式同步、路由守卫和单元测试四个层面。

---

## 新增文件

### `src/lib/ability.ts`

**改动内容：**

- 定义了 `AppSubject`（权限对象：`Dashboard`、`User`、`Content`、`Settings`、`all`）和 `AppAction`（权限动作：`manage`、`read`、`create`、`update`、`delete`）两个类型
- 实现了 `defineAbilityFor(user)` 函数，根据用户角色返回对应的权限规则集
- 导出了全局单例 `appAbility`（整个应用共享同一个 Ability 实例）
- 导出了 `updateAbility(user)` 函数，用于登录/登出时原地更新单例的规则

**权限矩阵：**

| 能力                     | admin | editor | viewer |
| ------------------------ | ----- | ------ | ------ |
| 管理一切（`manage all`） | ✅    | —      | —      |
| 读取 Dashboard           | ✅    | ✅     | ✅     |
| 读取 Content             | ✅    | ✅     | ✅     |
| 创建/修改 Content        | ✅    | ✅     | —      |
| 删除 Content             | ✅    | —      | —      |
| 读取 User                | ✅    | ✅     | —      |
| 管理 User / Settings     | ✅    | —      | —      |

**为什么这样做：**
选择将权限规则集中在一个文件里，而不是散落在各个组件或路由中，方便后续统一维护。`defineAbilityFor` 是纯函数，便于单元测试。单例 `appAbility` 用 `ability.update(rules)` 原地更新，是 CASL 官方推荐的响应式模式——Vue 的响应式系统能感知到 `update` 操作，从而触发组件重渲染。

---

### `src/router/types.ts`

**改动内容：**

- 通过 TypeScript 模块扩展（`declare module 'vue-router'`）为 `RouteMeta` 补充了 `requiredAbility?: [AppAction, AppSubject]` 字段

**为什么这样做：**
Vue Router 的 `meta` 默认类型为 `Record<string, any>`，没有类型约束。扩展之后，路由文件中写 `requiredAbility` 时会有类型检查和 IDE 自动补全，避免拼写错误。

---

### `src/__tests__/ability.spec.ts`

**改动内容：**

- 新增 20 个测试用例，覆盖：
  - 未登录状态（无权限）
  - `admin` 角色的全部权限
  - `editor` 角色的正向/反向权限（可以做什么、不可以做什么）
  - `viewer` 角色的只读限制
  - `updateAbility` 单例：登录后权限生效、登出后权限清除

**为什么这样做：**
权限逻辑是业务安全的核心，必须有测试兜底。纯函数 `defineAbilityFor` 天然易测，无需 mock 任何依赖。对单例 `appAbility` 的测试则验证了登录/登出的完整生命周期。

---

## 修改文件

### `src/stores/auth.ts`

**改动内容：**

- 移除了之前存储在 store 内部的 `ability` ref（冗余设计）
- 改为用 `watch(user, (newUser) => updateAbility(newUser), { immediate: true })` 监听用户变化，自动同步全局单例

**为什么这样做：**
之前的设计在 store 里维护了一个独立的 `ability` ref，和全局单例是两个对象，会导致组件通过 `useAbility()` 拿到的实例与 store 里的不一致。改为统一更新全局单例后，所有消费方（组件、路由守卫）都读同一个对象，状态不会分叉。

---

### `src/main.ts`

**改动内容：**

- 引入 `@casl/vue` 的 `abilitiesPlugin`
- 在 `app.use(abilitiesPlugin, appAbility)` 注册插件，将全局单例注入 Vue 应用

**为什么这样做：**
注册插件后，所有组件可以直接调用 `useAbility()` 获取权限实例，也可以使用模板中的 `$can()` 语法糖，无需每个组件手动导入 `appAbility`。

---

### `src/router/index.ts`

**改动内容：**

- `beforeEach` 守卫新增了对 `requiredAbility` 的检查：找到当前路由链中最精确的一条带有 `requiredAbility` 的记录，调用 `appAbility.can(action, subject)` 验证
- 无权限时：已登录则跳回 `/dashboard`，未登录则跳到登录页

**为什么这样做：**
仅凭 `requiresAuth` 只能区分"是否登录"，无法区分"有没有权限访问这个页面"。加入 `requiredAbility` 检查后，不同角色即使都已登录，也只能访问自己权限范围内的页面，实现真正的多角色隔离。

---

### `src/router/routes/admin.ts`

**改动内容：**

- Dashboard 路由新增 `requiredAbility: ['read', 'Dashboard']` 元信息

**为什么这样做：**
这是路由级权限声明的示例，后续新增页面（用户管理、内容管理、系统设置等）按同样模式声明对应的 `requiredAbility`，路由守卫会自动拦截越权访问，无需在每个页面组件内重复判断。

---

## 整体设计思路

```
用户登录
   │
   ▼
auth store 的 watch 触发
   │
   ▼
updateAbility(user) → appAbility.update(rules)
   │
   ├─► Vue 组件响应式更新（useAbility / $can）
   └─► 路由守卫读取最新 appAbility 做拦截判断
```

CASL 的核心设计哲学是"描述用户**能做什么**，而不是描述用户**是什么角色**"。虽然本次实现是基于角色分配规则，但权限检查的调用方（组件、路由）全部使用 `can('read', 'Dashboard')` 这样的语义，与角色名解耦，未来如果需要更细粒度的控制（比如某个编辑只能修改自己创建的内容），只需修改 `defineAbilityFor` 中的规则，调用方代码无需改动。

---

## 组件中的用法示例

```vue
<script setup>
import { useAbility } from '@casl/vue'

const { can } = useAbility()
</script>

<template>
  <!-- 只有 editor 和 admin 能看到"新建"按钮 -->
  <button v-if="can('create', 'Content')">新建文章</button>

  <!-- 只有 admin 能看到设置入口 -->
  <nav-item v-if="can('read', 'Settings')" to="/settings">系统设置</nav-item>
</template>
```
