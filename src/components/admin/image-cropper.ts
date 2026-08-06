export interface CropSourceRectangle {
  height: number
  width: number
  x: number
  y: number
}

function clamp(number: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(number, minimum), maximum)
}

export function getCropSourceRectangle(
  imageWidth: number,
  imageHeight: number,
  aspectRatio: number,
  zoom: number,
  horizontalPosition: number,
  verticalPosition: number,
): CropSourceRectangle {
  if (imageWidth <= 0 || imageHeight <= 0 || aspectRatio <= 0)
    throw new RangeError('Image dimensions and aspect ratio must be positive')

  const sourceAspectRatio = imageWidth / imageHeight
  const baseWidth = sourceAspectRatio > aspectRatio ? imageHeight * aspectRatio : imageWidth
  const baseHeight = sourceAspectRatio > aspectRatio ? imageHeight : imageWidth / aspectRatio
  const safeZoom = clamp(zoom, 1, 4)
  const width = baseWidth / safeZoom
  const height = baseHeight / safeZoom
  const baseX = (imageWidth - baseWidth) / 2
  const baseY = (imageHeight - baseHeight) / 2
  const xTravel = baseWidth - width
  const yTravel = baseHeight - height

  // AI modified: map the two controlled position axes into the remaining source travel after zoom.
  return {
    x: baseX + xTravel * ((clamp(horizontalPosition, -1, 1) + 1) / 2),
    y: baseY + yTravel * ((clamp(verticalPosition, -1, 1) + 1) / 2),
    width,
    height,
  }
}
