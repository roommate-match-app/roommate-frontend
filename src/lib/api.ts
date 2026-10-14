// HTTP-клиент и все вызовы API бэкенда «КакДостатьСоседа».
// Базовый URL берётся из VITE_API_URL; по умолчанию запросы идут на тот же хост
// (dev-сервер Vite проксирует /api и /media на бэкенд, см. vite.config.ts).

import type {
  Announcement,
  AnnouncementAmenities,
  AnnouncementRules,
  Application,
  AuthUser,
  Candidate,
  Chat,
  LikeOut,
  LikeResult,
  Match,
  Message,
  NotificationItem,
  Preferences,
  Profile,
  RatingSummary,
  Review,
  TokenPair,
  UUID,
} from './types'

export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? ''

const TOKEN_KEY = 'roommate-auth'

export interface StoredAuth {
  access: string
  refresh: string | null
}

export function loadAuth(): StoredAuth | null {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? (JSON.parse(raw) as StoredAuth) : null
  } catch {
    return null
  }
}

export function saveAuth(auth: StoredAuth | null): void {
  if (auth) localStorage.setItem(TOKEN_KEY, JSON.stringify(auth))
  else localStorage.removeItem(TOKEN_KEY)
}

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  const auth = loadAuth()
  if (!auth?.refresh) return false
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: auth.refresh }),
        })
        if (!res.ok) {
          saveAuth(null)
          return false
        }
        const data = (await res.json()) as TokenPair
        saveAuth({ access: data.access_token, refresh: data.refresh_token ?? auth.refresh })
        return true
      } catch {
        return false
      } finally {
        refreshPromise = null
      }
    })()
  }
  return refreshPromise
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const auth = loadAuth()
  const headers = new Headers(options.headers)
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (auth?.access) headers.set('Authorization', `Bearer ${auth.access}`)

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })

  if (res.status === 401 && retry && auth?.refresh) {
    if (await tryRefresh()) return apiFetch<T>(path, options, false)
  }
  if (!res.ok) {
    let detail = res.statusText
    try {
      const data = (await res.json()) as { detail?: unknown }
      if (typeof data?.detail === 'string') detail = data.detail
    } catch {
      /* тело не JSON — оставляем statusText */
    }
    throw new ApiError(res.status, detail)
  }
  if (res.status === 204) return undefined as T
  const contentType = res.headers.get('Content-Type') ?? ''
  if (!contentType.includes('application/json')) return undefined as T
  return (await res.json()) as T
}

const jsonBody = (payload: unknown): RequestInit => ({
  method: 'POST',
  body: JSON.stringify(payload),
})

function queryString(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const result = search.toString()
  return result ? `?${result}` : ''
}

export interface CandidateFilters {
  city?: string
  district?: string
  metro_station?: string
  gender?: 'male' | 'female'
  age_min?: number
  age_max?: number
  min_compatibility?: number
  limit?: number
  offset?: number
}

export const api = {
  auth: {
    register: (email: string, password: string) =>
      apiFetch<TokenPair>('/api/auth/register', jsonBody({ email, password })),
    login: (email: string, password: string) =>
      apiFetch<TokenPair>('/api/auth/login', jsonBody({ email, password })),
    me: () => apiFetch<AuthUser>('/api/auth/me'),
  },

  profiles: {
    me: () => apiFetch<Profile>('/api/profiles/me'),
    create: (payload: Record<string, unknown>) =>
      apiFetch<Profile>('/api/profiles/me', jsonBody(payload)),
    update: (payload: Record<string, unknown>) =>
      apiFetch<Profile>('/api/profiles/me', { method: 'PUT', body: JSON.stringify(payload) }),
    myPreferences: () => apiFetch<Preferences>('/api/profiles/me/preferences'),
    savePreferences: (payload: Preferences) =>
      apiFetch<Preferences>('/api/profiles/me/preferences', {
        method: 'PUT',
        body: JSON.stringify(payload),
      }),
    byUser: (userId: UUID) => apiFetch<Profile>(`/api/profiles/${userId}`),
    registerView: (userId: UUID) =>
      apiFetch<void>(`/api/profiles/${userId}/view`, { method: 'POST' }),
  },

  candidates: {
    list: (filters: CandidateFilters = {}) =>
      apiFetch<Candidate[]>(
        `/api/candidates${queryString({
          city: filters.city,
          district: filters.district,
          metro_station: filters.metro_station,
          gender: filters.gender,
          age_min: filters.age_min,
          age_max: filters.age_max,
          min_compatibility: filters.min_compatibility,
          limit: filters.limit,
          offset: filters.offset,
        })}`,
      ),
  },

  likes: {
    like: (userId: UUID) => apiFetch<LikeResult>(`/api/likes/${userId}`, { method: 'POST' }),
    unlike: (userId: UUID) => apiFetch<void>(`/api/likes/${userId}`, { method: 'DELETE' }),
    received: () => apiFetch<LikeOut[]>('/api/likes/received'),
    sent: () => apiFetch<LikeOut[]>('/api/likes/sent'),
  },

  matches: {
    list: () => apiFetch<Match[]>('/api/matches'),
  },

  chats: {
    list: () => apiFetch<Chat[]>('/api/chats'),
    unreadCount: () => apiFetch<{ count: number }>('/api/chats/unread-count'),
    messages: (chatId: UUID) => apiFetch<Message[]>(`/api/chats/${chatId}/messages`),
    send: (chatId: UUID, content: string) =>
      apiFetch<Message>(`/api/chats/${chatId}/messages`, jsonBody({ content })),
    markRead: (chatId: UUID) =>
      apiFetch<void>(`/api/chats/${chatId}/read`, { method: 'POST' }),
  },

  notifications: {
    list: (unreadOnly = false) =>
      apiFetch<NotificationItem[]>(`/api/notifications${unreadOnly ? '?unread_only=true' : ''}`),
    unreadCount: () => apiFetch<{ count: number }>('/api/notifications/unread-count'),
    readAll: () => apiFetch<void>('/api/notifications/read-all', { method: 'POST' }),
    read: (id: UUID) =>
      apiFetch<NotificationItem>(`/api/notifications/${id}/read`, { method: 'POST' }),
  },

  reviews: {
    create: (reviewedUserId: UUID, rating: number, comment: string) =>
      apiFetch<Review>(
        '/api/reviews',
        jsonBody({ reviewed_user_id: reviewedUserId, rating, comment: comment || null }),
      ),
    byUser: (userId: UUID) => apiFetch<Review[]>(`/api/users/${userId}/reviews`),
    rating: (userId: UUID) => apiFetch<RatingSummary>(`/api/users/${userId}/rating`),
  },

  announcements: {
    list: (filters: {
      city?: string
      district?: string
      metro_station?: string
      max_price?: number
      free?: boolean
    } = {}) =>
      apiFetch<Announcement[]>(
        `/api/announcements${queryString({
          city: filters.city,
          district: filters.district,
          metro_station: filters.metro_station,
          max_price: filters.max_price,
          free: filters.free === undefined ? undefined : String(filters.free),
        })}`,
      ),
    create: (payload: {
      room_price: number
      total_rooms: number
      area: number
      move_in_date: string
      description?: string
      address: {
        city: string
        street: string
        house_number: string
        district: string
        metro_station: string
        minutes_to_metro?: number
      }
      rules?: AnnouncementRules
      amenities?: AnnouncementAmenities
    }) => apiFetch<Announcement>('/api/announcements', jsonBody(payload)),
    apply: (announcementId: UUID, message: string) =>
      apiFetch<Application>(
        `/api/announcements/${announcementId}/applications`,
        jsonBody({ message: message || null }),
      ),
  },

  applications: {
    mine: () => apiFetch<Application[]>('/api/applications/me'),
    decide: (applicationId: UUID, status: 'accepted' | 'rejected') =>
      apiFetch<Application>(`/api/applications/${applicationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      }),
  },

  uploads: {
    image: async (file: File): Promise<{ url: string }> => {
      const form = new FormData()
      form.append('file', file)
      return apiFetch<{ url: string }>('/api/uploads', { method: 'POST', body: form })
    },
  },

  health: () => apiFetch<{ status: string }>('/health'),
}

export function mediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (/^https?:\/\//.test(path)) return path
  return `${API_BASE}${path}`
}

