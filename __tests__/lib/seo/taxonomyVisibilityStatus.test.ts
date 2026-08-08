import { describe, expect, it } from 'vitest';
import { getTaxonomyVisibilityStatus } from '@/lib/seo/taxonomy-visibility-status';

/**
 * Статус в админке обязан совпадать с тем, что страница термина реально отдаёт в
 * robots. Отдельная арифметика здесь была бы четвёртым независимым мнением об
 * индексируемости — тем самым расхождением, из-за которого noindex-страницы
 * попадали во внутреннюю перелинковку (LEGACY-067, LEGACY-069).
 *
 * Главное, что здесь закреплено: **переключатели умеют только закрывать**.
 * Термин без книг или с закрытым гистерезисом остаётся вне индекса при обеих
 * галочках, поднятых в «разрешено».
 */
const open = { isVisible: true, indexable: true, autoIndexable: true, langBookCount: 7 };

describe('getTaxonomyVisibilityStatus', () => {
  it('reports an open term as indexed', () => {
    const status = getTaxonomyVisibilityStatus(open);
    expect(status.state).toBe('indexed');
    expect(status.linkable).toBe(true);
  });

  it('reports the editorial hide first — it is the strongest signal', () => {
    const status = getTaxonomyVisibilityStatus({ ...open, isVisible: false });
    expect(status.state).toBe('hidden');
    expect(status.linkable).toBe(false);
  });

  it('reports a manual noindex separately from hiding', () => {
    const status = getTaxonomyVisibilityStatus({ ...open, indexable: false });
    expect(status.state).toBe('noindex');
    expect(status.linkable).toBe(false);
  });

  it('does not let the switches open an empty term', () => {
    const status = getTaxonomyVisibilityStatus({ ...open, langBookCount: 0 });
    expect(status.state).toBe('empty');
    expect(status.linkable).toBe(false);
  });

  it('does not let the switches open a term the hysteresis keeps closed', () => {
    const status = getTaxonomyVisibilityStatus({
      ...open,
      autoIndexable: false,
      langBookCount: 3,
    });
    expect(status.state).toBe('auto-closed');
    expect(status.linkable).toBe(false);
    // Порог назван в подсказке: редактор должен понимать, чего не хватает.
    expect(status.detail).toContain('3 book');
  });

  it('says there is no page when the term has no translation into the language', () => {
    // `autoIndexable` приходит только при запросе с `?lang`; его отсутствие при
    // таком запросе означает «перевода на этот язык нет», а не «всё в порядке».
    const status = getTaxonomyVisibilityStatus({
      isVisible: true,
      indexable: true,
      autoIndexable: undefined,
      langBookCount: undefined,
    });
    expect(status.state).toBe('no-translation');
    expect(status.linkable).toBe(false);
  });
});
