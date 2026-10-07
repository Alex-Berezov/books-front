# NextAuth Authorization Module

> NextAuth v5 for Bibliaris: Credentials + Google + Facebook, JWT/session callbacks, token auto-refresh, sign-in/register pages, route protection in `middleware.ts`. Systemic context: `books-app-docs/ai-context/auth-and-permissions.md`.

## 📁 Structure

```
lib/auth/
├── auth.ts              # NextAuth v5 instance (auth, signIn, signOut, handlers)
├── config.ts            # NextAuth configuration with providers and callbacks
├── helpers.ts           # Utilities for working with session on server
└── README.md            # This documentation

app/api/auth/[...nextauth]/
└── route.ts             # API Route Handler for NextAuth

types/
└── next-auth.d.ts       # NextAuth type extensions (User, Session, JWT)
```

## 🎯 Current Status

**✅ Fully implemented** (project published):

- NextAuth v5 instance (`auth`, `signIn`, `signOut`, `handlers`)
- Types for User, Session, JWT (with roles, tokens)
- Credentials Provider with full `authorize()` against `POST /auth/login`
- Google + Facebook OAuth providers (sync via `POST /auth/social`)
- JWT + Session callbacks with automatic token refresh (`refreshAccessToken`)
- API Route Handler (`/api/auth/*`)
- SessionProvider integrated into `AppProviders`
- Server helpers (`getCurrentUser`, `isStaff`, `hasRole`)
- Sign-in / register / error pages
- Middleware protecting admin + private routes (`/read`, `/listen`, `/summary`)

## 🔧 Usage

### Server Components

```typescript
import { getCurrentUser, isStaff } from '@/lib/auth/helpers';

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

### Client Components

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

## 📝 Configuration

### Environment Variables

```env
# .env.local
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here

# API Backend
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
```

### Generate NEXTAUTH_SECRET

```bash
openssl rand -base64 32
```

## 🔒 Data Types

### User (from backend)

```typescript
interface User {
  id: string;
  email: string;
  name?: string | null;
  roles: string[]; // ['user'] or ['admin', 'content_manager']
  accessToken: string; // JWT, 12 hours
  refreshToken: string; // JWT, 7 days
}
```

### Session (for client)

```typescript
interface Session {
  user: {
    id: string;
    email: string;
    name?: string | null;
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
  name?: string | null;
  roles: string[];
  accessToken: string;
  refreshToken: string;
  accessTokenExpires: number; // Unix timestamp
  error?: 'RefreshAccessTokenError';
}
```

## 📋 Implementation reference (historical)

> The steps below are all **implemented**. Kept as a reference of what was built.

### 1. Implement Authorization

**File:** `lib/auth/config.ts`

- [ ] Implement `authorize()` function in CredentialsProvider
- [ ] Call `POST /api/auth/login` with credentials
- [ ] Handle errors (400, 401, 429)
- [ ] Return User object with tokens

### 2. Implement JWT Callback

**File:** `lib/auth/config.ts`

- [ ] Save tokens in JWT on login
- [ ] Check accessToken expiration
- [ ] Call `refreshAccessToken()` if token expired
- [ ] Handle refresh errors

### 3. Implement Session Callback

**File:** `lib/auth/config.ts`

- [ ] Pass data from JWT to Session
- [ ] Add user information and roles
- [ ] Handle refresh errors

### 4. Implement Refresh Logic

**File:** `lib/auth/config.ts`, function `refreshAccessToken()`

- [ ] Call `POST /api/auth/refresh` with refreshToken
- [ ] Handle successful refresh (200)
- [ ] Handle errors (401, 403)
- [ ] Return updated token or error

### 5. Create Pages

- [ ] `/[lang]/auth/sign-in/page.tsx` - login form
- [ ] `/[lang]/auth/error/page.tsx` - error page
- [ ] `/[lang]/auth/register/page.tsx` - registration (optional)

### 6. Integrate into AppProviders

**File:** `providers/AppProviders.tsx`

```typescript
import { SessionProvider } from 'next-auth/react';

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

### 7. Protect Admin Routes

**Option 1: Middleware**

```typescript
// middleware.ts
import { auth } from '@/lib/auth/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    if (!req.auth) {
      return NextResponse.redirect(new URL('/en/auth/sign-in', req.url));
    }
  }
});
```

**Option 2: Layout Check**

```typescript
// app/admin/[lang]/layout.tsx
import { getCurrentUser, isStaff } from '@/lib/auth/helpers';
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

## 📚 Resources

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- Roles, session and route protection: `books-app-docs/ai-context/auth-and-permissions.md`
- Backend endpoints: `books-app-docs/backend/api/endpoints.md` (via `endpoints.index.md`)

## ⚠️ Important Notes

1. **Rate Limits:** Backend has rate limits on auth endpoints:
   - Login: 5 req/min
   - Register: 3 req/5min
   - Refresh: 10 req/min

2. **Token Lifetime:**
   - Access Token: 12 hours
   - Refresh Token: 7 days

3. **CORS:** Always include `credentials: 'include'` in fetch requests

4. **Security:**
   - NEXTAUTH_SECRET must be unique for each environment
   - Never commit real secrets to git
   - Use HTTPS in production

## 🐛 Troubleshooting

### Error: "Invalid Options" in ESLint

This is a known compatibility issue with ESLint v8/v9. It doesn't affect project build.

### Error: "Module 'next-auth' has no exported member..."

Make sure you're using `next-auth@^5.0.0-beta`.
