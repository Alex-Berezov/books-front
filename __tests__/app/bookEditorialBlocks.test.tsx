import { render } from '@testing-library/react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * `F01-5`, `product.md` §6.1-6.2: страница книги несёт подпись «Описание подготовлено редакцией
 * Bibliaris» без даты и блок «Об издании» из полей активной версии. Страница собирается целиком,
 * клиентские острова и сетевые запросы заменены заглушками.
 */

const mocks = vi.hoisted(() => ({
  getCachedBookOverview: vi.fn(),
  getCachedBookSeo: vi.fn(),
  getCachedBookAnalysis: vi.fn(),
  extraDetailsProps: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND');
  },
  permanentRedirect: () => {
    throw new Error('NEXT_REDIRECT');
  },
  usePathname: () => '/ru/book/crime',
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/app/[lang]/book/[slug]/bookData', () => ({
  getCachedBookOverview: mocks.getCachedBookOverview,
  getCachedBookSeo: mocks.getCachedBookSeo,
}));

vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: vi.fn() }));

vi.mock('@/app/[lang]/book/[slug]/analysis/analysisData', () => ({
  getCachedBookAnalysis: mocks.getCachedBookAnalysis,
}));

vi.mock('@/app/[lang]/book/[slug]/BookClientIslands', () => ({
  BookActions: () => null,
  BookExtraDetails: (props: unknown) => {
    mocks.extraDetailsProps(props);
    return null;
  },
  BookRating: () => null,
  BookReviews: () => null,
}));

vi.mock('@/app/[lang]/book/[slug]/RelatedBooksSection', () => ({
  RelatedBooksSection: () => null,
}));

vi.mock('@/app/[lang]/book/[slug]/BookTaxonomyChips', () => ({
  BookTaxonomyChips: () => null,
}));

vi.mock('@/components/public/navigation/SmartBackButton', () => ({
  SmartBackButton: () => null,
}));

const MODULE_LOAD_TIMEOUT_MS = 60_000;

const overview = (versionExtra: Record<string, unknown>, top: Record<string, unknown> = {}) => ({
  id: 'b1',
  slug: 'crime',
  title: 'Преступление и наказание',
  author: 'Достоевский',
  description: '<p>Описание</p>',
  categories: [],
  tags: [],
  language: 'ru',
  versionIds: { text: 'v1' },
  versions: [
    {
      id: 'v1',
      type: 'text',
      isFree: true,
      title: 'Преступление и наказание',
      translators: [],
      ...versionExtra,
    },
  ],
  ...top,
});

describe('страница книги: подпись редакции и «Об издании»', () => {
  let page: (typeof import('@/app/[lang]/book/[slug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/book/[slug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  beforeEach(() => {
    vi.clearAllMocks();
    // Реализация от прошлого теста не переезжает в следующий: по умолчанию анализа нет.
    mocks.getCachedBookAnalysis.mockReset();
    mocks.getCachedBookAnalysis.mockResolvedValue(null);
    mocks.getCachedBookSeo.mockResolvedValue(null);
  });

  const renderPage = async () => {
    const ui = await page({ params: Promise.resolve({ lang: 'ru', slug: 'crime' }) });
    return render(ui);
  };

  it('подпись со ссылкой на #who, без даты', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(overview({}));

    const { container } = await renderPage();

    const link = container.querySelector('a[href="/ru/editorial-policy#who"]');
    expect(link?.textContent).toBe('редакцией Bibliaris');
    expect(link?.parentElement?.textContent).toBe('Описание подготовлено редакцией Bibliaris');
  });

  it('«Об издании»: переводчики из версии, постоянная строка ведёт на #sources', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview(
        { translators: [{ name: 'Констанс Гарнетт' }], originalLanguage: 'en' },
        { firstPublishedYear: 1866 }
      )
    );

    const { container } = await renderPage();

    const block = container.querySelector('section[aria-labelledby="edition-notes-title"]');
    expect(block?.textContent).toContain('Впервые опубликовано: 1866');
    expect(block?.textContent).toContain('Язык оригинала: английский');
    expect(block?.textContent).toContain('Перевод: Констанс Гарнетт');
    expect(block?.querySelector('a[href="/ru/editorial-policy#sources"]')).not.toBeNull();
    // Решение арбитра `F01 | F01-5`: эти факты живут только в «Об издании», без дубля в списке свойств.
    const text = container.textContent ?? '';
    expect(text.split('Впервые опубликовано').length - 1).toBe(1);
    expect(text.split('Язык оригинала').length - 1).toBe(1);
    expect(text).not.toContain('Оригинальный язык');
  });

  it('нет описания - нет и подписи «Описание подготовлено»', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({}, { description: '', firstPublishedYear: 1866 })
    );

    const { container } = await renderPage();

    expect(container.querySelector('a[href="/ru/editorial-policy#who"]')).toBeNull();
    expect(container.textContent).not.toContain('Описание подготовлено');
  });

  it('переводчиков нет (translators: []): блок живёт на остальных строках', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(overview({}, { firstPublishedYear: 1866 }));

    const { container } = await renderPage();

    const block = container.querySelector('section[aria-labelledby="edition-notes-title"]');
    expect(block?.textContent).toContain('Впервые опубликовано: 1866');
    expect(block?.textContent).not.toContain('Перевод:');
  });

  it('название в оригинале сверяется с показанным названием версии', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({ originalTitle: 'Преступление и наказание', originalLanguage: 'ru' })
    );

    const { container } = await renderPage();

    const block = container.querySelector('section[aria-labelledby="edition-notes-title"]');
    expect(block?.textContent).toContain('Язык оригинала: русский');
    expect(block?.textContent).not.toContain('Название в оригинале');
  });

  it('нет ни одного поля издания - блока «Об издании» нет, подпись остаётся', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(overview({}));

    const { container } = await renderPage();

    expect(container.querySelector('section[aria-labelledby="edition-notes-title"]')).toBeNull();
    expect(container.querySelector('a[href="/ru/editorial-policy#who"]')).not.toBeNull();
  });

  // Серверная ссылка на пересказ (17.10.2026): только пересказ версии языка страницы - пересказ
  // другого языка дал бы ссылку на `/ru/.../summary`, отвечающую 404.
  it('ссылка на пересказ ведёт на /book/{slug}/summary, когда пересказ есть на языке страницы', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({ language: 'ru', _count: { chapters: 1, audioChapters: 0, summaries: 1 } })
    );

    const { container } = await renderPage();

    const link = container.querySelector('a[href="/ru/book/crime/summary"]');
    expect(link?.textContent).toBe('Краткое содержание «Преступление и наказание»');
  });

  it('пересказ только на другом языке - ссылки нет', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview(
        { language: 'en', _count: { chapters: 1, audioChapters: 0, summaries: 1 } },
        { versionIds: { text: 'v1' } }
      )
    );

    const { container } = await renderPage();

    expect(container.querySelector('a[href$="/summary"]')).toBeNull();
  });

  // F03-2: серверная ссылка на анализ и ссылки «Разбор» у блоков - только на разделы, которые
  // в анализе языка страницы есть (`product.md` §1.4, §22).
  it('ссылка на анализ и «Разбор» - на существующие разделы анализа', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 1, audioChapters: 0, summaries: 0, analyses: 1 },
      })
    );
    mocks.getCachedBookAnalysis.mockResolvedValue({
      hasCore: true,
      characters: [{ key: 'r', name: 'R', role: 'main' }],
      keyQuotes: [{ text: 'Q' }],
      symbols: null,
    });

    const { container } = await renderPage();

    const link = container.querySelector('a[href="/ru/book/crime/analysis"]');
    expect(link?.textContent).toBe('Анализ и разбор «Преступление и наказание»');
    expect(mocks.getCachedBookAnalysis).toHaveBeenCalledWith('v1');
    expect(mocks.extraDetailsProps).toHaveBeenCalledWith(
      expect.objectContaining({
        analysisLinks: {
          characters: '/ru/book/crime/analysis#characters',
          symbols: null,
          quotes: '/ru/book/crime/analysis#key-quotes',
        },
      })
    );
  });

  it('анализа нет на языке страницы - ни ссылки, ни «Разбор», анализ не запрашивается', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 1, audioChapters: 0, summaries: 0, analyses: 0 },
      })
    );

    const { container } = await renderPage();

    expect(container.querySelector('a[href$="/analysis"]')).toBeNull();
    expect(mocks.getCachedBookAnalysis).not.toHaveBeenCalled();
    expect(mocks.extraDetailsProps).toHaveBeenCalledWith(
      expect.objectContaining({ analysisLinks: null })
    );
  });

  it('анализ не прочитался - кнопка-ссылка есть, «Разбор» нет, страница книги не падает', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 1, audioChapters: 0, summaries: 0, analyses: 1 },
      })
    );
    mocks.getCachedBookAnalysis.mockRejectedValue(new Error('down'));

    const { container } = await renderPage();

    expect(container.querySelector('a[href="/ru/book/crime/analysis"]')).not.toBeNull();
    expect(mocks.extraDetailsProps).toHaveBeenCalledWith(
      expect.objectContaining({ analysisLinks: null })
    );
  });
});
