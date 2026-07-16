import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/lib/finance'
import { clearToken, getToken, setToken } from '@/lib/api'
import type { LoginRequest, RegisterRequest, Role } from '@/types/api'

interface SessionUser {
  username: string
  role: Role
}

interface AuthContextValue {
  user: SessionUser | null
  isAuthenticated: boolean
  login: (body: LoginRequest) => Promise<void>
  register: (body: RegisterRequest) => Promise<void>
  logout: () => void
}

const USER_KEY = 'jodrix.user'

function loadUser(): SessionUser | null {
  if (!getToken()) return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? (JSON.parse(raw) as SessionUser) : null
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(loadUser)

  const persist = useCallback((u: SessionUser, token: string) => {
    setToken(token)
    localStorage.setItem(USER_KEY, JSON.stringify(u))
    setUser(u)
  }, [])

  const login = useCallback(
    async (body: LoginRequest) => {
      const res = await authApi.login(body)
      persist({ username: res.username, role: res.role }, res.token)
    },
    [persist],
  )

  const register = useCallback(
    async (body: RegisterRequest) => {
      const res = await authApi.register(body)
      persist({ username: res.username, role: res.role }, res.token)
    },
    [persist],
  )

  const logout = useCallback(() => {
    clearToken()
    localStorage.removeItem(USER_KEY)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isAuthenticated: !!user, login, register, logout }),
    [user, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
