<script setup lang="ts">
import {
  Users,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-vue-next'
import { useAuthStore } from '@/stores/auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const authStore = useAuthStore()

const stats = [
  {
    title: '总用户数',
    value: '24,521',
    change: '+12.5%',
    trend: 'up',
    desc: '相比上月',
    icon: Users,
    color: 'text-info',
    bg: 'bg-info/10',
  },
  {
    title: '本月收入',
    value: '¥128,430',
    change: '+8.2%',
    trend: 'up',
    desc: '相比上月',
    icon: DollarSign,
    color: 'text-success',
    bg: 'bg-success/10',
  },
  {
    title: '订单总量',
    value: '3,842',
    change: '-3.1%',
    trend: 'down',
    desc: '相比上月',
    icon: ShoppingCart,
    color: 'text-warning',
    bg: 'bg-warning/10',
  },
  {
    title: '活跃率',
    value: '68.4%',
    change: '+4.7%',
    trend: 'up',
    desc: '相比上月',
    icon: TrendingUp,
    color: 'text-brand',
    bg: 'bg-brand/10',
  },
]

const recentActivities = [
  { user: 'Alice Chen', action: '注册了新账号', time: '2 分钟前', avatar: 'AC' },
  { user: 'Bob Wang', action: '完成了一笔订单 #8821', time: '15 分钟前', avatar: 'BW' },
  { user: 'Carol Li', action: '更新了个人资料', time: '1 小时前', avatar: 'CL' },
  { user: 'David Zhang', action: '提交了退款申请', time: '3 小时前', avatar: 'DZ' },
  { user: 'Eva Liu', action: '发布了新内容', time: '5 小时前', avatar: 'EL' },
]
</script>

<template>
  <div class="space-y-6">
    <!-- Page Header -->
    <div>
      <h1 class="text-2xl font-semibold tracking-tight text-foreground">仪表盘</h1>
      <p class="mt-1 text-sm text-muted-foreground">
        你好，{{ authStore.user?.name }}，欢迎回到管理后台。
      </p>
    </div>

    <!-- Stats Grid -->
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card v-for="stat in stats" :key="stat.title">
        <CardHeader class="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle class="text-sm font-medium text-muted-foreground">{{ stat.title }}</CardTitle>
          <div :class="['flex size-9 items-center justify-center rounded-lg', stat.bg]">
            <component :is="stat.icon" :class="['size-5', stat.color]" />
          </div>
        </CardHeader>
        <CardContent>
          <div class="text-2xl font-bold text-foreground">{{ stat.value }}</div>
          <div class="mt-1 flex items-center gap-1 text-xs">
            <span
              :class="[
                'flex items-center gap-0.5 font-medium',
                stat.trend === 'up' ? 'text-success' : 'text-destructive',
              ]"
            >
              <ArrowUpRight v-if="stat.trend === 'up'" class="size-3" />
              <ArrowDownRight v-else class="size-3" />
              {{ stat.change }}
            </span>
            <span class="text-muted-foreground">{{ stat.desc }}</span>
          </div>
        </CardContent>
      </Card>
    </div>

    <!-- Bottom section: Recent Activities -->
    <div class="grid gap-4 lg:grid-cols-2">
      <!-- Recent Activities -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">最近动态</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="activity in recentActivities"
            :key="activity.user"
            class="flex items-start gap-3"
          >
            <div
              class="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground"
            >
              {{ activity.avatar }}
            </div>
            <div class="min-w-0 flex-1">
              <p class="text-sm">
                <span class="font-medium text-foreground">{{ activity.user }}</span>
                <span class="text-muted-foreground"> {{ activity.action }}</span>
              </p>
              <p class="mt-0.5 text-xs text-muted-foreground">{{ activity.time }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- Quick Stats / Summary -->
      <Card>
        <CardHeader>
          <CardTitle class="text-base">系统状态</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="item in [
              { label: 'CPU 使用率', value: 34, color: 'bg-info' },
              { label: '内存占用', value: 62, color: 'bg-brand' },
              { label: '磁盘使用', value: 48, color: 'bg-success' },
              { label: '网络带宽', value: 21, color: 'bg-warning' },
            ]"
            :key="item.label"
            class="space-y-1.5"
          >
            <div class="flex justify-between text-sm">
              <span class="text-muted-foreground">{{ item.label }}</span>
              <span class="font-medium text-foreground">{{ item.value }}%</span>
            </div>
            <div class="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                :class="['h-full rounded-full transition-all', item.color]"
                :style="{ width: `${item.value}%` }"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
