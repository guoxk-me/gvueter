import type { PaginationState } from '@tanstack/vue-table'

const defaultPageSize = 10

// AI modified: ProTable and DataTable share one validation and clamping contract.
export function getAllowedPageSizes(pageSizeOptions: readonly number[]): readonly number[] {
  const allowedPageSizes = [...new Set(pageSizeOptions)]
    .filter(pageSize => Number.isSafeInteger(pageSize) && pageSize > 0)
    .sort((left, right) => left - right)

  return allowedPageSizes.length > 0 ? allowedPageSizes : [defaultPageSize]
}

export function getAcceptedPageSize(
  pageSizeInput: unknown,
  allowedPageSizes: readonly number[],
): number | undefined {
  if (!['bigint', 'number', 'string'].includes(typeof pageSizeInput))
    return undefined

  const pageSize = Number(pageSizeInput)
  return Number.isSafeInteger(pageSize) && allowedPageSizes.includes(pageSize)
    ? pageSize
    : undefined
}

export function getTablePageCount(totalRows: number, pageSize: number): number {
  const safeTotalRows = Number.isFinite(totalRows) ? Math.max(Math.trunc(totalRows), 0) : 0
  const safePageSize = Number.isSafeInteger(pageSize) && pageSize > 0 ? pageSize : defaultPageSize
  return Math.max(Math.ceil(safeTotalRows / safePageSize), 1)
}

export function getClampedPageIndex(pageIndex: number, pageCount: number): number {
  const lastPageIndex = Math.max(Math.trunc(pageCount) - 1, 0)
  const safePageIndex = Number.isSafeInteger(pageIndex) ? pageIndex : 0
  return Math.min(Math.max(safePageIndex, 0), lastPageIndex)
}

export function getClampedPagination(
  pagination: PaginationState,
  pageCount: number,
): PaginationState {
  return {
    pageIndex: getClampedPageIndex(pagination.pageIndex, pageCount),
    pageSize: pagination.pageSize,
  }
}
