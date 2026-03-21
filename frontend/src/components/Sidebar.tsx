import { NavLink, Link, useNavigate } from 'react-router-dom'
import { IconHome, IconUsers, IconCalendar, IconChart, IconSparkle, IconSettings, LogoIcon } from './Icons'
import { useAuth } from '../lib/auth'
import { useFriends } from '../lib/hooks/useFriends'
import { useHangouts } from '../lib/hooks/useHangouts'
import { useSidebar } from '../lib/SidebarContext'
import { useSubscription } from '../lib/hooks/useSubscription'

const navItems = [
  { to: '/home', label: 'Home', Icon: IconHome },
  { to: '/friends', label: 'Friends', Icon: IconUsers },
  { to: '/hangouts', label: 'Hangouts', Icon: IconCalendar },
  { to: '/stats', label: 'Stats', Icon: IconChart },
]

function IconChevron({ collapsed }: { collapsed: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.25s ease' }}>
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

export default function Sidebar() {
  const { signOut, user } = useAuth()
  const navigate = useNavigate()
  const { friends } = useFriends()
  const { hangouts } = useHangouts()
  const { collapsed, toggle } = useSidebar()
  const { status: subStatus } = useSubscription()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const innerCircleCount = friends.filter(f => f.tier === 'inner-circle').length
  const recentFriends = friends.slice(0, 4)

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      {/* ── Scrollable top section ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Logo + collapse button */}
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-xl)', padding: '0 var(--space-sm)' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <LogoIcon size={18} />
              </div>
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-lg)', marginBottom: 'var(--space-xl)' }}>
            <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none', marginBottom: 0, padding: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', flexShrink: 0 }}>
                <LogoIcon size={18} />
              </div>
              amily
            </Link>
            <button onClick={toggle} title="Collapse sidebar" style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', transition: 'background 0.15s', flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              <IconChevron collapsed={false} />
            </button>
          </div>
        )}

        {!collapsed && <div className="sidebar-section-label">Menu</div>}
        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/home'}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              title={collapsed ? item.label : undefined}
            >
              <span className="link-icon"><item.Icon size={18} /></span>
              {!collapsed && item.label}
            </NavLink>
          ))}
          <NavLink
            to="/ai"
            className={({ isActive }) => `sidebar-link ai-link ${isActive ? 'active' : ''}`}
            title={collapsed ? 'AI Assistant' : undefined}
          >
            <span className="link-icon"><IconSparkle size={18} /></span>
            {!collapsed && 'AI Assistant'}
          </NavLink>
        </nav>

        {!collapsed && (
          <>
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
          </>
        )}
      </div>

      {/* ── Always-visible bottom section ── */}
      <div className="sidebar-bottom" style={{ flexShrink: 0, padding: collapsed ? 'var(--space-md) var(--space-sm)' : undefined }}>
        <nav className="sidebar-nav" style={{ marginBottom: collapsed ? 0 : 'var(--space-md)' }}>
          {!collapsed && subStatus === 'inactive' && (
            <NavLink to="/upgrade" className={({ isActive }) => `sidebar-link ai-link ${isActive ? 'active' : ''}`} style={{ marginBottom: 4 }}>
              <span className="link-icon"><IconSparkle size={18} /></span>
              Upgrade to Pro
            </NavLink>
          )}
          {collapsed && subStatus === 'inactive' && (
            <NavLink to="/upgrade" className={({ isActive }) => `sidebar-link ai-link ${isActive ? 'active' : ''}`} title="Upgrade to Pro">
              <span className="link-icon"><IconSparkle size={18} /></span>
            </NavLink>
          )}

          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Settings' : undefined}
          >
            <span className="link-icon"><IconSettings size={18} /></span>
            {!collapsed && 'Settings'}
          </NavLink>

          {/* Collapse toggle at bottom when collapsed */}
          {collapsed && (
            <button onClick={toggle} title="Expand sidebar" className="sidebar-link" style={{ width: '100%', justifyContent: 'center' }}>
              <span className="link-icon" style={{ opacity: 0.5 }}><IconChevron collapsed={true} /></span>
            </button>
          )}
        </nav>

        {!collapsed && user && (
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
