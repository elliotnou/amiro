import { useState, useMemo } from 'react'
import { getFirstName } from '../lib/nameUtils'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useFriendGroups } from '../lib/hooks/useFriendGroups'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'
import { GroupFlow } from './FriendGroups'
import LoadingScreen from '../components/LoadingScreen'
import { IconArrowLeft } from '../components/Icons'

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatCreatedDate(createdAt: string): string {
  const d = new Date(createdAt)
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

function IconPencil({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function MemberDock({ members }: { members: any[] }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', padding: '18px 0 16px' }}>
      {members.map((f, i) => (
        <Link
          key={f.id}
          to={`/friends/${f.id}`}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            textDecoration: 'none',
            marginLeft: i === 0 ? 0 : -14,
            zIndex: members.length - i,
            position: 'relative',
            width: 72,
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: f.avatar_color, overflow: 'hidden',
            border: '3px solid var(--bg)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}>
            {f.avatar_url
              ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: '0.82rem', color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 600 }}>{f.initials}</span>
            }
          </div>
          <span style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 500,
            color: 'var(--text-muted)', marginTop: 6,
            textAlign: 'center', lineHeight: 1.15,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            maxWidth: 72,
          }}>
            {getFirstName(f.name)}
          </span>
        </Link>
      ))}
    </div>
  )
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { groups, loading: groupLoading, updateGroup, deleteGroup } = useFriendGroups()
  const { friends } = useFriends()
  const { hangouts, loading: hangoutsLoading } = useHangouts()
  const [editing, setEditing] = useState(false)

  const group = groups.find(g => g.id === id)
  const members = useMemo(
    () => friends.filter(f => group?.memberIds.includes(f.id)),
    [friends, group]
  )
  const groupHangouts = useMemo(
    () => hangouts.filter(h => h.hangout_groups.some(g => g.group_id === id)),
    [hangouts, id]
  )

  const mostCommonType = useMemo(() => {
    if (groupHangouts.length === 0) return null
    const counts: Record<string, number> = {}
    for (const h of groupHangouts) counts[h.type] = (counts[h.type] ?? 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  }, [groupHangouts])

  if (groupLoading) return <LoadingScreen />

  if (!group) {
    return (
      <div className="page-container">
        <button
          onClick={() => navigate('/groups')}
          className="btn btn-ghost"
          style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 6 }}
        >
          <IconArrowLeft size={14} /> All groups
        </button>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-muted)' }}>
          Group not found.
        </p>
      </div>
    )
  }

  const hasHero = !!group.avatar_url

  const stats = [
    { label: 'Hangouts', value: String(groupHangouts.length) },
    { label: 'Since', value: formatCreatedDate(group.created_at!) },
    ...(mostCommonType ? [{ label: 'Usually', value: mostCommonType }] : []),
  ]

  return (
    <div className="page-container" style={{ maxWidth: 780 }}>

      {/* Back + Edit row */}
      <div className="animate-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button
          onClick={() => navigate('/groups')}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-muted)', fontSize: '0.82rem' }}
        >
          <IconArrowLeft size={14} />
          All groups
        </button>
        <button
          onClick={() => setEditing(true)}
          className="btn btn-ghost"
          style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.78rem', color: 'var(--text-muted)' }}
        >
          <IconPencil size={13} />
          Edit group
        </button>
      </div>

      {/* Members dock — the star of the show */}
      {members.length > 0 && (
        <div className="animate-in animate-in-1" style={{ marginBottom: 16 }}>
          <MemberDock members={members} />
        </div>
      )}

      {/* Hero */}
      <div
        className="animate-in animate-in-2"
        style={{
          borderRadius: 'var(--radius-xl)',
          overflow: 'hidden',
          marginBottom: 'var(--space-xl)',
          border: `1px solid ${group.color}28`,
          background: hasHero ? 'transparent' : `linear-gradient(140deg, ${group.color}1a 0%, ${group.color}07 100%)`,
        }}
      >
        {hasHero && (
          <div style={{ position: 'relative', height: 200 }}>
            <img
              src={group.avatar_url!}
              alt={group.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.55) 100%)' }} />
          </div>
        )}

        <div style={{
          padding: hasHero ? '20px 28px 28px' : '28px 28px 28px',
          position: 'relative',
        }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.9rem', fontWeight: 700,
            color: 'var(--text)',
            marginBottom: group.description ? 6 : 18,
            lineHeight: 1.1,
          }}>
            {group.name}
          </h1>
          {group.description && (
            <p style={{
              fontFamily: 'var(--font-sans)', fontSize: '0.87rem',
              color: 'var(--text-muted)',
              marginBottom: 20, maxWidth: 480, lineHeight: 1.55,
            }}>
              {group.description}
            </p>
          )}

          {/* Stats */}
          <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {stats.map(({ label, value }) => (
              <div key={label}>
                <div style={{
                  fontFamily: 'var(--font-serif)',
                  fontSize: '1.4rem', fontWeight: 700,
                  color: group.color,
                  lineHeight: 1,
                }}>
                  {value}
                </div>
                <div style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.67rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: 'var(--text-muted)',
                  marginTop: 4,
                }}>
                  {label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Hangouts */}
      <section className="animate-in animate-in-3">
        <h2 style={{
          fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 600,
          color: 'var(--text)', marginBottom: 16,
        }}>
          Hangouts
        </h2>
        {hangoutsLoading ? (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>Loading…</p>
        ) : groupHangouts.length === 0 ? (
          <div style={{
            border: '1.5px dashed var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '32px 24px',
            textAlign: 'center',
          }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 4 }}>
              No hangouts tagged with this group yet.
            </p>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)', opacity: 0.7 }}>
              Tag a hangout with <strong>{group.name}</strong> and it'll show up here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {groupHangouts.map(h => (
              <Link key={h.id} to={`/hangouts/${h.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '13px 18px',
                    display: 'flex', alignItems: 'center', gap: 14,
                    transition: 'border-color 150ms, transform 150ms, box-shadow 150ms',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = `${group.color}55`
                    el.style.transform = 'translateY(-1px)'
                    el.style.boxShadow = `0 4px 16px ${group.color}14`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLDivElement
                    el.style.borderColor = 'var(--border)'
                    el.style.transform = 'none'
                    el.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: group.color, flexShrink: 0,
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'var(--font-serif)', fontSize: '0.94rem',
                      color: 'var(--text)', marginBottom: 2, whiteSpace: 'nowrap',
                      overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {h.type}{h.location ? ` · ${h.location}` : ''}
                    </div>
                    {h.hangout_friends.length > 0 && (
                      <div style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.71rem',
                        color: 'var(--text-muted)', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        with {h.hangout_friends.map(hf => hf.friend_name).join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-sans)', fontSize: '0.73rem',
                    color: 'var(--text-muted)', flexShrink: 0,
                  }}>
                    {formatDate(h.date)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {editing && (
        <GroupFlow
          allFriends={friends}
          initialGroup={group}
          onSave={async (name, color, friendIds, avatarUrl, description) => {
            await updateGroup(id!, { name, color, avatar_url: avatarUrl, description }, friendIds)
            setEditing(false)
          }}
          onClose={() => setEditing(false)}
          onDelete={async () => {
            await deleteGroup(id!)
            navigate('/groups')
          }}
        />
      )}
    </div>
  )
}
