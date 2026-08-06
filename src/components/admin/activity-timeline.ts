import type { Component } from 'vue'

export type ActivityTone = 'default' | 'danger' | 'info' | 'success' | 'warning'

export interface ActivityTimelineEntry {
  id: string
  title: string
  description?: string
  occurredAt: string
  icon?: Component
  tone?: ActivityTone
}
