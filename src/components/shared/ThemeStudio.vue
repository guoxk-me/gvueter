<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

import AppIcon from "@/components/AppIcon.vue";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { accentOptions, usePreferencesStore } from "@/stores/preferences";

const preferences = usePreferencesStore();
const { locale } = useI18n();

const appearanceModes = [
  { value: "light", label: "Light", icon: "lucide:sun-medium" },
  { value: "dark", label: "Dark", icon: "lucide:moon-star" },
  { value: "system", label: "System", icon: "lucide:laptop-minimal" },
] as const;

const localeOptions = [
  { value: "zh-CN", label: "中文" },
  { value: "en-US", label: "English" },
] as const;

const densityOptions = [
  { value: "comfortable", label: "Comfortable" },
  { value: "compact", label: "Compact" },
] as const;

const activeMotion = computed({
  get: () => preferences.motion,
  set: (value: boolean) => {
    preferences.motion = value;
  },
});

const activeLocale = computed({
  get: () => preferences.locale,
  set: (value) => {
    preferences.setLocale(value);
    locale.value = value;
  },
});
</script>

<template>
  <Tabs default-value="appearance" class="space-y-6">
    <TabsList class="grid h-auto grid-cols-3 gap-2 rounded-2xl bg-muted/60 p-1.5">
      <TabsTrigger value="appearance" class="rounded-xl px-4 py-2">Appearance</TabsTrigger>
      <TabsTrigger value="tenant" class="rounded-xl px-4 py-2">Tenant</TabsTrigger>
      <TabsTrigger value="experience" class="rounded-xl px-4 py-2">Experience</TabsTrigger>
    </TabsList>

    <TabsContent value="appearance" class="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Theme mode</CardTitle>
          <CardDescription
            >Choose how the shell should react to system colors and light
            conditions.</CardDescription
          >
        </CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-3">
          <Button
            v-for="mode in appearanceModes"
            :key="mode.value"
            :variant="preferences.mode === mode.value ? 'default' : 'outline'"
            class="justify-start rounded-2xl px-4 py-6"
            @click="preferences.setMode(mode.value)"
          >
            <AppIcon :icon="mode.icon" class="size-4" />
            {{ mode.label }}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Accent palette</CardTitle>
          <CardDescription
            >Multi-brand accent tokens are baked in, with violet night as the
            default.</CardDescription
          >
        </CardHeader>
        <CardContent class="grid gap-3 md:grid-cols-5">
          <button
            v-for="accent in accentOptions"
            :key="accent"
            type="button"
            class="group rounded-2xl border border-border bg-background/70 p-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
            @click="preferences.setAccent(accent)"
          >
            <div class="mb-3 flex items-center justify-between">
              <div
                class="size-9 rounded-2xl border border-white/10 shadow-lg"
                :style="{ backgroundColor: `var(--theme-${accent})` }"
              />
              <Badge v-if="preferences.accent === accent" variant="secondary" class="rounded-full"
                >Active</Badge
              >
            </div>
            <div class="text-sm font-medium capitalize">
              {{ accent }}
            </div>
          </button>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="tenant" class="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Locale & density</CardTitle>
          <CardDescription
            >These controls are user-level today, but are designed to be
            tenant-overridable.</CardDescription
          >
        </CardHeader>
        <CardContent class="space-y-5">
          <div class="space-y-3">
            <div class="text-sm font-medium">Language</div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="option in localeOptions"
                :key="option.value"
                :variant="activeLocale === option.value ? 'default' : 'outline'"
                class="rounded-full"
                @click="activeLocale = option.value"
              >
                {{ option.label }}
              </Button>
            </div>
          </div>
          <Separator />
          <div class="space-y-3">
            <div class="text-sm font-medium">Density</div>
            <div class="flex flex-wrap gap-2">
              <Button
                v-for="option in densityOptions"
                :key="option.value"
                :variant="preferences.density === option.value ? 'default' : 'outline'"
                class="rounded-full"
                @click="preferences.setDensity(option.value)"
              >
                {{ option.label }}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </TabsContent>

    <TabsContent value="experience" class="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Operator experience</CardTitle>
          <CardDescription
            >Trim motion when needed, while keeping the shell premium by default.</CardDescription
          >
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            class="flex items-center justify-between gap-4 rounded-2xl border border-border/70 bg-muted/30 px-4 py-3"
          >
            <div>
              <div class="text-sm font-medium">Enhanced motion</div>
              <div class="text-sm text-muted-foreground">
                Controls reveal, hover and modal motion tokens across the interface.
              </div>
            </div>
            <Switch v-model:checked="activeMotion" />
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  </Tabs>
</template>
