import { NextResponse } from 'next/server';
import { getCategories } from '@/api/endpoints/admin/categories';
import { getTags } from '@/api/endpoints/admin/tags';
import {
  getPublicBooks,
  getBookCards,
  getPublicAuthors,
  getAuthorLetters,
} from '@/api/endpoints/public';
import { authorsBasePath } from '@/components/public/authors/authors-href';
import {
  availabilityFor,
  buildLetterAlternates,
  loadLettersByLang,
} from '@/components/public/authors/authors-letter-alternates';
import { API_MAX_PAGE_SIZE } from '@/lib/http.constants';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { isAuthorLinkable } from '@/lib/seo/author-linkable';
import { buildIndexableAlternates, toAlternateCandidates } from '@/lib/seo/hreflang-alternates';
import { isTaxonomyLinkable } from '@/lib/seo/taxonomy-linkable';
import {
  getBaseUrl,
  buildUrlSetXml,
  fetchAllPages,
  fetchPageWindow,
  BOOKS_SITEMAP_PAGE_SIZE,
  sitemapUnavailable,
  type SitemapItem,
} from '@/lib/sitemap/utils';
import { toCountResult, type CountResult } from '@/lib/utils/seo-indexing';
import type {
  AuthorLetter,
  BookOverview,
  Category,
  CategoryTranslation,
  Tag,
  TagTranslation,
  VersionPreview,
  AuthorListItem,
} from '@/types/api-schema';

export const dynamic = 'force-dynamic';

/**
 * The sitemap must never be built from stale taxonomy state.
 *
 * `dynamic = 'force-dynamic'` only guarantees the handler re-runs per request —
 * the upstream `fetch` calls still land in the Next data cache, because the API
 * sends no `Cache-Control` header of its own. On 05.08.2026 that combination
 * kept the sitemap advertising 2205 taxonomy URLs for hours after the backend
 * had already recomputed `autoIndexable` to `false` for all of them: the handler
 * ran fresh (`lastmod` was current) while its data was hours old.
 */
export const fetchCache = 'force-no-store';

/**
 * Потолок обхода списка авторов, страницами по сто.
 *
 * 🔴 Назван явно, а не оставлен на умолчании `fetchAllPages` (50 страниц).
 * Ручка списка теперь жёстко режет `limit` сотней, то есть обойти потолок
 * большим размером страницы больше нельзя: перерастёт каталог пять тысяч
 * авторов — и ветка начнёт бросать «страниц 51, потолок обхода 50», а карта
 * авторов уйдёт в 503 не разово, а навсегда. Число здесь на виду, чтобы рост
 * каталога упирался в осознанную правку, а не в тихий отказ.
 */
const AUTHORS_TRAVERSAL_MAX_PAGES = 200;

/**
 * Потолок обхода списка тегов, страницами по сто.
 *
 * Назван по той же причине, что и потолок авторов, но появился иначе: раньше
 * теги ходили страницами по двести, и при умолчании `fetchAllPages` в пятьдесят
 * страниц ветка выдерживала десять тысяч терминов. Размер страницы упал до ста
 * (`LEGACY-217`: `PaginationDto` теперь режет `limit` сотней, а публичный
 * `GET /tags` ходит через него), и на умолчании тот же каталог упёрся бы
 * в потолок вдвое раньше - на пяти тысячах. Сотня страниц возвращает прежние
 * десять тысяч.
 */
const TAGS_TRAVERSAL_MAX_PAGES = 100;

/**
 * Потолок обхода секций genres/categories/collections, страницами по сто.
 *
 * Та же арифметика, что у тегов выше: размер страницы `GET /categories` упал
 * с двухсот до ста (`LEGACY-298`/`LEGACY-353`), и на умолчании `fetchAllPages`
 * в пятьдесят страниц запас обхода тихо упал бы вдвое — с десяти тысяч
 * терминов на тип до пяти. Явный потолок возвращает прежний запас.
 */
const TAXONOMY_TRAVERSAL_MAX_PAGES = 100;

export async function GET(request: Request, { params }: { params: { filename: string } }) {
  const { filename } = params;
  const cleanBaseUrl = getBaseUrl();
  const defaultLang = 'en';

  const sitemapItems: SitemapItem[] = [];

  /**
   * Причины, по которым секция не смогла собрать свои ссылки (`LEGACY-082`).
   *
   * 🔴 Пустой результат значит две **несовместимые** вещи, и раньше обе давали
   * 404. «Такого файла нет» — честный 404. «Файл есть, но API не ответил» —
   * 503: краулер читает 404 как исчезновение карты и снимает с индекса все
   * адреса внутри неё разом, а 503 читает как «зайди позже».
   *
   * Сюда же попадает **усечение** (`LEGACY-098`): если API отдал меньше строк,
   * чем обещает `meta.total`, короткий `<urlset>` с кодом 200 — тихая потеря
   * URL, которую не заметит никто. Такой ответ обязан быть громким отказом.
   */
  const upstreamFailures: string[] = [];

  const noteFailure = (section: string, error: unknown) => {
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`Sitemap section "${section}" failed: ${reason}`);
    upstreamFailures.push(`${section}: ${reason}`);
  };

  const getAlternates = (languages: readonly string[], pathBuilder: (lang: string) => string) => {
    const alternates: Record<string, string> = {};
    languages.forEach((lang) => {
      alternates[lang] = pathBuilder(lang);
    });
    alternates['x-default'] = pathBuilder(defaultLang);
    return alternates;
  };

  // 1. Static Sitemap
  if (filename === 'sitemap-static.xml') {
    // A landing is dropped from the sitemap only when it is *known* to be empty.
    // `.catch(() => null)` collapsed into `?? 0` used to silently un-list all
    // three landings in every language whenever the API blinked during a crawl.
    const landingCounts = new Map<
      string,
      { audiobooks: CountResult; popular: CountResult; new: CountResult }
    >();
    await Promise.all(
      SUPPORTED_LANGS.map(async (lang) => {
        const count = async (params: Parameters<typeof getBookCards>[3]) => {
          try {
            const res = await getBookCards(lang as SupportedLang, 1, 1, params);
            return toCountResult(res?.pagination?.total ?? null);
          } catch (error) {
            console.error(`Error counting landing books for sitemap (${lang}):`, error);
            return toCountResult(null);
          }
        };
        const [audiobooks, popular, newest] = await Promise.all([
          count({ type: 'audio' }),
          count({ sort: 'popular' }),
          count({ sort: 'new' }),
        ]);
        landingCounts.set(lang, { audiobooks, popular, new: newest });
      })
    );

    /** Unknown counts as "keep": dropping a live URL costs more than listing an empty one. */
    const hasLanding = (lang: string, key: 'audiobooks' | 'popular' | 'new'): boolean => {
      const count = landingCounts.get(lang)?.[key];
      if (!count || !count.ok) return true;
      return count.total > 0;
    };

    const staticRoutes: { path: string; include: (lang: string) => boolean }[] = [
      { path: '', include: () => true },
      { path: '/categories', include: () => true },
      { path: '/genres', include: () => true },
      { path: '/collections', include: () => true },
      { path: '/tags', include: () => true },
      // Хаб авторов. Без условия по счётчику: авторы у сайта есть всегда, а
      // страницы отдельных букв живут в своей карте (`sitemap-author-letters-*`),
      // где каждая проверяется на непустоту.
      { path: '/authors', include: () => true },
      { path: '/catalog', include: () => true },
      { path: '/audiobooks', include: (lang) => hasLanding(lang, 'audiobooks') },
      { path: '/popular-books', include: (lang) => hasLanding(lang, 'popular') },
      { path: '/new-releases', include: (lang) => hasLanding(lang, 'new') },
      { path: '/privacy', include: () => true },
      { path: '/terms', include: () => true },
      { path: '/deletion', include: () => true },
    ];
    staticRoutes.forEach(({ path: route, include }) => {
      SUPPORTED_LANGS.forEach((lang) => {
        if (!include(lang)) return;

        const url = `${cleanBaseUrl}/${lang}${route}`;
        const alternates = getAlternates(SUPPORTED_LANGS, (l) => `${cleanBaseUrl}/${l}${route}`);

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: route === '' ? 'daily' : 'weekly',
          priority: route === '' ? 1.0 : 0.8,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    });
  }
  // 2. Books Sitemap: sitemap-books-[lang]-[n].xml (paginated)
  else if (/^sitemap-books-[a-z]{2}-[0-9]+\.xml$/.test(filename)) {
    const match = filename.match(/^sitemap-books-([a-z]{2})-([0-9]+)\.xml$/);
    if (!match) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }
    const lang = match[1];
    const pageNumber = parseInt(match[2], 10);
    if (!(SUPPORTED_LANGS as readonly string[]).includes(lang) || pageNumber < 1) {
      return new NextResponse('Sitemap not found', { status: 404 });
    }
    let books: BookOverview[] = [];
    try {
      // `GET /:lang/books` зажат `API_MAX_PAGE_SIZE` (`LEGACY-298`), а файл карты
      // по-прежнему обязан покрывать `BOOKS_SITEMAP_PAGE_SIZE` книг — окно из
      // нескольких бэкенд-страниц вместо одного `limit: 1000`. Отказ или
      // усечение любой из них бросает исключение и оставляет `books` пустым:
      // `fetchPageWindow` не присваивает результат до полного успеха окна.
      //
      // ⚠️ Деление ничем не защищено само по себе — если потолок бэкенда сдвинут
      // на число, не делящее `BOOKS_SITEMAP_PAGE_SIZE` нацело, окна файлов начнут
      // перекрываться, а номер страницы уйдёт дробным и получит 400 от бэкенда.
      // Явная проверка превращает это в громкий отказ секции, а не в тихий сдвиг
      // границ (найдено ревью).
      const pagesPerFile = BOOKS_SITEMAP_PAGE_SIZE / API_MAX_PAGE_SIZE;
      if (!Number.isInteger(pagesPerFile)) {
        throw new Error(
          `BOOKS_SITEMAP_PAGE_SIZE (${BOOKS_SITEMAP_PAGE_SIZE}) не делится нацело на API_MAX_PAGE_SIZE (${API_MAX_PAGE_SIZE})`
        );
      }
      books = await fetchPageWindow<BookOverview>(
        (page) => getPublicBooks(lang as SupportedLang, { page, limit: API_MAX_PAGE_SIZE }),
        (pageNumber - 1) * pagesPerFile + 1,
        pagesPerFile,
        API_MAX_PAGE_SIZE,
        `books ${lang} file${pageNumber}`
      );
    } catch (error) {
      noteFailure(`books ${lang} file${pageNumber}`, error);
    }
    if (books.length === 0) {
      // Пустая страница книг законна: номер за пределами каталога — это 404.
      // Но если секция упала или пришла усечённой, ответ обязан быть 503.
      if (upstreamFailures.length > 0) return sitemapUnavailable(upstreamFailures);
      return new NextResponse('Sitemap not found', { status: 404 });
    }

    books.forEach((book) => {
      const currentVersion = book.versions?.find(
        (v: VersionPreview) => v.language === lang && v.status === 'published' && v.slug
      );
      if (!currentVersion?.slug) return;

      const alternates: Record<string, string> = {};
      const publishedVersions =
        book.versions?.filter((v: VersionPreview) => v.status === 'published' && v.slug) || [];

      publishedVersions.forEach((v: VersionPreview) => {
        if (v.language && v.slug) {
          alternates[v.language] = `${cleanBaseUrl}/${v.language}/book/${v.slug}`;
        }
      });

      const enVersion = publishedVersions.find((v: VersionPreview) => v.language === 'en');
      const fallbackVersion = publishedVersions[0];
      const defaultVersion = enVersion || fallbackVersion;
      if (defaultVersion) {
        alternates['x-default'] =
          `${cleanBaseUrl}/${defaultVersion.language}/book/${defaultVersion.slug ?? ''}`;
      }

      const url = `${cleanBaseUrl}/${lang}/book/${currentVersion.slug}`;

      sitemapItems.push({
        url,
        lastModified: new Date(book.updatedAt || new Date()),
        changeFrequency: 'daily',
        priority: 0.9,
        alternates: {
          languages: alternates,
        },
      });
    });
  }
  // 3. Genres Sitemap: sitemap-genres-[lang].xml
  else if (filename.startsWith('sitemap-genres-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-genres-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        // Обход всех страниц, а не первая тысяча: `limit: 1000` без добора
        // молча терял всё, что за неё не поместилось (`LEGACY-098`).
        categories = await fetchAllPages(
          (page) => getCategories({ type: 'genre', page, limit: API_MAX_PAGE_SIZE, lang }),
          `genres ${lang}`,
          TAXONOMY_TRAVERSAL_MAX_PAGES
        );
      } catch (error) {
        noteFailure(`genres ${lang}`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/genre/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? [], isTaxonomyLinkable),
          (language, slug) => `${cleanBaseUrl}/${language}/genre/${slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }
  // 3a. Categories Sitemap: sitemap-categories-[lang].xml
  else if (filename.startsWith('sitemap-categories-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-categories-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        // Обход всех страниц, а не первая тысяча: `limit: 1000` без добора
        // молча терял всё, что за неё не поместилось (`LEGACY-098`).
        categories = await fetchAllPages(
          (page) => getCategories({ type: 'category', page, limit: API_MAX_PAGE_SIZE, lang }),
          `categories ${lang}`,
          TAXONOMY_TRAVERSAL_MAX_PAGES
        );
      } catch (error) {
        noteFailure(`categories ${lang}`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/category/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? [], isTaxonomyLinkable),
          (language, slug) => `${cleanBaseUrl}/${language}/category/${slug}`
        );

        sitemapItems.push({
          url,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }
  // 3b. Collections Sitemap: sitemap-collections-[lang].xml
  else if (filename.startsWith('sitemap-collections-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-collections-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let categories: Category[] = [];
      try {
        // Обход всех страниц, а не первая тысяча: `limit: 1000` без добора
        // молча терял всё, что за неё не поместилось (`LEGACY-098`).
        categories = await fetchAllPages(
          (page) => getCategories({ type: 'collection', page, limit: API_MAX_PAGE_SIZE, lang }),
          `collections ${lang}`,
          TAXONOMY_TRAVERSAL_MAX_PAGES
        );
      } catch (error) {
        noteFailure(`collections ${lang}`, error);
      }

      categories.forEach((cat) => {
        const currentTranslation = cat.translations?.find(
          (t: CategoryTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(cat)) return;

        const url = `${cleanBaseUrl}/${lang}/collection/${currentTranslation.slug}`;

        // 🔴 Альтернативы строятся только из индексируемых языков (LEGACY-057).
        // Раньше сюда шли все переводы подряд: URL фильтровался по линкуемости в
        // языке файла, а список hreflang — нет, и термин, закрытый на `ru`,
        // объявлялся альтернативой открытого `en`.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(cat, cat.translations ?? [], isTaxonomyLinkable),
          (language, slug) => `${cleanBaseUrl}/${language}/collection/${slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.7,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }
  // 4. Authors Sitemap: sitemap-authors-[lang].xml
  else if (/^sitemap-authors-[a-z]{2}\.xml$/.test(filename)) {
    const lang = filename.replace(/^sitemap-authors-/, '').replace(/\.xml$/, '');
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      const allAuthors: AuthorListItem[] = [];
      try {
        // Paginate through all authors using the public endpoint
        // ⚠️ Здесь стоял `.catch(() => null)` на каждой странице добора:
        // не пришедшая страница молча выпадала из карты вместе со всеми своими
        // авторами. Теперь обход общий — с одной повторной попыткой на
        // страницу и громким отказом, если и она не удалась.
        allAuthors.push(
          ...(await fetchAllPages(
            (page) => getPublicAuthors(lang as SupportedLang, { page, limit: 100 }),
            `authors ${lang}`,
            AUTHORS_TRAVERSAL_MAX_PAGES
          ))
        );
      } catch (error) {
        noteFailure(`authors ${lang}`, error);
      }

      /**
       * 🔴 Для hreflang нужна линкуемость **каждого** языка, а список авторов
       * отдаёт `booksCount` только для запрошенного (LEGACY-057). Поэтому здесь
       * снимается состав остальных языков: автор линкуем в языке ровно тогда,
       * когда попадает в его список — тот уже отфильтрован и по наличию
       * перевода, и по числу книг.
       *
       * ⚠️ Цена: по одному запросу на язык вместо одного на файл. При нынешних
       * десяти авторах это ничто, но при росте каталога ветку придётся переводить
       * на счётчики по языкам в самом ответе — сегодня их в нём нет.
       *
       * Отказ запроса трактуется как «язык неизвестен», а не «закрыт»: молча
       * выкинуть живую альтернативу дороже, чем оставить лишнюю.
       */
      const linkableByLang = new Map<string, Set<string>>();
      await Promise.all(
        SUPPORTED_LANGS.map(async (other) => {
          if (other === lang) return;
          try {
            // Листаем, а не просим тысячу одним запросом. Список авторов теперь
            // ограничен сотней на страницу, и `limit: 1000` вернул бы 400 —
            // альтернативы при этом сохранились бы (отказ ниже читается как
            // «язык неизвестен»), но собирались бы они с этого дня никогда.
            // Сотня — тот же размер страницы, которым ходит обход выше.
            const authors = await fetchAllPages(
              (page) => getPublicAuthors(other as SupportedLang, { page, limit: 100 }),
              `authors hreflang ${other}`,
              AUTHORS_TRAVERSAL_MAX_PAGES
            );
            linkableByLang.set(other, new Set(authors.filter(isAuthorLinkable).map((a) => a.id)));
          } catch (error) {
            console.error(`Error fetching authors for hreflang (${other}):`, error);
          }
        })
      );

      allAuthors.forEach((author) => {
        // The URL must use this language's own slug, not the root one. Listing the
        // root slug put /ru/author/sun-tzu in the Russian sitemap while the page
        // actually lives at /ru/author/sun-czy — and the API answers 404 for the
        // former, so the entry was only "working" thanks to the soft-404 fallback
        // this commit removes. An author without a slug in this language has no
        // address here and is skipped.
        const slugByLang = new Map<string, string>();
        (author.translations ?? []).forEach((t) => {
          if (t.slug && (SUPPORTED_LANGS as readonly string[]).includes(t.language)) {
            slugByLang.set(t.language, t.slug);
          }
        });

        const slug = slugByLang.get(lang);
        if (!slug) return;

        // 🔴 Автор без опубликованных книг в карту сайта не идёт: страница у него
        // тонкая, а `seo-rules.md` требует, чтобы ссылка, sitemap и meta robots
        // решали про один объект одинаково. До 09.08.2026 авторы были вне этого
        // контура целиком — фильтровалось только наличие слага.
        //
        // ⚠️ Опирается на `booksCount`, который до 09.08.2026 был нулём у всех
        // из-за подсчёта по пустому FK. Эта строка **обязана** ехать на прод
        // после бэкенда, иначе она обнулит все файлы `sitemap-authors-*`.
        if (!isAuthorLinkable(author)) return;

        const url = `${cleanBaseUrl}/${lang}/author/${slug}`;
        const alternates = buildIndexableAlternates(
          [...slugByLang.entries()].map(([language, langSlug]) => ({
            language,
            slug: langSlug,
            // Язык файла уже прошёл `isAuthorLinkable` выше. Для остальных —
            // членство в их списке; отсутствие данных (отказ запроса) не
            // считается закрытием.
            linkable:
              language === lang ||
              !linkableByLang.has(language) ||
              (linkableByLang.get(language)?.has(author.id) ?? false),
          })),
          (language, langSlug) => `${cleanBaseUrl}/${language}/author/${langSlug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }
  // 4a. Author letter pages: sitemap-author-letters-[lang].xml
  else if (/^sitemap-author-letters-[a-z]{2}\.xml$/.test(filename)) {
    const lang = filename.replace(/^sitemap-author-letters-/, '').replace(/\.xml$/, '');
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      /**
       * Буквы своего языка — источник строк файла. Его отказ обязан стать 503:
       * выдать пустую карту значило бы объявить, что страниц букв не существует.
       */
      let own: AuthorLetter[];
      try {
        own = await getAuthorLetters(lang as SupportedLang);
      } catch (error) {
        noteFailure(`author letters ${lang}`, error);
        return sitemapUnavailable(upstreamFailures);
      }

      /**
       * Доступность каждой буквы в остальных языках — для `<xhtml:link>`.
       *
       * ⚠️ Отказ по **чужому** языку 503 не даёт: свой язык получен полностью,
       * и ронять из-за соседа готовый файл — обмен целого на часть. Раньше он
       * шёл через `noteFailure`, а общая проверка в конце обработчика роняла
       * весь ответ независимо от ветки.
       *
       * ⚠️ Пять запросов на весь файл, а не пять на каждую букву: указатели
       * всех языков берутся одним проходом и переиспользуются. Кэшировать их
       * здесь нельзя — у маршрута объявлен `fetchCache = 'force-no-store'`,
       * и ровно поэтому: карта, собранная из устаревшего состояния, однажды
       * часами рекламировала снятые с индексации адреса.
       */
      const lettersByLang = await loadLettersByLang();

      own.forEach(({ letter, count }) => {
        if (count <= 0) return;

        const alternates = buildLetterAlternates(
          letter,
          lang as SupportedLang,
          availabilityFor(letter, lettersByLang),
          cleanBaseUrl
        );

        sitemapItems.push({
          url: `${cleanBaseUrl}${authorsBasePath(lang as SupportedLang, letter)}`,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.5,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }
  // 5. Tags Sitemap: sitemap-tags-[lang].xml
  else if (filename.startsWith('sitemap-tags-') && filename.endsWith('.xml')) {
    const lang = filename.substring('sitemap-tags-'.length, filename.length - '.xml'.length);
    if ((SUPPORTED_LANGS as readonly string[]).includes(lang)) {
      let tags: Tag[] = [];
      try {
        tags = await fetchAllPages(
          (page) => getTags({ page, limit: 100, lang }),
          `tags ${lang}`,
          TAGS_TRAVERSAL_MAX_PAGES
        );
      } catch (error) {
        noteFailure(`tags ${lang}`, error);
      }

      tags.forEach((tag) => {
        const currentTranslation = tag.translations?.find(
          (t: TagTranslation) => t.language === lang && t.slug
        );
        if (!currentTranslation?.slug) return;
        if (!isTaxonomyLinkable(tag)) return;

        const url = `${cleanBaseUrl}/${lang}/tag/${currentTranslation.slug}`;

        // Альтернативы — только из индексируемых языков (LEGACY-057), тем же
        // правилом, что у категорий, жанров и коллекций.
        const alternates = buildIndexableAlternates(
          toAlternateCandidates(tag, tag.translations ?? [], isTaxonomyLinkable),
          (language, slug) => `${cleanBaseUrl}/${language}/tag/${slug}`
        );

        sitemapItems.push({
          url,
          lastModified: new Date(),
          changeFrequency: 'weekly',
          priority: 0.6,
          ...(alternates ? { alternates: { languages: alternates } } : {}),
        });
      });
    }
  }

  // Отказ или неполнота — 503 (`LEGACY-082`).
  if (sitemapItems.length === 0 && upstreamFailures.length > 0) {
    return sitemapUnavailable(upstreamFailures);
  }

  // 🔴 Пустая секция при живом API — **не** повод для 404. Индекс карты
  // перечисляет языковые файлы безусловно, поэтому 404 здесь означал бы битую
  // запись в самом индексе. Язык без единого тега — законное состояние, и
  // честный ответ на него — валидный пустой `<urlset>`, а не «файла нет».
  // 404 остаётся за именем файла, которого не существует (проверки выше).

  // Непустой набор при частичном отказе — самое опасное: карта выглядит
  // рабочей и при этом неполна. Отдать её значит попросить краулер забыть
  // недостающие адреса.
  if (upstreamFailures.length > 0) return sitemapUnavailable(upstreamFailures);

  const xml = buildUrlSetXml(sitemapItems);

  return new NextResponse(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  });
}
