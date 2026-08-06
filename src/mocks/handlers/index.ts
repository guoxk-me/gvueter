import { announcementHandlers } from './announcements'
import { authHandlers } from './auth'
import { componentGalleryUploadHandlers } from './component-gallery-uploads'
import { contentFileHandlers } from './content-files'
import { contractScenarioHandlers } from './contract-scenarios'
import { dashboardHandlers } from './dashboard'
import { departmentHandlers } from './departments'
import { dictionaryHandlers } from './dictionaries'
import { formWorkbenchHandlers } from './form-workbench'
import { managedMenuHandlers } from './menus'
import { monitoringHandlers } from './monitoring'
import { navigationHandlers } from './navigation'
import { notificationHandlers } from './notifications'
import { operationLogHandlers } from './operation-logs'
import { positionHandlers } from './positions'
import { roleHandlers } from './roles'
import { ssoHandlers } from './sso'
import { systemConfigHandlers } from './system-config'
import { systemParameterHandlers } from './system-parameters'
import { uploadPolicyHandlers } from './upload-policy'
import { userHandlers } from './users'

export const handlers = [
  ...announcementHandlers,
  ...authHandlers,
  ...contentFileHandlers,
  ...componentGalleryUploadHandlers,
  ...contractScenarioHandlers,
  ...dashboardHandlers,
  ...departmentHandlers,
  ...dictionaryHandlers,
  ...formWorkbenchHandlers,
  ...positionHandlers,
  ...managedMenuHandlers,
  ...monitoringHandlers,
  ...navigationHandlers,
  ...notificationHandlers,
  ...operationLogHandlers,
  ...roleHandlers,
  ...ssoHandlers,
  ...systemConfigHandlers,
  ...systemParameterHandlers,
  ...uploadPolicyHandlers,
  ...userHandlers,
]
