import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import type { Database } from '../database.types'

export type HangoutRow = Database['public']['Tables']['hangouts']['Row']
export type HangoutFriendRow = Database['public']['Tables']['hangout_friends']['Row']

export interface HangoutGroupTag {
  id: string
  group_id: string
  group_name: string
  group_color: string
  group_avatar_url: string | null
}

export interface HangoutWithFriends extends HangoutRow {
  hangout_friends: (HangoutFriendRow & { friend_name: string; avatar_color?: string; avatar_url?: string | null })[]
  hangout_groups: HangoutGroupTag[]
}

export function useHangouts() {
  const { user } = useAuth()
  const [hangouts, setHangouts] = useState<HangoutWithFriends[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)
    // Fetch hangouts + their friend links + friend names in one go
    const { data, error } = await supabase
      .from('hangouts')
      .select(`
        *,
        hangout_friends (
          id,
          friend_id,
          feeling_label,
          friends ( name )
        )
      `)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })

    if (error) { setError(error.message); setLoading(false); return }

    // Try to fetch group tags separately — gracefully skip if table doesn't exist yet
    const groupsMap: Record<string, HangoutGroupTag[]> = {}
    try {
      const { data: hgData } = await supabase
        .from('hangout_groups')
        .select('id, hangout_id, group_id, friend_groups ( name, color, avatar_url )')
      for (const hg of (hgData ?? []) as any[]) {
        if (!groupsMap[hg.hangout_id]) groupsMap[hg.hangout_id] = []
        groupsMap[hg.hangout_id].push({
          id: hg.id,
          group_id: hg.group_id,
          group_name: hg.friend_groups?.name ?? '',
          group_color: hg.friend_groups?.color ?? '#457b9d',
          group_avatar_url: hg.friend_groups?.avatar_url ?? null,
        })
      }
    } catch { /* table not yet migrated — skip */ }

    const shaped: HangoutWithFriends[] = (data ?? []).map((h: any) => ({
      ...h,
      hangout_friends: (h.hangout_friends ?? []).map((hf: any) => ({
        ...hf,
        friend_name: hf.friends?.name ?? '',
      })),
      hangout_groups: groupsMap[h.id] ?? [],
    }))
    setHangouts(shaped)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const createHangout = async (
    input: { type: string; location: string; date: string; highlights?: string; follow_ups?: string[]; rating?: number | null; tags?: string[] },
    friendIds: { id: string; feeling_label?: string }[],
    groupIds: string[] = []
  ) => {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('hangouts')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (error) return { error: error.message }

    if (friendIds.length > 0) {
      await supabase.from('hangout_friends').insert(
        friendIds.map(f => ({ hangout_id: data.id, friend_id: f.id, feeling_label: f.feeling_label }))
      )
    }
    if (groupIds.length > 0) {
      await supabase.from('hangout_groups').insert(
        groupIds.map(gid => ({ hangout_id: data.id, group_id: gid }))
      )
    }
    await load()
    return { error: null, id: data.id }
  }

  const deleteHangout = async (id: string) => {
    const { error } = await supabase.from('hangouts').delete().eq('id', id)
    if (!error) setHangouts(prev => prev.filter(h => h.id !== id))
    return { error: error?.message ?? null }
  }

  const updateHangout = async (
    id: string,
    updates: { type?: string; location?: string; date?: string; highlights?: string | null; follow_ups?: string[]; rating?: number | null; tags?: string[] },
    friendIds?: string[],
    groupIds?: string[]
  ) => {
    const { error } = await supabase.from('hangouts').update(updates).eq('id', id)
    if (friendIds !== undefined) {
      await supabase.from('hangout_friends').delete().eq('hangout_id', id)
      if (friendIds.length > 0) {
        await supabase.from('hangout_friends').insert(friendIds.map(fid => ({ hangout_id: id, friend_id: fid })))
      }
    }
    if (groupIds !== undefined) {
      await supabase.from('hangout_groups').delete().eq('hangout_id', id)
      if (groupIds.length > 0) {
        await supabase.from('hangout_groups').insert(groupIds.map(gid => ({ hangout_id: id, group_id: gid })))
      }
    }
    if (!error) await load()
    return { error: error?.message ?? null }
  }

  return { hangouts, loading, error, createHangout, deleteHangout, updateHangout, reload: load }
}

export function useHangout(id: string | undefined) {
  const [hangout, setHangout] = useState<HangoutWithFriends | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!id) return
    const { data } = await supabase
      .from('hangouts')
      .select(`*, hangout_friends (id, friend_id, feeling_label, friends (name, avatar_color, avatar_url))`)
      .eq('id', id)
      .single()
    if (data) {
      let hangoutGroups: HangoutGroupTag[] = []
      try {
        const { data: hgData } = await supabase
          .from('hangout_groups')
          .select('id, group_id, friend_groups (name, color, avatar_url)')
          .eq('hangout_id', id)
        hangoutGroups = ((hgData ?? []) as any[]).map((hg: any) => ({
          id: hg.id,
          group_id: hg.group_id,
          group_name: hg.friend_groups?.name ?? '',
          group_color: hg.friend_groups?.color ?? '#457b9d',
          group_avatar_url: hg.friend_groups?.avatar_url ?? null,
        }))
      } catch { /* skip */ }

      setHangout({
        ...data,
        hangout_friends: ((data as any).hangout_friends ?? []).map((hf: any) => ({
          ...hf,
          friend_name: hf.friends?.name ?? '',
          avatar_color: hf.friends?.avatar_color ?? 'var(--accent)',
          avatar_url: hf.friends?.avatar_url ?? null,
        })),
        hangout_groups: hangoutGroups,
      })
    }
    setLoading(false)
  }, [id])

  useEffect(() => { load() }, [load])

  return { hangout, loading, reload: load }
}
