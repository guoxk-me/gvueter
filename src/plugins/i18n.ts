import { createI18n } from "vue-i18n";

import enUS from "@/locales/en-US";
import zhCN from "@/locales/zh-CN";

export const messages = {
  "en-US": enUS,
  "zh-CN": zhCN,
} as const;

export type AppLocale = keyof typeof messages;

export const i18n = createI18n({
  legacy: false,
  locale: "zh-CN",
  fallbackLocale: "en-US",
  messages,
});
