# Backend API Reference (Updated)

> **Last Updated:** October 18, 2025  
> **Backend Version:** Production-ready  
> **API Base URL (Production):** `https://api.bibliaris.com/api`  
> **API Base URL (Development):** `http://localhost:5000/api`

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
  /api/books
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
    public details?: any,
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
- **OpenAPI Schema:** `https://api.bibliaris.com/api/docs-json`
- **Health Check:** `https://api.bibliaris.com/api/health/readiness`
- **Metrics:** `https://api.bibliaris.com/api/metrics`

---

**For detailed endpoint documentation, refer to:**

- `docs/docs-front/frontend-agents/api-cheatsheet.md`
- `docs/ENDPOINTS.md` (comprehensive list with examples)
