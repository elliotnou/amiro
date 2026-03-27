import type { FriendRow } from './hooks/useFriends'
import type { FriendGroupWithMembers } from './hooks/useFriendGroups'
import type { HangoutWithFriends } from './hooks/useHangouts'

export interface PathEdge {
  from: string
  to: string
  label: string
  type: 'group' | 'met-through' | 'hangout'
  color?: string
}

export interface PathStep {
  friendId: string
  edge: PathEdge | null // null for the starting node
}

/**
 * BFS shortest path between two friends across three edge types:
 * 1. Shared group membership
 * 2. met_through_id introduction chains
 * 3. Hangout co-attendance
 */
export function findConnectionPath(
  fromId: string,
  toId: string,
  friends: FriendRow[],
  groups: FriendGroupWithMembers[],
  hangouts: HangoutWithFriends[],
): PathStep[] | null {
  if (fromId === toId) return [{ friendId: fromId, edge: null }]

  // Build adjacency list: friendId -> [{ neighbor, edge }]
  const adj = new Map<string, { neighbor: string; edge: PathEdge }[]>()

  const addEdge = (a: string, b: string, edge: Omit<PathEdge, 'from' | 'to'>) => {
    if (!adj.has(a)) adj.set(a, [])
    if (!adj.has(b)) adj.set(b, [])
    adj.get(a)!.push({ neighbor: b, edge: { ...edge, from: a, to: b } })
    adj.get(b)!.push({ neighbor: a, edge: { ...edge, from: b, to: a } })
  }

  // 1. Group edges — friends sharing a group
  for (const group of groups) {
    const members = group.memberIds
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        addEdge(members[i], members[j], {
          label: group.name,
          type: 'group',
          color: group.color,
        })
      }
    }
  }

  // 2. Met-through edges
  for (const friend of friends) {
    const metThrough = (friend as any).met_through_id as string | null
    if (metThrough) {
      const introducer = friends.find(f => f.id === metThrough)
      if (introducer) {
        addEdge(friend.id, metThrough, {
          label: `introduced by ${introducer.name}`,
          type: 'met-through',
        })
      }
    }
  }

  // 3. Hangout co-attendance edges
  for (const hangout of hangouts) {
    const attendees = hangout.hangout_friends.map(hf => hf.friend_id)
    const label = [hangout.type, hangout.date].filter(Boolean).join(' · ')
    for (let i = 0; i < attendees.length; i++) {
      for (let j = i + 1; j < attendees.length; j++) {
        addEdge(attendees[i], attendees[j], {
          label,
          type: 'hangout',
        })
      }
    }
  }

  // BFS
  const visited = new Set<string>([fromId])
  const parent = new Map<string, { friendId: string; edge: PathEdge }>()
  const queue: string[] = [fromId]

  while (queue.length > 0) {
    const current = queue.shift()!
    for (const { neighbor, edge } of adj.get(current) ?? []) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      parent.set(neighbor, { friendId: current, edge })
      if (neighbor === toId) {
        // Reconstruct path
        const path: PathStep[] = []
        let node = toId
        while (node !== fromId) {
          const p = parent.get(node)!
          path.unshift({ friendId: node, edge: p.edge })
          node = p.friendId
        }
        path.unshift({ friendId: fromId, edge: null })
        return path
      }
      queue.push(neighbor)
    }
  }

  return null // no path found
}
