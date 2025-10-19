## Data fetching and types

> **✅ Production Ready:** TypeScript types can be generated from live API!

OpenAPI types:

- **Production API:** `https://api.bibliaris.com/api/docs-json`
- **Swagger UI:** `https://api.bibliaris.com/docs` (disabled in production by default)
- **Development:** `http://localhost:5000/api/docs` (enabled)

### Generate Types (Backend Repo)

```bash
# From production API
yarn openapi:types:prod

# From local API
yarn openapi:types

# Output: libs/api-client/types.ts
```

### Copy to Frontend

```bash
cp libs/api-client/types.ts /path/to/frontend/src/types/api-schema.ts
```

### Alternative: Generate Directly in Frontend

```bash
# In your frontend repo
curl https://api.bibliaris.com/api/docs-json -o api-schema.json
npx openapi-typescript api-schema.json -o src/types/api-schema.ts
```

Fetching layer options:

- React Query (recommended) or SWR
- Base URL: process.env.NEXT_PUBLIC_API_BASE_URL (e.g., http://localhost:5000/api)
- Auth: attach Authorization Bearer <accessToken> from NextAuth session
- Language: for neutral endpoints where language matters, set Accept-Language to current [lang]

Minimal fetcher (fetch):

- Accept JSON; throw on !ok with parsed error
- Include credentials only if needed (cookies are not required; we use JWT)

SSR/SSG:

- For public pages under /[lang]/\*, prefer server components to fetch initial data; pass headers: { 'Accept-Language': lang }
- Use revalidate for SSG where appropriate (catalog pages, sitemap, robots)

Error handling:

- 404 for missing localized content (e.g., page slug without translation) should map to Next.js notFound()
- Rate‑limited routes (comments, uploads) can return 429 — surface friendly UI

Caching keys (React Query):

- ['bookOverview', lang, slug]
- ['bookVersions', bookId, { lang?, type?, isFree? }]
- ['categoryBooks', lang, slug]
- ['tagBooks', lang, slug]
- ['page', lang, slug]
- ['seoResolve', lang, { type, id }]
