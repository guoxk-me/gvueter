<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { z } from 'zod'
import { toast } from 'vue-sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const showPassword = ref(false)
const isLoading = ref(false)

const formSchema = toTypedSchema(
  z.object({
    email: z.string().min(1, '请输入邮箱').email('请输入有效的邮箱地址'),
    password: z.string().min(6, '密码不能少于 6 位'),
  }),
)

const { handleSubmit } = useForm({
  validationSchema: formSchema,
})

const onSubmit = handleSubmit(async (values) => {
  isLoading.value = true
  try {
    const success = await authStore.login(values.email, values.password)
    if (success) {
      toast.success('登录成功', { description: `欢迎回来，${authStore.user?.name}` })
      const redirect = (route.query.redirect as string) || '/dashboard'
      router.push(redirect)
    } else {
      toast.error('登录失败', { description: '邮箱或密码错误，请重试' })
    }
  } catch {
    toast.error('登录失败', { description: '网络错误，请稍后重试' })
  } finally {
    isLoading.value = false
  }
})
</script>

<template>
  <div class="flex min-h-screen items-center justify-center bg-background px-4">
    <div class="w-full max-w-sm space-y-8">
      <!-- Logo & Title -->
      <div class="text-center">
        <div
          class="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"
        >
          <svg
            class="size-6"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            viewBox="0 0 24 24"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
            />
          </svg>
        </div>
        <h1 class="text-2xl font-semibold tracking-tight text-foreground">欢迎回来</h1>
        <p class="mt-1 text-sm text-muted-foreground">请登录您的管理员账号</p>
      </div>

      <!-- Card -->
      <div class="rounded-xl border border-border bg-card p-6 shadow-sm">
        <Form @submit="onSubmit" class="space-y-4">
          <!-- Email -->
          <FormField name="email" v-slot="{ componentField }">
            <FormItem>
              <FormLabel>邮箱</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="admin@example.com"
                  autocomplete="email"
                  v-bind="componentField"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Password -->
          <FormField name="password" v-slot="{ componentField }">
            <FormItem>
              <FormLabel>密码</FormLabel>
              <FormControl>
                <div class="relative">
                  <Input
                    :type="showPassword ? 'text' : 'password'"
                    placeholder="请输入密码"
                    autocomplete="current-password"
                    class="pr-10"
                    v-bind="componentField"
                  />
                  <button
                    type="button"
                    class="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                    @click="showPassword = !showPassword"
                    tabindex="-1"
                  >
                    <EyeOff v-if="showPassword" class="size-4" />
                    <Eye v-else class="size-4" />
                  </button>
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          </FormField>

          <!-- Submit -->
          <Button type="submit" class="w-full" :disabled="isLoading">
            <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
            {{ isLoading ? '登录中...' : '登录' }}
          </Button>
        </Form>
      </div>

      <p class="text-center text-xs text-muted-foreground">
        &copy; {{ new Date().getFullYear() }} Admin Panel. All rights reserved.
      </p>
    </div>
  </div>
</template>
