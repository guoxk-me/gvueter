import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { post } from '@/lib/http'
import { updateAbility } from '@/lib/ability'

export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'editor' | 'viewer'
}

interface LoginResponse {
  token: string
  user: User
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  // Keep the singleton appAbility in sync whenever the user changes
  watch(user, (newUser) => updateAbility(newUser), { immediate: true })

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  async function login(email: string, password: string): Promise<boolean> {
    const data = await post<LoginResponse>('/auth/login', { email, password })
    setToken(data.token)
    setUser(data.user)
    return true
  }

  async function forgotPassword(email: string): Promise<void> {
    await post('/auth/forgot-password', { email })
  }

  async function resetPassword(token: string, newPassword: string): Promise<void> {
    await post('/auth/reset-password', { token, newPassword })
  }

  async function logout(): Promise<void> {
    try {
      await post('/auth/logout')
    } finally {
      token.value = null
      user.value = null
      localStorage.removeItem('auth_token')
    }
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    forgotPassword,
    resetPassword,
    setToken,
    setUser,
  }
})
