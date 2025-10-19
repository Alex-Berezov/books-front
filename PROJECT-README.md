# Bibliaris Frontend

> Мультиязычная платформа для чтения и прослушивания аудиокниг

---

## 🎯 О проекте

**Bibliaris** — онлайн библиотека с классической литературой и реферальными ссылками на платные книги.

**Особенности:**

- 🌍 Мультиязычность (en, es, fr, pt)
- 📚 Чтение и прослушивание книг
- 🎨 Современный UI (Next.js + Ant Design)
- 🔐 Ролевая модель (user, content_manager, admin)
- ⚡ SEO-оптимизация
- 📱 Адаптивный дизайн

---

## 🚀 Быстрый старт

### 1. Изучить документацию (обязательно!)

```bash
# Главный индекс документации
cat docs/INDEX.md

# Быстрый старт
cat docs/plan/QUICKSTART.md

# Документация API бэкенда
cat docs/frontend-agents/backend-api-reference.md
```

### 2. Установить зависимости

```bash
# Используем Yarn (не npm!)
yarn install
```

### 3. Настроить окружение

```bash
# Создать .env.local
cp .env.example .env.local

# Отредактировать переменные:
# NEXT_PUBLIC_API_BASE_URL=https://api.bibliaris.com/api
# NEXTAUTH_URL=http://localhost:3000
# NEXTAUTH_SECRET=your-secret-key
```

### 4. Запустить dev-сервер

```bash
yarn dev

# Открыть http://localhost:3000
```

---

## 📚 Документация

**Главный индекс:** [docs/INDEX.md](./docs/INDEX.md)

### Ключевые разделы:

- **📋 План разработки:** [docs/plan/](./docs/plan/)

  - [DEVELOPMENT-PLAN.md](./docs/plan/DEVELOPMENT-PLAN.md) — верхнеуровневый план (10 этапов)
  - [QUICKSTART.md](./docs/plan/QUICKSTART.md) — старт за 5 шагов
  - [TASKS-TRACKING.md](./docs/plan/TASKS-TRACKING.md) — трекинг задач

- **🔧 Интеграция с API:** [docs/frontend-agents/](./docs/frontend-agents/)

  - [backend-api-reference.md](./docs/frontend-agents/backend-api-reference.md) — **КРИТИЧНО!**
  - [auth-next-auth.md](./docs/frontend-agents/auth-next-auth.md)
  - [data-fetching-and-types.md](./docs/frontend-agents/data-fetching-and-types.md)

- **📋 Детальные ТЗ:** [docs/milestones/](./docs/milestones/)
  - M0-M10 — подробные технические задания для каждого этапа

---

## 🛠 Технологии

**Frontend:**

- Next.js 14+ (App Router)
- TypeScript
- Ant Design
- React Query
- Auth.js (NextAuth)

**Backend API:**

- Production: `https://api.bibliaris.com/api`
- OpenAPI: `https://api.bibliaris.com/api/docs-json`

---

## 📋 Этапы разработки

| #   | Milestone         | Статус      | Документ                                                               |
| --- | ----------------- | ----------- | ---------------------------------------------------------------------- |
| M0  | Фундамент проекта | 🔴 Ожидание | [M0-bootstrap.md](./docs/milestones/M0-bootstrap.md)                   |
| M1  | Auth и роли       | 🔴 Ожидание | [M1-auth-and-roles.md](./docs/milestones/M1-auth-and-roles.md)         |
| M2  | Данные и типы     | 🔴 Ожидание | [M2-data-and-types.md](./docs/milestones/M2-data-and-types.md)         |
| M3  | Админка MVP       | 🔴 Ожидание | [M3-admin-mvp.md](./docs/milestones/M3-admin-mvp.md)                   |
| M4  | Контент           | 🔴 Ожидание | [M4-content-seeding.md](./docs/milestones/M4-content-seeding.md)       |
| M5  | Публичный сайт    | 🔴 Ожидание | [M5-public-site-mvp.md](./docs/milestones/M5-public-site-mvp.md)       |
| M6  | Читалка/плеер     | 🔴 Ожидание | [M6-reader-player.md](./docs/milestones/M6-reader-player.md)           |
| M7  | SEO               | 🔴 Ожидание | [M7-seo-and-indexing.md](./docs/milestones/M7-seo-and-indexing.md)     |
| M8  | Performance/UX    | 🔴 Ожидание | [M8-performance-and-ux.md](./docs/milestones/M8-performance-and-ux.md) |
| M9  | Тесты             | 🔴 Ожидание | [M9-tests-and-quality.md](./docs/milestones/M9-tests-and-quality.md)   |
| M10 | CI/CD и деплой    | 🔴 Ожидание | [M10-ci-cd-and-deploy.md](./docs/milestones/M10-ci-cd-and-deploy.md)   |

**Прогресс:** 0/10 этапов (документация готова ✅)

---

## 🎓 Методология

### Принципы:

- ✅ **Документация первична** — изучаем перед кодом
- ✅ **Итеративная разработка** — каждый milestone = работающий результат
- ✅ **TypeScript everywhere** — строгая типизация
- ✅ **Mobile-first** — начинаем с мобильных интерфейсов
- ✅ **Accessibility** — учитываем a11y с начала

### Процесс работы:

1. Изучить ТЗ milestone (`docs/milestones/M*.md`)
2. Разбить на задачи (см. `docs/plan/TASKS-TRACKING.md`)
3. Реализовать функционал
4. Проверить критерии приёмки
5. Перейти к следующему milestone

---

## 📦 Команды

```bash
# Разработка
yarn dev              # Dev-сервер (http://localhost:3000)
yarn build            # Production сборка
yarn start            # Запуск production сборки

# Качество кода
yarn lint             # ESLint проверка
yarn type-check       # TypeScript проверка
yarn format           # Prettier форматирование

# Тесты (будут добавлены в M9)
yarn test             # Unit тесты
yarn test:e2e         # E2E тесты (Playwright)
```

---

## 🔧 Структура проекта

```
books-app-front/
├── app/                      # Next.js App Router
│   ├── [lang]/              # Публичный сайт (/:lang)
│   ├── admin/[lang]/        # Админка (/admin/:lang)
│   └── (neutral)/           # Neutral routes (/versions/:id)
├── src/
│   ├── components/          # React компоненты
│   │   ├── admin/          # Компоненты админки
│   │   └── public/         # Публичные компоненты
│   ├── lib/                # Утилиты и хелперы
│   ├── api/                # API клиенты и типы
│   ├── types/              # TypeScript типы
│   └── utils/              # Общие утилиты
├── docs/                    # 📚 Документация
│   ├── plan/               # План разработки
│   ├── frontend-agents/    # Интеграция с API
│   ├── milestones/         # Детальные ТЗ
│   ├── deploy/             # Деплой
│   └── INDEX.md            # Индекс документации
└── public/                  # Статические файлы
```

---

## ✅ Текущий статус

- [x] Документация изучена
- [x] План разработки составлен
- [x] Структура документации готова
- [ ] **Следующее: M0 — Фундамент проекта**

---

## 🆘 Поддержка

### Часто задаваемые вопросы:

**Q: Где взять типы API?**  
A: `curl https://api.bibliaris.com/api/docs-json -o api-schema.json`

**Q: Какой package manager использовать?**  
A: Только **Yarn** (не npm/pnpm)

**Q: Нужна ли БД на фронте?**  
A: Нет, только Backend API

**Q: Где документация?**  
A: [docs/INDEX.md](./docs/INDEX.md) — главный индекс

---

## 📝 Следующие шаги

1. **Прочитать** [docs/plan/QUICKSTART.md](./docs/plan/QUICKSTART.md)
2. **Изучить** [docs/frontend-agents/backend-api-reference.md](./docs/frontend-agents/backend-api-reference.md)
3. **Начать M0** по [docs/milestones/M0-bootstrap.md](./docs/milestones/M0-bootstrap.md)
4. **Отслеживать прогресс** в [docs/plan/TASKS-TRACKING.md](./docs/plan/TASKS-TRACKING.md)

---

**Дата создания:** 19 октября 2025  
**Статус:** Готов к разработке ✅  
**Package Manager:** Yarn  
**Node.js:** 20.x LTS

**Удачи в разработке! 🚀**
