export interface TabCloseCandidate {
  id: string
  isAffix: boolean
}

/**
 * Chooses the adjacent tab without mutating the persisted tab collection.
 */
export function getActiveTabIdAfterClose(
  tabs: readonly TabCloseCandidate[],
  activeTabId: string | null,
  closingTabId: string,
): string | null {
  const closingTabIndex = tabs.findIndex((tab) => tab.id === closingTabId)
  const closingTab = tabs[closingTabIndex]

  if (!closingTab || closingTab.isAffix || activeTabId !== closingTabId) return activeTabId

  const remainingTabs = tabs.filter((tab) => tab.id !== closingTabId)
  return remainingTabs[Math.min(closingTabIndex, remainingTabs.length - 1)]?.id ?? null
}
