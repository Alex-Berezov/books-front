import { test, expect, type Locator, type Page } from '@playwright/test';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';
import { countGoogle } from './google';

/**
 * Приёмка страницы автора в настоящем браузере (`F02-5`, `product.md` §20). Идёт против бэкенда
 * с засеянной базой: авторов и их книги заводит `books/prisma/seed-authors.ts`.
 *
 * - `jules-verne` - полный: все блоки на пяти языках, портрет с подписью; в данных есть
 *   книга и автор, которых на сайте нет, - они показываются текстом без ссылки;
 * - `alexandre-dumas` - минимальный: имя и одна книга, больше ничего;
 * - `rudyard-kipling` - «старый» (до F02): биография без разделов, цитаты, вопросы-ответы;
 * - `robert-louis-stevenson` - перевод только на `en`: в «Похожих авторах» Верна на остальных
 *   языках он именем без ссылки.
 *
 * ⚠️ Слаги и имена живут в сиде бэкенда и в пробе `ci.yml` («The seeded data actually arrived»).
 * Переименуешь там - поправь здесь. Заголовки берутся из словаря, а не литералами, чтобы правка
 * текста не красила прогон; то, что они переведены, проверяется отдельно.
 */

const AUTHOR_SLUG = {
  verne: {
    en: 'jules-verne',
    ru: 'zhyul-vern',
    es: 'julio-verne',
    fr: 'jules-verne',
    pt: 'julio-verne',
  },
  dumas: {
    en: 'alexandre-dumas',
    ru: 'aleksandr-dyuma',
    es: 'alejandro-dumas',
    fr: 'alexandre-dumas',
    pt: 'alexandre-dumas',
  },
  kipling: {
    en: 'rudyard-kipling',
    ru: 'redyard-kipling',
    es: 'rudyard-kipling',
    fr: 'rudyard-kipling',
    pt: 'rudyard-kipling',
  },
} as const satisfies Record<string, Record<SupportedLang, string>>;

const VERNE_NAME: Record<SupportedLang, string> = {
  en: 'Jules Verne',
  ru: 'Жюль Верн',
  es: 'Julio Verne',
  fr: 'Jules Verne',
  pt: 'Júlio Verne',
};

/** Имя во «Влияниях» Верна со слагом, которого на сайте нет (`seed-authors.ts`, `absentAuthor`). */
const ABSENT_AUTHOR: Record<SupportedLang, string> = {
  en: 'Victor Hugo',
  ru: 'Виктор Гюго',
  es: 'Victor Hugo',
  fr: 'Victor Hugo',
  pt: 'Victor Hugo',
};

/** Первый роман Верна: на сайте его нет, событие хронологии 1863 года - текстом без ссылки. */
const FIRST_NOVEL: Record<SupportedLang, string> = {
  en: 'Five Weeks in a Balloon',
  ru: 'Пять недель на воздушном шаре',
  es: 'Cinco semanas en globo',
  fr: 'Cinq semaines en ballon',
  pt: 'Cinco semanas em um balão',
};

/** Автор с переводом только на `en`. */
const STEVENSON = { name: 'Robert Louis Stevenson', slug: 'robert-louis-stevenson' };

/**
 * Все ключи словаря языка путями (`author.timeline`, `book.editorialTeam`): строка на экране,
 * равная ключу, - ключ, не раскрытый в текст. Сверка по самому словарю, а не по шаблону
 * «слово.слово»: шаблон принимал за ключ и имя хоста в подписи портрета.
 */
const dictionaryKeys = (lang: SupportedLang): Set<string> => {
  const keys = new Set<string>();
  const walk = (value: unknown, path: string) => {
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) walk(child, path ? `${path}.${key}` : key);
    } else if (path) {
      keys.add(path);
    }
  };
  walk(getDictionary(lang), '');
  return keys;
};

test.beforeEach(async ({ page }) => {
  await page.route('**/api/consent-region', (route) =>
    route.fulfill({
      json: { consentRequired: false },
      headers: { 'cache-control': 'private, no-store' },
    })
  );
  await countGoogle(page);
  // Портрет из сида лежит на Wikimedia Commons: в сеть раннер не ходит, картинка подставляется.
  await page.route('https://commons.wikimedia.org/**', (route) =>
    route.fulfill({
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500"/>',
    })
  );
});

const h2Texts = (page: Page) => page.locator('main h2').allTextContents();

const mainHrefs = (page: Page) =>
  page
    .locator('main a[href]')
    .evaluateAll((links) => links.map((a) => a.getAttribute('href') ?? ''));

const authorUrl = (lang: SupportedLang, slug: string) => `/${lang}/author/${slug}`;

/** Секция страницы по тексту её заголовка `h2`. */
const section = (page: Page, heading: string): Locator =>
  page.locator('main section').filter({
    has: page.getByRole('heading', { level: 2, name: heading, exact: true }),
  });

/** Текст секций с `h2` за вычетом самого заголовка: пустая строка - заголовок без содержимого. */
const sectionBodies = (page: Page) =>
  page.locator('main section').evaluateAll((sections) =>
    sections
      .filter((s) => s.querySelector('h2'))
      .map((s) => {
        const heading = s.querySelector('h2')?.textContent ?? '';
        return {
          heading,
          body: (s.textContent ?? '').replace(heading, '').trim(),
        };
      })
  );

/** Текст на странице есть, и он не внутри ссылки. */
async function expectTextWithoutLink(scope: Locator, text: string) {
  const node = scope.getByText(text, { exact: true });
  await expect(node).toHaveCount(1);
  expect(await node.evaluate((el) => el.closest('a') === null)).toBe(true);
}

/** Все JSON-LD страницы, развёрнутые в плоский список узлов. */
async function jsonLdNodes(page: Page): Promise<Array<Record<string, unknown>>> {
  const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
  const out: Array<Record<string, unknown>> = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      out.push(value as Record<string, unknown>);
      Object.values(value).forEach(walk);
    }
  };
  for (const text of raw) walk(JSON.parse(text));
  return out;
}

const isType = (node: Record<string, unknown>, type: string) =>
  node['@type'] === type || (Array.isArray(node['@type']) && node['@type'].includes(type));

/** Ошибки страницы в браузере: «без поломок» значит и без них. */
const collectPageErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
};

test.describe('Author page: full author (F02-5, §20 п.1)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`blocks in the order of §2 with translated headings [${lang}]`, async ({ page }) => {
      const dict = getDictionary(lang).author;
      const name = VERNE_NAME[lang];
      const errors = collectPageErrors(page);

      const response = await page.goto(authorUrl(lang, AUTHOR_SLUG.verne[lang]));
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();

      const h2 = await h2Texts(page);
      expect(h2).toEqual([
        dict.facts,
        dict.startHere,
        dict.books.replace('{name}', name),
        dict.biography,
        dict.timeline,
        dict.quotes,
        dict.influences,
        dict.awards,
        dict.adaptations,
        dict.funFacts,
        dict.similar,
        dict.faq,
        dict.sources,
      ]);

      // Заголовки переведены, а не взяты английскими: на `ru` - кириллицей, на остальных
      // языках набор заголовков не совпадает с английским.
      if (lang === 'ru') {
        expect(h2.filter((text) => !/[А-Яа-яЁё]/.test(text))).toEqual([]);
      } else if (lang !== 'en') {
        const english = getDictionary('en').author;
        const same = h2.filter((text) =>
          [english.facts, english.startHere, english.biography, english.timeline].includes(text)
        );
        expect(same).toEqual([]);
      }

      // Ни одного заголовка без содержимого и ни одной строки-ключа словаря на экране.
      expect((await sectionBodies(page)).filter((s) => s.body === '')).toEqual([]);
      const texts = await page.locator('main').evaluate((main) =>
        Array.from(main.querySelectorAll('h1, h2, h3, h4, a, button, dt, dd, li, p, figcaption'))
          .map((el) => (el.textContent ?? '').trim())
          .filter(Boolean)
      );
      const keys = dictionaryKeys(lang);
      expect(keys.size).toBeGreaterThan(100);
      expect(texts.filter((text) => keys.has(text))).toEqual([]);

      // Портрет и его подпись (§4, §16).
      await expect(page.locator('main header img').first()).toBeVisible();
      await expect(page.locator('main header').getByText(/Félix Nadar/)).toBeVisible();

      expect(errors).toEqual([]);
    });
  }
});

test.describe('Author page: minimal author (F02-5, §20 п.2)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`only the books block, no empty headings [${lang}]`, async ({ page }) => {
      const dict = getDictionary(lang).author;
      const errors = collectPageErrors(page);

      const response = await page.goto(authorUrl(lang, AUTHOR_SLUG.dumas[lang]));
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const name = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';
      expect(await h2Texts(page)).toEqual([dict.books.replace('{name}', name)]);
      // Заголовок «Источники» без содержимого не выводится даже при наличии подписи редакции.
      await expect(page.getByRole('heading', { name: dict.sources })).toHaveCount(0);
      // Под единственным заголовком есть что показать: карточка книги.
      const bodies = await sectionBodies(page);
      expect(bodies.filter((s) => s.body === '')).toEqual([]);
      await expect(
        section(page, dict.books.replace('{name}', name)).locator(`a[href^="/${lang}/book/"]`)
      ).not.toHaveCount(0);
      // Подпись редакции внизу есть и у минимального автора (§1 п.1).
      await expect(
        page.getByRole('link', { name: getDictionary(lang).book.editorialTeam })
      ).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('Author page: author filled before F02 (F02-5, §20 п.7)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`biography without sections, quotes and FAQ render [${lang}]`, async ({ page }) => {
      const dictionary = getDictionary(lang);
      const dict = dictionary.author;
      const errors = collectPageErrors(page);

      const response = await page.goto(authorUrl(lang, AUTHOR_SLUG.kipling[lang]));
      expect(response?.status()).toBe(200);
      const name = (await page.getByRole('heading', { level: 1 }).textContent()) ?? '';

      // Даты жизни есть - есть и «Коротко»; новых блоков в данных нет - нет и на странице.
      expect(await h2Texts(page)).toEqual([
        dict.facts,
        dict.books.replace('{name}', name),
        dict.biography,
        dict.quotes,
        dict.faq,
      ]);
      expect((await sectionBodies(page)).filter((s) => s.body === '')).toEqual([]);
      // Биография без разделов - без оглавления (§8).
      await expect(
        page.getByRole('navigation', { name: dictionary.common.tableOfContents })
      ).toHaveCount(0);
      await expect(section(page, dict.biography).locator('p').first()).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
});

test.describe('Author page: links (F02-5, §20 п.3)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`every internal link of the page leads to the page language and answers 200 [${lang}]`, async ({
      page,
      request,
    }) => {
      await page.goto(authorUrl(lang, AUTHOR_SLUG.verne[lang]));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const hrefs = await mainHrefs(page);
      const internal = [...new Set(hrefs.filter((href) => href.startsWith('/')))];
      expect(internal.length).toBeGreaterThan(5);

      for (const href of internal) {
        expect(href, `ссылка ${href} ведёт не на язык страницы`).toMatch(
          new RegExp(`^/${lang}(/|#|\\?|$)`)
        );
        // Без перехода по редиректу: ссылка ведёт прямо на адрес страницы, а не через 301.
        const res = await request.get(href.split('#')[0], { maxRedirects: 0 });
        expect(res.status(), `${href} -> ${res.status()}`).toBe(200);
      }

      // Книги автора и похожие авторы - настоящие ссылки на страницы своего языка.
      expect(internal.some((href) => href.startsWith(`/${lang}/book/`))).toBe(true);
      expect(internal).toContain(authorUrl(lang, AUTHOR_SLUG.dumas[lang]));
    });

    test(`a book or an author that is not on the site is text without a link [${lang}]`, async ({
      page,
    }) => {
      const dict = getDictionary(lang).author;
      await page.goto(authorUrl(lang, AUTHOR_SLUG.verne[lang]));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // «Влияния»: слаг автора, которого в базе нет, - имя текстом.
      await expectTextWithoutLink(section(page, dict.influences), ABSENT_AUTHOR[lang]);
      // «Хронология»: книга, которой нет на сайте, - событие показано, но без ссылки.
      const event = section(page, dict.timeline).locator('li', { hasText: FIRST_NOVEL[lang] });
      await expect(event).toHaveCount(1);
      await expect(event.locator('a')).toHaveCount(0);
      const hrefs = await mainHrefs(page);
      expect(hrefs.filter((href) => /five-weeks|no-such-author/.test(href))).toEqual([]);

      // «Похожие авторы»: автор без перевода на язык страницы - имя без ссылки; на `en` - ссылка.
      const similar = section(page, dict.similar);
      if (lang === 'en') {
        await expect(similar.locator(`a[href="/en/author/${STEVENSON.slug}"]`)).toHaveCount(1);
      } else {
        await expectTextWithoutLink(similar, STEVENSON.name);
      }
    });
  }

  test('an unknown author slug answers 404', async ({ page }) => {
    const response = await page.goto(authorUrl('en', 'no-such-author-at-all'));
    expect(response?.status()).toBe(404);
  });
});

test.describe('Author page: phone width (F02-5, §20 п.4)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  for (const lang of SUPPORTED_LANGS) {
    test(`no horizontal scroll, facts sit under the header [${lang}]`, async ({ page }) => {
      const dict = getDictionary(lang).author;
      await page.goto(authorUrl(lang, AUTHOR_SLUG.verne[lang]));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      // 375 px - критерий §20 п.4; 360 и 320 - самые узкие распространённые телефоны: шапка
      // сайта на них тоже не должна выходить за край (кнопка входа на es/fr).
      // Кнопка входа появляется, когда клиент узнал, что посетитель не вошёл.
      await page.locator('header button[class*="signInBtn"]').first().waitFor();
      for (const width of [320, 360, 375]) {
        await page.setViewportSize({ width, height: 800 });
        const overflow = await page.evaluate(() =>
          Math.max(
            document.documentElement.scrollWidth - document.documentElement.clientWidth,
            document.body.scrollWidth - document.documentElement.clientWidth
          )
        );
        expect(overflow, `ширина ${width}`).toBeLessThanOrEqual(0);

        // У страницы `overflow-x: clip`: вылезшее за край могло быть просто обрезано. Поэтому
        // шапка сайта меряется сама - ни один её элемент не правее экрана, а подпись кнопки
        // входа на 360 и 375 px читается целиком, без многоточия.
        const header = await page.evaluate(() => {
          const viewport = document.documentElement.clientWidth;
          const row = document.querySelector('header');
          const right = Math.max(
            ...Array.from(row?.querySelectorAll('*') ?? []).map(
              (el) => el.getBoundingClientRect().right
            )
          );
          const signIn = Array.from(row?.querySelectorAll('button') ?? []).find((el) =>
            el.className.includes('signInBtn')
          );
          return {
            overflow: right - viewport,
            truncated: signIn ? signIn.scrollWidth > signIn.clientWidth : null,
          };
        });
        expect(header.overflow, `шапка, ширина ${width}`).toBeLessThanOrEqual(1);
        if (width >= 360) expect(header.truncated, `кнопка входа, ширина ${width}`).toBe(false);
      }

      // Сводка стоит под шапкой целиком, а не рядом с ней: её верх ниже нижнего края шапки.
      const hero = await page.locator('main header').first().boundingBox();
      const facts = await section(page, dict.facts).boundingBox();
      expect(hero && facts).toBeTruthy();
      expect(facts!.y).toBeGreaterThanOrEqual(hero!.y + hero!.height - 1);
    });
  }
});

test.describe('Author page: markup and hreflang (F02-5, §20 п.5-6)', () => {
  for (const lang of SUPPORTED_LANGS) {
    test(`Person @id equals the one on the book page, three-step breadcrumbs, one @graph [${lang}]`, async ({
      page,
    }) => {
      await page.goto(authorUrl(lang, AUTHOR_SLUG.verne[lang]));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const scripts = await page.locator('script[type="application/ld+json"]').allTextContents();
      expect(scripts.filter((text) => '@graph' in JSON.parse(text))).toHaveLength(1);

      const nodes = await jsonLdNodes(page);
      const person = nodes.find(
        (node) => isType(node, 'Person') && node['name'] === VERNE_NAME[lang]
      );
      expect(person?.['@id']).toBeTruthy();

      const breadcrumb = nodes.find((node) => isType(node, 'BreadcrumbList'));
      expect(breadcrumb).toBeTruthy();
      expect((breadcrumb!['itemListElement'] as unknown[]).length).toBe(3);

      expect(nodes.some((node) => isType(node, 'ItemList'))).toBe(true);

      // Книга того же автора: её разметка ссылается на тот же `@id` автора.
      const bookHref = await page
        .locator(`main a[href^="/${lang}/book/"]`)
        .first()
        .getAttribute('href');
      expect(bookHref).toBeTruthy();
      await page.goto(bookHref as string);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      const bookNodes = await jsonLdNodes(page);
      const ids = bookNodes
        .filter((node) => typeof node['@id'] === 'string' && /\/author\//.test(node['@id']))
        .map((node) => node['@id']);
      // Сравниваются путь и якорь, а не адрес целиком: бэкенд и фронт берут происхождение
      // из своих настроек, и на раннере это разные хосты.
      const tail = (id: unknown) => String(id).replace(/^https?:\/\/[^/]+/, '');
      expect(ids.map(tail)).toContain(tail(person!['@id']));
    });
  }

  for (const lang of SUPPORTED_LANGS) {
    test(`hreflang of the page equals the sitemap entry of the same author [${lang}]`, async ({
      page,
      request,
    }) => {
      const url = authorUrl(lang, AUTHOR_SLUG.verne[lang]);
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

      const sitemap = await request.get(`/sitemaps/sitemap-authors-${lang}.xml`);
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

      // Пять языков и `x-default` - тем же набором, что в карте сайта (§18).
      const cluster = (rows: string[][]) =>
        rows
          .filter(
            ([code]) =>
              code === 'x-default' || (SUPPORTED_LANGS as readonly string[]).includes(code)
          )
          .sort((a, b) => a[0].localeCompare(b[0]));
      expect(cluster(onPage)).toEqual(cluster(inSitemap));
      expect(cluster(onPage).filter(([code]) => code !== 'x-default')).toHaveLength(
        SUPPORTED_LANGS.length
      );
    });
  }
});
