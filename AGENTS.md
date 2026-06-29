# AI Agent Guide — Bibliaris Frontend

> Read this file BEFORE starting any development task.

---

## Project Overview

**Bibliaris** — multilingual audiobook platform for classic literature.

- **Languages:** en, es, fr, pt, ru (5 supported)
- **Stack:** Next.js 14 (App Router), TypeScript, Ant Design 5, React Query, NextAuth.js v5
- **Backend API:** `https://api.bibliaris.com/api`
- **Package Manager:** Yarn (NOT npm/pnpm)

---

## Documentation Access

Project documentation is available via MCP server `books-docs`. Use MCP tools:

- `listDocs` — list documentation files
- `readDoc` — read specific documentation file
- `searchDocs` — search across documentation

Key documentation paths:

- `frontend/INDEX.md` — frontend documentation index
- `frontend/plan/DEVELOPMENT-PLAN.md` — development plan (10 milestones)
- `frontend/plan/TASKS-TRACKING.md` — current task tracking
- `frontend/milestones/M*.md` — detailed milestone specs
- `frontend/frontend-agents/` — API integration guides
- `frontend/ENDPOINTS.md` — full API endpoints catalog

---

## Code Style Rules

### CRITICAL: SCSS Modules

Every `.module.scss` file MUST start with:

```scss
@import '@/styles/tokens.scss';
```

**Common mistakes:**

- Using `@use` instead of `@import` — WRONG
- Forgetting `.scss` extension — WRONG
- Using `$font-size-md` — DOESN'T EXIST, use `$font-size-base`
- Using `$line-height-normal` — DOESN'T EXIST, use `$line-height-base`

### Available SCSS Variables

From `styles/tokens.scss`:

**Typography:**

- `$font-size-xs`, `$font-size-sm`, `$font-size-base`, `$font-size-lg`, `$font-size-xl`
- `$line-height-tight`, `$line-height-base`, `$line-height-relaxed`
- `$font-weight-regular`, `$font-weight-medium`, `$font-weight-semibold`, `$font-weight-bold`

**Spacing:**

- `$spacing-xs`, `$spacing-sm`, `$spacing-md`, `$spacing-lg`, `$spacing-xl`, `$spacing-xxl`

**Colors:**

- `$color-primary`, `$color-error`, `$color-success`, `$color-warning`
- `$color-text-primary`, `$color-text-secondary`, `$color-bg-primary`

### TypeScript

- **NO `any`** — use proper types
- Use `import type` for type-only imports
- Destructure props when 3+ parameters
- Comments in English only

### Component Conventions

- Use functional components with TypeScript
- Props interface named `{ComponentName}Props`
- SCSS modules named `{component}.module.scss`
- Use Ant Design components where appropriate

---

## Language Support

**Supported languages:** `en`, `es`, `fr`, `pt`, `ru`

**Single source of truth:** `lib/i18n/lang.ts`

```typescript
export const SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt', 'ru'] as const;
```

**i18n routing:** URL prefix `/:lang` (e.g., `/en/books`, `/ru/books`)

**Language utilities:**

- `lib/i18n/lang.ts` — `SUPPORTED_LANGS`, `isSupportedLang()`, `switchLangInPath()`
- `lib/i18n/dictionaries.ts` — translation dictionaries
- `lib/i18n/useTranslation.ts` — translation hook

---

## Backend API

**Base URL:** `https://api.bibliaris.com/api`

**Important URL structure:**

- API endpoints: `/api/*` (e.g., `/api/books`, `/api/auth/login`)
- Swagger docs: `/docs` (NOT `/api/docs`)
- OpenAPI spec: `/docs-json` (NOT `/api/docs-json`)

**Authentication:**

- Public endpoints: no token needed (`GET /api/books`, `GET /api/:lang/pages/:slug`)
- Protected endpoints: require `Authorization: Bearer {token}` header
- Token types: accessToken (12h), refreshToken (7d)

**Full API documentation:** Use MCP tool `readDoc` with path `frontend/ENDPOINTS.md`

---

## Backend Repository

**Location:** `D:\newDev\books` (NestJS + Prisma + PostgreSQL)

**CRITICAL: Backend is NOT running locally!**

- Backend is deployed on a VPS (production server)
- Database (PostgreSQL) is NOT available on localhost
- **NEVER** attempt to run database migrations, seeds, or queries locally
- **NEVER** run `yarn prisma:migrate`, `yarn prisma:seed`, or `psql` commands
- All backend changes (schema, migrations, DTOs) must be reviewed by the user before deployment
- To test backend changes, the user will deploy them to VPS manually

**What you CAN do with backend code:**

- Read and modify schema, DTOs, services, controllers
- Create migration SQL files (user will apply them on VPS)
- Review and suggest backend improvements

**What you CANNOT do:**

- Run the backend server locally
- Connect to the database
- Execute migrations or seeds
- Test API endpoints against local server

---

## Validation Workflow

**MANDATORY after every change:**

```bash
yarn validate
```

This runs:

1. `yarn lint --fix` — auto-fix ESLint issues
2. `yarn typecheck` — TypeScript type checking

---

## Git Workflow

**CRITICAL RULE: NEVER commit or push without explicit user permission!**

The AI agent must **NEVER** execute `git commit` or `git push` on its own. All changes must be reviewed by the user first.

**Correct workflow:**

1. Complete the task
2. Run `yarn typecheck && yarn lint`
3. Show the user what was changed (diff summary)
4. **WAIT for user to review the code**
5. **Only commit/push if user explicitly asks to do so**

**Example of correct behavior:**

```
✅ "Changes are ready. Here's what was modified:
    - file1.tsx: added filter logic
    - file2.ts: updated types

    Run `git diff` to review. Should I commit and push?"
```

**Example of WRONG behavior:**

```
❌ Automatically running git commit and git push without asking
```

---

## Project Structure

```
books-front/
├── app/
│   ├── [lang]/              # Public pages with i18n (en|es|fr|pt|ru)
│   ├── admin/[lang]/        # Admin panel with i18n
│   └── (neutral)/           # Language-neutral routes (e.g., /versions/[id])
├── lib/
│   ├── i18n/                # Internationalization utilities
│   └── api/                 # API client utilities
├── components/
│   ├── common/              # Reusable UI components
│   └── admin/               # Admin-specific components
├── providers/               # React Query, AntD, Auth providers
├── styles/
│   └── tokens.scss          # Design tokens (colors, spacing, typography)
└── types/                   # TypeScript type definitions
```

---

## Common Tasks

### Creating a new component

1. Create component file: `components/{area}/{ComponentName}/{ComponentName}.tsx`
2. Create SCSS module: `components/{area}/{ComponentName}/{ComponentName}.module.scss`
3. Start SCSS with `@import '@/styles/tokens.scss';`
4. Use design tokens for all colors and spacing
5. Export component and props type

### Adding a new page

1. Create page in `app/[lang]/` or `app/admin/[lang]/`
2. Use `generateMetadata()` for SEO (see `frontend/frontend-agents/seo.md`)
3. Include canonical and hreflang tags for public pages
4. Use server components for initial data fetching

### Working with API

1. Use typed HTTP client from `lib/api/`
2. Include `Accept-Language` header from current `:lang`
3. Include `Authorization` header for protected endpoints
4. Handle errors properly (401, 403, 404, 429)

---

## Troubleshooting

### Build fails with SCSS variable errors

- Check that `.module.scss` starts with `@import '@/styles/tokens.scss';`
- Verify variable names (use `$font-size-base`, not `$font-size-md`)

### 401 Unauthorized on API calls

- Check if endpoint requires authentication
- Add `Authorization: Bearer {token}` header
- Verify token is not expired

### Type errors after API changes

- Regenerate types from OpenAPI: `npx openapi-typescript https://api.bibliaris.com/docs-json -o types/api.ts`
- Or update types manually in `types/` directory

---

## Additional Resources

- **Full code style:** `CODE_STYLE.md`
- **AI checklist:** `.ai-agent-checklist.md`
- **Backend API reference:** Use MCP `readDoc` with `frontend/frontend-agents/backend-api-reference.md`
- **Architecture guide:** Use MCP `readDoc` with `frontend/frontend-agents/architecture-and-routing.md`

---

**Last Updated:** June 28, 2026  
**Current Milestone:** M0 — Project Bootstrap  
**Supported Languages:** en, es, fr, pt, ru
