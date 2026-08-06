export const DEPARTMENT_STATUSES = ['active', 'disabled'] as const

export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number]

export interface DepartmentRecord {
  id: string
  name: string
  parentId: string | null
  order: number
  status: DepartmentStatus
}

export interface DepartmentInput {
  name: string
  parentId: string | null
  order: number
  status: DepartmentStatus
}

export interface DepartmentListResponse {
  items: DepartmentRecord[]
}

export interface DepartmentTreeNode extends DepartmentRecord {
  children: DepartmentTreeNode[]
}
