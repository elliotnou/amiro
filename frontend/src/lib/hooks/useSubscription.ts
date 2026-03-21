import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { useAuth } from '../auth'

export type SubscriptionStatus = 'loading' | 'active' | 'inactive'

export function useSubscription() {
  const { user } = useAuth()
  const [status, setStatus] = useState<SubscriptionStatus>('loading')

  useEffect(() => {
    if (!user) { setStatus('inactive'); return }
    ;(supabase
      .from('subscriptions' as any)
      .select('status')
      .eq('user_id', user.id)
      .maybeSingle() as any)
      .then(({ data }: { data: any }) => {
        setStatus(data?.status === 'active' ? 'active' : 'inactive')
      })
      .catch(() => setStatus('inactive'))
  }, [user])

  const startCheckout = async () => {
    try {
      // Force a token refresh so the edge function always gets a fresh JWT
      await supabase.auth.refreshSession()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) return

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-checkout`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ return_url: `${window.location.origin}/upgrade` }),
        }
      )
      const text = await res.text()
      let data: any = {}
      try { data = JSON.parse(text) } catch { throw new Error(`Bad response (${res.status}): ${text}`) }
      if (data.url) window.location.href = data.url
      else throw new Error(`${res.status}: ${data.error || text}`)
    } catch (e: any) {
      alert(`Checkout error: ${e.message}`)
    }
  }

  return { status, startCheckout }
}
