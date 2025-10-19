# Модуль авторизации NextAuth

> Заготовка для интеграции NextAuth в проект Bibliaris

## 📁 Структура

```
lib/auth/
├── auth.ts              # NextAuth v5 instance (auth, signIn, signOut, handlers)
├── config.ts            # Конфигурация NextAuth с провайдерами и callbacks
├── SessionProvider.tsx  # Client-side провайдер сессии
├── helpers.ts           # Утилиты для работы с сессией на сервере
├── index.ts             # Public API модуля
└── README.md            # Эта документация

app/api/auth/[...nextauth]/
└── route.ts             # API Route Handler для NextAuth

types/
└── next-auth.d.ts       # Расширение типов NextAuth (User, Session, JWT)
```

## 🎯 Текущий статус (M0.5)

**✅ Реализовано:**

- Структура файлов NextAuth
- Типы для User, Session, JWT
- Конфигурация с Credentials Provider (заготовка)
- API Route Handler (`/api/auth/*`)
- SessionProvider для клиентских компонентов
- Хелперы для серверных компонентов

**🔴 TODO (M1):**

- Реализовать логику `authorize()` в CredentialsProvider
- Реализовать callbacks для JWT и Session
- Реализовать автоматический refresh токенов
- Создать страницы `/[lang]/auth/sign-in` и `/[lang]/auth/error`
- Интегрировать SessionProvider в `AppProviders`
- Добавить middleware для защиты админ-маршрутов

## 🔧 Использование (после M1)

### Серверные компоненты

```typescript
import { getCurrentUser, isStaff } from '@/lib/auth';

export default async function AdminPage() {
  const session = await getCurrentUser();

  if (!session) {
    redirect('/en/auth/sign-in');
  }

  const hasAccess = await isStaff();
  if (!hasAccess) {
    return <div>Access denied</div>;
  }

  return <div>Welcome, {session.user.email}</div>;
}
```

### Клиентские компоненты

```typescript
'use client';

import { useSession, signIn, signOut } from 'next-auth/react';

export function UserMenu() {
  const { data: session, status } = useSession();

  if (status === 'loading') return <div>Loading...</div>;

  if (!session) {
    return <button onClick={() => signIn()}>Sign In</button>;
  }

  return (
    <div>
      <p>Signed in as {session.user.email}</p>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  );
}
```

## 📝 Конфигурация

### Переменные окружения

```env
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# API Backend
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
```

### Генерация NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## 🔒 Типы данных

### User (из бэкенда)

```typescript
interface User {
  id: string;
  email: string;
  displayName?: string;
  roles: string[]; // ['user'] или ['admin', 'content_manager']
  accessToken: string; // JWT, 12 часов
  refreshToken: string; // JWT, 7 дней
}
```

### Session (для клиента)

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    displayName?: string;
    roles: string[];
  };
  accessToken: string;
  refreshToken: string;
  error?: 'RefreshAccessTokenError';
}
```

### JWT (internal)

```typescript
interface JWT {
  id: string;
  email: string;
  displayName?: string;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number; // Unix timestamp
  error?: 'RefreshAccessTokenError';
}
```

## 🚀 Планы на M1

### 1. Реализовать авторизацию

**Файл:** `lib/auth/config.ts`

- [ ] Реализовать функцию `authorize()` в CredentialsProvider
- [ ] Вызвать `POST /api/auth/login` с credentials
- [ ] Обработать ошибки (400, 401, 429)
- [ ] Вернуть объект User с токенами

### 2. Реализовать JWT callback

**Файл:** `lib/auth/config.ts`

- [ ] При логине сохранить токены в JWT
- [ ] Проверять истечение accessToken
- [ ] Вызывать `refreshAccessToken()` если токен истёк
- [ ] Обрабатывать ошибки refresh

### 3. Реализовать Session callback

**Файл:** `lib/auth/config.ts`

- [ ] Прокидывать данные из JWT в Session
- [ ] Добавить информацию о пользователе и ролях
- [ ] Обрабатывать ошибки refresh

### 4. Реализовать refresh логику

**Файл:** `lib/auth/config.ts`, функция `refreshAccessToken()`

- [ ] Вызвать `POST /api/auth/refresh` с refreshToken
- [ ] Обработать успешный refresh (200)
- [ ] Обработать ошибки (401, 403)
- [ ] Вернуть обновлённый токен или ошибку

### 5. Создать страницы

- [ ] `/[lang]/auth/sign-in/page.tsx` - форма входа
- [ ] `/[lang]/auth/error/page.tsx` - страница ошибок
- [ ] `/[lang]/auth/register/page.tsx` - регистрация (опционально)

### 6. Интегрировать в AppProviders

**Файл:** `providers/AppProviders.tsx`

```typescript
import { SessionProvider } from '@/lib/auth';

export function AppProviders({ children }) {
  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ConfigProvider theme={theme}>{children}</ConfigProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
```

### 7. Защитить админ-маршруты

**Опция 1: Middleware**

```typescript
// middleware.ts
import { auth } from '@/lib/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!req.auth) {
      return NextResponse.redirect(new URL('/en/auth/sign-in', req.url));
    }
  }
});
```

**Опция 2: Layout проверка**

```typescript
// app/admin/[lang]/layout.tsx
import { getCurrentUser, isStaff } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function AdminLayout({ children, params }) {
  const session = await getCurrentUser();

  if (!session) {
    redirect(`/${params.lang}/auth/sign-in`);
  }

  const hasAccess = await isStaff();
  if (!hasAccess) {
    redirect(`/${params.lang}`);
  }

  return <>{children}</>;
}
```

## 📚 Ресурсы

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Backend API Reference](/docs/frontend-agents/backend-api-reference.md)
- [Auth Integration Guide](/docs/frontend-agents/auth-next-auth.md)

## ⚠️ Важные замечания

1. **Rate Limits:** Backend имеет rate limits на auth endpoints:
   - Login: 5 req/min
   - Register: 3 req/5min
   - Refresh: 10 req/min

2. **Token Lifetime:**
   - Access Token: 12 часов
   - Refresh Token: 7 дней

3. **CORS:** Всегда включать `credentials: 'include'` в fetch запросах

4. **Безопасность:**
   - NEXTAUTH_SECRET должен быть уникальным для каждого окружения
   - Никогда не коммитить реальные секреты в git
   - Использовать HTTPS в production

## 🐛 Troubleshooting

### Ошибка: "Invalid Options" в ESLint

Это известная проблема совместимости ESLint v8/v9. Не влияет на сборку проекта.

### Ошибка: "Module 'next-auth' has no exported member..."

Убедитесь, что используете `next-auth@^5.0.0-beta`.

### Warning: "TODO - реализовать в M1"

Это ожидаемое поведение для M0.5. Функциональность будет реализована в M1.
