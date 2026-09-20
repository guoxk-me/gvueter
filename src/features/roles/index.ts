// AI modified: authorization snapshot readers share only the role constants and data-scope schema.
export {
  getDataScopeConditions,
  type ScopedUserRecord,
} from './data-scope'
export { DATA_SCOPE_GRANT_SCHEMA } from './role-api-contracts'
export type {
  PermissionAction,
  PermissionSubject,
} from './types'
export { PERMISSION_ACTIONS, PERMISSION_SUBJECTS } from './types'
