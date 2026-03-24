import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import type { Database } from '../database.types'

export type ImpressionRow = Database['public']['Tables']['impressions']['Row']

export function useImpressions(friendId: string | undefined) {
  const { user } = useAuth()
  const [impressions, setImpressions] = useState<ImpressionRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!friendId || !user) return
    const { data } = await supabase
      .from('impressions')
      .select('*')
      .eq('friend_id', friendId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
    setImpressions(data ?? [])
    setLoading(false)
  }, [friendId, user])

  useEffect(() => { load() }, [load])

  const createImpression = async (title: string, body: string, hiddenFromAI = false) => {
    if (!user || !friendId) return
    await supabase.from('impressions').insert({
      user_id: user.id,
      friend_id: friendId,
      title,
      body,
      date: new Date().toISOString().slice(0, 10),
      hidden_from_ai: hiddenFromAI,
    })
    await load()
  }

  const updateImpression = async (id: string, title: string, body: string, hiddenFromAI?: boolean) => {
    const updates: Record<string, unknown> = { title, body }
    if (hiddenFromAI !== undefined) updates.hidden_from_ai = hiddenFromAI
    await supabase.from('impressions').update(updates).eq('id', id)
    setImpressions(prev => prev.map(i => i.id === id ? { ...i, title, body, ...(hiddenFromAI !== undefined ? { hidden_from_ai: hiddenFromAI } : {}) } : i))
  }

  const deleteImpression = async (id: string) => {
    await supabase.from('impressions').delete().eq('id', id)
    setImpressions(prev => prev.filter(i => i.id !== id))
  }

  return { impressions, loading, createImpression, updateImpression, deleteImpression }
}
