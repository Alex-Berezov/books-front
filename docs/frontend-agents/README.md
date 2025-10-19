## Frontend Integration Guide

> **✅ Backend is Production-Ready!**  
> **Production API:** `https://api.bibliaris.com/api`  
> **Status:** Live with SSL, CORS, rate limiting, and monitoring

Purpose: Everything a Next.js (App Router) frontend needs to integrate with this backend correctly: routing/i18n, auth, data fetching, SEO, and page contracts. Copy this folder into the FE repo.

### 📚 Documentation Files

- **🆕 [backend-api-reference.md](./backend-api-reference.md)** — **START HERE!** Complete API reference with production URLs, auth, CORS, rate limits
- [quickstart.md](./quickstart.md) — Get started in 10 minutes
- [api-cheatsheet.md](./api-cheatsheet.md) — Quick endpoint reference
- [architecture-and-routing.md](./architecture-and-routing.md) — URL scheme, language policy, canonical rules
- [auth-next-auth.md](./auth-next-auth.md) — NextAuth/Auth.js setup with backend JWT endpoints
- [data-fetching-and-types.md](./data-fetching-and-types.md) — React Query/SWR fetcher, OpenAPI types
- [pages-contracts.md](./pages-contracts.md) — Per‑page data flows (overview, pages, tags/categories, read/listen)
- [seo.md](./seo.md) — Metadata/hreflang via /seo/resolve and overview

### 🌐 Production Environment

- **API Base URL:** `https://api.bibliaris.com/api`
- **Frontend (Future):** `https://bibliaris.com`
- **Health Check:** `https://api.bibliaris.com/api/health/liveness`
- **OpenAPI Schema:** `https://api.bibliaris.com/api/docs-json`
- **Metrics:** `https://api.bibliaris.com/api/metrics`

### 🔧 Development Environment

- **API Base URL (Local):** `http://localhost:5000/api`
- **Swagger UI:** `http://localhost:5000/docs` (enabled in dev)
- All routes are served under `/api` (real URL = /api + path in docs)
- Public site paths are i18n‑prefixed: `/:lang/...` with lang ∈ en|es|fr|pt; path prefix dominates over ?lang and Accept-Language

Package manager:

- This repository uses Yarn (via Corepack). Do not use npm or pnpm.
- Install/CI: `yarn install --frozen-lockfile`. Scripts in docs assume Yarn.
- Node: 20.x LTS recommended.
