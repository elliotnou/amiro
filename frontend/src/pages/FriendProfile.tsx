import { useState, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFriend } from '../lib/hooks/useFriend'
import type { FriendContactRow } from '../lib/hooks/useFriend'
import { useImpressions } from '../lib/hooks/useImpressions'
import { useHangouts } from '../lib/hooks/useHangouts'
import LoadingScreen from '../components/LoadingScreen'
import Modal from '../components/Modal'
import RelationshipRadar from '../components/RelationshipRadar'
import { computeRadarScores } from '../lib/friendScores'
import { uploadImage } from '../lib/cloudinary'
import { IconArrowLeft, IconPhone, IconMail, IconLink, IconPaintbrush } from '../components/Icons'
import { tierLabel, tierColor } from '../data/mock'

const MET_HOW_OPTIONS = ['School','Work','Mutual friend','Online','Neighborhood','Event','Travel','Family','Other']

type Tab = 'overview' | 'impressions' | 'gallery' | 'gifts'

function FreshnessRing({ percentage, color, size = 140, trackColor }: { percentage: number; color: string; size?: number; trackColor?: string }) {
  const strokeWidth = size > 100 ? 8 : 6
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={trackColor || 'rgba(255,255,255,0.2)'} strokeWidth={strokeWidth} />
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
    </svg>
  )
}

export default function FriendProfile() {
  const { id } = useParams()
  const { friend, loading, addFact, addNote, upsertContact, updateFriend } = useFriend(id)
  const { impressions, createImpression } = useImpressions(id)
  const { hangouts } = useHangouts()
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const [showFactModal, setShowFactModal] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showImpressionModal, setShowImpressionModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showCustomize, setShowCustomize] = useState(false)
  const [customizeTab, setCustomizeTab] = useState<'info' | 'style'>('info')
  const [themeColor, setThemeColor] = useState<string | null>(null)
  const [profileFont, setProfileFont] = useState('default')
  const [effect, setEffect] = useState('none')

  // Editable info fields (initialized on open)
  const [editName, setEditName] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [editMetHow, setEditMetHow] = useState('')
  const [editMetDate, setEditMetDate] = useState('')
  const [editTier, setEditTier] = useState<'inner-circle' | 'close-friend' | 'casual'>('casual')
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const editPhotoRef = useRef<HTMLInputElement>(null)

  const openCustomize = () => {
    if (!friend) return
    setEditName(friend.name)
    setEditLocation(friend.location || '')
    setEditBirthday(friend.birthday || '')
    setEditMetHow(friend.met_how || '')
    setEditMetDate(friend.met_date || '')
    setEditTier(friend.tier)
    setEditAvatarPreview(friend.avatar_url || null)
    setEditAvatarUrl(friend.avatar_url || null)
    setCustomizeTab('info')
    setShowCustomize(true)
  }

  const handleEditPhoto = async (file: File) => {
    setEditAvatarPreview(URL.createObjectURL(file))
    setUploadingAvatar(true)
    try {
      const url = await uploadImage(file)
      setEditAvatarUrl(url)
    } catch { /* no-op */ } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSaveInfo = async () => {
    setSavingInfo(true)
    await updateFriend({
      name: editName.trim() || friend!.name,
      initials: (editName.trim() || friend!.name).trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2),
      location: editLocation || null,
      birthday: editBirthday || null,
      met_how: editMetHow || null,
      met_date: editMetDate || null,
      tier: editTier,
      avatar_url: editAvatarUrl,
    })
    setSavingInfo(false)
    setShowCustomize(false)
  }

  // Fact modal state
  const [factCategory, setFactCategory] = useState('')
  const [factValue, setFactValue] = useState('')
  const [factCustomCat, setFactCustomCat] = useState('')
  const [savingFact, setSavingFact] = useState(false)

  // Note modal state
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // Impression modal state
  const [impTitle, setImpTitle] = useState('')
  const [impBody, setImpBody] = useState('')
  const [savingImp, setSavingImp] = useState(false)

  // Contact modal state
  const contactRef = {
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    instagram: useRef<HTMLInputElement>(null),
    twitter: useRef<HTMLInputElement>(null),
    linkedin: useRef<HTMLInputElement>(null),
    snapchat: useRef<HTMLInputElement>(null),
  }
  const [savingContact, setSavingContact] = useState(false)

  if (loading) return <LoadingScreen />
  if (!friend) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Friend not found.</p></div>

  const friendHangouts = hangouts.filter(h => h.hangout_friends.some(hf => hf.friend_id === id))
  const tabs: Tab[] = ['overview', 'impressions', 'gallery', 'gifts']
  const freshness = Math.max(10, Math.min(95, 100 - Math.floor(friend.day_count / 40)))
  const tColor = tierColor(friend.tier)
  const bannerColor = themeColor || friend.avatar_color
  const fontFamily = profileFont === 'mono' ? "'SF Mono', 'Fira Code', monospace"
    : profileFont === 'sans' ? 'var(--font-sans)' : undefined

  const colorSwatches = [friend.avatar_color,'#e07a5f','#457b9d','#c9a96e','#7c6fbd','#4a7deb','#2d6a4f','#d4a373','#e76f51','#264653','#6d597a']

  // Relationship radar scores — pure math, no AI
  const radarScores = computeRadarScores({
    hangouts: friendHangouts.map(h => ({ date: h.date })),
    hangoutCount: friend.hangout_count,
    noteCount: friend.notes.length,
    impressionCount: impressions.length,
    factCount: friend.facts.length,
    contact: friend.contact,
  })

  const handleSaveFact = async () => {
    const cat = factCategory === '__custom' ? factCustomCat : factCategory
    if (!cat || !factValue) return
    setSavingFact(true)
    await addFact(cat, factValue)
    setSavingFact(false)
    setShowFactModal(false); setFactCategory(''); setFactValue(''); setFactCustomCat('')
  }

  const handleSaveNote = async () => {
    if (!noteText.trim()) return
    setSavingNote(true)
    await addNote(noteText.trim())
    setSavingNote(false)
    setShowNoteModal(false); setNoteText('')
  }

  const handleSaveImpression = async () => {
    if (!impBody.trim()) return
    setSavingImp(true)
    await createImpression(impTitle || 'Impression', impBody)
    setSavingImp(false)
    setShowImpressionModal(false); setImpTitle(''); setImpBody('')
  }

  const handleSaveContact = async () => {
    setSavingContact(true)
    await upsertContact({
      phone: contactRef.phone.current?.value || null,
      email: contactRef.email.current?.value || null,
      instagram: contactRef.instagram.current?.value || null,
      twitter: contactRef.twitter.current?.value || null,
      linkedin: contactRef.linkedin.current?.value || null,
      snapchat: contactRef.snapchat.current?.value || null,
    })
    setSavingContact(false)
    setShowContactModal(false)
  }

  const contact: Partial<FriendContactRow> = friend.contact ?? {}

  return (
    <div className="page-container" style={{ maxWidth: 1000, ...(fontFamily ? { fontFamily } : {}) }}>
      <Link to="/friends" className="back-link animate-in">
        <IconArrowLeft size={14} /> Friends
      </Link>

      {/* ═══ HERO BANNER ═══ */}
      <div className="animate-in animate-in-1" style={{
        background: bannerColor, borderRadius: 'var(--radius-xl)',
        marginBottom: 'var(--space-lg)', overflow: 'hidden',
        boxShadow: effect === 'glow' ? `0 0 40px ${bannerColor}44, var(--shadow-md)` : 'var(--shadow-md)',
        position: 'relative',
      }}>
        <button onClick={() => setShowCustomize(true)} style={{
          position: 'absolute', top: 12, right: 12, zIndex: 2,
          background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 'var(--radius-full)',
          width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', color: 'white', backdropFilter: 'blur(4px)',
        }} title="Customize profile">
          <IconPaintbrush size={16} />
        </button>

        <div style={{
          background: `linear-gradient(135deg, ${bannerColor} 0%, ${bannerColor}cc 50%, ${bannerColor}88 100%)`,
          padding: '36px 32px 32px', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flexShrink: 0, width: 140, height: 140 }}>
            <FreshnessRing percentage={freshness} color="rgba(255,255,255,0.85)" size={140} trackColor="rgba(255,255,255,0.15)" />
            <div style={{
              position: 'absolute', top: 12, left: 12, right: 12, bottom: 12, borderRadius: '50%',
              background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontFamily: 'var(--font-serif)', fontSize: '2.4rem', fontWeight: 500, backdropFilter: 'blur(4px)',
            }}>
              {friend.initials}
            </div>
            <div style={{
              position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)',
              background: 'white', borderRadius: 'var(--radius-full)', padding: '3px 12px',
              fontSize: '0.65rem', fontFamily: 'var(--font-sans)', fontWeight: 600, color: bannerColor, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)',
            }}>{freshness}% fresh</div>
          </div>

          <div style={{ flex: 1, minWidth: 200, color: 'white' }}>
            <h1 style={{
              fontFamily: fontFamily || 'var(--font-serif)', fontSize: '1.8rem', fontWeight: 500, marginBottom: 4,
              ...(effect === 'gradient' ? { background: 'linear-gradient(135deg, white 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : { color: 'white' }),
            }}>{friend.name}</h1>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', opacity: 0.8, marginBottom: 16 }}>
              {[friend.location, friend.met_how, friend.met_date ? `since ${friend.met_date}` : null].filter(Boolean).join(' · ')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {[
                { label: tierLabel(friend.tier) },
                { label: `day ${friend.day_count.toLocaleString()}`, serif: true },
                friend.birthday ? { label: friend.birthday } : null,
                friend.ai_label ? { label: friend.ai_label, bold: true } : null,
              ].filter(Boolean).map((badge, i) => (
                <span key={i} style={{
                  padding: '4px 12px', borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(4px)',
                  fontSize: '0.72rem', fontFamily: badge!.serif ? 'var(--font-serif)' : 'var(--font-sans)',
                  fontWeight: badge!.bold ? 600 : 500, fontStyle: badge!.serif ? 'italic' : 'normal', color: 'white',
                }}>{badge!.label}</span>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 24, flexShrink: 0 }}>
            {[
              { label: 'Hangouts', value: friend.hangout_count },
              { label: 'Notes', value: friend.notes.length },
              { label: 'Closeness', value: `${radarScores.closeness}%` },
            ].map(stat => (
              <div key={stat.label} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', fontWeight: 600, color: 'white', lineHeight: 1 }}>{stat.value}</div>
                <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.65rem', color: 'rgba(255,255,255,0.7)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div className="tabs animate-in animate-in-2">
        {tabs.map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* ═══ OVERVIEW TAB ═══ */}
      {activeTab === 'overview' && (
        <div className="animate-in">
          {/* AI actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-lg)' }}>
            <Link to={`/ai/gifts/${friend.id}`} className="btn btn-ai btn-sm">Gift ideas</Link>
            <Link to={`/ai/catchup/${friend.id}`} className="btn btn-ai btn-sm">Catch-up brief</Link>
            <Link to={`/ai/hangout-ideas/${friend.id}`} className="btn btn-ai btn-sm">Hangout ideas</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)', marginBottom: 'var(--space-xl)' }}>
            {/* LEFT */}
            <div className="flex flex-col gap-md">
              <div className="card">
                {(friend.tags.length > 0) && (
                  <div style={{ marginBottom: 'var(--space-md)' }}>
                    <div className="section-label-sm" style={{ marginBottom: 8 }}>Tags</div>
                    <div className="pill-wrap">{friend.tags.map(tag => <span key={tag} className="pill pill-default">{tag}</span>)}</div>
                  </div>
                )}
                <div>
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span className="section-label-sm">Interests</span>
                  </div>
                  <div className="pill-wrap">
                    {friend.interests.map(i => <span key={i} className="pill pill-accent">{i}</span>)}
                    {friend.interests.length === 0 && <span className="text-xs text-muted text-sans">None yet</span>}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span className="section-label-sm">Contact</span>
                  <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 6px', fontSize: '0.68rem' }} onClick={() => setShowContactModal(true)}>Edit</button>
                </div>
                {Object.values(contact).some(Boolean) ? (
                  <div className="flex flex-col gap-sm">
                    {contact.phone && <ContactRow icon={<IconPhone size={12} />} value={contact.phone} bg="var(--positive-bg)" color="var(--positive)" />}
                    {contact.email && <ContactRow icon={<IconMail size={12} />} value={contact.email} bg="var(--accent-bg)" color="var(--accent)" />}
                    {contact.instagram && <ContactRow icon={<IconLink size={12} />} value={contact.instagram} bg="var(--inner-circle-bg)" color="var(--inner-circle)" />}
                    {contact.twitter && <ContactRow icon={<IconLink size={12} />} value={contact.twitter} bg="var(--close-friend-bg)" color="var(--close-friend)" />}
                    {contact.linkedin && <ContactRow icon={<IconLink size={12} />} value={contact.linkedin} bg="var(--accent-bg)" color="var(--accent)" />}
                    {contact.snapchat && <ContactRow icon={<IconLink size={12} />} value={contact.snapchat} bg="var(--casual-bg)" color="var(--casual)" />}
                  </div>
                ) : (
                  <button className="btn btn-default btn-sm" onClick={() => setShowContactModal(true)}>Add contact info</button>
                )}
              </div>
            </div>

            {/* RIGHT — Relationship Radar */}
            <div className="flex flex-col gap-md">
              <div className="card" style={{ padding: 'var(--space-md)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <div className="flex items-center justify-between" style={{ width: '100%', marginBottom: 4 }}>
                  <span className="section-label-sm">Relationship radar</span>
                  <span className="text-xs text-muted text-sans">pure math</span>
                </div>
                <RelationshipRadar scores={radarScores} color={friend.avatar_color} size={200} />
              </div>

              <div className="card">
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span className="section-label-sm">Facts</span>
                  <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 6px', fontSize: '0.68rem' }} onClick={() => setShowFactModal(true)}>+ add</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {friend.facts.map(fact => (
                    <div key={fact.id} style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 'var(--radius-sm)' }}>
                      <div className="text-xs text-muted text-sans" style={{ marginBottom: 2 }}>{fact.category}</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{fact.value}</div>
                    </div>
                  ))}
                  {friend.facts.length === 0 && <span className="text-xs text-muted text-sans">No facts yet</span>}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="section">
            <div className="section-header">
              <span className="section-label">Notes</span>
              <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => setShowNoteModal(true)}>+ add</button>
            </div>
            {friend.notes.length > 0 ? (
              <div className="card">
                <div className="flex flex-col" style={{ gap: '10px' }}>
                  {friend.notes.map(note => (
                    <div key={note.id} className="flex gap-md items-start" style={{ fontSize: '0.88rem' }}>
                      <span className="text-muted text-sans" style={{ width: '80px', flexShrink: 0, fontSize: '0.72rem', paddingTop: '3px' }}>{note.date}</span>
                      <span>{note.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted font-italic">No notes yet.</p>
            )}
          </div>

          {/* Hangouts */}
          {friendHangouts.length > 0 && (
            <div className="section">
              <div className="section-header"><span className="section-label">Hangouts</span></div>
              <div className="flex flex-col gap-sm">
                {friendHangouts.map(h => {
                  const hf = h.hangout_friends.find(f => f.friend_id === id)
                  return (
                    <Link key={h.id} to={`/hangouts/${h.id}`} className="hangout-row" style={{ padding: 'var(--space-md)' }}>
                      <div className="hangout-type-badge" style={{ width: 36, height: 36, fontSize: '0.6rem' }}>{h.type.slice(0, 3)}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.88rem', fontWeight: 500 }}>{h.type} — {h.location}</div>
                        <div className="text-xs text-muted text-sans">{h.date}</div>
                      </div>
                      {hf?.feeling_label && <span className="pill pill-default">{hf.feeling_label}</span>}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══ IMPRESSIONS TAB ═══ */}
      {activeTab === 'impressions' && (
        <div className="animate-in">
          <button className="btn btn-default" onClick={() => setShowImpressionModal(true)} style={{ marginBottom: 'var(--space-lg)' }}>Write an impression</button>
          {impressions.length > 0 ? impressions.map(imp => (
            <div key={imp.id} className="impression">
              <div className="impression-title">{imp.title}</div>
              <div className="impression-date">{imp.date}</div>
              <div className="impression-body">{imp.body}</div>
            </div>
          )) : (
            <div className="empty-state"><p>No impressions yet. Write one — it's just for you.</p></div>
          )}
        </div>
      )}

      {/* ═══ GALLERY TAB ═══ */}
      {activeTab === 'gallery' && (
        <div className="animate-in">
          <button className="btn btn-default" style={{ marginBottom: 'var(--space-lg)' }}>Add photos</button>
          <div className="empty-state"><p>No photos yet. Add some memories.</p></div>
        </div>
      )}

      {/* ═══ GIFTS TAB ═══ */}
      {activeTab === 'gifts' && (
        <div className="animate-in">
          <Link to={`/ai/gifts/${friend.id}`} className="btn btn-ai" style={{ marginBottom: 'var(--space-lg)' }}>AI gift suggestions</Link>
          <div className="section">
            <div className="section-header"><span className="section-label-sm">Gift history</span></div>
            <div className="empty-state"><p>No gifts logged yet.</p></div>
          </div>
        </div>
      )}

      {/* ═══ MODALS ═══ */}
      <Modal open={showFactModal} onClose={() => setShowFactModal(false)} title="Add a fact">
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="pill-wrap">
            {['Fave food','Drink order','Dietary','Fave artist','Fave color','Fave movie','Fave book','Shirt size','Other'].map(cat => (
              <button key={cat} className={`pill pill-default`} style={{ cursor: 'pointer', opacity: factCategory === cat ? 1 : 0.5 }} onClick={() => setFactCategory(cat)}>{cat}</button>
            ))}
          </div>
          {factCategory === 'Other' && (
            <input className="form-input" style={{ marginTop: 8 }} placeholder="Custom category" value={factCustomCat} onChange={e => setFactCustomCat(e.target.value)} />
          )}
        </div>
        <div className="form-group">
          <label className="form-label">Value</label>
          <input className="form-input" placeholder="Enter value..." value={factValue} onChange={e => setFactValue(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowFactModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveFact} disabled={savingFact || !factValue}>{savingFact ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add a note">
        <div className="form-group">
          <textarea className="form-textarea form-textarea-serif" placeholder="What's on your mind about this person?" value={noteText} onChange={e => setNoteText(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowNoteModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <Modal open={showImpressionModal} onClose={() => setShowImpressionModal(false)} title="Write an impression">
        <div className="form-group">
          <input className="form-input" placeholder="Title (optional)" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }} value={impTitle} onChange={e => setImpTitle(e.target.value)} />
        </div>
        <div className="form-group">
          <textarea className="form-textarea form-textarea-serif" placeholder="Write freely. This is just for you..." value={impBody} onChange={e => setImpBody(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowImpressionModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveImpression} disabled={savingImp || !impBody.trim()}>{savingImp ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      <Modal open={showCustomize} onClose={() => setShowCustomize(false)} title="Customize profile">
        <div className="form-group">
          <label className="form-label">Theme color</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {colorSwatches.map(c => (
              <button key={c} onClick={() => setThemeColor(c === friend.avatar_color ? null : c)} style={{
                width: 32, height: 32, borderRadius: '50%', background: c, padding: 0, cursor: 'pointer',
                border: (themeColor || friend.avatar_color) === c ? '3px solid var(--text)' : '3px solid transparent',
                transform: (themeColor || friend.avatar_color) === c ? 'scale(1.15)' : 'scale(1)',
                transition: 'all 0.2s',
              }} />
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Font style</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{key:'default',label:'Default',font:'var(--font-serif)'},{key:'sans',label:'Clean',font:'var(--font-sans)'},{key:'mono',label:'Mono',font:"'SF Mono', monospace"}].map(f => (
              <button key={f.key} onClick={() => setProfileFont(f.key)} style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: f.font, fontSize: '0.82rem',
                border: profileFont === f.key ? `2px solid ${bannerColor}` : '2px solid var(--border)',
                background: profileFont === f.key ? `${bannerColor}10` : 'var(--bg)',
                color: profileFont === f.key ? bannerColor : 'var(--text-muted)', transition: 'all 0.2s',
              }}>{f.label}</button>
            ))}
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">Effects</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {[{key:'none',label:'None'},{key:'glow',label:'Glow'},{key:'gradient',label:'Gradient text'}].map(e => (
              <button key={e.key} onClick={() => setEffect(e.key)} style={{
                padding: '8px 16px', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: '0.78rem',
                border: effect === e.key ? `2px solid ${bannerColor}` : '2px solid var(--border)',
                background: effect === e.key ? `${bannerColor}10` : 'var(--bg)',
                color: effect === e.key ? bannerColor : 'var(--text-muted)', transition: 'all 0.2s',
              }}>{e.label}</button>
            ))}
          </div>
        </div>
        <div style={{ padding: 'var(--space-md)', borderRadius: 'var(--radius-md)', background: bannerColor, textAlign: 'center', ...(effect === 'glow' ? { boxShadow: `0 0 30px ${bannerColor}44` } : {}) }}>
          <span style={{ fontFamily: fontFamily || 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, ...(effect === 'gradient' ? { background: 'linear-gradient(135deg,white,rgba(255,255,255,0.6))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } : { color: 'white' }) }}>{friend.name}</span>
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowCustomize(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={() => setShowCustomize(false)}>Apply</button>
        </div>
      </Modal>

      <Modal open={showContactModal} onClose={() => setShowContactModal(false)} title="Edit contact info">
        {(['phone','email','instagram','twitter','linkedin','snapchat'] as const).map(field => (
          <div key={field} className="form-group">
            <label className="form-label">{field.charAt(0).toUpperCase() + field.slice(1)}</label>
            <input className="form-input" ref={contactRef[field]} defaultValue={contact[field] || ''} placeholder={field === 'phone' ? '(555) 000-0000' : field === 'email' ? 'name@email.com' : '@username'} />
          </div>
        ))}
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowContactModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveContact} disabled={savingContact}>{savingContact ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>
    </div>
  )
}

function ContactRow({ icon, value, bg, color }: { icon: React.ReactNode; value: string; bg: string; color: string }) {
  return (
    <div className="flex items-center gap-sm">
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color, flexShrink: 0 }}>{icon}</div>
      <span style={{ fontSize: '0.82rem' }}>{value}</span>
    </div>
  )
}

function RingWidget({ value, color, label }: { value: number; color: string; label: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 8px' }}>
        <FreshnessRing percentage={value} color={color} size={80} trackColor="var(--border)" />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '1rem', color }}>{value}%</div>
      </div>
      <div className="text-xs text-muted text-sans">{label}</div>
    </div>
  )
}
