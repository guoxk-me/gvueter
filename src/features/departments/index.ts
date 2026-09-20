// AI modified: role scopes consume only the department record, hierarchy lookup, and boundary schema.
export { DEPARTMENT_RECORD_SCHEMA } from './department-api-contracts'
export { getDepartmentDescendantIds, getDepartmentTree } from './department-tree'
export type { DepartmentRecord, DepartmentTreeNode } from './types'
