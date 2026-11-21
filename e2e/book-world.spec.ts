import { test, expect } from '@playwright/test';

/**
 * Приёмка «Мира книги» в настоящем браузере (`F08-3b`, `batches.md` F08-3 «Посадка», `product.md`
 * §3-§5, §16). Идёт против бэкенда с засеянной базой: книги приёмки заводит
 * `books/prisma/seed-world.ts` - служебные, с главами 1-3, `en` и `ru`:
 *
 * - `world-acceptance` - герои `anna-lark` (полный, `en` и `ru`), `tom-reed` (минимальный),
 *   `mira-vale` (`isIndexable=false`); 404 - `ned-fox` (скрыт), `sam-holt` (не прочитан),
 *   `lou-grey` (без ядра). У `en` есть аудиоглава 1, у главы 2 аудио нет;
 * - `anna-lark--tom-reed` (в `world-acceptance`) - пара героев `F08-8c`, только `en`, `isListed=true`:
 *   «коротко», четыре строки сравнения (Work, At the bridge, At the end, Who leads), общие главы 1-3,
 *   связи, различия, одна цитата Анны о Томе (глава 3), вывод, один вопрос; на `ru` пары нет - 404;
 * - `world-acceptance-noindex` - редакторский `noindex` книги: мир есть, но закрыт от индекса;
 * - `world-acceptance-hidden` - сущность скрыта: `/wiki` - 404.
 *
 * ⚠️ Слаги и тексты живут в сиде бэкенда (образ `ghcr.io/alex-berezov/books:latest`). Переименуешь
 * там - поправь здесь. Спека не пропускается, когда сида в образе ещё нет: красный прогон - сигнал,
 * что образ без `F08-3a`.
 */

const SLUG = {
  book: 'world-acceptance',
  noindex: 'world-acceptance-noindex',
  hidden: 'world-acceptance-hidden',
} as const;

const wikiUrl = (lang: string, slug: string) => `/${lang}/book/${slug}/wiki`;
const entityUrl = (lang: string, slug: string, key: string) => `${wikiUrl(lang, slug)}/${key}`;

const hreflangs = (page: import('@playwright/test').Page) =>
  page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((links) => links.map((l) => l.getAttribute('hreflang') ?? '').sort());

const robots = (page: import('@playwright/test').Page) =>
  page
    .locator('meta[name="robots"]')
    .evaluateAll((metas) => metas.map((m) => m.getAttribute('content') ?? ''));

test.describe('Book world: general page (F08-3b, §4)', () => {
  test('en: h1, public heroes as cards with links, hidden ones absent', async ({ page }) => {
    await page.goto(wikiUrl('en', SLUG.book));

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'World Acceptance: characters, places and world of the book'
    );
    for (const name of ['Anna Lark', 'Tom Reed', 'Mira Vale']) {
      await expect(page.getByRole('link', { name, exact: true })).toBeVisible();
    }
    for (const name of ['Ned Fox', 'Sam Holt', 'Lou Grey']) {
      await expect(page.getByText(name)).toHaveCount(0);
    }
    await expect(page.getByRole('link', { name: 'Anna Lark', exact: true })).toHaveAttribute(
      'href',
      entityUrl('en', SLUG.book, 'anna-lark')
    );
    await expect(page.getByRole('link', { name: 'Bibliaris Editorial Team' })).toHaveAttribute(
      'href',
      '/en/editorial-policy#world'
    );
  });

  test('ru: h1 by the Russian formula, only the hero that exists in ru', async ({ page }) => {
    await page.goto(wikiUrl('ru', SLUG.book));

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '«Приёмка мира книги»: мир книги — герои, места и понятия'
    );
    await expect(page.getByRole('link', { name: 'Анна Ларк', exact: true })).toBeVisible();
    await expect(page.getByText('Tom Reed')).toHaveCount(0);
  });

  test('the page is indexable and its hreflang lists exactly the two languages', async ({
    page,
  }) => {
    await page.goto(wikiUrl('en', SLUG.book));
    expect((await robots(page)).join(',')).not.toContain('noindex');
    expect(await hreflangs(page)).toEqual(['en', 'ru', 'x-default']);
  });

  // У книг сида нет анализа и пересказа (`seed-world.ts`), поэтому вход в мир проверяется
  // со страницы книги: серверная ссылка с развёрнутой подписью ведёт на общую страницу.
  test('the book page links to the book world', async ({ page }) => {
    await page.goto(`/en/book/${SLUG.book}`);
    await expect(
      page.getByRole('link', { name: 'Explore the world of World Acceptance', exact: true })
    ).toHaveAttribute('href', wikiUrl('en', SLUG.book));
  });

  test('text is in the server HTML', async ({ request }) => {
    const html = await (await request.get(wikiUrl('en', SLUG.book))).text();
    expect(html).toContain('A young mapmaker who leads the crossing.');
  });

  test('a book whose only entity is hidden answers 404', async ({ page }) => {
    const response = await page.goto(wikiUrl('en', SLUG.hidden));
    expect(response?.status()).toBe(404);
  });

  test('the editorial noindex of the book closes the world: noindex, follow, no hreflang', async ({
    page,
  }) => {
    const response = await page.goto(wikiUrl('en', SLUG.noindex));
    expect(response?.status()).toBe(200);
    const content = (await robots(page)).join(',');
    expect(content).toContain('noindex');
    expect(content).toContain('follow');
    expect(await hreflangs(page)).toEqual([]);
  });
});

test.describe('Book world: hero page (F08-3b, §5)', () => {
  test('full hero: h1, blocks in order, TOC equals the h2 list', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Anna Lark in World Acceptance: character analysis'
    );
    // Порядок §5 точным списком: у полного героя сида есть все блоки (`seed-world.ts`). Только
    // содержимое страницы: у подвала сайта свой скрытый h2 «Footer navigation» (`Footer.tsx`).
    const h2 = (
      await page.locator('main').getByRole('heading', { level: 2 }).allTextContents()
    ).filter((title) => title !== 'Bibliaris Editorial Team');
    expect(h2).toEqual([
      'About the character',
      'In brief',
      'Presence across the chapters',
      'Appearance',
      'Character',
      'Character path',
      'Key scenes',
      'Relationships',
      'Quotes',
      'The character in criticism',
      'Prototypes',
      'On screen and stage',
      'Sources',
      'Questions about Anna Lark',
      'Next',
    ]);
    const toc = await page
      .locator('nav[aria-labelledby="world-toc-title"] a')
      .evaluateAll((links) => links.map((a) => a.textContent));
    expect(toc).toEqual(h2);
  });

  test('scenes: "Read the scene" on both, "Listen" only where an audio chapter exists', async ({
    page,
  }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));

    const scenes = page.locator('#scenes');
    await expect(scenes.getByRole('link', { name: 'Read the scene' })).toHaveCount(2);
    await expect(scenes.getByRole('link', { name: 'Listen' })).toHaveCount(1);
    // «Слушать» ведёт в плеер на аудиоглаву с тем же номером (решение `F08 | F08-3` Q6).
    await expect(
      scenes.locator('li', { hasText: 'The map' }).getByRole('link', { name: 'Listen' })
    ).toHaveAttribute('href', `/en/book/${SLUG.book}/listen?chapter=1`);
    await expect(
      scenes.locator('li', { hasText: 'The bridge' }).getByRole('link', { name: 'Listen' })
    ).toHaveCount(0);
    await expect(scenes.getByRole('link', { name: 'Read the scene' }).first()).toHaveAttribute(
      'href',
      `/en/book/${SLUG.book}/read?chapter=1`
    );
  });

  // Читалка снимает `?chapter` с адреса, как только открыла главу (`useLinkedChapter`), поэтому
  // ждём адрес уже без параметра, а главу проверяем по содержимому (`books/prisma/seed-world.ts`:
  // «Chapter 1», первый абзац главы 1).
  test('a chapter link opens that chapter in the reader', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    await page.locator('#scenes').getByRole('link', { name: 'Read the scene' }).first().click();
    await expect(page).toHaveURL(new RegExp(`/en/book/${SLUG.book}/read$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chapter 1');
    await expect(page.getByText('Anna Lark opened the old map at dawn.')).toBeVisible();
  });

  test('"Listen" opens the player on the audio chapter of the scene', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    await page
      .locator('#scenes li', { hasText: 'The map' })
      .getByRole('link', { name: 'Listen' })
      .click();
    await expect(page).toHaveURL(new RegExp(`/en/book/${SLUG.book}/listen$`));
    await expect(page.getByText('Chapter 1', { exact: true })).toBeVisible();
  });

  test('the spoiler tag is only on the stage from the last third', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    const tags = page.locator('#path').getByText('Spoiler', { exact: true });
    await expect(tags).toHaveCount(1);
    await expect(page.locator('#path li', { hasText: 'The end' }).getByText('Spoiler')).toHaveCount(
      1
    );
  });

  test('presence strip: a cell per chapter and the "Chapters: 1–3" caption', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    await expect(page.locator('#presence ol > li')).toHaveCount(3);
    await expect(page.locator('#presence')).toContainText('Chapters: 1–3');
  });

  test('hreflang equals the two languages of the page; a ru page exists', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    expect(await hreflangs(page)).toEqual(['en', 'ru', 'x-default']);

    const ru = await page.goto(entityUrl('ru', SLUG.book, 'anna-lark'));
    expect(ru?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Анна Ларк в книге «Приёмка мира книги»: характеристика героя'
    );
  });

  test('minimal hero: blocks without data have neither heading nor TOC item', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'tom-reed'));

    const h2 = await page.locator('main').getByRole('heading', { level: 2 }).allTextContents();
    // «Коротко» - часть ядра (§3): без него страницы нет, и пустой список не засчитывается за успех.
    expect(h2).toContain('In brief');
    for (const absent of ['Appearance', 'Sources', 'On screen and stage', 'Prototypes']) {
      expect(h2).not.toContain(absent);
    }
    await expect(page.locator('#faq')).toHaveCount(0);
  });

  test('isIndexable=false: the page is open but noindex, follow and without hreflang', async ({
    page,
  }) => {
    const response = await page.goto(entityUrl('en', SLUG.book, 'mira-vale'));
    expect(response?.status()).toBe(200);
    const content = (await robots(page)).join(',');
    expect(content).toContain('noindex');
    expect(await hreflangs(page)).toEqual([]);
  });

  for (const key of ['ned-fox', 'sam-holt', 'lou-grey', 'nobody-here']) {
    test(`no page for "${key}": 404`, async ({ page }) => {
      const response = await page.goto(entityUrl('en', SLUG.book, key));
      expect(response?.status()).toBe(404);
    });
  }

  test('a key outside the format answers 404', async ({ page }) => {
    const response = await page.goto(entityUrl('en', SLUG.book, 'Bad_Key'));
    expect(response?.status()).toBe(404);
  });

  test('a page of a book with the editorial noindex is noindex, follow', async ({ page }) => {
    const response = await page.goto(entityUrl('en', SLUG.noindex, 'anna-lark'));
    expect(response?.status()).toBe(200);
    expect((await robots(page)).join(',')).toContain('noindex');
    expect(await hreflangs(page)).toEqual([]);
  });
});

const PAIR = 'anna-lark--tom-reed';

test.describe('Book world: pair page (F08-8c, §6)', () => {
  test('h1, blocks in order, TOC equals the h2 list', async ({ page }) => {
    const response = await page.goto(entityUrl('en', SLUG.book, PAIR));
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Anna Lark and Tom Reed: character comparison'
    );
    const h2 = (
      await page.locator('main').getByRole('heading', { level: 2 }).allTextContents()
    ).filter((title) => title !== 'Bibliaris Editorial Team');
    expect(h2).toEqual([
      'In brief',
      'Comparison',
      'Chapters they share',
      'What connects them',
      'What sets them apart',
      'Quotes about each other',
      'Conclusion',
      'Questions about Anna Lark and Tom Reed',
      'The characters',
    ]);
    const toc = await page
      .locator('nav[aria-labelledby="world-toc-title"] a')
      .evaluateAll((links) => links.map((a) => a.textContent));
    expect(toc).toEqual(h2);
  });

  test('comparison table: a row per feature, both heroes as columns, chapters open the reader', async ({
    page,
  }) => {
    await page.goto(entityUrl('en', SLUG.book, PAIR));
    const table = page.locator('#compare table');
    await expect(table.getByRole('columnheader')).toHaveText(['Feature', 'Anna Lark', 'Tom Reed']);
    await expect(table.locator('tbody tr')).toHaveCount(4);
    await expect(table.getByRole('rowheader', { name: 'Work' })).toBeVisible();
    await expect(table.getByRole('link', { name: 'Chapter 1' }).first()).toHaveAttribute(
      'href',
      `/en/book/${SLUG.book}/read?chapter=1`
    );
  });

  test('shared chapters, quote about each other and links to both heroes', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, PAIR));
    await expect(page.locator('#shared-chapters')).toContainText('Chapters: 1–3');
    await expect(page.locator('#quotes')).toContainText('Anna Lark → Tom Reed');
    const next = page.locator('#next');
    await expect(next.getByRole('link', { name: 'Anna Lark', exact: true })).toHaveAttribute(
      'href',
      entityUrl('en', SLUG.book, 'anna-lark')
    );
    await expect(next.getByRole('link', { name: 'Tom Reed', exact: true })).toHaveAttribute(
      'href',
      entityUrl('en', SLUG.book, 'tom-reed')
    );
  });

  test('text is in the server HTML and the page is indexable', async ({ page, request }) => {
    const html = await (await request.get(entityUrl('en', SLUG.book, PAIR))).text();
    expect(html).toContain('Service text: the crossing binds them.');
    await page.goto(entityUrl('en', SLUG.book, PAIR));
    expect((await robots(page)).join(',')).not.toContain('noindex');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      new RegExp(`/en/book/${SLUG.book}/wiki/${PAIR}$`)
    );
  });

  test('the hero page links to the pair from its own row in the relationships', async ({
    page,
  }) => {
    await page.goto(entityUrl('en', SLUG.book, 'anna-lark'));
    const link = page.locator('#relations').getByRole('link', { name: /^Compare / });
    await expect(link).toHaveCount(1);
    await expect(link).toHaveText('Compare Anna Lark and Tom Reed');
    await expect(link).toHaveAttribute('href', entityUrl('en', SLUG.book, PAIR));
    await link.click();
    await expect(page).toHaveURL(new RegExp(`/wiki/${PAIR}$`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Anna Lark and Tom Reed: character comparison'
    );
  });

  test('the partner page links to the same pair (key in alphabetical order)', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, 'tom-reed'));
    // Публичная пара героя - своей строкой «Отношений», ровно одна, с теми же именами в порядке ключа.
    const links = page.locator('#relations').getByRole('link', { name: /^Compare / });
    await expect(links).toHaveCount(1);
    await expect(links).toHaveText('Compare Anna Lark and Tom Reed');
    await expect(links).toHaveAttribute('href', entityUrl('en', SLUG.book, PAIR));
  });

  test('the pair is not among the heroes of the general page and the book page', async ({
    page,
  }) => {
    await page.goto(wikiUrl('en', SLUG.book));
    await expect(page.locator('#characters a[href$="--tom-reed"]')).toHaveCount(0);
    await expect(page.locator(`a[href$="/wiki/${PAIR}"]`)).toHaveCount(0);
    await page.goto(`/en/book/${SLUG.book}`);
    await expect(page.locator(`a[href$="/wiki/${PAIR}"]`)).toHaveCount(0);
  });

  test('no ru page: the pair exists only in en', async ({ page }) => {
    const response = await page.goto(entityUrl('ru', SLUG.book, PAIR));
    expect(response?.status()).toBe(404);
  });

  // Итог адреса, а не ветка: 404 отдаёт бэкенд или страница (`canonicalPairMembers`); ветку фронта
  // держит `__tests__/app/bookWorldPairPage.test.tsx` (неканонический ключ при ответе ручки).
  test('the key not in alphabetical order answers 404', async ({ page }) => {
    const response = await page.goto(entityUrl('en', SLUG.book, 'tom-reed--anna-lark'));
    expect(response?.status()).toBe(404);
  });
});

test.describe('Book world: phone width (F08-3b, §1 п.8)', () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test('pair page: the table is stacked, each cell is labelled with its hero', async ({ page }) => {
    await page.goto(entityUrl('en', SLUG.book, PAIR));
    const cell = page.locator('#compare tbody tr').first().locator('td').first();
    await expect(cell).toBeVisible();
    expect(await cell.evaluate((td) => getComputedStyle(td).display)).toBe('block');
    expect(await cell.getAttribute('data-label')).toBe('Anna Lark');
    // Шапка таблицы на узком экране скрыта приёмом sr-only: глазу её нет (не больше 1×1 px) - подпись
    // героя в самой ячейке; для чтения с экрана она остаётся - заголовки столбцов в дереве доступности.
    // Способ скрытия (clip, clip-path) не утверждается: проверяется итог. `toBeInViewport` этого не видит.
    const thead = page.locator('#compare thead');
    const box = await thead.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.width ?? Infinity).toBeLessThanOrEqual(1);
    expect(box?.height ?? Infinity).toBeLessThanOrEqual(1);
    const table = page.locator('#compare table');
    for (const name of ['Anna Lark', 'Tom Reed']) {
      await expect(table.getByRole('columnheader', { name, exact: true })).toHaveCount(1);
    }
  });

  for (const [name, url] of [
    ['general page', wikiUrl('en', SLUG.book)],
    ['hero page', entityUrl('en', SLUG.book, 'anna-lark')],
    ['pair page', entityUrl('en', SLUG.book, PAIR)],
  ] as const) {
    test(`${name}: no horizontal scroll`, async ({ page }) => {
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

      const overflow = await page.evaluate(() =>
        Math.max(
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
          document.body.scrollWidth - document.documentElement.clientWidth
        )
      );
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});
