# NextAuth Authorization Module

> NextAuth v5 for Bibliaris: Credentials + Google + Facebook, JWT/session callbacks, token auto-refresh, sign-in/register pages, route protection in `middleware.ts`. Systemic context: `books-app-docs/ai-context/auth-and-permissions.md`.

## 📁 Structure

```
lib/auth/
├── auth.ts              # NextAuth v5 instance (auth, signIn, signOut, handlers)
├── config.ts            # NextAuth configuration with providers and callbacks
├── constants.ts         # Token lifetimes, error types, roles, auth routes
├── helpers.ts           # Utilities for working with session on server
├── session-utils.ts     # Access token getters for client and server requests
├── sessionMarker.ts     # Client "probably logged in" marker for SessionProvider
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
- Sign-in / register pages
- Middleware protecting `/admin/**` only (reading, listening and summaries are public)

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
  refreshToken: string; // JWT, 7 days от входа — refresh срок не продлевает (LEGACY-451)
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
  // refreshToken в сессию не кладётся: она уходит в браузер (LEGACY-446),
  // refresh живёт только в JWT-куке
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
   - Access Token: срок обновления берётся из `exp` самого токена, с запасом 30 с
   - Refresh Token: 7 days от входа; refresh срок не продлевает (LEGACY-451)
   - Выход по кнопке гасит все сессии на бэкенде: кнопка сначала ждёт серверное действие
     `revoke-sessions.action.ts` (refresh из серверной куки → `POST /auth/logout`), потом
     `signOut()`. Автоматический выход по 401 бэкенд не трогает; отказ refresh не повторяется.

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
