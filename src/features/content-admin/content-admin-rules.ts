import type { ContentFileRecord } from './types/files'
import type { StatusTone } from '@/components/admin'
import type { DictionaryOption } from '@/features/dictionaries/types'

export function getAnnouncementTextPreview(content: string): string {
  // AI modified: list previews remove markup and never render stored rich text as executable HTML.
  return content
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function getPriorityTone(
  priority: string,
  options: readonly DictionaryOption[],
): StatusTone {
  return options.find(option => option.value === priority)?.color ?? 'neutral'
}

export function isSafeImagePreview(file: ContentFileRecord): boolean {
  return (
    file.mimeType.startsWith('image/')
    && Boolean(file.previewUrl?.startsWith('/api/content-files/'))
    && !file.previewUrl?.startsWith('//')
  )
}
