# M2 — Слой данных и типы (подробное ТЗ)

Цель: внедрить типы API из OpenAPI, единый HTTP‑клиент с учётом авторизации и языка, базовую интеграцию React Query (включая SSR/SSG), стандартизировать обработку ошибок, определить ключи кэша и предоставить типизированные эндпоинты/хуки для первых страниц.

## Результат этапа

- Есть `src/api/types.ts` с типами из OpenAPI (или заглушка до генерации).
- Единый `http`‑клиент: базовый URL, `Authorization` из NextAuth, `Accept-Language` из текущего `:lang`, разбор ошибок.
- Настроен React Query: провайдер в AppProviders (из M0), дефолтные опции, SSR/SSG гидратация по необходимости.
- Типизированные вызовы для 2–3 публичных контрактов и 1–2 служебных (например, `/users/me`).
- Ошибки маппятся в единый `ApiError` и корректно отражаются в UI.

## Контракты backend

- Swagger JSON: `GET /api/docs-json`.
- База URL: `NEXT_PUBLIC_API_BASE_URL` (например, http://localhost:5000/api).
- Язык: `/:lang` в пути (когда требуется) +/или заголовок `Accept-Language: <lang>` (см. docs/frontend-agents/\*).
- Ошибки: 400/401/403/404/409/429/500 (см. docs/frontend-agents/error-handling.md) — FE должен корректно их понимать и обрабатывать.

---

## Задачи и ТЗ

### 1) Типы из OpenAPI

ТЗ:

- Согласовать механизм генерации типов из бэкенд‑репозитория: сценарий `yarn openapi:types` в backend генерирует `libs/api-client/types.ts`.
- Для фронта: на этапе M2 — скопировать `types.ts` в `src/api/types.ts`. В будущем можно автоматизировать (git submodule / artifact / CI copy).
- Если генерация пока недоступна — временно создать `src/api/types.ts` с минимумом интерфейсов, нужных для M2 (BookOverview, Page, UserMe, ErrorResponse).
  Критерии приёмки:
- Типы импортируются и используются без ошибок TS.
  Артефакты:
- `src/api/types.ts`

### 2) Базовый HTTP‑клиент (`src/lib/http.ts`)

ТЗ:

- Реализовать универсальный `httpFetch(path, { method, headers, body, lang, auth })`:
  - Склеивает `baseURL + path`.
  - Добавляет `Accept-Language: lang` если передан.
  - Если `auth: true` — добавляет `Authorization: Bearer <accessToken>` (на сервере — через `getServerSession`, на клиенте — через `getSession`/контекст). На этом этапе достаточно клиентской версии; серверная будет через хелперы (см. задачу 5).
  - На `!res.ok`: распарсить JSON, бросить `ApiError` `{ status, message, details?, data? }`.
- Вынести тип `ApiError` и type guard `isApiError(err): err is ApiError`.
  Критерии приёмки:
- Успешный GET и обработка типовых ошибок (401/404/429) работают в простых вызовах.
  Артефакты:
- `src/lib/http.ts`

### 3) React Query: настройки и ключи

ТЗ:

- Создать `src/lib/queryClient.ts` с фабрикой QueryClient и дефолтными опциями:
  - `retry`: 0 для 4xx (кроме 429 — 1–2 попытки с backoff), 2–3 для 5xx.
  - `staleTime`: 30s для публичных GET, можно настраивать per‑query.
- В `AppProviders` (из M0) подключить React Query Provider и Hydration (если используем SSG). Подготовить утилиты `getQueryClient()`/`dehydrate` по необходимости.
- Определить набор ключей кэша:
  - `['bookOverview', lang, slug]`
  - `['page', lang, slug]`
  - `['categoryBooks', lang, slug]`
  - `['tagBooks', lang, slug]`
  - `['seoResolve', lang, type, id]`
  - `['me']` (авторизованное)
    Критерии приёмки:
- useQuery для минимум двух контрактов кэшируется и соответствует ключам.
  Артефакты:
- `src/lib/queryClient.ts`

### 4) 401 + refresh: интеграция с NextAuth

ТЗ:

- На клиенте: если вызов с `auth: true` вернул 401, выполнить один раз `getSession()` из `next-auth/react` (чтобы NextAuth применил refresh в jwt callback), затем повторить запрос.
- При повторном 401 — инициировать signOut или бросить ошибку, чтобы сработала глобальная обработка (редирект/страница входа на защищённых зонах).
- На сервере (RSC/route handlers): получать `session` через `getServerSession` перед запросом и использовать актуальный `accessToken` (jwt callback уже сделает refresh при необходимости).
  Критерии приёмки:
- Сымитировав истёкший токен, первый 401 автоматически восстанавливается; при фейле — корректный выход/ошибка.
  Артефакты:
- Логика в `src/lib/http.ts` и хелперы в `src/auth` (если нужны).

### 5) Язык: извлечение и заголовки

ТЗ:

- Серверные компоненты: принимать `params.lang` и прокидывать как `Accept-Language` при запросах.
- Клиент: хранить текущий `lang` в контексте/хелпере `getCurrentLang()` из сегмента URL; для M2 достаточно утилиты `extractLangFromPath(pathname)` и явной передачи `lang` в вызовы.
- Добавить `src/lib/i18n-headers.ts` с функцией `withLangHeaders(lang, headers)`.
  Критерии приёмки:
- Запросы к нейтральным эндпоинтам получают корректный `Accept-Language`.
  Артефакты:
- `src/lib/i18n-headers.ts`

### 6) Типизированные эндпоинты и хуки

ТЗ:

- Создать слой вызовов `src/api/endpoints/public.ts` и `src/api/endpoints/auth.ts`:
  - `getBookOverview(lang, slug)` → GET `/:lang/books/:slug/overview`.
  - `getPage(lang, slug)` → GET `/:lang/pages/:slug`.
  - `getMe()` → GET `/users/me` (auth: true).
  - (опц.) `resolveSeo(lang, params)` → GET `/:lang/seo/resolve`.
- Для каждого — обёртки‑хуки в `src/api/hooks/*` с React Query (`useBookOverview`, `usePage`, `useMe`).
  Критерии приёмки:
- В демо‑страницах M0 (заглушках) можно сделать вызов одного‑двух хуков и отобразить результат/ошибку.
  Артефакты:
- `src/api/endpoints/public.ts`, `src/api/endpoints/auth.ts`, `src/api/hooks/*.ts`

### 7) Обработка ошибок и UX

ТЗ:

- Определить маппинг: 400/422 → inline ошибки форм; 401 → триггер refresh/редирект на вход; 403 → «Недостаточно прав»; 404 → notFound(); 409 → toast; 429 → дружелюбный месседж и отключение retry; 500 → общий error boundary.
- Добавить `src/lib/errors.ts` с утилитами `toUserMessage(ApiError)` и константами.
  Критерии приёмки:
- Ошибки выводятся предсказуемо в демо‑компонентах.
  Артефакты:
- `src/lib/errors.ts`

### 8) SSR/SSG и кэширование ответов Next.js

ТЗ:

- Для публичных страниц под `/:lang/*` использовать серверные компоненты и `fetch`/наш клиент с `cache: 'force-cache' | revalidate: <seconds>` там, где уместно.
- Каталоги — с `revalidate` (например, 300s); критически свежие — `no-store`.
- Пример использования `generateMetadata()` с вызовом `/seo/resolve` (подготовить скелет).
  Критерии приёмки:
- Пара страниц работают с SSG/ISR и не ломают клиентский кэш React Query.
  Артефакты:
- Примеры в комментариях к эндпоинтам/хукам.

### 9) Тестирование

ТЗ:

- Unit: тесты на `http.ts` — построение URL, заголовки, маппинг ошибок; на `errors.ts` — преобразование в сообщения.
- (Опц.) Интеграционные: мок эндпоинтов и проверка повторного запроса после 401.
- Линтер/тайпчек — зелёные.
  Критерии приёмки:
- Unit‑тесты для критических утилит проходят.
  Артефакты:
- `__tests__/lib/http.test.ts` (опц.), `__tests__/lib/errors.test.ts` (опц.)

---

## Схема директорий (релевантное для M2)

```
src/
  api/
    types.ts
    endpoints/
      public.ts
      auth.ts
    hooks/
      useBookOverview.ts
      usePage.ts
      useMe.ts
  lib/
    http.ts
    queryClient.ts
    errors.ts
    i18n-headers.ts
  auth/
    nextAuthOptions.ts   # из M1
    getCurrentUser.ts    # опц.
  i18n/
    lang.ts              # из M0
```

## Каркасы файлов (скелеты)

### `src/lib/http.ts`

```ts
export type ApiError = {
  status: number
  message: string
  details?: any
  data?: any
}

export function isApiError(e: unknown): e is ApiError {
  return !!e && typeof e === 'object' && 'status' in e
}

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL!

type Options = {
  method?: string
  headers?: Record<string, string>
  body?: any
  lang?: string
  auth?: boolean
  cache?: RequestCache
  next?: NextFetchRequestConfig
}

export async function httpFetch<T>(
  path: string,
  opts: Options = {}
): Promise<T> {
  const url = path.startsWith('http') ? path : `${BASE}${path}`
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers || {}),
  }
  if (opts.lang) headers['Accept-Language'] = opts.lang

  // NOTE: на сервере используйте getServerSession и передавайте токен явно в headers
  // На клиенте — можно подтягивать токен через getSession() (добавим позже в auth‑вызовах)

  const res = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
    cache: opts.cache,
    next: opts.next,
  })

  const isJson = res.headers.get('content-type')?.includes('application/json')
  const data = isJson ? await res.json().catch(() => null) : null

  if (!res.ok) {
    const err: ApiError = {
      status: res.status,
      message: data?.message || res.statusText,
      details: data?.details,
      data,
    }
    throw err
  }
  return data as T
}
```

### `src/lib/queryClient.ts`

```ts
import { QueryClient } from '@tanstack/react-query'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry(failureCount, error: any) {
          const status = error?.status
          if (status && status >= 400 && status < 500 && status !== 429)
            return false
          return failureCount < 2
        },
        staleTime: 30_000,
      },
    },
  })
}
```

### `src/api/endpoints/public.ts`

```ts
import { httpFetch } from '@/src/lib/http'

export async function getBookOverview(lang: string, slug: string) {
  return httpFetch(`/${lang}/books/${encodeURIComponent(slug)}/overview`, {
    lang,
  })
}

export async function getPage(lang: string, slug: string) {
  return httpFetch(`/${lang}/pages/${encodeURIComponent(slug)}`, { lang })
}

export async function resolveSeo(
  lang: string,
  params: { type: 'book' | 'version' | 'page'; id: string }
) {
  const q = new URLSearchParams({ type: params.type, id: params.id }).toString()
  return httpFetch(`/${lang}/seo/resolve?${q}`, { lang, cache: 'force-cache' })
}
```

### `src/api/endpoints/auth.ts`

```ts
import { httpFetch } from '@/src/lib/http'

export async function getMe(accessToken: string, lang?: string) {
  return httpFetch(`/users/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    lang,
    cache: 'no-store',
  })
}
```

### Хуки React Query (пример)

```ts
// src/api/hooks/useBookOverview.ts
import { useQuery } from '@tanstack/react-query'
import { getBookOverview } from '../endpoints/public'

export function useBookOverview(lang: string, slug: string) {
  return useQuery({
    queryKey: ['bookOverview', lang, slug],
    queryFn: () => getBookOverview(lang, slug),
  })
}
```

### `src/lib/errors.ts`

```ts
import type { ApiError } from './http'

export function toUserMessage(err: unknown): string {
  const e = err as ApiError
  switch (e?.status) {
    case 400:
    case 422:
      return e.message || 'Проверьте корректность введённых данных'
    case 401:
      return 'Требуется вход в систему'
    case 403:
      return 'Недостаточно прав'
    case 404:
      return 'Не найдено'
    case 409:
      return 'Конфликт данных'
    case 429:
      return 'Слишком много запросов, попробуйте позже'
    default:
      return 'Ошибка сервера'
  }
}
```

---

## Примеры использования

### Серверный компонент (публичная страница)

```ts
// app/[lang]/pages/[slug]/page.tsx (пример скелета)
import { getPage } from '@/src/api/endpoints/public'

export default async function CmsPage({
  params,
}: {
  params: { lang: string; slug: string }
}) {
  const data = await getPage(params.lang, params.slug)
  // ...render
  return <div>{data.title}</div>
}
```

### Клиентский компонент с React Query

```tsx
// app/[lang]/books/[slug]/overview/client.tsx
'use client'
import { useBookOverview } from '@/src/api/hooks/useBookOverview'

export function BookOverviewClient({
  lang,
  slug,
}: {
  lang: string
  slug: string
}) {
  const { data, isLoading, error } = useBookOverview(lang, slug)
  if (isLoading) return <div>Загрузка…</div>
  if (error) return <div>Ошибка</div>
  return <div>{data?.book?.slug}</div>
}
```

---

## Чек‑лист готовности M2

- [ ] `src/api/types.ts` добавлен и подключён
- [ ] `src/lib/http.ts` реализован (ApiError, isApiError)
- [ ] `src/lib/queryClient.ts` и провайдер React Query подключены
- [ ] Вызовы/хуки для 2–3 публичных контрактов и `getMe()` готовы
- [ ] 401‑повтор с обновлением токена на клиенте реализован (минимум один повтор)
- [ ] Заголовок `Accept-Language` корректно передаётся
- [ ] Ошибки маппятся в `toUserMessage` и выводятся
- [ ] Unit‑тесты ключевых утилит (опц.)
