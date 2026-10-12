# HTTP Client Module

Module for working with Backend API of Bibliaris project.

## 📋 Features

- ✅ Automatic base URL setup from environment variables
- ✅ Signed-in browser requests go through the server proxy `/api/backend` — the browser holds no token (`LEGACY-465`)
- ✅ `Authorization` header (Bearer token) for server-side calls that pass the token explicitly
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
// Public endpoints, any context
import { httpGet, httpPost, httpPatch, httpPut, httpDelete } from '@/lib/http';
// Endpoints of a signed-in user (browser): proxy route, 401 retry, sign-out on a dead session
import {
  httpGetAuth,
  httpPostAuth,
  httpPatchAuth,
  httpPutAuth,
  httpDeleteAuth,
} from '@/lib/http-client';
import { ApiError } from '@/types/api';
```

🔴 **The browser has no access token.** Neither `accessToken` nor `refreshToken` is in the
session that `/api/auth/session` hands to the browser (`LEGACY-446`, `LEGACY-465`). A request of a
signed-in user from the browser is a `http*Auth` call: it goes to the server proxy
`app/api/backend/[...path]/route.ts`, which reads the token from the encrypted session cookie and
adds `Authorization` itself. Uploads (`FormData`, presigned direct upload) and file downloads go
through the same proxy. Do not read a token from `useSession()` — there is none.

### Request Examples

#### GET Request

```typescript
// Simple GET request
const books = await httpGet<Book[]>('/en/books');

// GET of a signed-in user (browser) — through the server proxy, no token in the browser
const user = await httpGetAuth<User>('/users/me');

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

// Create comment as the signed-in user
const comment = await httpPostAuth<Comment>('/comments', {
  text: 'Great book!',
  bookVersionId: 'version-uuid',
});
```

#### PATCH Request

```typescript
// Update profile
const updatedUser = await httpPatchAuth<User>('/users/me', {
  name: 'New Name',
  languagePreference: 'es',
});
```

#### PUT Request

```typescript
// Save reading progress
const progress = await httpPutAuth<ReadingProgress>('/me/progress/version-id', {
  chapterNumber: 5,
  position: 1234,
});
```

#### DELETE Request

```typescript
// Remove book from bookshelf
await httpDeleteAuth<void>('/me/bookshelf/version-id');
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
  const user = await httpGetAuth<User>('/users/me');
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
  /** Bearer token — only for a server-side call with the token read from the session cookie */
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

### Browser: through the server proxy

`http*Auth` picks the route (`resolveAuthRoute` in `lib/http-client/methods.ts`):

- a signed-in user (`requireAuth`, `optionalAuth` with a live session, `FormData` bodies) — the
  proxy `/api/backend`, no `Authorization` from the browser; the proxy adds the token from the
  session cookie and the visitor country (`X-Visitor-Country`) for the geo block;
- no live session with `requireAuth` — 401 before the network; with `optionalAuth` — anonymous,
  straight to the API;
- after a 401 from the proxy the client takes a fresh session past its cache
  (`/api/auth/session` renews the token in the cookie) and retries once; a dead session
  (`isLiveSession` in `lib/http-client/auth.ts`) signs out.

Requests outside `http*` (XHR uploads with progress, file downloads) use `backendProxyUrl()`
and `BACKEND_PROXY_REQUEST_HEADERS` from `lib/http.ts` after `requireLiveSession()`.

### Server: explicit token from the cookie

`http*Auth` with `requireAuth` on the server fails before the network
(`ServerContextAuthUnavailable`, `LEGACY-140`). A server-side call that needs the user's token reads
it from the session cookie with `getToken` (see `getServerAccessToken` in
`lib/auth/session-utils.ts`) and passes it explicitly:

```typescript
const accessToken = await getServerAccessToken();
if (!accessToken) redirect('/auth/sign-in');

const data = await httpGet<UserData>('/protected-endpoint', { accessToken });
```

## 🌍 Multilingual Support

HTTP client supports `Accept-Language` header for requests to multilingual endpoints:

```typescript
// Request content in Spanish
const page = await httpGet<Page>('/es/pages/about', {
  language: 'es', // Sets header Accept-Language: es
});

// For neutral endpoints (without /:lang in path)
const user = await httpGetAuth<User>('/users/me', {
  language: 'fr', // Backend will return data with language consideration where applicable
});
```

## 🔗 See Also

- [HTTP Constants](./http.constants.ts) - Constants for HTTP client
- Backend endpoints: `books-app-docs/backend/api/endpoints.md` (via `endpoints.index.md`)
- Response contracts and `types/api-schema/` layout: `books-app-docs/ai-context/api-contracts.md`, `books-app-docs/ai-context/frontend.md`
