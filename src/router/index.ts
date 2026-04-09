import { createRouter, createWebHistory } from "vue-router";

import { isRouteAccessible } from "@/lib/access";
import { i18n } from "@/plugins/i18n";
import { routes } from "@/router/routes";
import { pinia } from "@/stores";
import { useAuthStore } from "@/stores/auth";
import { useTenantStore } from "@/stores/tenant";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

router.beforeEach((to) => {
  const auth = useAuthStore(pinia);
  const tenant = useTenantStore(pinia);

  if (to.meta.publicOnly && auth.isAuthenticated) {
    return { name: "dashboard" };
  }

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return {
      name: "login",
      query: {
        redirect: to.fullPath,
      },
    };
  }

  if (
    to.meta.requiresAuth &&
    !isRouteAccessible(to.meta, auth.user, (feature) => tenant.hasFeature(feature))
  ) {
    return { name: "forbidden" };
  }

  return true;
});

router.afterEach((to) => {
  const title = to.meta.titleKey ? i18n.global.t(to.meta.titleKey) : i18n.global.t("app.name");
  document.title = `${title} - ${i18n.global.t("app.name")}`;
});

export default router;
