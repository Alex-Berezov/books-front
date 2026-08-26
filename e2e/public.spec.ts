import { test, expect } from '@playwright/test';

/**
 * 🔴 LEGACY-153. Прежняя версия спека была написана под заготовку главной страницы,
 * исчезнувшую задолго до 26.02.2026: она ждала заголовок «Welcome to Bibliaris»
 * (эта строка есть только в админке, `app/admin/[lang]/page.tsx`), текст
 * «Current language: EN» (его нет нигде), триггер переключателя языка селектором
 * `div[aria-label="Select language"]` (реальный триггер — `<button>`, и его метка
 * переведена на пять языков) и адрес `/en/books/{slug}`, которого в `app/[lang]/`
 * не существует. Четвёртый тест не проверял вообще ничего: все ожидания были
 * закомментированы, остался `console.log`.
 *
 * Незаметно это было потому, что набор не запускался ни в одном конвейере
 * (`LEGACY-154`): два дефекта прикрывали друг друга.
 *
 * ⚠️ Переводимых строк здесь нет намеренно — ни одной. Ожидания опираются только
 * на структуру: код ответа, роли и адреса ссылок. Словари проверяются юнитами,
 * а спек, привязанный к тексту, краснеет от правки перевода, а не от поломки
 * страницы.
 */
test.describe('Public Area', () => {
  test('should redirect from root to default language', async ({ page }) => {
    const response = await page.goto('/');

    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/en(\/|$)/);
  });

  test('home page answers 200 and renders its own navigation', async ({ page }) => {
    const response = await page.goto('/en');

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // ⚠️ Проверяются ссылки, которые страница рисует **всегда**, а не карточки книг.
    // Соблазн потребовать `a[href^="/en/book/"]` велик — казалось бы, дешёвая посадка
    // для LEGACY-103, — но она бы не работала: главная статическая
    // (`app/[lang]/page.tsx:25`, `revalidate = 300`), содержимое печётся на шаге
    // `yarn build` того же прогона, и все семь запросов там закрыты `.catch(() => null)`.
    // То есть тест перепроверял бы снимок, который уже сделала сборка, зато краснел бы
    // на каждом чужом PR, если апстрим моргнул или редактор снял с публикации
    // последнюю английскую книгу. Отличить это от поломки кода по отчёту невозможно.
    // ⚠️ Ссылка на каталог — единственная на главной, которая рисуется безусловно
    // (`HomePageContent.tsx:178`, кнопка героя). Соседняя на аудиокниги висит на
    // `audiobooksCount > 0` (строка 181), разделы категорий, жанров и авторов — на
    // непустых списках. Любая из них в ассерте вернула бы зависимость от каталога,
    // ради снятия которой этот тест и переписан.
    await expect(page.locator('a[href="/en/catalog"]').first()).toBeVisible();
  });

  test('language switcher takes the visitor to another language', async ({ page }) => {
    await page.goto('/en');

    const trigger = page.locator('button[aria-haspopup="listbox"]');
    await expect(trigger).toBeVisible();
    await trigger.click();

    // Пункт выбирается по адресу назначения, а не по подписи: подписи локализованы
    // и меняются вместе со словарём.
    const spanish = page.getByRole('option').filter({ hasText: /es/i }).first();
    await spanish.click();

    await expect(page).toHaveURL(/\/es(\/|$)/);
  });

  test('the catalog link from the home page opens the catalog', async ({ page }) => {
    await page.goto('/en');

    await page.locator('a[href="/en/catalog"]').first().click();

    await expect(page).toHaveURL(/\/en\/catalog(\?|$)/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
