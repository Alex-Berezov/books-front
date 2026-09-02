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

    // 🔴 До 02.09.2026 здесь стояла ветка раннего выхода: «нет ни одной ссылки —
    // проверять нечего». Она была написана под прогон против боевого каталога,
    // где буквы есть всегда. С 28.08.2026 набор идёт против своего бэкенда на пустой
    // базе, ветка стала выбираться каждый раз, и тест зеленел, не проверив ничего
    // (`LEGACY-294`). Теперь конвейер сеет базу перед прогоном, и отсутствие ссылок —
    // это поломка, а не состояние каталога: указатель рисует ссылку на каждую букву
    // с непустым счётчиком, а сид даёт как минимум одну такую.
    const letterLink = page.locator('a[href^="/ru/authors/letter/"]').first();
    await expect(letterLink).toBeVisible();

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

    // 🔴 Вторая молчаливая ветка того же рода (`LEGACY-294`): на пустом каталоге
    // список ссылок был пуст, тело цикла не исполнялось ни разу, и тест проходил
    // без единого ассерта.
    //
    // ⚠️ Считать `nav a[href*="/ru/authors"]` для этого нельзя: под локатор попадает
    // ссылка «Авторы» в футере (`components/public/layout/Footer.tsx:32-82`), которая
    // рисуется на каждой странице сайта независимо от каталога. Такой ассерт истинен
    // всегда и не проверяет ничего — то же самое молчание, только прикрытое зелёным.
    //
    // Проверяется буквенный указатель: он строится по данным, и `AuthorsAlphabet`
    // рисует ссылку только у буквы с непустым счётчиком, а сид даёт как минимум одну.
    await expect(page.locator('a[href^="/ru/authors/letter/"]').first()).toBeVisible();

    // ⚠️ Про переключатель страниц утверждения нет намеренно: при текущем наполнении
    // сида авторов меньше страницы (`PUBLIC_AUTHORS_DEFAULT_LIMIT` = 24), и `AuthorsPager`
    // не рисуется вовсе. Требовать его значило бы привязать тест к числу записей
    // в каталоге - ровно то, из-за чего этот набор уже краснел (`LEGACY-154`).
    // Здесь проверяется только форма тех ссылок со страницей, что отрисованы.
    const hrefs = await page
      .locator('nav a[href*="/ru/authors"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));

    for (const href of hrefs.filter((value) => value.includes('page='))) {
      expect(href).toMatch(/[?&]page=\d+/);
    }
  });
});
