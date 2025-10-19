# Шпаргалка разработчика Bibliaris

> Краткая справка для ежедневной работы

---

## 🎯 Backend API

**Production:** `https://api.bibliaris.com/api`  
**OpenAPI:** `https://api.bibliaris.com/api/docs-json`  
**Health:** `https://api.bibliaris.com/api/health/liveness`

---

## 🌍 Языки

**Поддерживаемые:** `en`, `es`, `fr`, `pt`  
**По умолчанию:** `en`  
**Приоритет:** path `:lang` > query `?lang` > header `Accept-Language` > default

---

## 🔐 Токены

**Access Token:** 12 часов  
**Refresh Token:** 7 дней

**Endpoints:**

```typescript
POST / api / auth / login // email, password
POST / api / auth / register // email, password
POST / api / auth / refresh // refreshToken
GET / api / users / me // Получить текущего пользователя + роли
```

---

## ⚡ Rate Limits

| Endpoint | Лимит      |
| -------- | ---------- |
| Login    | 5 req/min  |
| Register | 3 req/5min |
| Refresh  | 10 req/min |
| Comments | 10 req/min |

---

## 🗺️ Роутинг

### Публичный сайт (с языком):

```
/:lang/pages/:slug              # CMS страница
/:lang/books/:slug/overview     # Обзор книги
/:lang/categories/:slug/books   # Книги по категории
/:lang/tags/:slug/books         # Книги по тегу
/:lang/seo/resolve              # SEO данные
```

### Админка (с языком):

```
/admin/:lang/pages              # Управление CMS
/admin/:lang/books              # Управление книгами
/admin/:lang/versions           # Управление версиями
/admin/:lang/categories         # Категории
/admin/:lang/tags               # Теги
```

### Neutral (без языка):

```
/(neutral)/versions/:id         # Читалка/плеер
/api/auth/[...nextauth]        # NextAuth
```

---

## 📁 Структура проекта

```
app/
  [lang]/                # Публичный сайт
    layout.tsx
    page.tsx
    pages/[slug]/
    books/[slug]/overview/
    categories/[slug]/books/
    tags/[slug]/books/
    auth/sign-in/
  admin/[lang]/          # Админка
    layout.tsx
    page.tsx
    pages/
    books/
    versions/
    categories/
    tags/
  (neutral)/             # Без языка
    versions/[id]/

src/
  components/
    admin/               # Компоненты админки
    public/              # Публичные компоненты
  lib/
    http.ts             # HTTP клиент
    queryClient.ts      # React Query
  api/
    endpoints/          # API endpoints
    types.ts            # TypeScript типы из OpenAPI
  types/
    next-auth.d.ts      # Расширенные типы NextAuth
  utils/
    i18n.ts             # i18n утилиты
```

---

## 🔧 Команды

```bash
# Dev
yarn dev
yarn build
yarn start

# Code Quality
yarn lint
yarn type-check
yarn format

# Будущее
yarn test
yarn test:e2e
```

---

## 📦 Ключевые зависимости

```json
{
  "dependencies": {
    "next": "^14.x",
    "react": "^18.x",
    "antd": "^5.x",
    "@tanstack/react-query": "^5.x",
    "next-auth": "^4.x"
  }
}
```

---

## 🎨 Ant Design компоненты (часто используемые)

```typescript
import { Button, Form, Input, Select, Table, Modal, message } from 'antd';

// Форма
<Form onFinish={handleSubmit}>
  <Form.Item name="email" rules={[{ required: true }]}>
    <Input />
  </Form.Item>
  <Button type="primary" htmlType="submit">Submit</Button>
</Form>

// Таблица
<Table dataSource={data} columns={columns} />

// Уведомления
message.success('Успешно!');
message.error('Ошибка!');
```

---

## 🔍 React Query паттерны

```typescript
// Query
const { data, isLoading, error } = useQuery({
  queryKey: ['bookOverview', lang, slug],
  queryFn: () => getBookOverview(lang, slug),
})

// Mutation
const mutation = useMutation({
  mutationFn: createPage,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['pages'] })
    message.success('Создано!')
  },
})

// Ключи кэша
;['bookOverview', lang, slug][('page', lang, slug)][
  ('categoryBooks', lang, slug)
][('tagBooks', lang, slug)][('seoResolve', lang, type, id)]['me']
```

---

## 🔐 NextAuth паттерны

```typescript
// Получить сессию (клиент)
import { useSession } from 'next-auth/react'
const { data: session, status } = useSession()

// Получить сессию (сервер)
import { getServerSession } from 'next-auth'
const session = await getServerSession(authOptions)

// Вход/выход
import { signIn, signOut } from 'next-auth/react'
await signIn('credentials', { email, password })
await signOut()
```

---

## 🌍 i18n паттерны

```typescript
// Извлечь язык из params
export default function Page({ params }: { params: { lang: string } }) {
  const lang = params.lang // 'en' | 'es' | 'fr' | 'pt'
}

// Проверить язык
const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt'] as const
const isSupportedLang = (lang: string): lang is SupportedLang =>
  SUPPORTED_LANGS.includes(lang as SupportedLang)

// Переключить язык в URL
const switchLangInPath = (path: string, newLang: string) => {
  return path.replace(/^\/(en|es|fr|pt)/, `/${newLang}`)
}
```

---

## 🛠 HTTP клиент паттерн

```typescript
// src/lib/http.ts
const httpFetch = async (
  path: string,
  options?: {
    method?: string
    headers?: Record<string, string>
    body?: any
    lang?: string
    auth?: boolean
  }
) => {
  const baseURL = process.env.NEXT_PUBLIC_API_BASE_URL
  const url = `${baseURL}${path}`

  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  }

  if (options?.lang) {
    headers['Accept-Language'] = options.lang
  }

  if (options?.auth) {
    const session = await getSession()
    if (session?.accessToken) {
      headers['Authorization'] = `Bearer ${session.accessToken}`
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    body: options?.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new ApiError(response.status, error.message, error)
  }

  return response.json()
}
```

---

## 📊 SEO паттерн

```typescript
// app/[lang]/books/[slug]/overview/page.tsx
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { lang, slug } = params

  // Получить SEO данные
  const seo = await fetch(
    `${API_BASE_URL}/${lang}/seo/resolve?type=book&id=${slug}`
  ).then((res) => res.json())

  return {
    title: seo.meta.title,
    description: seo.meta.description,
    alternates: {
      canonical: seo.canonicalUrl,
      languages: seo.hreflang.reduce(
        (acc, { lang, url }) => ({
          ...acc,
          [lang]: url,
        }),
        {}
      ),
    },
    openGraph: seo.openGraph,
    twitter: seo.twitter,
  }
}
```

---

## ❌ Обработка ошибок

```typescript
// ApiError
class ApiError extends Error {
  constructor(public status: number, message: string, public details?: any) {
    super(message)
  }
}

// Обработка в компоненте
try {
  await createPage(data)
} catch (error) {
  if (error instanceof ApiError) {
    if (error.status === 409) {
      message.error('Slug уже существует')
    } else if (error.status === 429) {
      message.warning('Слишком много запросов')
    } else {
      message.error(error.message)
    }
  }
}
```

---

## 📝 Типы из OpenAPI

```bash
# Скачать схему
curl https://api.bibliaris.com/api/docs-json -o api-schema.json

# Сгенерировать типы
npx openapi-typescript api-schema.json -o src/api/types.ts

# Использовать
import type { Book, CreateBookDto } from '@/api/types';
```

---

## 🔍 Полезные ссылки

**Документация:**

- План: `docs/plan/DEVELOPMENT-PLAN.md`
- API Reference: `docs/frontend-agents/backend-api-reference.md`
- Текущий milestone: `docs/milestones/M*.md`
- Трекинг: `docs/plan/TASKS-TRACKING.md`

**Внешние:**

- Next.js Docs: https://nextjs.org/docs
- Ant Design: https://ant.design/components/overview
- React Query: https://tanstack.com/query/latest/docs/react
- NextAuth: https://next-auth.js.org/

---

**Последнее обновление:** 19 октября 2025
