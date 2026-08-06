export const QR_CODE_ERROR_LEVELS = ['L', 'M', 'Q', 'H'] as const
export type QrCodeErrorLevel = (typeof QR_CODE_ERROR_LEVELS)[number]

export function getQrCodeDownloadName(fileName: string): string {
  const pathSegments = fileName.split(/[\\/]/)
  const safeName = pathSegments[pathSegments.length - 1]
    ?.replace(/[^\w.-]+/g, '-')
    .replace(/^\.+/, '')
    .slice(0, 120)
  const baseName = safeName || 'qr-code'
  return baseName.toLocaleLowerCase().endsWith('.png') ? baseName : `${baseName}.png`
}
