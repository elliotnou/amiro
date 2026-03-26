import { useState, useRef } from 'react'
import { uploadImage } from '../lib/cloudinary'
import { tierLabel, tierColor } from '../data/mock'

const COLORS = [
  '#e07a5f','#457b9d','#6b8f71','#c9a96e',
  '#7ca5b8','#9b8ec4','#4a7deb','#d4a373',
  '#e76f51','#2d6a4f','#6d597a','#264653',
]

function getInitials(name: string) {
  return name.trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export interface AddFriendPayload {
  name: string
  first_name: string
  last_name: string
  initials: string
  avatar_color: string
  avatar_url: string | null
  location: string | null
  birthday: string | null
  met_how: string | null
  met_through_id: string | null
  met_date: string | null
  tier: 'inner-circle' | 'close-friend' | 'casual'
  tags: string[]
  interests: string[]
}

interface ExistingFriend {
  id: string
  name: string
  avatar_url: string | null
  avatar_color: string
  initials: string
}

interface Props {
  onClose: () => void
  onSave: (payload: AddFriendPayload) => Promise<{ error: string | null } | void>
  existingFriends?: ExistingFriend[]
}

const TIERS: { key: 'inner-circle' | 'close-friend' | 'casual'; emoji: string; desc: string }[] = [
  { key: 'inner-circle', emoji: '✦', desc: 'Your closest people. The ones you call first.' },
  { key: 'close-friend', emoji: '◆', desc: 'Real friends. You check in, they check in.' },
  { key: 'casual', emoji: '◇', desc: 'People you enjoy. Seeing them is always a good vibe.' },
]

const MET_HOW_OPTIONS = ['School','Work','Mutual friend','Online','Neighborhood','Event','Travel','Family','Other']

export default function AddFriendFlow({ onClose, onSave, existingFriends = [] }: Props) {
  const [step, setStep] = useState(0)

  // Step 0 — Who
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [color, setColor] = useState(() => COLORS[Math.floor(Math.random() * COLORS.length)])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Step 1 — Connection + Details
  const [tier, setTier] = useState<'inner-circle' | 'close-friend' | 'casual'>('casual')
  const [metHow, setMetHow] = useState('')
  const [metThroughId, setMetThroughId] = useState<string | null>(null)
  const [metThroughSearch, setMetThroughSearch] = useState('')
  const [metDate, setMetDate] = useState('')
  const [location, setLocation] = useState('')
  const [birthday, setBirthday] = useState('')

  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const overlayMousedown = useRef(false)

  const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(' ')
  const initials = name ? getInitials(name) : '?'

  const handlePhotoSelect = async (file: File) => {
    setAvatarPreview(URL.createObjectURL(file))
    setUploadError(null)
    setUploading(true)
    try {
      const url = await uploadImage(file)
      setAvatarUrl(url)
    } catch {
      setUploadError('Upload failed — check Cloudinary config')
      setAvatarPreview(null)
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSaveError(null)
    const result = await onSave({
      name: name.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      initials: getInitials(name),
      avatar_color: color,
      avatar_url: avatarUrl,
      location: location || null,
      birthday: birthday || null,
      met_how: metHow || null,
      met_through_id: metHow === 'Mutual friend' ? metThroughId : null,
      met_date: metDate || null,
      tier,
      tags: [],
      interests: [],
    })
    setSaving(false)
    if (result && result.error) { setSaveError(result.error); return }
    onClose()
  }

  const overlay: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(12px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '24px', animation: 'fadeIn 200ms ease',
  }
  const card: React.CSSProperties = {
    background: 'var(--bg-card)', borderRadius: 'var(--radius-xl)',
    boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
    width: '100%', maxWidth: 500, overflow: 'hidden',
    animation: 'slideUp 280ms cubic-bezier(0.34,1.56,0.64,1)',
  }

  const miniAvatar = (
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: avatarPreview ? 'transparent' : color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 0 3px var(--bg-card), 0 0 0 5px ${color}33` }}>
        {avatarPreview
          ? <img src={avatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'white', fontWeight: 500 }}>{initials}</span>}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(24px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        @keyframes pulse { 0%,100% { transform: scale(1) } 50% { transform: scale(1.04) } }
        .tier-btn:hover { transform: translateY(-2px); }
      `}</style>

      <div style={overlay} onMouseDown={e => { overlayMousedown.current = e.target === e.currentTarget }} onClick={e => { if (e.target === e.currentTarget && overlayMousedown.current) onClose() }}>
        <div style={card}>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: step === 0 ? '50%' : '100%', background: color, transition: 'width 400ms ease, background 300ms ease' }} />
          </div>

          {/* Header */}
          <div style={{ padding: '16px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0,1].map(i => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 'var(--radius-full)', background: i <= step ? color : 'var(--border)', transition: 'all 300ms ease' }} />
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', padding: 4, lineHeight: 1 }}>×</button>
          </div>

          {/* ── STEP 0: WHO ── */}
          {step === 0 && (
            <div style={{ padding: '20px 24px 24px' }}>
              {/* Big live avatar */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                <div
                  onClick={() => fileRef.current?.click()}
                  style={{
                    width: 108, height: 108, borderRadius: '50%',
                    background: avatarPreview ? 'transparent' : color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    boxShadow: `0 0 0 4px var(--bg-card), 0 0 0 6px ${color}33`,
                    transition: 'background 300ms, box-shadow 300ms',
                    animation: name.trim() ? 'pulse 2s ease-in-out infinite' : 'none',
                  }}
                >
                  {avatarPreview
                    ? <img src={avatarPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontFamily: 'var(--font-serif)', fontSize: '2.2rem', fontWeight: 500, color: 'white' }}>{initials}</span>}
                  <div
                    style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 200ms', color: 'white', fontSize: '0.72rem', fontFamily: 'var(--font-sans)' }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                    onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
                  >
                    {uploading ? '⏳' : '+ photo'}
                  </div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handlePhotoSelect(e.target.files[0])} />
                {uploadError && <p style={{ fontSize: '0.72rem', color: '#dc2626', fontFamily: 'var(--font-sans)', marginTop: 8 }}>{uploadError}</p>}
                {avatarUrl && !uploading && <p style={{ fontSize: '0.72rem', color: 'var(--positive)', fontFamily: 'var(--font-sans)', marginTop: 8 }}>✓ Photo saved</p>}
              </div>

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.45rem', fontWeight: 500, marginBottom: 4, textAlign: 'center' }}>Who are you adding?</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>Tap the circle to add a photo.</p>

              <input
                autoFocus className="form-input"
                placeholder="First name"
                value={firstName} onChange={e => setFirstName(e.target.value)}
                style={{ fontSize: '1.1rem', textAlign: 'center', fontFamily: 'var(--font-serif)', marginBottom: 8 }}
              />
              <input
                className="form-input"
                placeholder="Last name"
                value={lastName} onChange={e => setLastName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && name && setStep(1)}
                style={{ fontSize: '0.92rem', textAlign: 'center', fontFamily: 'var(--font-serif)', marginBottom: 18, opacity: 0.85 }}
              />

              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10, textAlign: 'center' }}>Pick a colour</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 24 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, padding: 0, cursor: 'pointer', border: color === c ? '3px solid var(--text)' : '3px solid transparent', transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 200ms ease', outline: 'none' }} />
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '13px', fontSize: '0.95rem' }} onClick={() => setStep(1)} disabled={!firstName.trim()}>
                Continue →
              </button>
            </div>
          )}

          {/* ── STEP 1: CONNECTION + DETAILS ── */}
          {step === 1 && (
            <div style={{ padding: '20px 24px 24px', maxHeight: '80vh', overflowY: 'auto' }}>
              {miniAvatar}

              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.35rem', fontWeight: 500, marginBottom: 3, textAlign: 'center' }}>
                How do you know {firstName.trim()}?
              </h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>
                Where do they fit in your world?
              </p>

              {/* Tier */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                {TIERS.map(t => (
                  <button key={t.key} className="tier-btn" onClick={() => setTier(t.key)} style={{
                    padding: '12px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    border: `2px solid ${tier === t.key ? tierColor(t.key) : 'var(--border)'}`,
                    background: tier === t.key ? `${tierColor(t.key)}10` : 'var(--bg)',
                    textAlign: 'left', transition: 'all 200ms ease', display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ fontSize: '1.2rem', color: tierColor(t.key), flexShrink: 0, width: 24, textAlign: 'center' }}>{t.emoji}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.85rem', color: tier === t.key ? tierColor(t.key) : 'var(--text)', marginBottom: 1 }}>{tierLabel(t.key)}</div>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* How you met */}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How did you meet?</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: metHow === 'Mutual friend' ? 10 : 16 }}>
                {MET_HOW_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => { setMetHow(metHow === opt ? '' : opt); if (opt !== 'Mutual friend') { setMetThroughId(null); setMetThroughSearch('') } }} style={{
                    padding: '5px 11px', borderRadius: 'var(--radius-full)', cursor: 'pointer',
                    fontFamily: 'var(--font-sans)', fontSize: '0.76rem',
                    border: `1.5px solid ${metHow === opt ? color : 'var(--border)'}`,
                    background: metHow === opt ? `${color}15` : 'transparent',
                    color: metHow === opt ? color : 'var(--text-secondary)',
                    transition: 'all 180ms ease', fontWeight: metHow === opt ? 600 : 400,
                  }}>{opt}</button>
                ))}
              </div>

              {/* Met through — inline extension */}
              {metHow === 'Mutual friend' && existingFriends.length > 0 && (() => {
                const selected = existingFriends.find(f => f.id === metThroughId)
                const filtered = existingFriends.filter(f =>
                  f.name.toLowerCase().includes(metThroughSearch.toLowerCase())
                )
                const avatar = (f: ExistingFriend, size = 24) => (
                  <div style={{ width: size, height: size, borderRadius: '50%', background: f.avatar_url ? 'transparent' : f.avatar_color, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {f.avatar_url
                      ? <img src={f.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <span style={{ fontFamily: 'var(--font-serif)', fontSize: size * 0.42, color: 'white', fontWeight: 500 }}>{f.initials}</span>}
                  </div>
                )
                return (
                  <div style={{ marginBottom: 16, borderRadius: 'var(--radius-md)', border: `1.5px solid ${color}30`, background: `${color}08`, padding: 12 }}>
                    {selected ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>Through</span>
                        {avatar(selected, 28)}
                        <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)', flex: 1 }}>{selected.name}</span>
                        <button onClick={() => setMetThroughId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1rem', padding: '0 2px', lineHeight: 1 }}>×</button>
                      </div>
                    ) : (
                      <>
                        <input
                          autoFocus
                          placeholder="Who introduced you?"
                          value={metThroughSearch}
                          onChange={e => setMetThroughSearch(e.target.value)}
                          style={{
                            width: '100%', padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                            border: '1px solid var(--border)', background: 'var(--bg-card)',
                            fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text)',
                            outline: 'none', boxSizing: 'border-box',
                          }}
                        />
                        <div style={{ maxHeight: 130, overflowY: 'auto', marginTop: 8 }}>
                          {filtered.length === 0 && (
                            <div style={{ padding: '8px 4px', fontFamily: 'var(--font-sans)', fontSize: '0.76rem', color: 'var(--text-muted)', textAlign: 'center' }}>No matches</div>
                          )}
                          {filtered.map(f => (
                            <button key={f.id} onClick={() => { setMetThroughId(f.id); setMetThroughSearch('') }} style={{
                              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                              padding: '6px 8px', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                              border: 'none', background: 'transparent', textAlign: 'left',
                              transition: 'background 120ms ease',
                            }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover, rgba(0,0,0,0.04))')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                              {avatar(f)}
                              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text)' }}>{f.name}</span>
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })()}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 8 }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">When you met</label>
                  <input className="form-input" type="date" value={metDate} onChange={e => setMetDate(e.target.value)} />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Birthday</label>
                  <input className="form-input" type="date" value={birthday} onChange={e => setBirthday(e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Where are they based?</label>
                <input className="form-input" placeholder="City or country" value={location} onChange={e => setLocation(e.target.value)} />
              </div>

              {saveError && (
                <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: '#dc2626', marginBottom: 12 }}>
                  {saveError}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button className="btn btn-ghost" style={{ flex: 1, padding: '12px' }} onClick={() => setStep(0)}>← Back</button>
                <button
                  onClick={handleSave} disabled={saving || uploading}
                  style={{ flex: 2, padding: '13px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: color, color: 'white', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.94rem', opacity: (saving || uploading) ? 0.6 : 1, transition: 'opacity 200ms' }}
                >
                  {saving ? 'Adding…' : `Add ${firstName.trim()} ✦`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
