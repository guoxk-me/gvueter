import { describe, it, expect, beforeEach } from 'vite-plus/test'
import { setActivePinia, createPinia } from 'pinia'
import { server } from '@/mocks/node'
import { http, HttpResponse } from 'msw'
import { useAuthStore } from '@/stores/auth'
import type { ApiResponse } from '@/lib/http'

describe('useAuthStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  describe('login()', () => {
    it('admin 账号登录成功，返回 token 和用户信息', async () => {
      const store = useAuthStore()

      const result = await store.login('admin@example.com', 'admin123')

      expect(result).toBe(true)
      expect(store.isAuthenticated).toBe(true)
      expect(store.user).toMatchObject({
        email: 'admin@example.com',
        role: 'admin',
        name: '超级管理员',
      })
      expect(store.token).toBeTruthy()
      expect(localStorage.getItem('auth_token')).toBe(store.token)
    })

    it('editor 账号登录成功，角色为 editor', async () => {
      const store = useAuthStore()

      await store.login('editor@example.com', 'editor123')

      expect(store.user?.role).toBe('editor')
      expect(store.user?.name).toBe('内容编辑')
    })

    it('viewer 账号登录成功，角色为 viewer', async () => {
      const store = useAuthStore()

      await store.login('viewer@example.com', 'viewer123')

      expect(store.user?.role).toBe('viewer')
      expect(store.user?.name).toBe('只读访客')
    })

    it('密码错误时抛出 401 错误', async () => {
      const store = useAuthStore()

      await expect(store.login('admin@example.com', 'wrongpassword')).rejects.toThrow(
        /Request failed with status code 401/,
      )

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
    })

    it('不存在的账号登录失败', async () => {
      const store = useAuthStore()

      await expect(store.login('unknown@example.com', 'somepassword')).rejects.toThrow(
        /Request failed with status code 401/,
      )

      expect(store.isAuthenticated).toBe(false)
    })

    it('可以通过 server.use() 覆盖 handler 模拟服务器错误', async () => {
      // 演示：在单个测试中临时覆盖 handler
      server.use(
        http.post('/api/auth/login', () => {
          return HttpResponse.json<ApiResponse<null>>(
            { code: 500, message: '服务器内部错误', data: null },
            { status: 500 },
          )
        }),
      )

      const store = useAuthStore()
      await expect(store.login('admin@example.com', 'admin123')).rejects.toThrow(
        /Request failed with status code 500/,
      )
    })
  })

  describe('logout()', () => {
    it('登出后清除 token 和用户信息', async () => {
      const store = useAuthStore()

      await store.login('admin@example.com', 'admin123')
      expect(store.isAuthenticated).toBe(true)

      await store.logout()

      expect(store.isAuthenticated).toBe(false)
      expect(store.user).toBeNull()
      expect(store.token).toBeNull()
      expect(localStorage.getItem('auth_token')).toBeNull()
    })
  })
})
