import { Link } from 'react-router-dom'

interface TF {
  id: string
  name: string
  initials: string
  avatar_color: string
  avatar_url: string | null
  met_date: string | null
  met_how: string | null
  location: string | null
  tier: string | null
  day_count: number
  hangout_count: number
  starred: boolean
}

const TIER_COLOR: Record<string, string> = {
  'inner-circle': '#e07a5f',
  'close-friend': '#457b9d',
  'casual':       '#c9a96e',
}

const TIER_LABEL: Record<string, string> = {
  'inner-circle': 'Inner circle',
  'close-friend': 'Close friend',
  'casual':       'Casual',
}

function formatMetDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
}

export default function FriendsTimeline({ friends }: { friends: TF[] }) {
  const withDate    = friends.filter(f => f.met_date).sort((a, b) =>
    new Date(b.met_date! + 'T00:00:00').getTime() - new Date(a.met_date! + 'T00:00:00').getTime()
  )
  const withoutDate = friends.filter(f => !f.met_date)

  const byYear: Record<number, TF[]> = {}
  for (const f of withDate) {
    const y = new Date(f.met_date! + 'T00:00:00').getFullYear()
    ;(byYear[y] ??= []).push(f)
  }
  const years = Object.keys(byYear).map(Number).sort((a, b) => b - a)

  if (friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
        No friends yet.
      </div>
    )
  }

  // running index for alternating sides across all years
  let globalIdx = 0

  return (
    <div style={{ paddingBottom: 48 }}>
      <style>{`
        .tl-entry { transition: transform 180ms ease, opacity 180ms ease; }
        .tl-entry:hover { transform: translateY(-2px); }
        .tl-entry:hover .tl-name { color: var(--text) !important; }
      `}</style>

      {/* One continuous doodle stem for the whole timeline */}
      <div style={{ position: 'relative' }}>
        {/* SVG stem — hand-drawn wobbly salmon line */}
        <svg
          style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-50%)', width: 12, height: '100%', zIndex: 0, overflow: 'visible' }}
          preserveAspectRatio="none"
        >
          <line
            x1="6" y1="0" x2="6" y2="100%"
            stroke="#e07a5f" strokeWidth="2.5" strokeLinecap="round"
            strokeDasharray="8 8"
            style={{ opacity: 0.35 }}
          />
        </svg>

      {years.map(year => {
        const entries = byYear[year]
        return (
          <div key={year} style={{ marginBottom: 36 }}>
            {/* Year pill — centered, overlaying the stem */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
              <span style={{
                fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 700,
                color: 'var(--text)', lineHeight: 1,
                background: 'var(--bg)', padding: '4px 14px',
              }}>
                {year}
              </span>
            </div>

            {/* Entries */}
            <div style={{ position: 'relative' }}>

              {entries.map(f => {
                const idx = globalIdx++
                const isLeft = idx % 2 === 0
                const tc = TIER_COLOR[f.tier ?? ''] ?? 'var(--text-muted)'
                const meta = [f.met_how, f.location].filter(Boolean).join(' · ')

                return (
                  <div
                    key={f.id}
                    style={{
                      display: 'flex',
                      justifyContent: isLeft ? 'flex-end' : 'flex-start',
                      paddingLeft: isLeft ? 0 : 'calc(50% + 20px)',
                      paddingRight: isLeft ? 'calc(50% + 20px)' : 0,
                      marginBottom: 28,
                      position: 'relative',
                    }}
                  >
                    {/* Center dot on the stem */}
                    <div style={{
                      position: 'absolute',
                      left: '50%', top: 18,
                      width: 10, height: 10, borderRadius: '50%',
                      background: tc,
                      border: '2.5px solid var(--bg)',
                      transform: 'translateX(-50%)',
                      zIndex: 3,
                    }} />

                    {/* Connector line from dot to entry */}
                    <div style={{
                      position: 'absolute',
                      top: 22,
                      height: 1,
                      borderTop: `1px dashed ${tc}50`,
                      ...(isLeft
                        ? { left: 'calc(50% + 5px)', right: 'calc(50% + 20px)', transform: 'none' }
                        : { left: 'calc(50% + 5px)', width: 15 }
                      ),
                      zIndex: 1,
                    }} />

                    <Link
                      to={`/friends/${f.id}`}
                      className="tl-entry"
                      style={{
                        textDecoration: 'none', color: 'inherit',
                        display: 'flex', alignItems: 'flex-start',
                        gap: 12, maxWidth: 320,
                        flexDirection: isLeft ? 'row-reverse' : 'row',
                        textAlign: isLeft ? 'right' : 'left',
                      }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                        background: f.avatar_color, overflow: 'hidden',
                        border: `2.5px solid ${tc}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}>
                        {f.avatar_url
                          ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: '0.6rem', fontWeight: 500 }}>{f.initials}</span>
                        }
                      </div>

                      {/* Info */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: isLeft ? 'flex-end' : 'flex-start', flexWrap: 'wrap' }}>
                          <span className="tl-name" style={{
                            fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.95rem',
                            color: 'var(--text)', transition: 'color 150ms',
                          }}>
                            {f.name}
                          </span>
                          {f.starred && <span style={{ color: '#e07a5f', fontSize: '0.6rem' }}>★</span>}
                        </div>

                        {f.tier && (
                          <span style={{
                            fontFamily: 'var(--font-sans)', fontSize: '0.58rem', fontWeight: 600,
                            color: tc, background: tc + '14', padding: '1.5px 7px', borderRadius: 20,
                            display: 'inline-block', marginTop: 3,
                          }}>
                            {TIER_LABEL[f.tier]}
                          </span>
                        )}

                        {meta && (
                          <div style={{
                            fontFamily: 'var(--font-sans)', fontSize: '0.7rem',
                            color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3,
                          }}>
                            {meta}
                          </div>
                        )}

                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.65rem',
                          color: 'var(--text-muted)', marginTop: 4, opacity: 0.7,
                        }}>
                          {f.met_date && <span>{formatMetDate(f.met_date)} · </span>}
                          day {f.day_count.toLocaleString()}
                          <span style={{ margin: '0 3px' }}>·</span>
                          {f.hangout_count} hang{f.hangout_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Link>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Unknown date section */}
      {withoutDate.length > 0 && (
        <div style={{ marginBottom: 36 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20, position: 'relative', zIndex: 2 }}>
            <span style={{
              fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 600,
              color: 'var(--text-muted)', fontStyle: 'italic',
              background: 'var(--bg)', padding: '4px 14px',
            }}>
              sometime
            </span>
          </div>

          <div style={{ position: 'relative', opacity: 0.6 }}>

            {withoutDate.map(f => {
              const idx = globalIdx++
              const isLeft = idx % 2 === 0
              const tc = TIER_COLOR[f.tier ?? ''] ?? 'var(--text-muted)'
              const meta = [f.met_how, f.location].filter(Boolean).join(' · ')

              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    justifyContent: isLeft ? 'flex-end' : 'flex-start',
                    paddingLeft: isLeft ? 0 : 'calc(50% + 20px)',
                    paddingRight: isLeft ? 'calc(50% + 20px)' : 0,
                    marginBottom: 28,
                    position: 'relative',
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    left: '50%', top: 18,
                    width: 10, height: 10, borderRadius: '50%',
                    background: tc,
                    border: '2.5px solid var(--bg)',
                    transform: 'translateX(-50%)',
                    zIndex: 3,
                  }} />

                  <div style={{
                    position: 'absolute',
                    top: 22,
                    height: 1,
                    borderTop: `1px dashed ${tc}50`,
                    ...(isLeft
                      ? { left: 'calc(50% + 5px)', right: 'calc(50% + 20px)', transform: 'none' }
                      : { left: 'calc(50% + 5px)', width: 15 }
                    ),
                    zIndex: 1,
                  }} />

                  <Link
                    to={`/friends/${f.id}`}
                    className="tl-entry"
                    style={{
                      textDecoration: 'none', color: 'inherit',
                      display: 'flex', alignItems: 'flex-start',
                      gap: 12, maxWidth: 320,
                      flexDirection: isLeft ? 'row-reverse' : 'row',
                      textAlign: isLeft ? 'right' : 'left',
                    }}
                  >
                    <div style={{
                      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
                      background: f.avatar_color, overflow: 'hidden',
                      border: `2.5px solid ${tc}40`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: '0.6rem', fontWeight: 500 }}>{f.initials}</span>
                      }
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <span className="tl-name" style={{
                        fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.95rem',
                        color: 'var(--text)', transition: 'color 150ms',
                      }}>
                        {f.name}
                      </span>
                      {meta && (
                        <div style={{
                          fontFamily: 'var(--font-sans)', fontSize: '0.7rem',
                          color: 'var(--text-muted)', marginTop: 4,
                        }}>
                          {meta}
                        </div>
                      )}
                      <div style={{
                        fontFamily: 'var(--font-sans)', fontSize: '0.65rem',
                        color: 'var(--text-muted)', marginTop: 4, opacity: 0.7,
                      }}>
                        day {f.day_count.toLocaleString()}
                        <span style={{ margin: '0 3px' }}>·</span>
                        {f.hangout_count} hang{f.hangout_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      </div>{/* end continuous stem wrapper */}
    </div>
  )
}
