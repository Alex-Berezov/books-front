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
- `frontend/frontend-agents/` — API integration guides
- `frontend/ENDPOINTS.md` — full API endpoints catalog

---

## Code Style Rules

- Frontend CODE_STYLE Read file D:\newDev\books-front\CODE_STYLE.md
- Backend STYLE_GUIDE D:\newDev\books\STYLE_GUIDE.md

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

**CRITICAL: Backend runs ONLY in Docker on a VPS!**

- Backend is deployed on a VPS inside a Docker container
- Database (PostgreSQL) is NOT available on localhost
- **NEVER** attempt to run database migrations, seeds, or queries locally
- **NEVER** run `yarn prisma:migrate`, `yarn prisma:seed`, `npx prisma generate`, or `psql` commands
- All backend changes (schema, migrations, DTOs) must be reviewed by the user before deployment
- To test backend changes, the user will deploy them to VPS manually

**What you CAN do with backend code:**

- Read and modify schema, DTOs, services, controllers
- Create migration SQL files in `prisma/migrations/` (user will apply them on VPS)
- Review and suggest backend improvements

**What you CANNOT do:**

- Run the backend server locally
- Connect to the database
- Execute migrations, seeds, or `prisma generate`
- Test API endpoints against local server

**Deploying backend changes (user's workflow on VPS):**

```bash
# 1. SSH into the VPS
ssh user@vps-host

# 2. Navigate to the project directory
cd /path/to/books

# 3. Pull latest code (if using git)
git pull

# 4. Rebuild and restart the Docker container
docker compose up -d --build

# 5. Run migrations inside the container
docker compose exec app npx prisma migrate deploy

# 6. Regenerate Prisma Client (if schema changed)
docker compose exec app npx prisma generate

# 7. Restart to apply changes
docker compose restart
```

---

## Validation Workflow

**MANDATORY after every change (пропускать только для тривиальных правок в 1-2 строки):**

```bash
yarn validate
```

This runs:

1. `yarn lint --fix` — auto-fix ESLint issues
2. `yarn typecheck` — TypeScript type checking

## Post-Task Checklist

После завершения задачи (кроме тривиальных правок в 1-2 строки) **обязательно** выполнить:

### 1. Code Style Check

- Если менялся frontend — сверить изменения с `CODE_STYLE.md` (inline-стили, `any`/`@ts-ignore`, named exports, импорты, и т.д.)
- Если менялся backend — сверить изменения с `books/STYLE_GUIDE.md`
- Если ни то, ни другое не нарушено — явно указать в ответе: "всё соответствует кодстайлу"

### 2. Docs Update Check

- Проверить, нужно ли обновлять документацию в `books-app-docs`:
  - Менялись ли API-контракты/эндпоинты/DTO? → обновить `api-contracts.md` или `backend/api/endpoints.md`
  - Менялась ли контентная модель/сущности? → обновить `content-model.md` или `database-schema.md`
  - Менялись ли бизнес-правила (SEO, i18n, таксономии, public domain)? → обновить соответствующий документ в `ai-context/`
  - Менялся ли `SUPPORTED_LANGS`? → синхронизировать frontend/backend + docs
  - Другие изменения, затрагивающие задокументированное поведение
- Если документация не требует правок — явно указать: "документация не требует обновления"

### 3. Quality Gates

- `yarn validate` (lint + typecheck) — обязательно
- `yarn test` — при нетривиальных изменениях логики
- Если менялся backend (не только frontend) — дополнительно `cd books && yarn lint && yarn typecheck && yarn test`

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

## Reusable Components

**BEFORE building something new, check if a reusable component already exists in `components/common/`.**

### FaqBlock — FAQ accordion with JSON-LD

**Location:** `components/common/FaqBlock/FaqBlock.tsx`

Renders FAQ items as an accessible `<details>`/`<summary>` accordion with built-in JSON-LD structured data (FAQPage schema).

**Props:**

| Prop         | Type                   | Default | Description                           |
| ------------ | ---------------------- | ------- | ------------------------------------- |
| `items`      | `FaqItem[]` (required) | —       | Array of `{ question, answer }`       |
| `title`      | `string`               | `"FAQ"` | Section heading text                  |
| `showJsonLd` | `boolean`              | `true`  | Controls JSON-LD script injection     |
| `className`  | `string`               | `''`    | Extra CSS class for outer `<section>` |
| `icon`       | `ReactNode`            | —       | Optional icon before the title        |

**Import:**

```tsx
import { FaqBlock } from '@/components/common/FaqBlock/FaqBlock';
```

**Used by:** homepage, author detail, category/genre/collection detail, tag detail, taxonomy overview pages.

### QuotesBlock — Quote cards with grid layout

**Location:** `components/common/QuotesBlock/QuotesBlock.tsx`

Renders quotes as styled `<blockquote>` cards in a responsive 2-column grid with left terracotta border.

**Props:**

| Prop        | Type                     | Default    | Description                           |
| ----------- | ------------------------ | ---------- | ------------------------------------- |
| `items`     | `QuoteItem[]` (required) | —          | Array of `{ text, source?, author? }` |
| `title`     | `string`                 | `"Quotes"` | Section heading text                  |
| `className` | `string`                 | `''`       | Extra CSS class for outer `<section>` |
| `icon`      | `ReactNode`              | —          | Optional icon before the title        |

The component checks `source` first, then falls back to `author` for the attribution line.

**Import:**

```tsx
import { QuotesBlock } from '@/components/common/QuotesBlock/QuotesBlock';
\`\`\`

**Used by:** author detail page, book detail page.

---

## Post-Task Checklist Details

### Code Style Check (применять после каждой нетривиальной задачи)

| Что трогали | Где проверять | Что проверять |
| --- | --- | --- |
| Frontend | `CODE_STYLE.md` | inline-стили, `any`/`@ts-ignore`, named exports, `import type`, импорты, naming, комментарии |
| Backend | `STYLE_GUIDE.md` | DTO-структура, early throw, controller/service split, guards, swagger-декораторы |
| Оба | оба файла | всё выше |

### Docs Update Check (что может потребовать обновления)

| Изменение | Документ для обновления |
| --- | --- |
| API-контракты / эндпоинты / DTO | `api-contracts.md` или `backend/api/endpoints.md` |
| Сущности / модель данных | `content-model.md` или `database-schema.md` |
| SEO-правила | `seo-rules.md` |
| i18n / языки | `translation-rules.md`; если `SUPPORTED_LANGS` — синхронизация frontend+backend |
| Таксономии | `taxonomy-rules.md` |
| Public domain / копирайт | `public-domain-rules.md` |
| Auth / permissions | `auth-and-permissions.md` |
| Архитектурные изменения | `architecture.md`, возможно ADR в `adr/` |
| Зависимости | `tech-stack.md` и `dependency-policy.md` |

Если документация не требует правок — явно указать: "документация не требует обновления".

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

**Last Updated:** July 24, 2026
**Status:** Project implemented and published; development proceeds iteratively. The formal milestone scheme (M0–M10) is no longer tracked — do not use milestones for planning/status assessment.
**Supported Languages:** en, es, fr, pt, ru
**P4 Content Quality:** implemented — empty book listing pages (landing + taxonomy detail) set `noindex, follow` in `generateMetadata`, excluded from sitemap when `total === 0`. Footer audiobooks link conditional server-side. Docs: `ai-context/seo-rules.md` and `frontend/frontend-agents/api-cheatsheet.md` updated.
**P5 Approval Workflow:** ✅ Completed July 24, 2026 — RightsReviewStatus/RightsProfileStatus enums expanded, RightsReviewApproval audit trail model, approve/reject API endpoints with full business logic (publication gate check, blocking actions check, intake status updates), frontend ApprovalPanel + ApprovalHistory components. 398 tests pass.
```
