# План миграции админки из React в Next.js

> **Источник:** https://github.com/Farizda/book  
> **Дата анализа:** 27 октября 2025  
> **Целевой проект:** books-app-front (Next.js 14 App Router)

---

## 📋 Общая информация

### Исходная админка (React + Vite)

**Технологии:**

- ⚛️ React 18 + TypeScript
- 🎨 Tailwind CSS
- 🔧 Vite
- 🎭 Lucide Icons
- 📊 Статическая SPA (без роутинга)
- 🌐 Поддержка 4 языков (en, fr, es, pt)

**Структура:**

```
src/
├── App.tsx                    # Главный компонент с навигацией
├── components/
│   ├── Sidebar.tsx           # Боковое меню
│   ├── TopBar.tsx            # Верхняя панель с языками
│   └── screens/              # Экраны админки
│       ├── BooksList.tsx     # Список книг
│       ├── BookEditor.tsx    # Редактор книги (4 таба)
│       ├── PagesList.tsx     # CMS страницы
│       ├── PageEditor.tsx    # Редактор страницы
│       ├── Categories.tsx    # Категории с деревом
│       ├── Tags.tsx          # Теги
│       ├── MediaLibrary.tsx  # Медиа библиотека
│       ├── Comments.tsx      # Комментарии
│       └── Users.tsx         # Пользователи
```

**Ключевые особенности:**

- ✅ Все данные в mock'ах
- ✅ Чистый UI без API интеграции
- ✅ Responsive дизайн
- ✅ Многоязычность на уровне UI (язык передаётся как prop)

---

## 🎯 Целевая структура Next.js

```
app/admin/[lang]/
├── layout.tsx                  # Layout с Sidebar + TopBar
├── page.tsx                    # Dashboard (список книг)
├── books/
│   ├── page.tsx               # Список книг
│   ├── new/
│   │   └── page.tsx           # Создание книги
│   └── [id]/
│       ├── page.tsx           # Редактор книги
│       └── versions/
│           ├── new/
│           │   └── page.tsx   # Создание версии
│           └── [versionId]/
│               └── page.tsx   # Редактор версии
├── pages/
│   ├── page.tsx               # Список CMS страниц
│   ├── new/
│   │   └── page.tsx           # Создание страницы
│   └── [id]/
│       └── page.tsx           # Редактор страницы
├── categories/
│   └── page.tsx               # Категории
├── tags/
│   └── page.tsx               # Теги
├── media/
│   └── page.tsx               # Медиа библиотека
├── comments/
│   └── page.tsx               # Комментарии
└── users/
    └── page.tsx               # Пользователи

components/admin/
├── AdminShell/
│   ├── AdminSidebar.tsx       # Адаптированный Sidebar
│   └── AdminTopBar.tsx        # Адаптированный TopBar
├── books/
│   ├── BookListTable.tsx      # Таблица книг
│   ├── BookForm.tsx           # Форма книги
│   └── BookVersionTabs.tsx    # Табы (Overview, Read, Listen, Summary)
├── pages/
│   ├── PageListTable.tsx      # Таблица страниц
│   └── PageForm.tsx           # Форма страницы
├── categories/
│   ├── CategoryTree.tsx       # Дерево категорий
│   └── CategoryForm.tsx       # Форма категории
├── tags/
│   ├── TagsTable.tsx          # Таблица тегов
│   └── TagForm.tsx            # Форма тега
├── media/
│   ├── MediaGrid.tsx          # Сетка медиа
│   ├── MediaList.tsx          # Список медиа
│   └── MediaUpload.tsx        # Загрузка файлов
├── comments/
│   └── CommentsList.tsx       # Список комментариев
├── users/
│   ├── UsersTable.tsx         # Таблица пользователей
│   └── UserForm.tsx           # Форма пользователя
└── shared/
    ├── SearchBar.tsx          # Поисковая строка
    ├── StatusBadge.tsx        # Бейдж статуса
    ├── ContentIcons.tsx       # Иконки контента (Read/Listen/Summary)
    └── EmptyState.tsx         # Пустое состояние
```

---

## 📦 Фазы миграции

### 🔹 Фаза 1: Подготовка инфраструктуры (2-3 часа)

#### Задача 1.1: Создание структуры админки

```bash
app/admin/[lang]/
├── layout.tsx          # Admin layout с защитой
├── page.tsx           # Dashboard
└── loading.tsx        # Loading state
```

**Что делаем:**

- Создать admin layout с проверкой ролей
- Настроить middleware для защиты /admin/\* роутов
- Добавить loading states

**Файлы:**

- `app/admin/[lang]/layout.tsx`
- `middleware.ts` (обновить)

---

#### Задача 1.2: Базовые компоненты Shell

```bash
components/admin/AdminShell/
├── AdminSidebar.tsx
├── AdminTopBar.tsx
└── AdminBreadcrumbs.tsx
```

**Миграция:**

- `Sidebar.tsx` → `AdminSidebar.tsx` (добавить Link'и Next.js)
- `TopBar.tsx` → `AdminTopBar.tsx` (интегрировать с i18n)

**Изменения:**

- Заменить `onClick` на Next.js `<Link>`
- Использовать `usePathname()` для активного пункта
- Интегрировать с `lib/i18n/lang.ts`
- Добавить компонент выхода из аккаунта

**Commit:** `feat(admin): add admin shell layout and navigation`

---

### 🔹 Фаза 2: Books Management (4-5 часов)

#### ✅ Задача 2.1: Список книг (ЗАВЕРШЕНО - 28.10.2025)

```bash
app/admin/[lang]/books/page.tsx
components/admin/books/BookListTable.tsx
components/admin/books/BookListTable.module.scss
api/endpoints/admin.ts
api/hooks/useAdmin.ts
```

**Миграция `BooksList.tsx`:**

1. ✅ Создать Server Component для списка
2. ✅ Перенести UI таблицы в `BookListTable.tsx` (Client Component)
3. ✅ Интегрировать с `api/endpoints/admin.ts`
4. ✅ Использовать React Query через `useBooks` hook
5. ✅ Добавить пагинацию, поиск, фильтры

**Новые features:**

- ✅ Real API data вместо mock'ов
- ✅ Server-side pagination
- ✅ Search по title/author/slug
- ✅ Фильтрация по языку
- ✅ Responsive дизайн с SCSS tokens

**Commit:** `feat(admin): add books list with API integration`

---

#### ✅ Задача 2.2: Редактор книги (основа) — ЗАВЕРШЕНО (28.10.2025)

```bash
app/admin/[lang]/books/new/page.tsx           # Создание новой версии
app/admin/[lang]/books/versions/[id]/page.tsx # Редактирование версии
components/admin/books/BookForm.tsx           # Форма с валидацией
components/admin/books/BookForm.module.scss   # Стили формы
types/api-schema.ts                           # Новые типы
api/endpoints/admin.ts                        # API функции
api/hooks/useAdmin.ts                         # React Query хуки
```

**Реализовано:**

1. ✅ Форма с react-hook-form + zod валидацией
2. ✅ Интеграция с `POST /api/books/{bookId}/versions` (создание)
3. ✅ Интеграция с `PATCH /api/versions/{id}` (обновление)
4. ✅ Валидация на стороне клиента
5. ✅ Автоматическое сохранение через React Query

**Поля формы:**

- ✅ Title, Author, Language, Description
- ✅ Cover Image URL
- ✅ Type (text/audio)
- ✅ isFree checkbox
- ✅ Referral URL (опционально)
- ✅ SEO fields (metaTitle, metaDescription)

**API endpoints:**

- ✅ `getBookVersion(versionId)` - получение версии
- ✅ `createBookVersion(bookId, data)` - создание версии
- ✅ `updateBookVersion(versionId, data)` - обновление версии
- ✅ `publishVersion(versionId)` - публикация
- ✅ `unpublishVersion(versionId)` - снятие с публикации

**React Query hooks:**

- ✅ `useBookVersion(versionId)` - получение версии
- ✅ `useCreateBookVersion()` - создание версии
- ✅ `useUpdateBookVersion()` - обновление версии
- ✅ `usePublishVersion()` - публикация
- ✅ `useUnpublishVersion()` - снятие с публикации

**Commit:** `feat(admin): add book editor with version creation (M3.2.2)`

---

#### Задача 2.3: Табы контента (Read/Listen/Summary)

```bash
components/admin/books/BookVersionTabs.tsx
components/admin/books/ReadContentTab.tsx
components/admin/books/ListenContentTab.tsx
components/admin/books/SummaryTab.tsx
```

**Миграция:**

- Разделить большой `BookEditor.tsx` на отдельные компоненты
- Каждый таб - отдельный компонент с собственной логикой
- Общий state управляется через React Query

**Read Tab:**

- Управление главами (создание, редактирование, удаление)
- Markdown/Rich text editor для контента
- Drag-and-drop для сортировки глав

**Listen Tab:**

- Загрузка аудио файлов
- Управление аудио главами
- Transcript для каждой главы

**Summary Tab:**

- Summary text
- Key takeaways
- Themes и analysis

**Commit:** `feat(admin): add book content tabs (read/listen/summary)`

---

#### Задача 2.4: Publish/Unpublish

```bash
components/admin/books/PublishPanel.tsx
```

**Функционал:**

- Status toggle (draft/published)
- Publish date picker
- Confirmation modal перед публикацией
- Integration с `PATCH /api/versions/{id}/publish`

**Commit:** `feat(admin): add book publish/unpublish functionality`

---

#### Задача 2.5: Categories & Tags связывание

```bash
components/admin/books/CategoriesPanel.tsx
components/admin/books/TagsPanel.tsx
```

**Функционал:**

- Multi-select для категорий
- Tree view для выбора категорий
- Tag input с автокомплитом
- Integration с `POST /api/versions/{id}/categories`

**Commit:** `feat(admin): add categories and tags panels to book editor`

---

### 🔹 Фаза 3: CMS Pages (2 часа)

#### Задача 3.1: Список страниц

```bash
app/admin/[lang]/pages/page.tsx
components/admin/pages/PageListTable.tsx
```

**Миграция `PagesList.tsx`:**

- Аналогично списку книг
- Поиск по title/slug
- Фильтр по статусу

**Commit:** `feat(admin): add CMS pages list`

---

#### Задача 3.2: Редактор страницы

```bash
app/admin/[lang]/pages/[id]/page.tsx
components/admin/pages/PageForm.tsx
```

**Миграция `PageEditor.tsx`:**

- Form с title, slug, content
- Markdown/Rich text editor
- SEO settings
- Publish/unpublish toggle

**Commit:** `feat(admin): add CMS page editor`

---

### 🔹 Фаза 4: Categories & Tags (3 часа)

#### Задача 4.1: Categories с деревом

```bash
app/admin/[lang]/categories/page.tsx
components/admin/categories/CategoryTree.tsx
components/admin/categories/CategoryForm.tsx
```

**Миграция `Categories.tsx`:**

- Tree view с expand/collapse
- Nested categories support
- Drag-and-drop для реорганизации
- Inline editing
- Translation management (multi-language)

**Особенности:**

- Рекурсивный компонент для дерева
- Optimistic updates при изменении структуры
- API: `GET /api/categories/tree`

**Commit:** `feat(admin): add categories management with tree view`

---

#### Задача 4.2: Tags

```bash
app/admin/[lang]/tags/page.tsx
components/admin/tags/TagsTable.tsx
components/admin/tags/TagForm.tsx
```

**Миграция `Tags.tsx`:**

- Простая таблица с CRUD
- Translation management
- Bulk actions (delete, edit)

**Commit:** `feat(admin): add tags management`

---

### 🔹 Фаза 5: Media Library (3-4 часа)

#### Задача 5.1: Media Grid/List

```bash
app/admin/[lang]/media/page.tsx
components/admin/media/MediaGrid.tsx
components/admin/media/MediaList.tsx
```

**Миграция `MediaLibrary.tsx`:**

- Grid и List view toggle
- Filter by type (image/video/audio/document)
- Search by filename
- Pagination

**Commit:** `feat(admin): add media library grid and list views`

---

#### Задача 5.2: File Upload

```bash
components/admin/media/MediaUpload.tsx
components/admin/media/UploadProgress.tsx
```

**Новый функционал:**

- Drag-and-drop upload
- Multi-file upload
- Progress indicators
- Preview перед загрузкой
- Integration с `/api/media/upload`

**Поддержка:**

- Images: jpg, png, webp
- Audio: mp3, wav
- Video: mp4
- Documents: pdf

**Commit:** `feat(admin): add media upload with drag-and-drop`

---

### 🔹 Фаза 6: Comments Management (2 часа)

#### Задача 6.1: Comments list

```bash
app/admin/[lang]/comments/page.tsx
components/admin/comments/CommentsList.tsx
components/admin/comments/CommentItem.tsx
```

**Миграция `Comments.tsx`:**

- List view с фильтрами (visible/hidden/all)
- Search by author/content
- Show/Hide toggle
- Delete comment
- Reply to comment (опционально)

**Commit:** `feat(admin): add comments management`

---

### 🔹 Фаза 7: Users Management (2-3 часа)

#### Задача 7.1: Users list

```bash
app/admin/[lang]/users/page.tsx
components/admin/users/UsersTable.tsx
```

**Миграция `Users.tsx`:**

- Table с фильтрами по role
- Search by name/email
- Status indicators (active/inactive)
- Last login date

**Commit:** `feat(admin): add users list`

---

#### Задача 7.2: User management

```bash
components/admin/users/UserForm.tsx
components/admin/users/UserRoleManager.tsx
```

**Функционал:**

- Create/Edit user
- Assign/Revoke roles (admin, content_manager)
- Password reset
- Delete user

**Integration:**

- `POST /api/users/{id}/roles/{role}`
- `DELETE /api/users/{id}/roles/{role}`

**Commit:** `feat(admin): add user management and role assignment`

---

### 🔹 Фаза 8: Shared Components (1-2 часа)

#### Задача 8.1: UI компоненты

```bash
components/admin/shared/
├── SearchBar.tsx           # Переиспользуемая поисковая строка
├── StatusBadge.tsx         # Бейджи статусов
├── ContentIcons.tsx        # Иконки для Read/Listen/Summary
├── EmptyState.tsx          # Пустые состояния
├── ConfirmDialog.tsx       # Диалоги подтверждения
├── Pagination.tsx          # Пагинация
└── FilterDropdown.tsx      # Фильтры
```

**Commit:** `feat(admin): add shared UI components`

---

### 🔹 Фаза 9: Polish & UX (2-3 часа)

#### Задача 9.1: Loading states

- Skeleton loaders для таблиц
- Spinner для форм
- Progress bars для uploads

#### Задача 9.2: Error handling

- Error boundaries для каждого раздела
- Toast notifications
- Inline error messages

#### Задача 9.3: Optimistic updates

- Instant UI feedback
- Revert on API error
- Retry logic

**Commit:** `feat(admin): improve loading states and error handling`

---

### 🔹 Фаза 10: Testing & Refinement (2-3 часа)

#### Задача 10.1: Тестирование

- Проверка всех CRUD операций
- Тестирование роутинга
- Проверка responsive design
- Мультиязычность

#### Задача 10.2: Performance

- Lazy loading для больших списков
- Image optimization
- Code splitting

**Commit:** `refactor(admin): optimize performance and fix bugs`

---

## 🎨 Дизайн система

### Цвета (из Tailwind CSS)

```
Primary: blue-600 (#2563eb)
Success: green-600 (#16a34a)
Warning: yellow-600 (#ca8a04)
Danger: red-600 (#dc2626)
Gray scale: gray-50 to gray-900
```

### Компоненты

- **Buttons:** `bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md`
- **Inputs:** `border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500`
- **Tables:** `bg-white rounded-lg shadow-sm border border-gray-200`
- **Badges:** `inline-flex px-2 py-1 text-xs rounded-full`

---

## 📊 Приоритизация

### Must Have (Фазы 1-5)

1. ✅ **Фаза 1:** Admin Shell (2-3ч)
2. ✅ **Фаза 2:** Books Management (4-5ч)
3. ✅ **Фаза 3:** CMS Pages (2ч)
4. ✅ **Фаза 4:** Categories & Tags (3ч)
5. ✅ **Фаза 5:** Media Library (3-4ч)

**Итого: ~14-17 часов работы**

### Should Have (Фазы 6-8)

6. ✅ **Фаза 6:** Comments (2ч)
7. ✅ **Фаза 7:** Users (2-3ч)
8. ✅ **Фаза 8:** Shared Components (1-2ч)

**Итого: +5-7 часов**

### Nice to Have (Фазы 9-10)

9. ✅ **Фаза 9:** Polish & UX (2-3ч)
10. ✅ **Фаза 10:** Testing (2-3ч)

**Итого: +4-6 часов**

---

## 🔧 Технические детали

### Ключевые различия React → Next.js

| Аспект    | React SPA            | Next.js App Router       |
| --------- | -------------------- | ------------------------ |
| Роутинг   | useState для экранов | File-based routing       |
| Навигация | onClick + setState   | <Link> компоненты        |
| Данные    | Mock data            | React Query + API        |
| State     | Local useState       | Server/Client Components |
| Forms     | Контроллируемые      | react-hook-form          |
| Language  | Prop drilling        | URL params + cookies     |

### Интеграция с API

```typescript
// Пример: Books List
// Server Component (app/admin/[lang]/books/page.tsx)
export default async function BooksPage({ params }: { params: { lang: Language } }) {
  // Можно делать prefetch на сервере
  const initialData = await fetchBooks({ page: 1, limit: 10 });

  return <BooksListClient initialData={initialData} />;
}

// Client Component (components/admin/books/BooksList.tsx)
'use client';
export function BooksListClient({ initialData }) {
  const { data, isLoading, error } = useBooks({
    page: 1,
    limit: 10
  }, {
    initialData
  });

  // ... UI
}
```

### Forms с react-hook-form

```typescript
// Пример: Book Form
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const bookSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().regex(/^[a-z0-9-]+$/, 'Invalid slug format'),
  author: z.string().min(1, 'Author is required'),
  // ...
});

export function BookForm() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(bookSchema),
  });

  const onSubmit = async (data) => {
    await createBookVersion(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
      {/* ... */}
    </form>
  );
}
```

---

## 📝 Checklist для каждой фазы

### Перед началом фазы:

- [ ] Прочитать исходный код компонента
- [ ] Понять структуру данных
- [ ] Определить Client vs Server Components
- [ ] Проверить доступные API endpoints

### Во время разработки:

- [ ] Создать структуру папок
- [ ] Написать types/interfaces
- [ ] Реализовать UI компоненты
- [ ] Интегрировать с API
- [ ] Добавить error handling
- [ ] Добавить loading states

### После завершения фазы:

- [ ] Проверить typecheck (`yarn typecheck`)
- [ ] Проверить lint (`yarn lint`)
- [ ] Протестировать в браузере
- [ ] Сделать коммит с описательным сообщением
- [ ] Push в GitHub

---

## 🚀 Начало работы

### Шаг 1: Клонировать исходную админку локально (для справки)

```bash
cd ~/Dev
git clone https://github.com/Farizda/book book-admin-reference
cd book-admin-reference
npm install  # Для запуска и изучения
```

### Шаг 2: Начать с Фазы 1

```bash
cd ~/Dev/books-app-front
# Создать структуру админки
mkdir -p app/admin/\[lang\]
mkdir -p components/admin/AdminShell
```

### Шаг 3: Итеративная разработка

- Работаем по одной фазе за раз
- Коммит после каждой задачи
- Тестируем перед переходом к следующей

---

## 📚 Полезные ссылки

- **Исходная админка:** https://github.com/Farizda/book
- **Backend API:** [../frontend-agents/backend-api-reference.md](../frontend-agents/backend-api-reference.md)
- **Backend Status:** [../BACKEND-STATUS.md](../BACKEND-STATUS.md)
- **Next.js Docs:** https://nextjs.org/docs
- **React Query:** https://tanstack.com/query/latest

---

## 📞 Вопросы и уточнения

Если возникают вопросы по ходу миграции:

1. Проверить исходный код в `book-admin-reference`
2. Посмотреть примеры в документации Next.js
3. Уточнить у разработчика

---

**Последнее обновление:** 27 октября 2025  
**Готовность к началу работы:** ✅ Да
