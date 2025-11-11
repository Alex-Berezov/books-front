# NextAuth Authorization Module

> Template for integrating NextAuth into Bibliaris project

## 📁 Structure

```
lib/auth/
├── auth.ts              # NextAuth v5 instance (auth, signIn, signOut, handlers)
├── config.ts            # NextAuth configuration with providers and callbacks
├── SessionProvider.tsx  # Client-side session provider
├── helpers.ts           # Utilities for working with session on server
├── index.ts             # Public API of the module
└── README.md            # This documentation

app/api/auth/[...nextauth]/
└── route.ts             # API Route Handler for NextAuth

types/
└── next-auth.d.ts       # NextAuth type extensions (User, Session, JWT)
```

## 🎯 Current Status (M0.5)

**✅ Implemented:**

- NextAuth file structure
- Types for User, Session, JWT
- Configuration with Credentials Provider (template)
- API Route Handler (`/api/auth/*`)
- SessionProvider for client components
- Helpers for server components

**🔴 TODO (M1):**

- Implement `authorize()` logic in CredentialsProvider
- Implement callbacks for JWT and Session
- Implement automatic token refresh
- Create pages `/[lang]/auth/sign-in` and `/[lang]/auth/error`
- Integrate SessionProvider into `AppProviders`
- Add middleware to protect admin routes

## 🔧 Usage (after M1)

### Server Components

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
  displayName?: string;
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

## 🚀 Plans for M1

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

### 7. Protect Admin Routes

**Option 1: Middleware**

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

**Option 2: Layout Check**

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

## 📚 Resources

- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [Backend API Reference](/docs/frontend-agents/backend-api-reference.md)
- [Auth Integration Guide](/docs/frontend-agents/auth-next-auth.md)

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

### Warning: "TODO - implement in M1"

This is expected behavior for M0.5. Functionality will be implemented in M1.
