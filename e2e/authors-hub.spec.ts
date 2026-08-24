import { test, expect } from '@playwright/test';

// ⚠️ Не гоняется в CI: `yarn e2e` требует живой бэкенд и запускается только по
// прямой просьбе (`books-front/CLAUDE.md`). Оформлено по образцу `e2e/public.spec.ts`.
test.describe('Authors hub', () => {
  test('opens the hub and shows author cards', async ({ page }) => {
    await page.goto('/ru/authors');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('a[href^="/ru/author/"]').first()).toBeVisible();
  });

  test('clicking a letter changes the address to the letter page', async ({ page }) => {
    await page.goto('/ru/authors');

    const letterLink = page.locator('a[href^="/ru/authors/letter/"]').first();
    await letterLink.waitFor();
    const href = await letterLink.getAttribute('href');
    await letterLink.click();

    await expect(page).toHaveURL(new RegExp(`${href}$`));
  });

  test('typing in the search box changes the address to ?search=', async ({ page }) => {
    await page.goto('/ru/authors');

    // По роли, а не по «первому полю с любым плейсхолдером»: появись на
    // странице другой инпут раньше в DOM — тест начал бы печатать не туда
    // и падал по таймауту адреса, а не по понятной причине.
    const searchInput = page.getByRole('searchbox');
    await searchInput.fill('толст');

    await expect(page).toHaveURL(/[?&]search=/, { timeout: 5000 });
  });

  test('a pagination link changes the address to ?page=2', async ({ page }) => {
    await page.goto('/ru/authors');

    // Ровно ссылка на вторую страницу: `name: /2/` совпал бы и с «22 книги»
    // в карточке автора.
    const pageTwoLink = page.getByRole('link', { name: `${'Страница'} 2` });
    await pageTwoLink.click();

    await expect(page).toHaveURL(/[?&]page=2/);
  });
});
