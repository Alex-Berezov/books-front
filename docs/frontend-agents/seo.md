## SEO integration (FE)

Resolver endpoints:

- GET /:lang/seo/resolve?type=book|version|page&id=... → returns meta, openGraph, twitter, canonicalUrl; language from path dominates
- GET /seo/resolve?type=...&id=...&lang=... → use when you don’t have :lang in path; policy: ?lang > Accept-Language > default

Canonical rules to honor:

- Book/page: canonical contains /:lang prefix
- Version: canonical is /versions/:id (no prefix)

Hreflang cluster:

- For each public page, include <link rel="alternate" hreflang="en|es|fr|pt|x-default" href="..."> covering available languages; use overview.availableLanguages or taxonomy endpoints to infer

Next.js implementation tips:

- In server components, call resolve and populate generateMetadata() with returned data
- Add Content-Language: <lang> header where you control responses (optional for Next.js)

Sitemap (optional FE generator):

- Pull lists of slugs per language from backend public endpoints, and emit /:lang URLs; or rely on backend /sitemap-:lang.xml
