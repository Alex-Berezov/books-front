import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Footer } from '@/components/public/layout/Footer';
import { ConsentProvider } from '@/lib/consent/ConsentProvider';
import { getDictionary } from '@/lib/i18n/dictionaries';

/**
 * Подвал, группа «Правовая информация» (`F01-3`, `product.md` §2): privacy, terms, cookies и кнопка
 * «Настройки cookie» по порядку; группа «О проекте» (`F01-4`): О нас, Редакционная политика,
 * Контакты по порядку; `/deletion` в подвал не выводится.
 */

vi.mock('next/navigation', () => ({ usePathname: () => '/ru/catalog' }));

const answer = (consentRequired: boolean) =>
  vi.fn().mockResolvedValue({ ok: true, json: async () => ({ consentRequired }) });

const mount = () =>
  render(
    <ConsentProvider>
      <Footer />
    </ConsentProvider>
  );

const aboutNav = () => screen.getByRole('navigation', { name: 'О проекте' });
const legalNav = () => screen.getByRole('navigation', { name: 'Правовая информация' });

describe('подвал: правовая информация', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('страна плашки: четыре ссылки и кнопка «Настройки cookie» по порядку', async () => {
    vi.stubGlobal('fetch', answer(true));
    mount();
    await waitFor(() =>
      expect(within(legalNav()).queryByRole('button', { name: 'Настройки cookie' })).not.toBeNull()
    );
    const items = within(legalNav())
      .getAllByRole('listitem')
      .map((item) => {
        const link = item.querySelector('a');
        return link ? link.getAttribute('href') : `button:${item.textContent}`;
      });
    expect(items).toEqual([
      '/ru/privacy',
      '/ru/terms',
      '/ru/cookies',
      '/ru/legal-notice',
      'button:Настройки cookie',
    ]);
  });

  it('остальные страны без выбора: кнопки нет, пустого пункта списка нет', async () => {
    const fetchMock = answer(false);
    vi.stubGlobal('fetch', fetchMock);
    mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    // Ответ о регионе дошёл до провайдера и отрендерен - кнопка так и не появилась.
    await act(async () => {});
    expect(within(legalNav()).queryByRole('button')).toBeNull();
    expect(within(legalNav()).getAllByRole('listitem')).toHaveLength(4);
  });

  it('группа «О проекте»: три ссылки по порядку', async () => {
    vi.stubGlobal('fetch', answer(false));
    mount();
    const hrefs = within(aboutNav())
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(hrefs).toEqual(['/ru/about', '/ru/editorial-policy', '/ru/contact']);
    expect(
      within(aboutNav())
        .getAllByRole('link')
        .map((link) => link.textContent)
    ).toEqual(['О нас', 'Редакционная политика', 'Контакты']);
  });

  it.each(['en', 'es', 'fr', 'pt', 'ru'] as const)(
    '%s: подписи группы «О проекте» не пустые',
    (lang) => {
      const footer = getDictionary(lang).footer;
      for (const label of [
        footer.groupAbout,
        footer.about,
        footer.editorialPolicy,
        footer.contact,
      ]) {
        expect(label.trim()).not.toBe('');
      }
    }
  );

  it('ссылки на /deletion в подвале нет', async () => {
    const fetchMock = answer(false);
    vi.stubGlobal('fetch', fetchMock);
    const { container } = mount();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).not.toContain('/ru/deletion');
    expect(hrefs.filter((href) => href === '/ru/privacy')).toHaveLength(1);
  });
});
