import { useState, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useFriendGroups } from '../lib/hooks/useFriendGroups'
import { useFriends } from '../lib/hooks/useFriends'
import Modal from '../components/Modal'
import { uploadImage } from '../lib/cloudinary'
import type { FriendGroupWithMembers } from '../lib/hooks/useFriendGroups'
import type { Database } from '../lib/database.types'

type FriendRow = Database['public']['Tables']['friends']['Row']

// ── Palette ────────────────────────────────────────────────────────────────
const COLORS = [
  '#e07a5f','#457b9d','#6b8f71','#c9a96e',
  '#7ca5b8','#9b8ec4','#4a7deb','#d4a373',
  '#e76f51','#2d6a4f','#6d597a','#264653',
]
// ── Small helpers ──────────────────────────────────────────────────────────
function AvatarStack({ members, size = 30 }: { members: FriendRow[]; size?: number }) {
  const shown = members.slice(0, 5)
  const extra = members.length - shown.length
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {shown.map((f, i) => (
        <div key={f.id} style={{
          width: size, height: size, borderRadius: '50%',
          background: f.avatar_url ? 'transparent' : f.avatar_color,
          border: '2px solid var(--bg-card)',
          marginLeft: i === 0 ? 0 : -(size * 0.35),
          zIndex: shown.length - i,
          position: 'relative',
          overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          {f.avatar_url
            ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontSize: size * 0.32, color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 500, lineHeight: 1 }}>{f.initials}</span>}
        </div>
      ))}
      {extra > 0 && (
        <div style={{
          width: size, height: size, borderRadius: '50%',
          background: 'var(--bg-hover)', border: '2px solid var(--bg-card)',
          marginLeft: -(size * 0.35), zIndex: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: 'var(--font-sans)', fontSize: size * 0.3, color: 'var(--text-muted)',
        }}>+{extra}</div>
      )}
    </div>
  )
}

function GroupCard({ group, members, onClick }: {
  group: FriendGroupWithMembers
  members: FriendRow[]
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        background: `linear-gradient(140deg, ${group.color}14 0%, ${group.color}05 100%)`,
        border: `1px solid ${hovered ? group.color + '60' : group.color + '28'}`,
        borderRadius: 'var(--radius-xl)',
        padding: group.avatar_url ? '0 22px 20px' : '22px 24px 20px',
        cursor: 'pointer',
        overflow: 'hidden',
        transition: 'transform 200ms ease, box-shadow 200ms ease, border-color 200ms ease',
        transform: hovered ? 'translateY(-3px)' : 'none',
        boxShadow: hovered
          ? `0 12px 40px ${group.color}22, 0 2px 8px rgba(0,0,0,0.06)`
          : '0 2px 8px rgba(0,0,0,0.04)',
        minHeight: group.avatar_url ? 260 : 180,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Banner image */}
      {group.avatar_url && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 168, overflow: 'hidden',
          borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
        }}>
          <img src={group.avatar_url} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.18) 100%)` }} />
        </div>
      )}

      {/* Top: name */}
      <div style={{ paddingTop: group.avatar_url ? 182 : 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.2, marginBottom: 4 }}>
          {group.name}
        </div>
        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.74rem', color: 'var(--text-muted)', marginBottom: 18 }}>
          {members.length === 0 ? 'No members yet' : `${members.length} ${members.length === 1 ? 'person' : 'people'}`}
        </div>
      </div>

      {/* Bottom: avatar stack */}
      {members.length > 0 && (
        <AvatarStack members={members} size={28} />
      )}
    </div>
  )
}

// ── Create / Edit flow ─────────────────────────────────────────────────────
interface FlowProps {
  allFriends: FriendRow[]
  initialGroup?: FriendGroupWithMembers
  onSave: (name: string, color: string, friendIds: string[], avatarUrl: string | null) => Promise<void>
  onClose: () => void
}

function FriendRow({ f, color, isSelected, onToggle }: { f: FriendRow; color: string; isSelected: boolean; onToggle: () => void }) {
  return (
    <div
      className="fg-friend-row"
      onClick={onToggle}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
        cursor: 'pointer',
        background: isSelected ? `${color}0c` : 'transparent',
        borderBottom: '1px solid var(--border)',
        transition: 'background 120ms',
      }}
    >
      <div style={{ width: 34, height: 34, borderRadius: '50%', background: f.avatar_color, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {f.avatar_url
          ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ fontSize: '0.65rem', color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{f.initials}</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.92rem', fontWeight: 500, color: 'var(--text)' }}>{f.name}</div>
        {f.location && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)' }}>{f.location}</div>}
      </div>
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        border: `2px solid ${isSelected ? color : 'var(--border)'}`,
        background: isSelected ? color : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0, transition: 'all 150ms ease',
      }}>
        {isSelected && (
          <svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </div>
    </div>
  )
}

function GroupFlow({ allFriends, initialGroup, onSave, onClose }: FlowProps) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState(initialGroup?.name ?? '')
  const [color, setColor] = useState(initialGroup?.color ?? COLORS[Math.floor(Math.random() * COLORS.length)])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(initialGroup?.memberIds ?? []))
  const [friendSearch, setFriendSearch] = useState('')
  const [saving, setSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialGroup?.avatar_url ?? null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarRemoved, setAvatarRemoved] = useState(false)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const overlayMousedown = useRef(false)

  const isEdit = !!initialGroup
  const filteredFriends = allFriends.filter(f =>
    f.name.toLowerCase().includes(friendSearch.toLowerCase())
  )

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleAvatarChange = (e: { target: { files?: FileList | null } }) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    let finalAvatarUrl: string | null = null
    if (avatarRemoved) {
      finalAvatarUrl = null
    } else if (avatarFile) {
      try { finalAvatarUrl = await uploadImage(avatarFile, { maxWidth: 400, quality: 0.88 }) } catch { /* skip */ }
    } else {
      finalAvatarUrl = avatarPreview
    }
    await onSave(name.trim(), color, [...selectedIds], finalAvatarUrl)
    setSaving(false)
  }

  const sharedOverlay = {
    position: 'fixed' as const, inset: 0, zIndex: 1000,
    background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(14px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 24, animation: 'fg-fadeIn 200ms ease',
  }

  // ── Edit mode: everything on one screen ──────────────────────────────
  if (isEdit) {
    return (
      <>
        <style>{`.fg-friend-row:hover { background: var(--bg-hover) !important; }`}</style>
        <div style={sharedOverlay}
          onMouseDown={e => { overlayMousedown.current = e.target === e.currentTarget }}
          onClick={e => { if (e.target === e.currentTarget && overlayMousedown.current) onClose() }}
        >
          <div style={{
            width: '100%', maxWidth: 500,
            background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
            maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            animation: 'fg-slideUp 280ms cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {/* Header */}
            <div style={{ padding: '20px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.15rem', fontWeight: 600, color: 'var(--text)' }}>Edit group</span>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '2px 6px', lineHeight: 1 }}>×</button>
            </div>

            {/* Scrollable body */}
            <div style={{ overflowY: 'auto', padding: '20px 22px 26px', flex: 1 }}>

              {/* Banner image */}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Group photo</p>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: '100%', height: 90, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  background: avatarPreview ? 'transparent' : `${color}10`,
                  border: `2px dashed ${color}50`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 22, position: 'relative',
                }}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color, opacity: 0.6 }}>
                      <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem' }}>Upload photo</span>
                    </div>
                }
                {avatarPreview && (
                  <div style={{ position: 'absolute', bottom: 6, right: 6, display: 'flex', gap: 4 }}>
                    <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', backdropFilter: 'blur(4px)' }}>
                      Change
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); setAvatarPreview(null); setAvatarFile(null); setAvatarRemoved(true) }}
                      style={{ background: 'rgba(180,0,0,0.65)', borderRadius: 'var(--radius-sm)', padding: '3px 8px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
                    >
                      Remove
                    </div>
                  </div>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>

              {/* Name */}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Name</p>
              <input
                autoFocus
                className="form-input"
                placeholder="e.g. The Homies, Work Crew, Book Club"
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ fontSize: '1rem', marginBottom: 22, fontFamily: 'var(--font-serif)' }}
              />

              {/* Color */}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Color</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 22 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c, padding: 0, cursor: 'pointer',
                    border: color === c ? '3px solid var(--text)' : '3px solid transparent',
                    transform: color === c ? 'scale(1.2)' : 'scale(1)',
                    transition: 'all 180ms ease', outline: 'none',
                  }} />
                ))}
              </div>

              {/* Members */}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                Members {selectedIds.size > 0 && <span style={{ color, fontWeight: 700 }}>· {selectedIds.size}</span>}
              </p>
              <input
                className="form-input"
                placeholder="Search friends…"
                value={friendSearch}
                onChange={e => setFriendSearch(e.target.value)}
                style={{ marginBottom: 10, fontSize: '0.88rem' }}
              />
              <div style={{ borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: 24 }}>
                {filteredFriends.length === 0
                  ? <div style={{ padding: 16, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No friends found</div>
                  : filteredFriends.map(f => (
                    <FriendRow key={f.id} f={f} color={color} isSelected={selectedIds.has(f.id)} onToggle={() => toggle(f.id)} />
                  ))
                }
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !name.trim()}
                style={{ width: '100%', padding: '13px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: color, color: 'white', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.94rem', opacity: saving || !name.trim() ? 0.6 : 1, transition: 'opacity 200ms' }}
              >
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Create mode: multi-step ───────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes fg-fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes fg-slideUp { from { transform: translateY(28px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
        .fg-friend-row:hover { background: var(--bg-hover) !important; }
      `}</style>
      <div
        style={sharedOverlay}
        onMouseDown={e => { overlayMousedown.current = e.target === e.currentTarget }}
        onClick={e => { if (e.target === e.currentTarget && overlayMousedown.current) onClose() }}
      >
        <div style={{
          width: '100%', maxWidth: 480,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.3)',
          overflow: 'hidden',
          animation: 'fg-slideUp 280ms cubic-bezier(0.34,1.56,0.64,1)',
        }}>
          {/* Progress bar */}
          <div style={{ height: 3, background: 'var(--border)' }}>
            <div style={{ height: '100%', width: `${((step + 1) / 2) * 100}%`, background: color, transition: 'width 380ms ease, background 300ms ease' }} />
          </div>

          {/* Header dots */}
          <div style={{ padding: '16px 22px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 1].map(i => (
                <div key={i} style={{ width: i === step ? 20 : 6, height: 6, borderRadius: 'var(--radius-full)', background: i <= step ? color : 'var(--border)', transition: 'all 300ms ease' }} />
              ))}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '1.2rem', padding: '2px 6px', lineHeight: 1 }}>×</button>
          </div>

          {/* Step 0: Name / color */}
          {step === 0 && (
            <div style={{ padding: '22px 24px 26px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 500, textAlign: 'center', marginBottom: 6 }}>Name your group</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>What do you call these people in your head?</p>

              {/* Banner upload */}
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: '100%', height: 80, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  background: avatarPreview ? 'transparent' : `${color}10`,
                  border: `2px dashed ${color}50`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 18, position: 'relative',
                }}
              >
                {avatarPreview
                  ? <img src={avatarPreview} alt="banner" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <div style={{ display: 'flex', alignItems: 'center', gap: 8, color, opacity: 0.6 }}>
                      <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                      <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem' }}>Add a group photo (optional)</span>
                    </div>
                }
                {avatarPreview && (
                  <div style={{ position: 'absolute', bottom: 5, right: 5, display: 'flex', gap: 4 }}>
                    <div style={{ background: 'rgba(0,0,0,0.5)', borderRadius: 'var(--radius-sm)', padding: '2px 7px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.66rem', backdropFilter: 'blur(4px)' }}>
                      Change
                    </div>
                    <div
                      onClick={e => { e.stopPropagation(); setAvatarPreview(null); setAvatarFile(null); setAvatarRemoved(true) }}
                      style={{ background: 'rgba(180,0,0,0.65)', borderRadius: 'var(--radius-sm)', padding: '2px 7px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.66rem', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
                    >
                      Remove
                    </div>
                  </div>
                )}
                <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              </div>

              <input autoFocus className="form-input" placeholder="e.g. The Homies, Work Crew, Book Club" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && name.trim() && setStep(1)} style={{ fontSize: '1rem', marginBottom: 20, fontFamily: 'var(--font-serif)' }} />

              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.67rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>Color</p>
              <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', marginBottom: 20 }}>
                {COLORS.map(c => (
                  <button key={c} onClick={() => setColor(c)} style={{ width: 26, height: 26, borderRadius: '50%', background: c, padding: 0, cursor: 'pointer', border: color === c ? '3px solid var(--text)' : '3px solid transparent', transform: color === c ? 'scale(1.2)' : 'scale(1)', transition: 'all 180ms ease', outline: 'none' }} />
                ))}
              </div>

              <button className="btn btn-primary" style={{ width: '100%', padding: '13px', background: color, fontSize: '0.95rem' }} onClick={() => setStep(1)} disabled={!name.trim()}>Continue →</button>
            </div>
          )}

          {/* Step 1: Members */}
          {step === 1 && (
            <div style={{ padding: '22px 24px 26px' }}>
              <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.4rem', fontWeight: 500, textAlign: 'center', marginBottom: 4 }}>Who's in the group?</h2>
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: 20 }}>You can always add more later.</p>

              <input autoFocus className="form-input" placeholder="Search friends…" value={friendSearch} onChange={e => setFriendSearch(e.target.value)} style={{ marginBottom: 12, fontSize: '0.9rem' }} />

              <div style={{ maxHeight: 260, overflowY: 'auto', marginBottom: 20, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
                {filteredFriends.length === 0
                  ? <div style={{ padding: 20, textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>No friends found</div>
                  : filteredFriends.map(f => (
                    <FriendRow key={f.id} f={f} color={color} isSelected={selectedIds.has(f.id)} onToggle={() => toggle(f.id)} />
                  ))
                }
              </div>

              {selectedIds.size > 0 && (
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color, textAlign: 'center', marginBottom: 12, fontWeight: 500 }}>
                  {selectedIds.size} {selectedIds.size === 1 ? 'person' : 'people'} selected
                </p>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setStep(0)}>← Back</button>
                <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '13px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer', background: color, color: 'white', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.94rem', opacity: saving ? 0.6 : 1, transition: 'opacity 200ms' }}>
                  {saving ? 'Creating…' : `Create ${name.split(' ')[0]}`}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// ── Group Detail Panel ─────────────────────────────────────────────────────
interface DetailProps {
  group: FriendGroupWithMembers
  allFriends: FriendRow[]
  onClose: () => void
  onDelete: () => void
  onEdit: () => void
}

function GroupDetail({ group, allFriends, onClose, onDelete, onEdit }: DetailProps) {
  const members = allFriends.filter(f => group.memberIds.includes(f.id))
  const [confirmDelete, setConfirmDelete] = useState(false)
  const overlayMousedown = useRef(false)

  return (
    <>
      <style>{`
        @keyframes fg-panelIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .fg-member-card:hover { background: var(--bg-hover) !important; }
      `}</style>
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 900,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(12px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}
        onMouseDown={e => { overlayMousedown.current = e.target === e.currentTarget }}
        onClick={e => { if (e.target === e.currentTarget && overlayMousedown.current) onClose() }}
      >
        <div style={{
          width: '100%', maxWidth: 560,
          background: 'var(--bg-card)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: '0 40px 100px rgba(0,0,0,0.25)',
          overflow: 'hidden',
          animation: 'fg-panelIn 280ms cubic-bezier(0.34,1.56,0.64,1)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
        }}>
          {/* Hero header */}
          <div style={{
            position: 'relative',
            overflow: 'hidden',
            flexShrink: 0,
            borderBottom: `1px solid ${group.color}20`,
          }}>
            {/* Banner */}
            {group.avatar_url ? (
              <div style={{ height: 130, overflow: 'hidden', position: 'relative' }}>
                <img src={group.avatar_url} alt={group.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.08) 0%, rgba(0,0,0,0.38) 100%)' }} />
              </div>
            ) : (
              <div style={{ background: `linear-gradient(140deg, ${group.color}20 0%, ${group.color}06 100%)`, padding: '28px 26px 0' }} />
            )}

            <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 14, background: group.avatar_url ? 'rgba(0,0,0,0.35)' : 'none', border: 'none', cursor: 'pointer', color: group.avatar_url ? 'white' : 'var(--text-muted)', fontSize: '1.2rem', lineHeight: 1, padding: '3px 7px', borderRadius: 'var(--radius-full)', backdropFilter: group.avatar_url ? 'blur(4px)' : 'none' }}>×</button>

            <div style={{ padding: '14px 26px 20px', background: group.avatar_url ? 'var(--bg-card)' : `linear-gradient(140deg, ${group.color}20 0%, ${group.color}06 100%)` }}>
              <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.1, marginBottom: 4 }}>{group.name}</div>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {members.length === 0 ? 'No members' : `${members.length} ${members.length === 1 ? 'person' : 'people'}`}
              </div>
              <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
                <button onClick={onEdit} style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: `1.5px solid ${group.color}40`, background: `${group.color}10`, color: group.color, fontFamily: 'var(--font-sans)', fontSize: '0.76rem', fontWeight: 600, cursor: 'pointer' }}>Edit group</button>
                <button onClick={() => setConfirmDelete(true)} style={{ padding: '6px 14px', borderRadius: 'var(--radius-full)', border: '1.5px solid var(--border)', background: 'transparent', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.76rem', cursor: 'pointer' }}>Delete</button>
              </div>
            </div>
          </div>

          {/* Members list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-secondary)', marginBottom: 14 }}>Members</p>

            {members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', fontFamily: 'var(--font-serif)', fontSize: '0.92rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                No members yet. Hit "Edit group" to add people.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {members.map(f => (
                  <Link key={f.id} to={`/friends/${f.id}`} className="fg-member-card" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', background: 'transparent', transition: 'background 120ms', textDecoration: 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: f.avatar_color, overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {f.avatar_url
                        ? <img src={f.avatar_url} alt={f.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: '0.7rem', color: 'white', fontFamily: 'var(--font-serif)', fontWeight: 500 }}>{f.initials}</span>}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.88rem', fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</div>
                      {f.location && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)' }}>{f.location}</div>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)} title={`Delete "${group.name}"?`}>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          This will permanently remove the group and all its settings. Members won't be affected.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setConfirmDelete(false)}>Cancel</button>
          <button className="btn btn-primary" style={{ background: 'var(--negative)', borderColor: 'var(--negative)' }} onClick={onDelete}>Delete</button>
        </div>
      </Modal>
    </>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────
export default function FriendGroups() {
  const { groups, loading, createGroup, updateGroup, deleteGroup } = useFriendGroups()
  const { friends } = useFriends()

  const [showCreate, setShowCreate] = useState(false)
  const [openGroupId, setOpenGroupId] = useState<string | null>(null)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const openGroup = groups.find(g => g.id === openGroupId)
  const editingGroup = groups.find(g => g.id === editingGroupId)

  const handleCreate = async (name: string, color: string, friendIds: string[], avatarUrl: string | null) => {
    await createGroup({ name, color, avatar_url: avatarUrl }, friendIds)
    setShowCreate(false)
  }

  const handleEdit = async (name: string, color: string, friendIds: string[], avatarUrl: string | null) => {
    if (!editingGroupId) return
    await updateGroup(editingGroupId, { name, color, avatar_url: avatarUrl }, friendIds)
    setEditingGroupId(null)
    setOpenGroupId(null)
  }

  const handleDelete = async () => {
    if (!openGroupId) return
    await deleteGroup(openGroupId)
    setOpenGroupId(null)
  }

  const membersOf = (g: FriendGroupWithMembers) => friends.filter(f => g.memberIds.includes(f.id))

  return (
    <div className="page-container">
      <style>{`
        @keyframes fg-gridIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fg-empty-card {
          border: 2px dashed var(--border-strong);
          border-radius: var(--radius-xl);
          min-height: 180px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          cursor: pointer;
          color: var(--text-muted);
          transition: all 200ms ease;
        }
        .fg-empty-card:hover {
          border-color: var(--text-muted);
          color: var(--text-secondary);
          background: var(--bg-hover);
        }
      `}</style>

      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
        <div>
          <h1 className="page-title">Friend Groups</h1>
          <p className="page-subtitle">Organize your people, your way.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>
          + New Group
        </button>
      </div>

      {loading ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '40vh' }}><p style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--text-muted)' }}>Loading…</p></div> : groups.length === 0 ? (
        <div style={{ maxWidth: 380, margin: '60px auto', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: 16, opacity: 0.3 }}>⬡</div>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, marginBottom: 8 }}>No groups yet</h2>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-muted)', marginBottom: 24, lineHeight: 1.6 }}>
            Group your people however you think of them — by vibe, era, how you know them, or just because.
          </p>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)} style={{ padding: '11px 24px' }}>
            Create your first group
          </button>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
          animation: 'fg-gridIn 320ms ease',
        }}>
          {groups.map(g => (
            <GroupCard
              key={g.id}
              group={g}
              members={membersOf(g)}
              onClick={() => setOpenGroupId(g.id)}
            />
          ))}
          {/* Add tile */}
          <div className="fg-empty-card" onClick={() => setShowCreate(true)}>
            <span style={{ fontSize: '1.6rem', opacity: 0.5 }}>+</span>
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>New group</span>
          </div>
        </div>
      )}

      {/* Create flow */}
      {showCreate && (
        <GroupFlow
          allFriends={friends}
          onSave={handleCreate}
          onClose={() => setShowCreate(false)}
        />
      )}

      {/* Edit flow */}
      {editingGroup && (
        <GroupFlow
          allFriends={friends}
          initialGroup={editingGroup}
          onSave={handleEdit}
          onClose={() => setEditingGroupId(null)}
        />
      )}

      {/* Group detail panel */}
      {openGroup && (
        <GroupDetail
          group={openGroup}
          allFriends={friends}
          onClose={() => setOpenGroupId(null)}
          onDelete={handleDelete}
          onEdit={() => { setEditingGroupId(openGroup.id); setOpenGroupId(null) }}
        />
      )}
    </div>
  )
}
