/**
 * friendScores.ts
 * Pure math scoring for the relationship radar.
 * All inputs come from data already fetched — no AI required.
 * Each score returns 0–100.
 */

interface HangoutDate { date: string }
export interface RadarScores {
  recency: number      // How recently you hung out
  closeness: number    // Total hangout count
  depth: number        // Impressions written
  knowledge: number    // Facts + notes recorded
  consistency: number  // How regular the hangouts are
  longevity: number    // How long you've known them
}

/** Days between two ISO date strings */
function daysBetween(a: string, b: string): number {
  return Math.abs(
    (new Date(a).getTime() - new Date(b).getTime()) / (1000 * 60 * 60 * 24)
  )
}

/**
 * Recency — based on days since last hangout.
 * Peaks at 0 days (100), decays to ~5 at 365+ days.
 */
export function scoreRecency(hangouts: HangoutDate[]): number {
  if (hangouts.length === 0) return 0
  const today = new Date().toISOString().slice(0, 10)
  const sorted = [...hangouts].sort((a, b) => b.date.localeCompare(a.date))
  const days = daysBetween(sorted[0].date, today)
  if (days <= 7)   return 100
  if (days <= 14)  return 88
  if (days <= 30)  return 72
  if (days <= 60)  return 55
  if (days <= 90)  return 42
  if (days <= 180) return 25
  if (days <= 365) return 12
  return 5
}

/**
 * Closeness — normalized hangout count.
 * 25+ hangouts = 100.
 */
export function scoreCloseness(hangoutCount: number): number {
  return Math.min(100, Math.round((hangoutCount / 25) * 100))
}

/**
 * Depth — impressions only, as a proxy for emotional investment.
 * 10+ impressions = 100.
 */
export function scoreDepth(impressionCount: number): number {
  if (impressionCount === 0) return 0
  if (impressionCount === 1) return 15
  if (impressionCount <= 3)  return 35
  if (impressionCount <= 6)  return 60
  if (impressionCount <= 10) return 80
  return 100
}

/**
 * Knowledge — facts + notes + interests recorded about this person.
 * Requires 20+ entries for max score.
 */
export function scoreKnowledge(factCount: number, noteCount: number, interestCount: number): number {
  const total = factCount + noteCount + interestCount
  if (total === 0) return 0
  return Math.min(100, Math.round((total / 20) * 100))
}

/**
 * Consistency — regularity of hangouts.
 * Computed from coefficient of variation of inter-hangout gaps.
 * Low variation (regular) = high score. 0 or 1 hangouts = 0.
 */
export function scoreConsistency(hangouts: HangoutDate[]): number {
  if (hangouts.length < 2) return 0
  const sorted = [...hangouts]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(h => new Date(h.date).getTime())

  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    gaps.push((sorted[i] - sorted[i - 1]) / (1000 * 60 * 60 * 24))
  }

  const mean = gaps.reduce((s, g) => s + g, 0) / gaps.length
  if (mean === 0) return 100

  const variance = gaps.reduce((s, g) => s + (g - mean) ** 2, 0) / gaps.length
  const cv = Math.sqrt(variance) / mean // coefficient of variation

  // cv=0 → perfectly regular → 100; cv≥2 → very irregular → 10
  return Math.max(10, Math.round(100 - cv * 45))
}

/**
 * Longevity — how long you've known this person (from met_date).
 * < 3 months → 10, 3–6 mo → 25, 6–12 mo → 40,
 * 1–2 yr → 60, 2–5 yr → 80, 5+ yr → 100.
 */
export function scoreLongevity(metDate: string | null): number {
  if (!metDate) return 0
  const days = daysBetween(metDate, new Date().toISOString().slice(0, 10))
  if (days < 90)  return 10
  if (days < 180) return 25
  if (days < 365) return 40
  if (days < 730) return 60
  if (days < 1825) return 80
  return 100
}

/** Convenience: compute all 6 scores at once */
export function computeRadarScores(params: {
  hangouts: HangoutDate[]
  hangoutCount: number
  noteCount: number
  impressionCount: number
  factCount: number
  interestCount: number
  metDate: string | null
}): RadarScores {
  return {
    recency:     scoreRecency(params.hangouts),
    closeness:   scoreCloseness(params.hangoutCount),
    depth:       scoreDepth(params.impressionCount),
    knowledge:   scoreKnowledge(params.factCount, params.noteCount, params.interestCount),
    consistency: scoreConsistency(params.hangouts),
    longevity:   scoreLongevity(params.metDate),
  }
}
