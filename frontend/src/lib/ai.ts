import { supabase } from './supabase'

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`

export async function callAI(prompt: string, system?: string, signal?: AbortSignal): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not logged in')

  const res = await fetch(EDGE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    signal,
    body: JSON.stringify({ prompt, system }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    if (res.status === 402) throw new Error('upgrade_required')
    throw new Error(err.error || `Error ${res.status}`)
  }

  const data = await res.json()
  return data.text ?? ''
}

export function buildFriendContext(friend: any, hangouts: any[] = []): string {
  const lines = [
    `Name: ${friend.name}`,
    friend.location && `Location: ${friend.location}`,
    friend.tier && `Relationship tier: ${friend.tier.replace(/-/g, ' ')}`,
    friend.met_how && `How we met: ${friend.met_how}`,
    friend.met_date && `Friends since: ${friend.met_date}${friend.day_count > 0 ? ` (day ${friend.day_count})` : ''}`,
    friend.birthday && `Birthday: ${friend.birthday}`,
    friend.interests?.length > 0 && `Interests: ${friend.interests.join(', ')}`,
    friend.tags?.length > 0 && `Tags: ${friend.tags.join(', ')}`,
    friend.facts?.length > 0 && `Known facts:\n${friend.facts.map((f: any) => `  - ${f.category}: ${f.value}`).join('\n')}`,
    friend.notes?.length > 0 && `Recent notes:\n${friend.notes.slice(0, 6).map((n: any) => `  - [${n.date}] ${n.text}`).join('\n')}`,
    hangouts.length > 0 && `Past hangouts:\n${hangouts.slice(0, 8).map((h: any) => `  - ${h.type} in ${h.location} (${h.date})${h.highlights ? `: ${h.highlights}` : ''}`).join('\n')}`,
    friend.hangout_count > 0 && `Total hangouts logged: ${friend.hangout_count}`,
  ].filter(Boolean)
  return lines.join('\n')
}

export function buildAllFriendsContext(friends: any[], hangouts: any[]): string {
  const friendLines = friends.map(f => {
    const parts = [
      f.name,
      f.location && `(${f.location})`,
      f.tier && f.tier.replace(/-/g, ' '),
      f.day_count > 0 && `day ${f.day_count}`,
      f.hangout_count > 0 && `${f.hangout_count} hangouts`,
      f.interests?.length > 0 && `likes: ${f.interests.slice(0, 3).join(', ')}`,
    ].filter(Boolean)
    return `  - ${parts.join(' · ')}`
  })

  const recentHangouts = hangouts.slice(0, 12).map(h =>
    `  - ${h.type} with ${h.hangout_friends?.map((hf: any) => hf.friend_name).join(' & ') || 'someone'} on ${h.date}`
  )

  return [
    `My friend network (${friends.length} people):`,
    ...friendLines,
    recentHangouts.length > 0 && `\nRecent hangouts:\n${recentHangouts.join('\n')}`,
  ].filter(Boolean).join('\n')
}

export const PROMPTS = {
  giftIdeas: (ctx: string) => `Here is context about my friend:\n${ctx}\n\nSuggest 4-5 specific, personalized gift ideas for them. For each gift give: name, approximate price range, and 1-2 sentences explaining why it suits this specific person. Reference their actual facts and interests. Avoid generic gift suggestions.`,

  catchupBrief: (ctx: string) => `Here is context about my friend:\n${ctx}\n\nI'm about to see them soon. Write a concise catch-up brief covering:\n1. Key things to remember or follow up on (from notes)\n2. 2-3 specific conversation topics based on what I know about them\n3. One concrete thing I could do or say that would mean a lot to them personally\n\nKeep it warm and practical.`,

  hangoutIdeas: (ctx: string) => `Here is context about my friend:\n${ctx}\n\nSuggest 4 hangout ideas for us. Mix different vibes — active, chill, food, experience. For each: the type of hangout, a specific suggestion (not generic), and why it would work for this specific person. Use their location, interests, and our history together.`,

  globalQuery: (ctx: string, question: string) => `Here is my friend network:\n${ctx}\n\nMy question: ${question}\n\nAnswer based on what you know about my friends. Be specific — reference actual names and details from the data above.`,

  friendshipStory: (ctx: string, vibe: string) => `Here is context about my friend:\n${ctx}\n\nWrite a friendship story/narrative about our relationship together. Vibe: ${vibe}.\n\nGuidelines:\n- Write in first person ("I", "we")\n- Reference specific facts, hangouts, notes, and memories from the data\n- Make it feel genuine and personal, not generic\n- 3-4 paragraphs, flowing prose (not bullet points)\n- Capture the essence of the friendship — the highs, the texture of the relationship, what makes it special\n- Wholesome vibe: warm, heartfelt, appreciative tone\n- Funny vibe: playful, self-aware, inside-joke energy\n- Reflective vibe: introspective, meaningful, a bit poetic\n- Epic vibe: dramatic storytelling, like an adventure memoir\n- Raw vibe: honest, unfiltered, real talk`,
}
