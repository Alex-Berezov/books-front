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
| Work queue (tech debt)                  | `ai-context/work-queue.md`             |
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
- Server pages call functions from `api/endpoints/`; client components use react-query hooks from `api/hooks/`. Transport is `lib/http.ts` and `lib/http-client/`; the `ApiError` class itself is declared in `types/api.ts`.
- **All API calls go through that layer.** A direct `fetch` bypassing it is forbidden (the one exception is `lib/utils/fetch-page.ts`): it skips `withAuthRetry`, so a stale token is never refreshed, and skips `ApiError`, so the 451 branch never fires.
- Language and token go through the `language` / `accessToken` options, **never** through your own `headers` — `mergeHeaders` strips `Accept-Language` and `Authorization` from it always (`LEGACY-139`).
- Server pages call **public** functions only, or pass `accessToken` explicitly: `http*Auth` with `requireAuth` on the server fails before the network with `ServerContextAuthUnavailable` / 500, not 401 (`LEGACY-140`).
- Handle 401 / 403 / 404 / 429 and 451 — rights blocking is its own branch (`isRightsBlockedError` in `lib/errors.ts` → `RightsBlockedNotice`), not a generic error message.
- **Every server-side public read states its cache mode**, wherever it lives — `next: { revalidate: N }` (public ones — `PUBLIC_REVALIDATE_SECONDS` from `lib/constants/cache.ts`) or `cache: 'no-store'`. The Next 14 default is "cache forever" and a page's own `revalidate` does not undo it (`LEGACY-145`). The rule used to say "every new function in `api/endpoints/`", and a read outside that folder slipped through it — `lib/seo/retired-slug.ts` pinned `{ newSlug: null }` for the life of the deployment (`LEGACY-369`). Machine reach is `__tests__/api/endpoints/publicCacheMode.test.ts`: it walks `api/endpoints/public*.ts`, `lib/seo/**/*.ts`, `lib/utils/fetch-page.ts` and `app/[lang]/**/*.tsx`. A public read written outside those globs is on you until its folder is added there.
- Endpoint catalog: `books-app-docs/backend/api/endpoints.md`.

---

## Backend Repository Constraints

`D:/newDev/books` (NestJS + Prisma + PostgreSQL) живёт по своим правилам, и копии их здесь больше нет.
До 07.09.2026 в этом разделе лежал пересказ запретов бэкенда — `db-guard`, белый список адресата, список `NEVER`,
исключение для `prisma:generate`. Это была третья копия одних и тех же правил, и она уже расходилась с двумя
другими (`LEGACY-168`): оговорка о том, что шаблоны `deny` префиксные, дошла только до `books/CLAUDE.md`.

Читать правила бэкенда там, где они живут: `books/CLAUDE.md` §«Жёсткие запреты» — граница локальной
и боевой базы, разрушительные миграции, список `deny`; `books/AGENTS.md` — окружение и локальные e2e.

Что важно знать фронту и чего нет в тех файлах: своей базы у фронта нет, трогать чужую из этого
репозитория незачем вовсе. Схема, DTO и контракты читаются свободно; правка в `books` из задачи про фронт
требует отдельного слова в ответе (`D:/newDev/CLAUDE.md`, запрет №3).

---

## Common Tasks

**New component** — `components/{area}/{ComponentName}/{ComponentName}.tsx` plus `{ComponentName}.module.scss`. Named export, exported props type.

**New page** — `app/[lang]/` (public) or `app/admin/[lang]/`. Add `generateMetadata()`; public pages need canonical + hreflang (`ai-context/seo-rules.md`). Prefer server components for initial data fetching.

**Type errors after API changes** — response types live in `types/api-schema/`, split by domain and maintained **by hand** against `https://api.bibliaris.com/docs-json`. This repo has no generation script: `yarn openapi:types:prod` in `books` writes `books/libs/api-client/src/types.ts`, which the front does not import. `types/api.ts` is hand-written too (`ApiError`, error-handling types) — **never** regenerate it. Details: `frontend/FRONTEND_TYPE_SYNC_GUIDE.md` — but only its «Метод 2» (manual update) is current practice; the «Метод 1 (Рекомендуется)» generation flow described there does not exist in this repo.

---

## Executable rules live in `CLAUDE.md`

This file describes the environment: stack, layout, conventions, where things are. **The rules
an agent must execute — quality gates, commit and push order, the hard prohibitions — live in
`books-front/CLAUDE.md`.** That file is what the harness loads automatically; this one is not.
The four owner topics (secrets; production infrastructure and the live database by hand; public
addresses; the legal semantics of book rights) live one level up, in `D:/newDev/CLAUDE.md`
§«Что остаётся за владельцем» — they are the same for all three repositories, so no repository
keeps its own copy. Keeping a second copy here is how the two drifted apart until
07.09.2026, when the copy still prescribed a manual command run and the phrases to say about it,
while the real gate had long been the actual output of `D:/newDev/.claude/hooks/gates.js` under
`hooks/report-honesty.js` (`LEGACY-168`).

What survives here, because it is environment and not rule: each repository is a separate git —
for git operations in another repo use `git -C D:\newDev\books ...`, never `cd`.

Tech debt found outside the task scope goes to `books-app-docs/ai-context/legacy-warnings.md` —
record it, do not fix it. Every doc change also gets an entry in `books-app-docs/ai-context/changelog.md`.

---

**Work queue and completed phases:** `books-app-docs/ai-context/work-queue.md` and `books-app-docs/ai-context/changelog.md` (do not track status here — it goes stale).
