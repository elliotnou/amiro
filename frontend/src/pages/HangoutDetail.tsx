import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useHangout, useHangouts } from '../lib/hooks/useHangouts'
import { useGallery } from '../lib/hooks/useGallery'
import Avatar from '../components/Avatar'
import Modal from '../components/Modal'
import { IconArrowLeft } from '../components/Icons'

function IconTrash({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  )
}

export default function HangoutDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { hangout, loading } = useHangout(id)
  const { deleteHangout } = useHangouts()
  const { images } = useGallery(undefined, id)

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  const bannerImage = images[0]
  const albumImages = images

  const handleDelete = async () => {
    if (!id) return
    setDeleting(true)
    await deleteHangout(id)
    setDeleting(false)
    navigate('/hangouts')
  }

  if (loading) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p></div>
  if (!hangout) return <div className="page-container"><p>Hangout not found.</p></div>

  return (
    <div className="page-container">
      <div className="flex items-center justify-between animate-in" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/hangouts" className="back-link">
          <IconArrowLeft size={14} /> Hangouts
        </Link>
        <button
          onClick={() => setShowDeleteConfirm(true)}
          style={{
            padding: '6px 14px', borderRadius: 'var(--radius-full)',
            border: '1px solid var(--negative)', background: 'var(--negative-bg)',
            color: 'var(--negative)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <IconTrash size={13} /> Delete
        </button>
      </div>

      {/* Banner photo */}
      {bannerImage && (
        <div
          className="animate-in"
          style={{
            borderRadius: 'var(--radius-xl)', overflow: 'hidden',
            marginBottom: 'var(--space-lg)', cursor: 'pointer',
            boxShadow: 'var(--shadow-md)', position: 'relative',
          }}
          onClick={() => setLightboxIdx(0)}
        >
          <img
            src={bannerImage.url}
            alt="Hangout banner"
            style={{ width: '100%', maxHeight: 320, objectFit: 'cover', display: 'block' }}
          />
          {albumImages.length > 1 && (
            <div style={{
              position: 'absolute', bottom: 12, right: 12,
              background: 'rgba(0,0,0,0.55)', borderRadius: 'var(--radius-full)',
              padding: '4px 12px', color: 'white',
              fontFamily: 'var(--font-sans)', fontSize: '0.72rem',
            }}>
              +{albumImages.length - 1} more
            </div>
          )}
        </div>
      )}

      {/* Header card */}
      <div className="card animate-in animate-in-1" style={{ marginBottom: 'var(--space-xl)', padding: 'var(--space-xl)' }}>
        <div className="flex items-center gap-md" style={{ marginBottom: 'var(--space-sm)' }}>
          <div className="hangout-type-badge" style={{ width: 48, height: 48 }}>
            {hangout.type.slice(0, 3)}
          </div>
          <div>
            <h1 className="page-title" style={{ marginBottom: 0 }}>{hangout.type}</h1>
            <p className="text-sm text-muted text-sans">{hangout.location} · {hangout.date}</p>
          </div>
        </div>
      </div>

      {/* Photo album grid (if more than 1 photo) */}
      {albumImages.length > 1 && (
        <div className="section animate-in animate-in-2">
          <div className="section-header">
            <span className="section-label">Photos</span>
            <span className="text-xs text-muted text-sans">{albumImages.length} photos</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: 8 }}>
            {albumImages.map((img, i) => (
              <div
                key={img.id}
                style={{
                  aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden',
                  cursor: 'pointer', position: 'relative',
                }}
                onClick={() => setLightboxIdx(i)}
              >
                <img src={img.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                {i === 0 && (
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0,
                    background: 'rgba(0,0,0,0.45)', padding: '3px 6px',
                  }}>
                    <span style={{ color: 'white', fontSize: '0.55rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>BANNER</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Who was there */}
      {hangout.hangout_friends.length > 0 && (
        <div className="section animate-in animate-in-2">
          <div className="section-header">
            <span className="section-label">Who was there</span>
          </div>
          <div className="flex flex-col gap-sm">
            {hangout.hangout_friends.map(hf => (
              <Link key={hf.id} to={`/friends/${hf.friend_id}`} className="card card-compact card-clickable">
                <div className="flex items-center gap-md">
                  <Avatar initials={hf.friend_name.split(' ').map(w => w[0]).join('').slice(0, 2)} color="var(--accent)" size="sm" />
                  <span style={{ flex: 1, fontWeight: 500, fontSize: '0.9rem' }}>{hf.friend_name}</span>
                  {hf.feeling_label && <span className="pill pill-default">{hf.feeling_label}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Highlights */}
      {hangout.highlights && (
        <div className="section animate-in animate-in-3">
          <div className="section-header">
            <span className="section-label">Highlights</span>
          </div>
          <div className="card" style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', lineHeight: 1.85 }}>
            {hangout.highlights}
          </div>
        </div>
      )}

      {/* Follow-ups */}
      {hangout.follow_ups.length > 0 && (
        <div className="section animate-in animate-in-4">
          <div className="section-header">
            <span className="section-label">Follow-ups</span>
          </div>
          <div className="flex flex-col gap-sm">
            {hangout.follow_ups.map((fu, i) => (
              <div key={i} className="flex items-center gap-md" style={{
                padding: '10px var(--space-md)', background: 'var(--bg-card)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '0.88rem',
              }}>
                <div className="checkbox" />
                <span>{fu}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Delete this hangout?">
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.88rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-lg)' }}>
          This will permanently remove the hangout with <strong>{hangout.hangout_friends.map(hf => hf.friend_name).join(', ') || 'no one'}</strong> on <strong>{hangout.date}</strong>, including all photos. This cannot be undone.
        </p>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--negative)', borderColor: 'var(--negative)' }}
            onClick={handleDelete}
            disabled={deleting}
          >{deleting ? 'Deleting…' : 'Delete'}</button>
        </div>
      </Modal>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setLightboxIdx(null)}
        >
          <button
            style={{
              position: 'absolute', top: 20, right: 20, background: 'rgba(255,255,255,0.15)',
              border: 'none', color: 'white', width: 40, height: 40, borderRadius: '50%',
              cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setLightboxIdx(null)}
          >×</button>
          {lightboxIdx > 0 && (
            <button
              style={{ position: 'absolute', left: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! - 1) }}
            >‹</button>
          )}
          <img
            src={albumImages[lightboxIdx]?.url}
            alt=""
            style={{ maxWidth: '90vw', maxHeight: '88vh', borderRadius: 'var(--radius-lg)', objectFit: 'contain' }}
            onClick={e => e.stopPropagation()}
          />
          {lightboxIdx < albumImages.length - 1 && (
            <button
              style={{ position: 'absolute', right: 20, top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 44, height: 44, borderRadius: '50%', cursor: 'pointer', fontSize: '1.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! + 1) }}
            >›</button>
          )}
          <div style={{ position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem' }}>
            {lightboxIdx + 1} / {albumImages.length}
          </div>
        </div>
      )}
    </div>
  )
}
