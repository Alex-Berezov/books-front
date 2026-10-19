import { test, expect, type Page } from '@playwright/test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';

/**
 * Приёмка раздела «Разбор и анализ» в настоящем браузере (`F03-4`, `product.md` §24). Идёт против
 * бэкенда с засеянной базой: книги приёмки заводит `books/prisma/seed-analyses.ts` - служебные,
 * с главами и цитатами из этих глав (решение арбитра `F03 | F03-4`, В1).
 *
 * - `analysis-acceptance-full` - полный анализ на пяти языках, главы 1-4;
 * - `analysis-acceptance-minimal` - только ядро (`en`);
 * - `analysis-acceptance-no-core` - анализ без ядра на `en` и `ru`, у обеих версий есть пересказ;
 * - `analysis-acceptance-two-langs` - версии `en`, `es`, `fr`, анализ только на `en` и `fr`;
 * - `analysis-acceptance-no-chapters` - версия без глав, в анализе ссылки на главы.
 *
 * ⚠️ Слаги и тексты живут в сиде бэкенда и в пробе `ci.yml` («The seeded data actually arrived»).
 * Переименуешь там - поправь здесь. Претензии правообладателя в e2e не идут (решение арбитра,
 * В3): их держат e2e бэкенда и `__tests__/middleware.test.ts`. Экран блокировки читалки здесь
 * недостижим (уточнение В3: `X-Visitor-Country` бэкенд CI не принимает) - гео-сценарий кончается
 * переходом на `/read`; 451 глав проверяет `books/test/seed-dataset.e2e-spec.ts`, экран -
 * `__tests__/app/readerRightsBlocked.test.tsx`.
 */

const SLUG = {
  full: 'analysis-acceptance-full',
  minimal: 'analysis-acceptance-minimal',
  noCore: 'analysis-acceptance-no-core',
  twoLangs: 'analysis-acceptance-two-langs',
  noChapters: 'analysis-acceptance-no-chapters',
} as const;

/** Первая цитата анализа - дословно первая глава книги приёмки (`seed-analyses.ts`, `quotes[0]`). */
const FIRST_QUOTE: Record<SupportedLang, string> = {
  en: 'The lamp in the window stayed lit all night.',
  es: 'La lámpara de la ventana estuvo encendida toda la noche.',
  fr: 'La lampe à la fenêtre resta allumée toute la nuit.',
  pt: 'A lâmpada da janela ficou acesa a noite toda.',
  ru: 'Лампа в окне горела всю ночь.',
};

/** Служебная фраза сида (`seed-analyses.ts`, `service`): ответ FAQ - она и вопрос через пробел. */
const SERVICE: Record<SupportedLang, string> = {
  en: 'Service text of the acceptance analysis.',
  es: 'Texto de servicio del análisis de aceptación.',
  fr: 'Texte de service de l’analyse de recette.',
  pt: 'Texto de serviço da análise de aceitação.',
  ru: 'Служебный текст анализа приёмки.',
};

/** Первый вопрос FAQ: ответы FAQ обязаны быть в HTML сервера, а не только в раскрытии. */
const FAQ_QUESTION: Record<SupportedLang, string> = {
  en: 'What is the acceptance book about?',
  es: '¿De qué trata el libro de aceptación?',
  fr: 'De quoi parle le livre de recette ?',
  pt: 'Sobre o que é o livro de aceitação?',
  ru: 'О чём книга приёмки?',
};

/** Связь карты героев списком (`RelationMap`): Анна → подруга → Борис. */
const FIRST_RELATION: Record<SupportedLang, string> = {
  en: 'Anna Keeper → friend of → Boris Walker',
  es: 'Ana Guardiana → amiga de → Boris Caminante',
  fr: 'Anna Gardienne → amie de → Boris Marcheur',
  pt: 'Ana Guardiã → amiga de → Boris Andarilho',
  ru: 'Анна Смотрова → подруга → Борис Ходоков',
};

/** Порядок разделов оглавления полного анализа - `product.md` §3 (якоря `analysisAnchors.ts`). */
const FULL_TOC = [
  'themes',
  'characters',
  'symbols',
  'key-quotes',
  'title-meaning',
  'ending',
  'context',
  'style',
  'reception',
  'adaptations',
  'misreadings',
  'discussion-questions',
  'faq',
  'sources',
];

/**
 * Число глав в сиде у полной книги и у версии без глав: ссылки на главы полного анализа - только
 * в его главы, у версии без глав их нет. Ту же пару проверяет проба `ci.yml` (номера глав
 * анализа), совпадение держит `__tests__/ci-e2e-upstream.test.ts`.
 */
const CHAPTERS = { full: 4, noChapters: 0 } as const;

const bookUrl = (lang: string, slug: string) => `/${lang}/book/${slug}`;
const analysisUrl = (lang: string, slug: string) => `${bookUrl(lang, slug)}/analysis`;

const tocAnchors = (page: Page) =>
  page
    .locator('nav[aria-labelledby="analysis-toc-title"] a')
    .evaluateAll((links) => links.map((a) => (a.getAttribute('href') ?? '').replace(/^#/, '')));

/**
 * Пары «язык/книга», которые открывает спека, и счётчик анализов версии в сиде: 1 - страница
 * есть, 0 - нет. Тот же набор троек проверяет проба `ci.yml` («The seeded data actually
 * arrived»), совпадение держит `__tests__/ci-e2e-upstream.test.ts`: правишь здесь - правь там.
 */
const OPENED: ReadonlyArray<readonly [SupportedLang, string, 0 | 1]> = [
  ['en', SLUG.full, 1],
  ['es', SLUG.full, 1],
  ['fr', SLUG.full, 1],
  ['pt', SLUG.full, 1],
  ['ru', SLUG.full, 1],
  ['en', SLUG.minimal, 1],
  ['en', SLUG.noCore, 0],
  ['ru', SLUG.noCore, 0],
  ['en', SLUG.twoLangs, 1],
  ['fr', SLUG.twoLangs, 1],
  ['es', SLUG.twoLangs, 0],
  ['en', SLUG.noChapters, 1],
];

test.describe('Book analysis: every opened pair (F03-4, §24)', () => {
  for (const [lang, slug, analyses] of OPENED) {
    test(`${lang}/${slug} answers ${analyses ? 200 : 404}`, async ({ request }) => {
      const response = await request.get(analysisUrl(lang, slug));
      expect(response.status()).toBe(analyses ? 200 : 404);
    });
  }
});

test.describe('Book analysis: full analysis (F03-4, §24 п.1, п.7)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`all blocks in §3 order, TOC = h2, text in server HTML [${lang}]`, async ({
      page,
      request,
    }) => {
      const url = analysisUrl(lang, SLUG.full);

      // п.7: сырой ответ сервера, без JS.
      const raw = await request.get(url);
      expect(raw.status()).toBe(200);
      const html = await raw.text();
      expect(html).toContain(FIRST_QUOTE[lang]);
      expect(html).toContain(FAQ_QUESTION[lang]);
      expect(html).toContain(`${SERVICE[lang]} ${FAQ_QUESTION[lang]}`);
      expect(html).toContain(FIRST_RELATION[lang]);

      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const anchors = await tocAnchors(page);
      expect(anchors).toEqual(FULL_TOC);
      for (const anchor of anchors) {
        await expect(page.locator(`[id="${anchor}"]`), anchor).toHaveCount(1);
      }
      // Карточка произведения и главная мысль - над оглавлением, своих пунктов у них нет (§3).
      const crumbs = getDictionary(lang).a11y.breadcrumb;
      const inDom = await page
        .locator(`nav[aria-label="${crumbs}"], [id]`)
        .evaluateAll((nodes) => nodes.map((n) => (n.tagName === 'NAV' && !n.id ? 'crumbs' : n.id)));
      const order = ['crumbs', 'about-the-work', 'main-idea', ...FULL_TOC, 'analysis-continue'];
      expect(inDom.filter((id) => order.includes(id))).toEqual(order);
      // Хронология (§13): три события внутри контекста.
      await expect(page.locator('#context ol > li')).toHaveCount(3);

      const chapterLinks = await page
        .locator('main a[href*="/read?chapter="]')
        .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));
      expect(chapterLinks.length).toBeGreaterThan(0);
      for (const href of chapterLinks) {
        expect(href).toMatch(
          new RegExp(`^/${lang}/book/${SLUG.full}/read\\?chapter=[1-${CHAPTERS.full}]$`)
        );
      }
    });
  }

  // На `ru`, а не на `en`: у читалки `en` полной книги есть гео-правило, а страна посетителя
  // в CI бэкенду неизвестна - с активным правилом неизвестная страна читалку не открывает.
  test('a chapter link opens that chapter in the reader [ru]', async ({ page }) => {
    await page.goto(analysisUrl('ru', SLUG.full));
    await page.locator(`main a[href="/ru/book/${SLUG.full}/read?chapter=3"]`).first().click();
    await expect(page).toHaveURL(new RegExp(`/ru/book/${SLUG.full}/read`));
    await expect(page.locator('body')).toContainText('Служебный текст анализа приёмки. Глава 3.');
  });
});

test.describe('Book analysis: minimal and missing core (F03-4, §24 п.2, п.3)', () => {
  test('core only: page exists, optional sections have neither heading nor TOC item', async ({
    page,
  }) => {
    const response = await page.goto(analysisUrl('en', SLUG.minimal));
    expect(response?.status()).toBe(200);
    expect(await tocAnchors(page)).toEqual(['themes', 'characters', 'key-quotes']);
    await expect(page.locator('#main-idea')).toHaveCount(1);
    await expect(page.locator('#about-the-work')).toHaveCount(0);
    for (const absent of FULL_TOC.filter(
      (a) => !['themes', 'characters', 'key-quotes'].includes(a)
    )) {
      await expect(page.locator(`[id="${absent}"]`), absent).toHaveCount(0);
    }
  });

  for (const lang of ['en', 'ru'] as const) {
    test(`no core: 404, no link from the book and summary pages [${lang}]`, async ({ page }) => {
      const response = await page.goto(analysisUrl(lang, SLUG.noCore));
      expect(response?.status()).toBe(404);

      for (const path of [bookUrl(lang, SLUG.noCore), `${bookUrl(lang, SLUG.noCore)}/summary`]) {
        const page200 = await page.goto(path);
        expect(page200?.status(), path).toBe(200);
        // Адрес анализа кончается `/analysis` или несёт якорь раздела; слаг книги приёмки сам
        // начинается с `analysis-`, поэтому подстрока `/analysis` здесь не годится.
        await expect(page.locator('a[href$="/analysis"], a[href*="/analysis#"]'), path).toHaveCount(
          0
        );
      }
      // Тот же селектор на книге с анализом ссылку находит - иначе ноль выше ничего не значит.
      await page.goto(bookUrl(lang, SLUG.full));
      await expect(page.locator('a[href$="/analysis"]').first()).toBeAttached();

      const sitemap = await page.request.get(`/sitemaps/sitemap-books-${lang}-1.xml`);
      expect(sitemap.status()).toBe(200);
      const xml = await sitemap.text();
      expect(xml).toContain(`${analysisUrl(lang, SLUG.full)}</loc>`);
      expect(xml).not.toContain(`${analysisUrl(lang, SLUG.noCore)}</loc>`);
    });
  }
});

test.describe('Book analysis: two languages (F03-4, §24 п.4)', () => {
  test('hreflang lists exactly the two languages and equals the sitemap entry', async ({
    page,
    request,
  }) => {
    const url = analysisUrl('en', SLUG.twoLangs);
    await page.goto(url);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const onPage = await page
      .locator('link[rel="alternate"][hreflang]')
      .evaluateAll((links) =>
        links.map((link) => [
          link.getAttribute('hreflang') ?? '',
          new URL(link.getAttribute('href') ?? '', 'http://x').pathname,
        ])
      );
    const langs = onPage.map(([hreflang]) => hreflang).filter((h) => h !== 'x-default');
    expect(langs.sort()).toEqual(['en', 'fr']);

    const sitemap = await request.get('/sitemaps/sitemap-books-en-1.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    const entry = xml
      .split('<url>')
      .find((block) => new RegExp(`<loc>[^<]*${url}</loc>`).test(block));
    expect(entry, `${url} нет в карте сайта`).toBeTruthy();
    const inSitemap = [...entry!.matchAll(/hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((m) => [
      m[1],
      new URL(m[2], 'http://x').pathname,
    ]);
    expect([...inSitemap].sort()).toEqual([...onPage].sort());
  });

  test('the language switcher offers only the languages of the analysis', async ({ page }) => {
    const options = async (slug: string) => {
      await page.goto(analysisUrl('en', slug));
      await page.locator('header button[aria-haspopup="listbox"]').first().click();
      return page.locator('header [role="listbox"] [role="option"]');
    };
    await expect(await options(SLUG.full)).toHaveCount(SUPPORTED_LANGS.length);
    const two = await options(SLUG.twoLangs);
    expect((await two.allInnerTexts()).map((text) => text.trim()).sort()).toEqual(['EN', 'FR']);
  });

  test('the language without an analysis answers 404 [es]', async ({ page }) => {
    const response = await page.goto(analysisUrl('es', SLUG.twoLangs));
    expect(response?.status()).toBe(404);
  });
});

test.describe('Book analysis: version without chapters (F03-4, §24 п.5)', () => {
  test('no theme strip and no chapter links, the rest is in place', async ({ page }) => {
    await page.goto(analysisUrl('en', SLUG.noChapters));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await tocAnchors(page)).toEqual(FULL_TOC);
    await expect(page.locator('a[href*="?chapter="]')).toHaveCount(CHAPTERS.noChapters);
    await expect(page.locator('#themes [class*="strip"]')).toHaveCount(0);
    // Тот же селектор на книге с главами полосу находит - иначе ноль выше ничего не значит.
    await page.goto(analysisUrl('en', SLUG.full));
    await expect(page.locator('#themes [class*="strip"]').first()).toBeVisible();
  });
});

test.describe('Book analysis: wide screen (F03-4, §24 п.6, контроль)', () => {
  test('the relationship map is drawn as a diagram', async ({ page }) => {
    await page.goto(analysisUrl('en', SLUG.full));
    await expect(page.locator('figure svg[aria-label]')).toBeVisible();
  });
});

test.describe('Book analysis: phone width (F03-4, §24 п.6)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('no horizontal scroll, the relationship map is a list', async ({ page }) => {
    await page.goto(analysisUrl('en', SLUG.full));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const overflow = await page.evaluate(() =>
      Math.max(
        document.documentElement.scrollWidth - document.documentElement.clientWidth,
        document.body.scrollWidth - document.documentElement.clientWidth
      )
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await expect(page.getByText(FIRST_RELATION.en)).toBeVisible();
    await expect(page.locator('figure svg[aria-label]')).toHaveCount(1);
    await expect(page.locator('figure svg[aria-label]')).toBeHidden();
  });
});

test.describe('Book analysis: open for the country of the reader rule (F03-4, D7)', () => {
  test.use({ extraHTTPHeaders: { 'cf-ipcountry': 'GB' } });

  test('with cf-ipcountry of the reader rule the analysis answers 200 and Read links to /read', async ({
    page,
  }) => {
    const response = await page.goto(analysisUrl('en', SLUG.full));
    expect(response?.status()).toBe(200);
    await expect(page.getByText(FIRST_QUOTE.en).first()).toBeVisible();
    await expect(page.locator(`a[href="/en/book/${SLUG.full}/read"]`).first()).toBeVisible();
  });
});
