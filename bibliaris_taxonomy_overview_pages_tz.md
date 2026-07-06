# ТЗ: SEO-страницы верхнего уровня для таксономий Bibliaris через Pages

## 1. Контекст задачи

В Bibliaris уже есть страницы конкретных таксономий:

```txt
/{locale}/category/{slug}
/{locale}/genre/{slug}
/{locale}/collection/{slug}
/{locale}/tag/{slug}
```

Для них проектируется полноценная SEO-страница: H1, shortDescription, список книг, related-блоки, description, FAQ, breadcrumbs, metadata.

Но также существуют обзорные родительские страницы:

```txt
/{locale}/categories
/{locale}/genres
/{locale}/collections
/{locale}/tags
```

Сейчас эти страницы в основном захардкожены в коде: H1, intro/description и meta-данные не редактируются из админки. Нужно переделать их так, чтобы SEO-контент редактировался через существующий раздел `Pages` в админке.

## 2. Цель

Сделать страницы:

```txt
/{locale}/categories
/{locale}/genres
/{locale}/collections
/{locale}/tags
```

полноценными SEO-хабами, где:

1. SEO-контент берётся из `Pages`.
2. В админке можно редактировать тексты на 5 языках.
3. Страницы индексируются и имеют корректные meta/canonical/OG/FAQ.
4. UI показывает понятную карту таксономий.
5. Все ссылки являются настоящими `<a href="...">`.
6. Страницы помогают пользователю и поисковикам понять структуру библиотеки.

## 3. Языки

Поддержать все текущие языки проекта:

```txt
en
es
fr
pt
ru
```

Все тексты страниц должны подтягиваться по текущему `locale`.

## 4. Системные страницы в Pages

Нужно использовать существующую сущность `Pages`, а не создавать новую отдельную сущность для SEO overview-страниц.

Создать или поддержать 4 системные страницы:

```txt
taxonomy-categories-index
taxonomy-genres-index
taxonomy-collections-index
taxonomy-tags-index
```

Соответствие ключей и маршрутов:

```txt
taxonomy-categories-index   -> /{locale}/categories
taxonomy-genres-index       -> /{locale}/genres
taxonomy-collections-index  -> /{locale}/collections
taxonomy-tags-index         -> /{locale}/tags
```

Эти страницы не должны отображаться как обычные пользовательские страницы, если в проекте есть общий список Pages. Они являются системными SEO-страницами.

## 5. Поля, которые должны использоваться из Pages

Для каждой системной страницы на каждом языке использовать следующие поля, если они уже есть в `Pages`:

```txt
h1
shortDescription
description
metaTitle
metaDescription
ogTitle
ogDescription
ogImageUrl
ogImageAlt
faq
robots
indexable
```

Если в текущей модели `Pages` какие-то из этих полей отсутствуют, нужно доработать `Pages` минимально, чтобы эти поля стали доступны.

Минимально обязательные поля:

```txt
h1
shortDescription
description
metaTitle
metaDescription
faq
indexable
```

OG-поля желательны, но если их нет, можно использовать fallback из meta-полей.

## 6. Fallback-логика

Если системная страница не найдена в `Pages`, страница не должна падать.

Нужно использовать fallback-контент из кода.

Fallback для `/categories`:

```txt
H1: Browse Book Categories
shortDescription: Explore book categories on Bibliaris.
metaTitle: Book Categories | Bibliaris
metaDescription: Browse book categories on Bibliaris. Discover classic literature, fiction, history, science, education, and more.
```

Fallback для `/genres`:

```txt
H1: Browse Book Genres
shortDescription: Discover books across every genre and literary style.
metaTitle: Book Genres | Bibliaris
metaDescription: Browse literary genres on Bibliaris. Discover drama, gothic fiction, mystery, romance, adventure, satire, fantasy, horror, and more.
```

Fallback для `/collections`:

```txt
H1: Book Collections
shortDescription: Explore curated collections of classic literature.
metaTitle: Book Collections | Bibliaris
metaDescription: Explore curated book collections on Bibliaris, including short reads, free books, school reading, audiobooks, summaries, and themed selections.
```

Fallback для `/tags`:

```txt
H1: Literary Tags & Book Themes
shortDescription: Explore literary tags, themes, motifs, characters, settings, moods, and reading interests on Bibliaris.
metaTitle: Literary Tags & Book Themes | Bibliaris
metaDescription: Browse literary tags and book themes on Bibliaris. Discover books by ideas, characters, settings, moods, genres, periods, and reading interests.
```

Fallback нужен только как защита. Основной источник контента — `Pages`.

## 7. Общая структура всех overview-страниц

Все 4 страницы должны иметь единую структуру:

```txt
HEADER

Breadcrumbs

Hero:
  H1
  shortDescription

Main content:
  list/cards/groups of taxonomies

SEO description:
  description from Pages

FAQ:
  faq from Pages

Bottom internal links:
  Catalog / Categories / Genres / Collections / Tags / Audiobooks / Popular / New Releases
```

Схема:

```txt
--------------------------------------------------
Home -> Browse Genres

Browse Book Genres
Discover books across every genre and literary style.

[Taxonomy list/cards/groups]

About Book Genres on Bibliaris
Long description from Pages

FAQ
--------------------------------------------------
```

## 8. Breadcrumbs

Breadcrumbs должны быть SEO-ссылками.

Для `/categories`:

```txt
Home -> Browse Categories
```

Для `/genres`:

```txt
Home -> Browse Genres
```

Для `/collections`:

```txt
Home -> Collections
```

Для `/tags`:

```txt
Home -> All Tags
```

Первый элемент `Home` должен вести на:

```txt
/{locale}
```

Текущий элемент может быть текстом без ссылки.

Также желательно генерировать JSON-LD `BreadcrumbList`.

## 9. SEO metadata

Для каждой страницы нужно формировать metadata из `Pages`.

Для текущего locale:

```txt
<title> = metaTitle
<meta name="description"> = metaDescription
canonical = https://bibliaris.com/{locale}/{route}
robots = из Pages, если есть, иначе index, follow
og:title = ogTitle || metaTitle
og:description = ogDescription || metaDescription
og:image = ogImageUrl || default OG image
og:image:alt = ogImageAlt || h1
```

Для всех 5 языков желательно добавить hreflang/alternates:

```txt
/en/categories
/es/categories
/fr/categories
/pt/categories
/ru/categories
```

Важно: если локализованные routes для этих overview-страниц в проекте остаются английскими (`categories`, `genres`, `collections`, `tags`), использовать именно текущую принятую структуру URL.

## 10. FAQ

Если в `Pages` есть `faq` и массив не пустой:

1. Вывести FAQ внизу страницы после description.
2. Добавить JSON-LD `FAQPage`.

FAQ не показывать, если массив пустой.

Схема FAQ:

```txt
FAQ

What are book genres?
Book genres help readers find books by literary form, style, and storytelling tradition.

How can I find classic books by genre?
Use the genre list to browse drama, gothic fiction, romance, mystery, adventure, satire, and more.
```

## 11. SEO description

`description` из Pages выводить ниже основного списка таксономий.

Не ставить длинный SEO-текст перед списком, чтобы не ухудшать UX.

Порядок:

```txt
H1
shortDescription
taxonomy list/cards
SEO description
FAQ
```

Если `description` пустой — блок не показывать.

`description` может быть HTML. Нужно безопасно рендерить HTML так же, как это уже делается в других SEO-описаниях проекта.

## 12. Страница `/categories`

URL:

```txt
/{locale}/categories
```

Page key:

```txt
taxonomy-categories-index
```

Цель страницы: показать крупные разделы библиотеки.

Отображать только сущности типа:

```txt
category
```

Рекомендуемый UI:

```txt
Browse Book Categories
shortDescription

Main Categories

[Fiction]
3 books
Explore novels, stories, literary fiction, and classic prose.
Children: Contemporary Fiction, Literary Fiction, Social Fiction

[Classic Literature]
5 books
Timeless books, influential authors, and major literary periods.
Children: English Classics, Victorian Literature, Russian Classics

[History]
...
```

Правила вывода:

1. Показывать root categories, у которых `parentId = null`.
2. Внутри каждой root category показывать children, если они есть.
3. Children показывать ссылками, если у них есть книги и они доступны публично.
4. У root category показывать:
   - name
   - booksCount
   - shortDescription, если доступен
   - children list, если есть
5. Сортировка: `sortOrder ASC`, затем `name ASC`.

Для категорий лучше использовать список групп или карточки с вложенными ссылками.

## 13. Страница `/genres`

URL:

```txt
/{locale}/genres
```

Page key:

```txt
taxonomy-genres-index
```

Цель страницы: показать литературные жанры и формы.

Отображать только сущности типа:

```txt
genre
```

Рекомендуемый UI:

```txt
Browse Book Genres
shortDescription

Genre Groups

Drama
3 books
Family Drama 1
Tragedy 2
Comedy
Psychological Drama

Adventure
Children's Adventure
Historical Adventure
Sea Adventure
Survival Adventure

Mystery
Detective Fiction
Cozy Mystery
Whodunit
```

Правила вывода:

1. Показывать root genres.
2. Если у root genre есть children — показывать их под ним.
3. Если у жанра нет children — показывать как отдельную строку/карточку.
4. Не смешивать genres с categories.
5. Сортировка: `sortOrder ASC`, затем `name ASC`.

## 14. Страница `/collections`

URL:

```txt
/{locale}/collections
```

Page key:

```txt
taxonomy-collections-index
```

Цель страницы: показать подборки, форматы и редакционные хабы.

Отображать только сущности типа:

```txt
collection
```

Рекомендуемый UI: карточки, а не дерево.

Пример:

```txt
Book Collections
shortDescription

Featured Collections

[Short Reads]
Classic short stories, novellas, and quick books for a short literary break.

[Free Books]
Free public domain books available to read online on Bibliaris.

[School Reading]
Classic books often studied at school and university.

[Popular Fiction]
Accessible stories, novels, and classics for broad reading interests.
```

Правила вывода:

1. Показывать collections в виде grid/card layout.
2. У карточки показывать:
   - name
   - shortDescription
   - booksCount
3. Children для collections пока не акцентировать, если они есть.
4. Сортировка: `sortOrder ASC`, затем `name ASC`.

## 15. Страница `/tags`

URL:

```txt
/{locale}/tags
```

Page key:

```txt
taxonomy-tags-index
```

Цель страницы: показать литературные темы, мотивы, персонажей, сеттинги, настроение и сюжетные элементы.

Отображать сущности из таблицы tags.

Рекомендуемый UI на текущем этапе: карточки.

Пример:

```txt
Literary Tags & Book Themes
shortDescription

Popular Tags / All Tags

[Aestheticism]
5 books

[Beauty and Youth]
5 books

[Double Life]
5 books

[Moral Corruption]
5 books
```

Правила вывода:

1. Показывать только видимые теги.
2. Если есть `sortOrder`, сортировать по `sortOrder ASC`, затем `name ASC`.
3. Если `sortOrder` нет, сортировать по `booksCount DESC`, затем `name ASC`.
4. Карточка тега должна вести на:

```txt
/{locale}/tag/{slug}
```

В будущем можно добавить группировку тегов по типам, но в рамках этого ТЗ группировку не делать, если в базе нет отдельного поля `group`.

## 16. Правила для пустых таксономий

Конкретные страницы с 0 книгами не должны активно продвигаться.

Для overview-страниц применить такие правила:

1. Если `isVisible = false` — не показывать.
2. Если `indexable = false` — не показывать в SEO-блоках и не давать активную ссылку.
3. Если `booksCount = 0`:
   - по умолчанию не показывать на public overview;
   - исключение допустимо только если в проекте уже есть логика показа пустых видимых разделов.
4. Не добавлять пустые конкретные таксономии в sitemap.
5. Сами overview-страницы `/categories`, `/genres`, `/collections`, `/tags` должны индексироваться, если соответствующая Page имеет `indexable = true`.

## 17. Bottom internal links

Внизу overview-страниц добавить компактный блок внутренней навигации.

Пример:

```txt
Explore more on Bibliaris
Catalog | Categories | Genres | Collections | Tags | Audiobooks | Popular | New Releases
```

Все ссылки должны быть обычными `<a href>`.

URL:

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

Не показывать ссылку на текущую страницу как активную ссылку; можно показывать её как active text.

## 18. Header navigation

Header navigation уже должна содержать:

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

Порядок сохранить именно такой.

Все пункты должны быть настоящими ссылками:

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

На текущей странице соответствующий пункт должен иметь active state.

## 19. Mobile behavior

На мобильной версии:

1. Header не должен ломаться.
2. Если пункты навигации не помещаются, использовать burger/menu/drawer.
3. В mobile menu должны быть все пункты:

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

4. Overview-страницы должны отображать карточки/группы в одну колонку.
5. Тексты не должны выходить за экран.

## 20. Компонентная архитектура

Рекомендуется сделать общий компонент:

```txt
TaxonomyOverviewPage
```

Он должен принимать конфиг:

```ts
{
  type: 'category' | 'genre' | 'collection' | 'tag';
  pageKey: string;
  routeBase: string;
  titleFallback: string;
  shortDescriptionFallback: string;
  layout: 'tree' | 'grouped' | 'cards';
}
```

Пример конфигов:

```ts
categories: {
  type: 'category',
  pageKey: 'taxonomy-categories-index',
  routeBase: 'categories',
  layout: 'tree'
}

genres: {
  type: 'genre',
  pageKey: 'taxonomy-genres-index',
  routeBase: 'genres',
  layout: 'grouped'
}

collections: {
  type: 'collection',
  pageKey: 'taxonomy-collections-index',
  routeBase: 'collections',
  layout: 'cards'
}

tags: {
  type: 'tag',
  pageKey: 'taxonomy-tags-index',
  routeBase: 'tags',
  layout: 'cards'
}
```

Если в проекте проще оставить 4 отдельных компонента — можно, но нужно избегать дублирования логики metadata, breadcrumbs, FAQ, description.

## 21. Источники данных

Для контента страницы:

```txt
Pages API / Pages store / existing page fetching mechanism
```

Для списка таксономий:

```txt
Categories API для category/genre/collection
Tags API для tags
```

Для `category`, `genre`, `collection` использовать общий источник, но фильтровать по `type`.

Для tags использовать tags endpoint.

## 22. Валидация и graceful fallback

Страница должна корректно работать, если:

1. Page не найдена.
2. У Page нет перевода для текущего языка.
3. У taxonomies нет переводов для текущего языка.
4. Список таксономий пустой.
5. FAQ пустой.
6. Description пустой.

Fallback:

1. Если нет перевода текущего locale — использовать `en`, если доступен.
2. Если нет `en` — использовать базовое имя сущности.
3. Если нет Page — использовать fallback из кода.
4. Если нет таксономий — показать аккуратный empty state, но не ошибку.

Empty state:

```txt
No categories available yet.
No genres available yet.
No collections available yet.
No tags available yet.
```

Текст должен быть локализуемым.

## 23. SEO-требования к ссылкам

Все ссылки на таксономии должны быть обычными ссылками.

Правильно:

```html
<a href="/en/genre/tragedy">Tragedy</a>
```

Неправильно:

```html
<button onClick="...">Tragedy</button>
<div onClick="...">Tragedy</div>
```

Карточка может быть кликабельной, но внутри должен быть `<a href>`.

## 24. Индексация

Overview-страницы:

```txt
/categories
/genres
/collections
/tags
```

должны быть indexable, если соответствующая Page имеет:

```txt
indexable = true
robots = index, follow
```

Если Page имеет `indexable = false`, нужно:

1. robots = `noindex, follow`;
2. не добавлять страницу в sitemap;
3. оставить страницу доступной для пользователя, если она нужна публично.

## 25. Sitemap

Добавить overview-страницы в sitemap:

```txt
/{locale}/categories
/{locale}/genres
/{locale}/collections
/{locale}/tags
```

Условие:

```txt
Page exists AND indexable = true
```

Если Page не существует, можно использовать fallback и всё равно добавлять страницу в sitemap только если hardcoded fallback помечен как indexable.

## 26. Пример итоговой структуры `/genres`

```txt
HEADER

Home -> Browse Genres

Browse Book Genres
Discover books across every genre and literary style.

Genre Groups

Drama
3 books
Family Drama 1 | Tragedy 2 | Comedy | Psychological Drama

Gothic Fiction
3 books

Literary Fiction
3 books

Mystery
Detective Fiction | Cozy Mystery | Whodunit

Speculative Fiction
Fantasy | Horror | Science Fiction | Dystopian Fiction

About Book Genres on Bibliaris
[description from Pages]

FAQ
[faq from Pages]

Explore more on Bibliaris
Catalog | Categories | Genres | Collections | Tags | Audiobooks | Popular | New Releases
```

## 27. Пример итоговой структуры `/collections`

```txt
HEADER

Home -> Collections

Book Collections
Explore curated collections of classic literature.

Featured Collections

[Short Reads]
Classic short stories, novellas, and quick books for a short literary break.
12 books

[Free Books]
Free public domain books available to read online on Bibliaris.
5 books

[School Reading]
Classic books often studied at school and university.
8 books

About Bibliaris Collections
[description from Pages]

FAQ
[faq from Pages]
```

## 28. Этапы реализации

### Этап 1. Проверить Pages

Проверить текущую модель/API/frontend для `Pages`.

Нужно понять, есть ли поля:

```txt
h1
shortDescription
description
metaTitle
metaDescription
ogTitle
ogDescription
ogImageUrl
ogImageAlt
faq
indexable
robots
```

Если каких-то обязательных полей нет — добавить их.

### Этап 2. Добавить системные Page keys

Добавить поддержку ключей:

```txt
taxonomy-categories-index
taxonomy-genres-index
taxonomy-collections-index
taxonomy-tags-index
```

Если в проекте есть seed — добавить seed для этих страниц.

Если seed не используется — убедиться, что страницы можно создать руками в админке.

### Этап 3. Реализовать fetch Page by key

На overview-страницах получать Page по ключу и текущему locale.

Если Page не найдена — использовать fallback.

### Этап 4. Реализовать SEO metadata

Metadata должны строиться из Page.

Добавить canonical, robots, OG, hreflang, FAQ JSON-LD, BreadcrumbList JSON-LD.

### Этап 5. Реализовать общий template

Сделать общий шаблон для overview-страниц или переиспользуемые компоненты:

```txt
Breadcrumbs
OverviewHero
TaxonomyOverviewList
SeoDescription
FaqBlock
BottomInternalLinks
```

### Этап 6. Доработать `/categories`

Сделать страницу категорий с root categories и children.

### Этап 7. Доработать `/genres`

Сделать страницу жанров с genre groups и children.

### Этап 8. Доработать `/collections`

Сделать страницу коллекций карточками.

### Этап 9. Доработать `/tags`

Сделать страницу тегов карточками.

### Этап 10. Проверить mobile

Проверить страницы на мобильной ширине.

### Этап 11. Проверить sitemap/robots

Проверить, что overview-страницы попадают в sitemap только если indexable.

### Этап 12. Финальная проверка SEO

Проверить:

```txt
<title>
<meta description>
canonical
robots
og:title
og:description
h1
breadcrumbs
FAQ JSON-LD
internal links
```

## 29. Acceptance criteria

```txt
[ ] /{locale}/categories получает SEO-контент из Pages.
[ ] /{locale}/genres получает SEO-контент из Pages.
[ ] /{locale}/collections получает SEO-контент из Pages.
[ ] /{locale}/tags получает SEO-контент из Pages.
[ ] Для всех 4 страниц есть fallback, если Page не найдена.
[ ] H1 берётся из Pages или fallback.
[ ] shortDescription берётся из Pages или fallback.
[ ] description выводится ниже списка таксономий.
[ ] FAQ выводится ниже description.
[ ] FAQ JSON-LD генерируется, если FAQ есть.
[ ] BreadcrumbList JSON-LD генерируется.
[ ] Metadata строятся из Pages.
[ ] Canonical корректный для текущего locale.
[ ] Header active state работает для всех overview-страниц.
[ ] Списки taxonomies фильтруются по type.
[ ] Categories не смешиваются с genres.
[ ] Genres не смешиваются с categories.
[ ] Collections выводятся карточками.
[ ] Tags выводятся карточками.
[ ] Не показываются isVisible=false сущности.
[ ] Не продвигаются пустые/noindex конкретные таксономии.
[ ] Все ссылки являются настоящими <a href>.
[ ] Mobile layout не ломается.
[ ] Overview-страницы добавлены в sitemap при indexable=true.
```

## 30. Важные ограничения

1. Не создавать новую отдельную сущность для этих страниц, если можно использовать `Pages`.
2. Не хардкодить SEO-тексты как основной источник истины.
3. Не выводить длинный SEO description выше списка таксономий.
4. Не смешивать категории, жанры, коллекции и теги.
5. Не делать ссылки через `button`, `div onClick` или JS-only navigation.
6. Не показывать огромные списки из скрытых/noindex/пустых таксономий.
7. Не ломать текущие URL.
8. Не менять структуру URL без отдельного согласования.
