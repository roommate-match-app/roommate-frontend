// Провайдер аутентификации: хранит JWT, текущего пользователя и его анкету.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, loadAuth, saveAuth } from '../lib/api'
import type { AuthUser, Profile, TokenPair } from '../lib/types'
import { AuthContext, type AuthState } from './AuthContext'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  // Если сохранённых токенов нет — приложение сразу готово (неавторизованный режим).
  const [ready, setReady] = useState(() => loadAuth() === null)

  const loadProfile = useCallback(async () => {
    try {
      setProfile(await api.profiles.me())
    } catch {
      setProfile(null)
    }
  }, [])

  // Проверяем сохранённый access-токен при запуске приложения.
  useEffect(() => {
    if (ready) return
    let cancelled = false
    void (async () => {
      try {
        const me = await api.auth.me()
        if (cancelled) return
        setUser(me)
        await loadProfile()
      } catch {
        saveAuth(null)
      } finally {
        if (!cancelled) setReady(true)
      }
    })()
    return () => { cancelled = true }
  }, [ready, loadProfile])

  const applyTokens = useCallback(async (pair: TokenPair) => {
    saveAuth({ access: pair.access_token, refresh: pair.refresh_token })
    setUser(await api.auth.me())
    await loadProfile()
  }, [loadProfile])

  const login = useCallback(async (email: string, password: string) => {
    await applyTokens(await api.auth.login(email, password))
  }, [applyTokens])

  const register = useCallback(async (email: string, password: string) => {
    await applyTokens(await api.auth.register(email, password))
  }, [applyTokens])

  const logout = useCallback(() => {
    saveAuth(null)
    setUser(null)
    setProfile(null)
  }, [])

  const value = useMemo<AuthState>(() => ({
    user,
    profile,
    ready,
    signedIn: user !== null,
    login,
    register,
    logout,
    refreshProfile: loadProfile,
    setProfile,
  }), [user, profile, ready, login, register, logout, loadProfile])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
