import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signupDone, setSignupDone] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { error } = await signUp(email, password, displayName || undefined)
      if (error) {
        setError(error.message)
      } else {
        setSignupDone(true)
      }
    } else {
      const { error } = await signIn(email, password)
      if (error) {
        setError(error.message)
      } else {
        navigate('/home')
      }
    }

    setLoading(false)
  }

  if (signupDone) {
    return (
      <div style={outerStyle}>
        <div style={cardStyle}>
          <Logo />
          <h2 style={headingStyle}>Check your email</h2>
          <p style={subStyle}>
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account, then come back to sign in.
          </p>
          <button
            className="btn btn-ghost"
            style={{ marginTop: 8 }}
            onClick={() => { setSignupDone(false); setMode('signin') }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={outerStyle}>
      <div style={cardStyle}>
        <Logo />

        {/* Tab toggle */}
        <div style={tabRowStyle}>
          <button
            style={tabStyle(mode === 'signin')}
            onClick={() => { setMode('signin'); setError(null) }}
          >
            Sign in
          </button>
          <button
            style={tabStyle(mode === 'signup')}
            onClick={() => { setMode('signup'); setError(null) }}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {mode === 'signup' && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Your name</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Maya Chen"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div style={fieldStyle}>
            <label style={labelStyle}>Email</label>
            <input
              style={inputStyle}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Password</label>
            <input
              style={inputStyle}
              type="password"
              placeholder={mode === 'signup' ? 'Min 6 characters' : '••••••••'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div style={errorStyle}>{error}</div>
          )}

          <button
            className="btn btn-primary"
            type="submit"
            disabled={loading}
            style={{ marginTop: 4, padding: '12px 0', fontSize: '0.95rem', opacity: loading ? 0.6 : 1 }}
          >
            {loading ? '...' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>← Back to home</Link>
        </p>
      </div>
    </div>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 28 }}>
      <img src="/assets/pagelogo.png" alt="amily" style={{ width: 34, height: 34, objectFit: 'contain' }} />
      <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 500 }}>
        amily
      </span>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const outerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '24px',
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-card)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-xl)',
  padding: '40px 36px',
  width: '100%',
  maxWidth: 400,
  boxShadow: 'var(--shadow-md)',
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'var(--font-serif)',
  fontSize: '1.3rem',
  fontWeight: 500,
  marginBottom: 8,
  color: 'var(--text)',
}

const subStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.88rem',
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
  marginBottom: 20,
}

const tabRowStyle: React.CSSProperties = {
  display: 'flex',
  gap: 4,
  background: 'var(--bg)',
  borderRadius: 'var(--radius-md)',
  padding: 4,
  marginBottom: 24,
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1,
  padding: '8px 0',
  borderRadius: 'var(--radius-sm)',
  border: 'none',
  cursor: 'pointer',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.82rem',
  fontWeight: active ? 600 : 400,
  background: active ? 'var(--bg-card)' : 'transparent',
  color: active ? 'var(--text)' : 'var(--text-muted)',
  boxShadow: active ? 'var(--shadow-sm)' : 'none',
  transition: 'all 150ms ease',
})

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 5,
}

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
  fontSize: '0.75rem',
  fontWeight: 500,
  color: 'var(--text-secondary)',
  letterSpacing: '0.02em',
}

const inputStyle: React.CSSProperties = {
  padding: '10px 14px',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'var(--bg)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.9rem',
  color: 'var(--text)',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const errorStyle: React.CSSProperties = {
  padding: '10px 14px',
  background: '#fef2f2',
  border: '1px solid #fecaca',
  borderRadius: 'var(--radius-md)',
  fontFamily: 'var(--font-sans)',
  fontSize: '0.82rem',
  color: '#dc2626',
}
