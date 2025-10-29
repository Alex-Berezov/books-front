# Backend API Reference (Updated)

> **Last Updated:** October 25, 2025  
> **Backend Version:** Production-ready  
> **API Base URL (Production):** `https://api.bibliaris.com/api`  
> **API Base URL (Development):** `http://localhost:5000/api`

---

## ✅ Backend Status (October 25, 2025)

### Production Environment Verified

**All systems operational and ready for frontend development!**

#### Available Resources:

- ✅ **API Base URL:** `https://api.bibliaris.com/api`
- ✅ **Swagger UI:** `https://api.bibliaris.com/docs`
- ✅ **OpenAPI Schema:** `https://api.bibliaris.com/docs-json`
- ✅ **Health Check:** `https://api.bibliaris.com/api/health/liveness`

#### System Health:

```json
{
  "status": "up",
  "uptime": 421.53,
  "timestamp": "2025-10-25T10:39:07.142Z"
}
```

#### Database & Services:

- ✅ PostgreSQL: Connected and responding
- ✅ Redis: Operational
- ✅ Prometheus Metrics: Available
- ✅ Sentry Integration: Active

#### Security:

- ✅ **Swagger in Production:** Enabled for development (can be disabled later)
- ✅ **HTTPS:** Let's Encrypt SSL certificates
- ✅ **CORS:** Configured for frontend domains
- ✅ **Rate Limiting:** Configurable per endpoint

---

## 🌐 Production Environment

### Domain Architecture

- **API Backend:** `https://api.bibliaris.com`
- **Frontend (Future):** `https://bibliaris.com`
- **SSL:** Automatic via Let's Encrypt (Caddy)
- **Reverse Proxy:** Caddy with security headers

### Environment Variables (Frontend)

```env
# Production
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api

# Development
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

---

## 🔒 Authentication & Security

### JWT Token Flow

```typescript
// 1. Login/Register
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}

Response:
{
  "accessToken": "eyJhbGc...", // Valid for 12h
  "refreshToken": "eyJhbGc...", // Valid for 7d
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "displayName": "John Doe",
    "roles": ["user"] // or ["admin", "content_manager"]
  }
}

// 2. Attach to requests
Authorization: Bearer <accessToken>

// 3. Refresh when expired
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}
```

### Token Expiration

- **Access Token:** 12 hours (`JWT_ACCESS_EXPIRES_IN=12h`)
- **Refresh Token:** 7 days (`JWT_REFRESH_EXPIRES_IN=7d`)

### Automatic Refresh Strategy (NextAuth)

```typescript
// In NextAuth jwt callback
async jwt({ token, user, account }) {
  // On login - store tokens
  if (account && user) {
    return {
      ...token,
      accessToken: user.accessToken,
      refreshToken: user.refreshToken,
      accessTokenExpires: Date.now() + 12 * 60 * 60 * 1000, // 12h
    };
  }

  // Token still valid
  if (Date.now() < token.accessTokenExpires) {
    return token;
  }

  // Token expired - refresh
  return refreshAccessToken(token);
}

async function refreshAccessToken(token) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          refreshToken: token.refreshToken,
        }),
      }
    );

    const refreshed = await response.json();

    if (!response.ok) throw refreshed;

    return {
      ...token,
      accessToken: refreshed.accessToken,
      refreshToken: refreshed.refreshToken,
      accessTokenExpires: Date.now() + 12 * 60 * 60 * 1000,
    };
  } catch (error) {
    return {
      ...token,
      error: 'RefreshAccessTokenError',
    };
  }
}
```

---

## 🌍 CORS Configuration

### Allowed Origins (Production)

```bash
CORS_ORIGIN=https://bibliaris.com,http://localhost:3000,http://localhost:3001
CORS_CREDENTIALS=1
```

### Frontend Fetch Configuration

```typescript
// ✅ Correct - with credentials for JWT
fetch('https://api.bibliaris.com/api/users/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  },
  credentials: 'include', // Important for CORS with credentials
});

// ❌ Wrong - missing credentials
fetch('https://api.bibliaris.com/api/users/me', {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### CORS Headers in Response

```
Access-Control-Allow-Origin: https://bibliaris.com
Access-Control-Allow-Credentials: true
Access-Control-Expose-Headers: Content-Length
```

---

## 🗣️ Language & i18n Policy

### URL Structure

```
Public Content (with language):
  /:lang/books/:slug/overview
  /:lang/pages/:slug
  /:lang/categories/:slug/books
  /:lang/tags/:slug/books
  /:lang/seo/resolve

Neutral APIs (no language in path):
  /api/auth/login
  /api/users/me
  /api/books                    ⚠️ Does NOT accept ?language= parameter
  /api/versions/:id
```

### Language Resolution Priority

1. **Path Parameter:** `/:lang` (en|es|fr|pt)
2. **Query Parameter:** `?lang=en`
3. **Accept-Language Header:** `Accept-Language: en-US,en;q=0.9`
4. **Default:** `en` (from `DEFAULT_LANGUAGE=en`)

### Frontend Implementation

```typescript
// For language-prefixed routes
const fetchBookOverview = async (lang: string, slug: string) => {
  const response = await fetch(`${API_BASE_URL}/${lang}/books/${slug}/overview`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return response.json();
};

// For neutral routes with Accept-Language
const fetchBooks = async (lang: string) => {
  const response = await fetch(`${API_BASE_URL}/books`, {
    headers: {
      'Accept-Language': lang,
      Authorization: `Bearer ${accessToken}`, // if authenticated
    },
  });
  return response.json();
};
```

---

## 📊 Rate Limiting

### Global Rate Limits

```bash
RATE_LIMIT_GLOBAL_ENABLED=1
RATE_LIMIT_GLOBAL_MAX=100
RATE_LIMIT_GLOBAL_WINDOW_MS=60000  # 1 minute
```

**Excluded from global limits:**

- `/health/*`
- `/metrics`
- `/api/docs*`

### Auth Endpoints Rate Limits

```typescript
// Stricter limits for authentication
POST /api/auth/login
  - 5 requests per minute per IP

POST /api/auth/register
  - 3 requests per 5 minutes per IP

POST /api/auth/refresh
  - 10 requests per minute per IP
```

### Comments Rate Limits

```typescript
POST /api/comments
  - 10 comments per minute per user
  - Configurable: RATE_LIMIT_COMMENTS_PER_MINUTE=10
```

### Frontend Error Handling

```typescript
const handleApiError = (response: Response) => {
  if (response.status === 429) {
    // Rate limit exceeded
    throw new Error('Too many requests. Please try again later.');
  }
  if (response.status === 401) {
    // Unauthorized - redirect to login
    router.push('/auth/login');
  }
  if (response.status === 403) {
    // Forbidden - insufficient permissions
    throw new Error('You do not have permission to perform this action.');
  }
  // ... other status codes
};
```

---

## 🎯 TypeScript Types Generation

### Backend Command

```bash
# From backend repository
cd /path/to/books-app-back

# Generate types from local API
yarn openapi:types

# Or from production API
yarn openapi:types:prod

# Output: libs/api-client/types.ts
```

### Copy to Frontend

```bash
# From backend repo
cp libs/api-client/types.ts /path/to/frontend/src/types/api-schema.ts
```

### Usage in Frontend

```typescript
import { paths, components } from '@/types/api-schema';

// Extract types
type LoginRequest = paths['/api/auth/login']['post']['requestBody']['content']['application/json'];
type LoginResponse =
  paths['/api/auth/login']['post']['responses']['200']['content']['application/json'];
type UserDto = components['schemas']['UserDto'];
type BookVersionDto = components['schemas']['BookVersionDto'];

// Use in your code
const login = async (credentials: LoginRequest): Promise<LoginResponse> => {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });

  if (!response.ok) {
    throw new Error(`Login failed: ${response.statusText}`);
  }

  return response.json();
};
```

### Automated Type Updates (CI/CD)

```yaml
# In your frontend CI pipeline
- name: Update API types
  run: |
    curl https://api.bibliaris.com/api/docs-json -o api-schema.json
    npx openapi-typescript api-schema.json -o src/types/api-schema.ts
```

---

## 📦 Pagination

### Standard Pagination Parameters

```typescript
interface PaginationParams {
  page?: number;    // Default: 1
  limit?: number;   // Default: 10-50 (depends on endpoint)
}

interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Example
GET /api/books?page=1&limit=20
```

### React Query Example

```typescript
import { useQuery } from '@tanstack/react-query';

const useBooks = (page: number, limit: number) => {
  return useQuery({
    queryKey: ['books', { page, limit }],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/books?page=${page}&limit=${limit}`, {
        headers: {
          'Accept-Language': currentLang,
        },
      });
      return response.json();
    },
  });
};
```

---

## 🏥 Health & Monitoring

### Health Check Endpoints

```typescript
// Basic liveness check
GET /api/health/liveness
Response: { "status": "up", "uptime": 12345.67, "timestamp": "2025-10-18T12:00:00.000Z" }

// Detailed readiness check (includes DB, Redis if configured)
GET /api/health/readiness
Response: {
  "status": "up",
  "info": {
    "prisma": { "status": "up", "ping": 2 },
    "redis": { "status": "up" } // if configured
  },
  "error": {},
  "details": { ... }
}

// Prometheus metrics
GET /api/metrics
Response: Plain text metrics in Prometheus format
```

### Frontend Health Monitoring

```typescript
// Periodic health check
const useApiHealth = () => {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: async () => {
      const response = await fetch(`${API_BASE_URL}/health/liveness`);
      return response.json();
    },
    refetchInterval: 60000, // Check every minute
    retry: 3,
  });
};
```

---

## 🔐 Role-Based Access Control (RBAC)

### Available Roles

```typescript
enum RoleName {
  USER = 'user', // Default role for all users
  ADMIN = 'admin', // Full access
  CONTENT_MANAGER = 'content_manager', // Content creation/editing
}
```

### Role Assignment

**Admin Roles** (configured via environment):

```bash
ADMIN_EMAILS=admin@bibliaris.com,owner@bibliaris.com
CONTENT_MANAGER_EMAILS=editor@bibliaris.com,writer@bibliaris.com
```

**Database Roles** (assigned via API):

```typescript
POST /api/users/:id/roles/:role   // Add role
DELETE /api/users/:id/roles/:role  // Remove role
GET /api/users/:id/roles           // List user roles
```

### Frontend Role Checking

```typescript
import { useSession } from 'next-auth/react';

const AdminOnly = ({ children }) => {
  const { data: session } = useSession();

  const isAdmin = session?.user?.roles?.includes('admin');

  if (!isAdmin) {
    return <div>Access Denied</div>;
  }

  return <>{children}</>;
};

// Usage
<AdminOnly>
  <AdminPanel />
</AdminOnly>
```

---

## 📝 Common Patterns & Best Practices

### 1. Error Handling

```typescript
class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: any
  ) {
    super(message);
  }
}

const apiClient = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new ApiError(response.status, error.message || 'API request failed', error);
  }

  return response.json();
};
```

### 2. Request Interceptor (Authorization)

```typescript
import { getSession } from 'next-auth/react';

const authenticatedFetch = async (url: string, options?: RequestInit) => {
  const session = await getSession();

  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      ...(session?.accessToken && {
        Authorization: `Bearer ${session.accessToken}`,
      }),
    },
  });
};
```

### 3. React Query Setup

```typescript
// app/providers.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 1 minute
      cacheTime: 5 * 60 * 1000, // 5 minutes
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
});

export const Providers = ({ children }) => (
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
);
```

---

## 🔍 Debugging

### Enable Verbose Logging

```typescript
// Add to your API client
if (process.env.NODE_ENV === 'development') {
  console.log('API Request:', {
    url,
    method,
    headers,
    body,
  });
}
```

### Check Network Tab

1. Open Chrome DevTools → Network
2. Filter by `api.bibliaris.com`
3. Check:
   - **Status Code:** Should be 2xx for success
   - **Response Headers:** Verify CORS headers
   - **Request Headers:** Verify Authorization token
   - **Response Body:** Check for error messages

### Common Issues

| Issue                 | Solution                                       |
| --------------------- | ---------------------------------------------- |
| CORS error            | Check `CORS_ORIGIN` includes your frontend URL |
| 401 Unauthorized      | Token expired - implement refresh logic        |
| 429 Too Many Requests | Implement exponential backoff                  |
| 404 Not Found         | Verify API endpoint path                       |
| 500 Server Error      | Check backend logs: `docker compose logs app`  |

---

## 📚 Additional Resources

- **Full API Endpoints:** See `docs/ENDPOINTS.md`
- **OpenAPI Schema:** `https://api.bibliaris.com/docs-json`
- **Swagger UI:** `https://api.bibliaris.com/docs`
- **Health Check:** `https://api.bibliaris.com/api/health/readiness`
- **Metrics:** `https://api.bibliaris.com/metrics`

---

## 📋 Complete Admin Endpoints (for M3 - Admin MVP)

### Books Management

#### Create Book

```http
POST /api/books
Authorization: Bearer {token}

{
  "slug": "harry-potter"  // lowercase, alphanumeric with hyphens
}

Response 201:
{
  "id": "uuid",
  "slug": "harry-potter",
  "createdAt": "2025-10-25T10:00:00.000Z",
  "updatedAt": "2025-10-25T10:00:00.000Z"
}
```

#### List All Books

```http
GET /api/books?page=1&limit=10
Authorization: Bearer {token}
⚠️  IMPORTANT: Do NOT include language parameter
❌  GET /api/books?language=en  (will return 400 Bad Request)
✅  GET /api/books?page=1&limit=20  (correct)

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "slug": "harry-potter",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "hasNext": false
}
```

#### Get Book by ID

```http
GET /api/books/{id}
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "slug": "harry-potter",
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### Update Book

```http
PATCH /api/books/{id}
Authorization: Bearer {token}

{
  "slug": "harry-potter-updated"
}

Response 200: (updated book)
```

#### Delete Book

```http
DELETE /api/books/{id}
Authorization: Bearer {token}

Response 200: { success: true }
```

---

### Book Versions Management

#### Create Book Version (Draft)

```http
POST /api/books/{bookId}/versions
Authorization: Bearer {token}

{
  "language": "en",  // en|es|fr|pt
  "title": "Harry Potter and the Philosopher's Stone",
  "author": "J.K. Rowling",
  "description": "First book of the series",
  "coverImageUrl": "https://cdn.example.com/covers/hp1.jpg",
  "type": "text",  // text|audio|referral
  "isFree": true,
  "referralUrl": "https://amazon.com/ref123",  // optional
  "seoMetaTitle": "Harry Potter — Summary",  // optional
  "seoMetaDescription": "Overview, themes and details"  // optional
}

Response 201:
{
  "id": "version-uuid",
  "bookId": "book-uuid",
  "language": "en",
  "title": "...",
  "author": "...",
  "status": "draft",  // always draft on creation
  "publishedAt": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

#### List Versions for Book (Public)

```http
GET /api/books/{bookId}/versions?language=en&type=text&isFree=true
Accept-Language: en-US,es;q=0.9

Response 200: Array of published versions
```

#### List Versions for Book (Admin - includes drafts)

```http
GET /api/admin/{lang}/books/{bookId}/versions?language=en&type=text&includeDrafts=true
Authorization: Bearer {token}
X-Admin-Language: en

Response 200: Array of all versions (published + draft)
```

#### Get Version by ID

```http
GET /api/versions/{id}
Authorization: Bearer {token}

Response 200:
{
  "id": "uuid",
  "bookId": "uuid",
  "language": "en",
  "title": "...",
  "author": "...",
  "description": "...",
  "coverImageUrl": "...",
  "type": "text",
  "isFree": true,
  "status": "draft",  // draft|published
  "publishedAt": null,
  "createdAt": "...",
  "updatedAt": "...",
  "seo": {
    "metaTitle": "...",
    "metaDescription": "..."
  }
}
```

#### Update Version

```http
PATCH /api/versions/{id}
Authorization: Bearer {token}

{
  "title": "Updated Title",
  "description": "Updated description",
  "seoMetaTitle": "New SEO title"
}

Response 200: (updated version)
```

#### Publish Version

```http
PATCH /api/versions/{id}/publish
Authorization: Bearer {token}

Response 200:
{
  ...version,
  "status": "published",
  "publishedAt": "2025-10-25T13:00:00.000Z"
}
```

#### Unpublish Version (Set to Draft)

```http
PATCH /api/versions/{id}/unpublish
Authorization: Bearer {token}

Response 200:
{
  ...version,
  "status": "draft",
  "publishedAt": null
}
```

#### Delete Version

```http
DELETE /api/versions/{id}
Authorization: Bearer {token}

Response 204: (no content)
```

---

### Chapters Management (Text)

#### List Chapters

```http
GET /api/versions/{bookVersionId}/chapters?page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "bookVersionId": "uuid",
      "number": 1,
      "title": "Chapter 1. The Boy Who Lived",
      "content": "Once upon a time...",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 10,
  "hasNext": false
}
```

#### Create Chapter

```http
POST /api/versions/{bookVersionId}/chapters
Authorization: Bearer {token}

{
  "number": 1,
  "title": "Chapter 1. The Boy Who Lived",
  "content": "Once upon a time..."
}

Response 201: (created chapter)
```

#### Update Chapter

```http
PATCH /api/chapters/{id}
Authorization: Bearer {token}

{
  "title": "Updated title",
  "content": "Updated content"
}

Response 200: (updated chapter)
```

#### Delete Chapter

```http
DELETE /api/chapters/{id}
Authorization: Bearer {token}

Response 204: (no content)
```

---

### Categories Management

#### List Categories

```http
GET /api/categories?page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "type": "genre",  // genre|author|popular|etc
      "name": "Fantasy",
      "slug": "fantasy",
      "parentId": null,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 5,
  "hasNext": false
}
```

#### Get Categories Tree

```http
GET /api/categories/tree

Response 200: [
  {
    "id": "uuid",
    "name": "Fantasy",
    "slug": "fantasy",
    "type": "genre",
    "parentId": null,
    "children": [
      {
        "id": "uuid2",
        "name": "Urban Fantasy",
        "slug": "urban-fantasy",
        "type": "genre",
        "parentId": "uuid",
        "children": []
      }
    ]
  }
]
```

#### Create Category

```http
POST /api/categories
Authorization: Bearer {token}

{
  "type": "genre",
  "name": "Fantasy",
  "slug": "fantasy",
  "parentId": null  // optional, for nested categories
}

Response 201: (created category)
```

#### Update Category

```http
PATCH /api/categories/{id}
Authorization: Bearer {token}

{
  "name": "Updated Fantasy",
  "slug": "updated-fantasy"
}

Response 200: (updated category)
```

#### Attach Category to Book Version

```http
POST /api/versions/{id}/categories
Authorization: Bearer {token}

{
  "categoryId": "category-uuid"
}

Response 201: (success)
```

#### Detach Category from Book Version

```http
DELETE /api/versions/{id}/categories/{categoryId}
Authorization: Bearer {token}

Response 204: (no content)
```

---

### Tags Management

#### List Tags

```http
GET /api/tags?page=1&limit=20
Authorization: Bearer {token}

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "name": "Motivation",
      "slug": "motivation",
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 3,
  "hasNext": false
}
```

#### Create Tag

```http
POST /api/tags
Authorization: Bearer {token}

{
  "name": "Motivation",
  "slug": "motivation"
}

Response 201: (created tag)
```

#### Update Tag

```http
PATCH /api/tags/{id}
Authorization: Bearer {token}

{
  "name": "Updated Tag"
}

Response 200: (updated tag)
```

#### Attach Tag to Book Version

```http
POST /api/versions/{id}/tags
Authorization: Bearer {token}

{
  "tagId": "tag-uuid"
}

Response 201: (success)
```

#### Detach Tag from Book Version

```http
DELETE /api/versions/{id}/tags/{tagId}
Authorization: Bearer {token}

Response 204: (no content)
```

---

### Media & Uploads

#### One-Step Upload (Recommended)

```http
POST /api/media/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

file: [binary file data]
type: "cover"  // or "audio"

Response 201:
{
  "id": "uuid",
  "key": "covers/2025/10/25/uuid.jpg",
  "url": "https://api.bibliaris.com/static/covers/2025/10/25/uuid.jpg",
  "contentType": "image/jpeg",
  "size": 1048576,
  "width": 1920,
  "height": 1080,
  "createdAt": "..."
}
```

#### Two-Step Upload (Advanced)

```http
# 1. Get presigned URL
POST /api/uploads/presign
Authorization: Bearer {token}

{
  "type": "cover",
  "contentType": "image/jpeg",
  "size": 1048576
}

Response 201:
{
  "token": "upload-token-xxx",
  "uploadUrl": "https://api.bibliaris.com/api/uploads/direct",
  "key": "covers/2025/10/25/uuid.jpg"
}

# 2. Upload file
POST {uploadUrl}
X-Upload-Token: {token}
Content-Type: image/jpeg
[binary file data]

Response 201: { success: true }

# 3. Confirm upload
POST /api/uploads/confirm?key={key}
Authorization: Bearer {token}

Response 201:
{
  "url": "https://api.bibliaris.com/static/covers/2025/10/25/uuid.jpg"
}
```

---

### Users & Roles Management

#### List Users (Admin Only)

```http
GET /api/users?page=1&limit=10&staff=only&q=john
Authorization: Bearer {token}

staff: "only" | "exclude" | undefined
q: search by email or name

Response 200:
{
  "items": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "displayName": "John Doe",
      "roles": ["user", "admin"],
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "page": 1,
  "limit": 10,
  "total": 1,
  "hasNext": false
}
```

#### Get User by ID (Admin Only)

```http
GET /api/users/{id}
Authorization: Bearer {token}

Response 200: (user object)
```

#### Assign Role to User (Admin Only)

```http
POST /api/users/{id}/roles/{role}
Authorization: Bearer {token}

role: "user" | "admin" | "content_manager"

Response 201: (success)
```

#### Revoke Role from User (Admin Only)

```http
DELETE /api/users/{id}/roles/{role}
Authorization: Bearer {token}

Response 200: (success)
```

---

## 🔧 Testing Endpoints with Swagger UI

### Access Swagger

👉 **URL:** https://api.bibliaris.com/docs

### Steps to Test Admin Endpoints:

1. **Login to get token:**
   - Open `POST /auth/login`
   - Click "Try it out"
   - Enter credentials
   - Copy `accessToken` from response

2. **Authorize in Swagger:**
   - Click "Authorize" button (top right)
   - Enter: `Bearer {your-access-token}`
   - Click "Authorize"

3. **Test Endpoints:**
   - All admin endpoints will now include auth token
   - Try creating a book, version, categories, etc.

---

## 🐛 Common API Issues & Solutions

### Books API Error Fixes

**Problem:** `400 Bad Request - property language should not exist`

**Solution:**
```typescript
// ❌ WRONG - Adds language parameter
const response = await fetch('/api/books?page=1&limit=20&language=en');

// ✅ CORRECT - No language parameter  
const response = await fetch('/api/books?page=1&limit=20');
```

**Workflow for Language-Specific Data:**
```typescript
// Option 1: Two requests (recommended)
// 1. Get books list (containers)
const booksResponse = await fetch('/api/books?page=1&limit=20');
const { data: books } = await booksResponse.json();

// 2. Get versions for each book by language
const booksWithVersions = await Promise.all(
  books.map(async (book) => {
    const versionsResponse = await fetch(
      `/api/books/${book.id}/versions?language=en&type=text`
    );
    const versions = await versionsResponse.json();
    return { ...book, versions };
  })
);
```

**Fixed:** October 29, 2025 - Removed `language` parameter from `getBooks()` function

---

**For detailed endpoint documentation, refer to:**

- `docs/docs-front/frontend-agents/api-cheatsheet.md`
- `docs/ENDPOINTS.md` (comprehensive list with examples)
- **Swagger UI:** https://api.bibliaris.com/docs
