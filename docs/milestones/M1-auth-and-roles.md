# M1 — Auth и роли (подробное ТЗ)

Цель: реализовать авторизацию через Auth.js (NextAuth) с Credentials provider, хранением `accessToken`/`refreshToken` в JWT‑сессии, автоматическим обновлением токена, страницей входа, и защитой админ‑маршрутов на основе ролей (`admin|content_manager`).

## Результат этапа

- Работает вход/выход через страницу `/:lang/auth/sign-in` (UI на Ant Design).
- В JWT NextAuth хранятся `accessToken` и `refreshToken`; включён автоматический refresh.
- В сессии на клиенте доступен `accessToken` и базовые данные пользователя (минимум email/id после запроса `/users/me`).
- Админ‑маршруты `/admin/:lang/...` защищены: доступ только с ролью `admin` или `content_manager`; остальные — редирект на sign‑in.

## Контракты backend (нейтральные, без префикса :lang)

- POST `/api/auth/login` → `{ email, password }` ⇒ `{ accessToken, refreshToken }`
- POST `/api/auth/refresh` → `{ refreshToken }` ⇒ `{ accessToken, refreshToken }`
- POST `/api/auth/register` (опционально) → `{ email, password }` ⇒ `{ accessToken, refreshToken }`
- GET `/api/users/me` → `{ id, email, name?, avatarUrl?, languagePreference?, roles: RoleName[] }`

Примечания:

- Передавать `Accept-Language: <lang>` (текущий UI язык) — влияет на сообщения/локализацию ответов.
- Если `accessToken` — JWT со стандартным `exp`, используем его для определения момента refresh. Если `exp` нет, делаем refresh в фетч‑слое при 401 (будет покрыто дополнительно в M2) и/или устанавливаем эвристический TTL.

---

## Задачи и ТЗ

### 1) Зависимости и окружение

ТЗ:

- Убедиться, что добавлены пакеты: `next-auth`, `@types/jsonwebtoken` (если нужно для типов).
- Обновить `.env.example`:
  - `NEXTAUTH_URL=` (http://localhost:3000 на dev)
  - `NEXTAUTH_SECRET=` (случайная строка)
    Критерии приёмки:
- Проект собирается, dev‑сервер стартует без ошибок переменных окружения.
  Артефакты:
- `.env.example` дополнен, зависимости зафиксированы в package.json.

### 2) Конфигурация NextAuth (App Router)

ТЗ:

- Создать обработчик: `app/api/auth/[...nextauth]/route.ts` с экспортами `GET, POST`.
- Вынести опции в `src/auth/nextAuthOptions.ts`:
  - `session: { strategy: 'jwt' }`.
  - Credentials Provider: `authorize(credentials)` вызывает `POST /auth/login` на backend с `Accept-Language`. На success возвращает объект `{ accessToken, refreshToken }` и, опционально, email/id, если есть.
  - callbacks.jwt: на логин — сохранить токены в JWT; на последующих вызовах — если `accessToken` близок к истечению или отсутствует — вызвать `/auth/refresh` и обновить токены; при ошибке refresh — очистить токены.
  - callbacks.session: прокинуть `accessToken` в `session` и, при наличии, минимальные поля пользователя.
  - events.signOut: опционально — `POST /auth/logout` (бэкенд у нас статлесс; можно не звать).
- Типизировать токен/сессию (см. задачу 3).
  Критерии приёмки:
- После sign‑in в `session` доступен `accessToken`, а в JWT — оба токена.
  Артефакты:
- `app/api/auth/[...nextauth]/route.ts`, `src/auth/nextAuthOptions.ts`.

### 3) Расширение типов NextAuth

ТЗ:

- Создать `src/types/next-auth.d.ts` с module augmentation для `JWT` и `Session`:
  - JWT: `accessToken?: string; refreshToken?: string; accessTokenExpires?: number;`
  - Session: `accessToken?: string; user?: { id?: string; email?: string; roles?: string[] }`
- Включить этот файл в `tsconfig` (`typeRoots`/`include`).
  Критерии приёмки:
- TypeScript видит расширенные поля без ошибок.
  Артефакты:
- `src/types/next-auth.d.ts`.

### 4) Страница входа `/:lang/auth/sign-in`

ТЗ:

- Разместить в `app/[lang]/auth/sign-in/page.tsx`.
- Форма на AntD: `email`, `password`, submit вызывает `signIn('credentials', { redirect: false, email, password, callbackUrl })`.
- Ошибки: валидация полей, вывод сообщений от NextAuth/бэка; состояние загрузки.
- Локализация: `Accept-Language` берём из сегмента `[lang]` и пробрасываем при авторизации.
- Редиректы:
  - Если был `callbackUrl` (например, из охраны админки) — редирект туда.
  - Иначе: редирект на `/admin/[lang]` для сотрудников или на `/:lang` для обычных пользователей (пока можно всех на `/admin/[lang]`, окончательно — после roles).
    Критерии приёмки:
- Успешный вход завершает редиректом, неуспешный — показывает ошибку.
  Артефакты:
- `app/[lang]/auth/sign-in/page.tsx`.

### 5) Получение ролей и хранение в сессии

ТЗ:

- После успешного логина (или на первой загрузке защищённого admin layout) вызвать `GET /users/me` с `Authorization: Bearer <accessToken>` и `Accept-Language`.
- Сохранить `roles` в удобном месте:
  - В серверном layout `app/admin/[lang]/layout.tsx` — хранить в локальной переменной и прокинуть в контекст/props дочерним компонентам.
  - В `session` можно расширить `user.roles` (через session callback, но там нет серверного запроса — лучше получать в layout при SSR на каждую загрузку админки).
    Критерии приёмки:
- На страницах админки доступны роли текущего пользователя.
  Артефакты:
- Логика запроса `/users/me` (в layout или отдельном серверном хелпере `src/auth/getCurrentUser.ts`).

### 6) Защита админ‑маршрутов

ТЗ:

- Middleware `middleware.ts`:
  - Перехватывать пути `/admin/:lang`.
  - С помощью `getToken()` (из `next-auth/jwt`) проверять наличие валидного JWT (без ролей — роли проверим в layout). Если токена нет — редирект на `/:lang/auth/sign-in?callbackUrl=<original>`.
- Серверная проверка ролей в `app/admin/[lang]/layout.tsx`:
  - Получить session; если нет — редирект на sign‑in.
  - Запросить `/users/me`; если нет нужных ролей — редирект на `/:lang/auth/sign-in` или показать страницу «Недостаточно прав» (403) в админском layout.
- UI‑вариант: страница 403 в админке с CTA «Вернуться»/«Выйти».
  Критерии приёмки:
- Без входа: попадание на `/admin/:lang` приводит к редиректу на sign‑in.
- Без ролей: видим 403 или редирект.
- С ролями: доступ разрешён.
  Артефакты:
- `middleware.ts`, проверка в `app/admin/[lang]/layout.tsx`, опц. страница `app/admin/[lang]/forbidden/page.tsx`.

### 7) Обновление токенов (refresh)

ТЗ:

- В `callbacks.jwt` реализовать стратегию обновления:
  - При логине: сохранить `accessToken`, `refreshToken`, вычислить `accessTokenExpires` из `exp` токена (если есть) или задать TTL (например, `Date.now() + 10 * 60 * 1000`).
  - На каждом вызове: если `Date.now() < accessTokenExpires - 60_000` — вернуть как есть; иначе — вызвать `/auth/refresh` с `refreshToken`, обновить токены и `accessTokenExpires`.
  - При ошибке refresh — удалить токены (принудительный sign‑out на стороне UI при ближайшем запросе).
- Сессионный callback должен пробрасывать новый `accessToken` в `session`.
  Критерии приёмки:
- Искусственно занизив `accessTokenExpires`, видим успешный refresh без разлогина.
  Артефакты:
- Логика в `src/auth/nextAuthOptions.ts`.

### 8) Выход из системы

ТЗ:

- Кнопка «Выйти» в публичной и админской шапке (пока можно в одной из них) вызывает `signOut({ callbackUrl: '/:lang' })`.
- (Опционально) дергать `/auth/logout` на бэке.
  Критерии приёмки:
- После `signOut` пользователь теряет доступ к `/admin/:lang`.

### 9) Ошибки и UX

ТЗ:

- 400/422 при логине — показывать валидационные ошибки в форме.
- 401 — неверные креды: выделять поля, показывать общий месседж.
- 429 — показать дружелюбный месседж «Слишком много попыток, повторите позже».
- Локализация ошибок — по возможности с бэка через `Accept-Language`.
  Критерии приёмки:
- Сценарии неверного пароля/перегруза отображаются корректно.

### 10) Тестирование

ТЗ:

- Unit: тесты утилит расчёта `accessTokenExpires` и веток refresh (можно на чистых функциях).
- E2E (если уже есть Playwright):
  - Переход на `/admin/en` → редирект на `/en/auth/sign-in`.
  - Успешный логин → редирект обратно в админку.
  - Пользователь без ролей → 403/редирект.
- Ручные проверки: смена языка на странице логина меняет URL и не ломает сабмит.
  Критерии приёмки:
- Критичные e2e проходят локально; unit‑тесты зелёные.

## Артефакты этапа

- `app/api/auth/[...nextauth]/route.ts`
- `src/auth/nextAuthOptions.ts`
- `src/types/next-auth.d.ts`
- `app/[lang]/auth/sign-in/page.tsx`
- `middleware.ts`
- (опц.) `app/admin/[lang]/forbidden/page.tsx`
- (опц.) `src/auth/getCurrentUser.ts`

## Схема директорий (релевантное для M1)

```
app/
  api/
    auth/
      [...nextauth]/
        route.ts
  [lang]/
    auth/
      sign-in/
        page.tsx
  admin/
    [lang]/
      layout.tsx            # проверка ролей/редиректы (частично в M1)

middleware.ts               # защита /admin/:lang по наличию токена

src/
  auth/
    nextAuthOptions.ts      # конфиг NextAuth
    getCurrentUser.ts       # опц. серверный хелпер /users/me
  types/
    next-auth.d.ts          # расширение типов JWT/Session
  lib/
    http.ts                 # fetcher (из M0)
  i18n/
    lang.ts                 # SUPPORTED_LANGS, utils (из M0)
```

## Каркасы файлов (скелеты)

Ниже — минимальные заготовки. Они неполные и требуют адаптации под текущие пути импортов и стиль проекта.

### 1) `app/api/auth/[...nextauth]/route.ts`

```ts
import NextAuth from 'next-auth'
import { nextAuthOptions } from '@/src/auth/nextAuthOptions'

const handler = NextAuth(nextAuthOptions)

export { handler as GET, handler as POST }
```

### 2) `src/auth/nextAuthOptions.ts`

```ts
import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

async function loginRequest(email: string, password: string, lang?: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(lang ? { 'Accept-Language': lang } : {}),
    },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    throw new Error('LOGIN_FAILED')
  }
  return (await res.json()) as { accessToken: string; refreshToken: string }
}

async function refreshRequest(refreshToken: string) {
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  })
  if (!res.ok) throw new Error('REFRESH_FAILED')
  return (await res.json()) as { accessToken: string; refreshToken: string }
}

export const nextAuthOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: { email: {}, password: {} },
      async authorize(credentials, req) {
        const email = credentials?.email as string
        const password = credentials?.password as string
        const lang = req?.headers?.get('accept-language') ?? undefined
        if (!email || !password) return null
        const tokens = await loginRequest(email, password, lang)
        return { id: email, email, ...tokens }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // На логин: сохранить токены
      if (user && 'accessToken' in user && 'refreshToken' in user) {
        token.accessToken = (user as any).accessToken
        token.refreshToken = (user as any).refreshToken
        // Попытка вычислить exp из JWT (если есть)
        try {
          const payload = JSON.parse(
            Buffer.from(token.accessToken.split('.')[1], 'base64').toString()
          )
          if (payload?.exp) token.accessTokenExpires = payload.exp * 1000
        } catch {}
        if (!token.accessTokenExpires)
          token.accessTokenExpires = Date.now() + 10 * 60 * 1000
        return token
      }

      // Обновление: если скоро истекает — рефреш
      const margin = 60 * 1000
      if (
        token.accessToken &&
        token.accessTokenExpires &&
        Date.now() > token.accessTokenExpires - margin
      ) {
        try {
          const rt = token.refreshToken as string | undefined
          if (!rt) throw new Error('NO_REFRESH_TOKEN')
          const next = await refreshRequest(rt)
          token.accessToken = next.accessToken
          token.refreshToken = next.refreshToken
          try {
            const payload = JSON.parse(
              Buffer.from(next.accessToken.split('.')[1], 'base64').toString()
            )
            token.accessTokenExpires = payload?.exp
              ? payload.exp * 1000
              : Date.now() + 10 * 60 * 1000
          } catch {
            token.accessTokenExpires = Date.now() + 10 * 60 * 1000
          }
        } catch {
          // Очистка токенов при неудаче
          delete token.accessToken
          delete token.refreshToken
          delete token.accessTokenExpires
        }
      }
      return token
    },
    async session({ session, token }) {
      if (token?.accessToken) {
        ;(session as any).accessToken = token.accessToken
      }
      return session
    },
  },
}
```

### 3) `middleware.ts`

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const SUPPORTED = new Set(['en', 'es', 'fr', 'pt'])

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (!pathname.startsWith('/admin/')) return NextResponse.next()

  const seg = pathname.split('/')
  const lang = seg[2] || 'en'
  const safeLang = SUPPORTED.has(lang) ? lang : 'en'

  const token = await getToken({ req })
  if (!token?.accessToken) {
    const url = req.nextUrl.clone()
    url.pathname = `/${safeLang}/auth/sign-in`
    url.searchParams.set('callbackUrl', req.nextUrl.href)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/admin/:path*'],
}
```

### 4) `app/[lang]/auth/sign-in/page.tsx`

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams, useParams } from 'next/navigation'
import { Form, Input, Button, Alert } from 'antd'

export default function SignInPage() {
  const params = useParams<{ lang: string }>()
  const search = useSearchParams()
  const callbackUrl = search.get('callbackUrl') || `/admin/${params.lang}`
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true)
    setError(null)
    const res = await signIn('credentials', {
      redirect: false,
      email: values.email,
      password: values.password,
      callbackUrl,
    })
    setLoading(false)
    if (res?.error) return setError('Неверный email или пароль')
    if (res?.ok) window.location.href = res.url || callbackUrl
  }

  return (
    <div style={{ maxWidth: 360, margin: '64px auto' }}>
      <h1>Вход</h1>
      {error && (
        <Alert type='error' message={error} style={{ marginBottom: 16 }} />
      )}
      <Form layout='vertical' onFinish={onFinish}>
        <Form.Item
          name='email'
          label='Email'
          rules={[{ required: true, message: 'Введите email' }]}
        >
          <Input type='email' autoComplete='email' />
        </Form.Item>
        <Form.Item
          name='password'
          label='Пароль'
          rules={[{ required: true, message: 'Введите пароль' }]}
        >
          <Input.Password autoComplete='current-password' />
        </Form.Item>
        <Button type='primary' htmlType='submit' loading={loading} block>
          Войти
        </Button>
      </Form>
    </div>
  )
}
```

### 5) `src/types/next-auth.d.ts`

```ts
import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth/jwt' {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    accessTokenExpires?: number
  }
}

declare module 'next-auth' {
  interface Session {
    accessToken?: string
    user?: {
      id?: string
      email?: string
      roles?: string[]
    }
  }
}
```

### 6) (опц.) `src/auth/getCurrentUser.ts`

```ts
import { getServerSession } from 'next-auth'
import { nextAuthOptions } from './nextAuthOptions'

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

export async function getCurrentUser(lang?: string) {
  const session = await getServerSession(nextAuthOptions)
  const accessToken = (session as any)?.accessToken as string | undefined
  if (!accessToken) return null
  const res = await fetch(`${API_BASE}/users/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(lang ? { 'Accept-Language': lang } : {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) return null
  return res.json()
}
```

## Риски и примечания

- Нельзя делать тяжёлые сетевые вызовы в `middleware` — используем его только для проверки наличия токена и маршрутизации; роли проверяем в layout.
- Если backend не возвращает `exp` в JWT, предпочтительно сместить логику refresh в фетч‑слой при 401 (будет подробно в M2). В M1 реализуем базовый refresh в callbacks на основе `exp` или эвристики.
- Не хранить `refreshToken` в `session` (клиенте); он только в JWT на серверной стороне NextAuth.

## Чек‑лист готовности M1

- [ ] Страница `/:lang/auth/sign-in` работает (форма, редиректы)
- [ ] NextAuth настроен: JWT‑сессия, токены сохраняются
- [ ] Авто‑refresh токенов реализован
- [ ] Получение ролей через `/users/me`
- [ ] Защита `/admin/:lang` (middleware + проверка ролей в layout)
- [ ] Выход (`signOut`) сбрасывает доступ к админке
- [ ] Базовые тесты/проверки пройдены
