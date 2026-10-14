// Контекст аутентификации: объект React-контекста и тип его состояния.

import { createContext } from 'react'

import type { AuthUser, Profile } from '../lib/types'

export interface AuthState {
  user: AuthUser | null
  profile: Profile | null
  ready: boolean
  signedIn: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshProfile: () => Promise<void>
  setProfile: (profile: Profile | null) => void
}

export const AuthContext = createContext<AuthState | null>(null)

// Провайдер и хук вынесены в AuthProvider.tsx и useAuth.ts (правило fast-refresh).
