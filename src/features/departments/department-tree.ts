import type { DepartmentRecord, DepartmentTreeNode } from './types'

function sortDepartmentBranches(departments: DepartmentTreeNode[]): void {
  departments.sort(
    (leftDepartment, rightDepartment) =>
      leftDepartment.order - rightDepartment.order ||
      leftDepartment.name.localeCompare(rightDepartment.name),
  )
  for (const department of departments) sortDepartmentBranches(department.children)
}

/**
 * Resolves a flat backend list into a stable hierarchy while retaining orphaned records at root.
 */
export function getDepartmentTree(departments: readonly DepartmentRecord[]): DepartmentTreeNode[] {
  const departmentsById = new Map<string, DepartmentTreeNode>()
  for (const department of departments)
    departmentsById.set(department.id, { ...department, children: [] })

  const rootDepartments: DepartmentTreeNode[] = []
  for (const department of departmentsById.values()) {
    const parentDepartment = department.parentId
      ? departmentsById.get(department.parentId)
      : undefined
    if (parentDepartment && parentDepartment.id !== department.id)
      parentDepartment.children.push(department)
    else rootDepartments.push(department)
  }

  sortDepartmentBranches(rootDepartments)
  return rootDepartments
}

export function getDepartmentDescendantIds(
  departments: readonly DepartmentRecord[],
  departmentId: string,
): Set<string> {
  const descendantIds = new Set<string>()
  const pendingDepartmentIds = [departmentId]

  while (pendingDepartmentIds.length) {
    const parentId = pendingDepartmentIds.pop()
    for (const department of departments) {
      if (department.parentId === parentId && !descendantIds.has(department.id)) {
        descendantIds.add(department.id)
        pendingDepartmentIds.push(department.id)
      }
    }
  }

  return descendantIds
}
