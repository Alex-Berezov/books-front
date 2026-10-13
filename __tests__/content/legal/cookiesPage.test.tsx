import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LegalPage } from '@/components/public/legal/LegalPage';
import { getLegalDocument } from '@/content/legal';
import { ConsentProvider } from '@/lib/consent/ConsentProvider';
import { COOKIE_INVENTORY } from '@/lib/consent/cookie-inventory';
import { SUPPORTED_LANGS, type SupportedLang } from '@/lib/i18n/lang';

/**
 * Страница `/cookies` (`F01-3`, `product.md` §8): каркас правовой страницы с оглавлением, семь
 * разделов, таблица только из перечня, блок «Ваш выбор», ссылка на `/contact` (решение арбитра
 * 13.10.2026: появилась в F01-4).
 */

const nav = { pathname: '/en/cookies' };
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => nav.pathname,
}));

const mount = (lang: SupportedLang) => {
  nav.pathname = `/${lang}/cookies`;
  return render(
    <ConsentProvider>
      <LegalPage document={getLegalDocument('cookies', lang)} />
    </ConsentProvider>
  );
};

describe('/cookies: метаданные маршрута', () => {
  it.each(SUPPORTED_LANGS)(
    '%s: заголовок и описание из документа, canonical на свой /cookies',
    async (lang) => {
      const { generateMetadata } = await import('@/app/[lang]/cookies/page');
      const metadata = await generateMetadata({ params: Promise.resolve({ lang }) });
      const doc = getLegalDocument('cookies', lang);
      expect(metadata.title).toBe(doc.metaTitle);
      expect(metadata.description).toBe(doc.metaDescription);
      expect(String(metadata.alternates?.canonical)).toMatch(new RegExp(`/${lang}/cookies$`));
    }
  );
});

describe('/cookies', () => {
  beforeEach(() => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ consentRequired: false }) })
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each(SUPPORTED_LANGS)('%s: один h1, семь разделов и оглавление с якорями на них', (lang) => {
    mount(lang);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    const headings = screen.getAllByRole('heading', { level: 2 });
    expect(headings).toHaveLength(7);

    const doc = getLegalDocument('cookies', lang);
    const toc = screen.getByRole('navigation');
    const anchors = within(toc)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'));
    expect(anchors).toEqual(doc.sections.map((section) => `#${section.id}`));
    expect(headings.map((heading) => heading.id)).toEqual(
      doc.sections.map((section) => section.id)
    );
  });

  it.each(SUPPORTED_LANGS)('%s: таблица - ровно перечень, без сырых ключей словаря', (lang) => {
    mount(lang);
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1);
    expect(rows).toHaveLength(COOKIE_INVENTORY.length);
    expect(rows.map((row) => row.querySelector('code')?.textContent)).toEqual(
      COOKIE_INVENTORY.map((entry) => entry.name)
    );
    expect(screen.getByRole('table').textContent).not.toMatch(
      /\b(inventory|duration|provider|category)\b|necessary|sevenDays|twoYears/
    );
  });

  it('блок «Ваш выбор» стоит в разделе 5', () => {
    mount('en');
    const section5 = screen.getByRole('heading', { level: 2, name: /^5\./ }).closest('section')!;
    expect(within(section5).getByTestId('consent-choice')).toBeTruthy();
  });

  it.each(SUPPORTED_LANGS)('%s: ссылки - на свои /privacy и /contact, почту и Google', (lang) => {
    const { container } = mount(lang);
    const hrefs = Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain(`/${lang}/privacy`);
    expect(hrefs).toContain('mailto:support@bibliaris.com');
    expect(hrefs).toContain(`/${lang}/contact`);

    const external = Array.from(container.querySelectorAll('a[target="_blank"]'));
    expect(external).toHaveLength(1);
    expect(external[0].getAttribute('rel')).toBe('noopener noreferrer');
    expect(external[0].getAttribute('href')).toMatch(/^https:\/\/policies\.google\.com\//);
  });
});
