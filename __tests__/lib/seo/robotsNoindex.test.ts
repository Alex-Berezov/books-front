import { describe, expect, it } from 'vitest';
import { robotsHasNoindex } from '@/lib/seo/robots-noindex';

// Набор случаев - тот же, что у бэкендового `robotsHasNoindex`
// (`books/src/shared/seo/term-indexable.util.spec.ts`): страница раздела и карта разделов
// обязаны читать поле Robots одинаково (F04 `tech.md` §4).
describe('robotsHasNoindex (фронтовая копия бэкендового правила)', () => {
  it.each([
    'noindex',
    'noindex, follow',
    'NOINDEX,NOFOLLOW',
    'NoIndex, follow',
    ' none ',
    'none',
    'index, noindex',
    'noindex nofollow',
    'googlebot: noindex',
    'googlebot:noindex',
    'index, googlebot: none',
    'max-image-preview:none noindex',
    'unavailable_after: 25 Jun 2026 15:00:00 PST, noindex',
    'unavailable_after: 2026-12-31 noindex',
    'unavailable_after: 2026-12-31 none',
  ])('«%s» закрывает', (robots) => {
    expect(robotsHasNoindex(robots)).toBe(true);
  });

  it.each([
    null,
    undefined,
    '',
    'index, follow',
    'index, nofollow',
    'noindexed',
    'nonee',
    'max-snippet:-1, index',
    'googlebot: index follow',
    'unavailable_after: 2026-01-01',
    'index, follow, max-image-preview:none',
    'index, max-image-preview: none',
    'googlebot: max-image-preview:none',
    'unavailable_after: 25 Jun 2026 15:00:00 PST',
  ])('«%s» не закрывает', (robots) => {
    expect(robotsHasNoindex(robots)).toBe(false);
  });
});
