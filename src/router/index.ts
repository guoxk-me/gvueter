import type { Composer } from 'vue-i18n'
import type { RouteLocationNormalized } from 'vue-router'
import { createRouter, createWebHistory } from 'vue-router'
import { i18n } from '@/i18n'
import HomePage from '@/pages/HomePage.vue'

export type RouteAccessPolicy = (route: RouteLocationNormalized) => boolean | Promise<boolean>
let routeAccessPolicy: RouteAccessPolicy = () => true

// AI modified: future authentication can attach a guard without restoring old login or role routes.
export function configureRouteAccess(policy: RouteAccessPolicy): void {
  routeAccessPolicy = policy
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'home', component: HomePage },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async route => routeAccessPolicy(route))
router.afterEach(() => {
  document.title = (i18n.global as unknown as Composer).t('home.title')
})

export default router
