import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useSubscription } from '../lib/hooks/useSubscription'
import { IconSparkle } from '../components/Icons'

export default function Upgrade() {
  const { status, startCheckout } = useSubscription()
  const [checkingOut, setCheckingOut] = useState(false)
  const [params] = useSearchParams()
  const success = params.get('success') === 'true'
  const canceled = params.get('canceled') === 'true'

  // Reload subscription status after returning from Stripe
  useEffect(() => {
    if (success) {
      // Give the webhook a moment to write the subscription
      const t = setTimeout(() => window.location.replace('/upgrade'), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  if (success && status !== 'active') {
    return (
      <div className="page-container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 'var(--space-3xl)' }}>
        <div style={{ fontSize: '2rem', marginBottom: 'var(--space-lg)' }}>✓</div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 500, marginBottom: 8 }}>Payment successful!</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-xl)' }}>
          Activating your subscription…
        </p>
        <div style={{ width: 32, height: 32, border: '3px solid var(--ai-border)', borderTopColor: 'var(--ai)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    )
  }

  if (status === 'active') {
    return (
      <div className="page-container" style={{ maxWidth: 480, textAlign: 'center', paddingTop: 'var(--space-3xl)' }}>
        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ai)', margin: '0 auto var(--space-xl)' }}>
          <IconSparkle size={26} />
        </div>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 500, marginBottom: 8 }}>You're on amily Pro</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2xl)' }}>
          All AI features and unlimited photo uploads are unlocked. Enjoy.
        </p>
        <Link to="/ai" className="btn btn-ai" style={{ display: 'inline-flex' }}>Go to AI →</Link>
      </div>
    )
  }

  return (
    <div className="page-container" style={{ maxWidth: 480 }}>
      <div className="animate-in" style={{ textAlign: 'center', paddingTop: 'var(--space-2xl)' }}>

        <div style={{ width: 56, height: 56, borderRadius: 'var(--radius-lg)', background: 'var(--ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ai)', margin: '0 auto var(--space-xl)' }}>
          <IconSparkle size={26} />
        </div>

        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 500, marginBottom: 8 }}>amily Pro</h1>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: 'var(--space-2xl)', lineHeight: 1.6 }}>
          Unlock AI features and unlimited photo uploads.
        </p>

        {/* Feature list */}
        <div style={{ textAlign: 'left', marginBottom: 'var(--space-2xl)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { title: 'AI insights & chat', desc: 'Ask anything about your friends — their interests, when you last hung out, what to get them, where to go. Powered by everything you\'ve logged.' },
            { title: 'AI writing tools', desc: 'Generate friendship recaps, icebreakers, heartfelt messages, and more — all written in your voice, grounded in your actual history together.' },
            { title: 'More photo uploads', desc: 'Free accounts are capped at 50 photos per friend. Pro raises that to 500.' },
            { title: 'Profile customization', desc: 'Unlock stickers, themes, and exclusive profile decorations to make every friendship feel distinct.' },
          ].map(f => (
            <div key={f.title} style={{ display: 'flex', gap: 14, padding: '14px 16px', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--ai-border)' }}>
              <span style={{ color: 'var(--ai)', flexShrink: 0, marginTop: 1 }}>✦</span>
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>{f.title}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Price + CTA */}
        <div style={{ background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl)', marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 600, color: 'var(--ai)', marginBottom: 4 }}>$8 <span style={{ fontSize: '1rem', fontWeight: 400 }}>CAD / month</span></div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>Cancel anytime. No hidden fees.</div>
          <button
            className="btn btn-ai"
            style={{ width: '100%', padding: '14px', fontSize: '0.9rem', borderRadius: 'var(--radius-lg)' }}
            onClick={async () => { setCheckingOut(true); await startCheckout(); setCheckingOut(false) }}
            disabled={checkingOut}
          >
            {checkingOut ? 'Redirecting to Stripe…' : 'Upgrade to Pro →'}
          </button>
        </div>

        {canceled && (
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Payment canceled — no charge was made.
          </p>
        )}
      </div>
    </div>
  )
}
