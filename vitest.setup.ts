import { afterAll, afterEach, beforeAll } from 'vitest'
import { resetRoleDefinitions } from './src/features/roles/role-policy'
import { resetMockDashboardData } from './src/mocks/data/dashboard'
import { resetMockUsers } from './src/mocks/data/users'
import { resetMockAnnouncements } from './src/mocks/handlers/announcements'
import { resetMockAuthentication } from './src/mocks/handlers/auth'
import { resetComponentGalleryUploads } from './src/mocks/handlers/component-gallery-uploads'
import { resetMockContentFiles } from './src/mocks/handlers/content-files'
import { resetMockDepartments } from './src/mocks/handlers/departments'
import { resetMockDictionaries } from './src/mocks/handlers/dictionaries'
import { resetMockFormWorkbench } from './src/mocks/handlers/form-workbench'
import { resetMockManagedMenus } from './src/mocks/handlers/menus'
import { resetMockMonitoring } from './src/mocks/handlers/monitoring'
import { resetMockNotifications } from './src/mocks/handlers/notifications'
import { resetMockOperationLogs } from './src/mocks/handlers/operation-logs'
import { resetMockPositions } from './src/mocks/handlers/positions'
import { resetMockSystemConfig } from './src/mocks/handlers/system-config'
import { resetMockSystemParameters } from './src/mocks/handlers/system-parameters'
import { server } from './src/mocks/node'

// 所有测试开始前启动 MSW server
// AI modified: missing handlers fail tests so API contract drift cannot silently hit the network.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))

// 每个测试结束后重置 handlers，避免测试间污染
afterEach(() => {
  server.resetHandlers()
  resetRoleDefinitions()
  resetMockUsers()
  resetMockDashboardData()
  resetMockAuthentication()
  resetMockAnnouncements()
  resetMockContentFiles()
  resetMockDepartments()
  // AI modified: chunk receipts and one-shot failures must not leak between upload lifecycle tests.
  resetComponentGalleryUploads()
  resetMockDictionaries()
  resetMockFormWorkbench()
  resetMockManagedMenus()
  resetMockMonitoring()
  resetMockNotifications()
  resetMockOperationLogs()
  resetMockPositions()
  resetMockSystemConfig()
  resetMockSystemParameters()
})

// 所有测试结束后关闭 server
afterAll(() => server.close())
