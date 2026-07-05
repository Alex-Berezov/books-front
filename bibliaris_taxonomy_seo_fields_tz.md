# ТЗ: минимальная доработка таксономий Bibliaris для SEO и JSON-импорта

## 0. Контекст

Bibliaris использует 4 SEO-сущности таксономии:

```txt
/categories   = крупные разделы
/genres       = литературные жанры и формы
/collections  = подборки, форматы, редакционные SEO-хабы
/tags         = темы, мотивы, настроения, сеттинги, персонажные роли
```

На бэкенде сейчас:

- `Category` хранит `category`, `genre`, `collection` через поле `type`.
- `Category` имеет иерархию через `parentId`.
- `CategoryTranslation` хранит локализованные SEO-поля.
- `Tag` — отдельная плоская сущность без иерархии.
- `TagTranslation` уже содержит расширенные SEO-поля и related-поля.

Проект сейчас на раннем этапе, на сайте мало книг. Поэтому **не нужно усложнять модель** редиректами, alias-таблицами, SEO priority, hero-картинками, content blocks, collection rules и т.д.

Цель текущей доработки — сделать структуру удобной для массовой загрузки JSON и достаточно сильной для SEO на 5 языках:

```txt
en, es, fr, pt, ru
```

---

## 1. Главная цель доработки

Добавить минимально необходимые поля и поведение:

```txt
1. stable key для Category и Tag;
2. parentKey для JSON-импорта категорий/жанров/коллекций;
3. базовые SEO/UI-поля для Tag: indexable, isVisible, sortOrder;
4. relatedCategorySlugs и relatedCollectionSlugs для TagTranslation;
5. обновить DTO, Prisma schema, сервисы, админку, публичные страницы и sitemap под эти поля;
6. не добавлять лишние сущности на текущем этапе.
```

# Этап 1. Подготовительный аудит без изменения поведения

## Задача

Проверить текущие файлы и места, которые будут затронуты.

## Что найти

### Backend

Найти:

```txt
Prisma schema для Category, CategoryTranslation, Tag, TagTranslation
DTO create/update для categories
DTO create/update для category translations
DTO create/update для tags
DTO create/update для tag translations
categories service/controller
tags service/controller
seo resolver
aдминские endpoints, если отдельно вынесены
sitemap generator, если есть
```

### Frontend

Найти:

```txt
/admin/:lang/categories
/admin/:lang/tags
/:lang/categories
/:lang/category/:slug
/:lang/genres
/:lang/genre/:slug
/:lang/collections
/:lang/collection/:slug
/:lang/tags
/:lang/tag/:slug
/:lang/catalog
```

Если каких-то route пока нет, не создавать их без необходимости в рамках этого этапа. Только зафиксировать текущее состояние.

## Результат этапа

Короткая заметка в PR/комментарии:

```txt
Какие файлы найдены
Какие модели и DTO используются
Где нужно внести изменения на следующих этапах
```

## Acceptance criteria

```txt
[x] Поведение приложения не изменено.
[x] Нет миграций.
[x] Нет изменений UI.
[x] Есть список файлов, которые будут затронуты.
```

---

## Результат этапа 1

### Backend — найденные файлы

**Prisma schema:**

- `prisma/schema.prisma` — Category (lines 208-225), CategoryTranslation (477-506), Tag (241-247), TagTranslation (508-539), BookCategory (227-239), BookTag (249-259), Seo (343-395)

**Category DTOs** (`src/modules/category/dto/`):
| File | Назначение |
|---|---|
| `create-category.dto.ts` | type, name, slug, indexable?, isVisible?, sortOrder?, parentId? |
| `update-category.dto.ts` | Все поля optional |
| `create-category-translation.dto.ts` | language, name, slug, description?, h1?, shortDescription?, metaTitle?, metaDescription?, ogTitle?, ogDescription?, ogImageUrl?, ogImageAlt?, faq?, seo? |
| `update-category-translation.dto.ts` | Все поля optional |
| `category-response.dto.ts` | id, name, slug, type, booksCount, indexable?, isVisible?, sortOrder?, translations[] |
| `category-tree-node.dto.ts` | То же + children[] (рекурсивно) |
| `attach-category.dto.ts` | categoryId |

**Tag DTOs** (`src/modules/tags/dto/`):
| File | Назначение |
|---|---|
| `create-tag.dto.ts` | name, slug |
| `update-tag.dto.ts` | name?, slug? |
| `create-tag-translation.dto.ts` | language, name, slug, description?, h1?, shortDescription?, metaTitle?, metaDescription?, ogTitle?, ogDescription?, ogImageUrl?, ogImageAlt?, canonicalUrl?, robots?, indexable?, faq?, relatedTagSlugs?, relatedGenreSlugs?, seo? |
| `update-tag-translation.dto.ts` | Все поля optional |
| `tag-response.dto.ts` | id, name, slug, translations[], booksCount? |
| `list-tags.dto.ts` | page, limit, q? |
| `attach-tag.dto.ts` | tagId |

**Сервисы и контроллеры:**

- `src/modules/category/category.service.ts` — create/update с валидацией parentId, проверки циклов
- `src/modules/category/category.controller.ts` — CRUD, translations, attach/detach, check-slug
- `src/modules/tags/tags.service.ts` — create/update/translations
- `src/modules/tags/tags.controller.ts` — CRUD, translations, attach/detach

**SEO и Sitemap:**

- `src/modules/seo/seo.service.ts` — resolvePublic() для type=category|genre|tag
- `src/modules/seo/seo.controller.ts` — GET /seo/resolve, GET /:lang/seo/resolve
- `src/modules/seo/dto/resolve-seo.dto.ts` — ResolveSeoType enum (book, version, page, category, genre, tag, catalog)
- `src/modules/seo/canonical/getCanonicalUrl.ts` — построитель canonical URL для всех типов
- `src/modules/seo/metadata/generateGenreMeta.ts` — генератор title/description для category/genre/tag
- `src/modules/sitemap/sitemap.service.ts` — perLanguage() с category/genre/tag секциями
- Общий `SeoInputDto`: `src/modules/pages/dto/seo-input.dto.ts`

**Важно: JSON import endpoint не существует.**

### Frontend — найденные файлы

| Роут                       | Статус         | Файл                                                      |
| -------------------------- | -------------- | --------------------------------------------------------- |
| `admin/[lang]/categories`  | ✅             | `app/admin/[lang]/categories/page.tsx`                    |
| `admin/[lang]/genres`      | ✅             | `app/admin/[lang]/genres/page.tsx`                        |
| `admin/[lang]/collections` | ✅             | `app/admin/[lang]/collections/page.tsx`                   |
| `admin/[lang]/tags`        | ✅             | `app/admin/[lang]/tags/page.tsx`                          |
| `[lang]/categories`        | ✅             | `app/[lang]/categories/page.tsx`                          |
| `[lang]/category/[slug]`   | ✅             | `app/[lang]/category/[slug]/page.tsx`                     |
| `[lang]/genres`            | ✅             | `app/[lang]/genres/page.tsx`                              |
| `[lang]/genre/[slug]`      | ✅             | `app/[lang]/genre/[slug]/page.tsx`                        |
| `[lang]/collections`       | ❌ отсутствует | —                                                         |
| `[lang]/collection/[slug]` | ❌ отсутствует | —                                                         |
| `[lang]/tags`              | ✅             | `app/[lang]/tags/page.tsx` + TagsClient.tsx               |
| `[lang]/tag/[slug]`        | ✅             | `app/[lang]/tag/[tagSlug]/page.tsx` + TagDetailClient.tsx |
| `[lang]/catalog`           | ✅             | `app/[lang]/catalog/page.tsx`                             |

**Типы и API:**

- `types/api-schema/categories.ts` — Category, CategoryTree, CategoryTranslation, CreateCategoryRequest, UpdateCategoryRequest
- `types/api-schema/tags.ts` — Tag, TagTranslation, CreateTagRequest, UpdateTagRequest
- `api/endpoints/admin/categories.ts` — CRUD + translations + attach/detach
- `api/endpoints/admin/tags.ts` — CRUD + translations + attach/detach
- `api/hooks/useCategories.ts` — React Query hooks (+ useAttachCategory, useDetachCategory)
- `api/hooks/useTags.ts` — React Query hooks (+ useAttachTag, useDetachTag)

**Админ-компоненты:**

- `components/admin/categories/CategoryTree/` — дерево, ноды, модалки
- `components/admin/categories/CategoryModal/` — create/edit
- `components/admin/categories/CategoryTranslationsModal/` — переводы
- `components/admin/tags/TagModal/` — create/edit
- `components/admin/tags/TagList/` — список
- `components/admin/tags/TagTranslationsModal/` — переводы

### Где нужны изменения на следующих этапах

| Этап   | Что менять                                                                                                                                                                                                                                                                                                                                                                   |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **2**  | `prisma/schema.prisma` — добавить key в Category и Tag, indexable/isVisible/sortOrder в Tag                                                                                                                                                                                                                                                                                  |
| **3**  | `src/modules/category/dto/create-category.dto.ts`, `update-category.dto.ts` — key; `src/modules/tags/dto/create-tag.dto.ts`, `update-tag.dto.ts` — key/indexable/isVisible/sortOrder                                                                                                                                                                                         |
| **4**  | `src/modules/category/category.service.ts`, `category-response.dto.ts`, `category-tree-node.dto.ts` + tags service/response                                                                                                                                                                                                                                                  |
| **5**  | `prisma/schema.prisma` — relatedCategorySlugs, relatedCollectionSlugs в TagTranslation; DTO и response                                                                                                                                                                                                                                                                       |
| **6**  | Новый endpoint импорта + сервис                                                                                                                                                                                                                                                                                                                                              |
| **7**  | `components/admin/categories/CategoryModal/`, `components/admin/tags/TagModal/`, `components/admin/tags/TagTranslationsModal/`, админские страницы                                                                                                                                                                                                                           |
| **8**  | Новые страницы `[lang]/collections/`, `[lang]/collection/[slug]/` + обновление `TagDetailClient.tsx` для relatedCategorySlugs/relatedCollectionSlugs                                                                                                                                                                                                                         |
| **9**  | ✅ `src/modules/seo/seo.service.ts` — доработка robots/canonical fallback + `src/modules/seo/utils/detectIndexability.ts` + `src/modules/seo/canonical/getCanonicalUrl.ts` + `src/modules/seo/dto/resolve-seo.dto.ts` + `src/modules/seo/seo.controller.ts` + `src/modules/seo/hreflang/generateHreflangLinks.ts` + `src/modules/seo/schema/generateCollectionPageSchema.ts` |
| **10** | ✅ `src/modules/sitemap/sitemap.service.ts` — фильтр indexable/isVisible + collections                                                                                                                                                                                                                                                                                       |

# Этап 2. Prisma: добавить key и базовые поля для Tag

## Задача

Обновить Prisma schema и создать миграцию.

## 2.1. Добавить `key` в Category

В модель `Category` добавить:

```prisma
key String @unique
```

Требования:

```txt
обязательное поле;
уникальное;
lowercase kebab-case;
стабильный системный идентификатор;
не зависит от локализованного slug.
```

Примеры:

```txt
classic-literature
gothic-fiction
short-reads
business-career
aestheticism
```

## 2.2. Добавить `key` в Tag

В модель `Tag` добавить:

```prisma
key String @unique
```

Требования такие же.

## 2.3. Добавить базовые поля в Tag

В модель `Tag` добавить:

```prisma
indexable Boolean @default(true)
isVisible Boolean @default(true)
sortOrder Int @default(0)
```

Зачем:

- `indexable` — управляет индексацией страницы тега;
- `isVisible` — управляет выводом в публичных списках;
- `sortOrder` — сортировка в списках тегов и админке.

## 2.4. Data migration для существующих данных

Для существующих `Category`:

```txt
key = текущий base slug
```

Для существующих `Tag`:

```txt
key = текущий base slug
indexable = true
isVisible = true
sortOrder = 0
```

Если есть потенциальные дубли `key`, миграция должна падать с понятной ошибкой или заранее нормализовать только уникальные значения после ручной проверки.

## Acceptance criteria

```txt
[x] Category имеет обязательный unique key.
[x] Tag имеет обязательный unique key.
[x] Tag имеет indexable, isVisible, sortOrder.
[x] Existing rows получили key (backfill из slug).
[x] Existing tags получили default indexable/isVisible/sortOrder.
[x] Prisma migration создана (файл: 20260705000001_add_key_to_taxonomies/migration.sql).
[ ] Prisma migration проходит локально (выполнит пользователь на VPS).
[ ] Prisma generate выполнен (выполнит пользователь на VPS).

```

---

# Этап 3. Backend DTO: обновить create/update для Category и Tag

## Задача

Обновить DTO и validation rules.

## 3.1. Category Create/Update DTO

В `CreateCategoryDto` добавить:

```ts
key: string;
```

В `UpdateCategoryDto` добавить optional:

```ts
key?: string;
```

Валидация:

```txt
required при create;
optional при update;
формат: ^[a-z0-9]+(?:-[a-z0-9]+)*$;
unique;
minLength: 2;
не должен содержать пробелы, uppercase, underscore.
```

## 3.2. Tag Create/Update DTO

В `CreateTagDto` добавить:

```ts
key: string;
indexable?: boolean;
isVisible?: boolean;
sortOrder?: number;
```

В `UpdateTagDto` добавить optional:

```ts
key?: string;
indexable?: boolean;
isVisible?: boolean;
sortOrder?: number;
```

Валидация:

```txt
key required при create;
key optional при update;
key формат kebab-case;
sortOrder min 0;
indexable boolean;
isVisible boolean.
```

## 3.3. Backward compatibility

Если текущая админка или старый импорт пока отправляет только `slug`, временно можно поддержать fallback:

```ts
key = key || slug;
```

Но в новом JSON key должен быть обязательным.

## Acceptance criteria

```txt
[x] Category create принимает key.
[x] Category update принимает key.
[x] Tag create принимает key/indexable/isVisible/sortOrder.
[x] Tag update принимает key/indexable/isVisible/sortOrder.
[ ] Некорректный key возвращает понятную validation error.
[ ] Дубликат key возвращает понятную ошибку.
[x] Старый сценарий создания не ломается, если нужен fallback key=slug.
```

---

# Этап 4. Backend service/response: вернуть новые поля в API

## Задача

Обновить сервисы и response shape.

## 4.1. Category response

В ответах categories добавить:

```ts
key: string;
```

Должно возвращаться в:

```txt
GET /categories
GET /categories/tree
GET /categories/:id
POST /categories
PATCH /categories/:id
```

Если route называются иначе — обновить соответствующие.

## 4.2. Tag response

В ответах tags добавить:

```ts
key: string;
indexable: boolean;
isVisible: boolean;
sortOrder: number;
```

Должно возвращаться в:

```txt
GET /tags
GET /tags/:id
POST /tags
PATCH /tags/:id
```

## 4.3. Sorting

Для публичных списков categories/tags:

```txt
сначала sortOrder ASC
потом name ASC
```

## 4.4. Visibility

Публичные списки тегов должны по умолчанию возвращать только:

```txt
isVisible = true
```

Админка должна видеть все.

## Acceptance criteria

```txt
[x] Все category responses содержат key.
[x] Все tag responses содержат key/indexable/isVisible/sortOrder.
[x] Публичные списки тегов скрывают isVisible=false.
[x] Админские списки показывают все теги.
[x] Сортировка учитывает sortOrder.
```

---

# Этап 5. TagTranslation: добавить relatedCategorySlugs и relatedCollectionSlugs

## Задача

Расширить `TagTranslation` связями для SEO-перелинковки.

Сейчас у tag translations есть:

```ts
relatedTagSlugs?: string[];
relatedGenreSlugs?: string[];
```

Добавить:

```ts
relatedCategorySlugs?: string[];
relatedCollectionSlugs?: string[];
```

## 5.1. Prisma

В `TagTranslation` добавить поля. Конкретный тип зависит от текущей реализации `relatedTagSlugs` и `relatedGenreSlugs`.

Если они JSON:

```prisma
relatedCategorySlugs Json?
relatedCollectionSlugs Json?
```

Если string array поддерживается текущей БД:

```prisma
relatedCategorySlugs String[] @default([])
relatedCollectionSlugs String[] @default([])
```

Выбрать тот же подход, который уже используется для `relatedTagSlugs` и `relatedGenreSlugs`.

## 5.2. DTO create/update

В `CreateTagTranslationDto` и `UpdateTagTranslationDto` добавить:

```ts
relatedCategorySlugs?: string[];
relatedCollectionSlugs?: string[];
```

Валидация:

```txt
optional;
array of strings;
каждый slug kebab-case;
можно пустой массив.
```

## 5.3. Response

В `TagTranslationResponse` вернуть:

```ts
relatedCategorySlugs: string[];
relatedCollectionSlugs: string[];
```

Если нет значения — возвращать пустой массив, а не `null`, если это согласуется с текущим стилем API.

## Acceptance criteria

```txt
[x] Prisma migration добавляет relatedCategorySlugs.
[x] Prisma migration добавляет relatedCollectionSlugs.
[x] Create tag translation принимает новые поля.
[x] Update tag translation принимает новые поля.
[x] Tag translation response возвращает новые поля.
[x] Старые данные не ломаются.
```

---

# Этап 6. JSON-импорт: поддержать key и parentKey

## Задача

Обеспечить удобную загрузку таксономий из JSON без необходимости знать UUID родителей.

Если в проекте уже есть JSON import endpoint — доработать его. Если нет — реализовать минимальный admin endpoint.

## 6.1. Формат JSON для Category/Genre/Collection

Поддержать:

```json
{
  "key": "victorian-literature",
  "type": "category",
  "parentKey": "classic-literature",
  "indexable": true,
  "isVisible": true,
  "sortOrder": 100,
  "translations": {
    "en": {
      "name": "Victorian Literature",
      "slug": "victorian-literature",
      "h1": "Victorian Literature Books",
      "shortDescription": "Explore Victorian literature books on Bibliaris.",
      "description": "<p>Victorian literature...</p>",
      "metaTitle": "Victorian Literature Books | Bibliaris",
      "metaDescription": "Explore Victorian literature books, authors, themes, and classics on Bibliaris.",
      "ogTitle": "Victorian Literature Books | Bibliaris",
      "ogDescription": "Discover Victorian literature and classic books on Bibliaris.",
      "ogImageUrl": null,
      "ogImageAlt": "Victorian literature books on Bibliaris",
      "faq": []
    }
  }
}
```

## 6.2. Формат JSON для Tag

Поддержать:

```json
{
  "key": "aestheticism",
  "name": "Aestheticism",
  "slug": "aestheticism",
  "indexable": true,
  "isVisible": true,
  "sortOrder": 100,
  "translations": {
    "en": {
      "name": "Aestheticism",
      "slug": "aestheticism",
      "h1": "Aestheticism Books",
      "shortDescription": "Discover books connected with aestheticism, beauty, art, and morality.",
      "description": "<p>Aestheticism in literature...</p>",
      "metaTitle": "Aestheticism Books | Bibliaris",
      "metaDescription": "Explore books about aestheticism on Bibliaris.",
      "ogTitle": "Aestheticism Books | Bibliaris",
      "ogDescription": "Discover books and themes connected with aestheticism.",
      "ogImageUrl": null,
      "ogImageAlt": "Aestheticism books on Bibliaris",
      "canonicalUrl": "https://bibliaris.com/en/tag/aestheticism",
      "robots": "index, follow",
      "indexable": true,
      "relatedTagSlugs": ["beauty-and-youth", "moral-corruption"],
      "relatedGenreSlugs": ["gothic-fiction", "philosophical-fiction"],
      "relatedCategorySlugs": ["classic-literature", "victorian-literature"],
      "relatedCollectionSlugs": [],
      "faq": []
    }
  }
}
```

## 6.3. parentKey logic

При импорте:

```txt
parentKey отсутствует/null → parentId = null
parentKey указан → найти Category по key и взять его id
если parentKey не найден → ошибка импорта
```

## 6.4. Upsert logic

Импорт должен работать как upsert:

```txt
если key найден → обновить сущность
если key не найден → создать сущность
```

Для переводов:

```txt
если translation language уже есть → обновить
если нет → создать
```

## 6.5. Минимальная валидация импорта

Перед записью проверить:

```txt
key required
key kebab-case
type = category|genre|collection для categories
parentKey существует, если указан
translation language in en/es/fr/pt/ru
translation slug kebab-case
translation name required
related slugs arrays are arrays of strings
```

## Acceptance criteria

```txt
[x] JSON import принимает key.
[x] JSON import принимает parentKey.
[x] parentKey корректно превращается в parentId.
[x] Import делает upsert по key.
[x] Переводы upsert по language.
[x] Ошибка parentKey not found понятная.
[x] Ошибка duplicate key понятная.
[x] Можно импортировать category/genre/collection/tag.
```

---

# Этап 7. Админка: обновить формы Categories/Tags

## Задача

Обновить админские формы, чтобы можно было управлять новыми полями.

## 7.1. `/admin/:lang/categories`

Добавить поле:

```txt
Key
```

Требования UI:

```txt
показывать key в форме создания/редактирования;
валидировать kebab-case;
если создаётся новая сущность, можно auto-generate key из английского name/slug;
после создания key лучше не менять без явной необходимости;
показывать key в таблице/дереве админки мелким техническим текстом.
```

## 7.2. `/admin/:lang/tags`

Добавить поля:

```txt
Key
Indexable
Visible
Sort Order
```

Требования UI:

```txt
Indexable = checkbox
Visible = checkbox
Sort Order = number input
Key = text input with kebab-case validation
```

## 7.3. Tag translations

В форме переводов тега добавить:

```txt
Related Category Slugs
Related Collection Slugs
```

Можно сделать как textarea, где значения вводятся построчно, или как chips input.

Пример textarea:

```txt
classic-literature
victorian-literature
```

При сохранении преобразовать в array:

```ts
['classic-literature', 'victorian-literature'];
```

## Acceptance criteria

```txt
[x] В category admin можно видеть/редактировать key.
[x] В tag admin можно видеть/редактировать key/indexable/isVisible/sortOrder.
[x] В tag translation можно заполнить relatedCategorySlugs.
[x] В tag translation можно заполнить relatedCollectionSlugs.
[x] UI валидирует key.
[x] UI не отправляет undefined-мусор в массивы related fields.
```

---

# Этап 8. Frontend публичных страниц: использовать новые поля

## Задача

Обновить публичные страницы тегов и списков тегов.

## 8.1. `/tags`

Страница списка тегов должна:

```txt
показывать только isVisible=true;
сортировать sortOrder ASC, затем name ASC;
вести ссылки на /:lang/tag/:slug;
не показывать теги без перевода на текущий язык;
не показывать пустые теги, если текущая логика уже скрывает booksCount=0.
```

## 8.2. `/tag/:slug`

Страница тега должна:

```txt
использовать h1;
использовать shortDescription;
использовать description;
показывать список книг;
показывать FAQ, если заполнен;
показывать relatedTagSlugs;
показывать relatedGenreSlugs;
показывать relatedCategorySlugs;
показывать relatedCollectionSlugs;
учитывать translation.indexable/robots или base tag.indexable.
```

## 8.3. Related links rendering

Для related slugs:

```txt
relatedTagSlugs → /:lang/tag/:slug
relatedGenreSlugs → /:lang/genre/:slug
relatedCategorySlugs → /:lang/category/:slug
relatedCollectionSlugs → /:lang/collection/:slug
```

Если связанная сущность не найдена или скрыта:

```txt
не рендерить ссылку;
не падать ошибкой.
```

## 8.4. Таксономические страницы Categories/Genres/Collections

Пока не добавлять новые поля related для них. Использовать уже существующие:

```txt
h1
shortDescription
description
faq
seo
```

## Acceptance criteria

```txt
[x] /tags показывает только visible tags.
[x] /tags сортирует по sortOrder.
[x] /tag/:slug показывает related categories.
[x] /tag/:slug показывает related collections.
[x] Missing related slug не ломает страницу.
[x] Все переходы сделаны через <a href> / Link, не button.
```

---

# Этап 9. SEO resolver и robots/canonical fallback

## Задача

Проверить и доработать SEO-резолвинг для taxonomy pages.

## 9.1. Tags

Для `/tag/:slug` использовать порядок приоритета:

```txt
translation.seo.metaTitle
translation.metaTitle
fallback generated title
```

То же для:

```txt
metaDescription
ogTitle
ogDescription
ogImageUrl
ogImageAlt
canonicalUrl
robots
```

Robots logic:

```txt
если base tag.indexable=false → noindex, follow
если translation.indexable=false → noindex, follow
если translation.robots заполнен → использовать его, но не позволять index если base tag.indexable=false
иначе index, follow
```

Canonical fallback:

```txt
https://bibliaris.com/{lang}/tag/{slug}
```

## 9.2. Categories / Genres / Collections

Для страниц:

```txt
/:lang/category/:slug
/:lang/genre/:slug
/:lang/collection/:slug
```

robots logic:

```txt
если entity.indexable=false → noindex, follow
иначе использовать translation.seo.robots или fallback index, follow
```

Canonical fallback:

```txt
https://bibliaris.com/{lang}/category/{slug}
https://bibliaris.com/{lang}/genre/{slug}
https://bibliaris.com/{lang}/collection/{slug}
```

## Acceptance criteria

```txt
[x] tag.indexable=false всегда даёт noindex, follow.
[x] category/genre/collection indexable=false всегда даёт noindex, follow.
[x] canonical fallback корректен для всех taxonomy types.
[x] title/meta fallback не пустой.
[x] OG fallback не пустой.
```

---

# Этап 10. Sitemap

## Задача

Обновить sitemap generation.

## В sitemap включать только:

```txt
indexable=true
isVisible=true
есть перевод на язык
есть slug
```

Для tags:

```txt
Tag.indexable=true
Tag.isVisible=true
TagTranslation exists for language
TagTranslation.slug exists
```

Для categories/genres/collections:

```txt
Category.indexable=true
Category.isVisible=true
CategoryTranslation exists for language
CategoryTranslation.slug exists
```

Не добавлять:

```txt
noindex pages
hidden pages
entities without translation
entities without slug
```

## Acceptance criteria

```txt
[x] Hidden tags не попадают в sitemap.
[x] Noindex tags не попадают в sitemap.
[x] Hidden categories/genres/collections не попадают в sitemap.
[x] Noindex categories/genres/collections не попадают в sitemap.
[x] Sitemap URL использует локализованный slug.
```

---

# Этап 11. JSON examples для будущего заполнения

## Category / Genre / Collection example

```json
{
  "key": "classic-literature",
  "type": "category",
  "parentKey": null,
  "indexable": true,
  "isVisible": true,
  "sortOrder": 10,
  "translations": {
    "en": {
      "name": "Classic Literature",
      "slug": "classic-literature",
      "h1": "Classic Literature Books",
      "shortDescription": "Explore classic literature books, timeless authors, and influential works on Bibliaris.",
      "description": "<p>Classic literature brings together books that have shaped literary culture across generations...</p>",
      "metaTitle": "Classic Literature Books | Bibliaris",
      "metaDescription": "Explore classic literature books on Bibliaris. Discover timeless novels, authors, summaries, themes, and audiobooks.",
      "ogTitle": "Classic Literature Books | Bibliaris",
      "ogDescription": "Discover classic literature books, authors, themes, and timeless works on Bibliaris.",
      "ogImageUrl": null,
      "ogImageAlt": "Classic literature books on Bibliaris",
      "faq": [
        {
          "question": "What is classic literature?",
          "answer": "Classic literature usually refers to books that have remained influential across generations because of their artistic, cultural, or historical value."
        }
      ]
    }
  }
}
```

## Tag example

```json
{
  "key": "aestheticism",
  "name": "Aestheticism",
  "slug": "aestheticism",
  "indexable": true,
  "isVisible": true,
  "sortOrder": 100,
  "translations": {
    "en": {
      "name": "Aestheticism",
      "slug": "aestheticism",
      "h1": "Aestheticism Books",
      "shortDescription": "Discover books connected with aestheticism, beauty, art, style, and morality.",
      "description": "<p>Aestheticism in literature explores beauty, art, style, and the tension between appearance and morality...</p>",
      "metaTitle": "Aestheticism Books | Bibliaris",
      "metaDescription": "Explore books about aestheticism on Bibliaris. Discover literature about beauty, art, morality, and style.",
      "ogTitle": "Aestheticism Books | Bibliaris",
      "ogDescription": "Discover books and themes connected with aestheticism, beauty, art, and morality.",
      "ogImageUrl": null,
      "ogImageAlt": "Aestheticism books on Bibliaris",
      "canonicalUrl": "https://bibliaris.com/en/tag/aestheticism",
      "robots": "index, follow",
      "indexable": true,
      "relatedTagSlugs": ["beauty-and-youth", "moral-corruption"],
      "relatedGenreSlugs": ["gothic-fiction", "philosophical-fiction"],
      "relatedCategorySlugs": ["classic-literature", "victorian-literature"],
      "relatedCollectionSlugs": [],
      "faq": []
    }
  }
}
```

---

# Этап 12. Testing checklist

## Backend tests

```txt
[ ] Create category with key.
[ ] Update category key.
[ ] Reject invalid category key.
[ ] Reject duplicate category key.
[ ] Create tag with key/indexable/isVisible/sortOrder.
[ ] Update tag fields.
[ ] Reject invalid tag key.
[ ] Reject duplicate tag key.
[ ] Create tag translation with relatedCategorySlugs.
[ ] Create tag translation with relatedCollectionSlugs.
[ ] Update tag translation related fields.
[ ] Import category with parentKey.
[ ] Import fails if parentKey not found.
[ ] Import tag with related fields.
```

## Frontend/admin tests

```txt
[ ] Admin category form shows key.
[ ] Admin tag form shows key/indexable/isVisible/sortOrder.
[ ] Admin tag translation form supports relatedCategorySlugs.
[ ] Admin tag translation form supports relatedCollectionSlugs.
[ ] /tags hides isVisible=false.
[ ] /tags sorts by sortOrder.
[ ] /tag/:slug renders related categories/collections.
```

## SEO tests

```txt
[ ] tag indexable=false returns noindex.
[ ] category indexable=false returns noindex.
[ ] sitemap excludes hidden/noindex taxonomy pages.
[ ] canonical fallback works for tag/category/genre/collection.
[ ] title/meta fallback works if SEO fields are partially empty.
```

---

# Финальный результат

После выполнения всех этапов таксономии Bibliaris должны поддерживать:

```txt
stable JSON import через key;
родительские связи через parentKey;
единые базовые поля видимости и индексации для tags;
SEO-перелинковку тегов с categories/genres/collections/tags;
корректный sitemap;
корректные robots/canonical fallback;
удобное заполнение переводов на 5 языках через JSON.
```

При этом проект остаётся простым: без редиректов, alias-системы, hero-картинок, content blocks и dynamic collection rules на текущем этапе.
