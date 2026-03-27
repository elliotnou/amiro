import { useState, useMemo, useEffect, useRef } from 'react'
import Modal from './Modal'
import type { PathStep, PathEdge } from '../lib/connectionPath'
import type { FriendRow } from '../lib/hooks/useFriends'

interface Props {
  open: boolean
  onClose: () => void
  path: PathStep[]
  friends: FriendRow[]
}

const STEP_DELAY = 300

export default function ConnectionPathModal({ open, onClose, path, friends }: Props) {
  const [revealCount, setRevealCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  const friendMap = useMemo(() => {
    const m = new Map<string, FriendRow>()
    for (const f of friends) m.set(f.id, f)
    return m
  }, [friends])

  useEffect(() => {
    timerRef.current.forEach(clearTimeout)
    timerRef.current = []
    if (!open || path.length === 0) { setRevealCount(0); return }
    setRevealCount(0)
    for (let i = 0; i < path.length; i++) {
      const t = setTimeout(() => setRevealCount(i + 1), STEP_DELAY * (i + 1))
      timerRef.current.push(t)
    }
    return () => timerRef.current.forEach(clearTimeout)
  }, [open, path])

  const allRevealed = revealCount >= path.length

  return (
    <Modal open={open} onClose={onClose} title="" style={{ maxWidth: 440 }}>
      <div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', padding: 'var(--space-xs) var(--space-sm)' }}>
          {path.map((step, i) => {
            const f = friendMap.get(step.friendId)
            const isVisible = i < revealCount
            const isEndpoint = i === 0 || i === path.length - 1

            return (
              <div key={step.friendId}>
                {step.edge && (
                  <EdgeRow edge={step.edge} visible={isVisible} />
                )}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateX(0)' : 'translateX(-8px)',
                  transition: 'opacity 250ms ease, transform 300ms cubic-bezier(0.34, 1.4, 0.64, 1)',
                }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <AvatarBubble friend={f} size={isEndpoint ? 36 : 30} ring={isEndpoint} ringColor={f?.avatar_color} />
                  </div>
                  <span style={{
                    fontFamily: 'var(--font-serif)',
                    fontSize: isEndpoint ? '0.88rem' : '0.8rem',
                    fontWeight: isEndpoint ? 600 : 400,
                    color: 'var(--text)',
                  }}>
                    {f?.name ?? 'Unknown'}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginTop: 'var(--space-md)', paddingTop: 'var(--space-sm)',
          opacity: allRevealed ? 1 : 0,
          transition: 'opacity 300ms ease 200ms',
        }}>
          <span style={{
            padding: '4px 12px', borderRadius: 'var(--radius-full)',
            background: 'var(--bg-hover)', border: '1px solid var(--border)',
            fontFamily: 'var(--font-sans)', fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)',
          }}>
            {path.length - 1} degree{path.length - 1 !== 1 ? 's' : ''}
          </span>
          <button className="btn btn-primary" onClick={onClose} style={{ fontSize: '0.78rem', padding: '6px 12px' }}>Done</button>
        </div>
      </div>
    </Modal>
  )
}

function AvatarBubble({ friend, size = 36, ring, ringColor }: {
  friend: FriendRow | undefined | null; size?: number; ring?: boolean; ringColor?: string | null
}) {
  if (!friend) return null
  const color = friend.avatar_color || 'var(--accent)'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontSize: size * 0.28, fontWeight: 600, fontFamily: 'var(--font-serif)',
      flexShrink: 0, overflow: 'hidden',
      boxShadow: ring ? `0 0 0 2px var(--bg-card), 0 0 0 3.5px ${ringColor || color}` : `0 1px 4px ${color}33`,
    }}>
      {friend.avatar_url
        ? <img src={friend.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : friend.initials}
    </div>
  )
}

function EdgeRow({ edge, visible }: { edge: PathEdge; visible: boolean }) {
  const edgeColor = edge.color || 'var(--text-muted)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 0 4px 16px',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(-4px)',
      transition: 'opacity 200ms ease, transform 200ms ease',
    }}>
      <div style={{
        width: 2, height: 16, borderRadius: 1, flexShrink: 0,
        background: visible ? edgeColor : 'var(--border)',
        transition: 'background 200ms ease',
      }} />
      <span style={{
        fontFamily: 'var(--font-sans)', fontSize: '0.7rem', fontWeight: 500,
        color: edgeColor, fontStyle: 'italic',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        {edge.label}
      </span>
    </div>
  )
}
