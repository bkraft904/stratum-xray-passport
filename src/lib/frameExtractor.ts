export interface Frame {
  data: string
  mediaType: 'image/jpeg'
}

const MAX_DIMENSION = 1568
const JPEG_QUALITY = 0.85

function canvasToFrame(canvas: HTMLCanvasElement): Frame {
  const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
  return { data: dataUrl.split(',')[1] ?? '', mediaType: 'image/jpeg' }
}

function drawResized(source: CanvasImageSource, sourceWidth: number, sourceHeight: number): HTMLCanvasElement {
  const scale = Math.min(1, MAX_DIMENSION / Math.max(sourceWidth, sourceHeight))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sourceWidth * scale)
  canvas.height = Math.round(sourceHeight * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

export async function imageFileToFrame(file: File): Promise<Frame> {
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = drawResized(bitmap, bitmap.width, bitmap.height)
    return canvasToFrame(canvas)
  } finally {
    bitmap.close()
  }
}

export async function extractFramesFromVideo(file: File, count = 4): Promise<Frame[]> {
  const url = URL.createObjectURL(file)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve()
      video.onerror = () => reject(new Error('Could not read video metadata — the file may be corrupt or an unsupported codec.'))
    })

    const duration = video.duration
    if (!isFinite(duration) || duration <= 0) {
      throw new Error('Video has no readable duration.')
    }

    const fractions = Array.from({ length: count }, (_, i) => (i + 1) / (count + 1))
    const frames: Frame[] = []

    for (const fraction of fractions) {
      const time = Math.min(duration - 0.05, Math.max(0, duration * fraction))
      await new Promise<void>((resolve, reject) => {
        const onSeeked = () => {
          video.removeEventListener('seeked', onSeeked)
          resolve()
        }
        video.addEventListener('seeked', onSeeked)
        video.onerror = () => reject(new Error('Error seeking video frame.'))
        video.currentTime = time
      })
      const canvas = drawResized(video, video.videoWidth, video.videoHeight)
      frames.push(canvasToFrame(canvas))
    }

    return frames
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/')
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}
