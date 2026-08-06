import type {
  AnnouncementInput,
  AnnouncementListResponse,
  AnnouncementRecord,
} from '@/features/content-admin/types/announcements'
import type {
  ContentFileListResponse,
  ContentFileRecord,
} from '@/features/content-admin/types/files'
import type {
  OperationLogListResponse,
  OperationLogRecord,
} from '@/features/content-admin/types/operation-logs'
import { File as NodeFile } from 'node:buffer'
import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test'
import ContentAdminWorkspace from '@/features/content-admin/components/ContentAdminWorkspace.vue'
import { uploadContentFiles } from '@/features/content-admin/composables/useFileManagement'
import {
  getAnnouncementTextPreview,
  getPriorityTone,
  isSafeImagePreview,
} from '@/features/content-admin/content-admin-rules'
import { i18n } from '@/i18n'
import { updateAbility } from '@/lib/ability'
import { getFileSizeLabel } from '@/lib/display-format'
import { del, download, get, post, put, uploadFileBytes } from '@/lib/http'
import { generateMockToken } from '@/mocks/data/users'
import { resetMockAnnouncements } from '@/mocks/handlers/announcements'
import { resetMockContentFiles } from '@/mocks/handlers/content-files'
import { resetMockOperationLogs } from '@/mocks/handlers/operation-logs'
import { resetMockSystemConfig } from '@/mocks/handlers/system-config'
import { getTestAuthorization } from './auth-test-helpers'

const newAnnouncement: AnnouncementInput = {
  title: 'Maintenance window',
  content: '<p>Services will restart at <strong>02:00 UTC</strong>.</p>',
  priority: 'important',
}

describe('content administration rules', () => {
  it('projects rich text to escaped previews and dictionary-backed tones', () => {
    expect(getAnnouncementTextPreview('<p>Hello <script>alert(1)</script> team</p>')).toBe(
      'Hello alert(1) team',
    )
    expect(
      getPriorityTone('urgent', [
        { label: 'Urgent', value: 'urgent', color: 'destructive', isDisabled: false },
      ]),
    ).toBe('destructive')
  })

  it('allows previews only for allow-listed image routes and displays file sizes', () => {
    const image: ContentFileRecord = {
      id: 'image',
      name: 'safe.png',
      mimeType: 'image/png',
      size: 2048,
      uploadedBy: 'Admin',
      uploadedAt: '2026-07-13T00:00:00.000Z',
      previewUrl: '/api/content-files/image/preview',
    }
    expect(isSafeImagePreview(image)).toBe(true)
    expect(isSafeImagePreview({ ...image, mimeType: 'application/pdf' })).toBe(false)
    expect(isSafeImagePreview({ ...image, previewUrl: 'https://evil.example/image.png' })).toBe(
      false,
    )
    expect(getFileSizeLabel(2048, { locale: 'en-US' })).toBe('2.0 KB')
  })
})

describe('announcement API', () => {
  beforeEach(() => {
    resetMockAnnouncements()
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('creates, edits, publishes, takes offline, and deletes an announcement', async () => {
    const created = await post<AnnouncementRecord>('/announcements', newAnnouncement)
    expect(created).toMatchObject({ ...newAnnouncement, status: 'draft' })

    const edited = await put<AnnouncementRecord>(`/announcements/${created.id}`, {
      ...newAnnouncement,
      title: 'Planned maintenance window',
    })
    expect(edited.title).toBe('Planned maintenance window')

    const published = await put<AnnouncementRecord>(`/announcements/${created.id}/status`, {
      status: 'published',
    })
    expect(published).toMatchObject({ status: 'published' })
    expect(published.publishedAt).toBeTruthy()

    await expect(
      put(`/announcements/${created.id}/status`, { status: 'offline' }),
    ).resolves.toMatchObject({ status: 'offline' })
    await del(`/announcements/${created.id}`)
    const response = await get<AnnouncementListResponse>('/announcements')
    expect(response.items.some((announcement) => announcement.id === created.id)).toBe(false)
  })

  it('allows the default editor to create and update Content but not delete it', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    await expect(get('/announcements')).resolves.toMatchObject({ items: expect.any(Array) })
    const created = await post<AnnouncementRecord>('/announcements', newAnnouncement)
    await expect(
      put(`/announcements/${created.id}`, {
        ...newAnnouncement,
        title: 'Editor-maintained announcement',
      }),
    ).resolves.toMatchObject({ title: 'Editor-maintained announcement' })
    await expect(del(`/announcements/${created.id}`)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })

  it('sanitizes announcement HTML before storage and on every response', async () => {
    const created = await post<AnnouncementRecord>('/announcements', {
      title: 'Safe announcement',
      content:
        '<p onclick="steal()">Review <strong>access</strong>.</p><script>steal()</script><a href="javascript:steal()">Bad link</a>',
      priority: 'normal',
    })

    expect(created.content).toContain('<p>Review <strong>access</strong>.</p>')
    expect(created.content).toContain('<a>Bad link</a>')
    expect(created.content).not.toMatch(/script|onclick|javascript:/)

    const response = await get<AnnouncementListResponse>('/announcements')
    const storedAnnouncement = response.items.find((announcement) => announcement.id === created.id)
    expect(storedAnnouncement?.content).toBe(created.content)
  })
})

describe('content file API', () => {
  beforeEach(() => {
    resetMockContentFiles()
    // AI modified: global upload policy state cannot leak across content file scenarios.
    resetMockSystemConfig()
    sessionStorage.setItem('auth_token', generateMockToken(1))
  })
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('paginates on the server, sanitizes upload names, previews images, and downloads bytes', async () => {
    const page = await get<ContentFileListResponse>('/content-files', { page: 1, pageSize: 1 })
    expect(page).toMatchObject({ page: 1, pageSize: 1, total: 2 })
    expect(page.items).toHaveLength(1)

    const files = await get<ContentFileListResponse>('/content-files', { page: 1, pageSize: 10 })
    const longNamedFile = files.items.find((file) => file.id === 'file-release-notes')
    expect(longNamedFile?.name.length).toBeGreaterThan(80)
    expect(longNamedFile?.name).toContain('亚太区访问权限复核')
    expect(longNamedFile?.name).toContain('quarterly-apac-access-governance')

    const originalBytes = new TextEncoder().encode('RIFF1234WEBPreal-image-bytes')
    const uploaded = await uploadFileBytes<ContentFileRecord>(
      '/content-files',
      new NodeFile([originalBytes], '../../avatar.webp', { type: 'image/webp' }),
    )
    expect(uploaded.name).toBe('avatar.webp')
    expect(isSafeImagePreview(uploaded)).toBe(true)

    const downloaded = await download(`/content-files/${uploaded.id}/download`)
    expect(downloaded.fileName).toBe('avatar.webp')
    expect(downloaded.contentType).toContain('image/webp')
    expect(Array.from(new Uint8Array(await downloaded.blob.arrayBuffer()))).toEqual(
      Array.from(originalBytes),
    )
  })

  it('rejects unsupported MIME types and oversized files', async () => {
    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile(['script'], 'payload.js', { type: 'application/javascript' }),
      ),
    ).rejects.toMatchObject({ code: 'UNSUPPORTED_CONTENT_FILE_TYPE', status: 415 })

    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile([new Uint8Array(5 * 1024 * 1024 + 1)], 'oversized.pdf', {
          type: 'application/pdf',
        }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_FILE_TOO_LARGE', status: 413 })

    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile(['mismatch'], 'payload.txt', { type: 'image/png' }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_FILE_TYPE_MISMATCH', status: 415 })

    await expect(
      uploadFileBytes(
        '/content-files',
        new NodeFile(['not a png'], 'payload.png', { type: 'image/png' }),
      ),
    ).rejects.toMatchObject({ code: 'CONTENT_FILE_SIGNATURE_MISMATCH', status: 415 })
  })

  it('reports partial multi-upload success without discarding the failed file', async () => {
    const acceptedFile = new NodeFile(['release notes'], 'release-notes.txt', {
      type: 'text/plain',
    }) as unknown as File
    const rejectedFile = new NodeFile(['script'], 'payload.js', {
      type: 'application/javascript',
    }) as unknown as File

    const uploadOutcome = await uploadContentFiles([acceptedFile, rejectedFile])

    // AI modified: the batch contract preserves both committed server state and retry candidates.
    expect(uploadOutcome.uploadedFiles).toHaveLength(1)
    expect(uploadOutcome.uploadedFiles[0]?.name).toBe('release-notes.txt')
    expect(uploadOutcome.failedFiles).toEqual([rejectedFile])
    expect(uploadOutcome.firstFailure).toMatchObject({ code: 'UNSUPPORTED_CONTENT_FILE_TYPE' })
  })

  it('allows the default editor to upload Content but not delete it', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(2))
    const uploaded = await uploadFileBytes<ContentFileRecord>(
      '/content-files',
      new NodeFile(['note'], 'notes.txt', { type: 'text/plain' }),
    )
    expect(uploaded.uploadedBy).toBe('内容编辑')
    await expect(del(`/content-files/${uploaded.id}`)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })
})

describe('content administration permission surface', () => {
  afterEach(() => updateAbility(null))

  it('projects each editor Content action to the matching child control', () => {
    const editor = {
      id: 2,
      name: 'Editor',
      email: 'editor@example.com',
      role: 'editor',
      status: 'active',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as const
    updateAbility(editor, getTestAuthorization(editor))

    const passThrough = { template: '<div><slot /></div>' }
    const wrapper = mount(ContentAdminWorkspace, {
      global: {
        plugins: [i18n],
        stubs: {
          AnnouncementDialog: true,
          AnnouncementPanel: true,
          Callout: true,
          FilePanel: true,
          OperationLogPanel: true,
          PageHeader: true,
          Tabs: passThrough,
          TabsContent: passThrough,
          TabsList: passThrough,
          TabsTrigger: passThrough,
        },
      },
    })

    // AI modified: the UI contract mirrors create/update/delete independently, including editor no-delete.
    expect(wrapper.findComponent({ name: 'AnnouncementPanel' }).props()).toMatchObject({
      canCreate: true,
      canUpdate: true,
      canDelete: false,
    })
    expect(wrapper.findComponent({ name: 'FilePanel' }).props()).toMatchObject({
      canUpload: true,
      canDelete: false,
    })
    wrapper.unmount()
  })
})

describe('operation log API', () => {
  beforeEach(() => {
    resetMockOperationLogs()
    sessionStorage.setItem('auth_token', generateMockToken(2))
  })
  afterEach(() => sessionStorage.removeItem('auth_token'))

  it('prevents operation-log lists and details from being stored', async () => {
    const authorization = `Bearer ${generateMockToken(2)}`
    const [listResponse, detailResponse] = await Promise.all([
      fetch('/api/operation-logs', { headers: { Authorization: authorization } }),
      fetch('/api/operation-logs/log-4', { headers: { Authorization: authorization } }),
    ])

    // AI modified: both masked audit projections remain sensitive at the HTTP cache boundary.
    expect(listResponse.status).toBe(200)
    expect(detailResponse.status).toBe(200)
    expect(listResponse.headers.get('Cache-Control')).toBe('no-store')
    expect(detailResponse.headers.get('Cache-Control')).toBe('no-store')
  })

  it('filters actor, action, resource, outcome, and time on the server', async () => {
    const response = await get<OperationLogListResponse>('/operation-logs', {
      startDate: '2026-07-11',
      endDate: '2026-07-13',
      actor: '管理员',
      action: 'publish',
      resource: 'announcement',
      outcome: 'success',
      page: 1,
      pageSize: 10,
    })
    expect(response.total).toBe(1)
    expect(response.items[0]).toMatchObject({ id: 'log-1', outcome: 'success' })
  })

  it('returns a strictly redacted, read-only detail contract', async () => {
    const detail = await get<OperationLogRecord>('/operation-logs/log-4')
    expect(detail.actorEmailMasked).toContain('***')
    expect(detail.ipMasked).toContain('*')
    const serializedDetail = JSON.stringify(detail).toLocaleLowerCase()
    expect(serializedDetail).not.toMatch(/password|token|secret|stack/)
    expect(Object.keys(detail).sort()).toEqual(
      [
        'action',
        'actorEmailMasked',
        'actorName',
        'id',
        'ipMasked',
        'occurredAt',
        'outcome',
        'resource',
        'summary',
      ].sort(),
    )
  })

  it('records successful business mutations in the shared audit source', async () => {
    const announcement = await post<AnnouncementRecord>('/announcements', {
      title: 'Audited change',
      content: '<p>This creation should be visible in operation logs.</p>',
      priority: 'normal',
    })
    const response = await get<OperationLogListResponse>('/operation-logs', {
      action: 'create',
      resource: 'announcement',
    })

    expect(response.items[0]).toMatchObject({
      actorName: '内容编辑',
      actorEmailMasked: 'e***@e***.com',
      action: 'create',
      resource: 'announcement',
      outcome: 'success',
      summary: `Created announcement ${announcement.id}.`,
    })
  })

  it('rejects audit-log reads when Content access exists without AuditLog access', async () => {
    sessionStorage.setItem('auth_token', generateMockToken(3))

    await expect(get('/operation-logs')).rejects.toMatchObject({
      code: 'FORBIDDEN',
      status: 403,
    })
  })
})
