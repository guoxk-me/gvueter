export type FileUploadRejectReason
  = | 'duplicate'
    | 'invalid-file-name'
    | 'invalid-type'
    | 'max-files'
    | 'file-too-large'

export interface FileUploadEntry {
  id: string
  file: File
}

export interface FileUploadRejection {
  file: File
  reason: FileUploadRejectReason
}

export interface FileUploadTypePolicy {
  accept?: string
  allowedExtensions?: readonly string[]
  allowedMimeTypes?: readonly string[]
}

// AI modified: reject ambiguous or path-like names before they reach multipart handling.
export function isUploadFileNameSafe(fileName: string): boolean {
  const requestedName = fileName.trim()
  const hasControlCharacter = [...requestedName].some((character) => {
    const characterCode = character.charCodeAt(0)
    return characterCode < 32 || characterCode === 127
  })
  return (
    requestedName.length > 0
    && requestedName.length <= 180
    && requestedName === fileName
    && requestedName !== '.'
    && requestedName !== '..'
    && !hasControlCharacter
    && !/[\\/]/.test(requestedName)
    && !/[. ]$/.test(requestedName)
  )
}

// AI modified: exact extension and MIME allowlists supplement the browser-only accept hint.
export function isUploadFileTypeAllowed(file: File, policy: FileUploadTypePolicy): boolean {
  const lowerName = file.name.toLowerCase()
  const lowerType = file.type.toLowerCase()
  const acceptRules = (policy.accept ?? '')
    .split(',')
    .map(rule => rule.trim().toLowerCase())
    .filter(Boolean)
  const isAcceptedByInput
    = acceptRules.length === 0
      || acceptRules.some((rule) => {
        if (rule.startsWith('.'))
          return lowerName.endsWith(rule)
        if (rule.endsWith('/*'))
          return lowerType.startsWith(rule.slice(0, -1))
        return lowerType === rule
      })
  const allowedExtensions = (policy.allowedExtensions ?? []).map(extension =>
    extension.toLowerCase().startsWith('.')
      ? extension.toLowerCase()
      : `.${extension.toLowerCase()}`,
  )
  const allowedMimeTypes = (policy.allowedMimeTypes ?? []).map(mimeType => mimeType.toLowerCase())

  return (
    isAcceptedByInput
    && (allowedExtensions.length === 0
      || allowedExtensions.some(extension => lowerName.endsWith(extension)))
    && (allowedMimeTypes.length === 0 || allowedMimeTypes.includes(lowerType))
  )
}
