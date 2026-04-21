import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface User {
  id: number
  name: string
  email: string
  avatar?: string
  role: 'admin' | 'editor' | 'viewer'
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const user = ref<User | null>(null)

  const isAuthenticated = computed(() => !!token.value)

  function setToken(newToken: string) {
    token.value = newToken
    localStorage.setItem('auth_token', newToken)
  }

  function setUser(newUser: User) {
    user.value = newUser
  }

  async function login(email: string, password: string) {
    // TODO: replace with actual API call
    if (email && password) {
      const fakeToken = 'fake-jwt-token-' + Date.now()
      const fakeUser: User = {
        id: 1,
        name: 'Admin User',
        email,
        role: 'admin',
      }
      setToken(fakeToken)
      setUser(fakeUser)
      return true
    }
    return false
  }

  function logout() {
    token.value = null
    user.value = null
    localStorage.removeItem('auth_token')
  }

  return {
    token,
    user,
    isAuthenticated,
    login,
    logout,
    setToken,
    setUser,
  }
})
