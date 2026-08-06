const NAVIGATION_ROUTE_NAME_PATTERN = /^[a-z][a-z0-9-]*$/i
const NAVIGATION_ROUTE_SEGMENT_PATTERN = /^[\w~-]+$/

export function isNavigationRouteName(routeName: unknown): routeName is string {
  return typeof routeName === 'string' && NAVIGATION_ROUTE_NAME_PATTERN.test(routeName.trim())
}

export function getNavigationRoutePath(
  requestedPath: unknown,
  parentPath: string,
): string | undefined {
  if (typeof requestedPath !== 'string') return undefined

  const routePath = requestedPath.trim()
  if (!routePath) return parentPath || undefined

  if (/^[a-z][a-z\d+.-]*:/i.test(routePath) || routePath.includes('\\')) return undefined

  const sourcePath = routePath.startsWith('/') ? routePath : `${parentPath || ''}/${routePath}`
  const routeSegments = sourcePath.split('/').filter(Boolean)

  // AI modified: saved and runtime routes share one static-segment policy, blocking traversal and URL syntax.
  if (
    routeSegments.length === 0 ||
    routeSegments.some(
      (routeSegment) =>
        routeSegment === '.' ||
        routeSegment === '..' ||
        !NAVIGATION_ROUTE_SEGMENT_PATTERN.test(routeSegment),
    )
  ) {
    return undefined
  }

  return `/${routeSegments.join('/')}`
}
