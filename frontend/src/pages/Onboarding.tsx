import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFriends } from '../lib/hooks/useFriends'
import AddFriendFlow from '../components/AddFriendFlow'
import type { AddFriendPayload } from '../components/AddFriendFlow'

export default function Onboarding() {
  const navigate = useNavigate()
  const { createFriend } = useFriends()
  const [showFlow, setShowFlow] = useState(false)

  const handleSave = async (payload: AddFriendPayload) => {
    const result = await createFriend(payload)
    if (!result?.error) navigate('/home')
    return result
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--space-2xl)',
    }}>
      <div style={{ maxWidth: 480, width: '100%' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-3xl)' }}>
          <img src="/assets/pagelogo.png" alt="amily" style={{ height: 52, objectFit: 'contain', marginBottom: 6 }} />
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)',
            letterSpacing: '0.1em', textTransform: 'uppercase',
          }}>your relationship graph</p>
        </div>

        {/* Welcome card */}
        <div style={{
          background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
          padding: 'var(--space-2xl)', border: '1px solid var(--border)',
          marginBottom: 'var(--space-lg)',
        }}>
          <h2 style={{
            fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 500,
            marginBottom: 'var(--space-md)',
          }}>Welcome.</h2>
          <p style={{
            fontFamily: 'var(--font-sans)', fontSize: '0.86rem', color: 'var(--text-secondary)',
            lineHeight: 1.75, marginBottom: 'var(--space-xl)',
          }}>
            Amily helps you stay close to the people who matter — remember what's important to them,
            log your time together, and notice when a friendship is drifting.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              'Remember facts, notes, and shared moments',
              'Log hangouts and track your connection over time',
              'Get nudges when a friendship needs attention',
            ].map(item => (
              <div key={item} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 5, height: 5, background: 'var(--accent)', borderRadius: '50%', flexShrink: 0 }} />
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.83rem', color: 'var(--text-secondary)' }}>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTAs */}
        <button
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '0.92rem', marginBottom: 8 }}
          onClick={() => setShowFlow(true)}
        >
          Add your first friend
        </button>
        <button
          className="btn btn-ghost"
          style={{ width: '100%', fontSize: '0.83rem' }}
          onClick={() => navigate('/home')}
        >
          Skip for now
        </button>
      </div>

      {showFlow && (
        <AddFriendFlow onClose={() => setShowFlow(false)} onSave={handleSave} />
      )}
    </div>
  )
}
