import { NavLink, Link, useNavigate } from 'react-router-dom'
import { IconHome, IconUsers, IconCalendar, IconChart, IconSparkle, IconSettings, LogoIcon } from './Icons'
import { useAuth } from '../lib/auth'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'

const navItems = [
  { to: '/home', label: 'Home', Icon: IconHome },
  { to: '/friends', label: 'Friends', Icon: IconUsers },
  { to: '/hangouts', label: 'Hangouts', Icon: IconCalendar },
  { to: '/stats', label: 'Stats', Icon: IconChart },
]

export default function Sidebar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const { friends } = useFriends()
  const { hangouts } = useHangouts()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const innerCircleCount = friends.filter(f => f.tier === 'inner-circle').length
  const recentFriends = friends.slice(0, 4)

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Scrollable top section ── */}
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none' }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--text)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'white', flexShrink: 0,
          }}>
            <LogoIcon size={18} />
          </div>
          amily
        </Link>

        <div className="sidebar-section-label">Menu</div>
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              <span className="link-icon"><item.Icon size={18} /></span>
              {item.label}
            </NavLink>
          ))}
          <NavLink
            to="/ai"
            className={({ isActive }) => `sidebar-link ai-link ${isActive ? 'active' : ''}`}
          >
            <span className="link-icon"><IconSparkle size={18} /></span>
            AI Assistant
          </NavLink>
        </nav>

        <div className="sidebar-divider" />

        <div className="sidebar-section-label">Overview</div>
        <div className="sidebar-stats">
          <div className="sidebar-stat">
            <span>Friends</span>
            <span className="sidebar-stat-value">{friends.length}</span>
          </div>
          <div className="sidebar-stat">
            <span>Hangouts</span>
            <span className="sidebar-stat-value">{hangouts.length}</span>
          </div>
          <div className="sidebar-stat">
            <span>Inner circle</span>
            <span className="sidebar-stat-value">{innerCircleCount}</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        {/* Recent friends mini list */}
        {recentFriends.length > 0 && (
          <>
            <div className="sidebar-section-label">Recent</div>
            <nav className="sidebar-nav">
              {recentFriends.map(f => (
                <NavLink
                  key={f.id}
                  to={`/friends/${f.id}`}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: '50%',
                    background: f.avatar_color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.55rem', color: 'white',
                    fontFamily: 'var(--font-serif)', fontWeight: 500, flexShrink: 0,
                  }}>
                    {f.initials}
                  </div>
                  <span style={{ fontSize: '0.85rem' }}>{f.name.split(' ')[0]}</span>
                </NavLink>
              ))}
            </nav>
          </>
        )}
      </div>

      {/* ── Always-visible bottom section ── */}
      <div className="sidebar-bottom" style={{ flexShrink: 0 }}>
        <nav className="sidebar-nav" style={{ marginBottom: 'var(--space-md)' }}>
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span className="link-icon"><IconSettings size={18} /></span>
            Settings
          </NavLink>
        </nav>

        {user && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px var(--space-md)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
          }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out"
              style={{
                padding: '4px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                color: 'var(--text-muted)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.7rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                marginLeft: 8,
              }}
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
