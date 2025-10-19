## Pages contracts (Next.js App Router)

Segment layout:

- app/[lang]/layout.tsx — sets current language from params.lang (en|es|fr|pt)
- app/[lang]/(public)/books/[slug]/overview/page.tsx — overview page
- app/[lang]/pages/[slug]/page.tsx — CMS page
- app/[lang]/categories/[slug]/books/page.tsx — category listing
- app/[lang]/tags/[slug]/books/page.tsx — tag listing

Common requirements:

- Always call backend with base /api and include Accept-Language: params.lang for neutral endpoints
- For public pages, use server components where possible and pass data down to client components

books/[slug]/overview:

- Data calls:
  1. GET /:lang/books/:slug/overview
  2. Optional: GET /:lang/seo/resolve?type=book&id=:slug for extra meta aggregation (if not relying on overview.seo)
- Render:
  - Title/author/cover from preferred version (by language and type)
  - CTA to read/listen: links to /versions/:id based readers or local readers by version ids
  - Language switch based on availableLanguages

pages/[slug]:

- Data: GET /:lang/pages/:slug
- 404 when backend returns 404

categories/[slug]/books:

- Data: GET /:lang/categories/:slug/books → items + availableLanguages
- Pagination params if backend supports (check docs/ENDPOINTS.md for page, limit)

tags/[slug]/books:

- Data: GET /:lang/tags/:slug/books

read/listen views (by version):

- Route pattern suggestion: app/(neutral)/versions/[id]/page.tsx
- Data:
  - GET /versions/:id → version details
  - GET /versions/:id/chapters or /versions/:id/audio-chapters for listing
  - GET /versions/:id/summary for summary tab
  - Authenticated interactions: bookshelf, progress, comments, likes

SEO metadata generation:

- Prefer /:lang/seo/resolve to populate metadata and canonical; see seo.md
