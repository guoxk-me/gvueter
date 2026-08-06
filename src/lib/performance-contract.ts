import performanceBudget from './performance-budget.json'

export interface PerformanceBudget {
  virtualTableRowThreshold: number
  lazyTreeNodeThreshold: number
  keepAliveMax: number
  entryGzipBytes: number
  asyncChunkGzipBytes: number
  firstScreenMilliseconds: number
  routeTransitionMilliseconds: number
  layoutTransitionMilliseconds: number
  interactionMilliseconds: number
}

// AI modified: runtime choices, documentation, tests, and the build gate share one explicit budget file.
export const PERFORMANCE_BUDGET: Readonly<PerformanceBudget> = Object.freeze(performanceBudget)
