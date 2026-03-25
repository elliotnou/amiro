import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface GF {
  id: string
  name: string
  initials: string
  avatar_color: string
  avatar_url: string | null
  tier: string | null
  hangout_count: number
  starred: boolean
}

interface GroupInfo {
  id: string
  name: string
  color: string
  memberIds: string[]
}

interface SimNode {
  id: string
  x: number
  y: number
  vx: number
  vy: number
  r: number
}

interface GroupEdge {
  source: string
  target: string
  color: string
  groupName: string
}

const TIER_COLOR: Record<string, string> = {
  'inner-circle': '#e07a5f',
  'close-friend': '#457b9d',
  'casual': '#c9a96e',
}

const W = 900
const H = 560

export default function FriendsGraph({
  friends,
  groups = [],
}: {
  friends: GF[]
  groups?: GroupInfo[]
}) {
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const nodesRef = useRef<SimNode[]>([])
  const animRef = useRef<number>(0)
  const dragRef = useRef<string | null>(null)
  const didDragRef = useRef(false)
  const highlightRef = useRef<string | null>(null)
  const [settled, setSettled] = useState(false)
  const nodeEls = useRef<Record<string, SVGGElement | null>>({})
  const groupLineEls = useRef<Record<string, SVGLineElement | null>>({})
  const groupLabelEls = useRef<Record<string, SVGTextElement | null>>({})
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const friendMap = useMemo(() => {
    const m: Record<string, GF> = {}
    for (const f of friends) m[f.id] = f
    return m
  }, [friends])

  // Build group edges: all pairs of members in the same group
  const groupEdges = useMemo<GroupEdge[]>(() => {
    const seen = new Set<string>()
    const result: GroupEdge[] = []
    for (const g of groups) {
      const members = g.memberIds.filter(id => friendMap[id])
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = [members[i], members[j]].sort().join('|')
          if (seen.has(key)) continue
          seen.add(key)
          result.push({ source: members[i], target: members[j], color: g.color, groupName: g.name })
        }
      }
    }
    return result
  }, [groups, friendMap])

  // For each friend, which friend IDs they're connected to
  const connectionMap = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    for (const e of groupEdges) {
      if (!m[e.source]) m[e.source] = new Set()
      if (!m[e.target]) m[e.target] = new Set()
      m[e.source].add(e.target)
      m[e.target].add(e.source)
    }
    return m
  }, [groupEdges])

  // Highlight connected nodes/edges on hover, dim the rest — all via DOM
  const applyHighlight = useCallback((id: string | null) => {
    highlightRef.current = id
    const connected = id ? connectionMap[id] ?? new Set() : new Set<string>()
    const isHighlighting = id !== null

    // Nodes
    for (const fId of Object.keys(nodeEls.current)) {
      const el = nodeEls.current[fId]
      if (!el) continue
      if (!isHighlighting) {
        el.style.opacity = '1'
        el.style.transition = 'opacity 200ms ease'
      } else if (fId === id || connected.has(fId)) {
        el.style.opacity = '1'
        el.style.transition = 'opacity 200ms ease'
      } else {
        el.style.opacity = '0.65'
        el.style.transition = 'opacity 250ms ease'
      }
    }

    // Group edges + labels
    for (const e of groupEdges) {
      const key = `g:${[e.source, e.target].sort().join('|')}:${e.color}`
      const lineEl = groupLineEls.current[key]
      const labelEl = groupLabelEls.current[key]
      if (!lineEl) continue

      const isConnected = id !== null && (e.source === id || e.target === id)

      if (!isHighlighting) {
        lineEl.setAttribute('opacity', '0.55')
        lineEl.setAttribute('stroke-width', '2')
        lineEl.style.transition = 'opacity 200ms ease'
        if (labelEl) labelEl.setAttribute('opacity', '0')
      } else if (isConnected) {
        lineEl.setAttribute('opacity', '0.85')
        lineEl.setAttribute('stroke-width', '3')
        lineEl.style.transition = 'opacity 200ms ease'
        if (labelEl) labelEl.setAttribute('opacity', '1')
      } else {
        lineEl.setAttribute('opacity', '0.35')
        lineEl.setAttribute('stroke-width', '2')
        lineEl.style.transition = 'opacity 250ms ease'
        if (labelEl) labelEl.setAttribute('opacity', '0')
      }
    }
  }, [groupEdges, connectionMap])

  // Stable key — only restart simulation when friend IDs or group edges actually change
  const friendKey = useMemo(() => friends.map(f => f.id).sort().join(','), [friends])
  const groupEdgeKey = useMemo(() => groupEdges.map(e => `${e.source}|${e.target}`).join(','), [groupEdges])

  // Run force simulation — updates SVG DOM directly (no React re-renders per frame)
  useEffect(() => {
    if (friends.length === 0) return

    // Initialize positions by tier ring
    nodesRef.current = friends.map((f, i) => {
      const angle = (i / friends.length) * Math.PI * 2 + Math.random() * 0.4
      const tierR = f.tier === 'inner-circle' ? 90 : f.tier === 'close-friend' ? 170 : 250
      const jitter = (Math.random() - 0.5) * 50
      return {
        id: f.id,
        x: W / 2 + Math.cos(angle) * (tierR + jitter),
        y: H / 2 + Math.sin(angle) * (tierR + jitter),
        vx: 0,
        vy: 0,
        r: Math.max(20, Math.min(34, 20 + Math.sqrt(f.hangout_count || 0) * 2.5)),
      }
    })

    const groupEdgesCopy = groupEdges.slice()
    let alpha = 1
    let alive = true

    const tick = () => {
      const nodes = nodesRef.current
      const nodeMap: Record<string, SimNode> = {}
      for (const n of nodes) nodeMap[n.id] = n

      // Node–node repulsion
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy + 1
          const d = Math.sqrt(d2)
          const force = alpha * 1400 / d2
          const nx = dx / d, ny = dy / d
          a.vx -= nx * force; a.vy -= ny * force
          b.vx += nx * force; b.vy += ny * force
        }
      }

      // Group edge spring attraction
      for (const e of groupEdgesCopy) {
        const a = nodeMap[e.source], b = nodeMap[e.target]
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const restLen = a.r + b.r + 70
        const stretch = d - restLen
        const k = 0.04 * alpha
        const fx = (dx / d) * stretch * k, fy = (dy / d) * stretch * k
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }

      // Gentle gravity toward center
      for (const n of nodes) {
        if (dragRef.current === n.id) continue
        n.vx += (W / 2 - n.x) * 0.006 * alpha
        n.vy += (H / 2 - n.y) * 0.006 * alpha
      }

      // Integrate
      for (const n of nodes) {
        if (dragRef.current === n.id) continue
        n.vx *= 0.72
        n.vy *= 0.72
        n.x += n.vx
        n.y += n.vy
        n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, n.x))
        n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, n.y))
      }

      // Update DOM directly
      for (const n of nodes) {
        const el = nodeEls.current[n.id]
        if (el) el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`)
      }
      for (const e of groupEdgesCopy) {
        const key = `g:${[e.source, e.target].sort().join('|')}:${e.color}`
        const el = groupLineEls.current[key]
        const a = nodeMap[e.source], b = nodeMap[e.target]
        if (el && a && b) {
          el.setAttribute('x1', a.x.toFixed(1))
          el.setAttribute('y1', a.y.toFixed(1))
          el.setAttribute('x2', b.x.toFixed(1))
          el.setAttribute('y2', b.y.toFixed(1))
        }
        // Update label position at edge midpoint
        const labelEl = groupLabelEls.current[key]
        if (labelEl && a && b) {
          labelEl.setAttribute('x', ((a.x + b.x) / 2).toFixed(1))
          labelEl.setAttribute('y', ((a.y + b.y) / 2 - 6).toFixed(1))
        }
      }

      // Decay alpha but keep a floor so physics never fully stops
      alpha = Math.max(0.015, alpha * 0.996)
      if (dragRef.current) alpha = Math.max(alpha, 0.3)
      if (alive) animRef.current = requestAnimationFrame(tick)
    }

    setSettled(false)
    animRef.current = requestAnimationFrame(tick)
    const revealTimer = setTimeout(() => setSettled(true), 400)
    return () => { alive = false; cancelAnimationFrame(animRef.current); clearTimeout(revealTimer) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendKey, groupEdgeKey])

  // Drag a node with mouse
  const handleMouseDown = (id: string, e: React.MouseEvent) => {
    e.preventDefault()
    dragRef.current = id
    didDragRef.current = false

    const onMove = (me: MouseEvent) => {
      if (!didDragRef.current) {
        didDragRef.current = true
        applyHighlight(id)
      }
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleX = W / rect.width
      const scaleY = H / rect.height
      const n = nodesRef.current.find(n => n.id === id)
      if (!n) return
      n.x = Math.max(n.r + 4, Math.min(W - n.r - 4, (me.clientX - rect.left) * scaleX))
      n.y = Math.max(n.r + 4, Math.min(H - n.r - 4, (me.clientY - rect.top) * scaleY))
      n.vx = 0; n.vy = 0

      const el = nodeEls.current[id]
      if (el) el.setAttribute('transform', `translate(${n.x.toFixed(1)},${n.y.toFixed(1)})`)

      const nodeMap: Record<string, SimNode> = {}
      for (const nd of nodesRef.current) nodeMap[nd.id] = nd
      for (const edge of groupEdges) {
        if (edge.source !== id && edge.target !== id) continue
        const key = `g:${[edge.source, edge.target].sort().join('|')}:${edge.color}`
        const lineEl = groupLineEls.current[key]
        const a = nodeMap[edge.source], b = nodeMap[edge.target]
        if (lineEl && a && b) {
          lineEl.setAttribute('x1', a.x.toFixed(1)); lineEl.setAttribute('y1', a.y.toFixed(1))
          lineEl.setAttribute('x2', b.x.toFixed(1)); lineEl.setAttribute('y2', b.y.toFixed(1))
        }
        const labelEl = groupLabelEls.current[key]
        if (labelEl && a && b) {
          labelEl.setAttribute('x', ((a.x + b.x) / 2).toFixed(1))
          labelEl.setAttribute('y', ((a.y + b.y) / 2 - 6).toFixed(1))
        }
      }
    }

    const onUp = () => {
      dragRef.current = null
      applyHighlight(null)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  if (friends.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '64px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}>
        No friends yet.
      </div>
    )
  }

  return (
    <div style={{ position: 'relative', userSelect: 'none', opacity: settled ? 1 : 0, transition: 'opacity 400ms ease' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: 16,
          background: 'var(--bg-card)',
          border: '1px solid var(--border)',
        }}
      >
        <defs>
          {friends.map(f => (
            <clipPath key={`clip-${f.id}`} id={`clip-${f.id}`}>
              <circle r={Math.max(20, Math.min(34, 20 + Math.sqrt(f.hangout_count || 0) * 2.5))} />
            </clipPath>
          ))}
        </defs>

        {/* Group edges (dashed, colored) */}
        <g>
          {groupEdges.map(e => {
            const key = `g:${[e.source, e.target].sort().join('|')}:${e.color}`
            const a = nodesRef.current.find(n => n.id === e.source)
            const b = nodesRef.current.find(n => n.id === e.target)
            return (
              <line
                key={key}
                ref={el => { groupLineEls.current[key] = el }}
                x1={a?.x ?? W / 2} y1={a?.y ?? H / 2}
                x2={b?.x ?? W / 2} y2={b?.y ?? H / 2}
                stroke={e.color}
                strokeWidth={2}
                strokeDasharray="6 4"
                opacity={0.55}
              />
            )
          })}
        </g>

        {/* Group edge labels (hidden until hover) */}
        <g>
          {groupEdges.map(e => {
            const key = `g:${[e.source, e.target].sort().join('|')}:${e.color}`
            const a = nodesRef.current.find(n => n.id === e.source)
            const b = nodesRef.current.find(n => n.id === e.target)
            const mx = ((a?.x ?? W / 2) + (b?.x ?? W / 2)) / 2
            const my = ((a?.y ?? H / 2) + (b?.y ?? H / 2)) / 2
            return (
              <text
                key={`label-${key}`}
                ref={el => { groupLabelEls.current[key] = el }}
                x={mx} y={my - 6}
                textAnchor="middle"
                fontSize={10}
                fontFamily="var(--font-sans)"
                fontWeight={600}
                fill={e.color}
                opacity={0}
                style={{ pointerEvents: 'none' }}
              >
                {e.groupName}
              </text>
            )
          })}
        </g>

        {/* Nodes */}
        <g>
          {friends.map(f => {
            const r = Math.max(20, Math.min(34, 20 + Math.sqrt(f.hangout_count || 0) * 2.5))
            const tc = TIER_COLOR[f.tier ?? ''] ?? 'var(--border)'
            const node = nodesRef.current.find(n => n.id === f.id)
            const x = node?.x ?? W / 2
            const y = node?.y ?? H / 2
            return (
              <g
                key={f.id}
                ref={el => { nodeEls.current[f.id] = el }}
                transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
                style={{ cursor: 'grab' }}
                onMouseDown={ev => handleMouseDown(f.id, ev)}
                onMouseEnter={ev => {
                  setHoveredId(f.id)
                  setTooltipPos({ x: ev.clientX, y: ev.clientY })
                }}
                onMouseLeave={() => {
                  setHoveredId(null)
                }}
                onMouseMove={ev => setTooltipPos({ x: ev.clientX, y: ev.clientY })}
                onClick={() => { if (!didDragRef.current) navigate(`/friends/${f.id}`) }}
              >
                {/* Tier ring */}
                <circle r={r + 3.5} fill={tc} opacity={0.25} />
                <circle r={r + 3.5} fill="none" stroke={tc} strokeWidth={2} opacity={0.9} />
                {/* Avatar */}
                <circle r={r} fill={f.avatar_color} />
                {f.avatar_url ? (
                  <image
                    href={f.avatar_url}
                    x={-r} y={-r}
                    width={r * 2} height={r * 2}
                    clipPath={`url(#clip-${f.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="white"
                    fontSize={r * 0.62}
                    fontFamily="var(--font-serif)"
                    fontWeight={500}
                    style={{ pointerEvents: 'none' }}
                  >
                    {f.initials}
                  </text>
                )}
                {/* Starred indicator */}
                {f.starred && (
                  <text
                    x={r * 0.62}
                    y={-r * 0.65}
                    fontSize={9}
                    fill={tc}
                    textAnchor="middle"
                    dominantBaseline="central"
                    style={{ pointerEvents: 'none' }}
                  >
                    ★
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>

      {/* Hover tooltip — clamped inside the graph container */}
      {hoveredId && friendMap[hoveredId] && svgRef.current && (() => {
        const rect = svgRef.current!.getBoundingClientRect()
        const relX = Math.min(tooltipPos.x - rect.left + 14, rect.width - 160)
        const relY = Math.max(tooltipPos.y - rect.top - 50, 8)
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.max(8, relX),
              top: relY,
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              pointerEvents: 'none',
              zIndex: 200,
              boxShadow: 'var(--shadow-md)',
              whiteSpace: 'nowrap',
            }}
          >
            <div style={{ fontFamily: 'var(--font-serif)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)', marginBottom: 2 }}>
              {friendMap[hoveredId].name}
            </div>
            <div style={{ fontFamily: 'var(--font-sans)', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              {friendMap[hoveredId].tier?.replace(/-/g, ' ')}
              {friendMap[hoveredId].hangout_count > 0 && ` · ${friendMap[hoveredId].hangout_count} hang${friendMap[hoveredId].hangout_count !== 1 ? 's' : ''}`}
            </div>
          </div>
        )
      })()}

      {/* Legend — top-left overlay inside the graph */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)',
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 10, padding: '10px 14px',
        pointerEvents: 'none', opacity: 0.85,
      }}>
        {Object.entries(TIER_COLOR).map(([tier, color]) => (
          <div key={tier} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
            {tier === 'inner-circle' ? 'Inner circle' : tier === 'close-friend' ? 'Close friend' : 'Casual'}
          </div>
        ))}
        {groups.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={16} height={4}><line x1={0} y1={2} x2={16} y2={2} stroke="var(--text-muted)" strokeWidth={1.5} strokeDasharray="4 3" /></svg>
            Group
          </div>
        )}
        <div style={{ opacity: 0.55, fontSize: '0.62rem', marginTop: 2 }}>Drag · Click to open</div>
      </div>
    </div>
  )
}
