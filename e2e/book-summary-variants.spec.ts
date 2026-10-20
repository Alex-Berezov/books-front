import { test, expect, type Page } from '@playwright/test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { formatLongDateUtc } from '@/lib/utils/date';

/**
 * Приёмка вариантов пересказа в настоящем браузере (`F04-4`, `product.md` §9). Идёт против бэкенда
 * с засеянной базой: книги приёмки заводит `books/prisma/seed-summaries.ts` - служебные, с главами
 * 1-3 и текстом у каждого раздела свой (решение арбитра `F04 | F04-4`, Q3).
 *
 * - `summary-acceptance-full` - полный, очень краткий и разделы на пяти языках (en 3, es 2, fr 3,
 *   pt 2, ru 4); у английского третий раздел ведёт на несуществующую главу 99;
 * - `summary-acceptance-only-full` - только полный пересказ;
 * - `summary-acceptance-brief-only` - полный и очень краткий, без разделов;
 * - `summary-acceptance-sections-only` - полный и два раздела, без очень краткого;
 * - `summary-acceptance-no-full` - два раздела без полного пересказа;
 * - `summary-acceptance-noindex` - как полная, но книга закрыта редактором от индекса;
 * - `summary-acceptance-no-chapters` - версия без текста книги, разделы указывают на главу 1;
 * - `summary-acceptance-draft` - версия-черновик.
 *
 * ⚠️ Слаги, тексты и даты живут в сиде бэкенда и в пробе `ci.yml` («The seeded data actually
 * arrived»). Переименуешь там - поправь здесь. Претензии правообладателя в e2e не идут (решение
 * арбитра `F04 | F04-4`, Q1): 451 разделов недостижим в браузере против бэкенда CI
 * (`X-Visitor-Country` бэкенд CI не принимает), его держат `books/test/book-summary-sections.e2e-spec.ts`
 * и `__tests__/middleware.test.ts`. Админка - тоже не здесь (там же, Q2). Дата «Обновлено» после
 * правки очень краткого: сам сдвиг `updatedAt` держит `books/test/book-summary.e2e-spec.ts`, а здесь
 * даты сеяны в прошлом, и страница обязана показать именно их (`dateModified`, `lastmod`).
 */

const SLUG = {
  full: 'summary-acceptance-full',
  onlyFull: 'summary-acceptance-only-full',
  briefOnly: 'summary-acceptance-brief-only',
  sectionsOnly: 'summary-acceptance-sections-only',
  sectionsOnlyEs: 'summary-acceptance-sections-only-es',
  noFull: 'summary-acceptance-no-full',
  noindex: 'summary-acceptance-noindex',
  noChapters: 'summary-acceptance-no-chapters',
  draft: 'summary-acceptance-draft',
} as const;

/** Даты сида (`seed-summaries.ts`): пересказ, текст второго раздела и смена его номера. */
const SUMMARY_DATE = '2026-03-10T09:30:00.000Z';
const SECTION_DATE = '2026-01-06T08:00:00.000Z';
const SECTION_MOVED_DATE = '2026-02-20T08:00:00.000Z';

/** Служебные строки сида (`seed-summaries.ts`, `WORDS`). */
const BOOK: Record<SupportedLang, { title: string; service: string; brief: string; part: string }> =
  {
    en: {
      title: 'Summary acceptance book',
      service: 'Service text of the acceptance summary.',
      brief: 'Very brief service text of the acceptance summary.',
      part: 'Part',
    },
    es: {
      title: 'Libro de aceptación del resumen',
      service: 'Texto de servicio del resumen de aceptación.',
      brief: 'Texto de servicio muy breve del resumen de aceptación.',
      part: 'Parte',
    },
    fr: {
      title: 'Livre de recette du résumé',
      service: 'Texte de service du résumé de recette.',
      brief: 'Texte de service très bref du résumé de recette.',
      part: 'Partie',
    },
    pt: {
      title: 'Livro de aceitação do resumo',
      service: 'Texto de serviço do resumo de aceitação.',
      brief: 'Texto de serviço muito breve do resumo de aceitação.',
      part: 'Parte',
    },
    ru: {
      title: 'Книга приёмки пересказа',
      service: 'Служебный текст пересказа приёмки.',
      brief: 'Очень краткий служебный текст пересказа приёмки.',
      part: 'Часть',
    },
  };

/** Подписи `product.md` §5а; в e2e они копией: словарь сервера (`summaryStrings`) - `server-only`. */
const STRINGS: Record<
  SupportedLang,
  {
    brief: string;
    full: string;
    sections: string;
    readChapter: string;
    spoiler: string;
    heading: (book: string, section: string) => string;
  }
> = {
  en: {
    brief: 'In brief',
    full: 'Full summary',
    sections: 'Chapter-by-chapter summary',
    readChapter: 'Read this chapter',
    spoiler: 'Spoiler warning: this summary covers the whole plot of this section.',
    heading: (book, section) => `${book}: ${section} — Summary`,
  },
  es: {
    brief: 'En pocas palabras',
    full: 'Resumen completo',
    sections: 'Resumen por capítulos',
    readChapter: 'Leer este capítulo',
    spoiler: 'Aviso de spoilers: este resumen cuenta toda la trama de esta sección.',
    heading: (book, section) => `${book}: ${section} — resumen`,
  },
  fr: {
    brief: 'En bref',
    full: 'Résumé complet',
    sections: 'Résumé chapitre par chapitre',
    readChapter: 'Lire ce chapitre',
    spoiler: "Attention, spoilers : ce résumé raconte toute l'intrigue de cette section.",
    heading: (book, section) => `${book} : ${section} — résumé`,
  },
  pt: {
    brief: 'Em poucas palavras',
    full: 'Resumo completo',
    sections: 'Resumo por capítulos',
    readChapter: 'Ler este capítulo',
    spoiler: 'Aviso de spoilers: este resumo conta toda a trama desta seção.',
    heading: (book, section) => `${book}: ${section} — resumo`,
  },
  ru: {
    brief: 'Очень кратко',
    full: 'Полный пересказ',
    sections: 'Краткое содержание по главам',
    readChapter: 'Читать эту главу',
    spoiler: 'Осторожно, спойлеры: пересказ раздела передаёт его сюжет целиком.',
    heading: (book, section) => `${book}: ${section} — краткое содержание`,
  },
};

/**
 * Главы читалки, на которые указывают разделы полной книги по языкам (`null` - глава не указана).
 * Главы версии - 1-3, поэтому 99 ведёт в никуда и ссылки на странице нет.
 */
const READER_CHAPTERS: Record<SupportedLang, ReadonlyArray<number | null>> = {
  en: [1, 2, 99],
  es: [2, null],
  fr: [1, null, 3],
  pt: [null, null],
  ru: [1, 2, 3, null],
};
const EXISTING_CHAPTERS = [1, 2, 3];

const bookUrl = (lang: string, slug: string) => `/${lang}/book/${slug}`;
const summaryUrl = (lang: string, slug: string) => `${bookUrl(lang, slug)}/summary`;
const sectionUrl = (lang: string, slug: string, n: number | string) =>
  `${summaryUrl(lang, slug)}/${n}`;

const sectionTitle = (lang: SupportedLang, n: number) => `${BOOK[lang].part} ${n}`;
const sectionPlain = (lang: SupportedLang, n: number) =>
  `${BOOK[lang].service} ${sectionTitle(lang, n)}.`;
const heading = (lang: SupportedLang, n: number) =>
  STRINGS[lang].heading(BOOK[lang].title, sectionTitle(lang, n));

/**
 * Версии книг приёмки и счётчики обзора книги в сиде: пересказ (1 - есть, 0 - нет) и число
 * публикуемых разделов (разделы без полного пересказа не публикуются, `product.md` §3). Тот же
 * набор четвёрок проверяет проба `ci.yml` («The seeded data actually arrived»), совпадение
 * держит `__tests__/ci-e2e-upstream.test.ts`: правишь здесь - правь там.
 */
const OPENED: ReadonlyArray<readonly [SupportedLang, string, 0 | 1, number]> = [
  ['en', SLUG.full, 1, 3],
  ['es', SLUG.full, 1, 2],
  ['fr', SLUG.full, 1, 3],
  ['pt', SLUG.full, 1, 2],
  ['ru', SLUG.full, 1, 4],
  ['en', SLUG.onlyFull, 1, 0],
  ['en', SLUG.briefOnly, 1, 0],
  ['en', SLUG.sectionsOnly, 1, 2],
  ['es', SLUG.sectionsOnlyEs, 1, 1],
  ['ru', SLUG.sectionsOnly, 0, 0],
  ['en', SLUG.noFull, 0, 0],
  ['en', SLUG.noindex, 1, 2],
  ['en', SLUG.noChapters, 1, 2],
];

/** Очень краткий у английской версии: 1 - блок есть. Те же пары проверяет проба `ci.yml`. */
const BRIEF: ReadonlyArray<readonly [string, 0 | 1]> = [
  [SLUG.full, 1],
  [SLUG.onlyFull, 0],
  [SLUG.briefOnly, 1],
  [SLUG.sectionsOnly, 0],
  [SLUG.noindex, 1],
  [SLUG.noChapters, 0],
];

/**
 * «Читать эту главу»: есть ли у раздела английской версии глава читалки, на которую он указывает
 * (`readerChapterExists`). Те же тройки проверяет проба `ci.yml`.
 */
const READER: ReadonlyArray<readonly [string, number, boolean]> = [
  [SLUG.full, 1, true],
  [SLUG.full, 3, false],
  [SLUG.noChapters, 1, false],
];

type JsonLdNode = Record<string, unknown>;

/** Все узлы `application/ld+json` страницы, `@graph` развёрнут. */
const jsonLd = async (page: Page): Promise<JsonLdNode[]> => {
  const texts = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((nodes) => nodes.map((node) => node.textContent ?? ''));
  return texts.flatMap((text) => {
    const parsed = JSON.parse(text) as JsonLdNode;
    return Array.isArray(parsed['@graph']) ? (parsed['@graph'] as JsonLdNode[]) : [parsed];
  });
};

const nodeOf = (nodes: JsonLdNode[], type: string) => nodes.find((n) => n['@type'] === type);

const pathOf = (href: string | null) => (href ? new URL(href, 'http://x').pathname : null);

const hrefs = (page: Page, selector: string) =>
  page.locator(selector).evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));

const robotsOf = (page: Page) =>
  page
    .locator('meta[name="robots"]')
    .evaluateAll((metas) => metas.map((m) => m.getAttribute('content') ?? ''));

const description = (page: Page) =>
  page.locator('meta[name="description"]').first().getAttribute('content');

const SECTIONS_TOC = 'nav[aria-labelledby="summary-sections-title"]';

/** Вертикальная позиция верха элемента - порядок блоков на широком экране. */
const topOf = async (page: Page, locator: ReturnType<Page['locator']>) => {
  const box = await locator.first().boundingBox();
  expect(box, 'элемента нет на экране').not.toBeNull();
  return box!.y;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Ключи словаря и подстановки, которые не должны попасть в видимый текст (§9 п.10). */
const RAW_KEYS =
  /[{}]|summaryBriefTitle|summarySectionsTitle|summaryFullTitle|summaryReadChapter|summarySection(?:Spoiler|PageTitle)/;

const dateText = (lang: SupportedLang, iso: string) => formatLongDateUtc(new Date(iso), lang);

/** Дата адреса раздела полной книги по языку и номеру (`product.md` §2 п.6). */
const sectionDate = (lang: SupportedLang, n: number) =>
  lang === 'en' ? [SECTION_DATE, SECTION_MOVED_DATE, SUMMARY_DATE][n - 1] : SUMMARY_DATE;

const sectionNumbers = (lang: SupportedLang) => READER_CHAPTERS[lang].map((_, index) => index + 1);

/** Время чтения по шаблону словаря: «N мин чтения» с любым числом минут. */
const readingPattern = (lang: SupportedLang) =>
  new RegExp(
    escapeRegExp(getDictionary(lang).book.summaryReadingTime).replace(
      escapeRegExp('{minutes}'),
      '\\d+'
    )
  );

test.describe('Summary variants: every opened pair (F04-4, §9 п.2, п.4)', () => {
  for (const [lang, slug, summaries, sections] of OPENED) {
    test(`${lang}/${slug}: pages answer as the matrix says`, async ({ request }) => {
      const summary = await request.get(summaryUrl(lang, slug));
      expect(summary.status()).toBe(summaries ? 200 : 404);
      for (let n = 1; n <= sections + 1; n += 1) {
        const section = await request.get(sectionUrl(lang, slug, n));
        expect([n, section.status()]).toEqual([n, summaries && n <= sections ? 200 : 404]);
      }
    });
  }

  test('a draft version has neither the page nor sections (§9 п.6)', async ({ request }) => {
    expect((await request.get(summaryUrl('en', SLUG.draft))).status()).toBe(404);
    expect((await request.get(sectionUrl('en', SLUG.draft, 1))).status()).toBe(404);
  });

  test('malformed section numbers answer 404, a trailing slash redirects', async ({
    page,
    request,
  }) => {
    for (const n of ['0', '01', '-1', 'abc', '1.5', '4', '1/x']) {
      const response = await request.get(sectionUrl('en', SLUG.full, n));
      expect([n, response.status()]).toEqual([n, 404]);
    }
    const response = await page.goto(`${sectionUrl('en', SLUG.full, 1)}/`);
    expect(response?.status()).toBe(200);
    expect(new URL(page.url()).pathname).toBe(sectionUrl('en', SLUG.full, 1));
  });
});

test.describe('Summary variants: the full book on every language (F04-4, §9 п.1, п.10)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`/summary: brief, then the table of contents, then the full text [${lang}]`, async ({
      page,
    }) => {
      const dict = getDictionary(lang);
      const strings = STRINGS[lang];
      await page.goto(summaryUrl(lang, SLUG.full));
      await expect(page.locator('h1')).toHaveCount(1);

      const briefTitle = page.getByRole('heading', { level: 2, name: strings.brief, exact: true });
      const sectionsTitle = page.getByRole('heading', {
        level: 2,
        name: strings.sections,
        exact: true,
      });
      const fullTitle = page.getByRole('heading', { level: 2, name: strings.full, exact: true });
      for (const title of [briefTitle, sectionsTitle, fullTitle])
        await expect(title).toHaveCount(1);
      const tops = [
        await topOf(page, briefTitle),
        await topOf(page, sectionsTitle),
        await topOf(page, fullTitle),
      ];
      expect(tops).toEqual([...tops].sort((a, b) => a - b));

      await expect(page.locator('#brief')).toContainText(BOOK[lang].brief);
      // Время чтения - своё, у блока.
      await expect(page.locator('#brief')).toContainText(readingPattern(lang));

      await expect(page.getByText(dict.book.editorialTeam).first()).toBeVisible();
      await expect(page.getByText(dateText(lang, SUMMARY_DATE)).first()).toBeVisible();

      const numbers = sectionNumbers(lang);
      expect(await hrefs(page, `${SECTIONS_TOC} a`)).toEqual(
        numbers.map((n) => sectionUrl(lang, SLUG.full, n))
      );
      expect(await page.locator(`${SECTIONS_TOC} a`).allInnerTexts()).toEqual(
        numbers.map((n) => sectionTitle(lang, n))
      );

      const article = nodeOf(await jsonLd(page), 'Article');
      expect(article?.dateModified).toBe(SUMMARY_DATE);
      expect(await page.locator('body').innerText()).not.toMatch(RAW_KEYS);
    });

    for (const n of sectionNumbers(lang)) {
      test(`/summary/${n}: page, markup, navigation and chapter link [${lang}]`, async ({
        page,
      }) => {
        const dict = getDictionary(lang);
        const strings = STRINGS[lang];
        const count = READER_CHAPTERS[lang].length;
        const own = sectionUrl(lang, SLUG.full, n);
        const response = await page.goto(own);
        expect(response?.status()).toBe(200);

        // Шапка и мета (§5, §5а, §9 п.8).
        await expect(page.locator('h1')).toHaveCount(1);
        await expect(page.locator('h1')).toHaveText(heading(lang, n));
        expect((await page.title()).startsWith(heading(lang, n))).toBe(true);
        expect(await description(page)).toBe(sectionPlain(lang, n));
        expect(pathOf(await page.locator('link[rel="canonical"]').getAttribute('href'))).toBe(own);
        expect((await robotsOf(page)).filter((value) => /noindex/i.test(value))).toEqual([]);

        // hreflang - только свой язык: пары «раздел ↔ раздел» между языками нет.
        const alternates = await page
          .locator('link[rel="alternate"][hreflang]')
          .evaluateAll((links) =>
            links.map((link) => [
              link.getAttribute('hreflang') ?? '',
              new URL(link.getAttribute('href') ?? '', 'http://x').pathname,
            ])
          );
        expect(alternates.map(([hreflang]) => hreflang).filter((h) => h !== 'x-default')).toEqual([
          lang,
        ]);
        expect(alternates.map(([, path]) => path)).toEqual(alternates.map(() => own));

        // Разметка совпадает с видимым.
        const nodes = await jsonLd(page);
        const article = nodeOf(nodes, 'Article');
        expect(article?.headline).toBe(heading(lang, n));
        expect(pathOf(article?.url as string)).toBe(own);
        expect(pathOf((article?.isPartOf as JsonLdNode | undefined)?.url as string)).toBe(
          summaryUrl(lang, SLUG.full)
        );
        expect(article?.dateModified).toBe(sectionDate(lang, n));
        const crumbs = [
          dict.breadcrumb.home,
          dict.taxonomy.allBooks,
          BOOK[lang].title,
          dict.book.summary,
          sectionTitle(lang, n),
        ];
        const listed = nodeOf(nodes, 'BreadcrumbList')?.itemListElement as
          | Array<{ name: string }>
          | undefined;
        expect(listed?.map((item) => item.name)).toEqual(crumbs);
        const visible = page
          .getByRole('navigation', { name: dict.a11y.breadcrumb })
          .locator('li:not([aria-hidden="true"])');
        expect(await visible.allInnerTexts()).toEqual(crumbs);

        // Тело: спойлеры, подпись с датой этого раздела, время чтения, текст.
        await expect(page.getByText(strings.spoiler)).toBeVisible();
        await expect(page.getByText(dict.book.editorialTeam).first()).toBeVisible();
        await expect(page.getByText(dateText(lang, sectionDate(lang, n))).first()).toBeVisible();
        await expect(page.getByText(sectionPlain(lang, n))).toBeVisible();
        expect(await page.locator('body').innerText()).toMatch(readingPattern(lang));

        // Оглавление: текущий пункт отмечен и не ссылка, остальные ведут на свои разделы.
        const toc = page.locator(`aside ${SECTIONS_TOC}`);
        await expect(toc).toBeVisible();
        await expect(toc.locator('[aria-current="page"]')).toHaveText(sectionTitle(lang, n));
        await expect(toc.locator('a[aria-current="page"]')).toHaveCount(0);
        expect(await hrefs(page, `aside ${SECTIONS_TOC} a`)).toEqual(
          sectionNumbers(lang)
            .filter((other) => other !== n)
            .map((other) => sectionUrl(lang, SLUG.full, other))
        );

        // Навигация: на первом нет предыдущего, на последнем - следующего.
        const prev = page.locator('a[rel="prev"]');
        const next = page.locator('a[rel="next"]');
        await expect(prev).toHaveCount(n > 1 ? 1 : 0);
        await expect(next).toHaveCount(n < count ? 1 : 0);
        if (n > 1) {
          await expect(prev).toHaveAttribute('href', sectionUrl(lang, SLUG.full, n - 1));
          await expect(prev).toContainText(sectionTitle(lang, n - 1));
        }
        if (n < count) {
          await expect(next).toHaveAttribute('href', sectionUrl(lang, SLUG.full, n + 1));
          await expect(next).toContainText(sectionTitle(lang, n + 1));
        }

        // «Читать эту главу»: только на существующую главу версии.
        const chapter = READER_CHAPTERS[lang][n - 1];
        const readLink = page.getByRole('link', { name: strings.readChapter, exact: true });
        if (chapter !== null && EXISTING_CHAPTERS.includes(chapter)) {
          await expect(readLink).toHaveAttribute(
            'href',
            `${bookUrl(lang, SLUG.full)}/read?chapter=${chapter}`
          );
        } else {
          await expect(readLink).toHaveCount(0);
        }

        // Ссылки §5 п.9: «Очень кратко» на блок, «Полный пересказ» на страницу, анализа у книги нет.
        await expect(page.getByRole('link', { name: strings.brief, exact: true })).toHaveAttribute(
          'href',
          `${summaryUrl(lang, SLUG.full)}#brief`
        );
        await expect(page.getByRole('link', { name: strings.full, exact: true })).toHaveAttribute(
          'href',
          summaryUrl(lang, SLUG.full)
        );
        await expect(page.locator('a[href$="/analysis"]')).toHaveCount(0);
        // «Читать» - у версии есть текст; аудио у книги приёмки нет, «Слушать» нет.
        await expect(
          page.getByRole('link', { name: dict.book.readFullBook, exact: true })
        ).toHaveAttribute('href', `${bookUrl(lang, SLUG.full)}/read`);
        await expect(
          page.getByRole('link', { name: dict.book.listenAudiobook, exact: true })
        ).toHaveCount(0);
        expect(await page.locator('body').innerText()).not.toMatch(RAW_KEYS);
      });
    }
  }
});

test.describe('Summary variants: brief block and reader chapter link by the tables (F04-4, §9 п.3, п.5)', () => {
  for (const [slug, brief] of BRIEF) {
    test(`${slug}: the "In brief" block is ${brief ? 'there' : 'absent'}`, async ({ page }) => {
      await page.goto(summaryUrl('en', slug));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.locator('#brief')).toHaveCount(brief);
    });
  }

  for (const [slug, n, exists] of READER) {
    test(`${slug}/summary/${n}: "Read this chapter" is ${exists ? 'there' : 'absent'}`, async ({
      page,
    }) => {
      await page.goto(sectionUrl('en', slug, n));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(
        page.getByRole('link', { name: STRINGS.en.readChapter, exact: true })
      ).toHaveCount(exists ? 1 : 0);
    });
  }
});

test.describe('Summary variants: books with a part of the blocks (F04-4, §9 п.2, п.3, п.5)', () => {
  const blocks = (page: Page, lang: SupportedLang) => ({
    brief: page.getByRole('heading', { level: 2, name: STRINGS[lang].brief, exact: true }),
    full: page.getByRole('heading', { level: 2, name: STRINGS[lang].full, exact: true }),
    toc: page.locator(SECTIONS_TOC),
  });

  test('only the full summary: the page is as before, no sections', async ({ page }) => {
    await page.goto(summaryUrl('en', SLUG.onlyFull));
    await expect(page.locator('h1')).toHaveCount(1);
    const { brief, full, toc } = blocks(page, 'en');
    await expect(brief).toHaveCount(0);
    await expect(full).toHaveCount(0);
    await expect(toc).toHaveCount(0);
    await expect(page.getByText(BOOK.en.service).first()).toBeVisible();
    expect(await description(page)).toBe(BOOK.en.service);
  });

  test('the very short summary without sections: block and "Full summary", no table of contents', async ({
    page,
  }) => {
    await page.goto(summaryUrl('en', SLUG.briefOnly));
    const { brief, full, toc } = blocks(page, 'en');
    await expect(brief).toHaveCount(1);
    await expect(full).toHaveCount(1);
    await expect(toc).toHaveCount(0);
    // Описание берётся из очень краткого.
    expect(await description(page)).toBe(BOOK.en.brief);
  });

  test('sections without the very short summary: table of contents and "Full summary", no brief link', async ({
    page,
  }) => {
    await page.goto(summaryUrl('en', SLUG.sectionsOnly));
    const { brief, full, toc } = blocks(page, 'en');
    await expect(brief).toHaveCount(0);
    await expect(full).toHaveCount(1);
    await expect(toc.locator('a')).toHaveCount(2);
    expect(await description(page)).toBe(BOOK.en.service);

    await page.goto(sectionUrl('en', SLUG.sectionsOnly, 1));
    await expect(page.locator('a[href$="#brief"]')).toHaveCount(0);
    await expect(page.getByRole('link', { name: STRINGS.en.full, exact: true })).toHaveAttribute(
      'href',
      summaryUrl('en', SLUG.sectionsOnly)
    );
  });
});

test.describe('Summary variants: editorial noindex (F04-4, §9 п.7)', () => {
  test('sections and the summary carry noindex and no hreflang', async ({ page }) => {
    for (const url of [sectionUrl('en', SLUG.noindex, 1), summaryUrl('en', SLUG.noindex)]) {
      const response = await page.goto(url);
      expect([url, response?.status()]).toEqual([url, 200]);
      // Мета-теги Next отдаёт потоком: ждать их, а не читать один раз сразу после загрузки.
      await expect(page.locator('meta[name="robots"][content*="noindex" i]')).not.toHaveCount(0);
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(1);
      await expect(page.locator('link[rel="alternate"][hreflang]')).toHaveCount(0);
    }
    // Положительная пара: книга без редакторского noindex индексируется.
    await page.goto(sectionUrl('en', SLUG.full, 1));
    await expect(page.locator('link[rel="alternate"][hreflang]').first()).toBeAttached();
    expect((await robotsOf(page)).filter((value) => /noindex/i.test(value))).toEqual([]);
  });
});

test.describe('Summary variants: sitemap (F04-4, §9 п.2, п.6, п.7, п.8)', () => {
  const locsOf = (xml: string) =>
    [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => pathOf(match[1]));

  test('the sections file lists only the open pages, with the date of the address', async ({
    request,
  }) => {
    const response = await request.get('/sitemaps/sitemap-summary-sections-en-1.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();
    const locs = locsOf(xml);
    expect(locs.length).toBeLessThanOrEqual(10_000);

    const expected = (slug: string, count: number) =>
      Array.from({ length: count }, (_, i) => sectionUrl('en', slug, i + 1));
    for (const present of [
      ...expected(SLUG.full, 3),
      ...expected(SLUG.sectionsOnly, 2),
      ...expected(SLUG.noChapters, 2),
    ]) {
      expect([present, locs.includes(present)]).toEqual([present, true]);
    }
    // Без полного пересказа, без разделов, с редакторским noindex и черновик - не в карте.
    for (const slug of [SLUG.onlyFull, SLUG.briefOnly, SLUG.noFull, SLUG.noindex, SLUG.draft]) {
      expect([slug, locs.filter((loc) => loc?.includes(`/${slug}/`))]).toEqual([slug, []]);
    }

    // `lastmod` - дата адреса: правка текста, а у сменившего номер - дата смены.
    const lastmod = (n: number) =>
      new RegExp(
        `<loc>[^<]*${escapeRegExp(sectionUrl('en', SLUG.full, n))}</loc>\\s*<lastmod>([^<]+)</lastmod>`
      ).exec(xml)?.[1];
    expect(lastmod(1)).toMatch(/^2026-01-06/);
    expect(lastmod(2)).toMatch(/^2026-02-20/);
    expect(lastmod(3)).toMatch(/^2026-03-10/);
  });

  test('every language has its own file with its own sections', async ({ request }) => {
    for (const lang of SUPPORTED_LANGS) {
      const response = await request.get(`/sitemaps/sitemap-summary-sections-${lang}-1.xml`);
      expect([lang, response.status()]).toEqual([lang, 200]);
      const locs = locsOf(await response.text());
      const own = sectionNumbers(lang).map((n) => sectionUrl(lang, SLUG.full, n));
      expect(own.filter((loc) => !locs.includes(loc))).toEqual([]);
      expect(locs).not.toContain(sectionUrl(lang, SLUG.full, sectionNumbers(lang).length + 1));
    }
  });

  test('the sitemap index lists the sections file', async ({ request }) => {
    const index = await (await request.get('/sitemap.xml')).text();
    expect(index).toContain('sitemap-summary-sections-en-1.xml');
  });
});

test.describe('Summary variants: language switcher (F04-4, §9 п.1)', () => {
  const options = async (page: Page, url: string) => {
    await page.goto(url);
    const toggle = page.locator('header button[aria-haspopup="listbox"]').first();
    // Клик до гидратации список не открывает: повторяем, пока кнопка не скажет «открыт».
    await expect(async () => {
      if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true', { timeout: 1_000 });
    }).toPass();
    return page.locator('header [role="listbox"] [role="option"]');
  };

  test('a section page offers the languages of the summary and leads to /summary of the other', async ({
    page,
  }) => {
    const all = await options(page, sectionUrl('en', SLUG.full, 2));
    await expect(all).toHaveCount(SUPPORTED_LANGS.length);
    // Видимый текст опции - код языка (имя языка - alt картинки); якорь, чтобы совпадение было одно.
    await all.filter({ hasText: /^\s*ru\s*$/i }).click();
    await expect(page).toHaveURL(new RegExp(`${escapeRegExp(summaryUrl('ru', SLUG.full))}$`));
    await expect(page.locator('h1')).toHaveCount(1);
  });

  // У книги три версии: `ru` без пересказа, `es` со своим слагом. Пока обзор не загружен,
  // переключатель показывает все пять языков, поэтому ожидание двух пунктов ждёт данных.
  test('only languages with a summary, and the other language leads to the slug of its version', async ({
    page,
  }) => {
    const offered = await options(page, sectionUrl('en', SLUG.sectionsOnly, 1));
    await expect(offered).toHaveCount(2);
    await expect(offered.filter({ hasText: /^\s*ru\s*$/i })).toHaveCount(0);
    await offered.filter({ hasText: /^\s*es\s*$/i }).click();
    await expect(page).toHaveURL(
      new RegExp(`${escapeRegExp(summaryUrl('es', SLUG.sectionsOnlyEs))}$`)
    );
    await expect(page.locator('h1')).toHaveCount(1);
  });
});

test.describe('Summary variants: phone width (F04-4, §9 п.11)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  const horizontalOverflow = (page: Page) =>
    page.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth
      )
    );

  // Каждый язык: самые длинные подписи (заголовок, спойлеры, оглавление) - во `fr` и `pt`.
  for (const lang of SUPPORTED_LANGS) {
    test(`a middle section: no horizontal scroll, the table of contents sits after the text [${lang}]`, async ({
      page,
    }) => {
      await page.goto(sectionUrl(lang, SLUG.full, 2));
      await expect(page.locator('h1')).toBeVisible();
      expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);

      const toc = page.locator(`aside ${SECTIONS_TOC}`);
      await expect(toc).toBeVisible();
      const text = page.getByText(sectionPlain(lang, 2));
      expect(await topOf(page, toc)).toBeGreaterThan(await topOf(page, text));
      await expect(page.locator('a[rel="prev"]')).toBeVisible();
      // Второй раздел последний у `es` и `pt` (по два раздела) - там следующего нет.
      await expect(page.locator('a[rel="next"]')).toHaveCount(
        READER_CHAPTERS[lang].length > 2 ? 1 : 0
      );
    });
  }

  test('the summary page with the block and the table of contents: no horizontal scroll', async ({
    page,
  }) => {
    await page.goto(summaryUrl('ru', SLUG.full));
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator(SECTIONS_TOC)).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(0);
  });
});
