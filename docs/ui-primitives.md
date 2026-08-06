# UI Primitive 盘点与选型边界

`/components/primitives` 是 shadcn-vue / Reka 基础组件的权威展示入口。类型化事实源位于 `src/features/component-gallery/component-catalog.ts`，当前固定盘点 27 个已存在 primitive：

`Avatar`、`Badge`、`Breadcrumb`、`Button`、`Card`、`Chart`、`Checkbox`、`Dialog`、`DropdownMenu`、`Form`、`Input`、`Label`、`Pagination`、`Popover`、`Resizable`、`ScrollArea`、`Select`、`Separator`、`Sheet`、`Sidebar`、`Skeleton`、`Sonner`、`Switch`、`Table`、`Tabs`、`Textarea`、`Tooltip`。

页面为此前暴露不足的能力提供真实组合：

- `Breadcrumb` + `DropdownMenu`：路由层级语义与可发现的次要操作。
- `Form` + `Pagination`：标签、说明、校验、提交，以及原始分页导航；服务端分页仍由 DataTable / ProTable 契约负责。
- `Resizable` + `ScrollArea` + `Separator`：键盘可达的分栏基础、仅用于受限区域的滚动容器，以及明确的语义分隔。
- `Table`：原生表格结构和横向溢出容器；排序、选择、编辑、虚拟滚动不在 primitive 层重复实现。
- `Dialog` / `Drawer` / `Sheet`：分别用于紧凑模态任务、标准化业务详情和边缘基础设施。
- `Skeleton` + `Tooltip` + `Sonner`：`aria-busy` 所属区域保留持久状态，Tooltip 只补充已有可读名称，Sonner 只承载瞬时结果。

## Sidebar 结论

`src/components/ui/sidebar` 为上游兼容保留，但不是项目 Shell 的权威实现。其 Provider 自带固定定位、移动 Sheet、Cookie 持久化和全局快捷键；在组件中心挂载会形成第二套布局契约，因此页面只展示来源与边界，不运行嵌套 Provider。

项目唯一 Shell 责任归属于 `ConfigurableAdminLayout` + `AdminNavigation`，包括断点、多级菜单、折叠、Flyout、活动祖先和移动导航。

## 候选 primitive 业务评估

| 候选                  | 结论   | 当前原因                                         | 现有替代方案                                                            |
| --------------------- | ------ | ------------------------------------------------ | ----------------------------------------------------------------------- |
| Accordion             | 延期   | 尚无多个独立折叠区共享键盘语义的真实流程         | 简单披露使用原生 `details`；主要内容使用路由区块或 Tabs                 |
| Alert                 | 不适用 | 持久后台反馈已有业务化语气和关闭契约             | Callout；Loading / Empty / Error 使用 AsyncState                        |
| Command / Combobox    | 延期   | 全局导航、远程实体与本地枚举的搜索契约不同       | GlobalSearch、SearchableSelect、Select                                  |
| Calendar / DatePicker | 延期   | 当前日期筛选已有原生日期和类型化 DateRangePicker | DateRangePicker + locale-aware 展示格式                                 |
| Radio group           | 不适用 | 尚未出现足以支撑包装族的重复样式需求             | Form 中的带标签原生 radio；选项较多时使用 Select                        |
| Slider                | 不适用 | 后台数值要求精确值与校验                         | NumberField                                                             |
| ToggleGroup           | 不适用 | 当前没有需要 roving focus 的多切换工具栏         | 内容切换用 Tabs；单切换用带 `aria-pressed` 的 Button                    |
| ContextMenu           | 不适用 | 核心操作不能依赖右键，必须支持触控和键盘发现     | 从可见且有名称的触发器打开 DropdownMenu                                 |
| Menubar               | 不适用 | 管理后台不是桌面文档命令界面                     | 顶部/侧边导航 + DropdownMenu                                            |
| NavigationMenu        | 不适用 | 已有权限感知的动态多级导航权威契约               | AdminNavigation + AdminTopNavigation                                    |
| HoverCard             | 不适用 | 关键管理信息不能只在悬浮时显示                   | 辅助说明用 Tooltip；可操作详情用 DetailDrawer / Dialog                  |
| AlertDialog           | 不适用 | 高风险操作已有 pending 和受控关闭契约            | ConfirmAction 或后台 Dialog                                             |
| Carousel              | 不适用 | 当前后台流程不需要隐藏连续面板或营销式浏览       | 响应式卡片、表格或 WorkflowStepper                                      |
| OTP input             | 延期   | 尚无获批的 MFA / 一次性验证码服务端策略          | 契约获批前使用现有认证流程；获批后再采用 `autocomplete="one-time-code"` |

这些结论是当前业务基线，不是永久禁止。只有出现明确场景、可访问契约和维护责任时，才重新评估新增 primitive；不得为了组件数量引入依赖。

## 验证

定向验证：

```sh
vp test src/__tests__/primitive-examples.spec.ts
vp exec eslint src/features/component-gallery/primitives src/__tests__/primitive-examples.spec.ts
vp run type-check
```

测试覆盖 27 项目录完整性、14 项缺口决策、双语切换、Form 校验、分页、键盘打开 DropdownMenu、三类 overlay、Sidebar 非权威边界，以及 Skeleton / Tooltip / Sonner 组合。
