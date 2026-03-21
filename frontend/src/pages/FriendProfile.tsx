import { useState, useRef, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useFriend } from '../lib/hooks/useFriend'
import type { FriendContactRow } from '../lib/hooks/useFriend'
import { useFriends } from '../lib/hooks/useFriends'
import { useImpressions } from '../lib/hooks/useImpressions'
import { useHangouts } from '../lib/hooks/useHangouts'
import LoadingScreen from '../components/LoadingScreen'
import Modal from '../components/Modal'
import RelationshipRadar from '../components/RelationshipRadar'
import { computeRadarScores } from '../lib/friendScores'
import { uploadImage } from '../lib/cloudinary'
import { IconArrowLeft, IconPhone, IconMail, IconLink, IconPaintbrush } from '../components/Icons'
import { tierLabel, tierColor } from '../data/mock'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useGallery } from '../lib/hooks/useGallery'
import { useSubscription } from '../lib/hooks/useSubscription'
import { callAI, buildFriendContext, PROMPTS } from '../lib/ai'

const MET_HOW_OPTIONS = ['School','Work','Mutual friend','Online','Neighborhood','Event','Travel','Family','Other']

// Pencil icon inline (no Icons.tsx change needed)
function IconPencil({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

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

function IconExpand({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  )
}

type Tab = 'overview' | 'impressions' | 'gallery' | 'gifts' | 'ai'

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

function InnerLabel({ children, style, accent }: { children: React.ReactNode; style?: React.CSSProperties; accent?: string }) {
  return (
    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.66rem', fontWeight: 700, color: accent || 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.1em', ...style as object }}>
      {children}
    </span>
  )
}

export default function FriendProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { friend, loading, addFact, deleteFact, addNote, upsertContact, updateFriend } = useFriend(id)
  const { deleteFriend } = useFriends()
  const { impressions, createImpression, deleteImpression } = useImpressions(id)
  const { hangouts } = useHangouts()
  const { status: subStatus } = useSubscription()
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  // ── AI chat state ──
  type ChatMsg = { role: 'user' | 'assistant'; text: string }
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatBottomRef = useRef<HTMLDivElement>(null)

  // ── Modal visibility ──
  const [showFactModal, setShowFactModal] = useState(false)
  const [showFactsPanel, setShowFactsPanel] = useState(false)
  const [showNoteModal, setShowNoteModal] = useState(false)
  const [showImpressionModal, setShowImpressionModal] = useState(false)
  const [showContactModal, setShowContactModal] = useState(false)
  const [showEditInfo, setShowEditInfo] = useState(false)   // ← info editing
  const [showCustomize, setShowCustomize] = useState(false) // ← style only
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteNameInput, setDeleteNameInput] = useState('')

  const { user } = useAuth()
  const { images: galleryImages, uploading: galleryUploading, uploadPhoto, deleteImage } = useGallery(id)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null)

  // ── Style state (persisted to profile_customizations) ──
  const [themeColor, setThemeColor] = useState<string | null>(null)
  const [profileFont, setProfileFont] = useState('default')
  const [effect, setEffect] = useState('none')

  useEffect(() => {
    if (!id) return
    supabase
      .from('profile_customizations')
      .select('theme_color, font, effect')
      .eq('friend_id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setThemeColor(data.theme_color ?? null)
          setProfileFont(data.font ?? 'default')
          setEffect(data.effect ?? 'none')
        }
      })
  }, [id])

  // ── Edit Info state ──
  const [editName, setEditName] = useState('')
  const [editNickname, setEditNickname] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editBirthday, setEditBirthday] = useState('')
  const [editMetHow, setEditMetHow] = useState('')
  const [editMetDate, setEditMetDate] = useState('')
  const [editTier, setEditTier] = useState<'inner-circle' | 'close-friend' | 'casual'>('casual')
  const [editAvatarPreview, setEditAvatarPreview] = useState<string | null>(null)
  const [editAvatarUrl, setEditAvatarUrl] = useState<string | null>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [savingInfo, setSavingInfo] = useState(false)
  const [interestInput, setInterestInput] = useState('')
  const [showInterestInput, setShowInterestInput] = useState(false)
  const editPhotoRef = useRef<HTMLInputElement>(null)
  const factsPanelMousedown = useRef(false)

  const openEditInfo = () => {
    if (!friend) return
    setEditName(friend.name)
    setEditNickname(friend.nickname || '')
    setEditLocation(friend.location || '')
    setEditBirthday(friend.birthday || '')
    setEditMetHow(friend.met_how || '')
    setEditMetDate(friend.met_date || '')
    setEditTier(friend.tier)
    setEditAvatarPreview(friend.avatar_url || null)
    setEditAvatarUrl(friend.avatar_url || null)
    setShowEditInfo(true)
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
      nickname: editNickname.trim() || null,
      initials: (editName.trim() || friend!.name).trim().split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0,2),
      location: editLocation || null,
      birthday: editBirthday || null,
      met_how: editMetHow || null,
      met_date: editMetDate || null,
      tier: editTier,
      avatar_url: editAvatarUrl,
    })
    setSavingInfo(false)
    setShowEditInfo(false)
  }

  // ── Fact modal state ──
  const [factCategory, setFactCategory] = useState('')
  const [factValue, setFactValue] = useState('')
  const [factCustomCat, setFactCustomCat] = useState('')
  const [savingFact, setSavingFact] = useState(false)
  const [deletingFactId, setDeletingFactId] = useState<string | null>(null)

  // ── Note modal state ──
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)

  // ── Impression modal state ──
  const [impTitle, setImpTitle] = useState('')
  const [impBody, setImpBody] = useState('')
  const [openImpressionId, setOpenImpressionId] = useState<string | null>(null)
  const [confirmDeleteImpId, setConfirmDeleteImpId] = useState<string | null>(null)
  const [savingImp, setSavingImp] = useState(false)

  // ── Contact modal state ──
  const contactRef = {
    phone: useRef<HTMLInputElement>(null),
    email: useRef<HTMLInputElement>(null),
    instagram: useRef<HTMLInputElement>(null),
    twitter: useRef<HTMLInputElement>(null),
    linkedin: useRef<HTMLInputElement>(null),
    snapchat: useRef<HTMLInputElement>(null),
  }
  const [savingContact, setSavingContact] = useState(false)

  // ── Day counter: days since met_date (friendship age) ──
  const computedDayCount = friend?.met_date
    ? Math.max(0, Math.floor((Date.now() - new Date(friend.met_date).getTime()) / 86400000))
    : (friend?.day_count ?? 0)

  useEffect(() => {
    if (!friend || !friend.met_date || computedDayCount === friend.day_count) return
    updateFriend({ day_count: computedDayCount })
  }, [id, computedDayCount]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Freshness ring: days since last hangout ──
  const friendHangouts = hangouts.filter(h => h.hangout_friends.some(hf => hf.friend_id === id))
  const lastHangoutDate = friendHangouts.length > 0
    ? [...friendHangouts].sort((a, b) => b.date.localeCompare(a.date))[0].date
    : null
  const daysSinceContact = lastHangoutDate
    ? Math.floor((Date.now() - new Date(lastHangoutDate).getTime()) / 86400000)
    : null

  if (loading) return <LoadingScreen />
  if (!friend) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Friend not found.</p></div>

  const tabs: Tab[] = ['overview', 'impressions', 'gallery', 'gifts', 'ai']

  const friendContext = friend ? buildFriendContext(friend, friendHangouts) : ''

  const handleChatSend = async () => {
    if (!chatInput.trim() || chatLoading) return
    const question = chatInput.trim()
    const history = chatMessages.map(m => `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`).join('\n')
    setChatMessages(prev => [...prev, { role: 'user', text: question }])
    setChatInput('')
    setChatLoading(true)
    try {
      const answer = await callAI(PROMPTS.friendQuery(friendContext, history, question))
      setChatMessages(prev => [...prev, { role: 'assistant', text: answer }])
    } catch (e: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: e.message === 'upgrade_required' ? '__upgrade__' : 'Something went wrong. Try again.' }])
    }
    setChatLoading(false)
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }
  const freshness = daysSinceContact != null
    ? Math.max(5, 100 - Math.floor(daysSinceContact / 4))
    : 50
  const bannerColor = themeColor || friend.avatar_color
  const fontFamily = profileFont === 'mono' ? "'SF Mono', 'Fira Code', monospace"
    : profileFont === 'sans' ? 'var(--font-sans)' : undefined

  const colorSwatches = [friend.avatar_color,'#e07a5f','#457b9d','#c9a96e','#7c6fbd','#4a7deb','#2d6a4f','#d4a373','#e76f51','#264653','#6d597a']

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
    setShowFactModal(false)
    setFactCategory(''); setFactValue(''); setFactCustomCat('')
  }

  const handleDeleteFact = async (factId: string) => {
    setDeletingFactId(factId)
    await deleteFact(factId)
    setDeletingFactId(null)
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

  const handleDeleteFriend = async () => {
    await deleteFriend(friend.id)
    navigate('/friends')
  }

  const contact: Partial<FriendContactRow> = friend.contact ?? {}

  const FACT_CATEGORIES = ['Fave food','Drink order','Dietary','Fave artist','Fave color','Fave movie','Fave book','Shirt size','Other']

  return (
    <div className="page-container" style={{ maxWidth: 1080, ...(fontFamily ? { fontFamily } : {}) }}>

      {/* Back link — outside the card */}
      <div className="animate-in" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to="/friends" className="back-link"><IconArrowLeft size={14} /> Friends</Link>
      </div>

      {/* ═══ UNIFIED PROFILE CARD ═══ */}
      <div className="animate-in animate-in-1" style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        overflow: 'hidden',
        boxShadow: effect === 'glow'
          ? `0 0 60px ${bannerColor}2e, 0 8px 32px rgba(0,0,0,0.10)`
          : '0 2px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.04)',
        marginBottom: 'var(--space-3xl)',
      }}>

        {/* ── Hero ── */}
        <div style={{
          background: bannerColor,
          padding: '44px 48px 40px',
          position: 'relative',
        }}>
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
            <button onClick={openEditInfo} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--radius-full)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' as any }} title="Edit info"><IconPencil size={15} /></button>
            <button onClick={() => setShowCustomize(true)} style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 'var(--radius-full)', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' as any }} title="Customize style"><IconPaintbrush size={16} /></button>
          </div>

          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Avatar + freshness ring */}
            <div style={{ position: 'relative', flexShrink: 0, width: 120, height: 120 }}>
              <FreshnessRing percentage={freshness} color="rgba(255,255,255,0.9)" size={120} trackColor="rgba(255,255,255,0.15)" />
              <div style={{ position: 'absolute', top: 10, left: 10, right: 10, bottom: 10, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontFamily: 'var(--font-serif)', fontSize: '2rem', fontWeight: 500, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' as any, overflow: 'hidden' }}>
                {friend.avatar_url ? <img src={friend.avatar_url} alt={friend.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : friend.initials}
              </div>
              <div style={{ position: 'absolute', bottom: -4, left: '50%', transform: 'translateX(-50%)', background: 'white', borderRadius: 'var(--radius-full)', padding: '2px 10px', fontSize: '0.62rem', fontFamily: 'var(--font-sans)', fontWeight: 600, color: bannerColor, whiteSpace: 'nowrap', boxShadow: 'var(--shadow-sm)' }}>{freshness}% fresh</div>
            </div>

            {/* Name + meta + badges */}
            <div style={{ flex: 1, minWidth: 160, color: 'white' }}>
              <h1 style={{ fontFamily: fontFamily || 'var(--font-serif)', fontSize: '2rem', fontWeight: 500, marginBottom: friend.nickname ? 2 : 4, lineHeight: 1.15, ...(effect === 'gradient' ? { background: 'linear-gradient(135deg, white 0%, rgba(255,255,255,0.6) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' } : { color: 'white' }) }}>{friend.name}</h1>
              {friend.nickname && <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.1rem', color: 'rgba(255,255,255,0.8)', fontStyle: 'italic', marginBottom: 10, letterSpacing: '0.01em' }}>"{friend.nickname}"</div>}
              <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'rgba(255,255,255,0.72)', marginBottom: 14, lineHeight: 1.5 }}>
                {[friend.location, friend.met_how, friend.met_date ? `since ${friend.met_date}` : null].filter(Boolean).join(' · ')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[
                  { label: tierLabel(friend.tier) },
                  { label: `day ${computedDayCount.toLocaleString()}`, serif: true },
                  friend.birthday ? { label: friend.birthday } : null,
                  friend.ai_label ? { label: friend.ai_label, bold: true } : null,
                ].filter(Boolean).map((badge, i) => (
                  <span key={i} style={{ padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(255,255,255,0.18)', border: '1px solid rgba(255,255,255,0.22)', fontSize: '0.7rem', fontFamily: badge!.serif ? 'var(--font-serif)' : 'var(--font-sans)', fontWeight: badge!.bold ? 600 : 500, fontStyle: badge!.serif ? 'italic' : 'normal', color: 'white' }}>{badge!.label}</span>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display: 'flex', gap: 28, flexShrink: 0 }}>
              {[
                { label: 'Hangouts', value: friend.hangout_count },
                { label: 'Notes', value: friend.notes.length },
                { label: 'Closeness', value: `${radarScores.closeness}%` },
              ].map(stat => (
                <div key={stat.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.7rem', fontWeight: 600, color: 'white', lineHeight: 1 }}>{stat.value}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.6rem', color: 'rgba(255,255,255,0.62)', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Tab bar (lives on the card) ── */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '0 48px', background: 'var(--bg-card)' }}>
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              padding: '13px 18px', border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: '0.82rem',
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? bannerColor : 'var(--text-muted)',
              borderBottom: activeTab === tab ? `2px solid ${bannerColor}` : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.15s',
            }}>{tab.charAt(0).toUpperCase() + tab.slice(1)}</button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div style={{ padding: '32px 48px 48px' }}>

          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="animate-in">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 'var(--space-xl)' }}>
                <Link to={`/ai/gifts/${friend.id}`} className="btn btn-ai btn-sm">Gift ideas</Link>
                <Link to={`/ai/catchup/${friend.id}`} className="btn btn-ai btn-sm">Catch-up brief</Link>
                <Link to={`/ai/hangout-ideas/${friend.id}`} className="btn btn-ai btn-sm">Hangout ideas</Link>
                <Link to={`/ai/story/${friend.id}`} className="btn btn-ai btn-sm">Friendship story</Link>
              </div>

              {/* ── Two-column info layout ── */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px', marginBottom: 'var(--space-xl)' }}>

                {/* Left col */}
                <div>
                  {/* Tags + Interests */}
                  <div style={{ marginBottom: 28 }}>
                    {friend.tags.length > 0 && (
                      <div style={{ marginBottom: 16 }}>
                        <InnerLabel accent={bannerColor}>Tags</InnerLabel>
                        <div className="pill-wrap" style={{ marginTop: 8 }}>{friend.tags.map(tag => <span key={tag} className="pill pill-default">{tag}</span>)}</div>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <InnerLabel accent={bannerColor}>Interests</InnerLabel>
                      <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 6px', fontSize: '0.68rem' }} onClick={() => setShowInterestInput(v => !v)}>+ add</button>
                    </div>
                    <div className="pill-wrap" style={{ marginTop: 8 }}>
                      {friend.interests.map(i => (
                        <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: `${bannerColor}18`, border: `1px solid ${bannerColor}40`, color: bannerColor, fontFamily: 'var(--font-sans)', fontSize: '0.75rem', fontWeight: 500 }}>
                          {i}
                          <button onClick={() => updateFriend({ interests: friend.interests.filter(x => x !== i) })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', opacity: 0.55, padding: 0, lineHeight: 1, fontSize: '0.9rem', display: 'flex', alignItems: 'center' }}>×</button>
                        </span>
                      ))}
                      {friend.interests.length === 0 && !showInterestInput && <span className="text-xs text-muted text-sans">None yet</span>}
                    </div>
                    {showInterestInput && (
                      <input
                        className="form-input"
                        style={{ marginTop: 8, fontSize: '0.82rem', padding: '6px 10px' }}
                        placeholder="Type and press Enter…"
                        value={interestInput}
                        autoFocus
                        onChange={e => setInterestInput(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault()
                            const val = interestInput.trim().replace(/,$/, '')
                            if (val && !friend.interests.includes(val)) updateFriend({ interests: [...friend.interests, val] })
                            setInterestInput('')
                            setShowInterestInput(false)
                          } else if (e.key === 'Escape') {
                            setInterestInput(''); setShowInterestInput(false)
                          }
                        }}
                        onBlur={() => { setInterestInput(''); setShowInterestInput(false) }}
                      />
                    )}
                  </div>

                  {/* Contact */}
                  <div style={{ marginBottom: 28, paddingTop: 20, borderTop: `1px solid ${bannerColor}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <InnerLabel accent={bannerColor}>Contact</InnerLabel>
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
                      <button className="btn btn-ghost btn-sm" onClick={() => setShowContactModal(true)} style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>+ Add contact info</button>
                    )}
                  </div>
                </div>

                {/* Right col */}
                <div>
                  {/* Radar */}
                  <div style={{ marginBottom: 28, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', marginBottom: 4 }}>
                      <InnerLabel accent={bannerColor}>Relationship radar</InnerLabel>
                    </div>
                    <RelationshipRadar scores={radarScores} color={bannerColor} size={200} />
                  </div>

                  {/* Facts */}
                  <div style={{ paddingTop: 20, borderTop: `1px solid ${bannerColor}22` }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                      <InnerLabel accent={bannerColor}>Facts</InnerLabel>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 6px', fontSize: '0.68rem' }} onClick={() => setShowFactModal(true)}>+ add</button>
                        <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 6px', fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: 3 }} onClick={() => setShowFactsPanel(true)}><IconExpand size={11} /> all</button>
                      </div>
                    </div>
                    {friend.facts.length === 0 ? (
                      <span className="text-xs text-muted text-sans">No facts yet</span>
                    ) : (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                        {friend.facts.slice(0, 4).map(fact => (
                          <FactItem key={fact.id} fact={fact} onDelete={handleDeleteFact} deletingId={deletingFactId} accentColor={bannerColor} />
                        ))}
                        {friend.facts.length > 4 && (
                          <button onClick={() => setShowFactsPanel(true)} style={{ padding: '10px 12px', background: 'none', borderRadius: 'var(--radius-sm)', border: '1px dashed var(--border)', cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem', textAlign: 'center' }}>+{friend.facts.length - 4} more</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div style={{ borderTop: `1px solid ${bannerColor}22`, paddingTop: 'var(--space-xl)', marginBottom: 'var(--space-xl)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-lg)' }}>
                  <InnerLabel accent={bannerColor}>Notes</InnerLabel>
                  <button className="btn btn-ghost btn-sm text-sans" style={{ padding: '2px 8px', fontSize: '0.72rem' }} onClick={() => setShowNoteModal(true)}>+ add</button>
                </div>
                {friend.notes.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {friend.notes.map((note, i) => (
                      <div key={note.id} style={{ display: 'flex', gap: 20, alignItems: 'baseline', padding: '10px 0', borderBottom: i < friend.notes.length - 1 ? `1px solid ${bannerColor}18` : 'none' }}>
                        <span style={{ width: 72, flexShrink: 0, fontSize: '0.7rem', fontFamily: 'var(--font-sans)', color: bannerColor, opacity: 0.55 }}>{note.date}</span>
                        <span style={{ fontFamily: 'var(--font-serif)', fontSize: '0.92rem', lineHeight: 1.6, color: 'var(--text-primary)' }}>{note.text}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted font-italic">No notes yet.</p>
                )}
              </div>

              {/* Hangouts */}
              {friendHangouts.length > 0 && (
                <div style={{ borderTop: `1px solid ${bannerColor}22`, paddingTop: 'var(--space-xl)' }}>
                  <InnerLabel accent={bannerColor} style={{ display: 'flex', marginBottom: 'var(--space-lg)' }}>Hangouts</InnerLabel>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {friendHangouts.map((h, i) => {
                      const hf = h.hangout_friends.find(f => f.friend_id === id)
                      return (
                        <Link key={h.id} to={`/hangouts/${h.id}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '10px 0', borderBottom: i < friendHangouts.length - 1 ? `1px solid ${bannerColor}18` : 'none', textDecoration: 'none', transition: 'opacity 0.15s' }}>
                          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: `${bannerColor}14`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem', fontFamily: 'var(--font-sans)', fontWeight: 700, color: bannerColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h.type.slice(0, 3)}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-primary)', fontFamily: 'var(--font-sans)' }}>{h.type}{h.location ? ` — ${h.location}` : ''}</div>
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

          {/* IMPRESSIONS */}
          {activeTab === 'impressions' && (
            <div className="animate-in">
              <button className="btn btn-default" onClick={() => setShowImpressionModal(true)} style={{ marginBottom: 'var(--space-lg)' }}>Write an impression</button>
              {impressions.length > 0 ? impressions.map(imp => (
                <div key={imp.id} className="impression" style={{ borderLeftColor: bannerColor, cursor: 'pointer' }} onClick={() => { setOpenImpressionId(imp.id); setConfirmDeleteImpId(null) }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                    <div className="impression-title">{imp.title}</div>
                    <div className="impression-date" style={{ flexShrink: 0 }}>{imp.date}</div>
                  </div>
                </div>
              )) : (
                <div className="empty-state"><p>No impressions yet. Write one — it's just for you.</p></div>
              )}
            </div>
          )}

          {/* GALLERY */}
          {activeTab === 'gallery' && (
            <div className="animate-in">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-lg)' }}>
                <InnerLabel accent={bannerColor}>Photos</InnerLabel>
                <button className="btn btn-default btn-sm" onClick={() => galleryInputRef.current?.click()} disabled={galleryUploading}>
                  {galleryUploading ? 'Uploading…' : '+ Add photos'}
                </button>
              </div>
              <input ref={galleryInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={async e => { const files = Array.from(e.target.files ?? []); for (const file of files) await uploadPhoto(file); e.target.value = '' }} />
              {galleryImages.length > 0 ? (
                <div className="gallery-grid">
                  {galleryImages.map((img, i) => (
                    <div key={img.id} className="gallery-item" style={{ cursor: 'pointer' }} onClick={() => setLightboxIdx(i)}>
                      <img src={img.url} alt={img.caption ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state"><p>No photos yet. Add some memories.</p></div>
              )}
              {lightboxIdx !== null && (
                <div className="lightbox-backdrop" onClick={() => setLightboxIdx(null)}>
                  {/* Close */}
                  <button className="lightbox-btn" style={{ position: 'absolute', top: 20, right: 20 }} onClick={() => setLightboxIdx(null)}>×</button>

                  {/* Image */}
                  <img
                    src={galleryImages[lightboxIdx].url}
                    alt=""
                    className="lightbox-img"
                    onClick={e => e.stopPropagation()}
                  />

                  {/* Prev */}
                  {lightboxIdx > 0 && (
                    <button className="lightbox-btn lightbox-nav lightbox-prev" onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! - 1) }}>‹</button>
                  )}
                  {/* Next */}
                  {lightboxIdx < galleryImages.length - 1 && (
                    <button className="lightbox-btn lightbox-nav lightbox-next" onClick={e => { e.stopPropagation(); setLightboxIdx(i => i! + 1) }}>›</button>
                  )}

                  {/* Footer: counter + delete */}
                  <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>{lightboxIdx + 1} / {galleryImages.length}</span>
                    <button className="lightbox-btn" style={{ fontSize: '0.72rem', padding: '5px 12px', borderRadius: 'var(--radius-full)', height: 'auto', width: 'auto', color: 'rgba(255,255,255,0.6)' }}
                      onClick={async e => { e.stopPropagation(); await deleteImage(galleryImages[lightboxIdx!].id); setLightboxIdx(null) }}>
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* GIFTS */}
          {activeTab === 'gifts' && (
            <div className="animate-in">
              <Link to={`/ai/gifts/${friend.id}`} className="btn btn-ai" style={{ marginBottom: 'var(--space-xl)' }}>AI gift suggestions</Link>
              <div style={{ borderTop: `1px solid ${bannerColor}22`, paddingTop: 'var(--space-xl)' }}>
                <InnerLabel accent={bannerColor} style={{ display: 'flex', marginBottom: 'var(--space-lg)' }}>Gift history</InnerLabel>
                <div className="empty-state"><p>No gifts logged yet.</p></div>
              </div>
            </div>
          )}

          {/* AI CHAT */}
          {activeTab === 'ai' && (
            <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', height: 480 }}>
              {subStatus !== 'active' ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '40px 24px' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 16, opacity: 0.3 }}>✦</div>
                  <h3 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 500, marginBottom: 8 }}>Pro only</h3>
                  <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 24, maxWidth: 280 }}>
                    Ask anything about {friend.name} — their interests, when you last hung out, what to talk about.
                  </p>
                  <Link to="/upgrade" className="btn btn-primary" style={{ padding: '10px 22px' }}>Upgrade to Pro</Link>
                </div>
              ) : (
                <>
                  {/* Messages */}
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {chatMessages.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: '0.9rem' }}>
                        Ask anything about {friend.name}…
                      </div>
                    )}
                    {chatMessages.map((msg, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                        {msg.text === '__upgrade__' ? (
                          <div style={{ maxWidth: '80%', padding: '10px 14px', borderRadius: 'var(--radius-lg)', background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                            <Link to="/upgrade" style={{ color: bannerColor, fontWeight: 600 }}>Upgrade to Pro</Link> to use AI features.
                          </div>
                        ) : (
                          <div style={{
                            maxWidth: '80%', padding: '10px 14px',
                            borderRadius: 'var(--radius-lg)',
                            background: msg.role === 'user' ? bannerColor : 'var(--bg)',
                            border: msg.role === 'user' ? 'none' : '1px solid var(--border)',
                            color: msg.role === 'user' ? 'white' : 'var(--text)',
                            fontFamily: 'var(--font-serif)', fontSize: '0.9rem', lineHeight: 1.7,
                          }}>
                            {msg.text}
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                        <div style={{ padding: '10px 16px', borderRadius: 'var(--radius-lg)', background: 'var(--bg)', border: '1px solid var(--border)', fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          thinking…
                        </div>
                      </div>
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Input */}
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 8 }}>
                    <input
                      className="form-input"
                      placeholder={`Ask about ${friend.name}…`}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleChatSend()}
                      style={{ flex: 1, fontSize: '0.88rem' }}
                      disabled={chatLoading}
                    />
                    <button
                      onClick={handleChatSend}
                      disabled={!chatInput.trim() || chatLoading}
                      style={{ padding: '8px 16px', borderRadius: 'var(--radius-md)', border: 'none', background: bannerColor, color: 'white', fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', opacity: (!chatInput.trim() || chatLoading) ? 0.5 : 1, flexShrink: 0 }}
                    >
                      Send
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>{/* end tab content */}
      </div>{/* end unified card */}

      {/* ═══ MODALS ═══ */}

      {/* Add Fact */}
      <Modal open={showFactModal} onClose={() => setShowFactModal(false)} title="Add a fact">
        <div className="form-group">
          <label className="form-label">Category</label>
          <div className="pill-wrap">
            {FACT_CATEGORIES.map(cat => (
              <button key={cat} className="pill pill-default" style={{ cursor: 'pointer', opacity: factCategory === cat ? 1 : 0.5 }} onClick={() => setFactCategory(cat)}>{cat}</button>
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

      {/* Facts Full Panel */}
      {showFactsPanel && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'var(--bg-modal-backdrop)', display: 'flex', alignItems: 'flex-end',
          justifyContent: 'center',
        }} onMouseDown={(e) => { factsPanelMousedown.current = e.target === e.currentTarget }} onClick={(e) => { if (e.target === e.currentTarget && factsPanelMousedown.current) setShowFactsPanel(false) }}>
          <div style={{
            width: '100%', maxWidth: 640, background: 'var(--bg-card)',
            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
            padding: 'var(--space-xl)', maxHeight: '80vh', overflowY: 'auto',
            boxShadow: 'var(--shadow-lg)',
          }} onClick={e => e.stopPropagation()}>
            {/* Handle */}
            <div style={{ width: 40, height: 4, background: 'var(--border)', borderRadius: 2, margin: '0 auto var(--space-lg)' }} />

            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-lg)' }}>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.2rem', fontWeight: 500 }}>{friend.name}'s facts</h2>
                <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 2 }}>{friend.facts.length} {friend.facts.length === 1 ? 'fact' : 'facts'} recorded</p>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => { setShowFactsPanel(false); setShowFactModal(true) }}>+ Add fact</button>
            </div>

            {friend.facts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-2xl)', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)', fontSize: '0.88rem' }}>
                No facts yet. Add some things you know about {friend.name}.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {friend.facts.map(fact => (
                  <FactItem key={fact.id} fact={fact} onDelete={handleDeleteFact} deletingId={deletingFactId} accentColor={bannerColor} large />
                ))}
              </div>
            )}

            <div style={{ marginTop: 'var(--space-lg)', paddingTop: 'var(--space-lg)', borderTop: '1px solid var(--border)', textAlign: 'center' }}>
              <button className="btn btn-ghost" onClick={() => setShowFactsPanel(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Note */}
      <Modal open={showNoteModal} onClose={() => setShowNoteModal(false)} title="Add a note">
        <div className="form-group">
          <textarea className="form-textarea form-textarea-serif" placeholder="What's on your mind about this person?" value={noteText} onChange={e => setNoteText(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowNoteModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveNote} disabled={savingNote || !noteText.trim()}>{savingNote ? 'Saving…' : 'Save'}</button>
        </div>
      </Modal>

      {/* Write Impression */}
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

      {/* ── View Impression Modal ── */}
      {(() => {
        const imp = impressions.find(i => i.id === openImpressionId)
        if (!imp) return null
        const isConfirming = confirmDeleteImpId === imp.id
        return (
          <Modal open={true} onClose={() => { setOpenImpressionId(null); setConfirmDeleteImpId(null) }} title={imp.title}>
            <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>{imp.date}</p>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.97rem', lineHeight: 1.9, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 'var(--space-xl)' }}>{imp.body}</div>
            <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
              {isConfirming ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>Delete this impression?</span>
                  <button className="btn btn-ghost" style={{ color: '#dc2626', fontWeight: 600 }} onClick={() => { deleteImpression(imp.id); setOpenImpressionId(null); setConfirmDeleteImpId(null) }}>Yes, delete</button>
                  <button className="btn btn-ghost" onClick={() => setConfirmDeleteImpId(null)}>Cancel</button>
                </div>
              ) : (
                <button className="btn btn-ghost" style={{ color: 'var(--text-muted)' }} onClick={() => setConfirmDeleteImpId(imp.id)}>Delete</button>
              )}
              <button className="btn btn-ghost" onClick={() => { setOpenImpressionId(null); setConfirmDeleteImpId(null) }}>Close</button>
            </div>
          </Modal>
        )
      })()}

      {/* ── Edit Info Modal ── */}
      <Modal open={showEditInfo} onClose={() => setShowEditInfo(false)} title="Edit profile info">
        {/* Avatar */}
        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', background: bannerColor,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            overflow: 'hidden', flexShrink: 0, cursor: 'pointer', position: 'relative',
          }} onClick={() => editPhotoRef.current?.click()}>
            {editAvatarPreview
              ? <img src={editAvatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ color: 'white', fontFamily: 'var(--font-serif)', fontSize: '1.6rem' }}>{friend.initials}</span>}
            <div style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0,
              transition: 'opacity 0.15s',
            }} className="avatar-overlay">
              <span style={{ color: 'white', fontSize: '0.7rem', fontFamily: 'var(--font-sans)' }}>Change</span>
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>Profile photo</div>
            <button className="btn btn-default btn-sm" onClick={() => editPhotoRef.current?.click()} disabled={uploadingAvatar}>
              {uploadingAvatar ? 'Uploading…' : 'Change photo'}
            </button>
          </div>
          <input ref={editPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && handleEditPhoto(e.target.files[0])} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input className="form-input" value={editName} onChange={e => setEditName(e.target.value)} placeholder="Full name" />
          </div>
          <div className="form-group">
            <label className="form-label">Nickname</label>
            <input className="form-input" value={editNickname} onChange={e => setEditNickname(e.target.value)} placeholder="e.g. Bubs, J, etc." />
          </div>
          <div className="form-group">
            <label className="form-label">Location</label>
            <input className="form-input" value={editLocation} onChange={e => setEditLocation(e.target.value)} placeholder="City, Country" />
          </div>
          <div className="form-group">
            <label className="form-label">Birthday</label>
            <input className="form-input" type="date" value={editBirthday} onChange={e => setEditBirthday(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Met date</label>
            <input className="form-input" type="date" value={editMetDate} onChange={e => setEditMetDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">How you met</label>
            <select className="form-input" value={editMetHow} onChange={e => setEditMetHow(e.target.value)} style={{ cursor: 'pointer' }}>
              <option value="">Select…</option>
              {MET_HOW_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Tier</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {([
              { key: 'inner-circle' as const, symbol: '✦', desc: 'Your closest people. The ones you call first.' },
              { key: 'close-friend' as const, symbol: '◆', desc: 'Real friends. You check in, they check in.' },
              { key: 'casual' as const, symbol: '◇', desc: 'People you enjoy. Seeing them is always a good vibe.' },
            ]).map(t => (
              <button key={t.key} onClick={() => setEditTier(t.key)} style={{
                padding: '10px 14px', borderRadius: 'var(--radius-md)', cursor: 'pointer',
                border: `2px solid ${editTier === t.key ? tierColor(t.key) : 'var(--border)'}`,
                background: editTier === t.key ? `${tierColor(t.key)}10` : 'var(--bg)',
                textAlign: 'left', transition: 'all 0.18s', display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <span style={{ fontSize: '1.1rem', color: tierColor(t.key), flexShrink: 0, width: 22, textAlign: 'center' }}>{t.symbol}</span>
                <div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.82rem', color: editTier === t.key ? tierColor(t.key) : 'var(--text)', marginBottom: 1 }}>{tierLabel(t.key)}</div>
                  <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowEditInfo(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSaveInfo} disabled={savingInfo}>{savingInfo ? 'Saving…' : 'Save changes'}</button>
        </div>

        {/* Danger zone — tucked at the bottom */}
        <div style={{ marginTop: 'var(--space-md)', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border)' }}>
          <button
            onClick={() => { setShowEditInfo(false); setShowDeleteConfirm(true) }}
            style={{
              width: '100%', padding: '8px', borderRadius: 'var(--radius-md)',
              border: '1px solid var(--negative)', background: 'transparent',
              color: 'var(--negative)', fontFamily: 'var(--font-sans)', fontSize: '0.75rem',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { const b = e.currentTarget; b.style.borderColor = 'var(--negative)'; b.style.color = 'var(--negative)'; b.style.background = 'var(--negative-bg)' }}
            onMouseLeave={e => { const b = e.currentTarget; b.style.borderColor = 'var(--border)'; b.style.color = 'var(--text-muted)'; b.style.background = 'transparent' }}
          >
            <IconTrash size={13} /> Remove {friend.name} from your graph
          </button>
        </div>

        <style>{`.avatar-overlay { opacity: 0 !important; } div:hover > .avatar-overlay { opacity: 1 !important; }`}</style>
      </Modal>

      {/* ── Customize Style Modal ── */}
      <Modal open={showCustomize} onClose={() => setShowCustomize(false)} title="Customize style">
        <div style={{
          padding: '12px 16px', borderRadius: 'var(--radius-md)',
          background: bannerColor, marginBottom: 'var(--space-lg)',
          ...(effect === 'glow' ? { boxShadow: `0 0 30px ${bannerColor}44` } : {}),
        }}>
          <span style={{ fontFamily: fontFamily || 'var(--font-serif)', fontSize: '1.1rem', fontWeight: 500, ...(effect === 'gradient' ? { background: 'linear-gradient(135deg,white,rgba(255,255,255,0.6))', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' } : { color: 'white' }) }}>{friend.name}</span>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>Preview</p>
        </div>

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
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => setShowCustomize(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={async () => {
            if (user && id) {
              await supabase.from('profile_customizations').upsert(
                { user_id: user.id, friend_id: id, theme_color: themeColor, font: profileFont, effect },
                { onConflict: 'user_id,friend_id' }
              )
            }
            setShowCustomize(false)
          }}>Apply</button>
        </div>
      </Modal>

      {/* Edit Contact */}
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

      {/* Delete Confirm — requires typing friend's name */}
      <Modal open={showDeleteConfirm} onClose={() => { setShowDeleteConfirm(false); setDeleteNameInput('') }} title="Remove friend?">
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 'var(--space-md)' }}>
          This will permanently delete <strong>{friend.name}</strong> and all their associated data. This cannot be undone.
        </p>
        <div className="form-group">
          <label className="form-label" style={{ color: 'var(--negative)' }}>Type <strong>{friend.name}</strong> to confirm</label>
          <input
            className="form-input"
            placeholder={friend.name}
            value={deleteNameInput}
            onChange={e => setDeleteNameInput(e.target.value)}
            style={{ borderColor: deleteNameInput === friend.name ? 'var(--negative)' : undefined }}
            autoFocus
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={() => { setShowDeleteConfirm(false); setDeleteNameInput('') }}>Cancel</button>
          <button
            className="btn btn-primary"
            style={{ background: 'var(--negative)', borderColor: 'var(--negative)', opacity: deleteNameInput === friend.name ? 1 : 0.4, cursor: deleteNameInput === friend.name ? 'pointer' : 'not-allowed' }}
            disabled={deleteNameInput !== friend.name}
            onClick={handleDeleteFriend}
          >Delete forever</button>
        </div>
      </Modal>
    </div>
  )
}

function FactItem({ fact, onDelete, deletingId, accentColor, large }: {
  fact: { id: string; category: string; value: string };
  onDelete: (id: string) => void;
  deletingId: string | null;
  accentColor: string;
  large?: boolean;
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: large ? '12px 14px' : '10px 12px',
        background: 'var(--bg)', borderRadius: 'var(--radius-sm)',
        position: 'relative', transition: 'background 0.15s',
        border: hovered ? `1px solid ${accentColor}30` : '1px solid transparent',
      }}
    >
      <div className="text-xs text-muted text-sans" style={{ marginBottom: 3 }}>{fact.category}</div>
      <div style={{ fontSize: large ? '0.9rem' : '0.85rem', fontWeight: 500 }}>{fact.value}</div>
      {hovered && (
        <button
          onClick={() => onDelete(fact.id)}
          disabled={deletingId === fact.id}
          style={{
            position: 'absolute', top: 6, right: 6,
            width: 20, height: 20, borderRadius: '50%',
            background: 'var(--negative-bg)', border: 'none',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--negative)', padding: 0,
          }}
          title="Delete fact"
        >
          {deletingId === fact.id ? '…' : '×'}
        </button>
      )}
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
