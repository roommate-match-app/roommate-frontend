import { useCallback, useEffect, useMemo, useState, type ChangeEvent, type CSSProperties, type FormEvent } from 'react'
import './App.css'
import { useAuth } from './context/useAuth'
import { ApiError, api, mediaUrl } from './lib/api'
import {
  PROFILE_PLACEHOLDER,
  candidateToPerson,
  matchToPerson,
  profilePhoto,
  toChatItem,
  toListing,
  toNotificationView,
  toPerson,
  type ChatItem,
  type Listing,
  type NotificationView,
  type Person,
} from './lib/adapters'
import type { Message, Preferences, Profile } from './lib/types'

// Текст ошибки для показа пользователю.
function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return 'Произошла ошибка'
}

// Склонение существительного по числу (1 человек, 2 человека, 5 человек).
function pluralizeCount(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10
  const mod100 = count % 100
  if (mod10 === 1 && mod100 !== 11) return one
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few
  return many
}

type Route = 'home' | 'auth' | 'browse' | 'person' | 'questionnaire' | 'messages' | 'listings' | 'publish' | 'profile' | 'matches' | 'notifications' | 'review'

// Демонстрационные данные для статических (маркетинговых) блоков лендинга.
const people: Person[] = [
  { id: 'demo-1', name: 'Аня', age: 22, budget: 35000, district: 'ЦАО', metro: 'м. Тульская', minutes: 7, date: '10 октября', image: 'photo-1534528741775-53994a69daeb', tags: ['Не курю', 'Есть кот', 'Жаворонок'], about: 'Учусь и параллельно работаю. Ищу квартиру ближе к центру или в районе Тульской.', match: 98, city: 'Москва' },
  { id: 'demo-2', name: 'Максим', age: 24, budget: 40000, district: 'ЮАО', metro: 'м. Нагатинская', minutes: 10, date: '1 ноября', image: 'photo-1500648767791-00dcc994a43e', tags: ['Не курю', 'Сова', 'Спорт'], about: 'Работаю разработчиком, в свободное время занимаюсь спортом и люблю настольные игры.', match: 94, city: 'Москва' },
  { id: 'demo-3', name: 'Даша', age: 21, budget: 30000, district: 'САО', metro: 'м. Войковская', minutes: 5, date: '15 октября', image: 'photo-1524504388940-b1c1722653e1', tags: ['Не курю', 'Без животных', 'Ранние подъёмы'], about: 'Учусь на архитектора, люблю прогулки, музеи и уютные вечера.', match: 91, city: 'Москва' },
  { id: 'demo-4', name: 'Кирилл', age: 26, budget: 40000, district: 'ЦАО', metro: 'м. Курская', minutes: 8, date: '20 октября', image: 'photo-1506794778202-cad84cf45f1d', tags: ['Не курю', 'Есть кот', 'Спокойный ритм'], about: 'Работаю в дизайне, ценю чистоту и личные границы.', match: 89, city: 'Москва' },
  { id: 'demo-5', name: 'Лена', age: 23, budget: 35000, district: 'ЗАО', metro: 'м. Проспект Вернадского', minutes: 10, date: '1 октября', image: 'photo-1517841905240-472988babdf9', tags: ['Не курю', 'Сова', 'Люблю готовить'], about: 'Музыка, кино и хороший кофе — мои маленькие радости.', match: 87, city: 'Москва' },
  { id: 'demo-6', name: 'Никита', age: 25, budget: 40000, district: 'СВАО', metro: 'м. Алексеевская', minutes: 6, date: '15 октября', image: 'photo-1507003211169-0a1dd7228f2d', tags: ['Не курю', 'Спорт', 'Без животных'], about: 'Работаю удалённо, люблю бег и путешествия.', match: 84, city: 'Москва' },
]
const listingPhotos = ['photo-1600210492486-724fe5c67fb0', 'photo-1600607687939-ce8a6c25118c', 'photo-1600566753086-00f18fb6b3ea']
// Принимает либо id фотографии Unsplash, либо готовый абсолютный/относительный URL.
const photoUrl = (id: string, width = 720) => id.startsWith('http') || id.startsWith('/') ? id : `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    coffee: 'M17 9h1.5a2.5 2.5 0 0 1 0 5H17M3 9h14v6a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4zM6 3v2m3-2v2m3-2v2',
    users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm13 10v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    volume: 'M11 5 6 9H2v6h4l5 4zM15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14',
    scan: 'M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3',
    heart: 'M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z', pin: 'M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z M12 10a2.5 2.5 0 1 0 0-.01', calendar: 'M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Z M8 14h3v3H8z', clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z M12 6v6l4 2', filter: 'M4 7h16M7 12h10m-7 5h4 M8 5v4m8 1v4m-4 2v4', search: 'm21 21-4.3-4.3M19 10.5a8.5 8.5 0 1 1-17 0 8.5 8.5 0 0 1 17 0Z', user: 'M20 21a8 8 0 0 0-16 0m8-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', message: 'M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z', bell: 'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4', arrow: 'M5 12h14m-7-7 7 7-7 7', back: 'm15 18-6-6 6-6M9 12h12', close: 'M18 6 6 18M6 6l12 12', check: 'm5 12 4 4L19 6', plus: 'M12 5v14m-7-7h14', wallet: 'M3 6.5A2.5 2.5 0 0 1 5.5 4H20v16H5.5A2.5 2.5 0 0 1 3 17.5zM3 8h17m-4 5h1', star: 'm12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9z', image: 'M4 4h16v16H4z m4 5h.01M20 15l-5-5L5 20', send: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13', more: 'M5 12h.01M12 12h.01M19 12h.01', home: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-6v-7h-4v7H4a1 1 0 0 1-1-1z', sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42', moon: 'M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z', paw: 'M8 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm8 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-11 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm14 0a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-7-2c-3 0-5 4-4 6 1 2 3 0 4 0s3 2 4 0c1-2-1-6-4-6Z',
  }
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.star} /></svg>
}

function routeFor(hash: string): Route {
  const routes: Record<string, Route> = { '': 'home', home: 'home', auth: 'auth', login: 'auth', register: 'auth', browse: 'browse', person: 'person', questionnaire: 'questionnaire', messages: 'messages', listings: 'listings', publish: 'publish', profile: 'profile', matches: 'matches', notifications: 'notifications', review: 'review' }
  return routes[hash.replace(/^#\/?/, '').split('/')[0]] ?? 'home'
}

const PRIVATE_ROUTES: Route[] = ['browse', 'person', 'questionnaire', 'messages', 'listings', 'publish', 'profile', 'matches', 'notifications', 'review']

function App() {
  const { ready, signedIn, user, profile, logout, setProfile } = useAuth()
  const [route, setRoute] = useState<Route>(() => routeFor(window.location.hash))
  const [selected, setSelected] = useState<Person | null>(null)
  const [liked, setLiked] = useState<string[]>([])
  const [toast, setToast] = useState('')
  const [info, setInfo] = useState<InfoKind | null>(null)
  const [candidates, setCandidates] = useState<Person[]>([])
  const [matches, setMatches] = useState<Person[]>([])
  const [chatItems, setChatItems] = useState<ChatItem[]>([])
  const [notifications, setNotifications] = useState<NotificationView[]>([])
  const [listings, setListings] = useState<Listing[]>([])
  const [interested, setInterested] = useState<Person[]>([])
  const go = useCallback((to: string) => { window.location.hash = `/${to}` }, [])
  const notify = useCallback((text: string) => { setToast(text); window.setTimeout(() => setToast(''), 2800) }, [])
  useEffect(() => { const sync = () => setRoute(routeFor(window.location.hash)); window.addEventListener('hashchange', sync); return () => window.removeEventListener('hashchange', sync) }, [])
  useEffect(() => { if (ready && !signedIn && PRIVATE_ROUTES.includes(route)) go('auth') }, [ready, signedIn, route, go])
  const reload = useCallback(async () => {
    if (!signedIn) return
    const [c, m, ch, n, l, lr] = await Promise.allSettled([
      api.candidates.list(), api.matches.list(), api.chats.list(), api.notifications.list(), api.announcements.list(), api.likes.received(),
    ])
    if (c.status === 'fulfilled') { setCandidates(c.value.map(candidateToPerson)); setLiked(c.value.filter(item => item.liked).map(item => item.profile.user_id)) }
    if (m.status === 'fulfilled') setMatches(m.value.map(item => matchToPerson(item.peer, profile)))
    if (ch.status === 'fulfilled') setChatItems(ch.value.map(toChatItem))
    if (n.status === 'fulfilled') setNotifications(n.value.map(toNotificationView))
    if (l.status === 'fulfilled') setListings(l.value.map(toListing))
    if (lr.status === 'fulfilled') setInterested(lr.value.map(item => item.from_profile).filter((item): item is Profile => item !== null).map(toPerson))
  }, [signedIn, profile])
  // Загрузка данных после входа; reload() сам вызывает setState асинхронно (после await).
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void reload() }, [reload])
  const toggleLike = async (id: string) => {
    try {
      if (liked.includes(id)) { await api.likes.unlike(id); setLiked(current => current.filter(item => item !== id)) }
      else {
        const result = await api.likes.like(id)
        setLiked(current => [...current, id])
        if (result.matched) { notify('Взаимный интерес! Чат создан'); void reload() } else notify('Отметка сохранена')
      }
    } catch (error) { notify(errorText(error)) }
  }
  const openPerson = (person: Person) => { setSelected(person); go('person'); void api.profiles.registerView(person.id).catch(() => undefined) }
  const markChatRead = useCallback((chatId: string) => setChatItems(current => current.map(chat => chat.id === chatId ? { ...chat, unread: 0 } : chat)), [])
  const handleLogout = () => { logout(); go('') }
  if (!ready) return <div className="app-frame"><main className="page-content"><EmptyState title="Загрузка" text="Проверяем вход в аккаунт…" action="Обновить" onClick={() => window.location.reload()} /></main></div>
  if (route === 'home') return <><Landing go={go} onInfo={setInfo} />{info && <InfoModal kind={info} onClose={() => setInfo(null)} />}</>
  if (route === 'auth') return <Auth go={go} onDone={() => go('browse')} />
  const accountName = profile ? `${profile.first_name} ${profile.last_name}`.trim() : user?.email ?? ''
  return <div className="app-frame"><AppHeader go={go} route={route} signedIn={signedIn} name={accountName} avatar={profilePhoto(profile)} unread={notifications.length} onLogout={handleLogout} /><main className="page-content">
    {route === 'browse' && <Browse people={candidates} interested={interested} liked={liked} onLike={toggleLike} onOpen={openPerson} go={go} />}
    {route === 'person' && selected && <PersonPage person={selected} liked={liked.includes(selected.id)} onLike={() => toggleLike(selected.id)} go={go} />}
    {route === 'questionnaire' && <Questionnaire profile={profile} go={go} notify={notify} onSaved={setProfile} />}
    {route === 'messages' && <Messages chats={chatItems} userId={user?.id ?? ''} go={go} notify={notify} onRead={markChatRead} />}
    {route === 'listings' && <Listings homes={listings} go={go} notify={notify} />}
    {route === 'publish' && <Publish go={go} notify={notify} onPublished={reload} />}
    {route === 'profile' && <MyProfile go={go} notify={notify} onLogout={handleLogout} />}
    {route === 'matches' && <Matches people={matches} selfImage={profilePhoto(profile)} go={go} onOpen={openPerson} />}
    {route === 'notifications' && <Notifications items={notifications} go={go} onReadAll={() => void api.notifications.readAll().then(reload)} />}
    {route === 'review' && <Review person={selected} go={go} notify={notify} />}
  </main>{toast && <div className="toast"><Icon name="check" size={17} />{toast}</div>}</div>
}

function Brand({ go, light = false }: { go: (to: string) => void; light?: boolean }) { return <button className={`brand ${light ? 'brand-light' : ''}`} onClick={() => go('')}>КакДостатьСоседа</button> }
function AppHeader({ go, route, signedIn, name, avatar, unread, onLogout }: { go: (to: string) => void; route: Route; signedIn: boolean; name: string; avatar: string; unread: number; onLogout: () => void }) {
  return <header className="app-header"><Brand go={go} /><nav className="main-nav">{[{ label: 'Найти соседа', to: 'browse' }, { label: 'Объявления', to: 'listings' }, { label: 'Сообщения', to: 'messages' }].map(item => <button key={item.to} className={route === item.to ? 'nav-link active' : 'nav-link'} onClick={() => go(item.to)}>{item.label}</button>)}</nav><div className="header-actions"><button className="icon-button bell-button" aria-label="Уведомления" onClick={() => go('notifications')}><Icon name="bell" />{unread > 0 && <i />}</button><button className="account-button" onClick={() => go('profile')}><img src={avatar} alt="" /><span>{signedIn ? (name || 'Профиль') : 'Войти'}</span></button>{signedIn && <button className="text-button" onClick={onLogout}>Выйти</button>}</div></header>
}

function useReferenceLayout() {
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia('(min-width: 721px)').matches)
  useEffect(() => {
    const viewport = window.matchMedia('(min-width: 721px)')
    const updateLayout = (event: MediaQueryListEvent) => setIsDesktop(event.matches)
    viewport.addEventListener('change', updateLayout)
    return () => viewport.removeEventListener('change', updateLayout)
  }, [])
  return isDesktop
}

/* Координаты блоков заданы в пикселях макета 1440 x 2913: 1 единица = 1 px при ширине макета. */
const at = (x: number, y: number, w: number, h: number): CSSProperties => ({ left: `calc(${x} * var(--u))`, top: `calc(${y} * var(--u))`, width: `calc(${w} * var(--u))`, height: `calc(${h} * var(--u))` })

const interiorPhotos = ['photo-1600210492486-724fe5c67fb0', 'photo-1600607687939-ce8a6c25118c', 'photo-1600566753086-00f18fb6b3ea', 'photo-1497366754035-f200968a6e72']

type ValueCriterion = { label: string; icon: string; image: string; bullets: string[]; w: number }
const valueCriteria: ValueCriterion[] = [
  { label: 'Бюджет', icon: 'wallet', image: interiorPhotos[0], bullets: ['Спокойная атмосфера', 'Можно с животными', 'Без вечеринок'], w: 213 },
  { label: 'Район и метро', icon: 'pin', image: interiorPhotos[1], bullets: ['Рядом метро', 'До 15 минут пешком', 'Один район'], w: 252 },
  { label: 'Режим дня', icon: 'moon', image: interiorPhotos[2], bullets: ['Совпадает график', 'Не мешаем спать', 'Тихие вечера'], w: 227 },
  { label: 'Привычки', icon: 'coffee', image: interiorPhotos[3], bullets: ['Общие привычки', 'Чистота и порядок', 'Уважаем границы'], w: 203 },
  { label: 'Животные', icon: 'paw', image: interiorPhotos[0], bullets: ['Можно с кошкой', 'Можно с собакой', 'Без аллергии'], w: 217 },
  { label: 'Отношение к шуму', icon: 'volume', image: interiorPhotos[1], bullets: ['Тихие вечера', 'Без шумного ремонта', 'Наушники ночью'], w: 291 },
  { label: 'Гости', icon: 'users', image: interiorPhotos[2], bullets: ['Редко гости', 'Предупреждаем заранее', 'Без вечеринок'], w: 200 },
  { label: 'Интересы', icon: 'star', image: interiorPhotos[3], bullets: ['Общие хобби', 'Спорт и прогулки', 'Кино и музыка'], w: 211 },
]

type LandingListing = { title: string; price: string; metro: string; rooms: string; area: string; free: string; photo: string }
const listings: LandingListing[] = [
  { title: 'Комната в 2-комнатной квартире', price: '25 000 ₽ / месяц', metro: 'м. Тульская · 7 минут', rooms: '2 комнаты', area: '54 м²', free: 'Свободна с 15 октября', photo: interiorPhotos[0] },
  { title: 'Комната в 3-комнатной квартире', price: '30 000 ₽ / месяц', metro: 'м. Курская · 5 минут', rooms: '3 комнаты', area: '72 м²', free: 'Свободна с 1 ноября', photo: interiorPhotos[1] },
  { title: 'Студия рядом с метро', price: '38 000 ₽ / месяц', metro: 'м. Таганская · 4 минуты', rooms: '1 комната', area: '32 м²', free: 'Свободна с 20 октября', photo: interiorPhotos[2] },
  { title: 'Комната в 2-комнатной квартире', price: '22 000 ₽ / месяц', metro: 'м. Нагатинская · 9 минут', rooms: '2 комнаты', area: '48 м²', free: 'Свободна с 5 ноября', photo: interiorPhotos[3] },
]

const howSteps = [
  { n: '01', icon: 'user', title: 'Заполни анкету', desc: 'Расскажи о себе и укажи условия будущей аренды.' },
  { n: '02', icon: 'search', title: 'Найди подходящего соседа', desc: 'Используй фильтры и смотри анкеты других пользователей.' },
  { n: '03', icon: 'heart', title: 'Получите совпадение', desc: 'Если интерес взаимный — открывается чат, где можно всё обсудить.' },
]

type InfoKind = 'faq' | 'rules' | 'contacts'
const infoContent: Record<InfoKind, { eyebrow: string; title: string; lead: string; items: { title: string; text: string }[] }> = {
  faq: {
    eyebrow: 'Частые вопросы',
    title: 'FAQ',
    lead: 'Коротко о том, как работает сервис «КакДостатьСоседа».',
    items: [
      { title: 'Как работает подбор соседа?', text: 'Вы заполняете анкету: бюджет, район, метро, режим дня и бытовые привычки. Сервис сравнивает ответы и показывает анкеты людей, с которыми совпадений больше всего.' },
      { title: 'Сколько стоит сервис?', text: 'Поиск соседа и просмотр анкет — бесплатно. Платные опции нужны только для продвижения объявления о свободной комнате.' },
      { title: 'Как проверяются пользователи?', text: 'Мы просим подтверждать почту и телефон, а также вручную проверяем жалобы. Анкеты с недостоверными данными скрываются модерацией.' },
      { title: 'Как учитываются животные?', text: 'В анкете есть отдельный блок про кошек, собак и аллергию. Отметьте свои условия — поиск сразу учтёт их при подборе.' },
      { title: 'Что делать при конфликте?', text: 'Напишите в поддержку через раздел «Контакты». Мы поможем решить спор, а при нарушении правил ограничим доступ нарушителя.' },
    ],
  },
  rules: {
    eyebrow: 'Правила сервиса',
    title: 'Правила',
    lead: 'Несколько простых правил, чтобы поиск соседа был безопасным и спокойным.',
    items: [
      { title: 'Общайтесь уважительно', text: 'Оскорбления, дискриминация и давление запрещены. Грубые сообщения можно отправить на проверку модерации.' },
      { title: 'Указывайте достоверные данные', text: 'Возраст, бюджет и условия аренды должны соответствовать реальности. Недостоверные анкеты скрываются.' },
      { title: 'Только реальные фото', text: 'Загружайте свои фотографии. Чужие изображения и стоковые снимки запрещены.' },
      { title: 'Не публикуйте чужие контакты', text: 'Переписка и обмен контактами — только по обоюдному согласию участников.' },
      { title: 'Без мошенничества', text: 'Запрещено просить предоплату до просмотра квартиры, переводить деньги «за бронь» или использовать сервис для рекламы.' },
      { title: 'Модерация и блокировка', text: 'За нарушение правил мы ограничиваем доступ и удаляем объявления. Пользователи могут пожаловаться на анкету в один клик.' },
    ],
  },
  contacts: {
    eyebrow: 'Связь с сервисом',
    title: 'Контакты',
    lead: 'Поддержка отвечает в рабочее время и помогает с поиском, объявлениями и жалобами.',
    items: [
      { title: 'Почта поддержки', text: 'support@kakdostat-soseda.ru — для вопросов по анкете, объявлениям и оплате.' },
      { title: 'Телефон', text: '8 800 000-00-00 — звонок по России бесплатный, ежедневно с 10:00 до 20:00 (МСК).' },
      { title: 'Telegram', text: '@kds_support — самый быстрый канал связи, отвечаем в течение рабочего дня.' },
      { title: 'Для партнёров', text: 'partners@kakdostat-soseda.ru — предложения по агентствам и сервисам аренды.' },
      { title: 'Реквизиты', text: 'ООО «КакДостатьСоседа», Москва, ул. Тульская, 15, офис 4. ИНН 7700000000.' },
    ],
  },
}

function InfoModal({ kind, onClose }: { kind: InfoKind; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = '' }
  }, [onClose])
  const data = infoContent[kind]
  return <div className="info-overlay" onClick={onClose}>
    <section className="info-modal" role="dialog" aria-modal="true" aria-labelledby="info-title" onClick={event => event.stopPropagation()}>
      <header className="info-head">
        <span className="eyebrow">{data.eyebrow}</span>
        <h2 id="info-title">{data.title}</h2>
        <button className="info-close" type="button" onClick={onClose} aria-label="Закрыть окно">✕</button>
      </header>
      <p className="info-lead">{data.lead}</p>
      <div className="info-list">
        {data.items.map(item => <article key={item.title}><b>{item.title}</b><p>{item.text}</p></article>)}
      </div>
      <div className="info-actions"><button className="button button-lime" type="button" onClick={onClose}>Понятно</button></div>
    </section>
  </div>
}
function LandingDesktop({ go, onInfo }: { go: (to: string) => void; onInfo: (kind: InfoKind) => void }) {
  const [activeValue, setActiveValue] = useState(0)
  const [slide, setSlide] = useState(0)
  const criterion = valueCriteria[activeValue]
  const listing = listings[slide]
  return <div className="lp">
    <div className="lp-canvas">
      <header className="lp-head">
        <button className="lp-brand" type="button" onClick={() => go('')}>КакДостатьСоседа</button>
        <nav className="lp-nav" aria-label="Основная навигация">
          <button type="button" onClick={() => go('browse')}>Найти соседа</button>
          <button type="button" onClick={() => go('listings')}>Есть жильё</button>
          <a href="#how">Как это работает</a>
        </nav>
        <div className="lp-head-actions">
          <button className="lp-login" type="button" onClick={() => go('auth')}>Войти</button>
          <button className="lp-register" type="button" onClick={() => go('register')}>Регистрация</button>
        </div>
      </header>

      <section className="lp-hero">
        <div className="lp-hero-copy">
          <span className="lp-eyebrow">Сервис совместной аренды</span>
          <h1>Найди соседа,<br />с которым<br /><mark>комфортно жить.</mark></h1>
          <p>Подбирай людей по бюджету, району, привычкам<br />и образу жизни — а потом ищите жильё вместе.</p>
          <div className="lp-actions">
            <button className="lp-btn lp-btn-lime" type="button" onClick={() => go('browse')}>Найти соседа <Icon name="arrow" /></button>
            <button className="lp-btn lp-btn-outline" type="button" onClick={() => go('publish')}>У меня уже есть жильё</button>
          </div>
          <div className="lp-social">
            <div className="avatar-stack">{people.slice(0, 4).map(person => <img key={person.id} src={photoUrl(person.image, 80)} alt="" />)}</div>
            <span>Уже <b>более 5 000 человек</b><br />нашли своих соседей</span>
          </div>
        </div>
        <div className="lp-hero-people">
          <span className="lp-hand">Разные люди<br />одна цель ↘</span>
          {people.slice(0, 2).map((person, index) => <article className={`lp-person lp-person-${index + 1}`} key={person.id}>
            <img src={photoUrl(person.image, 640)} alt={person.name} />
            <button className="lp-heart" type="button" onClick={() => go('browse')} aria-label="Добавить в избранное"><Icon name="heart" /></button>
            <div className="lp-person-info">
              <b>{person.name}, {person.age}</b>
              <span>Ищет соседа</span>
              <span>До {person.budget.toLocaleString('ru-RU')} ₽</span>
              <small><Icon name="pin" size={14} /> {person.district} · {person.metro}</small>
              <div className="tag-row">{person.tags.slice(0, 2).map(tag => <span className="tag" key={tag}>{tag}</span>)}</div>
            </div>
          </article>)}
        </div>
      </section>

      <section id="how" className="lp-how">
        <h2>Как это работает?</h2>
        <div className="lp-steps">
          {howSteps.map(step => <article className="lp-step" key={step.n}>
            <div className="lp-step-top"><Icon name={step.icon} size={22} /></div>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
            <span className="lp-step-num">{step.n}</span>
          </article>)}
        </div>
      </section>

      <section className="lp-values">
        <div className="lp-values-copy">
          <h2>Важно не только,<br />сколько вы готовы платить.</h2>
          <p>Найди человека, с которым совпадают не только<br />бюджет и район, но и бытовые привычки.</p>
          <div className="lp-chips">
            {valueCriteria.map((item, index) => <button key={item.label} type="button" className={`lp-chip${index === activeValue ? ' is-active' : ''}`} style={{ minWidth: `calc(${item.w} * var(--u))` }} onClick={() => setActiveValue(index)} aria-pressed={index === activeValue}><Icon name={item.icon} />{item.label}</button>)}
          </div>
        </div>
        {/* Геометрия фото и карточки задана в CSS (.lp-values-photo, .lp-values-card) от верха секции. */}
        <figure className="lp-values-photo"><img src={photoUrl(criterion.image, 640)} alt="" /></figure>
        <div className="lp-values-card">
          <ul>{criterion.bullets.map(bullet => <li key={bullet}><span className="lp-check"><Icon name="check" /></span>{bullet}</li>)}</ul>
        </div>
      </section>

      <section className="lp-promo">
        <div className="lp-promo-copy">
          <h2>Уже есть квартира?<br />Найди человека<br />на свободную комнату.</h2>
          <p>Размести объявление, расскажи о жилье<br />и найди подходящего соседа.</p>
          <button className="lp-btn lp-btn-lime" type="button" onClick={() => go('publish')}>Разместить объявление <Icon name="arrow" /></button>
        </div>
        <img className="lp-promo-photo" src={photoUrl(listing.photo, 1100)} alt="Квартира для аренды" />
        <div className="lp-badge">{listing.free}</div>
        <div className="lp-listing">
          <b>{listing.title}</b>
          <strong>{listing.price}</strong>
          <span className="lp-listing-row"><Icon name="pin" />{listing.metro}</span>
          <div className="lp-listing-row lp-listing-meta"><span><Icon name="image" />{listing.rooms}</span><span><Icon name="scan" />{listing.area}</span></div>
        </div>
        <button className="lp-arrow lp-arrow-back" type="button" onClick={() => setSlide((slide + listings.length - 1) % listings.length)} aria-label="Предыдущее объявление"><Icon name="back" /></button>
        <button className="lp-arrow lp-arrow-next" type="button" onClick={() => setSlide((slide + 1) % listings.length)} aria-label="Следующее объявление"><Icon name="arrow" /></button>
        <div className="lp-dots" style={at(690, 425, 76, 13)}>
          {listings.map((item, index) => <button key={item.title} type="button" className={`lp-dot${index === slide ? ' is-active' : ''}`} onClick={() => setSlide(index)} aria-label={`Объявление ${index + 1}`} />)}
        </div>
      </section>

      <section className="lp-cta">
        <img className="lp-cta-photo" src={photoUrl('photo-1497366754035-f200968a6e72', 760)} alt="Уютная квартира" />
        <div className="lp-cta-copy">
          <h2>Ну что,<br />ищем соседа?</h2>
          <p>Создай анкету и посмотри, кто ищет жильё вместе с тобой.</p>
          <button className="lp-btn lp-btn-lime" type="button" onClick={() => go('browse')}>Начать поиск <Icon name="arrow" /></button>
        </div>
      </section>

      <footer className="lp-footer">
        <div className="lp-footer-brand">
          <button className="lp-brand lp-brand-light" type="button" onClick={() => go('')}>КакДостатьСоседа</button>
          <p>Сервис поиска соседа для совместной аренды жилья.</p>
          <small>© 2026 КакДостатьСоседа</small>
        </div>
        <div className="lp-footer-col">
          <b>Сервис</b>
          <button type="button" onClick={() => go('browse')}>Найти соседа</button>
          <button type="button" onClick={() => go('listings')}>Есть жильё</button>
          <a href="#how">Как это работает</a>
        </div>
        <div className="lp-footer-col">
          <b>Помощь</b>
          <button type="button" onClick={() => onInfo('faq')}>FAQ</button>
          <button type="button" onClick={() => onInfo('rules')}>Правила</button>
          <button type="button" onClick={() => onInfo('contacts')}>Контакты</button>
        </div>
      </footer>
    </div>
  </div>
}

function Landing({ go, onInfo }: { go: (to: string) => void; onInfo: (kind: InfoKind) => void }) {
  const isDesktop = useReferenceLayout()
  if (isDesktop) return <LandingDesktop go={go} onInfo={onInfo} />
  return <div className="landing landing-responsive"><header className="landing-header"><Brand go={go} /><nav><button onClick={() => go('browse')}>Найти соседа</button><button onClick={() => go('listings')}>Есть жильё</button><a href="#how">Как это работает</a></nav><div><button className="text-button" onClick={() => go('auth')}>Войти</button><button className="button button-lime small" onClick={() => go('register')}>Регистрация</button></div></header>
      <section className="hero-section"><div className="hero-copy"><span className="eyebrow">Сервис совместной аренды</span><h1>Найди соседа,<br />с которым<br /><mark>комфортно жить.</mark></h1><p>Подбирай людей по бюджету, району, привычкам<br className="desktop-only" /> и образу жизни — а потом ищите жильё вместе.</p><div className="button-row"><button className="button button-lime" onClick={() => go('browse')}>Найти соседа <Icon name="arrow" /></button><button className="button button-outline" onClick={() => go('publish')}>У меня уже есть жильё</button></div><div className="social-proof"><div className="avatar-stack">{people.slice(0, 4).map(person => <img key={person.id} src={photoUrl(person.image, 80)} alt="" />)}</div><span>Уже <b>более 5 000 человек</b><br />нашли своих соседей</span></div></div><div className="hero-people"><span className="hand-note">Разные люди<br />одна цель ↘</span>{people.slice(0, 2).map((person, index) => <article className={`mini-person mini-person-${index + 1}`} key={person.id}><img src={photoUrl(person.image, 520)} alt={person.name} /><button className="float-heart" onClick={() => go('browse')}><Icon name="heart" /></button><div className="mini-person-info"><b>{person.name}, {person.age}</b><span>Ищет соседа</span><span>До {person.budget.toLocaleString('ru-RU')} ₽</span><small><Icon name="pin" size={14} /> {person.district} · {person.metro}</small><div className="tag-row">{person.tags.slice(0, 2).map(tag => <span className="tag" key={tag}>{tag}</span>)}</div></div></article>)}</div></section>
      <section id="how" className="how-section"><h2>Как это работает?</h2><div className="steps-grid">{[{ n: '01', icon: 'user', title: 'Заполни анкету', desc: 'Расскажи о себе и укажи условия будущей аренды.' }, { n: '02', icon: 'search', title: 'Найди подходящего соседа', desc: 'Используй фильтры и смотри анкеты других пользователей.' }, { n: '03', icon: 'heart', title: 'Получите совпадение', desc: 'Если интерес взаимный — открывается чат, где можно всё обсудить.' }].map(step => <article className="step-card" key={step.n}><div className="step-top"><span>{step.n}</span><Icon name={step.icon} size={25} /></div><h3>{step.title}</h3><p>{step.desc}</p></article>)}</div></section>
      <section className="values-section"><div><h2>Важно не только,<br />сколько вы готовы платить.</h2><p>Найди человека, с которым совпадают не только<br />бюджет и район, но и бытовые привычки.</p><div className="value-chips">{[['wallet', 'Бюджет'], ['pin', 'Район и метро'], ['moon', 'Режим дня'], ['paw', 'Животные'], ['message', 'Отношение к шуму'], ['user', 'Гости'], ['star', 'Интересы']].map(([icon, text]) => <span className="value-chip" key={text}><Icon name={icon} size={19} />{text}</span>)}</div></div><img className="values-photo" src={photoUrl(listingPhotos[0], 700)} alt="Уютная квартира" /></section>
      <section className="housing-promo"><div><h2>Уже есть квартира?<br />Найди человека<br />на свободную комнату.</h2><p>Размести объявление, расскажи о жилье<br />и найди подходящего соседа.</p><button className="button button-lime" onClick={() => go('publish')}>Разместить объявление <Icon name="arrow" /></button></div><div className="promo-home"><img src={photoUrl(listingPhotos[0], 700)} alt="Квартира для аренды" /><div className="listing-float"><b>Комната в 2-комнатной квартире</b><strong>25 000 ₽ / месяц</strong><span>м. Тульская · 7 минут</span></div></div></section>
      <section className="last-cta"><img src={photoUrl('photo-1497366754035-f200968a6e72', 600)} alt="Уютный дом" /><div><h2>Ну что,<br />ищем соседа?</h2><p>Создай анкету и посмотри, кто ищет жильё вместе с тобой.</p><button className="button button-lime" onClick={() => go('browse')}>Начать поиск <Icon name="arrow" /></button></div></section>
      <footer className="landing-footer"><div><Brand go={go} light /><p>Сервис поиска соседа для совместной аренды жилья.</p><small>© 2026 КакДостатьСоседа</small></div><div><b>Сервис</b><button onClick={() => go('browse')}>Найти соседа</button><button onClick={() => go('listings')}>Есть жильё</button><a href="#how">Как это работает</a></div><div><b>Помощь</b><button onClick={() => onInfo('faq')}>FAQ</button><button onClick={() => onInfo('rules')}>Правила</button><button onClick={() => onInfo('contacts')}>Контакты</button></div></footer>
    </div>
}


function Auth({ go, onDone }: { go: (to: string) => void; onDone: () => void }) {
  const { login, register } = useAuth()
  const [isRegister, setIsRegister] = useState(() => window.location.hash.includes('register'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (isRegister) await register(email, password)
      else await login(email, password)
      onDone()
    } catch (err) {
      setError(errorText(err))
    } finally {
      setBusy(false)
    }
  }
  return <div className="auth-page"><div className="auth-brand"><Brand go={go} /><div className="auth-intro"><h1>Хороший сосед<br />начинается<br />со знакомства.</h1><p>Создай аккаунт, заполни анкету и найди человека,<br />с которым будет комфортно снимать жильё.</p><div className="auth-portraits">{people.slice(0, 2).map(person => <article key={person.id}><img src={photoUrl(person.image, 450)} alt={person.name} /><span>{person.name}, {person.age}</span><small>{person.district} · до {person.budget.toLocaleString('ru-RU')} ₽</small></article>)}</div><div className="auth-steps"><span>♙ Регистрация <b>→</b></span><span>▤ Заполняешь анкету <b>→</b></span><span>♡ Находишь соседа</span></div></div></div><section className="auth-card"><h2>{isRegister ? 'Создать аккаунт' : 'С возвращением!'}</h2><p className="auth-switch">{isRegister ? 'Уже зарегистрированы?' : 'Ещё нет аккаунта?'} <button onClick={() => { setIsRegister(!isRegister); setError('') }}>{isRegister ? 'Войти' : 'Регистрация'}</button></p><form onSubmit={submit}><label>Email<input required type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" /></label><label>Пароль<input required type="password" minLength={6} value={password} onChange={event => setPassword(event.target.value)} placeholder="••••••••••" /></label>{error && <p className="auth-error">{error}</p>}<button className="button button-lime auth-submit" type="submit" disabled={busy}>{busy ? 'Подождите…' : isRegister ? 'Зарегистрироваться' : 'Войти'} <Icon name="arrow" /></button></form><div className="auth-note"><span>▤</span><div><b>Дальше — анкета</b><p>Расскажем о тебе и о том, какого соседа ты ищешь.</p></div></div></section></div>
}

function Browse({ people, interested, liked, onLike, onOpen, go }: { people: Person[]; interested: Person[]; liked: string[]; onLike: (id: string) => void; onOpen: (person: Person) => void; go: (to: string) => void }) {
  const [query, setQuery] = useState(''); const [maxBudget, setMaxBudget] = useState(''); const [district, setDistrict] = useState(''); const [showFilters, setShowFilters] = useState(false); const [sort, setSort] = useState('Совпадению')
  const filtered = useMemo(() => people.filter(person => person.name.toLowerCase().includes(query.toLowerCase()) && (!maxBudget || person.budget <= Number(maxBudget)) && (!district || person.district === district)).sort((a, b) => sort === 'Бюджету' ? a.budget - b.budget : b.match - a.match), [people, query, maxBudget, district, sort])
  return <><div className="page-heading browse-heading"><div><h1>Найди своего соседа</h1><p>Настрой фильтры и посмотри, кто тоже сейчас ищет жильё.</p></div>{interested.length > 0 && <button className="interest-banner" onClick={() => go('matches')}><div className="avatar-stack">{interested.slice(0, 3).map(person => <img key={person.id} src={photoUrl(person.image, 70)} alt="" />)}</div><span><b>{interested.length === 1 ? 'Вами заинтересовался 1 человек' : `Вами заинтересовались ${interested.length} ${pluralizeCount(interested.length, 'человек', 'человека', 'человек')}`}</b><small>Посмотреть, кто это <Icon name="arrow" size={14} /></small></span></button>}</div>
    <div className="filters-row"><label className="filter-control"><Icon name="pin" /><select value={district} onChange={event => setDistrict(event.target.value)}><option value="">Район и метро</option>{[...new Set(people.map(person => person.district))].map(item => <option key={item}>{item}</option>)}</select></label><label className="filter-control lime-filter"><Icon name="wallet" /><select value={maxBudget} onChange={event => setMaxBudget(event.target.value)}><option value="">Бюджет</option><option value="30000">до 30 000 ₽</option><option value="35000">до 35 000 ₽</option><option value="40000">до 40 000 ₽</option></select></label><label className="filter-control"><Icon name="user" /><select><option>Возраст</option><option>18–25 лет</option></select></label><label className="filter-control"><Icon name="calendar" /><select><option>Дата заселения</option><option>В ближайший месяц</option></select></label><label className="filter-control"><Icon name="clock" /><select><option>Срок аренды</option><option>От года</option></select></label><button className={`filter-control filter-button ${showFilters ? 'selected' : ''}`} onClick={() => setShowFilters(!showFilters)}><Icon name="filter" /> Все фильтры</button></div>
    {showFilters && <div className="advanced-filters"><label>Поиск по имени<input value={query} onChange={event => setQuery(event.target.value)} placeholder="Например, Аня" /></label><label>Отношение к курению<select><option>Не важно</option><option>Не курит</option></select></label><label>Домашние животные<select><option>Не важно</option><option>Есть животные</option></select></label><label>Режим дня<select><option>Любой режим</option><option>Жаворонок</option><option>Сова</option></select></label></div>}
    <div className="results-line"><div className="active-filters">{maxBudget && <button onClick={() => setMaxBudget('')}>До {Number(maxBudget).toLocaleString('ru-RU')} ₽ <Icon name="close" size={13} /></button>}{district && <button onClick={() => setDistrict('')}>{district} <Icon name="close" size={13} /></button>}{(maxBudget || district || query) && <button className="reset-link" onClick={() => { setMaxBudget(''); setDistrict(''); setQuery('') }}>Сбросить всё</button>}</div><div>{filtered.length} анкеты <select className="sort-select" value={sort} onChange={event => setSort(event.target.value)}><option>Совпадению</option><option>Бюджету</option></select></div></div>
    {filtered.length ? <div className="people-grid">{filtered.map(person => <PersonCard key={person.id} person={person} liked={liked.includes(person.id)} onLike={() => onLike(person.id)} onOpen={() => onOpen(person)} />)}</div> : <EmptyState title="Никого не нашли" text="Попробуй изменить фильтры — так появится больше подходящих анкет." action="Сбросить фильтры" onClick={() => { setMaxBudget(''); setDistrict(''); setQuery('') }} />}
    <div className="browse-foot"><button className="button button-outline" onClick={() => go('questionnaire')}>Заполнить свою анкету <Icon name="arrow" /></button></div></>
}
function PersonCard({ person, liked, onLike, onOpen }: { person: Person; liked: boolean; onLike: () => void; onOpen: () => void }) { return <article className="person-card"><div className="person-photo"><img src={photoUrl(person.image)} alt={person.name} /><span className="status-pill">Ищет соседа</span><button aria-label="Мне подходит" className={`heart-button ${liked ? 'is-liked' : ''}`} onClick={onLike}><Icon name="heart" /></button></div><div className="person-card-body"><h3>{person.name}, {person.age}</h3><b className="person-budget">до {person.budget.toLocaleString('ru-RU')} ₽ <small>/ мес.</small></b><p><Icon name="pin" size={16} /> {person.district} · {person.metro} · {person.minutes} минут</p><p><Icon name="calendar" size={16} /> Заселение с {person.date}</p><div className="tag-row">{person.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><div className="card-actions"><button className="button button-outline" onClick={onOpen}>Подробнее</button><button className={`button button-lime ${liked ? 'liked-state' : ''}`} onClick={onLike}>{liked ? <><Icon name="check" /> Вы отметили анкету</> : <>Мне подходит <Icon name="heart" /></>}</button></div></div></article> }

function PersonPage({ person, liked, onLike, go }: { person: Person; liked: boolean; onLike: () => void; go: (to: string) => void }) {
  return <><button className="back-link" onClick={() => go('browse')}><Icon name="back" size={18} /> Назад к поиску</button><div className="person-detail-top"><div className="gallery"><div className="gallery-main"><img src={photoUrl(person.image, 950)} alt={person.name} /></div></div><section className="detail-summary"><span className="status-pill">Ищет соседа</span><h1>{person.name}, {person.age}</h1><p><Icon name="pin" /> Москва</p><h2>до {person.budget.toLocaleString('ru-RU')} ₽ <small>/ мес.</small></h2><p><Icon name="pin" /> {person.district} · {person.metro}, Шаболовская</p><p><Icon name="calendar" /> Хочет заселиться с {person.date}</p><p><Icon name="clock" /> Ищет жильё на длительный срок</p><div className="tag-row">{person.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}<span className="tag">Люблю готовить</span></div><button className={`button button-lime full-button ${liked ? 'liked-state' : ''}`} onClick={onLike}>{liked ? 'Вы отметили анкету' : 'Мне подходит'} <Icon name={liked ? 'check' : 'heart'} /></button></section></div><div className="detail-columns"><div><section className="content-card"><h2>О себе</h2><p>{person.about}</p></section><section className="content-card"><h2>Что ищу</h2><InfoRow icon="wallet" label="Бюджет" value={`до ${person.budget.toLocaleString('ru-RU')} ₽ / мес.`} /><InfoRow icon="pin" label="Районы" value={`${person.district}, ЮАО`} /><InfoRow icon="calendar" label="Дата заселения" value={`с ${person.date}`} /><InfoRow icon="clock" label="Срок аренды" value="от года" /></section></div><div><section className="content-card"><h2>Как я живу</h2><div className="habit-grid">{[['sun', 'Режим дня', 'Жаворонок'], ['close', 'Курение', 'Не курю'], ['paw', 'Животные', 'Есть кот'], ['message', 'Отношение к шуму', 'Предпочитаю тишину'], ['user', 'Гости', 'Иногда'], ['star', 'Чистота', 'Люблю порядок']].map(([icon, label, value]) => <div className="habit-card" key={label}><Icon name={icon} /><small>{label}</small><b>{value}</b></div>)}</div></section><section className="content-card"><h2>Интересы</h2><div className="tag-row">{['Кино', 'Музыка', 'Путешествия', 'Кофе', 'Готовка', 'Фотография'].map(item => <span className="tag lime-tag" key={item}>{item}</span>)}</div></section></div></div><section className="match-cta"><div><h2>Кажется, вам по пути?</h2><p>Если {person.name} тоже отметит вашу анкету, у вас появится общий чат.</p></div><button className="button button-lime" onClick={onLike}>{liked ? 'Вы отметили анкету' : 'Мне подходит'} <Icon name="heart" /></button></section></>
}
function InfoRow({ icon, label, value }: { icon: string; label: string; value: string }) { return <div className="info-row"><Icon name={icon} /><span>{label}</span><b>{value}</b></div> }

const INTEREST_TO_HOBBY: Record<string, string> = { 'Кино': 'films', 'Музыка': 'music', 'Путешествия': 'travel', 'Готовка': 'cooking', 'Спорт': 'sports', 'Книги': 'books', 'Игры': 'gaming', 'Фотография': 'photography', 'Природа': 'walking', 'Искусство': 'arts', 'Настолки': 'table_games' }

function hobbiesFromInterests(interests: string[]): Record<string, boolean> {
  const result: Record<string, boolean> = {}
  for (const key of Object.values(INTEREST_TO_HOBBY)) result[key] = false
  for (const interest of interests) { const key = INTEREST_TO_HOBBY[interest]; if (key) result[key] = true }
  return result
}

// Блоки раздела «Как ты живёшь»: в каждом — только один вариант ответа.
const HABIT_FIELDS: { key: string; title: string; options: string[] }[] = [
  { key: 'sleep', title: 'Режим дня', options: ['Жаворонок', 'Сова', 'Без разницы'] },
  { key: 'smoking', title: 'Курение', options: ['Не курю', 'Курю', 'Без разницы'] },
  { key: 'pets', title: 'Животные', options: ['Есть', 'Нет', 'Не важно'] },
  { key: 'noise', title: 'Отношение к шуму', options: ['Люблю тишину', 'Не против шума', 'Без разницы'] },
  { key: 'guests', title: 'Гости', options: ['Иногда', 'Часто', 'Редко'] },
  { key: 'clean', title: 'Чистота', options: ['Люблю порядок', 'Нормально', 'Без разницы'] },
]

function Questionnaire({ profile, go, notify, onSaved }: { profile: Profile | null; go: (to: string) => void; notify: (text: string) => void; onSaved: (profile: Profile) => void }) {
  const [firstName, setFirstName] = useState(profile?.first_name ?? 'Игорь')
  const [age, setAge] = useState(String(profile?.age ?? 20))
  const [city, setCity] = useState(profile?.city ?? 'Москва')
  const [district, setDistrict] = useState(profile?.district ?? 'ЦАО')
  const [metro, setMetro] = useState(profile?.metro_station ?? 'м. Тульская')
  const [about, setAbout] = useState(profile?.bio ?? 'Учусь и параллельно работаю. Люблю кино, музыку и готовить.')
  const [interests, setInterests] = useState<string[]>(['Кино', 'Музыка', 'Готовка', 'Фотография'])
  const [habits, setHabits] = useState<Record<string, string>>({ sleep: 'Жаворонок', smoking: 'Не курю', pets: 'Есть', noise: 'Люблю тишину', guests: 'Иногда', clean: 'Люблю порядок' })
  const [budgetMax, setBudgetMax] = useState(String(profile?.preferences?.budget_max ?? 35000))
  const [ageMin, setAgeMin] = useState('20')
  const [ageMax, setAgeMax] = useState('30')
  const [busy, setBusy] = useState(false)
  const [photoUrl, setPhotoUrl] = useState(profile?.photo_url ?? '')
  const [uploading, setUploading] = useState(false)
  const toggle = (list: string[], setList: (items: string[]) => void, value: string) => setList(list.includes(value) ? list.filter(item => item !== value) : [...list, value])
  const setHabit = (key: string, value: string) => setHabits(current => ({ ...current, [key]: value }))
  const onPhotoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploading(true)
    try { const result = await api.uploads.image(file); setPhotoUrl(result.url); notify('Фото загружено') }
    catch (error) { notify(errorText(error)) }
    finally { setUploading(false); event.target.value = '' }
  }
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      const payload = {
        first_name: firstName,
        last_name: profile?.last_name ?? '',
        age: Number(age) || 18,
        gender: profile?.gender ?? 'female',
        city,
        district,
        metro_station: metro,
        minutes_to_metro: profile?.minutes_to_metro ?? 5,
        bio: about,
        photo_url: photoUrl || null,
        hobbies: hobbiesFromInterests(interests),
        bad_habits: { smoking: habits.smoking === 'Курю', pets: habits.pets === 'Есть', sleep_mode: habits.sleep === 'Сова' ? 'late' : 'early', noise_preference: habits.noise === 'Не против шума' ? 'loud' : 'quiet', guests: habits.guests === 'Иногда' || habits.guests === 'Часто' },
      }
      const saved = profile ? await api.profiles.update(payload) : await api.profiles.create(payload)
      const preferences: Preferences = {
        age_min: Number(ageMin) || 18,
        age_max: Number(ageMax) || 99,
        gender_preference: 'any',
        budget_max: Number(budgetMax) || 0,
        city_preference: city,
        district_preference: [],
        metro_preference: [],
        smoking_preference: habits.smoking === 'Курю' ? 'yes' : 'no',
        pets_preference: habits.pets === 'Есть' ? 'yes' : 'no',
        guests_preference: 'any',
        sleep_mode_preference: habits.sleep === 'Сова' ? 'late' : 'early',
        noise_preference: habits.noise === 'Не против шума' ? 'loud' : 'quiet',
      }
      await api.profiles.savePreferences(preferences)
      onSaved(saved)
      notify('Анкета сохранена')
    } catch (error) { notify(errorText(error)) }
    finally { setBusy(false) }
  }
  return <form className="questionnaire" onSubmit={submit}><div className="page-heading"><div><h1>Расскажи о себе</h1><p>Чем подробнее анкета, тем проще найти человека с похожими условиями и образом жизни.</p></div></div><section className="form-section"><h2>Основная информация</h2><div className="main-info-form"><div className="photo-upload"><img src={photoUrl ? mediaUrl(photoUrl) : PROFILE_PLACEHOLDER} alt="Ваше фото" /><label className="photo-upload-button" aria-label="Загрузить фото"><Icon name={uploading ? 'scan' : 'plus'} size={18} /><input type="file" accept="image/*" onChange={onPhotoChange} hidden /></label></div><label>Имя<input value={firstName} onChange={event => setFirstName(event.target.value)} /></label><label>Возраст<select value={age} onChange={event => setAge(event.target.value)}>{Array.from({ length: 82 }, (_, i) => <option key={i + 18}>{i + 18}</option>)}</select></label><label>Город<select value={city} onChange={event => setCity(event.target.value)}><option>Москва</option><option>Санкт-Петербург</option></select></label><label>Район<input value={district} onChange={event => setDistrict(event.target.value)} placeholder="ЦАО" /></label><label>Метро<input value={metro} onChange={event => setMetro(event.target.value)} placeholder="м. Тульская" /></label><label className="about-field">О себе<textarea value={about} maxLength={500} onChange={event => setAbout(event.target.value)} /><small>{about.length}/500</small></label></div></section><section className="form-section"><h2>Что ты ищешь</h2><div className="form-grid"><label>Бюджет до, ₽<input type="number" value={budgetMax} onChange={event => setBudgetMax(event.target.value)} /></label><label>Возраст соседа от<input type="number" value={ageMin} onChange={event => setAgeMin(event.target.value)} /></label><label>Возраст соседа до<input type="number" value={ageMax} onChange={event => setAgeMax(event.target.value)} /></label></div></section><section className="form-section"><h2>Как ты живёшь</h2><div className="habits-form-grid">{HABIT_FIELDS.map(field => <fieldset key={field.key}><legend>{field.title}</legend><div>{field.options.map(option => <button type="button" key={option} className={habits[field.key] === option ? 'choice active' : 'choice'} onClick={() => setHabit(field.key, option)}>{option}</button>)}</div></fieldset>)}</div></section><section className="form-section"><h2>Интересы</h2><p className="muted">Выбери, что тебе близко. Это поможет найти более подходящих людей.</p><div className="interest-options">{['Кино', 'Музыка', 'Путешествия', 'Кофе', 'Готовка', 'Спорт', 'Книги', 'Игры', 'Фотография', 'Природа', 'Искусство', 'Настолки', 'Животные'].map(item => <button type="button" key={item} className={interests.includes(item) ? 'choice active' : 'choice'} onClick={() => toggle(interests, setInterests, item)}>{item}</button>)}</div></section><section className="form-section"><h2>Кого ты ищешь</h2><p className="muted">Параметры бюджета и возраста соседа сохраняются вместе с анкетой и используются при подборе.</p></section><div className="form-actions"><button type="button" className="button button-outline" onClick={() => go('profile')}>Отмена</button><button type="submit" className="button button-lime" disabled={busy}>{busy ? 'Сохраняем…' : 'Сохранить анкету'}</button></div></form>
}

function Messages({ chats, userId, go, notify, onRead }: { chats: ChatItem[]; userId: string; go: (to: string) => void; notify: (text: string) => void; onRead: (chatId: string) => void }) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [chatQuery, setChatQuery] = useState('')
  const [history, setHistory] = useState<Message[]>([])
  const activeChat = chats.find(chat => chat.id === activeId) ?? chats[0]
  const activeChatId = activeChat?.id
  useEffect(() => {
    if (!activeChatId) return
    let cancelled = false
    void api.chats.messages(activeChatId).then(items => { if (!cancelled) setHistory(items) }).catch(error => notify(errorText(error)))
    void api.chats.markRead(activeChatId).catch(() => undefined)
    // Открытый (прочитанный) чат перестаёт показывать счётчик непрочитанных во всём приложении.
    onRead(activeChatId)
    return () => { cancelled = true }
  }, [activeChatId, notify, onRead])
  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const content = draft.trim()
    if (!content || !activeChat) return
    setDraft('')
    try { const savedMessage = await api.chats.send(activeChat.id, content); setHistory(current => [...current, savedMessage]) }
    catch (error) { notify(errorText(error)) }
  }
  if (!activeChat) return <><div className="page-heading"><div><span className="eyebrow">Общение</span><h1>Сообщения</h1><p>Диалоги появляются после взаимного интереса или принятой заявки.</p></div></div><EmptyState title="Пока нет диалогов" text="Найдите совпадение в ленте анкет, чтобы начать общение." action="К поиску соседей" onClick={() => go('browse')} /></>
  return <div className="messenger"><aside className="chat-sidebar"><h1>Сообщения</h1><label className="chat-search"><Icon name="search" size={17} /><input value={chatQuery} onChange={event => setChatQuery(event.target.value)} placeholder="Поиск" /></label><div className="chat-list">{chats.filter(chat => chat.name.toLowerCase().includes(chatQuery.toLowerCase())).map(chat => <button className={`chat-preview ${activeChat.id === chat.id ? 'active' : ''}`} key={chat.id} onClick={() => setActiveId(chat.id)}><img src={chat.image} alt="" /><span className="chat-preview-copy"><b>{chat.name}, {chat.age}</b><small>{chat.snippet}</small></span><span className="chat-time">{chat.time}{chat.unread > 0 && <i>{chat.unread}</i>}</span></button>)}</div></aside><section className="chat-window"><header className="chat-top"><img src={activeChat.image} alt="" /><div><b>{activeChat.name}, {activeChat.age}</b><small><i /> Вы совпали</small></div><button className="button button-outline review-link" onClick={() => go('review')}>Оставить отзыв</button><button className="icon-button" aria-label="Обновить" onClick={() => void api.chats.messages(activeChat.id).then(setHistory)}><Icon name="scan" /></button></header><div className="chat-messages"><div className="match-message">🎉 <span><b>У вас совпадение!</b><small>Вы оба отметили анкеты друг друга. Теперь можно обсудить совместную аренду.</small></span></div>{history.length === 0 && <small className="date-divider">Сообщений пока нет — напишите первым.</small>}{history.map(message => <div className={`bubble-row ${message.sender_id === userId ? 'outgoing' : 'incoming'}`} key={message.id}>{message.sender_id !== userId && <img src={activeChat.image} alt="" />}<p>{message.content}<time>{message.is_read ? '✓✓' : '✓'}</time></p></div>)}</div><form className="chat-compose" onSubmit={send}><button type="button" className="icon-button" aria-label="Добавить вложение"><Icon name="plus" /></button><input value={draft} onChange={event => setDraft(event.target.value)} placeholder="Написать сообщение..." /><button type="submit" className="send-button" aria-label="Отправить"><Icon name="send" /></button></form></section></div>
}

function Listings({ homes, go, notify }: { homes: Listing[]; go: (to: string) => void; notify: (text: string) => void }) {
  const [filter, setFilter] = useState('Все объявления'); const [query, setQuery] = useState(''); const [filtersOpen, setFiltersOpen] = useState(false)
  const applyTo = async (home: Listing) => {
    try { await api.announcements.apply(home.id, 'Здравствуйте! Хочу откликнуться на ваше объявление.'); notify('Заявка отправлена владельцу') }
    catch (error) { notify(errorText(error)) }
  }
  const filteredHomes = homes.filter(home => (filter === 'Все объявления' || home.kind === filter) && `${home.title} ${home.metro}`.toLowerCase().includes(query.toLowerCase()))
  return <><div className="page-heading"><div><span className="eyebrow">Жильё от участников сообщества</span><h1>Объявления о жилье</h1><p>Найди комнату или соседа для своей квартиры.</p></div><button className="button button-lime" onClick={() => go('publish')}><Icon name="plus" /> Разместить объявление</button></div><div className="listing-toolbar"><div className="segmented">{['Все объявления', 'Ищу соседа', 'Ищу комнату'].map(item => <button className={filter === item ? 'selected' : ''} key={item} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="listing-search"><Icon name="search" size={18} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Район, метро или адрес" /></label><button className={`button button-outline ${filtersOpen ? 'selected' : ''}`} onClick={() => setFiltersOpen(!filtersOpen)}><Icon name="filter" /> Фильтры</button></div>{filtersOpen && <div className="advanced-filters"><label>Максимальная стоимость<input type="number" placeholder="40 000 ₽" /></label><label>Срок аренды<select><option>Любой срок</option><option>От года</option></select></label><label>Животные<select><option>Не важно</option><option>Можно с животными</option></select></label></div>}{filteredHomes.length === 0 ? <EmptyState title="Объявлений нет" text="По этому запросу пока ничего не найдено." action="Сбросить поиск" onClick={() => { setFilter('Все объявления'); setQuery('') }} /> : <div className="listing-grid">{filteredHomes.map((home, index) => <article className="listing-card" key={home.id}><div className="listing-image"><img src={photoUrl(home.image, 750)} alt={home.title} /><span className="status-pill">{index === 0 ? 'Свободна с 15 октября' : 'Можно заселиться'}</span><button className="heart-button" aria-label="Сохранить объявление" onClick={() => notify('Объявление добавлено в избранное')}><Icon name="heart" /></button></div><div className="listing-info"><h3>{home.title}</h3><b className="listing-price">{home.price.toLocaleString('ru-RU')} ₽ <small>/ месяц</small></b><p><Icon name="pin" size={16} /> {home.metro} · 7 минут</p><p><Icon name="home" size={16} /> {home.area} м² · 2 комнаты</p><div className="tag-row">{home.tags.map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><button className="button button-lime full-button" onClick={() => void applyTo(home)}>Откликнуться <Icon name="arrow" /></button></div></article>)}</div>}</>
}

function Publish({ go, notify, onPublished }: { go: (to: string) => void; notify: (text: string) => void; onPublished: () => void }) {
  const [form, setForm] = useState({ title: '', room_price: '', total_rooms: '2', area: '', move_in_date: '', city: 'Москва', street: '', house_number: '', district: '', metro_station: '', description: '' })
  const [busy, setBusy] = useState(false)
  const update = (field: keyof typeof form, value: string) => setForm(current => ({ ...current, [field]: value }))
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    try {
      await api.announcements.create({
        room_price: Number(form.room_price) || 0,
        total_rooms: Number(form.total_rooms) || 1,
        area: Number(form.area) || 1,
        move_in_date: form.move_in_date || new Date().toISOString().slice(0, 10),
        description: form.title || form.description || undefined,
        address: { city: form.city, street: form.street || 'не указана', house_number: form.house_number || '1', district: form.district || form.city, metro_station: form.metro_station || form.district || form.city },
      })
      notify('Объявление опубликовано')
      onPublished()
      go('listings')
    } catch (error) { notify(errorText(error)) }
    finally { setBusy(false) }
  }
  return <><button className="back-link" onClick={() => go('listings')}><Icon name="back" /> К объявлениям</button><div className="page-heading"><div><h1>Расскажи о квартире</h1><p>Заполни детали — и подходящий сосед сможет откликнуться.</p></div></div><form className="publish-form" onSubmit={submit}><section className="form-section"><h2>Основная информация</h2><div className="form-grid"><label className="wide-field">Заголовок объявления<input required value={form.title} onChange={event => update('title', event.target.value)} placeholder="Например, комната в уютной квартире" /></label><label>Стоимость комнаты в месяц<input required type="number" min={0} value={form.room_price} onChange={event => update('room_price', event.target.value)} placeholder="25 000 ₽" /></label><label>Город<input required value={form.city} onChange={event => update('city', event.target.value)} /></label><label>Район<input required value={form.district} onChange={event => update('district', event.target.value)} placeholder="ЦАО" /></label><label>Метро<input required value={form.metro_station} onChange={event => update('metro_station', event.target.value)} placeholder="м. Тульская" /></label><label>Улица<input value={form.street} onChange={event => update('street', event.target.value)} placeholder="ул. Тульская" /></label><label>Дом<input value={form.house_number} onChange={event => update('house_number', event.target.value)} placeholder="15" /></label><label>Дата заселения<input type="date" value={form.move_in_date} onChange={event => update('move_in_date', event.target.value)} /></label><label>Количество комнат<select value={form.total_rooms} onChange={event => update('total_rooms', event.target.value)}><option value="1">1 комната</option><option value="2">2 комнаты</option><option value="3">3 комнаты</option></select></label><label>Площадь квартиры, м²<input required type="number" min={1} value={form.area} onChange={event => update('area', event.target.value)} placeholder="54" /></label><label className="wide-field">Описание<textarea value={form.description} onChange={event => update('description', event.target.value)} placeholder="Расскажи о квартире, соседях и правилах проживания" /></label></div></section><div className="form-actions"><button type="button" className="button button-outline" onClick={() => go('listings')}>Отмена</button><button type="submit" className="button button-lime" disabled={busy}>{busy ? 'Публикуем…' : 'Опубликовать объявление'} <Icon name="arrow" /></button></div></form></>
}

function MyProfile({ go, notify, onLogout }: { go: (to: string) => void; notify: (text: string) => void; onLogout: () => void }) {
  const { user, profile } = useAuth()
  const displayName = profile ? `${profile.first_name} ${profile.last_name}` : user?.email ?? 'Пользователь'
  const completeness = profile ? 100 : 25
  return <><div className="page-heading"><div><span className="eyebrow">Личный кабинет</span><h1>Мой профиль</h1><p>Управляй личными данными и настройками анкеты.</p></div><button className="button button-lime" onClick={() => go('questionnaire')}>Редактировать анкету</button></div><div className="my-profile-layout"><aside className="profile-menu content-card"><button className="selected"><Icon name="user" /> Личные данные</button><button onClick={() => go('questionnaire')}><Icon name="image" /> Моя анкета</button><button onClick={() => go('matches')}><Icon name="heart" /> Совпадения</button><button onClick={() => go('notifications')}><Icon name="bell" /> Уведомления</button><button onClick={onLogout}><Icon name="close" /> Выйти из аккаунта</button></aside><section className="content-card profile-details"><div className="profile-cover"><img src={profilePhoto(profile)} alt={displayName} /><div><h2>{displayName}</h2><p><Icon name="pin" size={16} /> {profile ? `${profile.city} · ${profile.district}` : 'Анкета пока не заполнена'}</p></div><span className="status-pill">Анкета заполнена на {completeness}%</span></div><div className="form-grid"><label>Имя<input readOnly value={profile?.first_name ?? ''} placeholder="Заполните анкету" /></label><label>Возраст<input readOnly value={profile?.age ?? ''} /></label><label>Email<input type="email" readOnly value={user?.email ?? ''} /></label><label>Город<input readOnly value={profile?.city ?? ''} /></label></div><div className="profile-stat-row"><div><b>{profile ? '✓' : '—'}</b><span>Анкета</span></div><div><b>{user?.role ?? 'user'}</b><span>Роль</span></div><div><b>{completeness}%</b><span>Заполненность</span></div></div><button className="button button-lime" onClick={() => notify('Данные профиля редактируются в анкете')}>Сохранить изменения</button></section></div></>
}

function Matches({ people, selfImage, go, onOpen }: { people: Person[]; selfImage: string; go: (to: string) => void; onOpen: (person: Person) => void }) { return <><div className="page-heading"><div><span className="eyebrow">Взаимный интерес</span><h1>Ваши совпадения</h1><p>Когда вы нравитесь друг другу — можно начинать общаться.</p></div></div>{people.length === 0 && <p className="muted">Совпадений пока нет — отметьте подходящие анкеты в поиске.</p>}<div className="match-grid">{people.slice(0, 12).map((person, index) => <article className="match-card" key={person.id}><div className="match-images"><img src={photoUrl(person.image, 500)} alt={person.name} /><span>♡</span><img src={selfImage} alt="Вы" /></div><div className="match-card-info"><span className="eyebrow">Совпадение {person.match}%</span><h3>{person.name}, {person.age}</h3><p>{person.district} · до {person.budget.toLocaleString('ru-RU')} ₽ / мес.</p><div className="card-actions"><button className="button button-outline" onClick={() => onOpen(person)}>Анкета</button><button className="button button-lime" onClick={() => go('messages')}><Icon name="message" /> Написать</button></div></div>{index === 0 && <span className="new-badge">Новое</span>}</article>)}</div></> }

function Notifications({ items, go, onReadAll }: { items: NotificationView[]; go: (to: string) => void; onReadAll: () => void }) { return <><div className="page-heading"><div><span className="eyebrow">Всё важное — здесь</span><h1>Уведомления</h1><p>Новости о совпадениях, сообщениях и откликах на объявления.</p></div><button className="text-button" onClick={onReadAll}>Отметить всё прочитанным</button></div><section className="notification-list">{items.length === 0 ? <p className="notification-empty">Новых уведомлений нет.</p> : items.map(item => <button className="notification-item" key={item.id} onClick={() => go(item.to)}><span className="notification-icon"><Icon name={item.icon} /></span><span><b>{item.title}</b><small>{item.body}</small><time>{item.time}</time></span><i /></button>)}</section></> }

function Review({ person, go, notify }: { person: Person | null; go: (to: string) => void; notify: (text: string) => void }) {
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!person) { notify('Сначала откройте анкету пользователя'); return }
    setBusy(true)
    try { await api.reviews.create(person.id, rating, comment); notify('Спасибо! Отзыв отправлен'); go('profile') }
    catch (error) { notify(errorText(error)) }
    finally { setBusy(false) }
  }
  return <><button className="back-link" onClick={() => go('matches')}><Icon name="back" /> К совпадениям</button><div className="review-wrap"><div className="review-person"><img src={person ? person.image : photoUrl('photo-1534528741775-53994a69daeb', 220)} alt={person?.name ?? 'Пользователь'} /><div><span className="eyebrow">Поделись впечатлением</span><h1>Оставить отзыв</h1><p>Твой отзыв поможет другим найти хорошего соседа.</p></div></div><form className="form-section review-form" onSubmit={submit}><h2>Как прошло общение с {person?.name ?? 'пользователем'}?</h2><div className="rating-stars" aria-label={`Оценка ${rating} из 5`}>{[1, 2, 3, 4, 5].map(value => <button type="button" key={value} aria-label={`${value} звёзд`} onClick={() => setRating(value)} className={value <= rating ? 'star-active' : ''}>★</button>)}</div><label>Расскажи подробнее<textarea value={comment} onChange={event => setComment(event.target.value)} placeholder="Что тебе понравилось? Как прошло знакомство?" /></label><label className="check-label"><input type="checkbox" required />Я подтверждаю, что отзыв основан на личном опыте</label><div className="form-actions"><button className="button button-outline" type="button" onClick={() => go('profile')}>Отмена</button><button className="button button-lime" type="submit" disabled={busy}>{busy ? 'Отправляем…' : 'Опубликовать отзыв'}</button></div></form></div></>
}
function EmptyState({ title, text, action, onClick }: { title: string; text: string; action: string; onClick: () => void }) { return <div className="empty-state"><span>⌕</span><h2>{title}</h2><p>{text}</p><button className="button button-lime" onClick={onClick}>{action}</button></div> }

export default App
