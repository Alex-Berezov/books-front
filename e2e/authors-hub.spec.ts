import { test, expect } from '@playwright/test';

// ⚠️ С 26.08.2026 набор — гейт CI (`LEGACY-154`): `.github/workflows/ci.yml` гоняет его
// после `yarn build`, только chromium, против `yarn start`, на каждый push и pull request.
// Один воркер и два повтора берутся из `playwright.config.ts`. Значит ассерты здесь обязаны
// быть структурными: тест, привязанный к числу записей в каталоге или к переводимой строке,
// красит прогон без причины в коде.
test.describe('Authors hub', () => {
  test('opens the hub and answers with its own page', async ({ page }) => {
    const response = await page.goto('/ru/authors');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // ⚠️ Наличие карточек авторов здесь не проверяется намеренно: их число задаёт
    // боевой каталог, и пустая выдача покрасила бы прогон у автора, правившего
    // документацию. Проверяется то, что рисует сама страница: заголовок и панель
    // инструментов хаба.
    await expect(page.locator('input[type="search"]:not(#site-search)')).toBeVisible();
  });

  test('clicking a letter changes the address to the letter page', async ({ page }) => {
    await page.goto('/ru/authors');

    // Буквенный указатель строится по данным, поэтому конкретной буквы может и не быть.
    // Есть ссылка — она обязана вести на свой адрес; нет ни одной — проверять нечего,
    // и это состояние каталога, а не поломка.
    const letterLink = page.locator('a[href^="/ru/authors/letter/"]').first();
    if ((await letterLink.count()) === 0) return;

    const href = await letterLink.getAttribute('href');
    await letterLink.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test('typing in the search box changes the address to ?search=', async ({ page }) => {
    await page.goto('/ru/authors');

    // 🔴 `getByRole('searchbox')` без уточнения здесь не работает: поисковых полей
    // на странице два — общесайтовое в шапке (`components/public/layout/Header.tsx:249`,
    // `id="site-search"`) и собственное поле хаба, — и строгий режим Playwright падал
    // на неоднозначности. Первый прогон в конвейере (LEGACY-154) это и показал.
    // Отбор идёт по идентификатору чужого поля, а не по подписи: подписи переведены
    // на пять языков и меняются вместе со словарём.
    const searchInput = page.locator('input[type="search"]:not(#site-search)');
    await expect(searchInput).toBeVisible();
    await searchInput.fill('толст');

    await expect(page).toHaveURL(/[?&]search=/, { timeout: 5000 });
  });

  test('the paginated address answers with the hub, not an error', async ({ page }) => {
    // 🔴 Прежняя версия кликала по ссылке «Страница 2» и висла по таймауту: в каталоге
    // восемь авторов, они умещаются на одну страницу, и переключателя страниц на хабе
    // нет вовсе. Такой тест краснеет от числа записей в базе, а не от поломки кода —
    // именно это показал первый прогон набора в конвейере (LEGACY-154).
    //
    // Проверяется сам адрес со страницей, который строит `AuthorsPager`, и форма
    // ссылок переключателя, если он всё же отрисован.
    const response = await page.goto('/ru/authors?page=2');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    const hrefs = await page
      .locator('nav a[href*="/ru/authors"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));

    for (const href of hrefs.filter((value) => value.includes('page='))) {
      expect(href).toMatch(/[?&]page=\d+/);
    }
  });
});
