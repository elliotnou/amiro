import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import { uploadImage } from '../cloudinary'
import type { Database } from '../database.types'

export type GalleryImageRow = Database['public']['Tables']['gallery_images']['Row']

export function useGallery(friendId?: string, hangoutId?: string) {
  const { user } = useAuth()
  const [images, setImages] = useState<GalleryImageRow[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  const load = useCallback(async () => {
    if (!user) return
    let q = supabase.from('gallery_images').select('*').order('created_at', { ascending: true })
    if (hangoutId) q = q.eq('hangout_id', hangoutId)
    else if (friendId) q = q.eq('friend_id', friendId)
    const { data } = await q
    setImages(data ?? [])
    setLoading(false)
  }, [user, friendId, hangoutId])

  useEffect(() => { load() }, [load])

  const uploadPhoto = async (file: File, opts?: { hangoutId?: string; caption?: string }) => {
    if (!user) return { error: 'Not authenticated' }
    setUploading(true)
    try {
      const url = await uploadImage(file, { maxWidth: 1400, quality: 0.84 })
      const { error } = await supabase.from('gallery_images').insert({
        user_id: user.id,
        friend_id: friendId ?? null,
        hangout_id: opts?.hangoutId ?? hangoutId ?? null,
        url,
        caption: opts?.caption ?? null,
      })
      if (!error) await load()
      return { error: error?.message ?? null, url }
    } catch (e: any) {
      return { error: e.message }
    } finally {
      setUploading(false)
    }
  }

  const deleteImage = async (id: string) => {
    await supabase.from('gallery_images').delete().eq('id', id)
    setImages(prev => prev.filter(img => img.id !== id))
  }

  return { images, loading, uploading, uploadPhoto, deleteImage, reload: load }
}
