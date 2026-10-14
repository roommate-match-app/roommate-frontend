// Преобразование ответов API в представления (view models), которые
// используют экраны приложения. Позволяет переиспользовать существующую разметку.

import { mediaUrl } from './api'
import type { Announcement, Candidate, Chat, NotificationItem, Profile } from './types'

export interface Person {
  id: string
  name: string
  age: number
  budget: number
  district: string
  metro: string
  minutes: number
  date: string
  image: string
  tags: string[]
  about: string
  match: number
  city: string
}

const HOBBY_LABELS: Record<string, string> = {
  films: 'Кино',
  music: 'Музыка',
  sports: 'Спорт',
  reading: 'Чтение',
  gaming: 'Игры',
  books: 'Книги',
  photography: 'Фотография',
  cooking: 'Готовка',
  arts: 'Искусство',
  table_games: 'Настолки',
  travel: 'Путешествия',
  walking: 'Прогулки',
  dancing: 'Танцы',
  singing: 'Пение',
}

// Нейтральные заглушки вместо чужих стоковых фотографий.
export const PROFILE_PLACEHOLDER = '/profile-placeholder.svg'
export const LISTING_PLACEHOLDER = '/listing-placeholder.svg'

export function profilePhoto(profile: Profile | null | undefined): string {
  if (profile?.photo_url) return mediaUrl(profile.photo_url)
  return PROFILE_PLACEHOLDER
}

function profileTags(profile: Profile): string[] {
  const tags: string[] = []
  if (profile.bad_habits) {
    tags.push(profile.bad_habits.smoking ? 'Курю' : 'Не курю')
    tags.push(profile.bad_habits.pets ? 'Есть животные' : 'Без животных')
    tags.push(profile.bad_habits.sleep_mode === 'early' ? 'Жаворонок' : 'Сова')
  }
  if (profile.hobbies) {
    for (const [key, value] of Object.entries(profile.hobbies)) {
      if (value && HOBBY_LABELS[key]) tags.push(HOBBY_LABELS[key])
    }
  }
  return tags
}

export function toPerson(profile: Profile, compatibility = 0): Person {
  return {
    id: profile.user_id,
    name: profile.first_name,
    age: profile.age,
    budget: profile.preferences?.budget_max ?? 0,
    district: profile.district,
    metro: profile.metro_station,
    minutes: profile.minutes_to_metro ?? 0,
    date: 'ближайшее время',
    image: profilePhoto(profile),
    tags: profileTags(profile),
    about: profile.bio ?? 'Пользователь пока не заполнил описание о себе.',
    match: compatibility,
    city: profile.city,
  }
}

export function candidateToPerson(candidate: Candidate): Person {
  return toPerson(candidate.profile, candidate.compatibility)
}

// Грубая оценка совместимости для карточек совпадений (совпадение уже случилось,
// поэтому показываем высокий процент при близких бюджетах).
export function estimateCompatibility(a: Profile, b: Profile): number {
  let score = 60
  if (a.city && a.city === b.city) score += 15
  if (a.district && a.district === b.district) score += 10
  const budgetA = a.preferences?.budget_max ?? 0
  const budgetB = b.preferences?.budget_max ?? 0
  if (budgetA && budgetB) {
    const diff = Math.abs(budgetA - budgetB) / Math.max(budgetA, budgetB)
    score += Math.round(15 * (1 - diff))
  }
  return Math.min(99, score)
}

export function formatTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'только что'
  if (minutes < 60) return `${minutes} мин назад`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ч назад`
  return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })
}

export function matchToPerson(peer: Profile | null, self: Profile | null): Person {
  if (!peer) {
    return {
      id: 'unknown',
      name: 'Пользователь',
      age: 0,
      budget: 0,
      district: '',
      metro: '',
      minutes: 0,
      date: 'ближайшее время',
      image: PROFILE_PLACEHOLDER,
      tags: [],
      about: '',
      match: 0,
      city: '',
    }
  }
  return toPerson(peer, self ? estimateCompatibility(self, peer) : 0)
}

export interface ChatItem {
  id: string
  name: string
  age: number
  image: string
  snippet: string
  time: string
  unread: number
}

export function toChatItem(chat: Chat): ChatItem {
  return {
    id: chat.id,
    name: chat.peer?.first_name ?? 'Пользователь',
    age: chat.peer?.age ?? 0,
    image: profilePhoto(chat.peer),
    snippet: chat.last_message?.content ?? 'Начните общение',
    time: formatTime(chat.last_message?.sent_at ?? chat.created_at),
    unread: chat.unread_count,
  }
}

const NOTIFICATION_ICONS: Record<string, string> = {
  like: 'heart',
  match: 'heart',
  message: 'message',
  application: 'home',
  review: 'star',
}

const NOTIFICATION_ROUTES: Record<string, string> = {
  like: 'browse',
  match: 'matches',
  message: 'messages',
  application: 'listings',
  review: 'profile',
}

export interface NotificationView {
  id: string
  icon: string
  title: string
  body: string
  time: string
  to: string
}

export function toNotificationView(item: NotificationItem): NotificationView {
  return {
    id: item.id,
    icon: NOTIFICATION_ICONS[item.type] ?? 'bell',
    title: item.body,
    body: '',
    time: formatRelative(item.created_at),
    to: NOTIFICATION_ROUTES[item.type] ?? 'notifications',
  }
}

export interface Listing {
  id: string
  title: string
  price: number
  metro: string
  area: number
  rooms: number
  image: string
  kind: string
  tags: string[]
  free: boolean
}

export function toListing(announcement: Announcement): Listing {
  const tags: string[] = []
  if (announcement.rules?.pets_allowed) tags.push('Можно с животными')
  if (announcement.rules?.smoking_allowed === false) tags.push('Не курим')
  if (announcement.amenities?.furniture) tags.push('Есть мебель')
  if (announcement.amenities?.internet) tags.push('Интернет')
  if (announcement.rules?.guests_allowed) tags.push('Можно гостей')
  const mainPhoto = announcement.photos.find((photo) => photo.is_main) ?? announcement.photos[0]
  return {
    id: announcement.id,
    title: `Комната в ${announcement.total_rooms}-комнатной квартире`,
    price: announcement.room_price,
    metro: announcement.address?.metro_station ?? 'метро не указано',
    area: announcement.area,
    rooms: announcement.total_rooms,
    image: mainPhoto ? mediaUrl(mainPhoto.url) : LISTING_PLACEHOLDER,
    kind: announcement.free ? 'Ищу соседа' : 'Ищу комнату',
    tags,
    free: announcement.free,
  }
}
