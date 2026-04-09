import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed } from "vue";

import { getRoleAbilities, hasAbility, hasAllAbilities, type Ability } from "@/lib/access";

export type UserRole = "platform-admin" | "workspace-admin" | "security-analyst";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
};

type AuthState = {
  token: string | null;
  user: AuthUser | null;
};

const demoProfiles: Record<UserRole, AuthUser> = {
  "platform-admin": {
    id: "usr-platform-admin",
    name: "Maya Chen",
    email: "maya@gvueter.app",
    role: "platform-admin",
    title: "Platform Admin",
  },
  "workspace-admin": {
    id: "usr-workspace-admin",
    name: "Ava Reed",
    email: "ava@gvueter.app",
    role: "workspace-admin",
    title: "Workspace Admin",
  },
  "security-analyst": {
    id: "usr-security-analyst",
    name: "Luca Park",
    email: "luca@gvueter.app",
    role: "security-analyst",
    title: "Security Analyst",
  },
};

export const useAuthStore = defineStore("auth", () => {
  const state = useStorage<AuthState>("gvueter-auth", {
    token: null,
    user: null,
  });

  const isAuthenticated = computed(() => Boolean(state.value.token));
  const user = computed(() => state.value.user);
  const abilities = computed(() => getRoleAbilities(state.value.user?.role));

  const login = async (payload: { email: string; password: string; role?: UserRole }) => {
    const role = payload.role ?? "platform-admin";
    const profile = demoProfiles[role];

    state.value = {
      token: `demo-token-${role}`,
      user: {
        ...profile,
        email: payload.email || profile.email,
      },
    };
  };

  const loginAsDemo = async (role: UserRole) => {
    await login({
      email: demoProfiles[role].email,
      password: "demo",
      role,
    });
  };

  const logout = () => {
    state.value = {
      token: null,
      user: null,
    };
  };

  const can = (ability: Ability) => hasAbility(state.value.user, ability);
  const canAll = (required: Ability[]) => hasAllAbilities(state.value.user, required);

  return {
    abilities,
    can,
    canAll,
    isAuthenticated,
    login,
    loginAsDemo,
    logout,
    user,
  };
});
