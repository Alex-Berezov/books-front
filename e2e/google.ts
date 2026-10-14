import type { Page } from '@playwright/test';

/**
 * Запросы к Google (тег и сбор). Сборка e2e идёт с тестовым `NEXT_PUBLIC_GA_MEASUREMENT_ID`
 * (решение арбитра 13.10.2026): GA на странице настоящий, но в сеть раннер не ходит — запросы
 * перехватываются и считаются здесь, одним списком на все спеки.
 */
const GOOGLE_PATTERNS = ['**/*googletagmanager.com/**', '**/*google-analytics.com/**'];

/** Перехватывает запросы к Google пустым скриптом и считает их. */
export const countGoogle = async (page: Page) => {
  const hits = { count: 0 };
  for (const pattern of GOOGLE_PATTERNS) {
    await page.route(pattern, (route) => {
      hits.count += 1;
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    });
  }
  return hits;
};
