# AI Agent Guide — Bibliaris Frontend

> Read this file BEFORE starting any development task.
> Reference material lives in `D:\newDev\books-app-docs` — read it on demand instead of duplicating it here.

---

## Project Overview

**Bibliaris** — multilingual audiobook platform for classic literature.

- **Stack:** Next.js 14 (App Router), TypeScript, Ant Design 5, React Query, NextAuth.js v5
- **Backend API:** `https://api.bibliaris.com/api`
- **Package manager:** Yarn (NOT npm/pnpm)

---

## Where to read what

Documentation repo: `D:\newDev\books-app-docs`. Read it directly with Read/Grep/Glob — no MCP server needed.
Start with `ai-context/README.md` (index) and `ai-context/agent-rules.md` (mandatory agent rules).
The full task → document map is in `CLAUDE.md`. **Do not read `ai-context/` wholesale** — it burns context.

**Читать документы больше ~10 КБ только секциями:** `grep -nE "^## " <файл>` → выбрать заголовок → `Read` с `offset`/`limit`. Целиком — `endpoints.md` (167 КБ), `changelog.md`, `legacy-warnings.md`, `database-schema.md`, `rights-clearance.md`, `api-contracts.md`, `content-model.md`, `frontend.md`, файлы в `tasks/` — **не читать**. Протокол и таблица размеров: `ai-context/agent-rules.md` §«Как читать документацию».

**Структуру кода в документации не искать** — состав папок, список компонентов и место символа даёт `ast-index` (см. `.claude/rules/ast-index.md`).

| Need                                    | Document                               |
| --------------------------------------- | -------------------------------------- |
| Component catalog + what NOT to rebuild | `ai-context/ui-kit.md`                 |
| Folder/file map of all three repos      | `ai-context/folder-structure.md`       |
| Full quality-gate matrix, CI guards     | `ai-context/quality-gates.md`          |
| Project status, current focus           | `ai-context/current-sprint.md`         |
| API endpoint catalog                    | `backend/api/endpoints.md`             |
| VPS deploy commands (user runs them)    | `backend/deployment/quick-commands.md` |

**Before building any component, check `ai-context/ui-kit.md`.** It lists what already exists — `FaqBlock`, `QuotesBlock`, `SlugInput`, `RichTextEditor`, `SeoSections` — and what is explicitly forbidden to recreate.

---

## 🔴 MANDATORY: ESLint Import Ordering Rules (`import/order`)

Every modified or newly created file MUST strictly satisfy ESLint `import/order`.

**Import Order Priority:**

1. React & core built-ins (`import { FC } from 'react'`)
2. Third-party packages (alphabetical by package name: e.g. `lucide-react`, `next/link`, etc.)
3. Absolute path alias imports `@/...` (alphabetical by full path: `@/api/...`, `@/components/admin/...`)
4. Type imports `import type ...` (alphabetical by module specifier)
5. Relative imports `./...` (alphabetical by path: `./Component.module.scss`, `./SubComponent`)

**Verification Protocol:**

- Always run `yarn lint` or `npx eslint <path> --fix` before completing any frontend task to ensure 0 `import/order` warnings/errors!

---

## Code Style

- Frontend: `D:\newDev\books-front\CODE_STYLE.md` — read sections as needed, the file is large.
- Backend: `D:\newDev\books\STYLE_GUIDE.md`
- **Zero `any`, zero `@ts-ignore`, zero inline styles.** Named exports, `import type` for types.
- Every `.module.scss` starts with `@import '@/styles/tokens.scss';` and uses design tokens for all colors and spacing.
- Do not create extra `.md` files or comments unless asked.

---

## i18n

- **Single source of truth:** `lib/i18n/lang.ts` → `SUPPORTED_LANGS = ['en', 'es', 'fr', 'pt', 'ru']`
- Changing it requires syncing the Prisma `Language` enum in `books` **and** `ai-context/translation-rules.md`. CI guard: `yarn check:langs`.
- Routing: URL prefix `/:lang` (`/en/books`, `/ru/books`).
- Utilities: `lang.ts` (`isSupportedLang`, `switchLangInPath`), `dictionaries.ts`, `useTranslation.ts`.

---

## Backend API

- Base URL `https://api.bibliaris.com/api`; endpoints live under `/api/*`.
- Swagger UI is `/docs`, OpenAPI spec is `/docs-json` — **not** `/api/docs-json`. There is a CI lint enforcing this in the docs repo.
- Public endpoints need no token. Protected ones need `Authorization: Bearer {token}` (accessToken 12h, refreshToken 7d).
- Use the typed client from `lib/api/`, send `Accept-Language` from the current `:lang`, handle 401 / 403 / 404 / 429.
- Endpoint catalog: `books-app-docs/backend/api/endpoints.md`.

---

## Backend Repository Constraints

`D:\newDev\books` (NestJS + Prisma + PostgreSQL). **The production backend runs only in Docker on a VPS.** Locally there is only a throwaway PostgreSQL + Redis pair for e2e tests (added 31.07.2026) — not a dev environment, no production data.

**NEVER run locally:** `prisma migrate`, `prisma seed`, `prisma studio`, `psql`, or the backend server itself. These are blocked in `.claude/settings.json`. Migrations reach a database only through the e2e harness (which builds a fresh throwaway DB per run) or through the user on the VPS.

**Исключение — `yarn prisma:generate`** (разрешён 08.08.2026): это кодогенерация типов из `schema.prisma`, к базе не обращается. Без неё после правки схемы падают typecheck и lint, потому что новая модель для TypeScript не существует.

**You may:** read and modify schema, DTOs, services, controllers; write migration SQL into `prisma/migrations/` for the user to apply on the VPS; run `yarn test:e2e` and `yarn drift-check` in `books`. Details: `books/AGENTS.md` §Backend Execution Environment.

All backend changes must be reviewed by the user before deployment.

---

## Common Tasks

**New component** — `components/{area}/{ComponentName}/{ComponentName}.tsx` plus `{ComponentName}.module.scss`. Named export, exported props type.

**New page** — `app/[lang]/` (public) or `app/admin/[lang]/`. Add `generateMetadata()`; public pages need canonical + hreflang (`ai-context/seo-rules.md`). Prefer server components for initial data fetching.

**Type errors after API changes** — regenerate from OpenAPI: `npx openapi-typescript https://api.bibliaris.com/docs-json -o types/api.ts`. Details: `frontend/FRONTEND_TYPE_SYNC_GUIDE.md`.

---

## Quality Gates

**MANDATORY before reporting a task complete:**

```bash
yarn validate     # lint + typecheck — основная проверка
yarn test         # vitest run
```

If backend code was modified as well:

```bash
cd D:\newDev\books && yarn lint && yarn typecheck && yarn test
```

- **NEVER ignore lint warnings or errors** in files you created or modified — resolve them all before declaring completion.
- Full matrix (e2e, coverage thresholds, CI guards): `ai-context/quality-gates.md`.

---

## Git Workflow

**CRITICAL: NEVER run `git commit` or `git push` without explicit user permission** — in any of the three repositories.

Correct flow: implement → `yarn validate` → show the user a diff summary → **wait for review** → commit only if explicitly asked.

Each repository is a separate git. For git operations in another repo use `git -C D:\newDev\books ...`, never `cd`.

---

## Post-Task Checklist

1. **Code style** — compare the diff against `CODE_STYLE.md` (frontend) / `STYLE_GUIDE.md` (backend). If nothing is violated, say so explicitly.
2. **Docs update** — run the Docs Update Check from `CLAUDE.md`; always add an entry to `ai-context/changelog.md`. If no doc changes are needed, say so explicitly. Tech debt found outside the task scope goes to `ai-context/legacy-warnings.md` — record it, do not fix it.
3. **Quality gates** — the commands above.

---

**Project status, current focus and completed phases:** `books-app-docs/ai-context/current-sprint.md` (do not track status here — it goes stale).
