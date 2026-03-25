import { useState, useEffect } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'
import { useNudges } from '../lib/hooks/useNudges'
import { useDebts } from '../lib/hooks/useDebts'
import { useAuth } from '../lib/auth'
import { useTheme } from '../lib/ThemeContext'
import { IconClock, IconCake, IconCheck, IconPlus } from '../components/Icons'
import GuidedTour, { HOME_STEPS } from '../components/GuidedTour'

const nudgeIcons = { clock: IconClock, cake: IconCake, check: IconCheck }

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000)
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function daysUntilBirthday(birthday: string) {
  const now = new Date()
  const bd = new Date(birthday)
  const next = new Date(now.getFullYear(), bd.getMonth(), bd.getDate())
  if (next < now) next.setFullYear(next.getFullYear() + 1)
  return Math.ceil((next.getTime() - now.getTime()) / 86400000)
}

const tierColors: Record<string, string> = {
  'inner-circle': '#e07a5f',
  'close-friend': '#457b9d',
  'casual': '#c9a96e',
}

// Double-rectangle wrapper: outer frame + inner card
function Widget({ children, className, style, innerBg, darkInnerBg, 'data-tour': dataTour }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; innerBg?: string; darkInnerBg?: string; 'data-tour'?: string }) {
  const { isDark } = useTheme()
  const bg = isDark
    ? (darkInnerBg || 'linear-gradient(to bottom right, #22222a 0%, #1f1f26 50%, #1c1c22 100%)')
    : (innerBg || 'linear-gradient(to bottom right, #ffffff 0%, #fdfaf8 40%, #faf5f2 100%)')
  return (
    <div className={className} data-tour={dataTour} style={{ background: isDark ? '#1c1c22' : '#ffffff', borderRadius: 22, padding: 10, border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, ...style }}>
      <div style={{ background: bg, borderRadius: 16, padding: '22px 24px', border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, height: '100%' }}>
        {children}
      </div>
    </div>
  )
}

export default function Home() {
  const { user } = useAuth()
  const { isDark } = useTheme()
  const { friends, loading: friendsLoading } = useFriends()
  const { hangouts } = useHangouts()
  const { nudges, dismissNudge } = useNudges()
  const { debts, settleDebt } = useDebts()

  const recentHangouts = hangouts.slice(0, 4)
  const unsettledDebts = debts.filter(d => !d.settled)
  const totalOwed = unsettledDebts.filter(d => d.direction === 'owed').reduce((s, d) => s + Number(d.amount), 0)
  const totalOwe = unsettledDebts.filter(d => d.direction === 'owe').reduce((s, d) => s + Number(d.amount), 0)
  const longestFriend = [...friends].sort((a, b) => b.day_count - a.day_count)[0]
  const displayName = user?.user_metadata?.display_name || user?.email?.split('@')[0] || ''

  const innerCircleCount = friends.filter((f: any) => f.tier === 'inner-circle').length
  const closeFriendCount = friends.filter((f: any) => f.tier === 'close-friend').length

  const months = getLastNMonths(12)
  const monthlyHangouts = months.map(m =>
    hangouts.filter(h => {
      const d = new Date(h.date)
      return d.getFullYear() === m.year && d.getMonth() === m.month
    })
  )
  const monthlyCounts = monthlyHangouts.map(h => h.length)
  const monthlyStats = monthlyHangouts.map(hList => {
    const rated = hList.filter((h: any) => h.rating != null)
    const avgRating = rated.length > 0 ? rated.reduce((s: number, h: any) => s + h.rating, 0) / rated.length : null
    const words = hList.reduce((s: number, h: any) => s + (h.highlights ? h.highlights.trim().split(/\s+/).filter(Boolean).length : 0), 0)
    return { avgRating, words }
  })
  const maxMonthly = Math.max(...monthlyCounts, 1)
  const [hoveredBar, setHoveredBar] = useState<number | null>(null)
  const location = useLocation()
  const [showTour, setShowTour] = useState(false)

  useEffect(() => {
    const fromOnboarding = location.state?.fromOnboarding
    const tourDone = localStorage.getItem('tour_complete')
    if (fromOnboarding && !tourDone) {
      const t = setTimeout(() => setShowTour(true), 800)
      return () => clearTimeout(t)
    }
  }, [location.state])
  const thisMonthCount = monthlyCounts[monthlyCounts.length - 1]

  const thisMonth = months[months.length - 1]
  const thisMonthHangouts = hangouts.filter(h => {
    const d = new Date(h.date)
    return d.getFullYear() === thisMonth.year && d.getMonth() === thisMonth.month
  })
  const friendHangoutCounts: Record<string, { name: string; count: number }> = {}
  thisMonthHangouts.forEach((h: any) => {
    h.hangout_friends.forEach((hf: any) => {
      if (!friendHangoutCounts[hf.friend_id]) {
        friendHangoutCounts[hf.friend_id] = { name: hf.friend_name, count: 0 }
      }
      friendHangoutCounts[hf.friend_id].count++
    })
  })
  const topFriend = Object.values(friendHangoutCounts).sort((a, b) => b.count - a.count)[0]

  const upcomingBirthdays = friends
    .filter((f: any) => f.birthday)
    .map((f: any) => ({ ...f, daysUntil: daysUntilBirthday(f.birthday!) }))
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 3)

  if (!friendsLoading && friends.length === 0) return <Navigate to="/onboarding" replace />

  return (
    <div className="page-container" style={{ maxWidth: 880 }}>

      {/* ═══ HERO BANNER ═══ */}
      <div className="animate-in" style={{
        background: isDark ? '#1c1c22' : '#ffffff', borderRadius: 22, padding: 10,
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, marginBottom: 24,
      }}>
      <div style={{
        background: isDark ? 'linear-gradient(135deg, #201a18 0%, #1e1c1a 40%, #1a1920 100%)' : 'linear-gradient(135deg, #fef0ec 0%, #fdf6f0 40%, #f0eff8 100%)',
        borderRadius: 16, padding: '34px 38px 30px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -30, width: 140, height: 140, borderRadius: '50%', background: isDark ? 'rgba(232,135,110,0.06)' : 'rgba(224,122,95,0.07)' }} />
        <div style={{ position: 'absolute', bottom: -50, right: 80, width: 100, height: 100, borderRadius: '50%', background: isDark ? 'rgba(148,135,207,0.05)' : 'rgba(124,111,189,0.05)' }} />
        <div style={{ position: 'absolute', top: 10, left: -40, width: 90, height: 90, borderRadius: '50%', background: isDark ? 'rgba(212,184,122,0.05)' : 'rgba(201,169,110,0.06)' }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)', fontSize: '2.1rem', fontWeight: 500,
            color: 'var(--text)', marginBottom: 6, lineHeight: 1.15,
          }}>
            {getGreeting()}{displayName ? `, ${displayName}` : ''}
          </h1>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)',
            marginBottom: 22, lineHeight: 1.5,
          }}>
            {thisMonthCount > 0
              ? <>You've had <strong style={{ color: 'var(--accent)', fontWeight: 600 }}>{thisMonthCount} hangout{thisMonthCount !== 1 ? 's' : ''}</strong> this month</>
              : 'No hangouts yet this month — time to make some plans?'}
            {topFriend && thisMonthCount > 0 && (
              <> — mostly with <strong style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>{topFriend.name.split(' ')[0]}</strong></>
            )}
          </p>

          <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {[
              { value: friends.length, label: 'friends' },
              { value: hangouts.length, label: 'hangouts' },
              ...(longestFriend && longestFriend.day_count > 0
                ? [{ value: `day ${longestFriend.day_count.toLocaleString()}`, label: `with ${longestFriend.name.split(' ')[0]}`, italic: true }]
                : []),
            ].map((stat, i, arr) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: i < arr.length - 1 ? 28 : 0 }}>
                <div>
                  <span style={{
                    fontFamily: 'var(--font-serif)', fontSize: '1.55rem', fontWeight: 600,
                    color: 'var(--text)', lineHeight: 1,
                    fontStyle: (stat as any).italic ? 'italic' : 'normal',
                  }}>
                    {stat.value}
                  </span>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 6 }}>
                    {stat.label}
                  </span>
                </div>
                {i < arr.length - 1 && (
                  <div style={{ width: 1, height: 22, background: 'var(--border-strong)' }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>

      {/* ═══ SNAPSHOT LEFT + ACTIVITY RIGHT ═══ */}
      <div data-tour="stats" className="animate-in animate-in-1" style={{
        display: 'grid', gridTemplateColumns: '7fr 3fr', gap: 0,
        marginBottom: 24, alignItems: 'center',
        padding: '0 14px',
      }}>
        {/* Left — snapshot stats */}
        <div style={{ display: 'flex', gap: 36, alignItems: 'flex-end', padding: '8px 0 12px', marginLeft: 14 }}>
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              This month
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>
              {thisMonthCount}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>
              hangout{thisMonthCount !== 1 ? 's' : ''}
            </span>
          </div>
          <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              All time
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              {hangouts.length}
            </span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)', marginLeft: 6 }}>
              logged
            </span>
          </div>
          <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
          <div>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
              Avg / month
            </span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1 }}>
              {monthlyCounts.filter(c => c > 0).length > 0
                ? (monthlyCounts.reduce((a, b) => a + b, 0) / monthlyCounts.filter(c => c > 0).length).toFixed(1)
                : '0'}
            </span>
          </div>
        </div>

        {/* Right — compact bar chart */}
        <div style={{ padding: '0' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 120, width: 300, transform: 'translateX(-40px)' }}>
            {months.map((m, i) => {
              const pct = monthlyCounts[i] / maxMonthly
              const isCurrent = i === months.length - 1
              const stats = monthlyStats[i]
              return (
                <div key={i} style={{
                  flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
                  gap: 4, height: '100%', justifyContent: 'flex-end', position: 'relative', cursor: monthlyCounts[i] > 0 ? 'pointer' : 'default',
                }}
                  onMouseEnter={() => monthlyCounts[i] > 0 && setHoveredBar(i)}
                  onMouseLeave={() => setHoveredBar(null)}
                >
                  {hoveredBar === i && (
                    <div style={{
                      position: 'absolute', right: 'calc(100% + 10px)', top: '50%',
                      transform: 'translateY(-50%)',
                      background: isDark ? '#2c2c34' : '#2a2a3a', color: '#fff', borderRadius: 12,
                      padding: '10px 14px', whiteSpace: 'nowrap', zIndex: 10,
                      fontFamily: 'var(--font-sans)', fontSize: '0.7rem',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                      display: 'flex', flexDirection: 'column', gap: 6,
                      pointerEvents: 'none',
                      animation: 'fadeIn 150ms ease',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                        <span style={{ color: 'rgba(255,255,255,0.6)' }}>Hangouts</span>
                        <span style={{ fontWeight: 600 }}>{monthlyCounts[i]}</span>
                      </div>
                      {stats.avgRating != null && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Avg. Rating</span>
                          <span style={{ fontWeight: 600 }}>{stats.avgRating.toFixed(1)}</span>
                        </div>
                      )}
                      {stats.words > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                          <span style={{ color: 'rgba(255,255,255,0.6)' }}>Words</span>
                          <span style={{ fontWeight: 600 }}>{stats.words.toLocaleString()}</span>
                        </div>
                      )}
                      <div style={{
                        position: 'absolute', top: '50%', left: '100%', transform: 'translateY(-50%)',
                        width: 0, height: 0, borderTop: '5px solid transparent', borderBottom: '5px solid transparent', borderLeft: `5px solid ${isDark ? '#2c2c34' : '#2a2a3a'}`,
                      }} />
                    </div>
                  )}
                  <div style={{
                    width: '80%', maxWidth: 20, borderRadius: 100,
                    height: `${Math.max(pct * 90, monthlyCounts[i] > 0 ? 14 : 4)}px`,
                    background: isCurrent
                      ? 'linear-gradient(180deg, #e07a5f, #d4654a)'
                      : '#e07a5f',
                    opacity: hoveredBar === i ? 1 : isCurrent ? 1 : monthlyCounts[i] > 0 ? 0.18 + pct * 0.4 : 0.08,
                    transition: 'height 600ms cubic-bezier(0.34, 1.56, 0.64, 1), opacity 150ms ease',
                  }} />
                  <span style={{
                    fontSize: '0.52rem', fontFamily: 'var(--font-sans)',
                    color: hoveredBar === i ? '#e07a5f' : isCurrent ? '#e07a5f' : 'var(--text-muted)',
                    fontWeight: isCurrent || hoveredBar === i ? 600 : 400, lineHeight: 1,
                  }}>
                    {m.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ═══ PEOPLE + ACTIONS ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Your people */}
        <Widget data-tour="people" className="animate-in animate-in-2" innerBg="linear-gradient(to bottom right, #ffffff 0%, #fef5f1 40%, #fce9e2 100%)" darkInnerBg="linear-gradient(to bottom right, #22222a 0%, #261f1c 40%, #2a201c 100%)">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500 }}>Your people</span>
            <Link to="/friends" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', textDecoration: 'none' }}>View all</Link>
          </div>
          {friends.length > 0 && (innerCircleCount > 0 || closeFriendCount > 0) && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {innerCircleCount > 0 && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(224,122,95,0.08)', color: 'var(--accent)' }}>
                  {innerCircleCount} inner circle
                </span>
              )}
              {closeFriendCount > 0 && (
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: 'rgba(69,123,157,0.08)', color: '#457b9d' }}>
                  {closeFriendCount} close
                </span>
              )}
            </div>
          )}
          {friends.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', padding: '12px 0' }}>
              No friends yet. <Link to="/friends?add=1" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Add someone</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {friends.slice(0, 9).map((f: any) => (
                <Link key={f.id} to={`/friends/${f.id}`} title={f.name} style={{ textDecoration: 'none' }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%', background: f.avatar_color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    border: `2px solid ${tierColors[f.tier] ?? 'transparent'}`,
                    transition: 'transform 150ms ease',
                  }}>
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.78rem', fontWeight: 500, color: 'white', opacity: 0.9 }}>{f.initials}</span>}
                  </div>
                </Link>
              ))}
              {friends.length > 9 && (
                <Link to="/friends" style={{
                  width: 42, height: 42, borderRadius: '50%', background: 'var(--bg-hover)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 500, textDecoration: 'none',
                }}>
                  +{friends.length - 9}
                </Link>
              )}
              <Link to="/friends?add=1" title="Add friend" style={{
                width: 42, height: 42, borderRadius: '50%',
                border: '2px dashed rgba(224,122,95,0.3)',
                background: isDark ? 'rgba(232,135,110,0.06)' : 'rgba(224,122,95,0.04)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                textDecoration: 'none', color: 'var(--accent)', transition: 'background 150ms ease',
              }}>
                <IconPlus size={16} />
              </Link>
            </div>
          )}
        </Widget>

        {/* Nudges / Quick actions */}
        <Widget data-tour="actions" className="animate-in animate-in-2" innerBg="linear-gradient(to bottom right, #ffffff 0%, #f5f3fa 40%, #ebe7f4 100%)" darkInnerBg="linear-gradient(to bottom right, #22222a 0%, #201f28 40%, #1e1c26 100%)">
          {nudges.length > 0 ? (
            <>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500, marginBottom: 14, display: 'block' }}>Nudges</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {nudges.slice(0, 3).map((nudge: any) => {
                  const NudgeIcon = nudgeIcons[nudge.icon as keyof typeof nudgeIcons]
                  return (
                    <div key={nudge.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <div className={`nudge-icon nudge-icon-${nudge.icon}`} style={{ width: 30, height: 30, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <NudgeIcon size={13} />
                      </div>
                      <span style={{ flex: 1, fontSize: '0.76rem', fontFamily: 'var(--font-sans)', color: 'var(--text-secondary)', lineHeight: 1.45 }}>{nudge.message}</span>
                      <button style={{ fontSize: '0.85rem', color: 'var(--text-muted)', padding: '0 4px', cursor: 'pointer', background: 'none', border: 'none', lineHeight: 1 }} onClick={() => dismissNudge(nudge.id)}>×</button>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500, marginBottom: 14, display: 'block' }}>Quick actions</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Link to="/hangouts?log=1" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14,
                  background: isDark ? 'rgba(232,135,110,0.08)' : 'rgba(224,122,95,0.05)', textDecoration: 'none',
                }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(224,122,95,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', flexShrink: 0 }}>
                    <IconPlus size={15} />
                  </span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)' }}>Log a hangout</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Record a recent meetup</div>
                  </div>
                </Link>
                <Link to="/friends?add=1" style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 14,
                  background: isDark ? 'rgba(90,147,181,0.08)' : 'rgba(69,123,157,0.04)', textDecoration: 'none',
                }}>
                  <span style={{ width: 32, height: 32, borderRadius: 10, background: 'rgba(69,123,157,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#457b9d', flexShrink: 0 }}>
                    <IconPlus size={15} />
                  </span>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', fontWeight: 500, color: 'var(--text)' }}>Add a friend</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Start tracking someone new</div>
                  </div>
                </Link>
              </div>
            </>
          )}
        </Widget>
      </div>

      {/* ═══ RECENT HANGOUTS + BIRTHDAYS ═══ */}
      {(recentHangouts.length > 0 || upcomingBirthdays.length > 0) && (
        <div className="animate-in animate-in-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24, alignItems: 'start' }}>

          {/* Left: Recent hangouts */}
          {recentHangouts.length > 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500 }}>Recent hangouts</span>
                <Link to="/hangouts?log=1" style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 500, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                  <IconPlus size={12} /> Log new
                </Link>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {recentHangouts.slice(0, 3).map((h: any) => {
                  const friendAvatars = h.hangout_friends.slice(0, 3)
                  return (
                    <Widget key={h.id} style={{ padding: 8 }}>
                      <Link to={`/hangouts/${h.id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', overflow: 'hidden' }}>
                        <span style={{
                          position: 'absolute', top: -10, right: -4,
                          fontFamily: 'var(--font-serif)', fontSize: '4.8rem', fontWeight: 700,
                          color: 'var(--accent)', opacity: 0.035, lineHeight: 1, pointerEvents: 'none',
                        }}>
                          {h.type.charAt(0).toUpperCase()}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.92rem', color: 'var(--text)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {h.type}
                            </div>
                            {h.location && (
                              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {h.location}
                              </div>
                            )}
                          </div>
                          <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', color: 'var(--text-muted)', flexShrink: 0, marginLeft: 8, marginTop: 3, background: 'var(--border)', padding: '2px 8px', borderRadius: 20 }}>
                            {formatDate(h.date)}
                          </span>
                        </div>
                        {friendAvatars.length > 0 && (
                          <div style={{ display: 'flex', alignItems: 'center' }}>
                            <div style={{ display: 'flex' }}>
                              {friendAvatars.map((hf: any, i: number) => {
                                const f = friends.find((fr: any) => fr.id === hf.friend_id)
                                return (
                                  <div key={hf.id} style={{
                                    width: 24, height: 24, borderRadius: '50%', background: f?.avatar_color ?? '#ccc',
                                    border: `2px solid ${isDark ? '#1c1c22' : 'white'}`, marginLeft: i > 0 ? -7 : 0,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', position: 'relative', zIndex: friendAvatars.length - i,
                                  }}>
                                    {f?.avatar_url
                                      ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                      : <span style={{ fontSize: '0.45rem', color: 'white', fontWeight: 600 }}>{f?.initials ?? '?'}</span>}
                                  </div>
                                )
                              })}
                            </div>
                            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.66rem', color: 'var(--text-muted)', marginLeft: 8 }}>
                              {h.hangout_friends.length === 1 ? h.hangout_friends[0].friend_name.split(' ')[0] : `${h.hangout_friends.length} friends`}
                            </span>
                          </div>
                        )}
                      </Link>
                    </Widget>
                  )
                })}
              </div>
            </div>
          )}

          {/* Right: Upcoming birthdays — frameless conveyor */}
          {upcomingBirthdays.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                <IconCake size={14} />
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500 }}>Birthdays</span>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                {upcomingBirthdays.map((f: any) => {
                  const tc = tierColors[f.tier] ?? 'var(--border)'
                  const bdDate = new Date(f.birthday + 'T00:00:00')
                  const label = f.daysUntil === 0 ? 'Today!' : f.daysUntil === 1 ? 'Tomorrow' : `${f.daysUntil}d`
                  const soon = f.daysUntil <= 7
                  return (
                    <Link key={f.id} to={`/friends/${f.id}`} style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textAlign: 'center', padding: '10px 4px' }}>
                        <div style={{
                          width: 46, height: 46, borderRadius: '50%', background: f.avatar_color,
                          border: `2.5px solid ${tc}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                        }}>
                          {f.avatar_url
                            ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: '0.68rem', fontWeight: 500 }}>{f.initials}</span>}
                        </div>
                        <div>
                          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.83rem', fontWeight: 600, color: 'var(--text)' }}>
                            {f.name.split(' ')[0]}
                          </div>
                          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', color: 'var(--text-muted)', marginTop: 1 }}>
                            {MONTH_ABBR[bdDate.getMonth()]} {bdDate.getDate()}
                          </div>
                        </div>
                        <span style={{
                          fontFamily: 'var(--font-serif)', fontWeight: 700,
                          fontSize: soon ? '0.95rem' : '0.82rem',
                          color: soon ? 'var(--accent)' : 'var(--text)',
                          letterSpacing: soon ? '-0.01em' : '0',
                        }}>
                          {label}
                        </span>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ SETTLE UP ═══ */}
      {unsettledDebts.length > 0 && (
        <div className="animate-in animate-in-4" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500 }}>Settle up</span>
            <div style={{ display: 'flex', gap: 8, fontFamily: 'var(--font-sans)', fontSize: '0.7rem' }}>
              {totalOwed > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(74,158,110,0.08)', color: '#4a9e6e', fontWeight: 600 }}>+${totalOwed}</span>}
              {totalOwe > 0 && <span style={{ padding: '2px 10px', borderRadius: 20, background: 'rgba(196,92,92,0.08)', color: '#c45c5c', fontWeight: 600 }}>-${totalOwe}</span>}
            </div>
          </div>
          <Widget style={{ padding: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {unsettledDebts.slice(0, 4).map((debt: any, i: number) => {
                const friend = friends.find((f: any) => f.id === debt.friend_id)
                return (
                  <div key={debt.id} style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderBottom: i < Math.min(unsettledDebts.length, 4) - 1 ? '1px solid rgba(0,0,0,0.04)' : 'none',
                  }}>
                    <div className="checkbox" style={{ cursor: 'pointer' }} onClick={() => settleDebt(debt.id)} />
                    {friend && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: friend.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                        {friend.avatar_url
                          ? <img src={friend.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ fontSize: '0.55rem', color: 'white', fontWeight: 600 }}>{friend.initials}</span>}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.78rem', fontWeight: 500, fontFamily: 'var(--font-sans)', color: 'var(--text)' }}>
                        {debt.direction === 'owed' ? `${friend?.name ?? 'Someone'} owes you` : `You owe ${friend?.name ?? 'someone'}`}
                      </div>
                      {debt.description && <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>{debt.description}</div>}
                    </div>
                    <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.88rem', color: debt.direction === 'owed' ? '#4a9e6e' : '#c45c5c' }}>${debt.amount}</span>
                  </div>
                )
              })}
            </div>
          </Widget>
        </div>
      )}

      {showTour && (
        <GuidedTour steps={HOME_STEPS} onComplete={() => {
          setShowTour(false)
          localStorage.setItem('tour_complete', '1')
        }} />
      )}
    </div>
  )
}
