# Bibliaris — Frontend (`books-front`)

Точка входа для Claude Code. Обязательные правила разработки лежат в `AGENTS.md` и подключены ниже — они являются частью этого файла.

@AGENTS.md

---

## Карта проекта: три репозитория

Bibliaris состоит из трёх независимых git-репозиториев. Все три доступны в этой сессии на чтение и запись (см. `.claude/settings.json` → `additionalDirectories`).

| Репозиторий      | Путь                       | Роль                                                          |
| ---------------- | -------------------------- | ------------------------------------------------------------- |
| `books-front`    | `D:\newDev\books-front`    | Next.js 14 (App Router), TS, AntD 5, React Query, NextAuth v5 |
| `books`          | `D:\newDev\books`          | NestJS + Prisma + PostgreSQL, REST API                        |
| `books-app-docs` | `D:\newDev\books-app-docs` | Документация — единый источник правды                         |

**Кросс-репозиторные правила:**

- Каждый репозиторий — отдельный git. Для git-операций в другом репо используй `git -C D:\newDev\books ...`, не `cd`.
- Изменил API-контракт на бэке → синхронизируй типы и вызовы на фронте **и** обнови документацию.
- Изменил `SUPPORTED_LANGS` → синхронизируй `books-front/lib/i18n/lang.ts`, Prisma-enum `Language` в `books` и `books-app-docs/ai-context/translation-rules.md`.

---

## Документация: читать вместо анализа кодовой базы

**Перед задачей читай документацию, а не сканируй проект целиком.** Порядок:

1. `D:\newDev\books-app-docs\ai-context\agent-rules.md` — правила для агента, читать первым.
2. Полная таблица «какой документ под какую задачу» — `D:\newDev\books-app-docs\ai-context\README.md`.
3. Из неё выбрать **только релевантные** документы. Не читать `ai-context/` целиком — это перерасход контекста.

Быстрая навигация (полная таблица — в `ai-context/README.md`):

| Задача                             | Документы в `books-app-docs`                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Любая frontend-задача              | `ai-context/frontend.md`, `frontend/frontend-agents/architecture-and-routing.md`                        |
| Работа с API                       | `ai-context/api-contracts.md`, `backend/api/endpoints.md`, `frontend/frontend-agents/api-cheatsheet.md` |
| SEO, meta, sitemap                 | `ai-context/seo-rules.md`, `frontend/frontend-agents/seo.md`                                            |
| Auth / роли / NextAuth             | `ai-context/auth-and-permissions.md`, `frontend/frontend-agents/nextauth-session-config.md`             |
| i18n, языки                        | `ai-context/translation-rules.md`                                                                       |
| UI-компоненты, токены              | `ai-context/ui-kit.md`                                                                                  |
| Контент: книги, авторы, таксономии | `ai-context/content-model.md`, `ai-context/taxonomy-rules.md`, `ai-context/product-rules.md`            |
| Данные, схема БД                   | `ai-context/database-schema.md`                                                                         |
| Перед рефакторингом                | `ai-context/legacy-warnings.md`                                                                         |
| Навигация по коду                  | `ai-context/folder-structure.md`                                                                        |
| Что делается сейчас                | `ai-context/current-sprint.md`                                                                          |

**Важно:** документация читается напрямую из `D:\newDev\books-app-docs\` обычными Read/Grep/Glob — MCP-сервер `books-docs` для этого не нужен. Актуальный каталог эндпоинтов — `backend/api/endpoints.md`.

---

## Обновление документации — обязательная часть задачи

Документация — не побочный артефакт. После каждой нетривиальной задачи выполняй Docs Update Check (см. также `ai-context/agent-rules.md`):

- меняли API/DTO → `ai-context/api-contracts.md`, `backend/api/endpoints.md`;
- меняли сущности → `ai-context/content-model.md`, `ai-context/database-schema.md`;
- меняли SEO / таксономии / i18n / auth / зависимости → соответствующий документ в `ai-context/`;
- архитектурное решение → `ai-context/architecture.md` + ADR в `ai-context/adr/`;
- всегда → запись в `ai-context/changelog.md`;
- найден техдолг вне scope → записать в `ai-context/legacy-warnings.md`, **не чинить**.

Если правки не нужны — явно сказать: «документация не требует обновления».

---

## Quality gates, код-стиль, жёсткие ограничения

Все обязательные правила — команды проверок, запрет на `any`/`@ts-ignore`/inline-стили, запрет коммитить без разрешения, недоступность БД локально — описаны в `AGENTS.md` выше. Полная матрица проверок: `ai-context/quality-gates.md`.
