interface Props {
  /** Values 0–100 for each axis */
  scores: {
    recency: number
    closeness: number
    depth: number
    knowledge: number
    consistency: number
    contact: number
  }
  color: string
  size?: number
}

const AXES = ['Recency', 'Closeness', 'Depth', 'Knowledge', 'Consistency', 'Contact'] as const
const N = AXES.length

function polarToXY(cx: number, cy: number, angle: number, r: number) {
  return {
    x: cx + r * Math.cos(angle - Math.PI / 2),
    y: cy + r * Math.sin(angle - Math.PI / 2),
  }
}

export default function RelationshipRadar({ scores, color, size = 220 }: Props) {
  const cx = size / 2
  const cy = size / 2
  const maxR = size * 0.38
  const labelR = size * 0.48

  const values = [
    scores.recency,
    scores.closeness,
    scores.depth,
    scores.knowledge,
    scores.consistency,
    scores.contact,
  ].map(v => Math.max(0, Math.min(100, v)))

  const angleStep = (2 * Math.PI) / N

  // Grid rings (20, 40, 60, 80, 100)
  const rings = [20, 40, 60, 80, 100]

  // Build polygon
  const polygon = values.map((v, i) => {
    const r = (v / 100) * maxR
    const { x, y } = polarToXY(cx, cy, i * angleStep, r)
    return `${x},${y}`
  }).join(' ')

  // Axis lines
  const axisLines = Array.from({ length: N }, (_, i) => {
    const outer = polarToXY(cx, cy, i * angleStep, maxR)
    return <line key={i} x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="var(--border)" strokeWidth={1} />
  })

  // Ring polygons
  const ringPolys = rings.map(pct => {
    const r = (pct / 100) * maxR
    const pts = Array.from({ length: N }, (_, i) => {
      const { x, y } = polarToXY(cx, cy, i * angleStep, r)
      return `${x},${y}`
    }).join(' ')
    return <polygon key={pct} points={pts} fill="none" stroke="var(--border)" strokeWidth={pct === 100 ? 1.2 : 0.7} />
  })

  // Labels
  const labels = AXES.map((label, i) => {
    const { x, y } = polarToXY(cx, cy, i * angleStep, labelR)
    const anchor = x < cx - 4 ? 'end' : x > cx + 4 ? 'start' : 'middle'
    const score = values[i]
    return (
      <g key={label}>
        <text
          x={x} y={y - 5}
          textAnchor={anchor}
          fontSize={9}
          fontFamily="var(--font-sans)"
          fill="var(--text-muted)"
          letterSpacing="0.04em"
        >
          {label.toUpperCase()}
        </text>
        <text
          x={x} y={y + 8}
          textAnchor={anchor}
          fontSize={10}
          fontFamily="var(--font-serif)"
          fontWeight={600}
          fill={score > 60 ? color : 'var(--text-secondary)'}
        >
          {score}
        </text>
      </g>
    )
  })

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ overflow: 'visible' }}>
      {/* Grid */}
      {ringPolys}
      {axisLines}

      {/* Data polygon */}
      <polygon
        points={polygon}
        fill={`${color}22`}
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        style={{ transition: 'all 600ms ease' }}
      />

      {/* Data points */}
      {values.map((v, i) => {
        const r = (v / 100) * maxR
        const { x, y } = polarToXY(cx, cy, i * angleStep, r)
        return (
          <circle
            key={i} cx={x} cy={y} r={4}
            fill={v > 0 ? color : 'var(--border)'}
            stroke="var(--bg-card)"
            strokeWidth={2}
            style={{ transition: 'all 600ms ease' }}
          />
        )
      })}

      {/* Labels */}
      {labels}
    </svg>
  )
}
