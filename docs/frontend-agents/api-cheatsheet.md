## API cheatsheet (FE)

> **Production API:** `https://api.bibliaris.com/api`  
> **Development API:** `http://localhost:5000/api`  
> **Last Updated:** October 18, 2025

Conventions:

- Real URL = API_BASE_URL + path (e.g., `https://api.bibliaris.com/api/auth/login`)
- When under /:lang routes, pass :lang in path; otherwise consider Accept-Language header
- Authenticated routes need `Authorization: Bearer <accessToken>`
- CORS credentials enabled: use `credentials: 'include'` in fetch
- Rate limiting: Global 100 req/min, Auth endpoints stricter (see backend-api-reference.md)

Auth:

- POST /auth/register { email, password } → { accessToken, refreshToken }
- POST /auth/login { email, password } → { accessToken, refreshToken }
- POST /auth/refresh { refreshToken } → { accessToken, refreshToken }

Users:

- GET /users/me → { id, email, name?, avatarUrl?, languagePreference, roles: RoleName[] }
- PATCH /users/me { name?, avatarUrl?, languagePreference? }

Books public:

- GET /:lang/books/:slug/overview →
  {
  book: { id, slug },
  availableLanguages: Language[],
  versionIds: { text: string|null, audio: string|null },
  hasText: boolean,
  hasAudio: boolean,
  hasSummary: boolean,
  seo: {
  main?: { metaTitle?, metaDescription?, canonicalUrl? ... },
  listen?: { metaTitle?, metaDescription? ... }
  }
  }

Book versions:

- GET /books/:bookId/versions?language=&type=&isFree= → published only unless staff
- GET /versions/:id → published version by id

Chapters:

- GET /versions/:bookVersionId/chapters?page&limit → list
- GET /chapters/:id → details

Audio chapters:

- GET /versions/:bookVersionId/audio-chapters?page&limit → list
- GET /audio-chapters/:id → details

Summaries:

- GET /versions/:bookVersionId/summary → { id, summary, analysis?, themes? } | null

SEO resolve:

- GET /:lang/seo/resolve?type=book|version|page&id=... →
  {
  meta: { title?, description?, canonicalUrl?, robots? },
  openGraph: { title?, description?, type?, url?, imageUrl?, imageAlt? },
  twitter?: { card?, site?, creator? },
  breadcrumbPath?: Array<{ id, slug, name }>
  }
- GET /seo/resolve?type=...&id=...&lang=... (no path lang; query/header policy applies)

Pages (CMS):

- GET /:lang/pages/:slug → { id, slug, title, type, content, language }

Taxonomy:

- GET /:lang/categories/:slug/books → { items: BookVersion[], availableLanguages: Language[] }
- GET /:lang/tags/:slug/books → { items: BookVersion[], availableLanguages: Language[] }

Interactions:

- Comments:
  - GET /comments?target=version|chapter|audio&targetId=...&page&limit
  - POST /comments { text, (bookVersionId|chapterId|audioChapterId), parentId? }
- Likes:
  - PATCH /likes/toggle { commentId? | bookVersionId? } → { liked: boolean, count: number }
- Bookshelf:
  - GET /me/bookshelf
  - POST /me/bookshelf/:versionId
  - DELETE /me/bookshelf/:versionId
- Reading progress:
  - GET /me/progress/:versionId
  - PUT /me/progress/:versionId { chapterNumber?|audioChapterNumber?, position }

Media/Uploads (admin only): see media-library; FE public app usually not required
