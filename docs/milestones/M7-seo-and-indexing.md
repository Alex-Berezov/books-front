# M7 — SEO и индексация — подробное ТЗ

Цель: реализовать корректные метаданные и индексацию для всех публичных страниц с i18n (en|es|fr|pt): generateMetadata() через backend resolve, hreflang‑кластеры, canonical‑правила, sitemap(ы), robots, базовая микроразметка.

Зависимости: M0–M6 (каркас, публичные страницы, контент, версии/ридер).

## Результат этапа

- На всех публичных маршрутах присутствуют корректные теги: title/description, canonical, hreflang, OpenGraph/Twitter.
- Сформированы sitemap(ы) и robots.txt; поисковики видят правильные URL с языковыми префиксами.
- На страницах книг/страниц и в цепочках навигации присутствует базовая JSON‑LD микроразметка.
- Отсутствует дублирование контента между языками; canonical/alternate настроены по правилам.

---

## Общие принципы

- Источник метаданных: `GET /:lang/seo/resolve` (для страниц под `/:lang`) и `GET /seo/resolve?type=version&id=...` (для `/versions/:id`).
- Canonical правила:
  - Book/Page/Taxonomy: всегда с префиксом `/:lang`.
  - Version: всегда нейтральный `/versions/:id` (без языка).
- Hreflang: для каждой публичной страницы генерировать en|es|fr|pt и x-default с доступностью по реальным переводам.
- Учитывать политику языка: path `:lang` доминирует над `?lang` и Accept-Language.

---

## Задачи и ТЗ

### 1) Интеграция generateMetadata() с backend resolve

ТЗ:

- Для маршрутов под `/:lang/*`: в `generateMetadata()` вызывать `GET /:lang/seo/resolve?type=book|page|...&id=...` и маппить ответ в Next.js Metadata (title, description, robots, openGraph, twitter).
- Для `/versions/:id`: вызывать `GET /seo/resolve?type=version&id=:id` и выставлять canonical на `/versions/:id`.
- Обработка ошибок: при недоступности resolve — строить минимальные метаданные на основе данных страницы (title) и безопасного canonical, не падать.
  Критерии приёмки:
- Метаданные отображаются в HTML; при падении resolve — страницы всё равно отдаются с базовым title.
  Артефакты:
- Утилиты в `src/lib/seo.ts` (см. ниже), правки в `app/[lang]/*/page.tsx` и `app/(neutral)/versions/[id]/page.tsx`.

### 2) Hreflang‑кластер и x‑default

ТЗ:

- Построить набор `<link rel="alternate" hreflang=... href=...>` для всех доступных языков и x-default.
- Источники для определения доступных языков/URL:
  - Для books overview — `availableLanguages` из ответа.
  - Для pages/taxonomy — соответствующие публичные эндпоинты или отдельный эндпоинт переводов (если доступен), либо карта соответствия slug по `groupId`.
- Если перевод отсутствует — не включать hreflang на этот язык.
  Критерии приёмки:
- В исходнике страниц видны корректные alternate ссылки; для отсутствующих переводов — ничего лишнего.
  Артефакты:
- `src/lib/seo.ts`: `buildHreflangLinks(entity, langs)` и хелперы.

### 3) Canonical и стабильные URL

ТЗ:

- Утвердить генерацию canonical по правилам:
  - `/:lang/books/:slug`, `/:lang/pages/:slug`, `/:lang/categories/:slug/books`, `/:lang/tags/:slug/books`.
  - `/versions/:id` — без языка.
- Обработка query‑параметров:
  - Отбрасывать трекинговые (`utm_*`, `ref`) из canonical.
  - Для пагинации можно включать `?page=n` либо использовать `rel=prev|next` без изменения canonical (решить единообразно; по умолчанию — canonical на первую страницу, prev/next для навигации).
    Критерии приёмки:
- canonical корректен на всех страницах; отсутствуют каноникал‑петли и дубли.
  Артефакты:
- `src/lib/seo.ts`: `buildCanonical(url, opts)`; правки generateMetadata.

### 4) Sitemap(ы)

ТЗ:

- Вариант A (FE‑генерация):
  - Реализовать sitemap index: `/sitemap.xml` с ссылками на `/sitemap-en.xml`, `/sitemap-es.xml`, `/sitemap-fr.xml`, `/sitemap-pt.xml`.
  - Для каждого языка: генерировать список URL на основе публичных эндпоинтов: страницы, книги (overview), таксономии; опционально — `/versions/:id` (если необходимо индексировать).
  - Формат: XML с `loc`, `lastmod`, (опц.) `changefreq`, `priority`. Кешировать (ISR, revalidate 3600s).
- Вариант B (бэкенд‑sitemap):
  - Если backend уже отдаёт `/api/sitemap-:lang.xml`, то FE может не генерировать, а только ссылаться на них в robots.
    Критерии приёмки:
- `/sitemap.xml` и пер‑языковые файлы доступны; содержат корректные URL с `/:lang`.
  Артефакты:
- `app/sitemap.ts` (или `app/sitemap.xml/route.ts` для индекса) + `app/sitemap-*.xml/route.ts` при варианте A.

### 5) robots.txt

ТЗ:

- Реализовать `app/robots.ts` (metadata route):
  - Разрешить индексацию публичных разделов; запретить `/admin/` и приватные маршруты (`/api/*` кроме metadata routes).
  - Указать `Sitemap: https://<host>/sitemap.xml`.
    Критерии приёмки:
- `/robots.txt` отдаёт корректный контент; содержит ссылку на sitemap.
  Артефакты:
- `app/robots.ts`.

### 6) Микроразметка (JSON‑LD)

ТЗ:

- Book overview: `Book` + (при наличии) `BreadcrumbList` (цепочка категорий/крошек из SEO resolve, если доступно).
- CMS Pages: `Article` или `WebPage` (для общих страниц — `AboutPage`, `ContactPage` при желании).
- Сайт/Организация: на главной — `WebSite` и `Organization` (минимальные поля).
- Реализация: утилиты сборки JSON‑LD в `src/lib/structured-data.ts`; вставка в `<script type="application/ld+json">` в серверных компонентах.
  Критерии приёмки:
- В HTML присутствуют корректные JSON‑LD блоки; валидируются базовыми инструментами (без ошибок синтаксиса).
  Артефакты:
- `src/lib/structured-data.ts`, вставки в страницы.

### 7) OpenGraph и Twitter Cards

ТЗ:

- На базе ответа resolve: `openGraph.title|description|type|url|image`, `twitter.card|site|creator`.
- Изображения: использовать обложку книги, если доступна; для страниц — дефолтный social image.
  Критерии приёмки:
- OG/Twitter теги есть на всех целевых страницах; валидируются визуально (DevTools/линтеры).
  Артефакты:
- Утилиты маппинга в `src/lib/seo.ts`.

### 8) Заголовки `Content-Language` (опц.)

ТЗ:

- Где контролируем ответ (route handlers/metadata routes), добавить `Content-Language: <lang>` для страниц под `/:lang`.
- Для `/versions/:id` можно опустить или указать язык UI (не обязательно).
  Критерии приёмки:
- Заголовки присутствуют на metadata routes; на обычных страницах — опционально.
  Артефакты:
- Правки в соответствующих маршрутах/утилитах.

### 9) Производительность и кеш

ТЗ:

- Избегать лишних запросов к `/seo/resolve`: объединять с основным запросом страницы, если данные уже содержат SEO.
- Настроить кэширование: `revalidate` для `seo/resolve` (например, 600s) и для sitemap (3600s).
- Hreflang‑сборка — быстрая; при отсутствии данных не вызывать лишний бекенд.
  Критерии приёмки:
- Метаданные строятся быстро; страницы не делают дублирующих запросов.
  Артефакты:
- Опции fetch/ISR и хелперы в `src/lib/seo.ts`.

### 10) Тестирование

ТЗ:

- E2E: проверить наличие title/description/canonical/hreflang на страницах `pages`, `books overview`, `categories/tags`, `/versions/:id`.
- Юнит: функции `seo.ts` (canonical нормализация, hreflang сборка, фильтр utm), `structured-data.ts` (валидный JSON‑LD), `robots/sitemap` рендеры.
- Ручные: открыть `/sitemap.xml`, `/sitemap-en.xml`, `/robots.txt` — визуально проверить.
  Критерии приёмки:
- Ключевые проверки проходят; теги и файлы доступны и корректны.

---

## Схема директорий (релевантное для M7)

```
app/
  sitemap.ts                 # или sitemap.xml/route.ts (индекс)
  sitemap-en.xml/route.ts    # опц. пер‑языковые (если вариант A)
  sitemap-es.xml/route.ts
  sitemap-fr.xml/route.ts
  sitemap-pt.xml/route.ts
  robots.ts

src/lib/
  seo.ts                     # маппинг resolve → Metadata, canonical, hreflang
  structured-data.ts         # генерация JSON‑LD
```

## Каркасы (скелеты)

### `src/lib/seo.ts`

```ts
import type { ResolvedSeo } from '@/src/api/types' // адаптировать к реальным типам

export function buildCanonical(
  baseUrl: string,
  path: string,
  opts?: { stripParams?: string[] }
) {
  try {
    const url = new URL(path, baseUrl)
    const strip = new Set(
      opts?.stripParams ?? [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        'utm_term',
        'utm_content',
        'ref',
      ]
    )
    for (const key of [...url.searchParams.keys()]) {
      if (strip.has(key)) url.searchParams.delete(key)
    }
    return url.toString()
  } catch {
    return path
  }
}

export function buildHreflangLinks(
  baseUrl: string,
  entries: Array<{ lang: string; path: string }>,
  includeXDefault = true
) {
  const links = entries.map((e) => ({
    hreflang: e.lang,
    href: new URL(e.path, baseUrl).toString(),
  }))
  if (includeXDefault && entries.length)
    links.push({ hreflang: 'x-default', href: links[0].href })
  return links
}

export function mapResolveToMetadata(r: any) {
  const meta: any = {}
  if (r?.meta?.title) meta.title = r.meta.title
  if (r?.meta?.description) meta.description = r.meta.description
  if (r?.meta?.robots) meta.robots = r.meta.robots
  if (r?.openGraph) meta.openGraph = r.openGraph
  if (r?.twitter) meta.twitter = r.twitter
  return meta
}
```

### `app/robots.ts` (пример)

```ts
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/admin/', '/api/'] }],
    sitemap: `${base}/sitemap.xml`,
  }
}
```

### `app/sitemap.ts` (пример индекса)

```ts
import type { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com'
  const langs = ['en', 'es', 'fr', 'pt']
  const now = new Date().toISOString()
  return langs.map((l) => ({
    url: `${base}/sitemap-${l}.xml`,
    lastModified: now,
  }))
}
```

---

## Риски и примечания

- Неполные переводы: не включать несуществующие языки в hreflang; canonical не должен указывать на другой язык.
- Дубликаты: следить за нормализацией query‑параметров; не плодить альтернативы с идентичным контентом.
- Производительность: не вызывать `/seo/resolve` дважды; при возможности — использовать данные страницы (overview.seo).
- Согласование формата sitemap: если backend уже генерирует — использовать его, чтобы не дублировать логику.

## Чек‑лист готовности M7

- [ ] generateMetadata() подключён на всех публичных страницах
- [ ] canonical и hreflang соответствуют правилам
- [ ] OpenGraph/Twitter теги присутствуют
- [ ] JSON‑LD добавлен на overview/страницы (минимум Book/BreadcrumbList)
- [ ] Доступны `/robots.txt` и `/sitemap.xml` (+ пер‑языковые при варианте A)
- [ ] Нет дублирующихся каноникал‑страниц; 404/редиректы корректны
- [ ] E2E/юнит‑проверки seo/structured data проходят
