import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useHangouts } from '../lib/hooks/useHangouts'
import { useFriends } from '../lib/hooks/useFriends'
import { feelings } from '../data/mock'
import { uploadImage } from '../lib/cloudinary'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import Modal from '../components/Modal'
import { IconPlus } from '../components/Icons'

const MAX_PHOTOS = 5

function IconList({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  )
}

function IconCalendar({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconImage({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

interface AlbumPhoto {
  preview: string
  url: string | null
  uploading: boolean
}

function typeAccent(type: string): string {
  const t = type.toLowerCase()
  if (t.includes('dinner') || t.includes('food') || t.includes('eat') || t.includes('lunch')) return '#e07a5f'
  if (t.includes('coffee') || t.includes('cafe') || t.includes('brunch')) return '#a0784d'
  if (t.includes('hike') || t.includes('outdoor') || t.includes('walk') || t.includes('park') || t.includes('nature')) return '#2d6a4f'
  if (t.includes('bar') || t.includes('drink') || t.includes('club') || t.includes('cocktail')) return '#264653'
  if (t.includes('movie') || t.includes('film') || t.includes('cinema') || t.includes('show')) return '#6d597a'
  if (t.includes('sport') || t.includes('gym') || t.includes('game') || t.includes('tennis')) return '#457b9d'
  if (t.includes('travel') || t.includes('trip') || t.includes('beach') || t.includes('road')) return '#4a7deb'
  const defaults = ['#264653', '#6d597a', '#2d6a4f', '#e07a5f']
  return defaults[type.length % defaults.length]
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

function HangoutsCalendar({ hangouts, bannerMap }: { hangouts: ReturnType<typeof useHangouts>['hangouts'], bannerMap: Record<string, string> }) {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showPicker, setShowPicker] = useState(false)
  const [pickerYear, setPickerYear] = useState(now.getFullYear())

  const byDate: Record<string, typeof hangouts> = {}
  for (const h of hangouts) {
    if (!byDate[h.date]) byDate[h.date] = []
    byDate[h.date].push(h)
  }

  const firstDow = (new Date(year, month, 1).getDay() + 6) % 7 // Mon=0
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const cells: { day: number; date: string; current: boolean }[] = []
  for (let i = 0; i < firstDow; i++)
    cells.push({ day: daysInPrev - firstDow + i + 1, date: '', current: false })
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ day: d, date, current: true })
  }
  const trailing = (7 - (cells.length % 7)) % 7
  for (let i = 1; i <= trailing; i++) cells.push({ day: i, date: '', current: false })

  const today = now.toISOString().slice(0, 10)
  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1); setSelectedDate(null) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1); setSelectedDate(null) }

  const selectedHangouts = selectedDate ? (byDate[selectedDate] ?? []) : []

  const navBtn = (onClick: () => void, label: string) => (
    <button onClick={onClick} style={{ width: 28, height: 28, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>{label}</button>
  )

  return (
    <div className="animate-in animate-in-1">
      {/* Month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
        {navBtn(prevMonth, '‹')}

        {/* Clickable month/year → opens picker */}
        <button onClick={() => { setShowPicker(p => !p); setPickerYear(year) }} style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 10px', borderRadius: 'var(--radius-md)', transition: 'background 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
          {MONTH_NAMES[month]} {year} ▾
        </button>

        {navBtn(nextMonth, '›')}
      </div>

      {/* Month/year picker dropdown */}
      {showPicker && (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-lg)', marginBottom: 'var(--space-lg)', boxShadow: 'var(--shadow-md)' }}>
          {/* Year row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-md)' }}>
            {navBtn(() => setPickerYear(y => y - 1), '‹')}
            <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pickerYear}</span>
            {navBtn(() => setPickerYear(y => y + 1), '›')}
          </div>
          {/* Month grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {MONTH_NAMES.map((m, i) => {
              const isActive = i === month && pickerYear === year
              return (
                <button key={m} onClick={() => { setMonth(i); setYear(pickerYear); setSelectedDate(null); setShowPicker(false) }}
                  style={{ padding: '7px 4px', borderRadius: 'var(--radius-md)', border: isActive ? '1.5px solid var(--accent)' : '1px solid transparent', background: isActive ? 'var(--accent-bg)' : 'transparent', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--accent)' : 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.12s' }}
                  onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-hover)' }}
                  onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
                  {m.slice(0, 3)}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Day-of-week headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {DAY_LABELS.map(d => (
          <div key={d} style={{ textAlign: 'center', fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {cells.map((cell, i) => {
          const hangoutsOnDay = cell.current ? (byDate[cell.date] ?? []) : []
          const isToday = cell.date === today
          const isSelected = cell.date === selectedDate
          return (
            <button key={i} onClick={() => cell.current && cell.date && setSelectedDate(prev => prev === cell.date ? null : cell.date)}
              style={{
                padding: '8px 4px', borderRadius: 'var(--radius-md)', border: isSelected ? '1.5px solid var(--accent)' : '1px solid transparent',
                background: isSelected ? 'var(--accent-bg)' : isToday ? 'var(--bg-hover)' : 'transparent',
                cursor: cell.current && hangoutsOnDay.length > 0 ? 'pointer' : cell.current ? 'default' : 'default',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minHeight: 60,
                opacity: cell.current ? 1 : 0.25, transition: 'background 0.12s, border-color 0.12s',
              }}
              onMouseEnter={e => { if (cell.current) (e.currentTarget as HTMLButtonElement).style.background = isSelected ? 'var(--accent-bg)' : 'var(--bg-hover)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isSelected ? 'var(--accent-bg)' : isToday ? 'var(--bg-hover)' : 'transparent' }}
            >
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--accent)' : isSelected ? 'var(--accent)' : 'var(--text-primary)', lineHeight: 1 }}>{cell.day}</span>
              {hangoutsOnDay.length > 0 && (
                <div style={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {hangoutsOnDay.slice(0, 3).map((h, j) => (
                    <span key={j} style={{ width: 8, height: 8, borderRadius: '50%', background: typeAccent(h.type), flexShrink: 0 }} />
                  ))}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected day detail */}
      {selectedDate && (
        <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--border)', paddingTop: 'var(--space-xl)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-md)' }}>
            {selectedDate}
          </div>
          {selectedHangouts.length === 0 ? (
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.84rem', color: 'var(--text-muted)' }}>No hangouts on this day.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
              {selectedHangouts.map(h => {
                const banner = bannerMap[h.id]
                const accent = typeAccent(h.type)
                return (
                  <Link key={h.id} to={`/hangouts/${h.id}`} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)', background: 'var(--bg-card)', textDecoration: 'none', transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--bg-card)')}>
                    {banner
                      ? <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', overflow: 'hidden', flexShrink: 0 }}><img src={banner} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></div>
                      : <div style={{ width: 44, height: 44, borderRadius: 'var(--radius-md)', background: accent, flexShrink: 0 }} />
                    }
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 600, color: accent, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{h.type}</div>
                      <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.location}</div>
                      {h.hangout_friends.length > 0 && <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{h.hangout_friends.map(hf => hf.friend_name.split(' ')[0]).join(', ')}</div>}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '1rem', flexShrink: 0 }}>›</span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Hangouts() {
  const { hangouts, loading, createHangout } = useHangouts()
  const { friends } = useFriends()
  const { user } = useAuth()
  const [showLogModal, setShowLogModal] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [bannerMap, setBannerMap] = useState<Record<string, string>>({})
  const photoInputRef = useRef<HTMLInputElement>(null)

  // Load first photo per hangout for banner display
  useEffect(() => {
    if (!user) return
    supabase
      .from('gallery_images')
      .select('hangout_id, url')
      .not('hangout_id', 'is', null)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        const map: Record<string, string> = {}
        for (const row of data ?? []) {
          if (row.hangout_id && !map[row.hangout_id]) map[row.hangout_id] = row.url
        }
        setBannerMap(map)
      })
  }, [user, hangouts])

  // Form state
  const [hDate, setHDate] = useState(new Date().toISOString().slice(0, 10))
  const [hType, setHType] = useState('')
  const [hLocation, setHLocation] = useState('')
  const [hHighlights, setHHighlights] = useState('')
  const [hSelectedFriends, setHSelectedFriends] = useState<string[]>([])
  const [hFeeling, setHFeeling] = useState('')
  const [album, setAlbum] = useState<AlbumPhoto[]>([])
  const [saving, setSaving] = useState(false)

  const toggleFriend = (id: string) =>
    setHSelectedFriends(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id])

  const handlePhotoAdd = async (files: FileList) => {
    const slots = MAX_PHOTOS - album.length
    const toAdd = Array.from(files).slice(0, slots)
    if (toAdd.length === 0) return
    const placeholders: AlbumPhoto[] = toAdd.map(f => ({ preview: URL.createObjectURL(f), url: null, uploading: true }))
    setAlbum(prev => [...prev, ...placeholders])
    await Promise.all(toAdd.map(async (file, i) => {
      try {
        const url = await uploadImage(file, { maxWidth: 1400, quality: 0.84 })
        setAlbum(prev => { const next = [...prev]; const idx = prev.length - toAdd.length + i; if (next[idx]) next[idx] = { ...next[idx], url, uploading: false }; return next })
      } catch {
        setAlbum(prev => { const next = [...prev]; const idx = prev.length - toAdd.length + i; if (next[idx]) next[idx] = { ...next[idx], uploading: false }; return next })
      }
    }))
  }

  const removePhoto = (i: number) => setAlbum(prev => prev.filter((_, idx) => idx !== i))
  const moveFirst = (i: number) => {
    if (i === 0) return
    setAlbum(prev => { const next = [...prev]; const [moved] = next.splice(i, 1); next.unshift(moved); return next })
  }

  const resetForm = () => {
    setHType(''); setHLocation(''); setHHighlights('')
    setHSelectedFriends([]); setHFeeling(''); setAlbum([])
    setHDate(new Date().toISOString().slice(0, 10))
  }

  const anyUploading = album.some(p => p.uploading)

  const handleLog = async () => {
    if (!hType.trim() || !hLocation.trim() || anyUploading) return
    setSaving(true)
    const result = await createHangout(
      { type: hType, location: hLocation, date: hDate, highlights: hHighlights || undefined },
      hSelectedFriends.map(id => ({ id, feeling_label: hFeeling || undefined }))
    )
    if (result?.id && user && album.length > 0) {
      const rows = album.filter(p => p.url).map(p => ({ hangout_id: result.id, url: p.url!, user_id: user.id, caption: null, friend_id: null }))
      if (rows.length > 0) await supabase.from('gallery_images').insert(rows)
    }
    setSaving(false)
    setShowLogModal(false)
    resetForm()
  }

  // Stats
  const now = new Date()
  const thisMonth = hangouts.filter(h => {
    const d = new Date(h.date)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length

  return (
    <div className="page-container">

      {/* Header */}
      <div className="animate-in" style={{ marginBottom: 'var(--space-xl)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
          <div>
            <h1 className="page-title" style={{ marginBottom: 4 }}>Hangouts</h1>
            <p className="page-subtitle">{hangouts.length} {hangouts.length === 1 ? 'memory' : 'memories'} logged</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: 3, gap: 2 }}>
              {([{ v: 'list', Icon: IconList }, { v: 'calendar', Icon: IconCalendar }] as const).map(({ v, Icon }) => (
                <button key={v} onClick={() => setView(v)} title={v === 'list' ? 'List view' : 'Calendar view'} style={{ width: 32, height: 32, border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: view === v ? 'var(--text)' : 'transparent', color: view === v ? 'var(--bg)' : 'var(--text-muted)', transition: 'all 0.18s' }}>
                  <Icon size={15} />
                </button>
              ))}
            </div>
            <button className="btn btn-primary" onClick={() => setShowLogModal(true)}>
              <IconPlus size={16} /> Log hangout
            </button>
          </div>
        </div>

        {/* Stats strip */}
        {hangouts.length > 0 && (
          <div style={{ display: 'flex', gap: 'var(--space-md)' }}>
            {[
              { label: 'Total', value: hangouts.length },
              { label: 'This month', value: thisMonth },
              { label: 'With photos', value: Object.keys(bannerMap).length },
            ].map(s => (
              <div key={s.label} style={{
                flex: 1, padding: '14px 18px', background: 'var(--bg-card)',
                borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex', flexDirection: 'column', gap: 4,
              }}>
                <span style={{ fontFamily: 'var(--font-serif)', fontSize: '1.3rem', fontWeight: 500, lineHeight: 1 }}>{s.value}</span>
                <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{s.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Calendar view */}
      {view === 'calendar' && (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', padding: 'var(--space-xl) var(--space-2xl)', boxShadow: 'var(--shadow-sm)' }}>
          <HangoutsCalendar hangouts={hangouts} bannerMap={bannerMap} />
        </div>
      )}

      {/* List view */}
      {view === 'list' && (loading ? (
        <div style={{ padding: 'var(--space-2xl)', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}>Loading…</div>
      ) : hangouts.length === 0 ? (
        <div style={{
          padding: 'var(--space-3xl) var(--space-2xl)', textAlign: 'center',
          border: '1px dashed var(--border)', borderRadius: 'var(--radius-xl)',
          background: 'var(--bg-card)',
        }}>
          <div style={{ fontSize: '2.2rem', marginBottom: 'var(--space-lg)', opacity: 0.25 }}>◎</div>
          <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 8 }}>No memories yet</div>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>Start logging hangouts to build your memory archive.</div>
        </div>
      ) : (
        <div className="animate-in animate-in-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-lg)' }}>
          {hangouts.map(h => {
            const banner = bannerMap[h.id]
            const accent = typeAccent(h.type)

            if (banner) {
              // ── Photo card ──────────────────────────────
              return (
                <Link key={h.id} to={`/hangouts/${h.id}`} style={{
                  display: 'block', borderRadius: 'var(--radius-xl)', overflow: 'hidden',
                  aspectRatio: '4/3', position: 'relative', textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.12)', border: '1px solid rgba(255,255,255,0.08)', flexShrink: 0,
                }}>
                  <img src={banner} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.78) 100%)' }} />

                  {/* Type badge */}
                  <div style={{
                    position: 'absolute', top: 14, left: 14,
                    background: 'rgba(0,0,0,0.32)', backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.18)',
                    borderRadius: 'var(--radius-full)', padding: '4px 11px',
                    color: 'white', fontFamily: 'var(--font-sans)', fontSize: '0.64rem',
                    fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase',
                  }}>{h.type}</div>

                  {/* Bottom info */}
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div style={{ minWidth: 0, flex: 1, marginRight: 10 }}>
                        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', color: 'white', fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.location}</div>
                        <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'rgba(255,255,255,0.6)' }}>{h.date}</div>
                      </div>
                      {h.hangout_friends.length > 0 && (
                        <div style={{ display: 'flex', flexShrink: 0 }}>
                          {h.hangout_friends.slice(0, 3).map((hf, i) => (
                            <div key={hf.id} style={{
                              width: 26, height: 26, borderRadius: '50%',
                              background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                              WebkitBackdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.5)',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontFamily: 'var(--font-sans)', fontSize: '0.55rem', fontWeight: 700,
                              color: 'white', marginLeft: i > 0 ? -7 : 0, position: 'relative', zIndex: 3 - i,
                            }}>{hf.friend_name.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()}</div>
                          ))}
                        </div>
                      )}
                    </div>
                    {h.highlights && (
                      <div style={{ marginTop: 6, fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'rgba(255,255,255,0.55)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.highlights}</div>
                    )}
                  </div>
                </Link>
              )
            }

            // ── No-photo card ────────────────────────────
            return (
              <Link key={h.id} to={`/hangouts/${h.id}`} style={{
                display: 'flex', flexDirection: 'column', borderRadius: 'var(--radius-xl)',
                overflow: 'hidden', textDecoration: 'none', boxShadow: 'var(--shadow-md)',
                border: '1px solid var(--border)', background: 'var(--bg-card)',
              }}>
                {/* Accent bar */}
                <div style={{ height: 6, background: accent, flexShrink: 0 }} />

                <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.62rem', fontWeight: 700, color: accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{h.type}</div>
                    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.location}</div>
                    <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{h.date}</div>
                    {h.highlights && (
                      <div style={{ marginTop: 10, fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{h.highlights}</div>
                    )}
                  </div>

                  {h.hangout_friends.length > 0 && (
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {h.hangout_friends.slice(0, 4).map(hf => (
                        <span key={hf.id} style={{ padding: '2px 9px', borderRadius: 'var(--radius-full)', background: `${accent}12`, color: accent, fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 500 }}>
                          {hf.friend_name.split(' ')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      ))}

      {/* Log hangout modal */}
      <Modal open={showLogModal} onClose={() => { setShowLogModal(false); resetForm() }} title="Log a hangout">

        {/* Photo album */}
        <div className="form-group">
          <label className="form-label" style={{ marginBottom: 8 }}>
            Photos <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>— up to {MAX_PHOTOS}, first is banner</span>
          </label>
          {album.length > 0 ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 8 }}>
              {album.map((photo, i) => (
                <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: 'var(--bg)' }}>
                  <img src={photo.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: photo.uploading ? 0.5 : 1 }} />
                  {photo.uploading && (
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                      <span style={{ color: 'white', fontSize: '0.65rem', fontFamily: 'var(--font-sans)' }}>↑</span>
                    </div>
                  )}
                  {i === 0 && !photo.uploading && (
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.5)', padding: '3px', textAlign: 'center' }}>
                      <span style={{ color: 'white', fontSize: '0.55rem', fontFamily: 'var(--font-sans)', fontWeight: 600 }}>BANNER</span>
                    </div>
                  )}
                  <div style={{ position: 'absolute', top: 3, right: 3, display: 'flex', gap: 3 }}>
                    {i !== 0 && (
                      <button onClick={() => moveFirst(i)} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(255,255,255,0.9)', border: 'none', cursor: 'pointer', fontSize: '0.55rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Set as banner">★</button>
                    )}
                    <button onClick={() => removePhoto(i)} style={{ width: 18, height: 18, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', border: 'none', cursor: 'pointer', color: 'white', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>×</button>
                  </div>
                </div>
              ))}
              {album.length < MAX_PHOTOS && (
                <button onClick={() => photoInputRef.current?.click()} style={{ aspectRatio: '1', borderRadius: 'var(--radius-md)', border: '2px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, color: 'var(--text-muted)' }}>
                  <IconImage size={16} />
                  <span style={{ fontSize: '0.6rem', fontFamily: 'var(--font-sans)' }}>Add</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => photoInputRef.current?.click()}
              style={{ width: '100%', padding: '18px', borderRadius: 'var(--radius-lg)', border: '2px dashed var(--border)', background: 'var(--bg)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, color: 'var(--text-muted)', transition: 'border-color 0.15s, background 0.15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--accent)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--accent-bg)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg)' }}
            >
              <IconImage size={20} />
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem' }}>Add photos (up to {MAX_PHOTOS})</span>
              <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.68rem', opacity: 0.7 }}>First photo becomes the banner</span>
            </button>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={e => e.target.files && handlePhotoAdd(e.target.files)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input className="form-input" type="date" value={hDate} onChange={e => setHDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Type *</label>
            <input className="form-input" placeholder="Dinner, Coffee, Hike…" value={hType} onChange={e => setHType(e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Location *</label>
          <input className="form-input" placeholder="Where?" value={hLocation} onChange={e => setHLocation(e.target.value)} />
        </div>

        {friends.length > 0 && (
          <div className="form-group">
            <label className="form-label">Who was there</label>
            <div className="pill-wrap">
              {friends.map(f => (
                <button key={f.id} className="pill pill-default" style={{ cursor: 'pointer', opacity: hSelectedFriends.includes(f.id) ? 1 : 0.45 }} onClick={() => toggleFriend(f.id)}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: f.avatar_color, display: 'inline-block', verticalAlign: 'middle', marginRight: 4 }} />
                  {f.name.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">How did it feel?</label>
          <div className="pill-wrap">
            {feelings.map(f => (
              <button key={f.label} className="pill pill-default" style={{ cursor: 'pointer', opacity: hFeeling === f.label ? 1 : 0.45 }} onClick={() => setHFeeling(prev => prev === f.label ? '' : f.label)}>{f.label}</button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Highlights</label>
          <textarea className="form-textarea" placeholder="What stood out?" value={hHighlights} onChange={e => setHHighlights(e.target.value)} />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => { setShowLogModal(false); resetForm() }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleLog} disabled={saving || !hType.trim() || !hLocation.trim() || anyUploading}>
            {saving ? 'Saving…' : anyUploading ? 'Uploading photos…' : 'Save'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
