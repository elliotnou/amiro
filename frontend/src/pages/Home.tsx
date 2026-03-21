import { Link, Navigate } from 'react-router-dom'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'
import { useNudges } from '../lib/hooks/useNudges'
import { useDebts } from '../lib/hooks/useDebts'
import { useAuth } from '../lib/auth'
import Avatar from '../components/Avatar'
import { IconClock, IconCake, IconCheck, IconPlus } from '../components/Icons'

const nudgeIcons = { clock: IconClock, cake: IconCake, check: IconCheck }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

// ── Monthly hangout bar chart ──────────────────────────────────────
const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

function getLastNMonths(n: number) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth(), label: MONTH_ABBR[d.getMonth()] })
  }
  return result
}

function MonthlyChart({ hangouts, compact }: { hangouts: { date: string }[]; compact?: boolean }) {
  const months = getLastNMonths(compact ? 4 : 6)
  const counts = months.map(m =>
    hangouts.filter(h => {
      const d = new Date(h.date)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    }).length
  )
  const max = Math.max(...counts, 1)
  const barHeight = compact ? 56 : 72

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: compact ? 4 : 6, height: barHeight + 20, padding: '0 2px' }}>
      {months.map((m, i) => {
        const pct = counts[i] / max
        const isCurrentMonth = i === months.length - 1
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }} title={`${m.label}: ${counts[i]} hangout${counts[i] !== 1 ? 's' : ''}`}>
            <div style={{
              width: '100%', borderRadius: '4px 4px 0 0',
              height: `${Math.max(pct * barHeight, counts[i] > 0 ? 8 : 3)}px`,
              background: 'var(--accent)',
              opacity: isCurrentMonth ? 1 : counts[i] > 0 ? 0.4 + pct * 0.5 : 0.2,
              transition: 'height 600ms ease',
            }} />
            <span style={{ fontSize: '0.58rem', fontFamily: 'var(--font-sans)', color: isCurrentMonth ? 'var(--accent)' : 'var(--text-muted)', fontWeight: isCurrentMonth ? 600 : 400, lineHeight: 1 }}>
              {m.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
// ───────────────────────────────────────────────────────────────────

export default function Home() {
  const { user } = useAuth()
  const { friends, loading: friendsLoading } = useFriends()
  const { hangouts } = useHangouts()
  const { nudges, dismissNudge } = useNudges()
  const { debts, settleDebt } = useDebts()

  const recentHangouts = hangouts.slice(0, 3)
  const unsettledDebts = debts.filter(d => !d.settled)
  const totalOwed = unsettledDebts.filter(d => d.direction === 'owed').reduce((s, d) => s + Number(d.amount), 0)
  const totalOwe = unsettledDebts.filter(d => d.direction === 'owe').reduce((s, d) => s + Number(d.amount), 0)
  const longestFriend = [...friends].sort((a, b) => b.day_count - a.day_count)[0]
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''

  if (!friendsLoading && friends.length === 0) return <Navigate to="/onboarding" replace />

  return (
    <div className="page-container">
      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 'var(--space-lg)' }}>
        <h1 className="page-title">{getGreeting()}{displayName ? `, ${displayName}` : ''}</h1>
        <p className="page-subtitle">{hangouts.length} hangouts logged · {friends.length} friends</p>
      </div>

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 'var(--space-md)', alignItems: 'start' }}>

        {/* LEFT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Stats */}
          <div className="stat-grid animate-in animate-in-1" style={{ marginBottom: 0 }}>
            <div className="stat-card">
              <span className="stat-card-label">Friends</span>
              <span className="stat-card-value">{friends.length}</span>
              <span className="stat-card-sub">{friends.filter((f: any) => f.tier === 'inner-circle').length} inner circle</span>
            </div>
            <div className="stat-card">
              <span className="stat-card-label">Hangouts</span>
              <span className="stat-card-value">{hangouts.length}</span>
              <span className="stat-card-sub">total logged</span>
            </div>
            {longestFriend && longestFriend.day_count > 0 && (
              <div className="stat-card">
                <span className="stat-card-label">Longest streak</span>
                <span className="stat-card-value" style={{ fontSize: '1.6rem' }}>
                  <span style={{ fontStyle: 'italic' }}>day {longestFriend.day_count.toLocaleString()}</span>
                </span>
                <span className="stat-card-sub">{longestFriend.name}</span>
              </div>
            )}
            {unsettledDebts.length > 0 && (
              <div className="stat-card">
                <span className="stat-card-label">Debts</span>
                <div className="flex items-center gap-md">
                  <div>
                    <span className="stat-card-value" style={{ color: 'var(--positive)' }}>+${totalOwed}</span>
                    <div className="text-xs text-muted">owed to you</div>
                  </div>
                  <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
                  <div>
                    <span className="stat-card-value" style={{ color: 'var(--negative)' }}>-${totalOwe}</span>
                    <div className="text-xs text-muted">you owe</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Recent hangouts */}
          {recentHangouts.length > 0 && (
            <div className="section animate-in animate-in-2" style={{ marginBottom: 0 }}>
              <div className="section-header">
                <span className="section-label">Recent hangouts</span>
                <Link to="/hangouts" className="btn btn-ghost btn-sm text-sans"><IconPlus size={14} /> Log</Link>
              </div>
              <div className="flex flex-col gap-sm">
                {recentHangouts.map((h: any) => (
                  <Link key={h.id} to={`/hangouts/${h.id}`} className="hangout-row">
                    <div className="hangout-type-badge">{h.type.slice(0, 3)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center justify-between" style={{ marginBottom: '4px' }}>
                        <span style={{ fontWeight: 500, fontSize: '0.9rem' }}>{h.type} — {h.location}</span>
                        <span className="text-xs text-muted text-sans">{h.date}</span>
                      </div>
                      {h.hangout_friends.length > 0 && (
                        <div className="pill-wrap" style={{ marginTop: '4px' }}>
                          {h.hangout_friends.map((hf: any) => (
                            <span key={hf.id} className="pill pill-default">
                              {hf.friend_name}
                              {hf.feeling_label && <span className="text-muted" style={{ marginLeft: 4 }}>· {hf.feeling_label}</span>}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Your people */}
          <div className="section animate-in animate-in-3" style={{ marginBottom: 0 }}>
            <div className="section-header">
              <span className="section-label">Your people</span>
              <Link to="/friends" className="btn btn-ghost btn-sm text-sans">View all</Link>
            </div>
            {friends.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', padding: 'var(--space-lg) 0' }}>
                No friends yet. <Link to="/friends" style={{ color: 'var(--accent)' }}>Add someone →</Link>
              </div>
            ) : (
              <div className="friend-grid">
                {friends.slice(0, 8).map((f: any) => (
                  <Link key={f.id} to={`/friends/${f.id}`} className="friend-card">
                    <div className="friend-card-avatar" style={{ background: f.avatar_color }}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span className="avatar-initials">{f.initials}</span>}
                    </div>
                    <div className="friend-card-info">
                      <div className="friend-card-name">{f.name}</div>
                      <div className="friend-card-meta">day {f.day_count.toLocaleString()}</div>
                    </div>
                  </Link>
                ))}
                <Link to="/friends" className="add-friend-card">
                  <div className="plus-icon"><IconPlus size={20} /></div>
                  <span>Add friend</span>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
          {/* Monthly chart */}
          <div className="section animate-in animate-in-2" style={{ marginBottom: 0 }}>
            <div className="section-header">
              <span className="section-label" style={{ fontSize: '0.72rem' }}>Monthly</span>
              <span className="text-xs text-muted text-sans">{hangouts.length} total</span>
            </div>
            <div className="card" style={{ padding: 'var(--space-md) var(--space-md) var(--space-sm)' }}>
              <MonthlyChart hangouts={hangouts} compact />
              {hangouts.length === 0 && (
                <p style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 6, marginBottom: 2 }}>
                  Log your first hangout
                </p>
              )}
            </div>
          </div>

          {/* Nudges */}
          {nudges.length > 0 && (
            <div className="section animate-in animate-in-3" style={{ marginBottom: 0 }}>
              <div className="section-header"><span className="section-label">Nudges</span></div>
              <div className="flex flex-col gap-sm">
                {nudges.map((nudge: any) => {
                  const NudgeIcon = nudgeIcons[nudge.icon as keyof typeof nudgeIcons]
                  return (
                    <div key={nudge.id} className="nudge-item">
                      <div className={`nudge-icon nudge-icon-${nudge.icon}`}><NudgeIcon size={16} /></div>
                      <span style={{ flex: 1, fontSize: '0.82rem' }}>{nudge.message}</span>
                      {nudge.ai_action && <button className="btn btn-ai btn-sm">Draft</button>}
                      <button className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: '0.7rem' }} onClick={() => dismissNudge(nudge.id)}>×</button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Debts */}
          {debts.length > 0 && (
            <div className="section animate-in animate-in-4" style={{ marginBottom: 0 }}>
              <div className="section-header"><span className="section-label">Settle up</span></div>
              <div className="flex flex-col gap-sm">
                {debts.map((debt: any) => {
                  const friend = friends.find((f: any) => f.id === debt.friend_id)
                  return (
                    <div key={debt.id} className="flex items-center gap-md" style={{
                      padding: '10px var(--space-md)', background: 'var(--bg-card)',
                      border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                      boxShadow: 'var(--shadow-sm)', opacity: debt.settled ? 0.5 : 1,
                    }}>
                      <div
                        className="checkbox"
                        style={debt.settled ? { background: 'var(--positive)', borderColor: 'var(--positive)' } : { cursor: 'pointer' }}
                        onClick={() => !debt.settled && settleDebt(debt.id)}
                      />
                      {friend && <Avatar initials={friend.initials} color={friend.avatar_color} size="sm" />}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>
                          {debt.direction === 'owed' ? `${friend?.name ?? 'Someone'} owes you` : `You owe ${friend?.name ?? 'someone'}`}
                        </div>
                        <div className="text-xs text-muted">{debt.description}</div>
                      </div>
                      <span style={{
                        fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.9rem',
                        color: debt.direction === 'owed' ? 'var(--positive)' : 'var(--negative)',
                        textDecoration: debt.settled ? 'line-through' : 'none',
                      }}>${debt.amount}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
