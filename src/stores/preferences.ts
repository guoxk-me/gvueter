import { defineStore } from "pinia";
import { usePreferredDark, useStorage } from "@vueuse/core";
import { computed, watch } from "vue";

import type { AppLocale } from "@/plugins/i18n";

export type AppearanceMode = "light" | "dark" | "system";
export type AccentTheme = "violet" | "blue" | "cyan" | "emerald" | "rose";
export type DensityMode = "comfortable" | "compact";

export const accentOptions: AccentTheme[] = ["violet", "blue", "cyan", "emerald", "rose"];

export const usePreferencesStore = defineStore("preferences", () => {
  const mode = useStorage<AppearanceMode>("gvueter-mode", "system");
  const accent = useStorage<AccentTheme>("gvueter-accent", "violet");
  const density = useStorage<DensityMode>("gvueter-density", "comfortable");
  const locale = useStorage<AppLocale>("gvueter-locale", "zh-CN");
  const motion = useStorage<boolean>("gvueter-motion", true);
  const preferredDark = usePreferredDark();

  const isDark = computed(() => {
    if (mode.value === "system") {
      return preferredDark.value;
    }

    return mode.value === "dark";
  });

  const applyAppearance = () => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    root.classList.toggle("dark", isDark.value);
    root.dataset.theme = accent.value;
    root.dataset.density = density.value;
    root.dataset.motion = motion.value ? "full" : "reduced";
  };

  const setMode = (value: AppearanceMode) => {
    mode.value = value;
  };

  const setAccent = (value: AccentTheme) => {
    accent.value = value;
  };

  const setDensity = (value: DensityMode) => {
    density.value = value;
  };

  const setLocale = (value: AppLocale) => {
    locale.value = value;
  };

  watch([mode, accent, density, motion, preferredDark], applyAppearance, { immediate: true });

  return {
    accent,
    applyAppearance,
    density,
    isDark,
    locale,
    mode,
    motion,
    setAccent,
    setDensity,
    setLocale,
    setMode,
  };
});
