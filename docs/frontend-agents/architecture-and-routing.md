## Architecture and routing (FE)

Core URL policy (public):

- All public content pages are under /:lang prefix: /:lang/books/:slug/overview, /:lang/pages/:slug, /:lang/categories/:slug/books, /:lang/tags/:slug/books, /:lang/seo/resolve
- Priority for selecting language: path :lang > query ?lang > Accept-Language > DEFAULT_LANGUAGE (env; default en)
- Neutral APIs (no language in path) still accept Accept-Language and sometimes ?lang for filtering

Canonical rules:

- Book pages canonical include language prefix: /:lang/books/:slug
- Page (CMS) canonical include language prefix: /:lang/pages/:slug
- Version canonical is neutral: /versions/:id (no language prefix)

Sitemap/robots:

- /sitemap.xml index links to per‑language sitemaps: /sitemap-en.xml, /sitemap-es.xml, ...
- Public URLs in sitemaps contain /:lang prefix

Front‑app routing recommendations:

- Use Next.js App Router nested under [lang]/ segment, with lang param constrained to en|es|fr|pt
- Persist current language in route; for neutral flows (auth), keep UI under /[lang]/auth/\* but call neutral backend endpoints with Accept-Language header
- Build hreflang clusters for public pages; include x‑default to default language URL

Admin context (if you build admin UI):

- Use /admin/:lang paths, with X-Admin-Language header taking precedence over path for create/list endpoints. Only for staff roles (admin|content_manager)
