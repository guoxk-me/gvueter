import type { NavigationMenuNode } from '@/features/navigation'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'

function getVisibleMenus(menus: NavigationMenuNode[]): NavigationMenuNode[] {
  return (
    menus
      .filter((menuNode) => !menuNode.hidden)
      .map((menuNode) => ({
        ...menuNode,
        children: getVisibleMenus(menuNode.children),
      }))
      // AI modified: honor backend order defensively at every nesting level.
      .sort((leftMenu, rightMenu) => leftMenu.order - rightMenu.order)
  )
}

function getMenuLeaves(menus: NavigationMenuNode[]): NavigationMenuNode[] {
  return menus.flatMap((menuNode) => [
    ...(menuNode.to || menuNode.href ? [menuNode] : []),
    ...getMenuLeaves(menuNode.children),
  ])
}

export const useMenuStore = defineStore('menu', () => {
  const menus = ref<NavigationMenuNode[]>([])

  const visibleMenus = computed(() => getVisibleMenus(menus.value))
  const visibleMenuLeaves = computed(() => getMenuLeaves(visibleMenus.value))

  function replaceMenus(availableMenus: NavigationMenuNode[]): void {
    // AI modified: replace the full tree atomically so layouts never render a partially loaded hierarchy.
    menus.value = availableMenus
  }

  function clearMenus(): void {
    menus.value = []
  }

  return {
    menus,
    visibleMenus,
    visibleMenuLeaves,
    replaceMenus,
    clearMenus,
  }
})
