import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'
import AddFriendFlow from '../components/AddFriendFlow'
import type { AddFriendPayload } from '../components/AddFriendFlow'
import { IconSearch, IconUserPlus, IconPlus, IconStar } from '../components/Icons'

type SortKey = 'recent' | 'first-name' | 'last-name' | 'most-hangs' | 'longest' | 'tier' | 'starred'

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent',     label: 'Recently added' },
  { key: 'first-name', label: 'First name' },
  { key: 'last-name',  label: 'Last name' },
  { key: 'most-hangs', label: 'Most hangs' },
  { key: 'longest',    label: 'Longest friends' },
  { key: 'tier',       label: 'Closeness' },
  { key: 'starred',    label: 'Favorites' },
]

const TIER_ORDER: Record<string, number> = { 'inner-circle': 0, 'close-friend': 1, 'casual': 2 }

export default function Friends() {
  const { friends, loading, createFriend, toggleStar: _toggleStar } = useFriends()
  const [starOrder, setStarOrder] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem('star_order') ?? '[]') } catch { return [] }
  })

  const toggleStar = (id: string, starred: boolean) => {
    _toggleStar(id, starred)
    setStarOrder(prev => {
      const next = starred ? [...prev.filter(x => x !== id), id] : prev.filter(x => x !== id)
      localStorage.setItem('star_order', JSON.stringify(next))
      return next
    })
  }
  const { hangouts } = useHangouts()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem('friends_sort') as SortKey) ?? 'recent')
  const [showFlow, setShowFlow] = useState(false)
  const [searchParams, setSearchParams] = useSearchParams()

  // Auto-open add flow from ?add=1
  useEffect(() => {
    if (searchParams.get('add') === '1') {
      setShowFlow(true)
      setSearchParams({}, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const hangoutCountById = hangouts.reduce<Record<string, number>>((acc, h) => {
    for (const hf of h.hangout_friends) {
      acc[hf.friend_id] = (acc[hf.friend_id] ?? 0) + 1
    }
    return acc
  }, {})

  const filtered = friends
    .filter(f => {
      const q = search.toLowerCase()
      return (
        f.name.toLowerCase().includes(q) ||
        (f.location ?? '').toLowerCase().includes(q) ||
        (f.tags ?? []).some((t: string) => t.toLowerCase().includes(q)) ||
        (f.interests ?? []).some((i: string) => i.toLowerCase().includes(q))
      )
    })
    .sort((a, b) => {
      switch (sort) {
        case 'first-name': return a.name.localeCompare(b.name)
        case 'last-name': {
          const aLast = a.name.split(' ').at(-1) ?? a.name
          const bLast = b.name.split(' ').at(-1) ?? b.name
          return aLast.localeCompare(bLast)
        }
        case 'most-hangs': return (hangoutCountById[b.id] ?? 0) - (hangoutCountById[a.id] ?? 0)
        case 'longest':    return (b.day_count ?? 0) - (a.day_count ?? 0)
        case 'tier':       return (TIER_ORDER[a.tier ?? ''] ?? 3) - (TIER_ORDER[b.tier ?? ''] ?? 3)
        case 'starred': {
          const aStarred = (a as any).starred, bStarred = (b as any).starred
          if (aStarred && !bStarred) return -1
          if (!aStarred && bStarred) return 1
          if (aStarred && bStarred) return starOrder.indexOf(a.id) - starOrder.indexOf(b.id)
          return 0
        }
        case 'recent':
        default:           return 0 // already ordered by created_at desc from the hook
      }
    })

  const handleSave = async (payload: AddFriendPayload) => {
    return await createFriend(payload)
  }

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title">Friends</h1>
            <p className="page-subtitle">{friends.length} {friends.length === 1 ? 'person' : 'people'} in your graph</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowFlow(true)}>
            <IconUserPlus size={16} />
            Add friend
          </button>
        </div>
      </div>

      <div className="search-bar animate-in animate-in-1">
        <span className="search-icon"><IconSearch size={16} /></span>
        <input
          type="text"
          placeholder="Search by name, location, tag, or interest..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="animate-in animate-in-1" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 'var(--space-lg)' }}>
        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Sort by:</span>
        <select
          value={sort}
          onChange={e => { const v = e.target.value as SortKey; setSort(v); localStorage.setItem('friends_sort', v) }}
          className="form-input"
          style={{ width: 'auto', fontSize: '0.78rem', padding: '5px 10px', cursor: 'pointer' }}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.key} value={opt.key}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)' }}>Loading…</p></div> : (
        <div className="friend-grid animate-in animate-in-2">
          {filtered.map(f => (
            <Link key={f.id} to={`/friends/${f.id}`} className="friend-card friend-card-starrable" style={{ position: 'relative' }}>
              <button
                onClick={e => { e.preventDefault(); toggleStar(f.id, !(f as any).starred) }}
                title={(f as any).starred ? 'Unstar' : 'Mark as best'}
                className="friend-star-btn"
                style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: (f as any).starred ? '#e07a5f' : 'var(--text-muted)',
                  padding: 2, lineHeight: 1, zIndex: 1,
                  opacity: (f as any).starred ? 1 : 0,
                  transition: 'opacity 150ms ease, color 150ms ease',
                }}
              >
                <IconStar size={14} filled={(f as any).starred} />
              </button>
              <div className="friend-card-avatar" style={{ background: f.avatar_color, overflow: 'hidden' }}>
                {f.avatar_url ? (
                  <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <span className="avatar-initials">{f.initials}</span>
                )}
              </div>
              <div className="friend-card-info">
                <div className="friend-card-name">{f.name}</div>
                <div className="friend-card-meta">{f.location}</div>
                <div className="day-counter" style={{ marginTop: '4px' }}>day {f.day_count.toLocaleString()}</div>
              </div>
            </Link>
          ))}

          {friends.length === 0 && !loading && (
            <div style={{ gridColumn: '1 / -1', padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}>
              No friends yet. Add someone you care about.
            </div>
          )}

          <button className="add-friend-card" onClick={() => setShowFlow(true)}>
            <div className="plus-icon"><IconPlus size={20} /></div>
            <span>Add friend</span>
          </button>
        </div>
      )}

      {showFlow && (
        <AddFriendFlow
          onClose={() => setShowFlow(false)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
