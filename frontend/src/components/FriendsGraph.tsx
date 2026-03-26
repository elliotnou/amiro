import { useRef, useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

interface GF {
  id: string
  name: string
  first_name: string | null
  initials: string
  avatar_color: string
  avatar_url: string | null
  tier: string | null
  hangout_count: number
  starred: boolean
  met_through_id: string | null
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
  groupId: string
}

interface MetThroughEdge {
  from: string   // the friend who was introduced
  through: string // the mutual friend who introduced them
}

const TIER_COLOR: Record<string, string> = {
  'inner-circle': '#e07a5f',
  'close-friend': '#457b9d',
  'casual': '#c9a96e',
}

// Distinct palette for group edge colors — chosen to be visually separable
const GROUP_PALETTE = [
  '#e07a5f', '#457b9d', '#8ab17d', '#b07cc6', '#e6a940',
  '#5bc0be', '#d4648a', '#7a9cc6', '#c9a96e', '#6a9f7a',
  '#d97b3b', '#8884d8', '#e25c7a', '#4ea8a6', '#c47a3f',
]

const W = 900
const H = 560

function metThroughPath(ax: number, ay: number, bx: number, by: number) {
  const mx = (ax + bx) / 2, my = (ay + by) / 2
  return `M${ax.toFixed(1)},${ay.toFixed(1)}L${mx.toFixed(1)},${my.toFixed(1)}L${bx.toFixed(1)},${by.toFixed(1)}`
}

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
  const metThroughLineEls = useRef<Record<string, SVGPathElement | null>>({})
  const groupCentroidLabelEls = useRef<Record<string, SVGTextElement | null>>({})
  const nodeNameEls = useRef<Record<string, SVGGElement | null>>({})
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const applyHighlightRef = useRef<(id: string | null) => void>(() => {})

  // Adaptive scale based on friend count
  const n = friends.length
  const scale = n <= 5 ? 1.5 : n <= 10 ? 1.25 : n <= 20 ? 1.0 : n <= 35 ? 0.85 : 0.7
  const minR = Math.round(20 * scale)
  const maxR = Math.round(34 * scale)

  const friendMap = useMemo(() => {
    const m: Record<string, GF> = {}
    for (const f of friends) m[f.id] = f
    return m
  }, [friends])

  // Assign distinct colors to groups so no person has two same-colored groups
  const groupColorMap = useMemo(() => {
    const colorOf: Record<string, string> = {}
    // For each group, find colors already used by groups that share a member
    for (const g of groups) {
      const usedColors = new Set<string>()
      for (const otherId of Object.keys(colorOf)) {
        const other = groups.find(gr => gr.id === otherId)
        if (other && g.memberIds.some(mid => other.memberIds.includes(mid))) {
          usedColors.add(colorOf[otherId])
        }
      }
      const available = GROUP_PALETTE.find(c => !usedColors.has(c))
      colorOf[g.id] = available ?? GROUP_PALETTE[Object.keys(colorOf).length % GROUP_PALETTE.length]
    }
    return colorOf
  }, [groups])

  // Build group edges: all pairs of members in the same group
  const groupEdges = useMemo<GroupEdge[]>(() => {
    const seen = new Set<string>()
    const result: GroupEdge[] = []
    for (const g of groups) {
      const color = groupColorMap[g.id] ?? g.color
      const members = g.memberIds.filter(id => friendMap[id])
      for (let i = 0; i < members.length; i++) {
        for (let j = i + 1; j < members.length; j++) {
          const key = [members[i], members[j]].sort().join('|')
          if (seen.has(key)) continue
          seen.add(key)
          result.push({ source: members[i], target: members[j], color, groupName: g.name, groupId: g.id })
        }
      }
    }
    return result
  }, [groups, friendMap, groupColorMap])

  // Build met-through edges: friend → mutual friend who introduced them
  const metThroughEdges = useMemo<MetThroughEdge[]>(() => {
    const result: MetThroughEdge[] = []
    for (const f of friends) {
      if (f.met_through_id && friendMap[f.met_through_id]) {
        result.push({ from: f.id, through: f.met_through_id })
      }
    }
    return result
  }, [friends, friendMap])

  // For each friend, which friend IDs they're connected to
  const connectionMap = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    for (const e of groupEdges) {
      if (!m[e.source]) m[e.source] = new Set()
      if (!m[e.target]) m[e.target] = new Set()
      m[e.source].add(e.target)
      m[e.target].add(e.source)
    }
    for (const e of metThroughEdges) {
      if (!m[e.from]) m[e.from] = new Set()
      if (!m[e.through]) m[e.through] = new Set()
      m[e.from].add(e.through)
      m[e.through].add(e.from)
    }
    return m
  }, [groupEdges, metThroughEdges])

  // For each friend, which group IDs they belong to
  const friendGroupMap = useMemo(() => {
    const m: Record<string, Set<string>> = {}
    for (const g of groups) {
      for (const id of g.memberIds) {
        if (!m[id]) m[id] = new Set()
        m[id].add(g.id)
      }
    }
    return m
  }, [groups])

  // Highlight connected nodes/edges on hover, dim the rest — all via DOM
  const applyHighlight = useCallback((id: string | null) => {
    highlightRef.current = id
    const connected = id ? connectionMap[id] ?? new Set() : new Set<string>()
    const isHighlighting = id !== null

    // Nodes + name labels
    for (const fId of Object.keys(nodeEls.current)) {
      const el = nodeEls.current[fId]
      if (!el) continue
      const nameEl = nodeNameEls.current[fId]
      if (!isHighlighting) {
        el.style.opacity = '1'
        el.style.transition = 'opacity 200ms ease'
        if (nameEl) { nameEl.style.opacity = '0'; nameEl.style.transition = 'opacity 200ms ease' }
      } else if (fId === id || connected.has(fId)) {
        el.style.opacity = '1'
        el.style.transition = 'opacity 200ms ease'
        if (nameEl) { nameEl.style.opacity = '1'; nameEl.style.transition = 'opacity 200ms ease' }
      } else {
        el.style.opacity = '0.22'
        el.style.transition = 'opacity 250ms ease'
        if (nameEl) { nameEl.style.opacity = '0'; nameEl.style.transition = 'opacity 200ms ease' }
      }
    }

    // Which groups does the highlighted node belong to?
    const activeGroups = id ? friendGroupMap[id] ?? new Set<string>() : new Set<string>()
    // All member IDs across those groups (for sibling edge highlighting)
    const activeGroupMembers = new Set<string>()
    if (id) {
      for (const g of groups) {
        if (activeGroups.has(g.id)) {
          for (const mid of g.memberIds) activeGroupMembers.add(mid)
        }
      }
    }

    // Group edges
    for (const e of groupEdges) {
      const key = `g:${[e.source, e.target].sort().join('|')}:${e.color}`
      const lineEl = groupLineEls.current[key]
      if (!lineEl) continue

      const isDirectConnection = id !== null && (e.source === id || e.target === id)
      const isSiblingConnection = activeGroups.has(e.groupId) && e.source !== id && e.target !== id

      if (!isHighlighting) {
        lineEl.setAttribute('opacity', '0.55')
        lineEl.setAttribute('stroke-width', '2')
        lineEl.style.transition = 'opacity 200ms ease'
      } else if (isDirectConnection) {
        lineEl.setAttribute('opacity', '0.85')
        lineEl.setAttribute('stroke-width', '3')
        lineEl.style.transition = 'opacity 200ms ease'
      } else if (isSiblingConnection) {
        lineEl.setAttribute('opacity', '0.45')
        lineEl.setAttribute('stroke-width', '2')
        lineEl.style.transition = 'opacity 200ms ease'
      } else {
        lineEl.setAttribute('opacity', '0.08')
        lineEl.setAttribute('stroke-width', '1.5')
        lineEl.style.transition = 'opacity 250ms ease'
      }
    }

    // Group centroid labels — show once per group when a member is highlighted
    for (const g of groups) {
      const labelEl = groupCentroidLabelEls.current[g.id]
      if (!labelEl) continue
      if (activeGroups.has(g.id)) {
        // Position at centroid of group members
        const members = g.memberIds.filter(mid => friendMap[mid])
        const nodeMap: Record<string, SimNode> = {}
        for (const nd of nodesRef.current) nodeMap[nd.id] = nd
        let cx = 0, cy = 0, count = 0
        for (const mid of members) {
          const nd = nodeMap[mid]
          if (nd) { cx += nd.x; cy += nd.y; count++ }
        }
        if (count > 0) {
          labelEl.setAttribute('x', (cx / count).toFixed(1))
          labelEl.setAttribute('y', (cy / count - 8).toFixed(1))
        }
        labelEl.setAttribute('opacity', '1')
      } else {
        labelEl.setAttribute('opacity', '0')
      }
    }

    // Met-through edges
    for (const e of metThroughEdges) {
      const key = `mt:${e.from}:${e.through}`
      const lineEl = metThroughLineEls.current[key]
      if (!lineEl) continue
      const isConnected = id !== null && (e.from === id || e.through === id)
      if (!isHighlighting) {
        lineEl.setAttribute('opacity', '0.35')
        lineEl.setAttribute('stroke-width', '1.5')
        lineEl.style.transition = 'opacity 200ms ease'
      } else if (isConnected) {
        lineEl.setAttribute('opacity', '0.8')
        lineEl.setAttribute('stroke-width', '2.5')
        lineEl.style.transition = 'opacity 200ms ease'
      } else {
        lineEl.setAttribute('opacity', '0.06')
        lineEl.setAttribute('stroke-width', '1')
        lineEl.style.transition = 'opacity 250ms ease'
      }
    }
  }, [groupEdges, connectionMap, friendGroupMap, groups, friendMap, metThroughEdges])

  applyHighlightRef.current = applyHighlight

  // Stable key — only restart simulation when friend IDs or group edges actually change
  const friendKey = useMemo(() => friends.map(f => f.id).sort().join(','), [friends])
  const groupEdgeKey = useMemo(() => groupEdges.map(e => `${e.source}|${e.target}`).join(','), [groupEdges])

  // Run force simulation — updates SVG DOM directly (no React re-renders per frame)
  useEffect(() => {
    if (friends.length === 0) return

    // Initialize positions by tier ring
    nodesRef.current = friends.map((f, i) => {
      const angle = (i / friends.length) * Math.PI * 2 + Math.random() * 0.4
      const tierR = (f.tier === 'inner-circle' ? 90 : f.tier === 'close-friend' ? 170 : 250) * scale
      const jitter = (Math.random() - 0.5) * 50
      return {
        id: f.id,
        x: W / 2 + Math.cos(angle) * (tierR + jitter),
        y: H / 2 + Math.sin(angle) * (tierR + jitter),
        vx: 0,
        vy: 0,
        r: Math.max(minR, Math.min(maxR, minR + Math.sqrt(f.hangout_count || 0) * 2.5 * scale)),
      }
    })

    const groupEdgesCopy = groupEdges.slice()
    const metThroughCopy = metThroughEdges.slice()
    let alpha = 1
    let alive = true

    const tick = () => {
      const nodes = nodesRef.current
      const nodeMap: Record<string, SimNode> = {}
      for (const n of nodes) nodeMap[n.id] = n

      // Node–node repulsion (scaled)
      const repulsion = 2200 * scale * scale
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j]
          const dx = b.x - a.x, dy = b.y - a.y
          const d2 = dx * dx + dy * dy + 1
          const d = Math.sqrt(d2)
          const force = alpha * repulsion / d2
          const nx = dx / d, ny = dy / d
          a.vx -= nx * force; a.vy -= ny * force
          b.vx += nx * force; b.vy += ny * force
        }
      }

      // Group edge spring attraction (scaled rest length, longer when dragging)
      const isDragging = dragRef.current !== null
      for (const e of groupEdgesCopy) {
        const a = nodeMap[e.source], b = nodeMap[e.target]
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const touchesDragged = isDragging && (e.source === dragRef.current || e.target === dragRef.current)
        const restLen = a.r + b.r + (touchesDragged ? 140 : 70) * scale
        const stretch = d - restLen
        const k = (touchesDragged ? 0.06 : 0.02) * alpha
        const fx = (dx / d) * stretch * k, fy = (dy / d) * stretch * k
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }

      // Met-through spring attraction (same physics as group edges)
      for (const e of metThroughCopy) {
        const a = nodeMap[e.from], b = nodeMap[e.through]
        if (!a || !b) continue
        const dx = b.x - a.x, dy = b.y - a.y
        const d = Math.sqrt(dx * dx + dy * dy) || 1
        const touchesDragged = isDragging && (e.from === dragRef.current || e.through === dragRef.current)
        const restLen = a.r + b.r + (touchesDragged ? 140 : 70) * scale
        const stretch = d - restLen
        const k = (touchesDragged ? 0.06 : 0.02) * alpha
        const fx = (dx / d) * stretch * k, fy = (dy / d) * stretch * k
        a.vx += fx; a.vy += fy
        b.vx -= fx; b.vy -= fy
      }

      // Gentle gravity toward center
      for (const n of nodes) {
        if (dragRef.current === n.id) continue
        n.vx += (W / 2 - n.x) * 0.002 * alpha
        n.vy += (H / 2 - n.y) * 0.002 * alpha
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
      }

      // Update met-through paths
      for (const e of metThroughCopy) {
        const key = `mt:${e.from}:${e.through}`
        const el = metThroughLineEls.current[key]
        const a = nodeMap[e.from], b = nodeMap[e.through]
        if (el && a && b) {
          el.setAttribute('d', metThroughPath(a.x, a.y, b.x, b.y))
        }
      }

      // Update group centroid labels
      for (const g of groups) {
        const labelEl = groupCentroidLabelEls.current[g.id]
        if (!labelEl) continue
        const members = g.memberIds.filter(mid => nodeMap[mid])
        let cx = 0, cy = 0, count = 0
        for (const mid of members) {
          const nd = nodeMap[mid]
          if (nd) { cx += nd.x; cy += nd.y; count++ }
        }
        if (count > 0) {
          labelEl.setAttribute('x', (cx / count).toFixed(1))
          labelEl.setAttribute('y', (cy / count - 8).toFixed(1))
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
        setHoveredId(null)
        applyHighlightRef.current(id)
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
      }
      // Update centroid labels for groups the dragged node belongs to
      const dragGroups = friendGroupMap[id] ?? new Set<string>()
      for (const g of groups) {
        if (!dragGroups.has(g.id)) continue
        const labelEl = groupCentroidLabelEls.current[g.id]
        if (!labelEl) continue
        const members = g.memberIds.filter(mid => nodeMap[mid])
        let cx = 0, cy = 0, count = 0
        for (const mid of members) {
          const nd = nodeMap[mid]
          if (nd) { cx += nd.x; cy += nd.y; count++ }
        }
        if (count > 0) {
          labelEl.setAttribute('x', (cx / count).toFixed(1))
          labelEl.setAttribute('y', (cy / count - 8).toFixed(1))
        }
      }
      // Update met-through paths
      for (const edge of metThroughEdges) {
        if (edge.from !== id && edge.through !== id) continue
        const key = `mt:${edge.from}:${edge.through}`
        const lineEl = metThroughLineEls.current[key]
        const a = nodeMap[edge.from], b = nodeMap[edge.through]
        if (lineEl && a && b) {
          lineEl.setAttribute('d', metThroughPath(a.x, a.y, b.x, b.y))
        }
      }
    }

    const onUp = () => {
      dragRef.current = null
      applyHighlightRef.current(null)
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

  // Custom cursor — salmon pointer arrow
  const cursorSvg = `<svg xmlns='http://www.w3.org/2000/svg' width='24' height='30' viewBox='0 0 24 30'><path d='M3 1 C2.5 0.5 2 0.8 2 1.5 L6 23 C6.2 24 7.2 24.5 7.8 23.8 L11 19.5 C11.5 18.8 12 18.5 12.8 18.5 L18.5 17.5 C19.5 17.3 19.8 16.2 19 15.6 Z' fill='#e07a5f' stroke='white' stroke-width='1.5' stroke-linejoin='round' stroke-linecap='round'/></svg>`
  const cursorUrl = `url("data:image/svg+xml,${encodeURIComponent(cursorSvg)}") 3 1, auto`

  return (
    <div style={{ position: 'relative', userSelect: 'none', opacity: settled ? 1 : 0, transition: 'opacity 400ms ease', borderRadius: 20, overflow: 'hidden' }}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          borderRadius: 20,
          background: 'var(--bg)',
          border: '1px solid rgba(0,0,0,0.12)',
          cursor: cursorUrl,
        }}
      >
        <defs>
          {friends.map(f => (
            <clipPath key={`clip-${f.id}`} id={`clip-${f.id}`}>
              <circle r={Math.max(minR, Math.min(maxR, minR + Math.sqrt(f.hangout_count || 0) * 2.5 * scale))} />
            </clipPath>
          ))}
          <marker id="met-through-arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="10" markerHeight="10" orient="auto" markerUnits="userSpaceOnUse">
            <path d="M 0 0.5 L 10 5 L 0 9.5 z" fill="#999" />
          </marker>
        </defs>

        {/* Met-through edges (solid, with arrow from→through) */}
        <g>
          {metThroughEdges.map(e => {
            const key = `mt:${e.from}:${e.through}`
            const a = nodesRef.current.find(n => n.id === e.from)
            const b = nodesRef.current.find(n => n.id === e.through)
            const ax = a?.x ?? W / 2, ay = a?.y ?? H / 2
            const bx = b?.x ?? W / 2, by = b?.y ?? H / 2
            return (
              <path
                key={key}
                ref={el => { metThroughLineEls.current[key] = el }}
                d={metThroughPath(ax, ay, bx, by)}
                stroke="var(--text-muted)"
                strokeWidth={1.5}
                fill="none"
                opacity={0.35}
                markerMid="url(#met-through-arrow)"
              />
            )
          })}
        </g>

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

        {/* Nodes */}
        <g>
          {friends.map(f => {
            const r = Math.max(minR, Math.min(maxR, minR + Math.sqrt(f.hangout_count || 0) * 2.5 * scale))
            const tc = TIER_COLOR[f.tier ?? ''] ?? 'var(--border)'
            const node = nodesRef.current.find(n => n.id === f.id)
            const x = node?.x ?? W / 2
            const y = node?.y ?? H / 2
            return (
              <g
                key={f.id}
                ref={el => { nodeEls.current[f.id] = el }}
                transform={`translate(${x.toFixed(1)},${y.toFixed(1)})`}
                style={{ cursor: cursorUrl }}
                onMouseDown={ev => handleMouseDown(f.id, ev)}
                onMouseEnter={ev => {
                  if (!dragRef.current) {
                    setHoveredId(f.id)
                    setTooltipPos({ x: ev.clientX, y: ev.clientY })
                  }
                }}
                onMouseLeave={() => {
                  if (!dragRef.current) setHoveredId(null)
                }}
                onMouseMove={ev => {
                  if (!dragRef.current) setTooltipPos({ x: ev.clientX, y: ev.clientY })
                }}
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
                    x={-r - 1} y={-r - 1}
                    width={r * 2 + 2} height={r * 2 + 2}
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
                {/* Name label (visible on drag/highlight) */}
                {(() => {
                  const first = f.first_name || f.name.trim()
                  return (
                    <g
                      ref={el => { nodeNameEls.current[f.id] = el }}
                      style={{ opacity: 0, pointerEvents: 'none', transition: 'opacity 200ms ease' }}
                    >
                      <rect
                        x={-first.length * 3.2 - 6}
                        y={r + 6}
                        width={first.length * 6.4 + 12}
                        height={16}
                        rx={8}
                        fill="var(--bg-card)"
                        opacity={0.85}
                      />
                      <text
                        x={0}
                        y={r + 17.5}
                        textAnchor="middle"
                        fontSize={9.5}
                        fontFamily="var(--font-sans)"
                        fontWeight={600}
                        fill="var(--text-primary)"
                      >
                        {first}
                      </text>
                    </g>
                  )
                })()}
              </g>
            )
          })}
        </g>

        {/* Group centroid labels (one per group, on top of everything) */}
        <g>
          {groups.map(g => {
            const members = g.memberIds.filter(mid => friendMap[mid])
            if (members.length === 0) return null
            let cx = 0, cy = 0, count = 0
            for (const mid of members) {
              const nd = nodesRef.current.find(n => n.id === mid)
              if (nd) { cx += nd.x; cy += nd.y; count++ }
            }
            const mx = count > 0 ? cx / count : W / 2
            const my = count > 0 ? cy / count : H / 2
            return (
              <text
                key={`group-label-${g.id}`}
                ref={el => { groupCentroidLabelEls.current[g.id] = el }}
                x={mx} y={my - 8}
                textAnchor="middle"
                fontSize={11}
                fontFamily="var(--font-sans)"
                fontWeight={600}
                fill={groupColorMap[g.id] ?? g.color}
                opacity={0}
                style={{ pointerEvents: 'none' }}
              >
                {g.name}
              </text>
            )
          })}
        </g>

      </svg>

      {/* Hover name pill */}
      {hoveredId && friendMap[hoveredId] && svgRef.current && (() => {
        const rect = svgRef.current!.getBoundingClientRect()
        const relX = tooltipPos.x - rect.left + 16
        const relY = tooltipPos.y - rect.top + 16
        const tc = TIER_COLOR[friendMap[hoveredId].tier ?? ''] ?? 'var(--accent)'
        return (
          <div
            style={{
              position: 'absolute',
              left: Math.min(Math.max(8, relX), rect.width - 120),
              top: Math.min(Math.max(8, relY), rect.height - 36),
              background: tc,
              borderRadius: 20,
              padding: '5px 14px',
              pointerEvents: 'none',
              zIndex: 200,
              boxShadow: `0 4px 14px ${tc}50`,
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.78rem', color: 'white' }}>
              {friendMap[hoveredId].name}
            </span>
          </div>
        )
      })()}

      {/* Legend — top-left overlay inside the graph */}
      <div style={{
        position: 'absolute', top: 14, left: 14,
        display: 'flex', flexDirection: 'column', gap: 6,
        fontFamily: 'var(--font-sans)', fontSize: '0.68rem', color: 'var(--text-muted)',
        background: 'transparent',
        border: '1px solid rgba(0,0,0,0.12)',
        borderRadius: 10, padding: '10px 14px',
        pointerEvents: 'none',
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
        {metThroughEdges.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width={16} height={6}><line x1={0} y1={3} x2={12} y2={3} stroke="var(--text-muted)" strokeWidth={1.5} /><polygon points="12,0.5 16,3 12,5.5" fill="var(--text-muted)" opacity={0.7} /></svg>
            Met through
          </div>
        )}
        <div style={{ opacity: 0.9, fontSize: '0.66rem', marginTop: 4, fontWeight: 500 }}>Drag for details · Click to open</div>
      </div>
    </div>
  )
}
