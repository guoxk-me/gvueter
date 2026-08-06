export function maskEmail(email: string): string {
  const separatorIndex = email.lastIndexOf('@')
  if (separatorIndex <= 0 || separatorIndex === email.length - 1) return '***'

  const localPart = email.slice(0, separatorIndex)
  const domainParts = email.slice(separatorIndex + 1).split('.')
  const domainName = domainParts[0] ?? ''
  const suffix = domainParts.length > 1 ? `.${domainParts[domainParts.length - 1]}` : ''

  // AI modified: reveal only stable recognition hints; authorization still belongs to the API.
  return `${localPart.slice(0, 1)}***@${domainName.slice(0, 1)}***${suffix}`
}
