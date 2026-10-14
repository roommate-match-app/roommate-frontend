# КакДостатьСоседа — Frontend

Клиентская часть сервиса поиска соседа для совместной аренды. Приложение написано на React + TypeScript и собирается Vite. Сторонние UI-библиотеки не используются.

## Локальный запуск

Требуется Node.js 18 или новее.

```bash
npm install
npm run dev
```

Vite запустит приложение по адресу `http://localhost:5173`.

## Проверки

```bash
npm run build
npm run lint
```

## Экраны

- Главная и регистрация/вход.
- Лента анкет, фильтры, профиль кандидата и совпадения.
- Редактирование анкеты и предпочтений.
- Список диалогов и чат.
- Объявления о жилье, публикация объявления и отклик.
- Личный профиль, уведомления и форма отзыва.

Внутренняя навигация использует hash URL, например `#/browse` или `#/messages`.

## Интеграция с API

Интерфейс работает с реальным бэкендом `roommate-backend` (FastAPI, PostgreSQL).

- **Базовый URL.** По умолчанию запросы идут на тот же origin: dev-сервер Vite проксирует `/api`, `/media` и `/health` на `http://localhost:8000` (см. `vite.config.ts`). Для отдельного домена задайте `VITE_API_URL`.
- **Аутентификация.** JWT хранится в `localStorage`; при ответе `401` access-токен автоматически обновляется через `POST /api/auth/refresh` (см. `src/lib/api.ts`).
- **Данные.** Анкеты, лента кандидатов, совпадения, чаты, уведомления и объявления загружаются из API (`src/lib/api.ts`, `src/lib/adapters.ts`). Состояние входа и профиль — в `src/context/AuthProvider.tsx`.
- **Медиа.** Загруженные фото раздаются бэкендом по префиксу `/media`; при отсутствии фото показывается заглушка.

## Порядок локального запуска

1. Поднимите бэкенд (см. `roommate-backend/README.md`):
   - `docker compose up --build` — поднимаются PostgreSQL 16 и API, миграции применяются автоматически;
   - загрузите демо-данные (из каталога `roommate-backend`). PowerShell:
     `Get-Content -Raw app/db/seed.sql | docker exec -i roommate_postgres psql -U roommate_user -d roommate_db`
     bash/macOS/Linux: `docker exec -i roommate_postgres psql -U roommate_user -d roommate_db < app/db/seed.sql`
     (seed создан для пустой БД: повторный запуск приведёт к ошибкам дублирования ключей).
2. Во фронтенде: `npm install` и `npm run dev`.
3. Откройте `http://localhost:5173`, войдите демо-учёткой (например, `alice@example.com` / `password123`) и заполните анкету.

## Переменные окружения

Необязательные настройки — в `.env` (пример: `.env.example`). По умолчанию прокси Vite не требует переменных.

## Деплой

### Вариант A: nginx-контейнер (рекомендуется)

В репозитории есть `Dockerfile` (multi-stage: сборка на Node + раздача через nginx) и `nginx.conf`
(SPA-fallback + прокси `/api`, `/media`, `/health` на бэкенд).

```bash
docker build -t roommate-frontend .
docker run -d --name roommate_web --network roommate-backend_default -p 80:80 roommate-frontend
```

Контейнер должен быть в одной Docker-сети с бэкендом (по умолчанию `roommate-backend_default`),
чтобы имя `api` из `nginx.conf` резолвилось. Если бэкенд на другом хосте — замените `http://api:8000`
в `nginx.conf` или задайте `VITE_API_URL` перед сборкой.

### Вариант B: статика на любом хостинге

```bash
npm ci
npm run build      # результат в dist/
```

Положите содержимое `dist/` на статический хостинг. Используется hash-роутинг (`#/browse`), поэтому
SPA-fallback не требуется. Запросы к `/api` и `/media` должны проксироваться на бэкенд, либо задайте
`VITE_API_URL` с публичным адресом API и добавьте домен фронтенда в `CORS_ORIGINS` бэкенда.

> `VITE_API_URL` фиксируется на этапе сборки — задавайте его до `npm run build`.