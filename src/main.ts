import { VueQueryPlugin } from "@tanstack/vue-query";
import { createApp } from "vue";
import { watch } from "vue";

import App from "./App.vue";
import { i18n } from "./plugins/i18n";
import { queryClient } from "./plugins/query";
import router from "./router";
import { pinia } from "./stores";
import { usePreferencesStore } from "./stores/preferences";
import "./styles/globals.css";

const app = createApp(App);

app.use(pinia);
app.use(i18n);
app.use(VueQueryPlugin, { queryClient });
app.use(router);

const preferences = usePreferencesStore(pinia);

watch(
  () => preferences.locale,
  (locale) => {
    i18n.global.locale.value = locale;
  },
  { immediate: true },
);

app.mount("#app");
