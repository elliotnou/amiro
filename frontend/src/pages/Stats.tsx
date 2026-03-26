import { useFriends } from '../lib/hooks/useFriends'
import { getFirstName } from '../lib/nameUtils'
import { useHangouts } from '../lib/hooks/useHangouts'
import { tierColor, tierLabel } from '../data/mock'
import Avatar from '../components/Avatar'
import { Link } from 'react-router-dom'
import { useTheme } from '../lib/ThemeContext'

// ── Mini donut ring via SVG ───────────────────────────────────────────
function DonutRing({ segments, size = 120 }: {
  segments: { value: number; color: string }[]
  size?: number
}) {
  const r = (size - 18) / 2
  const circ = 2 * Math.PI * r
  const cx = size / 2, cy = size / 2
  const total = segments.reduce((s, x) => s + x.value, 0) || 1
  const GAP = 3
  let offset = 0

  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      {segments.map((seg, i) => {
        const fullDash = (seg.value / total) * circ
        const dash = Math.max(0, fullDash - GAP)
        const gap = circ - dash
        const el = (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={14}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
          />
        )
        offset += fullDash
        return el
      })}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={14}
        strokeDasharray={`${circ} 0`} style={{ opacity: total === 1 ? 1 : 0 }} />
    </svg>
  )
}

// ── Monthly bar chart ─────────────────────────────────────────────────
function MonthBars({ counts, labels }: { counts: number[]; labels: string[] }) {
  const max = Math.max(...counts, 1)
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 80 }}>
      {counts.map((c, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: '70%', maxWidth: 16, borderRadius: 100,
            background: i === counts.length - 1 ? 'var(--accent)' : '#e07a5f',
            opacity: i === counts.length - 1 ? 1 : c > 0 ? 0.2 + (c / max) * 0.4 : 0.08,
            height: `${Math.max((c / max) * 64, c > 0 ? 10 : 4)}px`,
            transition: 'height 0.4s ease',
          }} />
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', whiteSpace: 'nowrap' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}

// ── Day-of-week radial dots ───────────────────────────────────────────
const DOW_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function DowChart({ counts }: { counts: number[] }) {
  const max = Math.max(...counts, 1)
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'flex-end', height: 60 }}>
      {counts.map((c, i) => (
        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
          <div style={{
            width: '60%', maxWidth: 14, borderRadius: 100,
            background: '#4a9e6e',
            opacity: c === max ? 1 : c > 0 ? 0.2 + (c / max) * 0.4 : 0.08,
            height: `${Math.max((c / max) * 40, c > 0 ? 6 : 3)}px`,
          }} />
          <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-sans)', color: c === max ? 'var(--accent)' : 'var(--text-muted)' }}>{DOW_LABELS[i]}</span>
        </div>
      ))}
    </div>
  )
}

export default function Stats() {
  const { friends } = useFriends()
  const { hangouts } = useHangouts()
  const { isDark } = useTheme()

  // ── Core numbers ────────────────────────────────────────────────────
  const totalFriends = friends.length
  const totalHangouts = hangouts.length
  const wordsJournalled = hangouts.reduce((s, h) =>
    s + (h.highlights ? h.highlights.trim().split(/\s+/).filter(Boolean).length : 0), 0)
  const uniqueLocations = new Set(hangouts.map(h => h.location).filter(Boolean)).size
  const avgPerMonth = totalHangouts > 0
    ? (totalHangouts / Math.max(1, (() => {
        const dates = hangouts.map(h => new Date(h.date + 'T00:00:00'))
        const oldest = new Date(Math.min(...dates.map(d => d.getTime())))
        const now = new Date()
        return Math.max(1, (now.getFullYear() - oldest.getFullYear()) * 12 + now.getMonth() - oldest.getMonth() + 1)
      })())).toFixed(1)
    : '—'

  // ── Tier breakdown ───────────────────────────────────────────────────
  const tierBreakdown = {
    'inner-circle': friends.filter(f => f.tier === 'inner-circle').length,
    'close-friend': friends.filter(f => f.tier === 'close-friend').length,
    'casual': friends.filter(f => f.tier === 'casual').length,
  }
  const tierSegments = [
    { value: tierBreakdown['inner-circle'], color: '#e07a5f' },
    { value: tierBreakdown['close-friend'], color: '#457b9d' },
    { value: tierBreakdown['casual'],       color: '#c9a96e' },
  ]

  // ── Monthly activity (last 12 months) ───────────────────────────────
  const now = new Date()
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return { y: d.getFullYear(), m: d.getMonth(), label: d.toLocaleString('default', { month: 'short' }) }
  })
  const monthlyCounts = monthlyData.map(({ y, m }) =>
    hangouts.filter(h => {
      const d = new Date(h.date + 'T00:00:00')
      return d.getFullYear() === y && d.getMonth() === m
    }).length
  )

  // ── Day-of-week ──────────────────────────────────────────────────────
  const dowCounts = Array(7).fill(0)
  hangouts.forEach(h => {
    const d = new Date(h.date + 'T00:00:00')
    dowCounts[d.getDay()]++
  })
  const peakDay = DOW_LABELS[dowCounts.indexOf(Math.max(...dowCounts))]

  // ── Hangouts by friend ───────────────────────────────────────────────
  const hangoutCounts = friends.map(f => ({
    ...f,
    count: hangouts.filter(h => h.hangout_friends.some(hf => hf.friend_id === f.id)).length
  })).sort((a, b) => b.count - a.count)
  const maxCount = Math.max(...hangoutCounts.map(f => f.count), 1)

  // ── Rating distribution ──────────────────────────────────────────────
  const ratingBuckets = Array.from({ length: 10 }, (_, i) => ({
    rating: i + 1,
    count: hangouts.filter(h => (h as any).rating === i + 1).length,
  }))
  const ratedHangouts = hangouts.filter(h => (h as any).rating != null && (h as any).rating > 0)
  const avgRating = ratedHangouts.length > 0
    ? ratedHangouts.reduce((s, h) => s + ((h as any).rating as number), 0) / ratedHangouts.length
    : null
  const maxRatingCount = Math.max(...ratingBuckets.map(b => b.count), 1)

  // ── Longest streak (consecutive weeks) ──────────────────────────────
  const weeksWithHangout = new Set(hangouts.map(h => {
    const d = new Date(h.date + 'T00:00:00')
    const jan1 = new Date(d.getFullYear(), 0, 1)
    return `${d.getFullYear()}-${Math.ceil((((d.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7)}`
  }))
  let streak = 0, longestStreak = 0, checkDate = new Date()
  for (let i = 0; i < 104; i++) {
    const jan1 = new Date(checkDate.getFullYear(), 0, 1)
    const wk = `${checkDate.getFullYear()}-${Math.ceil((((checkDate.getTime() - jan1.getTime()) / 86400000) + jan1.getDay() + 1) / 7)}`
    if (weeksWithHangout.has(wk)) { streak++; longestStreak = Math.max(longestStreak, streak) }
    else streak = 0
    checkDate = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate() - 7)
  }

  // ── Milestones ───────────────────────────────────────────────────────
  const getMilestone = (days: number) => {
    if (days >= 3650) return '10y+'
    if (days >= 1825) return '5y+'
    if (days >= 1000) return '1000d'
    if (days >= 365)  return '1y+'
    if (days >= 100)  return '100d'
    return null
  }

  if (friends.length === 0) return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1 className="page-title">Stats</h1>
        <p className="page-subtitle">A quiet look at your connections</p>
      </div>
      <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}>
        Add some friends and log some hangouts to see your stats.
      </div>
    </div>
  )

  // ── Card shell (double-rectangle frame) ─────────────────────────────
  const Card = ({ children, style = {}, innerBg }: { children: React.ReactNode; style?: React.CSSProperties; innerBg?: string }) => (
    <div style={{
      background: isDark ? '#1c1c22' : '#ffffff', borderRadius: 22, padding: 8,
      border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, ...style
    }}>
      <div style={{
        background: isDark ? 'linear-gradient(to bottom right, #22222a 0%, #1f1f26 50%, #1c1c22 100%)' : (innerBg || 'linear-gradient(to bottom right, #ffffff 0%, #fefcfb 50%, #faf8f6 100%)'),
        borderRadius: 16, padding: '20px 22px',
        border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, height: '100%',
      }}>
        {children}
      </div>
    </div>
  )
  const CardLabel = ({ children }: { children: React.ReactNode }) => (
    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 'var(--space-md)' }}>{children}</div>
  )

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1 className="page-title">Stats</h1>
        <p className="page-subtitle">A quiet look at your connections</p>
      </div>

      {/* ── Row 1: KPI strip ── */}
      <div className="animate-in animate-in-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Friends', value: totalFriends, color: '#e07a5f', gradient: 'linear-gradient(to bottom right, #ffffff 0%, #fffaf9 50%, #fef6f4 100%)' },
          { label: 'Hangouts', value: totalHangouts, color: '#457b9d', gradient: 'linear-gradient(to bottom right, #ffffff 0%, #f9fbfc 50%, #f4f7fa 100%)' },
          { label: 'Avg / month', value: avgPerMonth, color: '#4a9e6e', gradient: 'linear-gradient(to bottom right, #ffffff 0%, #f9fcfa 50%, #f4f9f6 100%)' },
          { label: 'Places visited', value: uniqueLocations, color: '#c9a96e', gradient: 'linear-gradient(to bottom right, #ffffff 0%, #fdfbf8 50%, #faf8f3 100%)' },
          { label: 'Words journalled', value: wordsJournalled.toLocaleString(), color: '#9b8ec4', gradient: 'linear-gradient(to bottom right, #ffffff 0%, #fbfafd 50%, #f7f5fb 100%)' },
        ].map(s => (
          <div key={s.label} style={{
            background: isDark ? '#1c1c22' : '#ffffff', borderRadius: 22, padding: 7,
            border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
          }}>
            <div style={{
              background: isDark ? 'linear-gradient(to bottom right, #22222a 0%, #1f1f26 50%, #1c1c22 100%)' : s.gradient, borderRadius: 16, padding: '14px 16px',
              border: `1px solid ${isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            }}>
              <div style={{ marginBottom: 6 }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 600, color: s.color, lineHeight: 1.2 }}>{s.value}</span>
              </div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Row 2: Tiers + Monthly activity ── */}
      <div className="animate-in animate-in-2" style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12, marginBottom: 16 }}>

        {/* Tier donut */}
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #fffaf9 50%, #fef6f4 100%)">
          <CardLabel>Friend tiers</CardLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <DonutRing segments={tierSegments} size={110} />
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600 }}>{totalFriends}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>people</span>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
              {(['inner-circle', 'close-friend', 'casual'] as const).map(t => (
                <div key={t} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: tierColor(t), flexShrink: 0 }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-secondary)' }}>{tierLabel(t)}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 600, color: tierColor(t) }}>{tierBreakdown[t]}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>

        {/* Monthly activity */}
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #f9fbfc 50%, #f4f7fa 100%)">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-md)' }}>
            <CardLabel>Monthly activity</CardLabel>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Last 12 months</span>
          </div>
          <MonthBars counts={monthlyCounts} labels={monthlyData.map(d => d.label)} />
        </Card>
      </div>

      {/* ── Row 3: Hangouts by friend + Day of week ── */}
      <div className="animate-in animate-in-3" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12, marginBottom: 16 }}>

        {/* Hangouts by friend */}
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #fbfafd 50%, #f7f5fb 100%)">
          <CardLabel>Hangouts by friend</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hangoutCounts.slice(0, 8).map(f => (
              <Link key={f.id} to={`/friends/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <Avatar initials={f.initials} color={f.avatar_color} url={f.avatar_url} size="sm" />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text)', width: 80, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFirstName(f.name)}</span>
                <div style={{ flex: 1, height: 7, background: 'var(--bg-hover)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${(f.count / maxCount) * 100}%`, background: tierColor(f.tier), borderRadius: 4, transition: 'width 0.5s ease' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.85rem', fontWeight: 600, color: tierColor(f.tier), width: 20, textAlign: 'right' }}>{f.count}</span>
              </Link>
            ))}
          </div>
        </Card>

        {/* Day of week + streak */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Card style={{ flex: 1 }} innerBg="linear-gradient(to bottom right, #ffffff 0%, #f9fcfa 50%, #f4f9f6 100%)">
            <CardLabel>Peak day</CardLabel>
            <DowChart counts={dowCounts} />
            <div style={{ marginTop: 8, fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              You hang out most on <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{peakDay}</span>s
            </div>
          </Card>
          <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #f9fcfa 50%, #f4f9f6 100%)">
            <CardLabel>Weekly streak</CardLabel>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: '#4a9e6e', lineHeight: 1 }}>{longestStreak}<span style={{ fontSize: '0.9rem', fontWeight: 400, marginLeft: 4, color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>wks</span></div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: 4 }}>longest consecutive streak</div>
          </Card>
        </div>
      </div>

      {/* ── Row 4: Feelings + Top 3 ── */}
      <div className="animate-in animate-in-4" style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 12, marginBottom: 16 }}>

        {/* Rating distribution */}
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #fdfbf8 50%, #faf8f3 100%)">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
            <CardLabel>Hangout ratings</CardLabel>
            {avgRating !== null && (
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 600, color: 'var(--accent)', lineHeight: 1 }}>
                {avgRating.toFixed(1)}<span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 400 }}> avg</span>
              </span>
            )}
          </div>
          {ratedHangouts.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No rated hangouts yet.</p>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 72 }}>
              {ratingBuckets.map(({ rating, count }) => {
                const pct = count / maxRatingCount
                const color = rating <= 3 ? '#8899aa' : rating <= 5 ? '#c9a96e' : rating <= 7 ? '#e07a5f' : '#c94b2a'
                return (
                  <div key={rating} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                    {count > 0 && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.52rem', color: 'var(--text-muted)' }}>{count}</span>}
                    <div style={{ width: '70%', maxWidth: 16, borderRadius: 100, background: count > 0 ? color : '#ccc', opacity: count > 0 ? 0.3 + pct * 0.7 : 0.08, height: `${Math.max(pct * 48, count > 0 ? 8 : 3)}px`, transition: 'height 0.4s ease' }} />
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', color: count > 0 ? color : 'var(--text-muted)', fontWeight: count > 0 ? 600 : 400 }}>{rating}</span>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Top 3 friends */}
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #fffaf9 50%, #fef6f4 100%)">
          <CardLabel>Most seen</CardLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {hangoutCounts.slice(0, 3).map((f, i) => {
              const colors = ['#e07a5f', '#457b9d', '#c9a96e']
              return (
                <Link key={f.id} to={`/friends/${f.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-lg)', background: 'var(--bg)', border: `1px solid ${colors[i]}30`, textDecoration: 'none', transition: 'background 0.15s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', background: `${colors[i]}18`, border: `1.5px solid ${colors[i]}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.72rem', fontWeight: 700, color: colors[i] }}>{i + 1}</span>
                  </div>
                  <Avatar initials={f.initials} color={f.avatar_color} url={f.avatar_url} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getFirstName(f.name)}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tierLabel(f.tier)}</div>
                  </div>
                  <span style={{ fontFamily: 'var(--font-serif)', fontWeight: 700, fontSize: '1.1rem', color: colors[i] }}>{f.count}</span>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>

      {/* ── Row 5: Day counters grid ── */}
      <div className="animate-in" style={{ marginBottom: 16 }}>
        <Card innerBg="linear-gradient(to bottom right, #ffffff 0%, #fefcfb 50%, #faf8f6 100%)">
          <CardLabel>Friendship timelines</CardLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {[...friends].sort((a, b) => b.day_count - a.day_count).map(f => {
              const milestone = getMilestone(f.day_count)
              return (
                <Link key={f.id} to={`/friends/${f.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', background: 'var(--bg)', border: '1px solid var(--border)', transition: 'background 0.15s' }}>
                  <Avatar initials={f.initials} color={f.avatar_color} url={f.avatar_url} size="sm" />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{getFirstName(f.name)}</span>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'var(--text-muted)' }}>{tierLabel(f.tier)}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.88rem', fontWeight: 600, color: tierColor(f.tier) }}>day {f.day_count.toLocaleString()}</span>
                    {milestone && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.58rem', fontWeight: 700, color: tierColor(f.tier), background: `${tierColor(f.tier)}15`, padding: '1px 6px', borderRadius: 'var(--radius-full)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{milestone}</span>}
                  </div>
                </Link>
              )
            })}
          </div>
        </Card>
      </div>
    </div>
  )
}
