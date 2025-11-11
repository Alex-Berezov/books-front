# HTTP Client Module

Module for working with Backend API of Bibliaris project.

## 📋 Features

- ✅ Automatic base URL setup from environment variables
- ✅ `Authorization` header support (Bearer token)
- ✅ `Accept-Language` header support for multilingual functionality
- ✅ Typed error handling through `ApiError` class
- ✅ JSON by default for all requests
- ✅ Full TypeScript typing

## 🔧 Configuration

### Environment Variables

```env
# Production
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api

# Development
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

## 📚 Usage

### Import

```typescript
import { httpGet, httpPost, httpPatch, httpPut, httpDelete } from '@/lib/http';
import { ApiError } from '@/types/api';
```

### Request Examples

#### GET Request

```typescript
// Simple GET request
const books = await httpGet<Book[]>('/en/books');

// GET with authorization
const user = await httpGet<User>('/users/me', {
  accessToken: session.accessToken,
});

// GET with language
const page = await httpGet<Page>('/en/pages/about', {
  language: 'en',
});
```

#### POST Request

```typescript
// User login
const authResponse = await httpPost<AuthResponse>('/auth/login', {
  email: 'user@example.com',
  password: 'SecurePassword123!',
});

// Create comment with authorization
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

#### PATCH Request

```typescript
// Update profile
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

#### PUT Request

```typescript
// Save reading progress
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

#### DELETE Request

```typescript
// Remove book from bookshelf
await httpDelete('/me/bookshelf/version-id', {
  accessToken: session.accessToken,
});
```

### Usage in Server Components

```typescript
// app/[lang]/books/[slug]/page.tsx
import { httpGet, buildLangPath } from '@/lib/http';

export default async function BookPage({
  params,
}: {
  params: { lang: SupportedLang; slug: string };
}) {
  const { lang, slug } = params;

  // Request with automatic language substitution
  const endpoint = buildLangPath(lang, `/books/${slug}/overview`);
  const bookData = await httpGet<BookOverview>(endpoint, {
    language: lang,
  });

  return <BookDetails book={bookData} />;
}
```

### Usage in Client Components with React Query

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

## ⚠️ Error Handling

### ApiError Class

```typescript
import { ApiError } from '@/types/api';

try {
  const user = await httpGet<User>('/users/me', {
    accessToken: session.accessToken,
  });
} catch (error) {
  if (error instanceof ApiError) {
    // Check error type
    if (error.isUnauthorized()) {
      // 401 - authorization required
      redirect('/auth/sign-in');
    } else if (error.isForbidden()) {
      // 403 - access denied
      return <AccessDenied />;
    } else if (error.isNotFound()) {
      // 404 - resource not found
      notFound();
    } else if (error.isRateLimited()) {
      // 429 - rate limit exceeded
      return <RateLimitError />;
    } else if (error.isValidationError()) {
      // 400 - validation error
      console.log('Validation errors:', error.details);
    }

    // Access error data
    console.error('API Error:', {
      message: error.message,
      statusCode: error.statusCode,
      error: error.error,
      details: error.details,
    });
  }
}
```

### Error Handling in Server Components

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
      notFound(); // Will display app/not-found.tsx
    }
    throw error; // Other errors will go to error.tsx
  }
}
```

## 🛠 Helper Utilities

### buildUrlWithParams

Building URL with query parameters:

```typescript
import { buildUrlWithParams } from '@/lib/http';

const url = buildUrlWithParams('/books', {
  page: 1,
  limit: 20,
  type: 'text',
  isFree: true,
});
// Result: '/books?page=1&limit=20&type=text&isFree=true'

// Undefined values are ignored
const url2 = buildUrlWithParams('/books', {
  page: 1,
  category: undefined, // will be skipped
});
// Result: '/books?page=1'
```

### buildLangPath

Adding language prefix to path:

```typescript
import { buildLangPath } from '@/lib/http';

const endpoint = buildLangPath('en', '/books/some-slug/overview');
// Result: '/en/books/some-slug/overview'

const endpoint2 = buildLangPath('es', 'pages/about');
// Result: '/es/pages/about'
```

## 📝 Types

### HttpRequestOptions

```typescript
interface HttpRequestOptions extends RequestInit {
  /** Bearer token for authorization */
  accessToken?: string;
  /** Language for Accept-Language header */
  language?: string;
}
```

### ApiErrorResponse

```typescript
interface ApiErrorResponse {
  /** Error message */
  message: string;
  /** HTTP status code */
  statusCode: number;
  /** Error type (optional) */
  error?: string;
  /** Validation details (for 400 errors) */
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

## 🔐 Authorization

### Getting accessToken from NextAuth Session

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

## 🌍 Multilingual Support

HTTP client supports `Accept-Language` header for requests to multilingual endpoints:

```typescript
// Request content in Spanish
const page = await httpGet<Page>('/es/pages/about', {
  language: 'es', // Sets header Accept-Language: es
});

// For neutral endpoints (without /:lang in path)
const user = await httpGet<User>('/users/me', {
  accessToken: session.accessToken,
  language: 'fr', // Backend will return data with language consideration where applicable
});
```

## 🔗 See Also

- [HTTP Constants](./http.constants.ts) - Constants for HTTP client
- [API Cheatsheet](../../docs/frontend-agents/api-cheatsheet.md)
- [Backend API Reference](../../docs/frontend-agents/backend-api-reference.md)
- [Data Fetching and Types](../../docs/frontend-agents/data-fetching-and-types.md)
