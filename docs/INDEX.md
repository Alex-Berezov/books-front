# Документация фронтенда Bibliaris

> Полное руководство по разработке Next.js фронтенда для Bibliaris

---

## 📚 Содержание документации

### 🎯 Планирование и старт

**📂 [docs/plan/](./plan/)** — План разработки и трекинг задач

- **[DEVELOPMENT-PLAN.md](./plan/DEVELOPMENT-PLAN.md)** — полный верхнеуровневый план (10 milestone'ов)
- **[QUICKSTART.md](./plan/QUICKSTART.md)** — быстрый старт за 5 шагов
- **[TASKS-TRACKING.md](./plan/TASKS-TRACKING.md)** — детальный трекинг всех задач
- **[README.md](./plan/README.md)** — краткий обзор плана

**👉 Начни отсюда:** [docs/plan/QUICKSTART.md](./plan/QUICKSTART.md)

---

### 🔧 Интеграция с бэкендом

**📂 [docs/frontend-agents/](./frontend-agents/)** — Руководства по работе с API

**� Справочники API:**

1. **[ENDPOINTS.md](./ENDPOINTS.md)** — **ПОЛНЫЙ КАТАЛОГ API** (актуальная документация с бэкенда)
2. **[AI_AGENT_FRONTEND_GUIDE.md](./AI_AGENT_FRONTEND_GUIDE.md)** — Гайд для AI-агентов по работе с API

**🔧 Решения проблем:**

- **[FIX_BOOK_VERSION_404.md](./FIX_BOOK_VERSION_404.md)** — Подробное решение: 404 при создании версий
- **[FRONTEND_FIX_SUMMARY.md](./FRONTEND_FIX_SUMMARY.md)** — Быстрая шпаргалка по фиксам

**Обязательно к прочтению:**

1. **[README.md](./frontend-agents/README.md)** — обзор и навигация
2. **[ENDPOINTS.md](./ENDPOINTS.md)** — **КРИТИЧНО!** Полная документация API
3. **[quickstart.md](./frontend-agents/quickstart.md)** — 10-минутный гайд по настройке

**По темам:**

- **[auth-next-auth.md](./frontend-agents/auth-next-auth.md)** — авторизация через NextAuth
- **[data-fetching-and-types.md](./frontend-agents/data-fetching-and-types.md)** — React Query и TypeScript типы
- **[architecture-and-routing.md](./frontend-agents/architecture-and-routing.md)** — роутинг и i18n
- **[seo.md](./frontend-agents/seo.md)** — SEO и метатеги
- **[api-cheatsheet.md](./frontend-agents/api-cheatsheet.md)** — шпаргалка по эндпоинтам
- **[pages-contracts.md](./frontend-agents/pages-contracts.md)** — контракты данных для страниц
- **[error-handling.md](./frontend-agents/error-handling.md)** — обработка ошибок API
- **[development.md](./frontend-agents/development.md)** — советы по разработке

---

### 📋 Детальные ТЗ этапов

**📂 [docs/milestones/](./milestones/)** — Подробные технические задания

**Фундамент:**

- **[M0-bootstrap.md](./milestones/M0-bootstrap.md)** — инициализация проекта
- **[M1-auth-and-roles.md](./milestones/M1-auth-and-roles.md)** — авторизация
- **[M2-data-and-types.md](./milestones/M2-data-and-types.md)** — данные и типизация

**Функционал:**

- **[M3-admin-mvp.md](./milestones/M3-admin-mvp.md)** — админ-панель
- **[M4-content-seeding.md](./milestones/M4-content-seeding.md)** — наполнение контентом
- **[M5-public-site-mvp.md](./milestones/M5-public-site-mvp.md)** — публичный сайт
- **[M6-reader-player.md](./milestones/M6-reader-player.md)** — читалка и плеер

**Оптимизация:**

- **[M7-seo-and-indexing.md](./milestones/M7-seo-and-indexing.md)** — SEO
- **[M8-performance-and-ux.md](./milestones/M8-performance-and-ux.md)** — производительность
- **[M9-tests-and-quality.md](./milestones/M9-tests-and-quality.md)** — тестирование

**Деплой:**

- **[M10-ci-cd-and-deploy.md](./milestones/M10-ci-cd-and-deploy.md)** — CI/CD и production

---

### 🚀 Деплой и инфраструктура

**📂 [docs/deploy/](./deploy/)** — Развертывание в production

- **[frontend-deployment-guide.md](./deploy/frontend-deployment-guide.md)** — гайд по деплою фронтенда
- **[env.md](./deploy/env.md)** — переменные окружения
- **[cache-policy.md](./deploy/cache-policy.md)** — политика кэширования
- **[README.md](./deploy/README.md)** — обзор деплоя

---

### ⚙️ Engineering практики

**📂 [docs/engineering/](./engineering/)** — Инженерные процессы

- **[release.md](./engineering/release.md)** — процесс релизов
- **[feature-flags.md](./engineering/feature-flags.md)** — feature flags

---

### 📊 Качество и мониторинг

**📂 [docs/quality/](./quality/)** — SLO и метрики

- **[slo-error-budgets.md](./quality/slo-error-budgets.md)** — SLO и error budgets

**📂 [docs/ops/](./ops/)** — Операционные процессы

- **[uptime-monitoring.md](./ops/uptime-monitoring.md)** — мониторинг доступности

---

### 📖 Общая информация

**Корневые документы:**

- **[AI-AGENT-BRIEFING.md](./AI-AGENT-BRIEFING.md)** — бриф для AI-агентов
- **[GIT-WORKFLOW.md](./GIT-WORKFLOW.md)** — процесс работы с Git и code review

---

## 🎯 Рекомендуемый порядок чтения

### Для быстрого старта (30 мин):

1. ✅ [docs/plan/QUICKSTART.md](./plan/QUICKSTART.md) — как начать за 5 шагов
2. ✅ [docs/ENDPOINTS.md](./ENDPOINTS.md) — критичная информация об API
3. ✅ [docs/milestones/M0-bootstrap.md](./milestones/M0-bootstrap.md) — первый этап работы

### Для глубокого понимания (2-3 часа):

1. [../PROJECT-README.md](../PROJECT-README.md) — что за проект (в корне репо)
2. [docs/plan/DEVELOPMENT-PLAN.md](./plan/DEVELOPMENT-PLAN.md) — полный план
3. [docs/frontend-agents/README.md](./frontend-agents/README.md) — обзор интеграций
4. Все файлы из [docs/frontend-agents/](./frontend-agents/)
5. Детальные ТЗ нужных milestone'ов

---

## 🔧 Технический стек

**Frontend:**

- Next.js 14+ (App Router)
- TypeScript
- Ant Design
- React Query
- Auth.js (NextAuth)

**Backend (готов):**

- API: `https://api.bibliaris.com/api`
- OpenAPI Schema: `https://api.bibliaris.com/api/docs-json`

**Языки:** en, es, fr, pt

---

## 📊 Структура разработки

### 10 Milestone'ов:

| #   | Название       | Статус | Документ                                                          |
| --- | -------------- | ------ | ----------------------------------------------------------------- |
| M0  | Фундамент      | 🔴     | [M0-bootstrap.md](./milestones/M0-bootstrap.md)                   |
| M1  | Auth           | 🔴     | [M1-auth-and-roles.md](./milestones/M1-auth-and-roles.md)         |
| M2  | Данные         | 🔴     | [M2-data-and-types.md](./milestones/M2-data-and-types.md)         |
| M3  | Админка        | 🔴     | [M3-admin-mvp.md](./milestones/M3-admin-mvp.md)                   |
| M4  | Контент        | 🔴     | [M4-content-seeding.md](./milestones/M4-content-seeding.md)       |
| M5  | Публичный сайт | 🔴     | [M5-public-site-mvp.md](./milestones/M5-public-site-mvp.md)       |
| M6  | Читалка        | 🔴     | [M6-reader-player.md](./milestones/M6-reader-player.md)           |
| M7  | SEO            | 🔴     | [M7-seo-and-indexing.md](./milestones/M7-seo-and-indexing.md)     |
| M8  | Performance    | 🔴     | [M8-performance-and-ux.md](./milestones/M8-performance-and-ux.md) |
| M9  | Тесты          | 🔴     | [M9-tests-and-quality.md](./milestones/M9-tests-and-quality.md)   |
| M10 | Деплой         | 🔴     | [M10-ci-cd-and-deploy.md](./milestones/M10-ci-cd-and-deploy.md)   |

**Общий прогресс:** 0% (документация готова ✅)

---

## 🚀 Следующие шаги

1. **Прочитать** [QUICKSTART.md](./plan/QUICKSTART.md)
2. **Изучить** [backend-api-reference.md](./frontend-agents/backend-api-reference.md)
3. **Начать M0** согласно [M0-bootstrap.md](./milestones/M0-bootstrap.md)
4. **Отслеживать прогресс** в [TASKS-TRACKING.md](./plan/TASKS-TRACKING.md)

---

## 💡 Полезные ссылки

**Backend API:**

- Production API: https://api.bibliaris.com/api
- Health Check: https://api.bibliaris.com/api/health/liveness
- OpenAPI Schema: https://api.bibliaris.com/api/docs-json

**Документация:**

- Корневая папка: `docs/`
- План: `docs/plan/`
- Интеграции: `docs/frontend-agents/`
- ТЗ этапов: `docs/milestones/`

---

## 📝 Примечания

- **Package Manager:** Yarn (не npm/pnpm)
- **Node.js:** 20.x LTS
- **Backend:** Готов и доступен (не требует настройки для фронтенда)
- При вопросах: сначала проверить документацию в `docs/frontend-agents/`

---

**Дата создания:** 19 октября 2025  
**Статус:** Документация готова к использованию ✅  
**Следующий шаг:** Начать M0 (Фундамент проекта)
