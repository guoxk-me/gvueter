<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
  <div class="flex h-screen bg-background">
    <!-- Sidebar placeholder -->
    <aside class="w-64 border-r border-border bg-sidebar" />

    <!-- Main content -->
    <div class="flex flex-1 flex-col overflow-hidden">
      <!-- Header placeholder -->
      <header class="h-16 border-b border-border bg-background" />

      <!-- Page content -->
      <main class="flex-1 overflow-auto p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>
