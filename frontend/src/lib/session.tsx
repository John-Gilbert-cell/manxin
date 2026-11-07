import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { apiMe, type Member } from '@/lib/api'

interface SessionState {
  member: (Member & { counts?: any }) | null
  loading: boolean
  setMember: (m: (Member & { counts?: any }) | null) => void
  refresh: () => Promise<void>
  signOut: () => void
}

const SessionContext = createContext<SessionState>({
  member: null,
  loading: true,
  setMember: () => {},
  refresh: async () => {},
  signOut: () => {},
})

export const TOKEN_KEY = 'manxin_token'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [member, setMember] = useState<(Member & { counts?: any }) | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_KEY)
    if (!token) {
      setMember(null)
      setLoading(false)
      return
    }
    try {
      const me = await apiMe()
      setMember(me)
    } catch {
      localStorage.removeItem(TOKEN_KEY)
      setMember(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const signOut = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY)
    setMember(null)
  }, [])

  const value = useMemo(
    () => ({ member, loading, setMember, refresh, signOut }),
    [member, loading, refresh, signOut]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export const useSession = () => useContext(SessionContext)
