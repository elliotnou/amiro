import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useFriend } from '../lib/hooks/useFriend'
import { useHangouts } from '../lib/hooks/useHangouts'
import { callAI, buildFriendContext, PROMPTS } from '../lib/ai'
import { IconArrowLeft, IconSparkle } from '../components/Icons'

// ── Shared streaming hook ──────────────────────────────────────────
function useAIStream(prompt: string | null) {
  const [text, setText] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)
  const cancelRef = useRef<(() => void) | null>(null)

  const run = useCallback(async (p: string) => {
    // Cancel any in-flight request before starting a new one
    cancelRef.current?.()

    const controller = new AbortController()
    let cancelled = false
    cancelRef.current = () => { cancelled = true; controller.abort() }

    setText('')
    setStatus('loading')
    setError(null)
    try {
      const result = await callAI(p, undefined, controller.signal)
      if (!cancelled) { setText(result); setStatus('done') }
    } catch (e: any) {
      if (cancelled || e.name === 'AbortError') return
      setError(e.message); setStatus('error')
    }
  }, [])

  useEffect(() => {
    if (!prompt) return
    run(prompt)
    return () => { cancelRef.current?.() }
  }, [prompt, run])

  return { text, status, error, regenerate: () => prompt && run(prompt) }
}

// ── Markdown renderer ─────────────────────────────────────────────
function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g).map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**'))
      return <strong key={i} style={{ fontWeight: 600 }}>{part.slice(2, -2)}</strong>
    if (part.startsWith('*') && part.endsWith('*'))
      return <em key={i}>{part.slice(1, -1)}</em>
    return part
  })
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  return (
    <div style={{ fontFamily: 'var(--font-serif)', fontSize: '0.97rem', lineHeight: 1.9, color: 'var(--text-primary)' }}>
      {lines.map((line, i) => {
        const numbered = line.match(/^(\d+)\.\s+(.*)/)
        const bullet = line.match(/^[-•]\s+(.*)/)

        if (numbered) return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <span style={{ flexShrink: 0, fontFamily: 'var(--font-sans)', fontSize: '0.82rem', color: 'var(--ai)', fontWeight: 600, minWidth: 18, paddingTop: 2 }}>{numbered[1]}.</span>
            <span>{renderInline(numbered[2])}</span>
          </div>
        )

        if (bullet) return (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 6 }}>
            <span style={{ flexShrink: 0, color: 'var(--ai)', paddingTop: 2 }}>·</span>
            <span>{renderInline(bullet[1])}</span>
          </div>
        )

        if (!line.trim()) return <div key={i} style={{ height: 10 }} />

        return <p key={i} style={{ margin: '0 0 6px' }}>{renderInline(line)}</p>
      })}
    </div>
  )
}

// ── Streaming response display ─────────────────────────────────────
function AIResponse({ text, status, error, regenerate }: {
  text: string; status: string; error: string | null; regenerate: () => void
}) {
  if (status === 'error' && error === 'upgrade_required') {
    return (
      <div style={{ padding: 'var(--space-xl)', background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 'var(--radius-lg)', textAlign: 'center' }}>
        <div style={{ color: 'var(--ai)', marginBottom: 8 }}><IconSparkle size={22} /></div>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1rem', fontWeight: 500, marginBottom: 6 }}>amily Pro required</div>
        <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)', lineHeight: 1.5 }}>
          AI features are part of amily Pro.
        </p>
        <Link to="/upgrade" className="btn btn-ai" style={{ display: 'inline-flex' }}>See plans →</Link>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ padding: 'var(--space-xl)', background: 'var(--negative-bg)', border: '1px solid rgba(196,92,92,0.2)', borderRadius: 'var(--radius-lg)', fontFamily: 'var(--font-sans)', fontSize: '0.85rem', color: 'var(--negative)' }}>
        {error}
      </div>
    )
  }

  return (
    <div style={{ minHeight: 80 }}>
      {status === 'loading' && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', background: 'var(--bg)', borderRadius: 'var(--radius-xl)' }}>
          <img
            src="/loading.gif"
            alt="Generating…"
            style={{ width: 160, height: 160, objectFit: 'contain', mixBlendMode: 'multiply', filter: 'brightness(1.08)' }}
          />
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontFamily: 'var(--font-serif)', fontSize: '1rem', letterSpacing: '0.06em', marginTop: 4 }}>Generating…</span>
        </div>
      )}
      {status !== 'loading' && text && <MarkdownText text={text} />}
      {status === 'done' && (
        <button
          onClick={regenerate}
          style={{ marginTop: 'var(--space-lg)', fontFamily: 'var(--font-sans)', fontSize: '0.72rem', color: 'var(--ai)', background: 'var(--ai-bg)', border: '1px solid var(--ai-border)', borderRadius: 'var(--radius-full)', padding: '5px 14px', cursor: 'pointer' }}
        >
          ↻ Regenerate
        </button>
      )}
    </div>
  )
}

// ── Per-friend AI page shell ───────────────────────────────────────
function FriendAIPage({ title, buildPrompt, friendId }: {
  title: (name: string) => string
  buildPrompt: (ctx: string) => string
  friendId: string | undefined
}) {
  const { friend } = useFriend(friendId)
  const { hangouts } = useHangouts()
  const friendHangouts = hangouts.filter(h => h.hangout_friends.some((hf: any) => hf.friend_id === friendId))
  const prompt = friend ? buildPrompt(buildFriendContext(friend, friendHangouts)) : null
  const { text, status, error, regenerate } = useAIStream(prompt)

  if (!friend) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p></div>

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <div className="animate-in" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to={`/friends/${friend.id}`} className="back-link"><IconArrowLeft size={14} /> {friend.name}</Link>
      </div>

      <div className="animate-in animate-in-1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-2xl)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ai)', flexShrink: 0 }}>
          <IconSparkle size={18} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 500 }}>{title(friend.name.split(' ')[0])}</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Based on {friend.facts.length} facts · {friend.notes.length} notes · {friendHangouts.length} hangouts
          </p>
        </div>
      </div>

      <div className="animate-in animate-in-2" style={{
        background: status === 'loading' ? 'transparent' : 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        padding: status === 'loading' ? '0' : 'var(--space-xl)',
        border: status === 'loading' ? 'none' : '1px solid var(--ai-border)',
        boxShadow: status === 'loading' ? 'none' : '0 2px 16px rgba(124,111,189,0.06)',
        transition: 'background 0.2s, border-color 0.2s',
      }}>
        <AIResponse text={text} status={status} error={error} regenerate={regenerate} />
      </div>
    </div>
  )
}

// ── Per-friend feature pages ───────────────────────────────────────
export function AIGiftIdeas() {
  const { friendId } = useParams()
  return <FriendAIPage friendId={friendId} title={n => `Gift ideas for ${n}`} buildPrompt={PROMPTS.giftIdeas} />
}

export function AIHangoutIdeas() {
  const { friendId } = useParams()
  return <FriendAIPage friendId={friendId} title={n => `Hangout ideas with ${n}`} buildPrompt={PROMPTS.hangoutIdeas} />
}

const STORY_VIBES = ['Wholesome', 'Funny', 'Reflective', 'Epic', 'Raw'] as const

export function AIFriendshipStory() {
  const { friendId } = useParams()
  const { friend } = useFriend(friendId)
  const { hangouts } = useHangouts()
  const friendHangouts = hangouts.filter(h => h.hangout_friends.some((hf: any) => hf.friend_id === friendId))
  const [selectedVibe, setSelectedVibe] = useState<string>('Wholesome')
  const [activePrompt, setActivePrompt] = useState<string | null>(null)
  const { text, status, error, regenerate } = useAIStream(activePrompt)

  const generate = () => {
    if (!friend) return
    const ctx = buildFriendContext(friend, friendHangouts)
    setActivePrompt(PROMPTS.friendshipStory(ctx, selectedVibe))
  }

  if (!friend) return <div className="page-container"><p style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>Loading…</p></div>

  return (
    <div className="page-container" style={{ maxWidth: 680 }}>
      <div className="animate-in" style={{ marginBottom: 'var(--space-md)' }}>
        <Link to={`/friends/${friend.id}`} className="back-link"><IconArrowLeft size={14} /> {friend.name}</Link>
      </div>

      <div className="animate-in animate-in-1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-2xl)' }}>
        <div style={{ width: 40, height: 40, borderRadius: 'var(--radius-md)', background: 'var(--ai-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ai)', flexShrink: 0 }}>
          <IconSparkle size={18} />
        </div>
        <div>
          <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.5rem', fontWeight: 500 }}>Your story with {friend.name.split(' ')[0]}</h1>
          <p style={{ fontFamily: 'var(--font-sans)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
            Based on {friend.facts.length} facts · {friend.notes.length} notes · {friendHangouts.length} hangouts
          </p>
        </div>
      </div>

      <div className="animate-in animate-in-2" style={{
        background: 'var(--bg-card)',
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--space-xl)',
        border: '1px solid var(--ai-border)',
        boxShadow: '0 2px 16px rgba(124,111,189,0.06)',
      }}>
        {/* Vibe selector */}
        <div style={{ marginBottom: 'var(--space-lg)' }}>
          <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 'var(--space-md)' }}>Vibe</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {STORY_VIBES.map(vibe => (
              <button
                key={vibe}
                onClick={() => setSelectedVibe(vibe)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 'var(--radius-full)',
                  border: selectedVibe === vibe ? '1px solid var(--ai-border)' : '1px solid var(--border)',
                  background: selectedVibe === vibe ? 'var(--ai-bg)' : 'transparent',
                  color: selectedVibe === vibe ? 'var(--ai)' : 'var(--text-muted)',
                  fontFamily: 'var(--font-sans)', fontSize: '0.78rem', fontWeight: 500,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >{vibe}</button>
            ))}
          </div>
        </div>

        {/* Generate button */}
        <div style={{ marginBottom: activePrompt ? 'var(--space-xl)' : 0 }}>
          <button
            onClick={generate}
            disabled={status === 'loading'}
            className="btn btn-ai"
          >
            <IconSparkle size={14} /> Generate story
          </button>
        </div>

        {/* Response */}
        {activePrompt && status !== 'loading' && (
          <div style={{ marginTop: 'var(--space-xl)', borderTop: '1px solid var(--ai-border)', paddingTop: 'var(--space-xl)' }}>
            <AIResponse text={text} status={status} error={error} regenerate={regenerate} />
          </div>
        )}
      </div>

      {/* Loading state outside the card */}
      {activePrompt && status === 'loading' && (
        <div style={{ marginTop: 'var(--space-xl)' }}>
          <AIResponse text={text} status={status} error={error} regenerate={regenerate} />
        </div>
      )}
    </div>
  )
}

