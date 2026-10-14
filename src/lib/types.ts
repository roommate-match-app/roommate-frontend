// Типы, соответствующие OpenAPI-контракту бэкенда (roommate-backend).
// Источник: roomate-backend/openapi.json и app/db/schemas.

export type UUID = string

export interface Hobbies {
  films: boolean
  music: boolean
  sports: boolean
  reading: boolean
  gaming: boolean
  books: boolean
  photography: boolean
  cooking: boolean
  arts: boolean
  table_games: boolean
  travel: boolean
  walking: boolean
  dancing: boolean
  singing: boolean
}

export interface BadHabits {
  smoking: boolean
  pets: boolean
  sleep_mode: 'early' | 'late'
  noise_preference: 'quiet' | 'loud'
  guests: boolean
}

export interface Preferences {
  age_min: number
  age_max: number
  gender_preference: 'male' | 'female' | 'any'
  budget_max: number
  city_preference: string
  district_preference: string[]
  metro_preference: string[]
  smoking_preference: 'any' | 'yes' | 'no'
  pets_preference: 'any' | 'yes' | 'no'
  guests_preference: 'any' | 'yes' | 'no'
  sleep_mode_preference: 'any' | 'early' | 'late'
  noise_preference: 'any' | 'quiet' | 'loud'
}

export interface Profile {
  id: UUID
  user_id: UUID
  first_name: string
  last_name: string
  age: number
  gender: 'male' | 'female'
  city: string
  district: string
  metro_station: string
  minutes_to_metro: number | null
  bio: string | null
  photo_url: string | null
  hobbies: Hobbies | null
  bad_habits: BadHabits | null
  preferences: Preferences | null
}

export interface Candidate {
  profile: Profile
  compatibility: number
  liked: boolean
}

export interface Match {
  id: UUID
  user1_id: UUID
  user2_id: UUID
  matched_at: string
  chat_id: UUID | null
  peer: Profile | null
}

export interface LikeOut {
  id: UUID
  from_user_id: UUID
  to_user_id: UUID
  liked_at: string
  from_profile: Profile | null
  to_profile: Profile | null
}

export interface Message {
  id: UUID
  chat_id: UUID
  sender_id: UUID
  content: string
  sent_at: string
  is_read: boolean
}

export interface Chat {
  id: UUID
  match_id: UUID
  created_at: string
  peer: Profile | null
  last_message: Message | null
  unread_count: number
}

export interface NotificationItem {
  id: UUID
  user_id: UUID
  type: string
  body: string
  is_read: boolean
  created_at: string
}

export interface Address {
  city: string
  street: string
  house_number: string
  district: string
  metro_station: string
  minutes_to_metro: number | null
}

export interface AnnouncementPhoto {
  id: UUID
  url: string
  is_main: boolean
  position: number
}

export interface AnnouncementRules {
  smoking_allowed: boolean
  pets_allowed: boolean
  guests_allowed: boolean
  sleep_mode: 'early' | 'late' | 'any'
  noise_level: 'quiet' | 'loud' | 'any'
}

export interface AnnouncementAmenities {
  internet: boolean
  furniture: boolean
  kitchen: boolean
  washing_machine: boolean
  dishwasher: boolean
  balcony: boolean
  elevator: boolean
  air_conditioning: boolean
}

export interface Announcement {
  id: UUID
  user_id: UUID
  room_price: number
  total_rooms: number
  area: number
  move_in_date: string
  description: string | null
  created_at: string
  free: boolean
  address: Address | null
  rules: AnnouncementRules | null
  amenities: AnnouncementAmenities | null
  photos: AnnouncementPhoto[]
  owner: Profile | null
}

export interface Review {
  id: UUID
  reviewer_id: UUID
  reviewed_user_id: UUID
  rating: number
  comment: string | null
  created_at: string
  reviewer_name: string | null
}

export interface RatingSummary {
  user_id: UUID
  average: number
  count: number
}

export interface AuthUser {
  id: UUID
  email: string
  role: string
  is_blocked: boolean
  registered_at: string
  last_login: string | null
}

export interface TokenPair {
  access_token: string
  refresh_token: string | null
  token_type: string
}

export interface LikeResult {
  matched: boolean
  match_id: UUID | null
  chat_id: UUID | null
}

export interface Application {
  id: UUID
  announcement_id: UUID
  applicant_id: UUID
  message: string | null
  status: string
  created_at: string
  applicant_profile: Profile | null
}
