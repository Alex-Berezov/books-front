// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupportedLang } from '@/lib/i18n/lang';

/**
 * Срок данных GA (F01-6, подтверждён владельцем 14.10.2026) - число из `owner-facts.ts`, слово по
 * числу (`pluralize`; в ru формы под предлог «до» - родительный падеж). Сегодня там 2; здесь проверены и остальные формы, чтобы опечатка в форме
 * не всплыла на живой странице только при смене срока.
 */
const line = async (months: number, lang: SupportedLang) => {
  vi.resetModules();
  vi.doMock('@/lib/site/owner-facts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('@/lib/site/owner-facts')>()),
    retentionAnalyticsMonths: months,
  }));
  const { getLegalDocument } = await import('@/content/legal');
  const retention = getLegalDocument('privacy', lang).sections.find((s) => s.id === 'retention');
  return JSON.stringify(retention);
};

afterEach(() => {
  vi.doUnmock('@/lib/site/owner-facts');
});

describe('privacy: форма слова у срока данных GA', () => {
  it.each([
    [1, 'en', 'up to 1 month after'],
    [14, 'en', 'up to 14 months after'],
    [1, 'es', 'hasta 1 mes después'],
    [14, 'es', 'hasta 14 meses después'],
    [1, 'fr', 'jusqu’à 1 mois après'],
    [14, 'fr', 'jusqu’à 14 mois après'],
    [1, 'pt', 'até 1 mês após'],
    [14, 'pt', 'até 14 meses após'],
    [1, 'ru', 'до 1 месяца после'],
    [3, 'ru', 'до 3 месяцев после'],
    [14, 'ru', 'до 14 месяцев после'],
    [21, 'ru', 'до 21 месяца после'],
  ] as const)('%i, %s', async (months, lang, expected) => {
    expect(await line(months, lang)).toContain(expected);
  });
});
