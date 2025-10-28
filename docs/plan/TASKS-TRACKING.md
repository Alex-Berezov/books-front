# Трекинг задач разработки фронтенда

> Статус выполнения всех задач по milestone'ам

**Легенда:**

- 🔴 Не начато
- 🟡 В процессе
- 🟢 Завершено
- ⏸️ Заблокировано

---

## 📊 Сводка прогресса

| Milestone               | Статус       | Прогресс   | Приоритет      | Срок        |
| ----------------------- | ------------ | ---------- | -------------- | ----------- |
| **M0** - Фундамент      | 🟢 Завершено | 7/7 (100%) | 🔥 Критический | 3-5 дней    |
| **M1** - Авторизация    | 🟢 Завершено | 7/7 (100%) | 🔥 Критический | 2-3 дня     |
| **M2** - Данные и типы  | 🟢 Завершено | 7/7 (100%) | 🔥 Критический | 3-4 дня     |
| **M3** - Админка        | 🟡 В работе  | 0/10 фаз   | 🔥 Критический | 23-30 часов |
| **M4** - Контент        | 🔴 Не начато | 0/4        | 🔶 Высокий     | 1-2 дня     |
| **M5** - Публичный сайт | 🔴 Не начато | 0/6        | 🔥 Критический | 4-6 дней    |
| **M6** - Reader/Player  | 🔴 Не начато | 0/5        | 🔶 Высокий     | 3-5 дней    |
| **M7** - SEO            | 🔴 Не начато | 0/5        | 🔶 Средний     | 2-3 дня     |
| **M8** - Performance    | 🔴 Не начато | 0/5        | 🔵 Низкий      | 2-3 дня     |
| **M9** - Тесты          | 🔴 Не начато | 0/6        | 🔵 Низкий      | 3-5 дней    |
| **M10** - CI/CD         | 🔴 Не начато | 0/5        | 🔶 Средний     | 2-3 дня     |

**Текущий фокус:** M3.1.1 - Создание admin layout с защитой ролей

**Следующие шаги:**

1. Фаза 1: Инфраструктура админки (2-3ч)
2. Фаза 2: Books Management (4-5ч)
3. Фаза 3: CMS Pages (2ч)

---

## ⚠️ КРИТИЧЕСКОЕ ПРАВИЛО: Git Push после каждой подзадачи

**ОБЯЗАТЕЛЬНО:** После завершения каждой подзадачи делать **commit + CODE REVIEW + push в GitHub**!

📖 **Детальная инструкция:** [../GIT-WORKFLOW.md](../GIT-WORKFLOW.md)

**Процедура:**

1. ✅ Завершили подзадачу (например, M0.4)
2. ✅ `yarn typecheck && yarn lint` — проверили, что всё ОК
3. ✅ `git add . && git commit -m "feat: add language switchers (M0.4)"`
4. ⏸️ **ОСТАНОВИТЬСЯ! Сообщить разработчику о готовности к ревью**
5. ⏳ **ЖДАТЬ CODE REVIEW И ОДОБРЕНИЯ**
6. ✅ После одобрения: `git push`
7. ✅ Отметить подзадачу здесь как 🟢
8. ✅ `git add docs/plan/TASKS-TRACKING.md && git commit -m "docs: mark M0.4 as completed" && git push`

**🚫 AI-АГЕНТ НЕ ДОЛЖЕН ДЕЛАТЬ PUSH БЕЗ ЯВНОГО РАЗРЕШЕНИЯ РАЗРАБОТЧИКА!**

**🚫 НЕ ПЕРЕХОДИТЬ К СЛЕДУЮЩЕЙ ПОДЗАДАЧЕ БЕЗ PUSH ТЕКУЩЕЙ!**

---

## M0 — Фундамент проекта

**Статус:** � Завершено (100%)  
**Срок:** 3-5 дней  
**Приоритет:** 🔥 Критический

### Задачи:

- [x] � **M0.1** Инициализация проекта
  - [x] Создать Next.js (App Router, TypeScript)
  - [x] Настроить ESLint и Prettier
  - [x] Создать `.env.example` с ключевыми переменными
  - [x] Настроить `tsconfig.json` (strict mode)

- [x] � **M0.2** Структура каталогов и роутинг
  - [x] Создать `app/[lang]` с ограничением языков (en|es|fr|pt)
  - [x] Создать `app/admin/[lang]`
  - [x] Создать `app/(neutral)`
  - [x] Добавить страницы-заглушки
  - [x] Реализовать `not-found.tsx` и `error.tsx`

- [x] 🟢 **M0.3** Базовые layout'ы и провайдеры
  - [x] `app/[lang]/layout.tsx` с извлечением языка
  - [x] `app/admin/[lang]/layout.tsx`
  - [x] `providers/AppProviders.tsx` (React Query, AntD)
  - [x] Базовые стили и тема AntD

- [x] 🟢 **M0.4** Переключатели языка
  - [x] `components/LanguageSwitcher.tsx` для публички
  - [x] `components/admin/AdminLanguageSwitcher.tsx`
  - [x] `lib/i18n/lang.ts` с утилитами языков

- [x] 🟢 **M0.5** NextAuth заготовка
  - [x] Структура для NextAuth (без реальной авторизации)
  - [x] `types/next-auth.d.ts` с расширенными типами
  - [x] `lib/auth/config.ts` с заготовками callbacks
  - [x] `lib/auth/auth.ts` с NextAuth v5 instance
  - [x] `lib/auth/SessionProvider.tsx` для клиентских компонентов
  - [x] `lib/auth/helpers.ts` с утилитами для серверных компонентов
  - [x] `app/api/auth/[...nextauth]/route.ts` - API Route Handler
  - [x] `lib/auth/README.md` с документацией

- [x] � **M0.6** Базовый fetcher
  - [x] `lib/http.ts` с базовым URL и обработкой ошибок
  - [x] Поддержка `Accept-Language` заголовка
  - [x] Поддержка `Authorization` заголовка
  - [x] Типизированные HTTP методы (GET, POST, PATCH, PUT, DELETE)
  - [x] `types/api.ts` с классом ApiError и типами

- [x] 🟢 **M0.7** Качество кода
  - [x] Настроить линтеры
  - [x] Добавить скрипты: dev, build, lint, typecheck, format
  - [ ] (Опционально) lint-staged + husky

**Критерии приёмки M0:**

- [x] `yarn build` проходит без ошибок
- [x] Работают маршруты `/:lang` и `/admin/:lang`
- [x] Переключатель языка корректно меняет URL
- [x] Базовый layout с шапкой/футером отображается
- [x] HTTP клиент готов к использованию с типизацией

---

- [x] � **M0.4** Переключатели языка
  - [x] `components/LanguageSwitcher.tsx` для публички
  - [x] `components/admin/AdminLanguageSwitcher.tsx`
  - [x] `lib/i18n/lang.ts` с утилитами языков

- [ ] 🔴 **M0.5** NextAuth заготовка
  - [ ] Структура для NextAuth (без реальной авторизации)
  - [ ] `types/next-auth.d.ts` с расширенными типами
  - [ ] Провайдер сессий

- [ ] 🔴 **M0.6** Базовый fetcher
  - [ ] `lib/http.ts` с базовым URL и обработкой ошибок
  - [ ] Поддержка `Accept-Language` заголовка

- [x] � **M0.7** Качество кода
  - [x] Настроить линтеры
  - [x] Добавить скрипты: dev, build, lint, typecheck, format
  - [ ] (Опционально) lint-staged + husky

**Критерии приёмки M0:**

- [x] `yarn build` проходит без ошибок
- [x] Работают маршруты `/:lang` и `/admin/:lang`
- [ ] Переключатель языка корректно меняет URL
- [x] Базовый layout с шапкой/футером отображается

---

## M1 — Авторизация и роли

**Статус:** � Завершено (100%)  
**Срок:** 2-3 дня  
**Приоритет:** 🔥 Критический  
**Блокировка:** Требует M0

### Задачи:

- [x] � **M1.1** Зависимости и окружение
  - [x] Установить `next-auth`
  - [x] Обновить `.env.example` (NEXTAUTH_URL, NEXTAUTH_SECRET)

- [x] � **M1.2** Конфигурация NextAuth
  - [x] `app/api/auth/[...nextauth]/route.ts`
  - [x] `src/auth/nextAuthOptions.ts` с Credentials provider
  - [x] Callbacks: jwt (сохранение токенов)
  - [x] Callbacks: session (прокидывание в сессию)

- [x] � **M1.3** Расширение типов NextAuth
  - [x] `src/types/next-auth.d.ts` (JWT, Session)

- [x] � **M1.4** Страница входа
  - [x] `app/[lang]/auth/sign-in/page.tsx`
  - [x] Форма на Ant Design (email, password)
  - [x] Обработка ошибок валидации
  - [x] Редиректы после успешного входа

- [x] � **M1.5** Получение ролей
  - [x] Вызов `GET /users/me` после логина
  - [x] Сохранение ролей в сессии
  - [x] Хелпер `src/auth/getCurrentUser.ts`

- [x] � **M1.6** Защита админ-маршрутов
  - [x] Middleware или серверная проверка в layout
  - [x] Редирект на sign-in при отсутствии прав
  - [x] Проверка ролей (admin|content_manager)

- [x] � **M1.7** Автоматический refresh токенов
  - [x] Логика refresh в jwt callback
  - [x] Обработка истёкших токенов
  - [x] Корректный signOut при ошибке refresh

**Критерии приёмки M1:**

- [x] Вход/выход работают
- [x] Админка защищена и доступна только с правами
- [x] Refresh токенов автоматический
- [x] 401/403 корректно обрабатываются

---

## M2 — Данные и типы

**Статус:** � Завершено (100%)  
**Срок:** 2-3 дня  
**Приоритет:** 🔥 Критический  
**Блокировка:** Требует M1

### Задачи:

- [x] � **M2.1** Типы из OpenAPI
  - [x] Скачать схему с `/api/docs-json`
  - [x] Сгенерировать `types/api-schema.ts`
  - [x] Создать временные типы вручную (OpenAPI недоступен в prod)

- [x] � **M2.2** HTTP-клиент
  - [x] `lib/http-client.ts` с NextAuth интеграцией
  - [x] Добавление Authorization заголовка
  - [x] Добавление Accept-Language
  - [x] Обработка ошибок (ApiError)

- [x] � **M2.3** React Query настройки
  - [x] `lib/queryClient.ts` с дефолтными опциями
  - [x] Провайдер в AppProviders
  - [x] Определение ключей кэша

- [x] � **M2.4** Обработка 401 + refresh
  - [x] Автоматический refresh при 401
  - [x] Повтор запроса после refresh
  - [x] SignOut при неудачном refresh

- [x] � **M2.5** Интеграция языка
  - [x] Извлечение языка из URL
  - [x] `lib/i18n-headers.ts`
  - [x] Утилиты для работы с языком

- [x] � **M2.6** Типизированные эндпоинты
  - [x] `api/endpoints/public.ts`
  - [x] `api/endpoints/auth.ts`
  - [x] Хуки React Query для всех эндпоинтов

- [x] � **M2.7** Обработка ошибок
  - [x] `lib/errors.ts` с маппингом ошибок
  - [x] toUserMessage, getErrorType, getValidationErrors
  - [x] Утилиты для определения retry и action

**Критерии приёмки M2:**

- [x] Типы работают без ошибок TS
- [x] Запросы к API проходят с корректными заголовками
- [x] Кэширование React Query работает
- [x] Ошибки корректно обрабатываются

---

## M3 — Админка (миграция из React)

**Статус:** � В работе  
**Срок:** 23-30 часов (~3-4 недели при частичной занятости)  
**Приоритет:** � Критический  
**Блокировка:** Требует M2  
**План:** См. `docs/plan/ADMIN-MIGRATION-PLAN.md`

**Стратегия:** Миграция готовой админки из React-репозитория (https://github.com/Farizda/book) в Next.js App Router с интеграцией API и маленькими итерациями.

### Фаза 1: Инфраструктура (Must Have, 2-3ч)

- [ ] 🔴 **M3.1.1** Admin Layout & Routing
  - [ ] Создать `app/admin/[lang]/layout.tsx` с защитой ролей
  - [ ] Обновить `middleware.ts` для проверки admin-ролей
  - [ ] Базовый shell с AdminSidebar + AdminTopBar

- [ ] 🔴 **M3.1.2** Навигация
  - [ ] Мигрировать `Sidebar.tsx` → `components/admin/AdminSidebar.tsx`
  - [ ] Заменить onClick на Next.js `<Link>`, `usePathname()` для active state
  - [ ] Добавить иконки из lucide-react

- [ ] 🔴 **M3.1.3** TopBar
  - [ ] Мигрировать `TopBar.tsx` → `components/admin/AdminTopBar.tsx`
  - [ ] Интегрировать URL-based i18n через `LanguageSwitcher`
  - [ ] Добавить logout кнопку (NextAuth signOut)

### Фаза 2: Books Management (Must Have, 4-5ч)

- [x] 🟢 **M3.2.1** Books List (Завершено 28.10.2025)
  - [x] Создать `app/admin/[lang]/books/page.tsx` (Server Component)
  - [x] Создать `components/admin/books/BookListTable.tsx` (Client Component)
  - [x] Создать `api/endpoints/admin.ts` с функцией getBooks
  - [x] Создать `api/hooks/useAdmin.ts` с хуком useBooks
  - [x] Реализовать search/filters по title/author/slug
  - [x] Добавить пагинацию (prev/next кнопки)
  - [x] Добавить стили через SCSS с design tokens

- [x] 🟢 **M3.2.2** Book Editor - Shell (Завершено 28.10.2025)
  - [x] Создать `app/admin/[lang]/books/versions/[id]/page.tsx`
  - [x] Создать `components/admin/books/BookForm.tsx`
  - [x] Добавить `react-hook-form` + `zod` валидацию
  - [x] Реализовать 4 таба: Overview / Read Content / Listen Content / Summary

- [x] 🟢 **M3.2.3** Book Editor - Content Tabs (Завершено 28.10.2025)
  - [x] Read Content: текстовый контент/главы
  - [x] Listen Content: аудио-версии/главы
  - [x] Summary: генерация/отображение саммари

- [x] 🟢 **M3.2.4** Publish Panel (Завершено 28.10.2025)
  - [x] Создать `components/admin/books/PublishPanel.tsx`
  - [x] Sidebar с Publish/Unpublish кнопкой
  - [x] Status indicator (Published/Draft/Archived)
  - [x] Модальное окно подтверждения
  - [x] Интеграция с `usePublishVersion` и `useUnpublishVersion`
  - [x] Адаптивный layout со sidebar

- [ ] 🔴 **M3.2.5** Categories & Tags Panels
  - [ ] Categories: multi-select с деревом
  - [ ] Tags: autocomplete с созданием новых
  - [ ] Связь через API (book-category, book-tag endpoints)

- [ ] 🔴 **M3.2.2** Book Editor - Shell
  - [ ] Создать `app/admin/[lang]/books/[id]/page.tsx`
  - [ ] Мигрировать `BookEditor.tsx` → `components/admin/BookEditor.tsx`
  - [ ] Добавить `react-hook-form` + `zod` валидацию
  - [ ] Реализовать 4 таба: Overview / Read Content / Audio Content / Summary

- [ ] 🔴 **M3.2.3** Book Editor - Overview Tab
  - [ ] Форма: title, slug, description, ISBN, author, publisher
  - [ ] SEO поля: meta title, meta description
  - [ ] Интеграция с `useBookMutation()` для create/update

- [ ] 🔴 **M3.2.4** Book Editor - Content Tabs
  - [ ] Read Content: текстовый контент/версии
  - [ ] Audio Content: аудио-версии
  - [ ] Summary: генерация/отображение саммари

- [ ] 🔴 **M3.2.5** Publish Panel
  - [ ] Sidebar: Publish/Unpublish кнопка
  - [ ] Status indicator (Published/Draft)
  - [ ] Cover image upload через `useMediaUpload()`

- [ ] 🔴 **M3.2.6** Categories & Tags Panels
  - [ ] Categories: multi-select с деревом
  - [ ] Tags: autocomplete с созданием новых
  - [ ] Связь через API (book-category, book-tag endpoints)

### Фаза 3: CMS Pages (Must Have, 2ч)

- [ ] 🔴 **M3.3.1** Pages List
  - [ ] Создать `app/admin/[lang]/pages/page.tsx`
  - [ ] Мигрировать `PagesList.tsx` с API интеграцией
  - [ ] Search, фильтр по status (published/draft)

- [ ] 🔴 **M3.3.2** Page Editor
  - [ ] Создать `app/admin/[lang]/pages/[id]/page.tsx`
  - [ ] Мигрировать `PageEditor.tsx` с `react-hook-form`
  - [ ] Поля: title, slug, content (markdown/rich text), SEO
  - [ ] Publish/unpublish функционал

### Фаза 4: Categories & Tags (Must Have, 3ч)

- [ ] 🔴 **M3.4.1** Categories Tree
  - [ ] Создать `app/admin/[lang]/categories/page.tsx`
  - [ ] Мигрировать `Categories.tsx` с рекурсивным деревом
  - [ ] API интеграция: `GET /api/categories/tree`
  - [ ] Inline create/edit/delete с валидацией
  - [ ] Expand/collapse состояние в localStorage

- [ ] 🔴 **M3.4.2** Drag & Drop (optional)
  - [ ] Добавить `@dnd-kit` для переупорядочивания
  - [ ] PATCH запросы для обновления order/parent_id

- [ ] 🔴 **M3.4.3** Tags Management
  - [ ] Создать `app/admin/[lang]/tags/page.tsx`
  - [ ] Мигрировать `Tags.tsx` с API интеграцией
  - [ ] CRUD операции через `useTagMutation()`
  - [ ] Search и пагинация

### Фаза 5: Media Library (Must Have, 3-4ч)

- [ ] 🔴 **M3.5.1** Media Grid/List Views
  - [ ] Создать `app/admin/[lang]/media/page.tsx`
  - [ ] Мигрировать `MediaLibrary.tsx` с переключением grid/list
  - [ ] API: `GET /api/media` с пагинацией

- [ ] 🔴 **M3.5.2** File Upload
  - [ ] Drag & drop зона для загрузки
  - [ ] `POST /api/media/upload` с progress indicator
  - [ ] Поддержка multiple files

- [ ] 🔴 **M3.5.3** Media Details & Actions
  - [ ] Preview modal для изображений
  - [ ] Edit метаданных (alt, title, caption)
  - [ ] Delete с подтверждением
  - [ ] Copy URL to clipboard

### Фаза 6: Comments Moderation (Should Have, 2ч)

- [ ] � **M3.6.1** Comments List
  - [ ] Создать `app/admin/[lang]/comments/page.tsx`
  - [ ] Мигрировать `Comments.tsx` с API интеграцией
  - [ ] Фильтр: visible/hidden/all

- [ ] 🟡 **M3.6.2** Moderation Actions
  - [ ] Show/Hide toggle через API
  - [ ] Delete с подтверждением
  - [ ] Real-time updates (optional: polling или websockets)

### Фаза 7: User Management (Should Have, 2-3ч)

- [ ] 🟡 **M3.7.1** Users List
  - [ ] Создать `app/admin/[lang]/users/page.tsx`
  - [ ] Мигрировать `Users.tsx` с API интеграцией
  - [ ] Фильтр по role (admin/editor/subscriber)

- [ ] 🟡 **M3.7.2** User Editor
  - [ ] Modal/page для create/edit
  - [ ] Поля: username, email, role, password (при создании)
  - [ ] Role icons/badges (Crown=admin, Shield=editor, User=subscriber)

- [ ] 🟡 **M3.7.3** Role Management
  - [ ] Защита от downgrade собственной роли
  - [ ] Логи изменения ролей (audit trail)

### Фаза 8: Shared Components (Should Have, 1-2ч)

- [ ] 🟡 **M3.8.1** UI Kit для админки
  - [ ] `components/admin/ui/Button.tsx`
  - [ ] `components/admin/ui/Input.tsx`
  - [ ] `components/admin/ui/Select.tsx`
  - [ ] `components/admin/ui/Modal.tsx`
  - [ ] Tailwind classes как в исходнике (rounded-lg, shadow-sm, border)

- [ ] � **M3.8.2** Shared Utilities
  - [ ] `lib/admin/formatters.ts` (date, status, file size)
  - [ ] `lib/admin/validators.ts` (slug, URL, ISBN)
  - [ ] `lib/admin/constants.ts` (status colors, role badges)

### Фаза 9: Polish & UX (Nice to Have, 2-3ч)

- [ ] 🟢 **M3.9.1** Loading States
  - [ ] Skeletons для списков
  - [ ] Spinner для кнопок при сохранении
  - [ ] Progress bars для uploads

- [ ] 🟢 **M3.9.2** Empty States
  - [ ] Красивые empty states с иконками
  - [ ] CTA кнопки для создания первого элемента

- [ ] 🟢 **M3.9.3** Toast Notifications
  - [ ] Success/error toasts через `sonner` или `react-hot-toast`
  - [ ] Optimistic updates с rollback

- [ ] 🟢 **M3.9.4** Keyboard Shortcuts
  - [ ] Cmd+S для сохранения
  - [ ] Cmd+K для command palette (optional)

### Фаза 10: Testing & QA (Nice to Have, 2-3ч)

- [ ] 🟢 **M3.10.1** Unit Tests
  - [ ] Formatters/validators
  - [ ] Form validation logic

- [ ] 🟢 **M3.10.2** Integration Tests
  - [ ] React Query hooks с mock API
  - [ ] Form submissions

- [ ] 🟢 **M3.10.3** E2E Tests (optional)
  - [ ] Playwright: login → create book → publish
  - [ ] Critical user flows

**Критерии приёмки M3:**

- [ ] Все 7 разделов админки работают: Books, Pages, Categories, Tags, Media, Comments, Users
- [ ] Интеграция с API полностью функциональна (no mocks)
- [ ] Формы с валидацией (react-hook-form + zod)
- [ ] Роль-based доступ работает (admin-only)
- [ ] UI соответствует дизайну из исходного React-репо (Tailwind CSS)
- [ ] TypeScript без ошибок
- [ ] Переводы работают через URL-based i18n

---

## M4 — Наполнение контентом

**Статус:** 🔴 Не начато  
**Срок:** 1-2 дня  
**Приоритет:** 🔶 Высокий  
**Блокировка:** Требует M3

### Задачи:

- [ ] 🔴 **M4.1** CMS страницы
  - [ ] Создать 5-10 страниц (О нас, Контакты, FAQ и т.д.)
  - [ ] Переводы на все языки

- [ ] 🔴 **M4.2** Книги
  - [ ] Создать 10-20 книг
  - [ ] Переводы описаний
  - [ ] Настроить обложки (если есть)

- [ ] 🔴 **M4.3** Версии и главы
  - [ ] Добавить текстовые версии для части книг
  - [ ] Добавить аудио-версии (с placeholder URL)
  - [ ] Наполнить главами

- [ ] 🔴 **M4.4** Taxonomy
  - [ ] Создать категории (Fiction, Non-fiction, Classics и т.д.)
  - [ ] Создать теги
  - [ ] Привязать к книгам

**Критерии приёмки M4:**

- [ ] Есть демо-контент на всех 4 языках
- [ ] Можно протестировать публичный сайт на реальных данных

---

## M5 — Публичный сайт MVP

**Статус:** 🔴 Не начато  
**Срок:** 4-6 дней  
**Приоритет:** 🔥 Критический  
**Блокировка:** Требует M4

### Задачи:

- [ ] 🔴 **M5.1** Базовый layout
  - [ ] `app/[lang]/layout.tsx` с шапкой/футером
  - [ ] Глобальный LanguageSwitcher

- [ ] 🔴 **M5.2** CMS страница
  - [ ] `app/[lang]/pages/[slug]/page.tsx`
  - [ ] generateMetadata через /seo/resolve
  - [ ] Обработка 404

- [ ] 🔴 **M5.3** Обзор книги
  - [ ] `app/[lang]/books/[slug]/overview/page.tsx`
  - [ ] CTA к чтению/прослушиванию
  - [ ] Metadata и SEO

- [ ] 🔴 **M5.4** Списки по таксономиям
  - [ ] `app/[lang]/categories/[slug]/books/page.tsx`
  - [ ] `app/[lang]/tags/[slug]/books/page.tsx`
  - [ ] Карточки версий/книг
  - [ ] Пагинация

- [ ] 🔴 **M5.5** Переключатель языка
  - [ ] Резолв URL для переводов
  - [ ] Обработка отсутствующих переводов
  - [ ] `src/utils/public-i18n.ts`

- [ ] 🔴 **M5.6** SEO
  - [ ] generateMetadata на всех страницах
  - [ ] Canonical URLs
  - [ ] Hreflang links
  - [ ] Базовый sitemap (опционально)

**Критерии приёмки M5:**

- [ ] Все публичные страницы работают
- [ ] SEO метаданные корректны
- [ ] Переключение языка работает
- [ ] 404 корректно обрабатывается

---

## M6 — Читалка и плеер

**Статус:** 🔴 Не начато  
**Срок:** 5-7 дней  
**Приоритет:** 🔶 Высокий  
**Блокировка:** Требует M5

### Задачи:

- [ ] 🔴 **M6.1** Маршрут версии
  - [ ] `app/(neutral)/versions/[id]/page.tsx`
  - [ ] Получение деталей версии и глав

- [ ] 🔴 **M6.2** Читалка текста
  - [ ] Компонент отображения текста
  - [ ] Навигация по главам
  - [ ] Сохранение позиции чтения
  - [ ] Настройки (шрифт, размер и т.д.)

- [ ] 🔴 **M6.3** Аудио-плеер
  - [ ] HTML5 audio элемент или библиотека
  - [ ] Управление воспроизведением
  - [ ] Навигация по главам
  - [ ] Сохранение прогресса

- [ ] 🔴 **M6.4** Bookshelf
  - [ ] Добавление в полку
  - [ ] Удаление из полки
  - [ ] Список "моих" книг

- [ ] 🔴 **M6.5** Прогресс
  - [ ] Сохранение позиции чтения
  - [ ] Отображение прогресса (%)
  - [ ] Синхронизация с бэкендом

- [ ] 🔴 **M6.6** Социальные функции
  - [ ] Лайки
  - [ ] Комментарии (базовый UI)

**Критерии приёмки M6:**

- [ ] Можно читать текстовые версии
- [ ] Можно слушать аудио-версии
- [ ] Прогресс сохраняется
- [ ] Базовые социальные действия работают

---

## M7 — SEO и индексация

**Статус:** 🔴 Не начато  
**Срок:** 2-3 дня  
**Приоритет:** 🔶 Высокий  
**Блокировка:** Требует M6

### Задачи:

- [ ] 🔴 **M7.1** Hreflang
  - [ ] Корректные hreflang на всех страницах
  - [ ] x-default настроен
  - [ ] Валидация через Search Console

- [ ] 🔴 **M7.2** Sitemap
  - [ ] Генерация per-language sitemaps
  - [ ] Sitemap index
  - [ ] Отправка в Search Console

- [ ] 🔴 **M7.3** Robots.txt
  - [ ] Настройка robots.txt
  - [ ] Ссылка на sitemap

- [ ] 🔴 **M7.4** Микроразметка (опционально)
  - [ ] Schema.org для книг
  - [ ] Schema.org для статей
  - [ ] Валидация через Rich Results Test

**Критерии приёмки M7:**

- [ ] Все теги валидны
- [ ] Canonical и hreflang корректны
- [ ] Sitemap генерируется и доступен

---

## M8 — Performance и UX

**Статус:** 🔴 Не начато  
**Срок:** 3-4 дня  
**Приоритет:** 🔶 Высокий  
**Блокировка:** Требует M6 (параллельно с M7)

### Задачи:

- [ ] 🔴 **M8.1** Оптимизация загрузки
  - [ ] Ленивая загрузка компонентов
  - [ ] Code splitting
  - [ ] Dynamic imports где уместно

- [ ] 🔴 **M8.2** Изображения
  - [ ] Next.js Image компонент
  - [ ] WebP/AVIF форматы
  - [ ] Lazy loading

- [ ] 🔴 **M8.3** Кэширование
  - [ ] Настройка revalidate для SSG
  - [ ] Cache headers
  - [ ] React Query staleTime

- [ ] 🔴 **M8.4** Адаптивность
  - [ ] Mobile-first дизайн
  - [ ] Responsive layout
  - [ ] Touch-friendly интерфейс

- [ ] 🔴 **M8.5** Доступность (a11y)
  - [ ] ARIA-атрибуты
  - [ ] Клавиатурная навигация
  - [ ] Контрастность цветов
  - [ ] Screen reader тесты

- [ ] 🔴 **M8.6** Страницы ошибок
  - [ ] Дружелюбная 404
  - [ ] 429 с понятным сообщением
  - [ ] 500 с контактами поддержки

- [ ] 🔴 **M8.7** UX-полировка
  - [ ] Скелетоны загрузки
  - [ ] Suspense boundaries
  - [ ] Оптимистичные обновления UI

**Критерии приёмки M8:**

- [ ] Core Web Vitals в зелёной зоне
- [ ] Сайт работает на мобильных
- [ ] Нет блокирующих a11y проблем

---

## M9 — Тесты и качество

**Статус:** 🔴 Не начато  
**Срок:** 3-5 дней  
**Приоритет:** 🟡 Средний  
**Блокировка:** Требует M8

### Задачи:

- [ ] 🔴 **M9.1** Unit-тесты
  - [ ] Настроить Vitest/Jest
  - [ ] Тесты утилит (i18n, http)
  - [ ] Тесты хелперов

- [ ] 🔴 **M9.2** Компонентные тесты
  - [ ] Testing Library
  - [ ] Тесты форм
  - [ ] Тесты переключателей
  - [ ] Тесты навигации

- [ ] 🔴 **M9.3** E2E тесты
  - [ ] Настроить Playwright
  - [ ] Тест авторизации
  - [ ] Тест переключения языка
  - [ ] Тест читалки/плеера
  - [ ] Тест создания контента (админка)

- [ ] 🔴 **M9.4** CI настройки
  - [ ] GitHub Actions workflow
  - [ ] Lint + typecheck
  - [ ] Unit тесты
  - [ ] E2E тесты
  - [ ] Coverage reporting

- [ ] 🔴 **M9.5** Pre-commit hooks
  - [ ] lint-staged
  - [ ] husky
  - [ ] Автоформатирование

**Критерии приёмки M9:**

- [ ] CI проходит на каждом PR
- [ ] Критичные E2E тесты зелёные
- [ ] Coverage > 60% (цель)

---

## M10 — CI/CD и деплой

**Статус:** 🔴 Не начато  
**Срок:** 2-3 дня  
**Приоритет:** 🔥 Критический  
**Блокировка:** Требует M9

### Задачи:

- [ ] 🔴 **M10.1** Dockerfile
  - [ ] Создать Dockerfile для фронтенда
  - [ ] Multi-stage build
  - [ ] Оптимизация размера образа

- [ ] 🔴 **M10.2** Окружения
  - [ ] Конфигурация dev
  - [ ] Конфигурация stage
  - [ ] Конфигурация production

- [ ] 🔴 **M10.3** Выбор платформы
  - [ ] Vercel / VPS / другое
  - [ ] Настройка доменов
  - [ ] SSL сертификаты

- [ ] 🔴 **M10.4** CI/CD pipeline
  - [ ] GitHub Actions для деплоя
  - [ ] Автоматический деплой на push в main
  - [ ] Деплой preview для PR

- [ ] 🔴 **M10.5** Переменные окружения
  - [ ] Настроить env для production
  - [ ] Секреты в CI/CD

- [ ] 🔴 **M10.6** Мониторинг (опционально)
  - [ ] Sentry для ошибок
  - [ ] Analytics
  - [ ] Uptime monitoring

- [ ] 🔴 **M10.7** Документация
  - [ ] Инструкция по деплою
  - [ ] Инструкция по rollback
  - [ ] Troubleshooting guide

**Критерии приёмки M10:**

- [ ] Приложение задеплоено в production
- [ ] Автоматический деплой работает
- [ ] Smoke-тесты проходят после релиза
- [ ] Есть процедура rollback

---

## 📊 Итоговая статистика

**Завершено:** M0 (7/7), M1 (7/7), M2 (7/7) = **21 задача** ✅  
**В работе:** M3 (0/10 фаз, ~23-30 часов)  
**Осталось:** M4-M10 (~40+ задач)

**Общий прогресс:** ~15% (3 из ~13 milestone'ов)

**Текущая задача:** M3.1.1 - Admin Layout & Routing  
**Следующая задача:** M3.1.2 - Навигация (AdminSidebar)

**Документация миграции:** `docs/plan/ADMIN-MIGRATION-PLAN.md` (105KB, 10 фаз)

---

**Последнее обновление:** 2025-01-26  
**Статус проекта:** 🟢 Активная разработка (M3 - миграция админки)
| M1 | � | 7/7 | 🔥 Критический |
| M2 | 🔴 | 0/7 | 🔥 Критический |
| M3 | 🔴 | 0/7 | 🔶 Высокий |
| M4 | 🔴 | 0/4 | 🔶 Высокий |
| M5 | 🔴 | 0/6 | 🔥 Критический |
| M6 | 🔴 | 0/6 | 🔶 Высокий |
| M7 | 🔴 | 0/4 | 🔶 Высокий |
| M8 | 🔴 | 0/7 | 🔶 Высокий |
| M9 | 🔴 | 0/5 | 🟡 Средний |
| M10 | 🔴 | 0/7 | 🔥 Критический |

**Общий прогресс:** 14/67 задач (21%)

---

## 🎯 Текущий фокус

**Завершено:** M0 — Фундамент проекта ✅  
**Завершено:** M1 — Авторизация и роли ✅  
**Следующее:** M2 — Данные и типы 🚀

---

**Последнее обновление:** 25 октября 2025 - 15:45
