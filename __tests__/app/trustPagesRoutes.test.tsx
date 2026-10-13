import { render } from '@testing-library/react';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationJsonLd } from '@/components/public/seo/OrganizationJsonLd';
import { getLegalDocument } from '@/content/legal';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';

/**
 * Маршруты страниц доверия (`F01-4`): метаданные из документа своей страницы и языка, разметка
 * организации на главной и `/about` (`product.md` §9).
 */

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/en/about',
}));

const routes = {
  about: () => import('@/app/[lang]/about/page'),
  contact: () => import('@/app/[lang]/contact/page'),
  'editorial-policy': () => import('@/app/[lang]/editorial-policy/page'),
} as const;

const ldTypes = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('script[type="application/ld+json"]')).map(
    (node) => (JSON.parse(node.textContent ?? '') as Record<string, unknown>)['@type']
  );

describe('страницы доверия: метаданные', () => {
  for (const [page, load] of Object.entries(routes)) {
    it.each(SUPPORTED_LANGS)(
      `/%s/${page}: заголовок, описание, canonical и языки своей страницы`,
      async (lang) => {
        const { generateMetadata } = await load();
        const meta = await generateMetadata({ params: Promise.resolve({ lang }) });
        const doc = getLegalDocument(page as keyof typeof routes, lang);
        expect(meta.title).toBe(doc.metaTitle);
        expect(meta.description).toBe(doc.metaDescription);
        expect(String(meta.alternates?.canonical)).toMatch(new RegExp(`/${lang}/${page}$`));
        // Кластер языков: каждый из пяти ведёт на ту же страницу своего языка.
        const languages = (meta.alternates?.languages ?? {}) as Record<string, string>;
        for (const other of SUPPORTED_LANGS) {
          expect(String(languages[other])).toMatch(new RegExp(`/${other}/${page}$`));
        }
      }
    );
  }
});

describe('разметка организации', () => {
  it('компонент выводит Organization и WebSite на языке страницы', () => {
    const { container } = render(<OrganizationJsonLd lang="ru" />);
    expect(ldTypes(container)).toEqual(['Organization', 'WebSite']);
    const site = container.querySelectorAll('script[type="application/ld+json"]')[1];
    expect(JSON.stringify(JSON.parse(site.textContent ?? ''))).toContain('/ru/catalog?q=');
  });

  it('/about выводит Organization и WebSite', async () => {
    const { default: AboutPage } = await routes.about();
    const { container } = render(await AboutPage({ params: Promise.resolve({ lang: 'fr' }) }));
    expect(ldTypes(container)).toEqual(['Organization', 'WebSite']);
  });

  it.each(['contact', 'editorial-policy'] as const)(
    '/%s разметку организации не выводит',
    async (page) => {
      const { default: Page } = await routes[page]();
      const { container } = render(await Page({ params: Promise.resolve({ lang: 'en' }) }));
      expect(ldTypes(container)).toEqual([]);
    }
  );

  // Главная тянет полтора десятка запросов к API: её рендер здесь не поднимается, а вывод
  // проверяется по JSX - элемент стоит в возвращаемом дереве перед содержимым, а не в комментарии
  // и не под условием. Рендер в браузере - `e2e/trust-pages.spec.ts` (главная и `/about`).
  it('главная выводит разметку организации', () => {
    const source = fs.readFileSync(path.resolve(__dirname, '../../app/[lang]/page.tsx'), 'utf8');
    expect(source).toMatch(/<OrganizationJsonLd lang=\{supportedLang\} \/>\s*<HomePageContent/);
  });
});
