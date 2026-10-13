import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SummaryClient from '@/app/[lang]/summary/[bookSlug]/[versionId]/SummaryClient';

const state = vi.hoisted(() => ({
  pathname: '/ru/summary/hamlet/v1',
  title: 'Гамлет',
  summary: {
    data: undefined as unknown,
    isLoading: false,
    error: null as unknown,
  },
}));

vi.mock('next/navigation', () => ({
  usePathname: () => state.pathname,
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/hooks/usePublic', () => ({
  useBookOverview: () => ({
    data: { slug: 'hamlet', title: state.title },
    isLoading: false,
  }),
}));

vi.mock('@/api/hooks/useBookSummary', () => ({
  useBookSummary: () => state.summary,
}));

const UPDATED_AT = '2026-10-12T10:00:00.000Z';

/**
 * `F01-5`, `product.md` §6.1 и §9: под заголовком пересказа подпись «Редакция Bibliaris · Обновлено
 * <дата>» со ссылкой на `/editorial-policy#who`, а в разметке автор - редакция и дата изменения.
 */
describe('SummaryClient: подпись редакции и разметка', () => {
  beforeEach(() => {
    state.pathname = '/ru/summary/hamlet/v1';
    state.title = 'Гамлет';
    state.summary.data = { summary: '<p>Ключевые мысли</p>', updatedAt: UPDATED_AT };
    state.summary.isLoading = false;
    state.summary.error = null;
  });

  const renderClient = (lang = 'ru') =>
    render(<SummaryClient params={{ lang, bookSlug: 'hamlet', versionId: 'v1' }} />);

  const jsonLd = (container: HTMLElement) =>
    container.querySelector('script[type="application/ld+json"]');

  it('подпись сразу под заголовком: ссылка на #who и дата изменения пересказа', () => {
    const { container } = renderClient();

    const link = screen.getByRole('link', { name: 'Редакция Bibliaris' });
    expect(link.getAttribute('href')).toBe('/ru/editorial-policy#who');
    expect(link.parentElement?.textContent).toBe(
      'Редакция Bibliaris · Обновлено 12 октября 2026 г.'
    );
    expect(container.querySelector('h1')?.nextElementSibling).toBe(link.parentElement);
  });

  it('en: подпись и дата на языке страницы', () => {
    state.pathname = '/en/summary/hamlet/v1';
    renderClient('en');

    const link = screen.getByRole('link', { name: 'Bibliaris Editorial Team' });
    expect(link.getAttribute('href')).toBe('/en/editorial-policy#who');
    expect(link.parentElement?.textContent).toBe(
      'Bibliaris Editorial Team · Updated October 12, 2026'
    );
  });

  it('разметка Article: автор - редакция, dateModified из updatedAt', () => {
    const { container } = renderClient();

    const ld = JSON.parse(jsonLd(container)?.textContent ?? '{}') as Record<string, unknown>;
    expect(ld['@type']).toBe('Article');
    expect(ld.dateModified).toBe(UPDATED_AT);
    expect(ld.headline).toBe(container.querySelector('h1')?.textContent);
    expect(ld.author).toMatchObject({ '@type': 'Organization', name: 'Редакция Bibliaris' });
  });

  it.each([
    ['es', 'Actualizado el 12 de octubre de 2026'],
    ['fr', 'Mis à jour le 12 octobre 2026'],
    ['pt', 'Atualizado em 12 de outubro de 2026'],
  ])('%s: дата в подписи на языке страницы', (lang, expected) => {
    state.pathname = `/${lang}/summary/hamlet/v1`;
    const { container } = renderClient(lang);

    expect(
      container.querySelector('a[href$="/editorial-policy#who"]')?.parentElement?.textContent
    ).toContain(expected);
  });

  it('название книги с </script> не разрывает разметку', () => {
    state.title = 'Гамлет</script><script>alert(1)</script>';
    const { container } = renderClient();

    const script = jsonLd(container);
    expect(script?.innerHTML).not.toContain('</script>');
    expect(container.querySelectorAll('script')).toHaveLength(1);
  });

  it.each([
    ['без даты', { summary: '<p>Ключевые мысли</p>' }],
    ['с битой датой', { summary: '<p>Ключевые мысли</p>', updatedAt: 'не-дата' }],
  ])('%s - ни даты в подписи, ни разметки, ни «Invalid Date»', (_case, data) => {
    state.summary.data = data;
    const { container } = renderClient();

    expect(
      screen.getByRole('link', { name: 'Редакция Bibliaris' }).parentElement?.textContent
    ).toBe('Редакция Bibliaris');
    expect(jsonLd(container)).toBeNull();
    expect(container.textContent).not.toContain('Invalid Date');
  });
});
