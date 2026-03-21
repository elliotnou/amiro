import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useSubscription } from '../lib/hooks/useSubscription'
import { LogoIcon } from '../components/Icons'

type SettingsTab = 'account' | 'subscription'

export default function Settings() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const { status: subStatus, startCheckout } = useSubscription()
  const [activeTab, setActiveTab] = useState<SettingsTab>('account')

  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(user?.user_metadata?.display_name || '')
  const [savingName, setSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const handleSaveName = async () => {
    if (!nameValue.trim()) return
    setSavingName(true)
    await supabase.auth.updateUser({ data: { display_name: nameValue.trim() } })
    setSavingName(false)
    setEditingName(false)
    setNameSaved(true)
    setTimeout(() => setNameSaved(false), 2000)
  }

  const tabStyle = (t: SettingsTab): React.CSSProperties => ({
    padding: '8px 18px',
    fontFamily: 'var(--font-serif)',
    fontSize: '0.88rem',
    fontWeight: activeTab === t ? 600 : 400,
    color: activeTab === t ? 'var(--text)' : 'var(--text-muted)',
    borderBottom: activeTab === t ? '2px solid var(--text)' : '2px solid transparent',
    background: 'none',
    border: 'none',
    borderBottomWidth: 2,
    borderBottomStyle: 'solid',
    borderBottomColor: activeTab === t ? 'var(--text)' : 'transparent',
    cursor: 'pointer',
    transition: 'color 150ms, border-color 150ms',
  })

  return (
    <div className="page-container">
      <div className="page-header animate-in">
        <h1 className="page-title">Settings</h1>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 'var(--space-xl)' }} className="animate-in">
        <button style={tabStyle('account')} onClick={() => setActiveTab('account')}>Account</button>
        <button style={tabStyle('subscription')} onClick={() => setActiveTab('subscription')}>Subscription</button>
      </div>

      {/* ── Account tab ── */}
      {activeTab === 'account' && (
        <div className="animate-in">
          <div className="card" style={{ padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)' }}>
            {/* Display name row */}
            <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Display name</div>
              {editingName ? (
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    autoFocus
                    className="form-input"
                    value={nameValue}
                    onChange={e => setNameValue(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') setEditingName(false) }}
                    placeholder="Your name"
                    style={{ flex: 1, fontFamily: 'var(--font-serif)', fontSize: '1rem' }}
                  />
                  <button className="btn btn-primary btn-sm" onClick={handleSaveName} disabled={savingName || !nameValue.trim()}>
                    {savingName ? 'Saving…' : 'Save'}
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => { setEditingName(false); setNameValue(user?.user_metadata?.display_name || '') }}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', color: 'var(--text)' }}>
                    {user?.user_metadata?.display_name || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not set</span>}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {nameSaved && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--positive)' }}>Saved ✓</span>}
                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingName(true)}>Edit</button>
                  </div>
                </div>
              )}
            </div>

            {/* Email row */}
            <div style={{ marginBottom: 'var(--space-lg)', paddingBottom: 'var(--space-lg)', borderBottom: '1px solid var(--border)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Email</div>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>{user?.email}</span>
            </div>

            <button
              onClick={handleSignOut}
              style={{ padding: '10px 16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', transition: 'background 150ms' }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              Sign out
            </button>
          </div>

          {/* About */}
          <div className="card">
            <div className="flex items-center gap-md" style={{ marginBottom: 8 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <LogoIcon size={22} />
              </div>
              <div>
                <div style={{ fontWeight: 500, fontFamily: 'var(--font-serif)' }}>amiro</div>
                <div className="text-xs text-muted text-sans">v0.1.0</div>
              </div>
            </div>
            <p className="text-sm text-secondary text-sans" style={{ lineHeight: 1.6, marginTop: 12 }}>
              A personal CRM for the people who matter.
            </p>
          </div>
        </div>
      )}

      {/* ── Subscription tab ── */}
      {activeTab === 'subscription' && (
        <div className="animate-in">
          {subStatus === 'loading' ? (
            <div style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}>Loading…</div>
          ) : subStatus === 'active' ? (
            <div className="card" style={{ padding: 'var(--space-xl)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-lg)' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--text)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '1rem', flexShrink: 0 }}>✦</div>
                <div>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 600 }}>Pro</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>Active subscription</div>
                </div>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 var(--space-xl)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['Unlimited AI features', 'Ask questions about any friend', 'Gift ideas & hangout ideas', 'Friendship stories', 'Priority support'].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.7rem' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
                To cancel or update billing, email <a href="mailto:support@amiro.app" style={{ color: 'var(--text)' }}>support@amiro.app</a> or manage via your Stripe customer portal.
              </p>
            </div>
          ) : (
            <div>
              <div className="card" style={{ padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Current plan</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, marginBottom: 4 }}>Free</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>Limited features</div>
              </div>

              <div className="card" style={{ padding: 'var(--space-xl)', border: '1.5px solid var(--border-strong)' }}>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)', marginBottom: 8 }}>Pro</div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 600, marginBottom: 4 }}>$5 <span style={{ fontSize: '0.9rem', fontWeight: 400, color: 'var(--text-muted)' }}>/ month</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '16px 0 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {['Unlimited AI features', 'Ask questions about any friend', 'Gift ideas & hangout ideas', 'Friendship stories'].map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                      <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: '0.7rem' }}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <button className="btn btn-primary" style={{ width: '100%', padding: '12px' }} onClick={startCheckout}>
                  Upgrade to Pro
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
