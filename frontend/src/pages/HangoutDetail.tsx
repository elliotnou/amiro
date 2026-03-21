import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useHangout, useHangouts } from '../lib/hooks/useHangouts'
import { useFriends } from '../lib/hooks/useFriends'
import { useGallery } from '../lib/hooks/useGallery'
import Modal from '../components/Modal'
import { IconArrowLeft } from '../components/Icons'

function typeAccent(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('dinner') || t.includes('food') || t.includes('eat') || t.includes('lunch')) return '#e07a5f'
  if (t.includes('coffee') || t.includes('cafe') || t.includes('brunch')) return '#a0784d'
  if (t.includes('hike') || t.includes('outdoor') || t.includes('walk') || t.includes('park')) return '#2d6a4f'
  if (t.includes('bar') || t.includes('drink') || t.includes('club')) return '#264653'
  if (t.includes('movie') || t.includes('film') || t.includes('cinema')) return '#6d597a'
  if (t.includes('sport') || t.includes('gym') || t.includes('game')) return '#457b9d'
  if (t.includes('travel') || t.includes('trip') || t.includes('beach')) return '#4a7deb'
  const defaults = ['#264653', '#6d597a', '#2d6a4f', '#e07a5f']
  return defaults[type.length % defaults.length]
}

function IconPencil() {
  return (
    <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function PencilBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="pencil-btn"
      style={{
        width: 30, height: 30, borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)', background: 'var(--bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0,
        transition: 'opacity 0.15s',
      }}
    >
      <IconPencil />
    </button>
  )
}

function InlineSave({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
      <button onClick={onSave} disabled={saving} className="btn btn-primary" style={{ padding: '5px 14px', fontSize: '0.75rem', borderRadius: 'var(--radius-md)' }}>
        {saving ? 'Saving…' : 'Save'}
      </button>
      <button onClick={onCancel} className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: '0.75rem', borderRadius: 'var(--radius-md)' }}>
        Cancel
      </button>
    </div>
  )
}

type Section = 'header' | 'journal' | 'friends' | 'followups' | null

export default function HangoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hangout, loading, reload } = useHangout(id)
  const { deleteHangout, updateHangout } = useHangouts()
  const { friends } = useFriends()
  const { images } = useGallery(undefined, id)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)
  const [editing, setEditing] = useState<Section>(null)
  const [saving, setSaving] = useState(false)

  // Per-section edit state
  const [editType, setEditType] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editHighlights, setEditHighlights] = useState('')
  const [editFollowUps, setEditFollowUps] = useState('')
  const [editFriendIds, setEditFriendIds] = useState<string[]>([])

  const journalRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (editing === 'journal' && journalRef.current) {
      journalRef.current.style.height = 'auto'
      journalRef.current.style.height = journalRef.current.scrollHeight + 'px'
      journalRef.current.focus()
    }
  }, [editing])

  const open = (section: Section) => {
    if (!hangout) return
    if (section === 'header') { setEditType(hangout.type); setEditLocation(hangout.location); setEditDate(hangout.date) }
    if (section === 'journal') setEditHighlights(hangout.highlights ?? '')
    if (section === 'followups') setEditFollowUps((hangout.follow_ups ?? []).join('\n'))
    if (section === 'friends') setEditFriendIds(hangout.hangout_friends.map(hf => hf.friend_id))
    setEditing(section)
  }

  const cancel = () => setEditing(null)

  const save = async (section: Section) => {
    if (!id || !hangout) return
    setSaving(true)
    if (section === 'header') {
      await updateHangout(id, { type: editType.trim() || hangout.type, location: editLocation.trim() || hangout.location, date: editDate || hangout.date })
    } else if (section === 'journal') {
      await updateHangout(id, { highlights: editHighlights.trim() || null })
    } else if (section === 'followups') {
      await updateHangout(id, { follow_ups: editFollowUps.split('\n').map(s => s.trim()).filter(Boolean) })
    } else if (section === 'friends') {
      await updateHangout(id, {}, editFriendIds)
    }
    await reload()
    setSaving(false)
    setEditing(null)
  }

  const toggleFriend = (fid: string) =>
    setEditFriendIds(prev => prev.includes(fid) ? prev.filter(x => x !== fid) : [...prev, fid])

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    await deleteHangout(id)
    setDeleting(false)
    navigate('/hangouts')
  }

  if (loading) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p></div>
  if (!hangout) return <div className="page-container"><p>Hangout not found.</p></div>

  const accent = typeAccent(hangout.type)
  const banner = images[0]

  return (
    <>
      <style>{`.pencil-btn { opacity: 0.55 } .pencil-btn:hover { opacity: 1; background: var(--bg-hover) !important }`}</style>
      <div style={{ maxWidth: 680, margin: '0 auto', paddingBottom: 'var(--space-3xl)' }}>

        {/* ── Hero ── */}
        <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: 280, marginBottom: 'var(--space-xl)' }}>
          {banner
            ? <img src={banner.url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', cursor: images.length > 1 ? 'pointer' : 'default' }} onClick={() => images.length > 1 && setLightboxIdx(0)} />
            : <div style={{ position: 'absolute', inset: 0, background: accent }} />
          }
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.22) 0%, transparent 45%, rgba(0,0,0,0.38) 100%)' }} />
          <Link to="/hangouts" style={{ position: 'absolute', top: 16, left: 16, zIndex: 2, width: 36, height: 36, borderRadius: '50%', background: 'rgba(0,0,0,0.28)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', textDecoration: 'none' }}><IconArrowLeft size={14} /></Link>
          {images.length > 1 && (
            <button onClick={() => setLightboxIdx(0)} style={{ position: 'absolute', bottom: 16, right: 16, zIndex: 2, background: 'rgba(0,0,0,0.38)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.18)', borderRadius: 'var(--radius-full)', padding: '5px 12px', color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 500, cursor: 'pointer' }}>{images.length} photos</button>
          )}
          <div style={{ position: 'absolute', bottom: 16, left: 16, zIndex: 2, fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{hangout.type}</div>
        </div>

        <div className="animate-in">

          {/* ── Header section ── */}
          <div className="pencil-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-2xl)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {editing === 'header' ? (
                <div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                    <input className="form-input" value={editType} onChange={e => setEditType(e.target.value)} placeholder="Type (e.g. Dinner)" autoFocus style={{ fontSize: '0.9rem' }} />
                    <input className="form-input" type="date" value={editDate} onChange={e => setEditDate(e.target.value)} style={{ fontSize: '0.9rem' }} />
                    <input className="form-input" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="Location" style={{ gridColumn: '1 / -1', fontSize: '0.9rem' }} />
                  </div>
                  <InlineSave onSave={() => save('header')} onCancel={cancel} saving={saving} />
                </div>
              ) : (
                <>
                  <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 500, lineHeight: 1.15, marginBottom: 6, color: 'var(--text-primary)' }}>{hangout.type}</h1>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <span>{hangout.location}</span>
                    <span style={{ opacity: 0.4 }}>·</span>
                    <span>{hangout.date}</span>
                  </div>
                </>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 6, marginLeft: 12, flexShrink: 0 }}>
              {editing !== 'header' && <PencilBtn onClick={() => open('header')} />}
              <button onClick={() => setShowDeleteConfirm(true)} style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-full)', padding: '6px 14px', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', cursor: 'pointer', transition: 'border-color 0.15s, color 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--negative)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--negative)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)' }}
              >Delete</button>
            </div>
          </div>

          {/* ── Journal ── */}
          <div className="pencil-row" style={{ marginBottom: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: editing === 'journal' || hangout.highlights ? 12 : 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Journal</div>
              {editing !== 'journal' && <PencilBtn onClick={() => open('journal')} />}
            </div>

            {editing === 'journal' ? (
              <div>
                <textarea
                  ref={journalRef}
                  className="form-input"
                  value={editHighlights}
                  onChange={e => { setEditHighlights(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
                  placeholder="Write about what happened, how it felt, what you talked about…"
                  style={{ width: '100%', resize: 'none', fontFamily: 'var(--font-serif)', fontSize: '1rem', lineHeight: 1.8, minHeight: 120, boxSizing: 'border-box' }}
                />
                <InlineSave onSave={() => save('journal')} onCancel={cancel} saving={saving} />
              </div>
            ) : hangout.highlights ? (
              <div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 16, letterSpacing: '0.01em' }}>
                  {new Date(hangout.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                </div>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', lineHeight: 1.9, color: 'var(--text-primary)' }}>
                  {hangout.highlights.split('\n').map((line, i) =>
                    line ? <p key={i} style={{ margin: '0 0 0.4em' }}>{line}</p> : <br key={i} />
                  )}
                </div>
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No journal entry yet.</p>
            )}
          </div>

          {/* ── Who was there ── */}
          <div className="pencil-row" style={{ marginBottom: 'var(--space-2xl)', paddingBottom: 'var(--space-2xl)', borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>With</div>
              {editing !== 'friends' && <PencilBtn onClick={() => open('friends')} />}
            </div>

            {editing === 'friends' ? (
              <div>
                <div className="pill-wrap">
                  {friends.map(f => (
                    <button key={f.id} onClick={() => toggleFriend(f.id)} className="pill pill-default" style={{ cursor: 'pointer', opacity: editFriendIds.includes(f.id) ? 1 : 0.4 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: f.avatar_color, display: 'inline-block', marginRight: 5 }} />
                      {f.name.split(' ')[0]}
                    </button>
                  ))}
                </div>
                <InlineSave onSave={() => save('friends')} onCancel={cancel} saving={saving} />
              </div>
            ) : hangout.hangout_friends.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {hangout.hangout_friends.map(hf => (
                  <Link key={hf.id} to={`/friends/${hf.friend_id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, textDecoration: 'none' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: hf.avatar_color || 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontSize: '0.8rem', fontWeight: 500, color: 'white' }}>
                      {hf.friend_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.92rem', fontWeight: 500, color: 'var(--text-primary)', flex: 1 }}>{hf.friend_name}</span>
                    {hf.feeling_label && <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>{hf.feeling_label}</span>}
                  </Link>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>Nobody tagged yet.</p>
            )}
          </div>

          {/* ── Photos ── */}
          {images.length > 1 && (
            <div style={{ marginBottom: 'var(--space-2xl)' }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 'var(--space-lg)' }}>Photos · {images.length}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
                {images.map((img, i) => (
                  <div key={img.id} style={{ aspectRatio: '1', borderRadius: 'var(--radius-lg)', overflow: 'hidden', cursor: 'pointer' }} onClick={() => setLightboxIdx(i)}>
                    <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Follow-ups ── */}
          <div className="pencil-row">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: hangout.follow_ups.length > 0 || editing === 'followups' ? 'var(--space-lg)' : 0 }}>
              <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Follow-ups</div>
              {editing !== 'followups' && <PencilBtn onClick={() => open('followups')} />}
            </div>

            {editing === 'followups' ? (
              <div>
                <textarea
                  className="form-input"
                  value={editFollowUps}
                  onChange={e => setEditFollowUps(e.target.value)}
                  placeholder="One follow-up per line…"
                  rows={4}
                  autoFocus
                  style={{ width: '100%', resize: 'vertical', fontFamily: 'var(--font-sans)', fontSize: '0.88rem', boxSizing: 'border-box' }}
                />
                <InlineSave onSave={() => save('followups')} onCancel={cancel} saving={saving} />
              </div>
            ) : hangout.follow_ups.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {hangout.follow_ups.map((fu, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < hangout.follow_ups.length - 1 ? '1px solid var(--border)' : 'none', fontSize: '0.88rem', fontFamily: 'var(--font-sans)', color: 'var(--text-primary)' }}>
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: '1.5px solid var(--border)', flexShrink: 0, display: 'inline-block' }} />
                    {fu}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)', fontStyle: 'italic', margin: 0 }}>No follow-ups.</p>
            )}
          </div>

        </div>

        {/* Delete confirm */}
        <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete this hangout?">
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
            This will permanently remove the hangout on <strong>{hangout.date}</strong>, including all photos. This cannot be undone.
          </p>
          <div className="modal-actions">
            <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
            <button className="btn btn-primary" style={{ background: 'var(--negative)', borderColor: 'var(--negative)' }} onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </Modal>

        {/* Lightbox */}
        {lightboxIdx !== null && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightboxIdx(null)}>
            <button style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setLightboxIdx(null)}>×</button>
            {lightboxIdx > 0 && (
              <button style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! - 1) }}>‹</button>
            )}
            <img src={images[lightboxIdx]?.url} alt="" style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 'var(--radius-lg)', objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
            {lightboxIdx < images.length - 1 && (
              <button style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: '1.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! + 1) }}>›</button>
            )}
            <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.5)', fontFamily: 'var(--font-sans)', fontSize: '0.72rem' }}>{lightboxIdx + 1} / {images.length}</div>
          </div>
        )}
      </div>
    </>
  )
}
