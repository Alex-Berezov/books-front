# HTTP Client Module

Модуль для работы с Backend API проекта Bibliaris.

## 📋 Возможности

- ✅ Автоматическая установка базового URL из переменных окружения
- ✅ Поддержка `Authorization` заголовка (Bearer token)
- ✅ Поддержка `Accept-Language` заголовка для мультиязычности
- ✅ Типизированная обработка ошибок через класс `ApiError`
- ✅ JSON по умолчанию для всех запросов
- ✅ Полная типизация TypeScript

## 🔧 Конфигурация

### Переменные окружения

```env
# Production
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api

# Development
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## 📚 Использование

### Импорт

```typescript
import { httpGet, httpPost, httpPatch, httpPut, httpDelete } from '@/lib/http';
import { ApiError } from '@/types/api';
```

### Примеры запросов

#### GET запрос

```typescript
// Простой GET запрос
const books = await httpGet<Book[]>('/en/books');

// GET с авторизацией
const user = await httpGet<User>('/users/me', {
  accessToken: session.accessToken,
});

// GET с языком
const page = await httpGet<Page>('/en/pages/about', {
  language: 'en',
});
```

#### POST запрос

```typescript
// Логин пользователя
const authResponse = await httpPost<AuthResponse>('/auth/login', {
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

// Создание комментария с авторизацией
const comment = await httpPost<Comment>(
  '/comments',
  {
    text: 'Great book!',
    bookVersionId: 'version-uuid',
  },
  {
    accessToken: session.accessToken,
  }
);
```

#### PATCH запрос

```typescript
// Обновление профиля
const updatedUser = await httpPatch<User>(
  '/users/me',
  {
    name: 'New Name',
    languagePreference: 'es',
  },
  {
    accessToken: session.accessToken,
  }
);
```

#### PUT запрос

```typescript
// Сохранение прогресса чтения
const progress = await httpPut<ReadingProgress>(
  '/me/progress/version-id',
  {
    chapterNumber: 5,
    position: 1234,
  },
  {
    accessToken: session.accessToken,
  }
);
```

#### DELETE запрос

```typescript
// Удаление книги из полки
await httpDelete('/me/bookshelf/version-id', {
  accessToken: session.accessToken,
});
```

### Использование в Server Components

```typescript
// app/[lang]/books/[slug]/page.tsx
import { httpGet, buildLangPath } from '@/lib/http';

export default async function BookPage({
  params,
}: {
  params: { lang: SupportedLang; slug: string };
}) {
  const { lang, slug } = params;

  // Запрос с автоматической подстановкой языка
  const endpoint = buildLangPath(lang, `/books/${slug}/overview`);
  const bookData = await httpGet<BookOverview>(endpoint, {
    language: lang,
  });

  return <BookDetails book={bookData} />;
}
```

### Использование в Client Components с React Query

```typescript
// components/BooksList.tsx
'use client';

import { useQuery } from '@tanstack/react-query';
import { httpGet, buildUrlWithParams } from '@/lib/http';

export const BooksList = ({ lang }: { lang: SupportedLang }) => {
  const { data, error, isLoading } = useQuery({
    queryKey: ['books', lang, { page: 1, limit: 20 }],
    queryFn: async () => {
      const endpoint = buildUrlWithParams(`/${lang}/books`, {
        page: 1,
        limit: 20,
      });
      return httpGet<PaginatedResponse<Book>>(endpoint, {
        language: lang,
      });
    },
  });

  if (isLoading) return <Spinner />;
  if (error) return <ErrorMessage error={error} />;

  return <BooksGrid books={data.data} />;
};
```

## ⚠️ Обработка ошибок

### Класс ApiError

```typescript
import { ApiError } from '@/types/api';

try {
  const user = await httpGet<User>('/users/me', {
    accessToken: session.accessToken,
  });
} catch (error) {
  if (error instanceof ApiError) {
    // Проверка типа ошибки
    if (error.isUnauthorized()) {
      // 401 - требуется авторизация
      redirect('/auth/sign-in');
    } else if (error.isForbidden()) {
      // 403 - нет прав доступа
      return <AccessDenied />;
    } else if (error.isNotFound()) {
      // 404 - ресурс не найден
      notFound();
    } else if (error.isRateLimited()) {
      // 429 - превышен лимит запросов
      return <RateLimitError />;
    } else if (error.isValidationError()) {
      // 400 - ошибка валидации
      console.log('Validation errors:', error.details);
    }

    // Доступ к данным ошибки
    console.error('API Error:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      details: error.details,
    });
  }
}
```

### Обработка в Server Components

```typescript
// app/[lang]/books/[slug]/page.tsx
import { notFound } from 'next/navigation';
import { ApiError } from '@/types/api';

export default async function BookPage({ params }: PageProps) {
  try {
    const book = await httpGet<Book>(`/${params.lang}/books/${params.slug}`);
    return <BookDetails book={book} />;
  } catch (error) {
    if (error instanceof ApiError && error.isNotFound()) {
      notFound(); // Отобразит app/not-found.tsx
    }
    throw error; // Другие ошибки пойдут в error.tsx
  }
}
```

## 🛠 Вспомогательные утилиты

### buildUrlWithParams

Создание URL с query параметрами:

```typescript
import { buildUrlWithParams } from '@/lib/http';

const url = buildUrlWithParams('/books', {
  page: 1,
  limit: 20,
  type: 'text',
  isFree: true,
});
// Результат: '/books?page=1&limit=20&type=text&isFree=true'

// Undefined значения игнорируются
const url2 = buildUrlWithParams('/books', {
  page: 1,
  category: undefined, // будет пропущен
});
// Результат: '/books?page=1'
```

### buildLangPath

Добавление языкового префикса к пути:

```typescript
import { buildLangPath } from '@/lib/http';

const endpoint = buildLangPath('en', '/books/some-slug/overview');
// Результат: '/en/books/some-slug/overview'

const endpoint2 = buildLangPath('es', 'pages/about');
// Результат: '/es/pages/about'
```

## 📝 Типы

### HttpRequestOptions

```typescript
interface HttpRequestOptions extends RequestInit {
  /** Bearer токен для авторизации */
  accessToken?: string;
  /** Язык для Accept-Language заголовка */
  language?: string;
}
```

### ApiErrorResponse

```typescript
interface ApiErrorResponse {
  /** Сообщение об ошибке */
  message: string;
  /** HTTP статус код */
  statusCode: number;
  /** Тип ошибки (опционально) */
  error?: string;
  /** Детали валидации (для 400 ошибок) */
  details?: Array<{
    field: string;
    message: string;
  }>;
}
```

### PaginatedResponse

```typescript
interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

## 🔐 Авторизация

### Получение accessToken из NextAuth сессии

```typescript
// Server Component
import { auth } from '@/lib/auth/auth';

export default async function ProtectedPage() {
  const session = await auth();

  if (!session) {
    redirect('/auth/sign-in');
  }

  const data = await httpGet<UserData>('/protected-endpoint', {
    accessToken: session.accessToken,
  });

  return <div>{/* ... */}</div>;
}
```

```typescript
// Client Component
'use client';

import { useSession } from 'next-auth/react';

export const ProtectedComponent = () => {
  const { data: session } = useSession();

  const fetchData = async () => {
    if (!session?.accessToken) return;

    const data = await httpGet<UserData>('/protected-endpoint', {
      accessToken: session.accessToken,
    });
  };

  // ...
};
```

## 🌍 Мультиязычность

HTTP клиент поддерживает заголовок `Accept-Language` для запросов к мультиязычным эндпоинтам:

```typescript
// Запрос контента на испанском
const page = await httpGet<Page>('/es/pages/about', {
  language: 'es', // Устанавливает заголовок Accept-Language: es
});

// Для нейтральных эндпоинтов (без /:lang в пути)
const user = await httpGet<User>('/users/me', {
  accessToken: session.accessToken,
  language: 'fr', // Backend вернет данные с учетом языка где применимо
});
```

## 🔗 См. также

- [HTTP Constants](./http.constants.ts) - Константы для HTTP клиента
- [API Cheatsheet](../../docs/frontend-agents/api-cheatsheet.md)
- [Backend API Reference](../../docs/frontend-agents/backend-api-reference.md)
- [Data Fetching and Types](../../docs/frontend-agents/data-fetching-and-types.md)
