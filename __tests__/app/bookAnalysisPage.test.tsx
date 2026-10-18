import { render, screen, within } from '@testing-library/react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLangUrl } from '@/lib/seo/urls';
import { ApiError } from '@/types/api';

/**
 * Страница анализа `/{lang}/book/{slug}/analysis` (F03-2, `product.md` §1-§8, §11, §12, §22):
 * серверный рендер, 404 без ядра, блок без данных не выводится, ссылка на главу - только на
 * существующую главу, hreflang - только языки с анализом, 451 (окончённая претензия на весь
 * мир) - 404, а не 5xx (решение арбитра `F03 | F03-2`).
 */

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn(() => {
    throw new Error('NEXT_PERMANENT_REDIRECT');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  pathname: '/en/book/hamlet/analysis',
  getBookOverview: vi.fn(),
  getPublicBookAnalysis: vi.fn(),
  resolveSeo: vi.fn(),
  resolveRetiredSlug: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
  redirect: mocks.redirect,
  usePathname: () => mocks.pathname,
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return {
    ...actual,
    getBookOverview: mocks.getBookOverview,
    getPublicBookAnalysis: mocks.getPublicBookAnalysis,
    resolveSeo: mocks.resolveSeo,
  };
});

vi.mock('@/lib/seo/retired-slug', () => ({
  resolveRetiredSlug: mocks.resolveRetiredSlug,
}));

vi.mock('@/app/[lang]/book/[slug]/RelatedBooksSection', () => ({
  RelatedBooksSection: () => null,
}));

const version = (language: string, slug: string, analyses: number, extra = {}) => ({
  id: `v-${language}`,
  type: 'text',
  language,
  slug,
  title: language === 'ru' ? 'Гамлет' : 'Hamlet',
  author: 'William Shakespeare',
  isFree: true,
  translators: [],
  originalLanguage: 'en',
  _count: { chapters: 3, audioChapters: 0, summaries: language === 'en' ? 1 : 0, analyses },
  ...extra,
});

const makeBook = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  slug: 'hamlet',
  title: 'Hamlet',
  author: 'William Shakespeare',
  authorSlug: 'william-shakespeare',
  firstPublishedYear: 1603,
  primaryCategory: { name: 'Drama' },
  coverUrl: 'https://cdn.bibliaris.com/hamlet.jpg',
  versionIds: { text: 'v-en', audio: null },
  versions: [version('en', 'hamlet', 1), version('fr', 'hamlet-fr', 1), version('ru', 'gamlet', 0)],
  ...over,
});

const CORE = {
  language: 'en',
  hasCore: true,
  chapterNumbers: [1, 2, 5],
  mainIdea: 'Revenge poisons the avenger.\n\nThinking too long is its own tragedy.',
  themes: [
    {
      key: 'revenge',
      title: 'Revenge',
      interpretation: 'First paragraph.\n\nSecond paragraph.',
      quotes: [{ text: 'Revenge his foul and most unnatural murder.', chapter: 5 }],
    },
    {
      key: 'madness',
      title: 'Madness',
      interpretation: 'Feigned or real.',
      quotes: [{ text: 'Though this be madness, yet there is method in it.', chapter: 9 }],
    },
  ],
  characters: [
    { key: 'ophelia', name: 'Ophelia', role: 'secondary', description: 'Breaks.' },
    {
      key: 'hamlet',
      name: 'Prince Hamlet',
      role: 'main',
      description: 'Delays.',
      arc: { from: 'Grieving son', to: 'Resigned fatalist' },
      themeKeys: ['revenge', 'madness'],
    },
  ],
  keyQuotes: [
    { text: 'To be, or not to be', chapter: 2, speakerKey: 'hamlet', interpretation: 'Doubt.' },
    { text: 'Q2', interpretation: 'I2', themeKeys: ['madness'] },
    { text: 'Q3', interpretation: 'I3' },
  ],
  facts: null,
  symbols: null,
  titleMeaning: null,
  endingMeaning: null,
  context: null,
  timeline: null,
  style: null,
  reception: null,
  adaptations: null,
  misreadings: null,
  discussionQuestions: null,
  faq: null,
  sources: null,
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};

const FULL = {
  ...CORE,
  facts: { genre: 'Tragedy', narrator: 'Drama, no narrator', structure: '5 acts' },
  symbols: [{ title: 'Yorick’s skull', interpretation: 'Mortality.', chapters: [5, 7] }],
  titleMeaning: 'The prince himself.',
  endingMeaning: 'Everyone dies.',
};

const loadPage = () => import('@/app/[lang]/book/[slug]/analysis/page');

const pageElement = async (lang = 'en', slug = 'hamlet') => {
  const { default: Page } = await loadPage();
  return Page({ params: Promise.resolve({ lang, slug }) });
};

const renderPage = async (lang = 'en', slug = 'hamlet') => render(await pageElement(lang, slug));

const metadataFor = async (lang = 'en', slug = 'hamlet') => {
  const { generateMetadata } = await loadPage();
  return generateMetadata({ params: Promise.resolve({ lang, slug }) });
};

const h2Texts = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.pathname = '/en/book/hamlet/analysis';
  mocks.resolveRetiredSlug.mockResolvedValue(null);
  mocks.getBookOverview.mockResolvedValue(makeBook());
  mocks.getPublicBookAnalysis.mockResolvedValue(FULL);
  mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, follow' } });
});

describe('страница анализа: содержимое', () => {
  it('полный анализ: h1, разделы по порядку §3, оглавление ровно из разделов под ним', async () => {
    await renderPage();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Hamlet: Analysis and Interpretation'
    );
    expect(h2Texts()).toEqual([
      'About the work',
      'Main idea',
      'Themes',
      'Characters',
      'Symbols and motifs',
      'Key quotes',
      'Meaning of the title',
      'Meaning of the ending',
      'Read or listen to the full book',
    ]);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(
      within(toc)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
    ).toEqual(['#themes', '#characters', '#symbols', '#key-quotes', '#title-meaning', '#ending']);
    expect(mocks.getPublicBookAnalysis).toHaveBeenCalledWith('v-en');
  });

  it('минимальный анализ: блоков без данных нет - ни заголовка, ни пункта оглавления', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(CORE);
    await renderPage();

    expect(h2Texts()).not.toContain('Symbols and motifs');
    expect(h2Texts()).not.toContain('Meaning of the title');
    expect(h2Texts()).not.toContain('Meaning of the ending');
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(within(toc).queryByText('Symbols and motifs')).toBeNull();
    // Карточка произведения - только строки со значением: из данных версии.
    expect(screen.getByText('First published')).toBeInTheDocument();
    expect(screen.queryByText('Narrator')).toBeNull();
  });

  it('карточка произведения: строки по порядку §4, значения версии и анализа', async () => {
    const { container } = await renderPage();

    const terms = [...container.querySelectorAll('dl dt')].map((dt) => dt.textContent);
    expect(terms.slice(0, 5)).toEqual([
      'Genre',
      'First published',
      'Narrator',
      'Structure',
      'Original language',
    ]);
    expect(container.querySelector('dl')?.textContent).toContain('1603');
    const facts = container.querySelector('#about-the-work') as HTMLElement;
    expect(within(facts).getByRole('link', { name: 'Summary' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/summary'
    );
  });

  it('глава - ссылка в читалку, только если глава есть в версии; иначе номер текстом', async () => {
    await renderPage();

    expect(screen.getAllByRole('link', { name: 'Chapter 5' })[0]).toHaveAttribute(
      'href',
      '/en/book/hamlet/read?chapter=5'
    );
    // Главы 9 и 7 в версии нет - номер без ссылки.
    expect(screen.queryByRole('link', { name: 'Chapter 9' })).toBeNull();
    expect(screen.getByText('Chapter 9')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Chapter 7' })).toBeNull();
  });

  it('у версии без глав ссылок на главы нет вовсе', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...FULL, chapterNumbers: [] });
    const { container } = await renderPage();

    expect(container.querySelector('a[href*="read?chapter="]')).toBeNull();
    expect(screen.getAllByText('Chapter 5').length).toBeGreaterThan(0);
  });

  it('герои: сначала главные; кто говорит - имя героя; метки тем - цветом темы', async () => {
    const { container } = await renderPage();

    const characters = container.querySelector('#characters');
    const names = [...(characters?.querySelectorAll('h3') ?? [])].map(
      (h) => h.firstChild?.textContent
    );
    expect(names).toEqual(['Prince Hamlet', 'Ophelia']);
    expect(within(characters as HTMLElement).getByText('Main character')).toBeInTheDocument();

    const quotes = container.querySelector('#key-quotes') as HTMLElement;
    // Ключевые цитаты - общий QuotesBlock: «кто говорит» текстом, ссылкой только глава (§11).
    expect(quotes.textContent).toContain('Prince Hamlet');
    expect(within(quotes).queryByRole('link', { name: /Prince Hamlet/ })).toBeNull();
    expect(within(quotes).getByRole('link', { name: 'Chapter 2' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/read?chapter=2'
    );
    expect(within(quotes).getByText('Doubt.')).toBeInTheDocument();

    // Цвет темы «Madness» (вторая тема) один в карточке темы, у героя и у цитаты.
    const themeCards = [...(container.querySelector('#themes')?.querySelectorAll('li') ?? [])];
    const madnessCard = themeCards.find((li) => li.textContent?.includes('Madness'));
    expect(madnessCard?.className).toContain('theme1');
    const tags = [...container.querySelectorAll('li')].filter(
      (li) => li.textContent === 'Madness' && li.className.includes('tag')
    );
    expect(tags).toHaveLength(2);
    tags.forEach((tag) => expect(tag.className).toContain('theme1'));
  });

  it('перед смыслом финала - строка о спойлере', async () => {
    const { container } = await renderPage();

    const ending = container.querySelector('#ending') as HTMLElement;
    const note = within(ending).getByRole('note');
    expect(note).toHaveTextContent('the ending is revealed below');
    expect(ending.textContent?.indexOf('revealed')).toBeLessThan(
      ending.textContent?.indexOf('Everyone dies.') ?? -1
    );
  });

  it('текст блоков - в HTML сервера', async () => {
    const html = renderToStaticMarkup(await pageElement());

    expect(html).toContain('Revenge poisons the avenger.');
    expect(html).toContain('Second paragraph.');
    expect(html).toContain('To be, or not to be');
    expect(html).toContain('Mortality.');
    expect(html).toContain('Everyone dies.');
  });

  it('разметка: Article с датами, обложкой и about = @id книги; крошки Главная → книга → Анализ', async () => {
    const { container } = await renderPage();

    const scripts = [...container.querySelectorAll('script[type="application/ld+json"]')].map(
      (s) => JSON.parse(s.textContent ?? '{}') as Record<string, unknown>
    );
    const article = scripts.find((s) => s['@type'] === 'Article');
    expect(article).toMatchObject({
      headline: 'Hamlet: Analysis and Interpretation',
      url: buildLangUrl('en', '/book/hamlet/analysis'),
      datePublished: '2026-10-17T09:00:00.000Z',
      dateModified: '2026-10-18T10:00:00.000Z',
      image: 'https://cdn.bibliaris.com/hamlet.jpg',
      about: { '@id': `${buildLangUrl('en', '/book/hamlet')}#book` },
    });
    const crumbs = scripts.find((s) => s['@type'] === 'BreadcrumbList') as {
      itemListElement: { name: string }[];
    };
    expect(crumbs.itemListElement.map((i) => i.name)).toEqual(['Home', 'Hamlet', 'Analysis']);
  });

  it('навигация разделов: анализ активен, пересказ есть, пункты только существующих разделов', async () => {
    await renderPage();

    const nav = screen.getByRole('navigation', { name: /sections/i });
    expect(within(nav).getByText('Analysis')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).getByRole('link', { name: 'Summary' })).toBeInTheDocument();
    expect(within(nav).queryByRole('link', { name: 'Listen' })).toBeNull();
  });
});

describe('страница анализа: когда страницы нет', () => {
  it('нет версии языка страницы - 404 без запроса анализа', async () => {
    mocks.getBookOverview.mockResolvedValue(makeBook({ slug: 'hamlet-es' }));
    await expect(renderPage('es', 'hamlet-es')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getPublicBookAnalysis).not.toHaveBeenCalled();
  });

  // Решение арбитра `F03 | F03-2`: счётчик гасит анализ, закрытый блоком **любой** страны, а сама
  // страница вне страны блока открыта - её доступ решают ответ ручки и middleware, не счётчик.
  it('счётчик 0 (блок по одной стране) - страница открыта по ответу ручки, hreflang без себя не отдаётся', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [version('en', 'hamlet', 0), version('fr', 'hamlet-fr', 1)],
      })
    );
    await renderPage();

    expect(mocks.getPublicBookAnalysis).toHaveBeenCalledWith('v-en');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Hamlet: Analysis and Interpretation'
    );
    const meta = await metadataFor();
    expect(meta.robots).toBeUndefined();
    // Своего языка в кластере нет (счётчик 0) - кластер без себя не отдаётся вовсе.
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it('ручка отдала null (нет ядра) - 404', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(null);
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('hasCore false - 404', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...FULL, hasCore: false });
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  // Окончённая претензия на весь мир: 404, а не 5xx - иначе ISR держал бы прежнюю открытую страницу.
  it('451 - 404, а не отказ', async () => {
    mocks.getPublicBookAnalysis.mockRejectedValue(
      new ApiError({ statusCode: 451, message: 'blocked' })
    );
    await expect(renderPage()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('5xx - отказ наружу, а не 404', async () => {
    mocks.getPublicBookAnalysis.mockRejectedValue(new ApiError({ statusCode: 502, message: 'x' }));
    await expect(renderPage()).rejects.toBeInstanceOf(ApiError);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('пропал счётчик анализа в обзоре - отказ, а не 404', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          version('en', 'hamlet', 1, { _count: { chapters: 3, audioChapters: 0, summaries: 1 } }),
        ],
      })
    );
    await expect(renderPage()).rejects.toThrow('carries no analysis count');
  });

  it('пропал список глав в ответе - отказ, а не 404', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...FULL, chapterNumbers: undefined });
    await expect(renderPage()).rejects.toThrow('carries no chapter numbers');
  });
});

describe('страница анализа: мета', () => {
  it('title и описание из главной мысли, canonical на себя, hreflang только языков с анализом', async () => {
    const meta = await metadataFor();

    expect(meta.title).toBe('Hamlet: Analysis and Interpretation — William Shakespeare');
    expect(meta.description).toBe(
      'Revenge poisons the avenger. Thinking too long is its own tragedy.'
    );
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toBe(buildLangUrl('en', '/book/hamlet/analysis'));
    expect(meta.alternates?.languages).toEqual({
      en: buildLangUrl('en', '/book/hamlet/analysis'),
      fr: buildLangUrl('fr', '/book/hamlet-fr/analysis'),
      'x-default': buildLangUrl('en', '/book/hamlet/analysis'),
    });
  });

  it('описание не длиннее 160 знаков', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...FULL, mainIdea: 'word '.repeat(80) });
    const meta = await metadataFor();
    expect((meta.description ?? '').length).toBeLessThanOrEqual(160);
  });

  it('451 - noindex, а не отказ', async () => {
    mocks.getPublicBookAnalysis.mockRejectedValue(
      new ApiError({ statusCode: 451, message: 'blocked' })
    );
    await expect(metadataFor()).resolves.toEqual({ robots: { index: false, follow: true } });
  });

  it('книга закрыта редактором от индекса - анализ тоже noindex и без hreflang', async () => {
    mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'noindex, follow' } });
    const meta = await metadataFor();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
  });
});
