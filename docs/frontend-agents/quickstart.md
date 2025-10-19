## Quickstart (FE agents)

> **Backend is ready!** API is live at `https://api.bibliaris.com`

1. Create Next.js App Router project (TypeScript) with Ant Design and React Query

2. Copy this folder docs/frontend-agents into FE repo (e.g., docs/backend-integration)

3. Configure env:

```env
# Production
NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api

# Development (if running backend locally)
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api
```

4. Auth.js (NextAuth):

- Credentials provider → POST /auth/login
- jwt session; store accessToken/refreshToken; implement refresh in jwt callback via /auth/refresh

5. App Router structure:

- app/[lang]/... for public pages; constrain lang to en|es|fr|pt
- app/(neutral)/versions/[id] for version-based readers

6. Data fetch:

- Use React Query; attach Authorization and Accept-Language when appropriate
- Generate types from /api/docs-json and import into FE

7. SEO:

- Use /:lang/seo/resolve in generateMetadata() and build hreflang links
