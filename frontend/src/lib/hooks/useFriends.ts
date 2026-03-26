import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import type { Database } from '../database.types'

export type FriendRow = Database['public']['Tables']['friends']['Row']
export type FriendInsert = Database['public']['Tables']['friends']['Insert']

export function useFriends() {
  const { user } = useAuth()
  const [friends, setFriends] = useState<FriendRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('friends')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setFriends((data ?? []).map(f => ({
      ...f,
      day_count: f.met_date
        ? Math.max(0, Math.floor((Date.now() - new Date(f.met_date).getTime()) / 86400000))
        : f.day_count,
    })))
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const createFriend = async (input: Omit<FriendInsert, 'user_id'>) => {
    if (!user) return { error: 'Not authenticated' }

    // Ensure the profile row exists (safety net for users who signed up
    // before schema.sql was run — the trigger would have missed them)
    await supabase.from('profiles').upsert(
      { id: user.id, email: user.email ?? '' },
      { onConflict: 'id', ignoreDuplicates: true }
    )

    const { error } = await supabase.from('friends').insert({ ...input, user_id: user.id })
    if (!error) await load()
    return { error: error?.message ?? null }
  }

  const deleteFriend = async (id: string) => {
    const { error } = await supabase.from('friends').delete().eq('id', id)
    if (!error) setFriends(prev => prev.filter(f => f.id !== id))
    return { error: error?.message ?? null }
  }

  const updateFriend = async (id: string, updates: Database['public']['Tables']['friends']['Update']) => {
    const { error } = await supabase.from('friends').update(updates).eq('id', id)
    if (!error) await load()
    return { error: error?.message ?? null }
  }

  const toggleStar = async (id: string, starred: boolean) => {
    setFriends(prev => prev.map(f => f.id === id ? { ...f, starred } as any : f))
    await supabase.from('friends').update({ starred } as any).eq('id', id)
  }

  return { friends, loading, error, createFriend, deleteFriend, updateFriend, toggleStar, reload: load }
}
