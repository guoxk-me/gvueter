import type { ManagedMenuRecord } from './types'

export interface ManagedMenuRow extends ManagedMenuRecord {
  depth: number
}

export interface ManagedMenuOrderPreview {
  previousMenu?: ManagedMenuRecord
  nextMenu?: ManagedMenuRecord
  position: number
  siblingCount: number
  hasOrderConflict: boolean
}

export function canManagedMenuHaveChildren(menu: ManagedMenuRecord): boolean {
  // AI modified: destination nodes cannot become parents because runtime routes are registered only for leaves.
  return menu.kind === 'menu' && !menu.path.trim() && !menu.routeName.trim() && !menu.componentKey
}

export function getManagedMenuAncestors(
  menus: readonly ManagedMenuRecord[],
  parentId: string | null,
): ManagedMenuRecord[] {
  const menusById = new Map<string, ManagedMenuRecord>()
  for (const menu of menus) {
    if (!menusById.has(menu.id))
      menusById.set(menu.id, menu)
  }

  const ancestors: ManagedMenuRecord[] = []
  const visitedMenuIds = new Set<string>()
  let currentParentId = parentId
  while (currentParentId && !visitedMenuIds.has(currentParentId)) {
    visitedMenuIds.add(currentParentId)
    const parentMenu = menusById.get(currentParentId)
    if (!parentMenu)
      break
    ancestors.unshift(parentMenu)
    currentParentId = parentMenu.parentId
  }
  return ancestors
}

export function getManagedMenuOrderPreview(
  menus: readonly ManagedMenuRecord[],
  menuId: string | undefined,
  parentId: string | null,
  order: number,
): ManagedMenuOrderPreview {
  const siblings = menus
    .filter(menu => menu.parentId === parentId && menu.id !== menuId)
    .sort(
      (leftMenu, rightMenu) =>
        leftMenu.order - rightMenu.order || leftMenu.id.localeCompare(rightMenu.id),
    )
  const insertionIndex = siblings.findIndex(menu => menu.order > order)
  const positionIndex = insertionIndex === -1 ? siblings.length : insertionIndex

  return {
    previousMenu: siblings[positionIndex - 1],
    nextMenu: siblings[positionIndex],
    position: positionIndex + 1,
    siblingCount: siblings.length + 1,
    hasOrderConflict: siblings.some(menu => menu.order === order),
  }
}

export function getManagedMenuRows(menus: readonly ManagedMenuRecord[]): ManagedMenuRow[] {
  const menusByParent = new Map<string | null, ManagedMenuRecord[]>()
  const menuIds = new Set(menus.map(menu => menu.id))
  for (const menu of menus) {
    const parentId = menu.parentId && menuIds.has(menu.parentId) ? menu.parentId : null
    const siblings = menusByParent.get(parentId) ?? []
    siblings.push(menu)
    menusByParent.set(parentId, siblings)
  }
  for (const siblings of menusByParent.values())
    siblings.sort((leftMenu, rightMenu) => leftMenu.order - rightMenu.order)

  const rows: ManagedMenuRow[] = []
  const visitedMenuIds = new Set<string>()
  function visitMenu(menu: ManagedMenuRecord, depth: number): void {
    if (visitedMenuIds.has(menu.id))
      return
    visitedMenuIds.add(menu.id)
    rows.push({ ...menu, depth })
    for (const childMenu of menusByParent.get(menu.id) ?? []) visitMenu(childMenu, depth + 1)
  }

  for (const rootMenu of menusByParent.get(null) ?? []) visitMenu(rootMenu, 0)
  // AI modified: surface cyclic backend records instead of silently dropping them from administration.
  for (const menu of menus) {
    if (!visitedMenuIds.has(menu.id))
      visitMenu(menu, 0)
  }

  return rows
}

export function getManagedMenuDescendantIds(
  menus: readonly ManagedMenuRecord[],
  menuId: string,
): Set<string> {
  const descendantIds = new Set<string>()
  const pendingMenuIds = [menuId]
  while (pendingMenuIds.length) {
    const parentId = pendingMenuIds.pop()
    for (const menu of menus) {
      if (menu.parentId === parentId && !descendantIds.has(menu.id)) {
        descendantIds.add(menu.id)
        pendingMenuIds.push(menu.id)
      }
    }
  }
  return descendantIds
}
