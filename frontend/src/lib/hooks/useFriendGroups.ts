import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'
import type { Database } from '../database.types'

type GroupRow = Database['public']['Tables']['friend_groups']['Row']
type GroupInsert = Database['public']['Tables']['friend_groups']['Insert']
type MemberRow = Database['public']['Tables']['friend_group_members']['Row']

export type FriendGroupWithMembers = GroupRow & {
  memberIds: string[]
}

export function useFriendGroups() {
  const { user } = useAuth()
  const [groups, setGroups] = useState<FriendGroupWithMembers[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user) return
    setLoading(true)

    const { data: groupData } = await supabase
      .from('friend_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    const { data: memberData } = await supabase
      .from('friend_group_members')
      .select('*')

    const membersByGroup: Record<string, string[]> = {}
    for (const m of (memberData ?? []) as MemberRow[]) {
      if (!membersByGroup[m.group_id]) membersByGroup[m.group_id] = []
      membersByGroup[m.group_id].push(m.friend_id)
    }

    setGroups(
      (groupData ?? []).map(g => ({
        ...g,
        memberIds: membersByGroup[g.id] ?? [],
      }))
    )
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const createGroup = async (input: Omit<GroupInsert, 'user_id'>, friendIds: string[]) => {
    if (!user) return { error: 'Not authenticated' }
    const { data, error } = await supabase
      .from('friend_groups')
      .insert({ ...input, user_id: user.id })
      .select()
      .single()
    if (error || !data) return { error: error?.message ?? 'Failed' }

    if (friendIds.length > 0) {
      await supabase.from('friend_group_members').insert(
        friendIds.map(fid => ({ group_id: data.id, friend_id: fid }))
      )
    }
    await load()
    return { error: null, id: data.id }
  }

  const updateGroup = async (
    id: string,
    updates: Database['public']['Tables']['friend_groups']['Update'],
    newMemberIds?: string[]
  ) => {
    const { error } = await supabase.from('friend_groups').update(updates).eq('id', id)
    if (error) return { error: error.message }

    if (newMemberIds !== undefined) {
      await supabase.from('friend_group_members').delete().eq('group_id', id)
      if (newMemberIds.length > 0) {
        await supabase.from('friend_group_members').insert(
          newMemberIds.map(fid => ({ group_id: id, friend_id: fid }))
        )
      }
    }
    await load()
    return { error: null }
  }

  const deleteGroup = async (id: string) => {
    const { error } = await supabase.from('friend_groups').delete().eq('id', id)
    if (!error) setGroups(prev => prev.filter(g => g.id !== id))
    return { error: error?.message ?? null }
  }

  const addMember = async (groupId: string, friendId: string) => {
    const { error } = await supabase
      .from('friend_group_members')
      .insert({ group_id: groupId, friend_id: friendId })
    if (!error) {
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, memberIds: [...g.memberIds, friendId] } : g
      ))
    }
    return { error: error?.message ?? null }
  }

  const removeMember = async (groupId: string, friendId: string) => {
    const { error } = await supabase
      .from('friend_group_members')
      .delete()
      .eq('group_id', groupId)
      .eq('friend_id', friendId)
    if (!error) {
      setGroups(prev => prev.map(g =>
        g.id === groupId ? { ...g, memberIds: g.memberIds.filter(id => id !== friendId) } : g
      ))
    }
    return { error: error?.message ?? null }
  }

  return { groups, loading, createGroup, updateGroup, deleteGroup, addMember, removeMember, reload: load }
}
