<script setup lang="ts">
import { z } from "zod";
import { useForm } from "vee-validate";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/stores/auth";

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const { t } = useI18n();

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

const validator = (values: { email: string; password: string }) => {
  const result = schema.safeParse(values);

  if (result.success) {
    return {};
  }

  const fieldErrors = result.error.flatten().fieldErrors;

  return Object.fromEntries(
    Object.entries(fieldErrors).map(([key, value]) => [key, value?.[0] ?? "Invalid value"]),
  );
};

const { errors, handleSubmit, defineField, isSubmitting, setValues } = useForm({
  validate: validator,
  initialValues: {
    email: "maya@gvueter.app",
    password: "demo",
  },
});

const [email, emailAttrs] = defineField("email");
const [password, passwordAttrs] = defineField("password");

const onSubmit = handleSubmit(async (values) => {
  await auth.login({ email: values.email, password: values.password, role: "platform-admin" });

  const redirect = typeof route.query.redirect === "string" ? route.query.redirect : undefined;
  await router.push(redirect || { name: "dashboard" });
});

const demoProfiles = computed(() => [
  {
    label: "Platform Admin",
    description: "Global visibility across tenants, audit center and feature matrix.",
    action: async () => {
      setValues({ email: "maya@gvueter.app", password: "demo" });
      await auth.loginAsDemo("platform-admin");
      await router.push({ name: "dashboard" });
    },
  },
  {
    label: "Workspace Admin",
    description: "Tenant-first operator focused on members, settings and service health.",
    action: async () => {
      setValues({ email: "ava@gvueter.app", password: "demo" });
      await auth.loginAsDemo("workspace-admin");
      await router.push({ name: "dashboard" });
    },
  },
  {
    label: "Security Analyst",
    description: "Review access, sensitive actions and audit-heavy workflows.",
    action: async () => {
      setValues({ email: "luca@gvueter.app", password: "demo" });
      await auth.loginAsDemo("security-analyst");
      await router.push({ name: "dashboard" });
    },
  },
]);
</script>

<template>
  <Card
    class="border-white/10 bg-card/78 shadow-[0_24px_80px_-40px_color-mix(in_oklab,var(--primary)_55%,transparent)] backdrop-blur-xl"
  >
    <CardHeader class="space-y-2 pb-4">
      <CardTitle class="text-2xl tracking-tight">
        {{ t("auth.title") }}
      </CardTitle>
      <CardDescription class="leading-7">
        {{ t("auth.subtitle") }}
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-6">
      <form class="space-y-4" @submit="onSubmit">
        <div class="space-y-2">
          <label class="text-sm font-medium" for="email">{{ t("auth.email") }}</label>
          <Input
            id="email"
            v-model="email"
            type="email"
            class="h-11 rounded-2xl"
            v-bind="emailAttrs"
          />
          <p v-if="errors.email" class="text-sm text-destructive">{{ errors.email }}</p>
        </div>
        <div class="space-y-2">
          <label class="text-sm font-medium" for="password">{{ t("auth.password") }}</label>
          <Input
            id="password"
            v-model="password"
            type="password"
            class="h-11 rounded-2xl"
            v-bind="passwordAttrs"
          />
          <p v-if="errors.password" class="text-sm text-destructive">{{ errors.password }}</p>
        </div>
        <Button type="submit" class="h-11 w-full rounded-2xl text-sm" :disabled="isSubmitting">
          {{ t("auth.signIn") }}
        </Button>
      </form>

      <div class="rounded-3xl border border-white/10 bg-muted/30 p-4">
        <div class="mb-3 text-sm font-semibold">{{ t("auth.quickStart") }}</div>
        <p class="mb-4 text-sm leading-6 text-muted-foreground">
          {{ t("auth.demoHint") }}
        </p>
        <div class="space-y-2">
          <button
            v-for="profile in demoProfiles"
            :key="profile.label"
            type="button"
            class="w-full rounded-2xl border border-border/70 bg-background/60 px-4 py-3 text-left transition hover:border-primary/50 hover:bg-primary/5"
            @click="profile.action"
          >
            <div class="text-sm font-medium">{{ profile.label }}</div>
            <div class="mt-1 text-sm leading-6 text-muted-foreground">
              {{ profile.description }}
            </div>
          </button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
