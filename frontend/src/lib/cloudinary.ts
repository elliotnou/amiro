const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

/** Compress + resize a file client-side before upload. Caps to maxWidth and quality. */
async function compressImage(file: File, maxWidth = 1200, quality = 0.82): Promise<Blob> {
  return new Promise((resolve) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(objectUrl)
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob ?? file), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(file) }
    img.src = objectUrl
  })
}

export async function uploadImage(
  file: File,
  opts: { maxWidth?: number; quality?: number } = {}
): Promise<string> {
  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary credentials not configured')
  }

  const compressed = await compressImage(file, opts.maxWidth ?? 1200, opts.quality ?? 0.82)

  const formData = new FormData()
  formData.append('file', compressed)
  formData.append('upload_preset', uploadPreset)

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData },
  )

  if (!res.ok) throw new Error('Image upload failed')

  const data = await res.json()
  return data.secure_url as string
}

/** Build an optimized Cloudinary URL from a public ID or existing URL. */
export function imageUrl(publicId: string, opts?: { width?: number; height?: number }): string {
  if (!cloudName) return publicId
  const transforms = []
  if (opts?.width) transforms.push(`w_${opts.width}`)
  if (opts?.height) transforms.push(`h_${opts.height}`)
  transforms.push('c_fill', 'q_auto', 'f_auto')
  return `https://res.cloudinary.com/${cloudName}/image/upload/${transforms.join(',')}/${publicId}`
}
