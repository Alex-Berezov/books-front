import type { ReactNode } from 'react';
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
  getPublicBookWorld: vi.fn(),
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

vi.mock('@/api/endpoints/public', async () => ({
  ...(await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public')),
  getPublicBookWorld: mocks.getPublicBookWorld,
}));

vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: vi.fn() }));

vi.mock('@/app/[lang]/book/[slug]/analysis/analysisData', () => ({
  getCachedBookAnalysis: mocks.getCachedBookAnalysis,
}));

vi.mock('@/app/[lang]/book/[slug]/BookClientIslands', () => ({
  BookActions: () => null,
  // Слот «Герои книги» отрисован: его место внутри блока проверяет `bookExtraDetailsWorld.test.tsx`.
  BookExtraDetails: (props: { heroesSlot?: ReactNode }) => {
    mocks.extraDetailsProps(props);
    return <>{props.heroesSlot}</>;
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

// F08-3b: ссылка «Мир книги» на странице книги - по версии языка страницы (`pickWorldPageVersion`):
// мир другой версии языка ссылку не ставит (`product.md` §1 п.3).
describe('страница книги: ссылка «Мир книги»', () => {
  let page: (typeof import('@/app/[lang]/book/[slug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/book/[slug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedBookAnalysis.mockReset();
    mocks.getCachedBookAnalysis.mockResolvedValue(null);
    mocks.getCachedBookSeo.mockResolvedValue(null);
    mocks.getPublicBookWorld.mockReset();
    mocks.getPublicBookWorld.mockResolvedValue({ language: 'ru', alternates: [], entities: [] });
  });

  const renderPage = async () =>
    render(await page({ params: Promise.resolve({ lang: 'ru', slug: 'crime' }) }));

  it('у версии языка страницы есть публичные сущности - ссылка на /wiki', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({ language: 'ru', _count: { chapters: 1, audioChapters: 0, worldEntities: 2 } })
    );
    const { container } = await renderPage();
    expect(container.querySelector('a[href="/ru/book/crime/wiki"]')?.textContent).toBe(
      'Мир книги «Преступление и наказание»'
    );
  });

  it('у версии свой слаг: «Мир книги» и «Герои книги» - на один адрес мира (Q14)', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        slug: 'prestuplenie',
        _count: { chapters: 1, audioChapters: 0, worldEntities: 1 },
      })
    );
    mocks.getPublicBookWorld.mockResolvedValue({
      language: 'ru',
      alternates: [],
      entities: [
        {
          key: 'raskolnikov',
          type: 'character',
          name: 'Раскольников',
          role: 'main',
          short: null,
          hasCore: true,
          isIndexable: true,
          mentionFirst: 1,
          updatedAt: '2026-11-01T00:00:00.000Z',
          forms: ['Раскольников'],
        },
      ],
    });
    const { container } = await renderPage();
    expect(container.querySelector('a[href="/ru/book/prestuplenie/wiki"]')).not.toBeNull();
    expect(container.querySelector('a[href="/ru/book/crime/wiki"]')).toBeNull();
    expect(
      container.querySelector('a[href="/ru/book/prestuplenie/wiki/raskolnikov"]')?.textContent
    ).toBe('Раскольников');
  });

  it('мир только у версии другого языка или счётчик 0 - ссылки нет', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview(
        { language: 'ru', _count: { chapters: 1, audioChapters: 0, worldEntities: 0 } },
        {
          versions: [
            {
              id: 'v1',
              type: 'text',
              isFree: true,
              title: 'Преступление и наказание',
              translators: [],
              language: 'ru',
              _count: { chapters: 1, audioChapters: 0, worldEntities: 0 },
            },
            {
              id: 'v2',
              type: 'text',
              isFree: true,
              title: 'Crime and Punishment',
              translators: [],
              language: 'en',
              _count: { chapters: 1, audioChapters: 0, worldEntities: 5 },
            },
          ],
        }
      )
    );
    const { container } = await renderPage();
    expect(container.querySelector('a[href$="/wiki"]')).toBeNull();
  });
});

// F08-5: «Подробнее о герое» по имени карточки (Q3) и блок «Герои книги» на странице книги.
describe('страница книги: перелинковка мира (F08-5)', () => {
  let page: (typeof import('@/app/[lang]/book/[slug]/page'))['default'];

  beforeAll(async () => {
    page = (await import('@/app/[lang]/book/[slug]/page')).default;
  }, MODULE_LOAD_TIMEOUT_MS);

  const hero = (key: string, name: string, forms: string[], extra = {}) => ({
    key,
    type: 'character',
    name,
    role: 'main',
    short: null,
    hasCore: true,
    isIndexable: true,
    mentionFirst: 1,
    updatedAt: '2026-11-01T00:00:00.000Z',
    forms,
    ...extra,
  });
  const withWorld = () =>
    overview({
      language: 'ru',
      _count: { chapters: 3, worldEntities: 3 },
      characters: [
        { name: 'Раскольников', description: 'студент' },
        { name: 'Соня', description: 'дочь' },
        { name: 'constructor', description: 'нет' },
      ],
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getCachedBookAnalysis.mockReset();
    mocks.getCachedBookAnalysis.mockResolvedValue(null);
    mocks.getCachedBookSeo.mockResolvedValue(null);
    mocks.getPublicBookWorld.mockReset();
    mocks.getPublicBookWorld.mockResolvedValue({
      language: 'ru',
      alternates: [],
      entities: [
        hero('raskolnikov', 'Раскольников', ['Раскольников', 'Родион']),
        // Форма «Соня» у двух сущностей - карточка без ссылки (Q3).
        hero('sonya', 'Соня', ['Соня']),
        hero('sonya2', 'Соня Мармеладова', ['Соня'], { role: null }),
      ],
    });
  });

  const renderPage = async () =>
    render(await page({ params: Promise.resolve({ lang: 'ru', slug: 'crime' }) }));

  it('карточке по имени - страница героя; тёзка и имя-свойство объекта ссылки не получают', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(withWorld());
    await renderPage();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as {
      characterPages: Record<string, string>;
      characterMore: string;
    };
    expect(props.characterPages).toEqual({ Раскольников: '/ru/book/crime/wiki/raskolnikov' });
    expect(props.characterMore).toBe('Подробнее о герое');
  });

  it('карточки героев - версии другого языка (фолбэк): ссылок по чужому индексу нет', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview(
        { language: 'en', characters: [{ name: 'Раскольников', description: 'student' }] },
        {
          versions: [
            {
              id: 'v1',
              type: 'text',
              isFree: true,
              title: 'Crime and Punishment',
              translators: [],
              language: 'en',
              characters: [{ name: 'Раскольников', description: 'student' }],
            },
            {
              id: 'v2',
              type: 'text',
              isFree: true,
              title: 'Преступление и наказание',
              translators: [],
              language: 'ru',
              _count: { chapters: 3, worldEntities: 3 },
            },
          ],
        }
      )
    );
    await renderPage();
    expect(mocks.getPublicBookWorld).toHaveBeenCalled();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as {
      characterPages: Record<string, string>;
    };
    expect(props.characterPages).toEqual({});
  });

  it('персонаж без name (запись до LEGACY-402): страница живая, у остальных ссылки на месте', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 3, worldEntities: 3 },
        characters: [
          { description: 'без имени' },
          { name: 'Раскольников', description: 'студент' },
        ],
      })
    );
    const { container } = await renderPage();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as {
      characterPages: Record<string, string>;
    };
    expect(props.characterPages).toEqual({ Раскольников: '/ru/book/crime/wiki/raskolnikov' });
    expect(container.querySelector('h1')).not.toBeNull();
  });

  it('имя карточки совпало с формой места - «Подробнее о герое» не ставится', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 3, worldEntities: 2 },
        characters: [{ name: 'Петербург', description: 'город как герой' }],
      })
    );
    mocks.getPublicBookWorld.mockResolvedValue({
      language: 'ru',
      alternates: [],
      entities: [
        hero('raskolnikov', 'Раскольников', ['Раскольников']),
        hero('petersburg', 'Петербург', ['Петербург'], { type: 'place', role: null }),
      ],
    });
    await renderPage();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as {
      characterPages: Record<string, string>;
    };
    expect(props.characterPages).toEqual({});
  });

  it('имя карточки - форма героя и форма места сразу: ссылки нет (Q3, круг 3)', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(
      overview({
        language: 'ru',
        _count: { chapters: 3, worldEntities: 2 },
        characters: [{ name: 'Петербург', description: 'город как герой' }],
      })
    );
    mocks.getPublicBookWorld.mockResolvedValue({
      language: 'ru',
      alternates: [],
      entities: [
        hero('piter', 'Питер', ['Петербург']),
        hero('petersburg', 'Петербург', ['Петербург'], { type: 'place', role: null }),
      ],
    });
    await renderPage();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as {
      characterPages: Record<string, string>;
    };
    expect(props.characterPages).toEqual({});
  });

  it('блок «Герои книги»: main первыми, ссылки на страницы героев', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(withWorld());
    const { container } = await renderPage();
    const heading = [...container.querySelectorAll('h2')].find(
      (h) => h.textContent === 'Герои книги'
    );
    const links = [...heading!.closest('section')!.querySelectorAll('a')].map((a) =>
      a.getAttribute('href')
    );
    expect(links).toEqual([
      '/ru/book/crime/wiki/raskolnikov',
      '/ru/book/crime/wiki/sonya',
      '/ru/book/crime/wiki/sonya2',
    ]);
  });

  it('сбой списка мира: страница остаётся, ссылок и блока нет', async () => {
    mocks.getCachedBookOverview.mockResolvedValue(withWorld());
    mocks.getPublicBookWorld.mockRejectedValue(new Error('down'));
    const { container } = await renderPage();
    const props = mocks.extraDetailsProps.mock.calls[0][0] as { characterPages: object };
    expect(props.characterPages).toEqual({});
    expect([...container.querySelectorAll('h2')].some((h) => h.textContent === 'Герои книги')).toBe(
      false
    );
  });
});
