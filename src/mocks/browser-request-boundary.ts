interface UnhandledRequestPrinter {
  error: () => void
}

export function reportUnhandledBrowserRequest(
  request: Request,
  print: UnhandledRequestPrinter,
  applicationOrigin: string,
): void {
  const requestUrl = new URL(request.url)
  const isApplicationApiRequest
    = requestUrl.origin === applicationOrigin
      && (requestUrl.pathname === '/api' || requestUrl.pathname.startsWith('/api/'))

  // AI modified: keep missing API mocks fatal without blocking Vite modules or public assets.
  if (isApplicationApiRequest)
    print.error()
}
