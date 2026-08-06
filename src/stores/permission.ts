import type { Router } from 'vue-router'
import type { BackendMenuResponse } from '@/features/navigation'
import { defineStore } from 'pinia'
import { ref, shallowRef } from 'vue'
import { resolveBackendNavigation } from '@/features/navigation'
import { BACKEND_MENU_RESPONSE_SCHEMA } from '@/features/navigation/navigation-api-contracts'
import { appAbility } from '@/lib/ability'
import { get } from '@/lib/http'
import { useMenuStore } from '@/stores/menu'
import { useTabsStore } from '@/stores/tabs'

interface RegisteredRoute {
  routeName: string
  removeRoute: () => void
}

export const usePermissionStore = defineStore('permission', () => {
  const menuStore = useMenuStore()
  const tabsStore = useTabsStore()
  const isReady = shallowRef(false)
  const isLoading = shallowRef(false)
  const loadError = shallowRef<string | null>(null)
  const principalKey = shallowRef<string | null>(null)
  const registeredRouteNames = ref<string[]>([])
  const deniedPaths = ref<string[]>([])
  const registeredRoutes: RegisteredRoute[] = []
  let navigationTask: Promise<boolean> | null = null
  let navigationRevision = 0

  function unloadNavigation(): void {
    navigationRevision += 1
    navigationTask = null
    isLoading.value = false
    const dynamicRouteNames = registeredRoutes.map((registeredRoute) => registeredRoute.routeName)
    for (const registeredRoute of [...registeredRoutes].reverse()) registeredRoute.removeRoute()

    registeredRoutes.splice(0)
    registeredRouteNames.value = []
    deniedPaths.value = []
    menuStore.clearMenus()
    tabsStore.removeRouteTabs(dynamicRouteNames)
    principalKey.value = null
    isReady.value = false
    loadError.value = null
  }

  function isPathDenied(path: string): boolean {
    return deniedPaths.value.includes(path)
  }

  async function loadNavigation(router: Router, authenticatedPrincipal: string): Promise<boolean> {
    if (isReady.value && principalKey.value === authenticatedPrincipal) return false

    if (navigationTask) return navigationTask

    if (principalKey.value && principalKey.value !== authenticatedPrincipal) unloadNavigation()

    isLoading.value = true
    loadError.value = null
    const loadRevision = navigationRevision
    const requestTask = get<BackendMenuResponse>('/navigation', undefined, {
      responseSchema: BACKEND_MENU_RESPONSE_SCHEMA,
    })
      .then((navigationResponse) => {
        // AI modified: ignore a late menu response after logout or principal replacement.
        if (loadRevision !== navigationRevision) return false

        const resolvedNavigation = resolveBackendNavigation(navigationResponse.menus, appAbility)
        const newlyRegisteredRoutes: RegisteredRoute[] = []

        try {
          for (const routeCandidate of resolvedNavigation.routes) {
            if (router.hasRoute(routeCandidate.routeName)) continue

            const removeRoute = router.addRoute('admin-root', routeCandidate.route)
            newlyRegisteredRoutes.push({ routeName: routeCandidate.routeName, removeRoute })
          }
        } catch (error) {
          for (const registeredRoute of [...newlyRegisteredRoutes].reverse())
            registeredRoute.removeRoute()
          throw error
        }

        // AI modified: commit menu state only after all safe route records are registered.
        registeredRoutes.push(...newlyRegisteredRoutes)
        registeredRouteNames.value = registeredRoutes.map(
          (registeredRoute) => registeredRoute.routeName,
        )
        deniedPaths.value = resolvedNavigation.deniedPaths
        menuStore.replaceMenus(resolvedNavigation.menus)
        principalKey.value = authenticatedPrincipal
        isReady.value = true

        const availableRouteNames = router
          .getRoutes()
          .flatMap((routeRecord) =>
            typeof routeRecord.name === 'string' ? [routeRecord.name] : [],
          )
        tabsStore.retainAvailableRoutes(availableRouteNames)
        return newlyRegisteredRoutes.length > 0
      })
      .catch((error: unknown) => {
        loadError.value = error instanceof Error ? error.message : 'Navigation loading failed'
        throw error
      })
      .finally(() => {
        if (navigationTask === requestTask) {
          isLoading.value = false
          navigationTask = null
        }
      })

    navigationTask = requestTask
    return requestTask
  }

  async function reloadNavigation(
    router: Router,
    authenticatedPrincipal: string,
  ): Promise<boolean> {
    unloadNavigation()
    return loadNavigation(router, authenticatedPrincipal)
  }

  return {
    isReady,
    isLoading,
    loadError,
    principalKey,
    registeredRouteNames,
    deniedPaths,
    isPathDenied,
    loadNavigation,
    reloadNavigation,
    unloadNavigation,
  }
})
