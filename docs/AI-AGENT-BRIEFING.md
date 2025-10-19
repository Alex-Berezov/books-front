# AI Agent Briefing: Frontend Development

> **For:** AI Agent developing Next.js frontend  
> **Project:** Bibliaris - Multilingual Audiobook Platform  
> **Backend Status:** ✅ Production-ready at `https://api.bibliaris.com`  
> **Last Updated:** October 18, 2025

---

## 🎯 Mission

Build a Next.js 14+ App Router frontend that consumes the Bibliaris backend API to deliver a multilingual audiobook platform.

---

## 🚨 CRITICAL: Git Workflow for AI Agents

**⚠️ ОБЯЗАТЕЛЬНАЯ ПАУЗА ПЕРЕД КАЖДЫМ PUSH!**

После завершения каждой подзадачи AI-агент **ОБЯЗАН**:

1. ✅ Выполнить всю работу
2. ✅ Проверить `yarn typecheck && yarn lint`
3. ✅ Создать commit с описанием
4. ⏸️ **ОСТАНОВИТЬСЯ И СООБЩИТЬ РАЗРАБОТЧИКУ**
5. ⏳ **ЖДАТЬ CODE REVIEW И ОДОБРЕНИЯ**
6. ✅ Только после одобрения — `git push`

**🚫 НИКОГДА НЕ ДЕЛАТЬ PUSH БЕЗ ЯВНОГО РАЗРЕШЕНИЯ!**

📖 **Полная инструкция:** [GIT-WORKFLOW.md](./GIT-WORKFLOW.md)

---

## 📚 Essential Documentation (Read in Order)

### 1. Start Here

1. **[frontend-agents/README.md](./frontend-agents/README.md)** - Overview and index
2. **[frontend-agents/quickstart.md](./frontend-agents/quickstart.md)** - 10-minute setup guide
3. **[frontend-agents/backend-api-reference.md](./frontend-agents/backend-api-reference.md)** - **CRITICAL!** Complete API documentation

### 2. Core Integration

4. **[frontend-agents/auth-next-auth.md](./frontend-agents/auth-next-auth.md)** - Authentication with NextAuth
5. **[frontend-agents/data-fetching-and-types.md](./frontend-agents/data-fetching-and-types.md)** - TypeScript types & React Query
6. **[frontend-agents/architecture-and-routing.md](./frontend-agents/architecture-and-routing.md)** - URL structure & i18n

### 3. Implementation Details

7. **[frontend-agents/api-cheatsheet.md](./frontend-agents/api-cheatsheet.md)** - Quick endpoint reference
8. **[frontend-agents/seo.md](./frontend-agents/seo.md)** - SEO & meta tags
9. **[frontend-agents/pages-contracts.md](./frontend-agents/pages-contracts.md)** - Page data contracts

### 4. Deployment

10. **[deploy/frontend-deployment-guide.md](./deploy/frontend-deployment-guide.md)** - Deployment options & configuration

---

## 🚀 Critical Information

### Backend API

```typescript
// Production (USE THIS)
const API_BASE_URL = 'https://api.bibliaris.com/api';

// Development (optional, if running backend locally)
const API_BASE_URL_DEV = 'http://localhost:5000/api';
```

### Authentication

**Token Lifetime:**

- Access Token: **12 hours**
- Refresh Token: **7 days**

**Endpoints:**

```typescript
POST / api / auth / login;
POST / api / auth / register;
POST / api / auth / refresh;
```

**Rate Limits (IMPORTANT):**

- Login: 5 req/min
- Register: 3 req/5min
- Refresh: 10 req/min

### CORS Configuration

```typescript
// Backend is configured for:
const ALLOWED_ORIGINS = ['https://bibliaris.com', 'http://localhost:3000', 'http://localhost:3001'];

// MUST include in fetch:
fetch(url, {
  credentials: 'include', // Required for CORS
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

### Language Support

**Supported Languages:** `en`, `es`, `fr`, `pt`

**URL Structure:**

```
/:lang/books/:slug/overview
/:lang/pages/:slug
/:lang/categories/:slug/books
```

**Priority:**

1. Path parameter `:lang`
2. Query parameter `?lang=en`
3. Header `Accept-Language: en-US,en;q=0.9`
4. Default: `en`

---

## 🔧 Technology Stack Requirements

### Must Have

```json
{
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "@tanstack/react-query": "^5.0.0",
    "next-auth": "^4.24.0",
    "antd": "^5.0.0",
    "typescript": "^5.0.0"
  },
  "devDependencies": {
    "openapi-typescript": "^7.0.0"
  }
}
```

### Configuration Files

**next.config.js:**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // i18n handled in App Router via [lang] segment
  async rewrites() {
    return [
      // API proxy (optional, for development)
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
  images: {
    domains: ['api.bibliaris.com'],
  },
};

module.exports = nextConfig;
```

**.env.local:**

```env
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-dev-secret-here
```

---

## 📁 Recommended Project Structure

```
frontend/
├── app/
│   ├── [lang]/
│   │   ├── books/
│   │   │   └── [slug]/
│   │   │       ├── overview/
│   │   │       └── listen/
│   │   ├── pages/
│   │   │   └── [slug]/
│   │   ├── categories/
│   │   │   └── [slug]/
│   │   └── tags/
│   │       └── [slug]/
│   ├── api/
│   │   ├── auth/
│   │   │   └── [...nextauth]/
│   │   └── health/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── auth/
│   ├── books/
│   ├── layout/
│   └── ui/
├── lib/
│   ├── api/
│   │   ├── client.ts      # API client
│   │   └── hooks.ts       # React Query hooks
│   ├── auth/
│   │   └── next-auth.ts   # NextAuth config
│   └── utils/
├── types/
│   └── api-schema.ts      # Generated from OpenAPI
├── public/
└── docs/                  # Copy from backend: docs/docs-front/
```

---

## 🎨 Key Features to Implement

### Phase 1: Foundation (Milestone M0)

- [ ] Next.js 14 App Router setup
- [ ] TypeScript configuration
- [ ] Ant Design integration
- [ ] i18n routing (`[lang]` segment)
- [ ] Basic layout & navigation

### Phase 2: Authentication (Milestone M1)

- [ ] NextAuth configuration
- [ ] Login/Register pages
- [ ] Token refresh logic
- [ ] Protected routes
- [ ] User profile page

### Phase 3: Content Display (Milestone M5)

- [ ] Book overview pages
- [ ] Category/Tag pages
- [ ] CMS pages
- [ ] Search functionality
- [ ] Responsive design

### Phase 4: Reading Experience (Milestone M6)

- [ ] Text reader
- [ ] Audio player
- [ ] Reading progress
- [ ] Bookmarks
- [ ] Comments system

### Phase 5: SEO & Performance (Milestone M7-M8)

- [ ] Meta tags generation
- [ ] Sitemap
- [ ] Image optimization
- [ ] Code splitting
- [ ] Caching strategy

---

## 🔑 Critical Implementation Notes

### 1. TypeScript Types

**ALWAYS generate types from live API before starting:**

```bash
# Option 1: From backend repo
cd /path/to/books-app-back
yarn openapi:types:prod
cp libs/api-client/types.ts /path/to/frontend/src/types/api-schema.ts

# Option 2: Direct from API
curl https://api.bibliaris.com/api/docs-json -o api-schema.json
npx openapi-typescript api-schema.json -o src/types/api-schema.ts
```

### 2. Authentication Flow

```typescript
// lib/api/client.ts
export const apiClient = {
  async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const session = await getSession();

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(session?.accessToken && {
          Authorization: `Bearer ${session.accessToken}`,
        }),
        ...options?.headers,
      },
    });

    if (response.status === 401) {
      // Token expired - trigger refresh or redirect to login
      signOut({ callbackUrl: '/auth/login' });
      throw new Error('Unauthorized');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'API request failed');
    }

    return response.json();
  },
};
```

### 3. React Query Setup

```typescript
// lib/api/hooks.ts
import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export const useBookOverview = (lang: string, slug: string) => {
  return useQuery({
    queryKey: ['bookOverview', lang, slug],
    queryFn: () => apiClient.fetch(`/${lang}/books/${slug}/overview`),
    staleTime: 60 * 1000, // 1 minute
    retry: (failureCount, error: any) => {
      if (error?.status >= 400 && error?.status < 500) {
        return false; // Don't retry client errors
      }
      return failureCount < 3;
    },
  });
};
```

### 4. Language Context

```typescript
// app/[lang]/layout.tsx
import { notFound } from 'next/navigation';

const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'pt'];

export default function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { lang: string };
}) {
  if (!SUPPORTED_LANGUAGES.includes(params.lang)) {
    notFound();
  }

  return (
    <html lang={params.lang}>
      <body>{children}</body>
    </html>
  );
}

export async function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
}
```

---

## ⚠️ Common Pitfalls & Solutions

### 1. CORS Issues

**Problem:** `No 'Access-Control-Allow-Origin' header`

**Solution:**

```typescript
// Always include credentials
fetch(url, {
  credentials: 'include', // ← Required!
});
```

### 2. Token Expiration

**Problem:** User gets logged out unexpectedly

**Solution:** Implement refresh logic in NextAuth:

```typescript
// See: frontend-agents/auth-next-auth.md
async jwt({ token, user }) {
  // Check expiration
  if (Date.now() < token.accessTokenExpires) {
    return token;
  }
  // Refresh token
  return refreshAccessToken(token);
}
```

### 3. Rate Limiting

**Problem:** `429 Too Many Requests`

**Solution:**

```typescript
// Implement exponential backoff
const fetchWithRetry = async (url, options, retries = 3) => {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error.status === 429 && retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * (4 - retries)));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
};
```

### 4. Type Mismatches

**Problem:** TypeScript errors with API responses

**Solution:**

```bash
# Regenerate types from latest API
curl https://api.bibliaris.com/api/docs-json -o api-schema.json
npx openapi-typescript api-schema.json -o src/types/api-schema.ts
```

---

## 📊 Testing Strategy

### 1. API Integration Tests

```typescript
// __tests__/api/auth.test.ts
describe('Authentication', () => {
  it('should login successfully', async () => {
    const response = await apiClient.fetch('/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'password123',
      }),
    });

    expect(response.accessToken).toBeDefined();
    expect(response.refreshToken).toBeDefined();
  });

  it('should refresh token', async () => {
    // Test token refresh logic
  });
});
```

### 2. Component Tests

```typescript
// __tests__/components/BookCard.test.tsx
import { render, screen } from '@testing-library/react';
import { BookCard } from '@/components/books/BookCard';

describe('BookCard', () => {
  it('should render book information', () => {
    render(<BookCard book={mockBook} />);
    expect(screen.getByText(mockBook.title)).toBeInTheDocument();
  });
});
```

### 3. E2E Tests (Playwright)

```typescript
// e2e/auth.spec.ts
test('user can login', async ({ page }) => {
  await page.goto('http://localhost:3000/en/auth/login');
  await page.fill('[name="email"]', 'test@example.com');
  await page.fill('[name="password"]', 'password123');
  await page.click('[type="submit"]');
  await expect(page).toHaveURL(/\/en$/);
});
```

---

## 🚦 Deployment Checklist

Before deploying to production:

- [ ] Environment variables configured
- [ ] TypeScript types generated from production API
- [ ] Authentication flow tested
- [ ] CORS working correctly
- [ ] Rate limiting handled
- [ ] Error boundaries implemented
- [ ] Loading states for all async operations
- [ ] Responsive design tested (mobile, tablet, desktop)
- [ ] SEO meta tags generated
- [ ] Analytics integrated (optional)
- [ ] Monitoring/error tracking setup (Sentry)
- [ ] Build succeeds without warnings
- [ ] Tests passing

---

## 📞 Support & Resources

### Backend Team

- **Repository:** https://github.com/Alex-Berezov/books
- **API Documentation:** `docs/ENDPOINTS.md`
- **Deployment Guide:** `docs/PRODUCTION_DEPLOYMENT_GUIDE.md`

### Frontend Documentation

- **Root:** `docs/docs-front/`
- **Agent Guides:** `docs/docs-front/frontend-agents/`
- **Milestones:** `docs/docs-front/milestones/`

### Health Checks

```bash
# Backend health
curl https://api.bibliaris.com/api/health/liveness

# Backend readiness (includes DB)
curl https://api.bibliaris.com/api/health/readiness

# OpenAPI schema
curl https://api.bibliaris.com/api/docs-json
```

---

## 🎯 Success Criteria

Your frontend implementation is successful when:

1. ✅ Users can register and login
2. ✅ Protected routes work correctly
3. ✅ Book catalog displays with proper pagination
4. ✅ Book details page shows all information
5. ✅ Text reader works smoothly
6. ✅ Audio player functions correctly
7. ✅ i18n routing works (en/es/fr/pt)
8. ✅ SEO meta tags generated correctly
9. ✅ No CORS errors in console
10. ✅ Mobile responsive
11. ✅ Lighthouse score > 90
12. ✅ Build deploys successfully

---

**Ready to start building? Begin with `frontend-agents/quickstart.md`!**

**Good luck! 🚀**
