export function maskIpAddress(ipAddress: string): string {
  const octets = ipAddress.split('.')
  if (octets.length !== 4)
    return '****'

  // AI modified: observers receive only a coarse private-network prefix for diagnostics.
  return `${octets[0]}.${octets[1]}.*.*`
}

export function maskDisplayName(displayName: string): string {
  const firstCharacter = [...displayName.trim()][0]
  return firstCharacter ? `${firstCharacter}***` : '***'
}
