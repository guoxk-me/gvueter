<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, LayoutDashboard, Users, FileText, BarChart3, Settings } from 'lucide-vue-next'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { appAbility } from '@/lib/ability'

interface SearchItem {
  title: string
  to: string
  icon: unknown
  group: string
  ability: [string, string]
}

const router = useRouter()
const open = ref(false)
const query = ref('')

const allItems: SearchItem[] = [
  {
    title: '仪表盘',
    to: '/dashboard',
    icon: LayoutDashboard,
    group: '页面',
    ability: ['read', 'Dashboard'],
  },
  { title: '用户管理', to: '/users', icon: Users, group: '页面', ability: ['read', 'User'] },
  {
    title: '内容管理',
    to: '/content',
    icon: FileText,
    group: '页面',
    ability: ['read', 'Content'],
  },
  {
    title: '数据分析',
    to: '/analytics',
    icon: BarChart3,
    group: '页面',
    ability: ['read', 'Analytics'],
  },
  {
    title: '系统设置',
    to: '/settings',
    icon: Settings,
    group: '页面',
    ability: ['read', 'Settings'],
  },
]

const filteredItems = computed(() => {
  const q = query.value.trim().toLowerCase()
  return allItems.filter((item) => {
    if (!appAbility.can(item.ability[0] as never, item.ability[1] as never)) return false
    if (!q) return true
    return item.title.toLowerCase().includes(q)
  })
})

function select(item: SearchItem) {
  open.value = false
  query.value = ''
  router.push(item.to)
}

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault()
    open.value = true
  }
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <!-- Trigger button -->
  <button
    class="flex h-8 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-foreground"
    @click="open = true"
  >
    <Search class="size-3.5" />
    <span class="hidden sm:inline">搜索页面...</span>
    <kbd
      class="hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex"
    >
      <span class="text-xs">⌘</span>K
    </kbd>
  </button>

  <!-- Search Dialog -->
  <Dialog v-model:open="open">
    <DialogContent class="max-w-md p-0 gap-0">
      <DialogHeader class="sr-only">
        <DialogTitle>全局搜索</DialogTitle>
        <DialogDescription>搜索页面并快速跳转</DialogDescription>
      </DialogHeader>

      <!-- Input -->
      <div class="flex items-center border-b px-3">
        <Search class="mr-2 size-4 shrink-0 text-muted-foreground" />
        <input
          v-model="query"
          class="flex h-11 w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
          placeholder="搜索页面..."
          autofocus
        />
      </div>

      <!-- Results -->
      <div class="max-h-72 overflow-y-auto p-2">
        <p v-if="filteredItems.length === 0" class="py-6 text-center text-sm text-muted-foreground">
          没有找到相关页面
        </p>
        <button
          v-for="item in filteredItems"
          :key="item.to"
          class="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-left hover:bg-accent hover:text-accent-foreground"
          @click="select(item)"
        >
          <component :is="item.icon" class="size-4 text-muted-foreground" />
          <span>{{ item.title }}</span>
          <span class="ml-auto text-xs text-muted-foreground">{{ item.group }}</span>
        </button>
      </div>
    </DialogContent>
  </Dialog>
</template>
