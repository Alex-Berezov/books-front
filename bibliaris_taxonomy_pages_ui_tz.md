# ТЗ: SEO-страницы таксономий Bibliaris — навигация, сайдбар, внутренняя структура страниц

## 1. Контекст задачи

Проект: **Bibliaris** — мультиязычная онлайн-библиотека.

Поддерживаемые языки:

```txt
/en
/es
/fr
/pt
/ru
```

В проекте есть 4 типа таксономий:

```txt
category   — крупные разделы каталога
 genre      — литературные жанры и формы
collection — подборки, форматы, редакционные страницы
tag        — темы, мотивы, сеттинги, персонажи, настроение, сюжетные элементы
```

Цель задачи — доработать публичный интерфейс таксономий так, чтобы страницы стали не просто списками книг, а полноценными SEO-посадочными страницами с сильной внутренней перелинковкой.

Текущее состояние страниц слишком простое: на странице таксономии есть в основном H1, количество книг и карточки книг. Нужно добавить структуру, которая использует уже подготовленные SEO-поля таксономий:

```txt
h1
shortDescription
description
faq
metaTitle
metaDescription
ogTitle
ogDescription
ogImageUrl
ogImageAlt
indexable
isVisible
sortOrder
parent/children
relatedCategorySlugs
relatedGenreSlugs
relatedCollectionSlugs
relatedTagSlugs
booksCount
```

Если каких-то related-полей пока нет в API для конкретного типа таксономии, нужно предусмотреть fallback-логику, описанную ниже.

---

## 2. Главные принципы реализации

### 2.1. SEO-ссылки должны быть обычными ссылками

Все навигационные элементы, карточки таксономий, пункты сайдбара, breadcrumbs, related links и карточки книг должны быть настоящими ссылками:

```html
<a href="/en/genre/tragedy">Tragedy</a>
```

Нельзя делать основные SEO-переходы через:

```txt
button
div onClick
JS-only navigation без href
```

Можно использовать компонент `Link`, если итоговый DOM содержит корректный `<a href="...">`.

---

### 2.2. Не создавать дубль-страницы книг внутри таксономий

Карточка книги на странице таксономии должна вести только на canonical URL книги:

```txt
/{locale}/book/{bookSlug}
```

Нельзя создавать URL вида:

```txt
/{locale}/genre/{genreSlug}/{bookSlug}
/{locale}/category/{categorySlug}/{bookSlug}
/{locale}/tag/{tagSlug}/{bookSlug}
```

---

### 2.3. Не выводить пустые и скрытые таксономии в публичной навигации

В публичных списках, сайдбарах и related-блоках не показывать таксономии, если:

```txt
isVisible === false
indexable === false
booksCount === 0
```

Исключение: текущая страница может быть открыта напрямую, если маршрут уже существует. В этом случае см. правила empty state и robots ниже.

---

### 2.4. Длинный SEO-текст не должен мешать пользователю

Книги должны идти выше длинного SEO-описания.

Правильный порядок:

```txt
H1 + shortDescription
книги
related-блоки
long description
FAQ
```

Нельзя ставить длинное описание на 500–800 слов перед списком книг.

---

### 2.5. Полный SEO-текст должен быть в HTML

Если используется `Show more / Show less`, полный `description` всё равно должен быть в HTML страницы сразу, а не подгружаться после клика.

Допустимо:

```txt
CSS max-height + overflow hidden + gradient + кнопка Show more
```

Нежелательно:

```txt
загружать оставшийся текст только после клика
полностью скрывать основной SEO-текст через display:none
```

---

## 3. Роуты

### 3.1. Главные хабы

Нужно поддерживать публичные страницы:

```txt
/{locale}/catalog
/{locale}/categories
/{locale}/genres
/{locale}/collections
/{locale}/tags
/{locale}/audiobooks
/{locale}/popular
/{locale}/new-releases
```

### 3.2. Страницы конкретных таксономий

```txt
/{locale}/category/{slug}
/{locale}/genre/{slug}
/{locale}/collection/{slug}
/{locale}/tag/{slug}
```

### 3.3. Canonical URL

Canonical должен соответствовать текущему типу таксономии:

```txt
category   → /{locale}/category/{slug}
genre      → /{locale}/genre/{slug}
collection → /{locale}/collection/{slug}
tag        → /{locale}/tag/{slug}
```

Не использовать query-параметры как canonical SEO URL для таксономий.

---

# Часть A. Header navigation

## 4. Цель

Обновить публичную навигацию в header так, чтобы она вела на главные SEO-хабы сайта и была удобна пользователю.

---

## 5. Desktop header

### 5.1. Рекомендуемая последовательность пунктов

На desktop в header вывести пункты в такой последовательности:

```txt
Catalog
Categories
Genres
Collections
Tags
Audiobooks
Popular
New Releases
```

Целевые URL:

```txt
Catalog      → /{locale}/catalog
Categories   → /{locale}/categories
Genres       → /{locale}/genres
Collections  → /{locale}/collections
Tags         → /{locale}/tags
Audiobooks   → /{locale}/audiobooks
Popular      → /{locale}/popular
New Releases → /{locale}/new-releases
```

### 5.2. Если меню не помещается

Если на текущей ширине header визуально перегружен, использовать сокращённый вариант:

```txt
Catalog
Categories
Genres
Collections
Audiobooks
Popular
```

А пункты:

```txt
Tags
New Releases
```

перенести в `More` dropdown или оставить в mobile menu/footer/sidebar.

Приоритет для header:

```txt
1. Catalog
2. Categories
3. Genres
4. Collections
5. Audiobooks
6. Popular
7. Tags
8. New Releases
```

---

## 6. Header layout

Desktop-схема:

```txt
--------------------------------------------------
LOGO        SEARCH BAR                  icons/lang
--------------------------------------------------
Catalog  Categories  Genres  Collections  Tags  Audiobooks  Popular  New Releases
--------------------------------------------------
```

Если header сделан в одну строку, допустимо:

```txt
LOGO | Search | Catalog | Categories | Genres | Collections | Tags | Audiobooks | Popular | New Releases | icons/lang
```

Но важно сохранить читаемость.

---

## 7. Active state

Для текущего раздела добавить active state.

Примеры:

```txt
/en/genre/tragedy        → активен пункт Genres
/en/genres               → активен пункт Genres
/en/category/history     → активен пункт Categories
/en/collection/short-reads → активен пункт Collections
/en/tag/aestheticism     → активен пункт Tags
/en/catalog              → активен пункт Catalog
```

---

## 8. Mobile header

На мобильной версии не пытаться уместить все пункты в одну строку.

Mobile header:

```txt
LOGO        search icon / compact search        menu button
```

Внутри mobile menu вывести полный список:

```txt
Catalog
Categories
Genres
Collections
Tags
Audiobooks
Popular
New Releases
```

Все пункты mobile menu также должны быть `<a href="...">`.

---

# Часть B. Overview pages таксономий

## 9. Overview pages

Нужно привести к единой логике страницы:

```txt
/{locale}/categories
/{locale}/genres
/{locale}/collections
/{locale}/tags
```

Эти страницы являются хабами, ведущими на конкретные таксономии.

---

## 10. Структура overview page

Пример для `/en/genres`:

```txt
Header
Breadcrumbs
H1: Browse Genres
Short description
Taxonomy groups/list
Optional SEO text
```

Схема:

```txt
--------------------------------------------------
Home → Genres

Browse Genres
Discover books across every genre and literary style.

[Genre group]
Drama 3 books
  Family Drama 1
  Tragedy 2

Gothic Fiction 3 books
Literary Fiction 3 books
Mystery 0 books — не показывать, если booksCount=0
--------------------------------------------------
```

---

## 11. Правила вывода overview page

Показывать только таксономии, где:

```txt
isVisible === true
booksCount > 0
```

Если `indexable === false`, такую таксономию не показывать в публичном SEO-списке.

Сортировка:

```txt
1. sortOrder ASC
2. name ASC
```

Иерархия:

```txt
parent
  children
```

Если parent имеет `booksCount = 0`, но у него есть видимые children с книгами, parent можно показывать как группировку.

---

## 12. Названия overview pages

Для EN:

```txt
/categories  → Browse Categories
/genres      → Browse Genres
/collections → Browse Collections
/tags        → Browse Tags
```

Для других языков использовать текущую i18n-систему проекта.

Если переводов интерфейса ещё нет, оставить временно английские строки, но все пользовательские строки должны быть вынесены в i18n.

---

# Часть C. Страница конкретной таксономии

## 13. Целевые страницы

Единая логика должна работать для:

```txt
/{locale}/category/{slug}
/{locale}/genre/{slug}
/{locale}/collection/{slug}
/{locale}/tag/{slug}
```

---

## 14. Общая структура страницы

Страница конкретной таксономии должна иметь такую последовательность блоков:

```txt
1. Header
2. Breadcrumbs
3. Taxonomy hero
4. Optional children/subtaxonomies block
5. Main layout: Sidebar + Book grid
6. Related taxonomies block
7. Long SEO description
8. FAQ
9. Bottom internal links
```

Полная схема:

```txt
HEADER
--------------------------------------------------

BREADCRUMBS
Home → Genres → Tragedy

HERO
H1: Tragedy Books
shortDescription
2 books found
optional parent link

OPTIONAL CHILDREN
Subgenres:
[Family Drama] [Historical Drama] [Psychological Drama]

MAIN AREA
--------------------------------------------------
LEFT SIDEBAR                  BOOK GRID
Browse                        [Book] [Book] [Book]
Current Section               [Book] [Book] [Book]
Related Categories
Related Genres
Related Collections
Related Tags
--------------------------------------------------

RELATED TAXONOMIES
Related genres:
[Drama] [Literary Fiction] [Psychological Fiction]

Related categories:
[Classic Literature] [Fiction]

Related tags:
[Tragic Hero] [Fate] [Loss] [Moral Choice]

Related collections:
[School Reading] [Free Books]

SEO TEXT
About Tragedy Books
HTML description

FAQ
faq items

BOTTOM LINKS
All Genres | All Categories | Collections | Tags
```

---

## 15. Breadcrumbs

Breadcrumbs обязательны для страниц таксономий.

Примеры:

```txt
/en/genre/tragedy
Home → Genres → Tragedy
```

```txt
/en/category/victorian-literature
Home → Categories → Classic Literature → Victorian Literature
```

```txt
/en/collection/short-reads
Home → Collections → Short Reads
```

```txt
/en/tag/aestheticism
Home → Tags → Aestheticism
```

Каждый breadcrumb, кроме последнего, должен быть ссылкой `<a href="...">`.

---

## 16. Taxonomy hero

Hero — это верхний информационный блок страницы.

Использовать поля:

```txt
translation.h1
translation.shortDescription
booksCount
parent taxonomy, если есть
```

Схема:

```txt
--------------------------------------------------
Home → Genres → Tragedy

Tragedy Books
Discover tragedy books on Bibliaris — powerful stories about fate, conflict, loss, moral choice, and the human condition.

2 books found
--------------------------------------------------
```

Правила:

```txt
H1 = translation.h1, если есть
fallback H1 = `${translation.name} Books`
shortDescription показывать, если есть
booksCount показывать всегда
```

Для русского языка fallback H1 не собирать автоматически через английское `Books`, если нет i18n-логики. Лучше fallback = `translation.name`.

---

## 17. Optional children/subtaxonomies block

Если у текущей таксономии есть дочерние элементы, показать блок сразу после hero и до списка книг.

Пример для `Drama`:

```txt
Explore Drama Genres
[Family Drama] [Tragedy] [Comedy] [Historical Drama] [Psychological Drama] [Social Drama]
```

Показывать children, если:

```txt
isVisible === true
booksCount > 0
```

Сортировка:

```txt
sortOrder ASC
name ASC
```

Если children нет — блок не показывать.

---

## 18. Main layout

Desktop:

```txt
Sidebar слева, Book grid справа
```

Пример пропорций:

```txt
Sidebar: 240–300px
Content: остальная ширина
```

Mobile:

```txt
Sidebar скрыт в collapsible/off-canvas блок
Book grid идёт первым после hero/children
Кнопка: Browse / Filters
```

---

## 19. Book grid

Блок книг должен идти высоко на странице.

Заголовок блока:

```txt
Books in {taxonomyName}
```

или просто показывать карточки сразу, если на странице уже есть H1.

Карточки книг должны использовать существующий дизайн карточек Bibliaris.

Каждая карточка должна вести на canonical URL книги:

```txt
/{locale}/book/{bookSlug}
```

Нельзя вести книгу на вложенный taxonomy URL.

---

## 20. Empty state

Если у таксономии нет книг:

```txt
booksCount === 0
```

Поведение:

```txt
1. Страницу не добавлять в sitemap.
2. robots должен быть noindex, follow.
3. В публичных списках и sidebar такую таксономию не показывать.
4. Если пользователь всё же открыл URL напрямую, показать аккуратный empty state.
```

Empty state:

```txt
No books found yet.
Explore all books or browse related sections.

[All Books] [Genres] [Categories]
```

Не делать SEO-оптимизированную пустую страницу с большим текстом и 0 книгами.

---

# Часть D. Sidebar

## 21. Цель sidebar

Sidebar нужен для:

```txt
1. быстрой навигации пользователя;
2. контекстной внутренней перелинковки;
3. передачи SEO-веса между связанными страницами;
4. помощи поисковикам понять структуру сайта;
5. предотвращения тупиковых страниц.
```

Sidebar не должен быть огромным списком всех таксономий.

---

## 22. Универсальная структура sidebar

Sidebar для страниц таксономий состоит из блоков:

```txt
1. Browse
2. Current Section
3. Related Categories
4. Related Genres
5. Related Collections
6. Related Tags
```

Показывать только те блоки, где есть данные.

---

## 23. Browse block

Вверху sidebar всегда показывать:

```txt
Browse
- All Books
- All Categories / All Genres / All Collections / All Tags
```

Второй пункт зависит от текущего типа страницы:

```txt
category page   → All Categories
genre page      → All Genres
collection page → All Collections
tag page        → All Tags
```

URL:

```txt
All Books       → /{locale}/catalog
All Categories  → /{locale}/categories
All Genres      → /{locale}/genres
All Collections → /{locale}/collections
All Tags        → /{locale}/tags
```

---

## 24. Current Section block

Показывает контекст текущей таксономии.

Состав:

```txt
parent taxonomy, если есть
current taxonomy, active state
children, если есть
siblings, если есть
```

Пример для `/en/genre/tragedy`:

```txt
Current Genre
Drama
  Family Drama
  Tragedy ← active
  Comedy
  Historical Drama
  Psychological Drama
  Social Drama
```

Если parent нет:

```txt
Current Genre
Tragedy ← active
```

Если children есть:

```txt
Current Category
Classic Literature ← active
  American Classics
  English Classics
  French Classics
  Russian Classics
  Victorian Literature
```

Ограничения:

```txt
не показывать hidden/noindex/0-books элементы
максимум 10 siblings/children
если больше — View all
```

---

## 25. Related Categories block

Показывать категории, связанные с текущей таксономией.

Источники данных по приоритету:

```txt
1. explicit relatedCategorySlugs текущей таксономии
2. fallback: категории, которые есть у книг текущей выдачи
```

Фильтры:

```txt
isVisible === true
indexable === true
booksCount > 0
не показывать текущую таксономию, если она сама category
```

Максимум элементов:

```txt
8
```

---

## 26. Related Genres block

Источники данных:

```txt
1. explicit relatedGenreSlugs текущей таксономии
2. fallback: жанры, которые есть у книг текущей выдачи
```

Фильтры:

```txt
isVisible === true
indexable === true
booksCount > 0
не показывать текущую таксономию, если она сама genre
```

Максимум элементов:

```txt
8
```

---

## 27. Related Collections block

Источники данных:

```txt
1. explicit relatedCollectionSlugs текущей таксономии
2. fallback: коллекции, которые есть у книг текущей выдачи
```

Фильтры:

```txt
isVisible === true
indexable === true
booksCount > 0
не показывать текущую таксономию, если она сама collection
```

Максимум элементов:

```txt
8
```

---

## 28. Related Tags block

Источники данных:

```txt
1. explicit relatedTagSlugs текущей таксономии
2. fallback: теги, которые есть у книг текущей выдачи
```

Фильтры:

```txt
isVisible === true
indexable === true
booksCount > 0
не показывать текущую таксономию, если она сама tag
```

Максимум элементов:

```txt
12
```

Для tags можно показывать больше элементов, потому что они обычно короче и работают как тематические chips.

---

## 29. Sidebar examples

### 29.1. Genre page: Tragedy

```txt
Browse
- All Books
- All Genres

Current Genre
- Drama
  - Family Drama
  - Tragedy ← active
  - Comedy
  - Historical Drama
  - Psychological Drama
  - Social Drama

Related Categories
- Classic Literature
- Fiction
- Victorian Literature

Related Collections
- School Reading
- Free Books
- Short Reads

Related Tags
- Tragic Hero
- Fate
- Loss
- Moral Choice
- Sacrifice
```

### 29.2. Category page: Classic Literature

```txt
Browse
- All Books
- All Categories

Current Category
- Classic Literature ← active
  - American Classics
  - English Classics
  - French Classics
  - Russian Classics
  - Victorian Literature

Related Genres
- Literary Fiction
- Gothic Fiction
- Philosophical Fiction
- Psychological Fiction
- Satire

Related Collections
- Free Books
- School Reading
- Short Reads

Related Tags
- Timeless Story
- Moral Choice
- Social Class
- Love
- Fate
```

### 29.3. Collection page: Short Reads

```txt
Browse
- All Books
- All Collections

Current Collection
- Short Reads ← active

Related Collections
- Free Books
- School Reading
- Feel-Good Books

Related Genres
- Short Stories
- Novellas
- Fairy Tales
- Fables

Related Tags
- Quick Read
- Easy to Read
- Light-hearted
```

### 29.4. Tag page: Aestheticism

```txt
Browse
- All Books
- All Tags

Current Tag
- Aestheticism ← active

Related Tags
- Beauty and Youth
- Art and Reality
- Moral Corruption
- Double Life
- Hedonism

Related Genres
- Gothic Fiction
- Philosophical Fiction
- Literary Fiction

Related Categories
- Classic Literature
- Victorian Literature
- English Literature

Related Collections
- School Reading
- Free Books
```

---

# Часть E. Related taxonomy blocks внутри страницы

## 30. Цель

Помимо sidebar, после списка книг нужно добавить основной блок связанной перелинковки. Он лучше виден пользователю и поисковикам в основном контенте страницы.

---

## 31. Расположение

Related taxonomy block должен идти:

```txt
после Book grid
до long SEO description
```

---

## 32. Структура блока

```txt
Related to Tragedy

Genres:
[Drama] [Literary Fiction] [Psychological Fiction]

Categories:
[Classic Literature] [Fiction]

Themes:
[Tragic Hero] [Fate] [Loss] [Moral Choice]

Collections:
[School Reading] [Free Books]
```

Названия секций:

```txt
Related Genres
Related Categories
Related Collections
Related Tags / Related Themes
```

Для tag pages лучше использовать `Related Themes` вместо `Related Tags`, если так звучит естественнее в интерфейсе.

---

## 33. Источники данных

Использовать ту же логику, что и sidebar:

```txt
1. explicit related*Slugs
2. fallback from current books taxonomies
```

---

## 34. Ограничения

```txt
Related Categories: максимум 8
Related Genres: максимум 8
Related Collections: максимум 8
Related Tags: максимум 16
```

Не показывать пустые секции.

Не дублировать текущую таксономию.

---

# Часть F. Long SEO description

## 35. Поле description

Использовать:

```txt
translation.description
```

Это HTML-строка.

Нужно безопасно отрендерить HTML:

```txt
sanitize HTML перед выводом, если в проекте уже есть санитайзер
разрешить базовые теги: p, strong, em, ul, ol, li, a, h2, h3
запретить script/style/iframe/event handlers
```

Если backend уже отдаёт безопасный HTML и в проекте есть принятый способ вывода, использовать существующий способ.

---

## 36. Расположение description

Long SEO description выводить после:

```txt
Book grid
Related taxonomy block
```

Схема:

```txt
About Tragedy Books

[description HTML]
```

Заголовок блока:

```txt
About {h1 или taxonomy name}
```

Примеры:

```txt
About Tragedy Books
About Classic Literature Books
About Aestheticism Books
```

---

## 37. Show more / Show less

Если description длиннее условного лимита, например 1200–1600 символов, можно визуально свернуть текст.

Требования:

```txt
полный текст должен быть в HTML сразу
использовать CSS max-height/gradient
кнопка Show more / Show less должна менять только визуальное состояние
кнопка должна иметь aria-expanded и aria-controls
```

Если description короткий — не показывать кнопку.

---

# Часть G. FAQ

## 38. FAQ block

Если у перевода таксономии есть `faq` и массив не пустой, показать FAQ после long description.

Схема:

```txt
FAQ

What is tragedy in literature?
Tragedy is a literary form focused on serious conflict, suffering, downfall, moral choice, or irreversible loss.

What are common themes in tragedy books?
Common themes include fate, ambition, guilt, sacrifice, justice, love, death, and moral responsibility.
```

Можно использовать accordion, но ответы должны быть доступны в HTML.

---

## 39. FAQ JSON-LD

Если FAQ есть, генерировать structured data `FAQPage`.

Правила:

```txt
использовать только реально отображаемые FAQ на странице
не генерировать FAQPage, если faq пустой
не добавлять выдуманные вопросы
```

---

# Часть H. Bottom internal links

## 40. Нижний блок навигации

Внизу страницы после FAQ добавить компактный блок:

```txt
Explore more on Bibliaris
[All Books] [Categories] [Genres] [Collections] [Tags] [Audiobooks]
```

URL:

```txt
All Books   → /{locale}/catalog
Categories  → /{locale}/categories
Genres      → /{locale}/genres
Collections → /{locale}/collections
Tags        → /{locale}/tags
Audiobooks  → /{locale}/audiobooks
```

Этот блок можно скрыть, если в footer уже есть аналогичная навигация, но лучше оставить на страницах таксономий как дополнительную внутреннюю перелинковку.

---

# Часть I. SEO metadata и structured data

## 41. Meta title

Использовать:

```txt
translation.metaTitle
```

Fallback:

```txt
translation.h1 + " | Bibliaris"
```

---

## 42. Meta description

Использовать:

```txt
translation.metaDescription
```

Fallback:

```txt
translation.shortDescription
```

Если нет ни metaDescription, ни shortDescription, fallback не генерировать из длинного HTML description без очистки.

---

## 43. H1

На странице должен быть ровно один главный H1.

Использовать:

```txt
translation.h1
```

Fallback:

```txt
translation.name
```

---

## 44. OG fields

Использовать:

```txt
ogTitle
ogDescription
ogImageUrl
ogImageAlt
```

Fallback:

```txt
ogTitle       → metaTitle
ogDescription → metaDescription
ogImageUrl    → default site OG image
ogImageAlt    → `${translation.name} on Bibliaris`
```

На текущем этапе не требуется генерировать индивидуальные картинки для каждой таксономии.

---

## 45. Robots

Правила:

```txt
если taxonomy.indexable === false → noindex, follow
если taxonomy.booksCount === 0 → noindex, follow
иначе → index, follow
```

Если для tags есть translation-level `robots`, оно может переопределять общий robots, но не должно разрешать index для страницы без книг.

---

## 46. Canonical

Canonical URL формируется по типу:

```txt
category   → https://bibliaris.com/{locale}/category/{slug}
genre      → https://bibliaris.com/{locale}/genre/{slug}
collection → https://bibliaris.com/{locale}/collection/{slug}
tag        → https://bibliaris.com/{locale}/tag/{slug}
```

Если backend отдаёт `canonicalUrl`, можно использовать его, но он должен совпадать с этим правилом.

---

## 47. Hreflang

Если у таксономии есть переводы на 5 языков, сгенерировать hreflang-ссылки:

```txt
en
es
fr
pt
ru
x-default
```

Каждый hreflang должен вести на локализованный slug соответствующего языка.

---

## 48. Structured data

Добавить JSON-LD:

```txt
BreadcrumbList — на всех taxonomy detail pages и overview pages
FAQPage — только если faq есть и отображается на странице
ItemList — для списка книг, если это легко встроить в текущую архитектуру
```

`ItemList` не обязателен в первой итерации, если это усложняет задачу. `BreadcrumbList` и `FAQPage` важнее.

---

# Часть J. Data requirements

## 49. Для taxonomy detail page нужны данные

Для страницы `/en/genre/tragedy` фронту нужны:

```ts
type TaxonomyPageData = {
  taxonomy: {
    id: string;
    key?: string;
    type: "category" | "genre" | "collection" | "tag";
    name: string;
    slug: string;
    booksCount: number;
    indexable: boolean;
    isVisible: boolean;
    sortOrder?: number;
    parent?: TaxonomyLink | null;
    children?: TaxonomyLink[];
    siblings?: TaxonomyLink[];
    translations/currentTranslation: {
      language: string;
      name: string;
      slug: string;
      h1?: string | null;
      shortDescription?: string | null;
      description?: string | null;
      metaTitle?: string | null;
      metaDescription?: string | null;
      ogTitle?: string | null;
      ogDescription?: string | null;
      ogImageUrl?: string | null;
      ogImageAlt?: string | null;
      faq?: Array<{ question: string; answer: string }>;
      canonicalUrl?: string | null;
      robots?: string | null;
      relatedCategorySlugs?: string[];
      relatedGenreSlugs?: string[];
      relatedCollectionSlugs?: string[];
      relatedTagSlugs?: string[];
    };
  };
  books: BookCard[];
  relatedCategories?: TaxonomyLink[];
  relatedGenres?: TaxonomyLink[];
  relatedCollections?: TaxonomyLink[];
  relatedTags?: TaxonomyLink[];
};
```

Пример `TaxonomyLink`:

```ts
type TaxonomyLink = {
  id?: string;
  key?: string;
  type: 'category' | 'genre' | 'collection' | 'tag';
  name: string;
  slug: string;
  booksCount?: number;
  indexable?: boolean;
  isVisible?: boolean;
};
```

---

## 50. Если API не отдаёт все данные сразу

Если текущий backend не отдаёт parent/children/siblings/related вместе с taxonomy detail, можно реализовать на фронте несколькими запросами:

```txt
1. получить текущую таксономию по type + slug + locale
2. получить книги текущей таксономии
3. получить дерево/список таксономий нужного типа для parent/children/siblings
4. получить related по slugs, если API поддерживает
5. если related нет — собрать fallback из таксономий книг текущей выдачи
```

Если backend проще доработать — допустимо добавить отдельный endpoint:

```txt
GET /taxonomy-page?type=genre&slug=tragedy&language=en
```

который сразу вернёт всё, что нужно странице.

Но в рамках этой задачи не обязательно создавать новый endpoint, если можно аккуратно использовать существующие.

---

# Часть K. Fallback related logic

## 51. Когда использовать fallback

Fallback использовать, если:

```txt
relatedCategorySlugs отсутствует или пустой
relatedGenreSlugs отсутствует или пустой
relatedCollectionSlugs отсутствует или пустой
relatedTagSlugs отсутствует или пустой
```

---

## 52. Как строить fallback

На основе книг текущей выдачи:

```txt
1. собрать все categories/genres/collections/tags у этих книг
2. убрать текущую таксономию
3. убрать hidden/noindex/0-books
4. отсортировать по частоте появления среди книг
5. затем по booksCount DESC
6. затем по name ASC
7. взять лимит
```

Лимиты:

```txt
categories: 8
genres: 8
collections: 8
tags: 12 в sidebar, 16 в main related block
```

---

# Часть L. Responsive design

## 53. Desktop

```txt
Header полный
Sidebar слева
Book grid справа
Related blocks под book grid
Description и FAQ под related blocks
```

---

## 54. Tablet

```txt
Header может перейти в сокращённый nav или More
Sidebar можно оставить слева, если ширина позволяет
Book grid 2–3 колонки
```

---

## 55. Mobile

```txt
Header: logo + search + menu
Sidebar: off-canvas/collapsible Browse block
Book grid: 1–2 колонки
Related links: chips, несколько строк
Description: readable text width
FAQ: accordion or stacked blocks
```

На мобильном порядок:

```txt
Breadcrumbs
Hero
Children chips
Browse/Filters button
Book grid
Related blocks
Description
FAQ
Bottom links
```

---

# Часть M. Accessibility

## 56. Требования

```txt
один H1 на странице
логичная иерархия H2/H3
все ссылки доступны с клавиатуры
active state не только цветом, но и aria-current="page"
Show more имеет aria-expanded и aria-controls
mobile menu имеет aria-label
off-canvas sidebar закрывается по Escape
```

---

# Часть N. Не входит в задачу

В этой задаче не нужно делать:

```txt
индивидуальные hero-картинки для каждой таксономии
генерацию изображений для таксономий
новую систему aliases/redirects
сложные contentBlocks вместо одного description
collectionRule/dynamic collections
переработку карточки книги, если она уже есть
переработку админки
массовое заполнение переводов
```

---

# Часть O. Этапы реализации для ИИ-агента

## Этап 1. Аудит текущих маршрутов и компонентов

Задачи:

```txt
1. Найти текущие публичные routes для /genres и /genre/:slug.
2. Найти аналогичные routes для categories/collections/tags, если они уже есть.
3. Найти компонент публичного Header.
4. Найти компонент карточки книги.
5. Найти текущий способ получения таксономий и книг.
6. Найти текущий способ генерации metadata/SEO.
```

Результат этапа:

```txt
короткий список найденных файлов и компонентов
понимание, что нужно менять
без больших изменений кода
```

---

## Этап 2. Header navigation

Задачи:

```txt
1. Обновить desktop header navigation.
2. Добавить пункты Catalog, Categories, Genres, Collections, Tags, Audiobooks, Popular, New Releases.
3. Все ссылки сделать через href.
4. Добавить active state по текущему маршруту.
5. Проверить, что header не ломается на desktop.
```

Acceptance criteria:

```txt
[ ] Все пункты ведут на правильные локализованные URL.
[ ] Все пункты являются настоящими ссылками.
[ ] Active state работает для overview и detail routes.
[ ] Header визуально не ломается.
```

---

## Этап 3. Mobile navigation

Задачи:

```txt
1. Проверить mobile header.
2. Если меню уже есть — добавить новые пункты туда.
3. Если меню нет — сделать простое mobile menu.
4. Сохранить search/logo/lang/icons.
```

Acceptance criteria:

```txt
[ ] На mobile доступны все пункты навигации.
[ ] Mobile menu открывается/закрывается.
[ ] Ссылки в mobile menu имеют href.
[ ] Нет горизонтального overflow.
```

---

## Этап 4. Overview pages

Задачи:

```txt
1. Привести /categories, /genres, /collections, /tags к единому стилю.
2. Показывать H1 + short description.
3. Выводить список таксономий с иерархией.
4. Скрывать hidden/noindex/0-books элементы.
5. Сортировать по sortOrder/name.
```

Acceptance criteria:

```txt
[ ] /genres показывает только видимые жанры с книгами.
[ ] /categories показывает только видимые категории с книгами или parent-группы с детьми.
[ ] /collections показывает видимые коллекции.
[ ] /tags показывает видимые теги.
[ ] Все элементы списка являются ссылками.
```

---

## Этап 5. Taxonomy detail page layout

Задачи:

```txt
1. Сделать/обновить общий layout для detail pages.
2. Поддержать category/genre/collection/tag.
3. Добавить breadcrumbs.
4. Добавить taxonomy hero.
5. Добавить children block.
6. Сохранить вывод book grid.
```

Acceptance criteria:

```txt
[ ] /genre/tragedy имеет breadcrumbs, H1, shortDescription, booksCount, books.
[ ] /category/... работает по той же логике.
[ ] /collection/... работает по той же логике.
[ ] /tag/... работает по той же логике.
[ ] H1 только один.
```

---

## Этап 6. Sidebar

Задачи:

```txt
1. Создать универсальный TaxonomySidebar.
2. Реализовать Browse block.
3. Реализовать Current Section block.
4. Реализовать Related Categories/Genres/Collections/Tags.
5. Добавить fallback related logic, если explicit related нет.
6. Скрывать пустые блоки.
```

Acceptance criteria:

```txt
[ ] Sidebar отображается на desktop.
[ ] На mobile sidebar доступен через Browse/Filters.
[ ] Не показываются hidden/noindex/0-books ссылки.
[ ] Current taxonomy имеет active state и aria-current="page".
[ ] Все ссылки имеют href.
```

---

## Этап 7. Main related taxonomy block

Задачи:

```txt
1. Добавить Related taxonomy block после book grid.
2. Использовать explicit related*Slugs или fallback.
3. Выводить chips/cards ссылками.
4. Не дублировать текущую таксономию.
```

Acceptance criteria:

```txt
[ ] Related block появляется после книг.
[ ] Пустые секции не отображаются.
[ ] Все chips/cards — ссылки.
[ ] Лимиты соблюдаются.
```

---

## Этап 8. Long description + FAQ

Задачи:

```txt
1. Вывести translation.description после related block.
2. Добавить заголовок About ...
3. Безопасно отрендерить HTML.
4. Добавить Show more для длинных текстов, если уместно.
5. Вывести FAQ после description.
```

Acceptance criteria:

```txt
[ ] Description отображается ниже книг и related-блока.
[ ] HTML не ломает страницу.
[ ] FAQ отображается, если массив не пустой.
[ ] FAQ не отображается, если массива нет или он пустой.
```

---

## Этап 9. SEO metadata + structured data

Задачи:

```txt
1. Использовать metaTitle/metaDescription.
2. Использовать ogTitle/ogDescription/ogImage.
3. Сформировать canonical.
4. Сформировать robots.
5. Добавить hreflang, если проект это поддерживает.
6. Добавить BreadcrumbList JSON-LD.
7. Добавить FAQPage JSON-LD, если FAQ есть.
```

Acceptance criteria:

```txt
[ ] Title берётся из metaTitle или fallback.
[ ] Description берётся из metaDescription или fallback.
[ ] robots noindex для indexable=false и booksCount=0.
[ ] canonical соответствует текущему URL.
[ ] BreadcrumbList соответствует breadcrumbs.
[ ] FAQPage генерируется только при наличии FAQ.
```

---

## Этап 10. Empty states

Задачи:

```txt
1. Обработать taxonomy pages с 0 книг.
2. Не показывать такие таксономии в overview/sidebar/related.
3. Для прямого URL показать аккуратный empty state.
4. Убедиться, что robots=noindex, follow.
```

Acceptance criteria:

```txt
[ ] Mystery с 0 книг не виден в публичных списках.
[ ] Прямой URL не ломается.
[ ] Empty state предлагает перейти в каталог/жанры/категории.
[ ] robots noindex.
```

---

## Этап 11. Responsive QA

Задачи:

```txt
1. Проверить desktop.
2. Проверить tablet.
3. Проверить mobile.
4. Проверить длинные названия таксономий.
5. Проверить 1 книгу, 2 книги, много книг, 0 книг.
```

Acceptance criteria:

```txt
[ ] Нет горизонтального скролла.
[ ] Sidebar удобен на desktop.
[ ] Mobile Browse/Filters работает.
[ ] Book grid не ломается.
[ ] Long description читается удобно.
```

---

# Часть P. Финальный QA checklist

Перед завершением задачи проверить:

```txt
[ ] Header содержит правильные хабы.
[ ] Header links имеют href.
[ ] Mobile menu содержит все хабы.
[ ] Overview pages работают для categories/genres/collections/tags.
[ ] Detail pages работают для category/genre/collection/tag.
[ ] Breadcrumbs есть и корректны.
[ ] H1 берётся из h1/fallback.
[ ] shortDescription отображается.
[ ] booksCount отображается.
[ ] Book cards ведут на canonical book URL.
[ ] Children block отображается только при наличии children.
[ ] Sidebar отображает Browse.
[ ] Sidebar отображает Current Section.
[ ] Sidebar отображает related-блоки.
[ ] Related main block отображается после книг.
[ ] Description отображается после related block.
[ ] FAQ отображается после description.
[ ] FAQPage JSON-LD есть только при FAQ.
[ ] BreadcrumbList JSON-LD есть.
[ ] noindex работает для пустых/неиндексируемых страниц.
[ ] Hidden/noindex/0-books таксономии не попадают в публичные списки.
[ ] Все публичные SEO-переходы — обычные ссылки.
[ ] Нет дубль-URL книг внутри таксономий.
[ ] Страница хорошо выглядит на desktop/tablet/mobile.
```

---

# 60. Главный результат

После реализации страница вида:

```txt
/en/genre/tragedy
```

должна выглядеть не так:

```txt
Tragedy
2 books found
[books]
```

а так:

```txt
Home → Genres → Tragedy

Tragedy Books
Short SEO intro
2 books found

[Sidebar] [Book grid]

Related genres/categories/tags/collections

About Tragedy Books
Long SEO description

FAQ

Explore more on Bibliaris
```

Это даст:

```txt
лучший UX
больше полезного контента на странице
более сильную внутреннюю перелинковку
лучшее понимание структуры сайта поисковиками
меньше пустых и слабых SEO-страниц
```
