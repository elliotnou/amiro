import { NavLink, Link } from 'react-router-dom'
import { IconHome, IconUsers, IconCalendar, IconChart, IconSparkle, IconSettings, IconGroups } from './Icons'
import { useSidebar } from '../lib/SidebarContext'
import { useTheme } from '../lib/ThemeContext'
import { useSubscription } from '../lib/hooks/useSubscription'

function IconMoon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function IconSun({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

const navItems = [
  { to: '/home', label: 'Home', Icon: IconHome },
  { to: '/friends', label: 'Friends', Icon: IconUsers },
  { to: '/groups', label: 'Groups', Icon: IconGroups },
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
  const { collapsed, toggle } = useSidebar()
  const { toggle: toggleTheme, isDark } = useTheme()
  const { status: subStatus } = useSubscription()

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      {/* ── Scrollable top section ── */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* Logo + collapse button */}
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-xl)', padding: '0 var(--space-sm)' }}>
            <Link to="/" style={{ textDecoration: 'none', display: 'flex' }}>
              <img src="/assets/pagelogo.png" alt="amily" style={{ width: 34, height: 34, objectFit: 'contain' }} />
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 var(--space-lg) 0 28px', marginBottom: 'var(--space-xl)' }}>
            <Link to="/" className="sidebar-logo" style={{ textDecoration: 'none', marginBottom: 0, padding: 0 }}>
              <img src="/assets/pagelogo.png" alt="amily" style={{ height: 34, objectFit: 'contain', flexShrink: 0, marginRight: -8 }} />
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
        </nav>

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

          <button
            onClick={toggleTheme}
            className="sidebar-link"
            title={collapsed ? (isDark ? 'Light mode' : 'Dark mode') : undefined}
            style={{ width: '100%' }}
          >
            <span className="link-icon">{isDark ? <IconSun size={18} /> : <IconMoon size={18} />}</span>
            {!collapsed && (isDark ? 'Light mode' : 'Dark mode')}
          </button>

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

      </div>
    </aside>
  )
}
