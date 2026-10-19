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
    // Кнопки под таблицей фактов - со своим отступом от рамки (F03-3, ревью круг 1).
    expect(within(facts).getByRole('link', { name: 'Summary' }).parentElement?.className).toContain(
      'factActions'
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

// F03-2s: строки страницы - серверный модуль `lib/i18n/analysisStrings.ts`, а не словарь. Ожидания -
// литералы прежних `locales/*.json`: перепутанный язык или потерянная строка краснеют здесь.
describe('страница анализа: строки на пяти языках', () => {
  const EXPECTED = {
    en: {
      h1: 'Hamlet: Analysis and Interpretation',
      facts: 'About the work',
      role: 'Main character',
      spoiler: 'Spoiler warning: the ending is revealed below.',
      quotes: 'Key quotes',
      meta: 'Hamlet: Analysis and Interpretation — William Shakespeare',
    },
    es: {
      h1: 'Hamlet: análisis e interpretación',
      facts: 'Sobre la obra',
      role: 'Personaje principal',
      spoiler: 'Aviso de spoiler: a continuación se revela el final.',
      quotes: 'Citas clave',
      meta: 'Hamlet: análisis e interpretación — William Shakespeare',
    },
    fr: {
      h1: 'Hamlet : analyse et interprétation',
      facts: 'À propos de l’œuvre',
      role: 'Personnage principal',
      spoiler: 'Attention, spoiler : la fin est dévoilée ci-dessous.',
      quotes: 'Citations clés',
      meta: 'Hamlet : analyse et interprétation — William Shakespeare',
    },
    pt: {
      h1: 'Hamlet: análise e interpretação',
      facts: 'Sobre a obra',
      role: 'Personagem principal',
      spoiler: 'Alerta de spoiler: o final é revelado a seguir.',
      quotes: 'Citações-chave',
      meta: 'Hamlet: análise e interpretação — William Shakespeare',
    },
    ru: {
      h1: 'Гамлет: анализ и разбор',
      facts: 'О произведении',
      role: 'Главный герой',
      spoiler: 'Дальше раскрывается финал.',
      quotes: 'Ключевые цитаты',
      meta: 'Гамлет: анализ и разбор — William Shakespeare',
    },
  } as const;

  for (const [lang, expected] of Object.entries(EXPECTED)) {
    it(`${lang}: заголовок, раздел и title - строки своего языка`, async () => {
      // Слаг у всех версий один: неканонический слаг языка уводит в редирект, а не в рендер.
      const slug = 'hamlet';
      mocks.pathname = `/${lang}/book/${slug}/analysis`;
      mocks.getBookOverview.mockResolvedValue(
        makeBook({
          versions: ['en', 'es', 'fr', 'pt', 'ru'].map((l) => version(l, 'hamlet', 1)),
        })
      );

      await renderPage(lang, slug);

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(expected.h1);
      expect(h2Texts()).toContain(expected.quotes);
      expect(h2Texts()).toContain(expected.facts);
      expect(document.body.textContent).toContain(expected.role);
      expect(document.body.textContent).toContain(expected.spoiler);
      expect((await metadataFor(lang, slug)).title).toBe(expected.meta);
    });
  }
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

// F03-3 (`product.md` §9, §10, §13-§20): блоки низа страницы - есть данные / нет данных, полоса
// «где звучит тема», карта отношений, FAQ без FAQPage, подпись на раздел редполитики об анализе.
describe('страница анализа: низ страницы', () => {
  const LOWER = {
    ...FULL,
    themes: [
      { ...CORE.themes[0], chapters: [1, 2, 9] },
      { ...CORE.themes[1], chapters: [9] },
    ],
    characters: [
      {
        key: 'hamlet',
        name: 'Prince Hamlet',
        role: 'main',
        description: 'Delays.',
        relations: [
          { to: 'ophelia', label: 'loves' },
          { to: 'claudius', label: 'nephew' },
          { to: 'gravedigger', label: 'jokes with' },
        ],
      },
      {
        key: 'ophelia',
        name: 'Ophelia',
        role: 'secondary',
        description: 'Breaks.',
        relations: [{ to: 'hamlet', label: 'loves' }],
      },
      { key: 'claudius', name: 'Claudius', role: 'secondary', description: 'Usurper.' },
      { key: 'gravedigger', name: 'Gravedigger', role: 'minor', description: 'Digs.' },
    ],
    context: 'Written around 1600.\n\nElizabethan stage.',
    timeline: [
      { year: '1564', event: 'Shakespeare is born', kind: 'author' },
      { year: '1599', event: 'Globe opens', kind: 'epoch' },
      { year: '1603', event: 'First quarto', kind: 'book' },
    ],
    style: [
      {
        device: 'Soliloquy',
        explanation: 'Thinking aloud.',
        example: { text: 'O, that this too too solid flesh', chapter: 2 },
      },
      { device: 'Wordplay', explanation: 'Puns.' },
    ],
    reception: 'Most-performed tragedy.',
    adaptations: [
      { title: 'Hamlet', year: 1948, kind: 'film', differences: 'Cuts Rosencrantz.' },
      { title: 'Opera Hamlet', kind: 'other' },
      { title: 'Hamlet (series)', year: 2009, kind: 'series' },
      { title: 'Hamlet on stage', kind: 'stage' },
    ],
    misreadings: [{ myth: 'Hamlet is mad.', explanation: 'He feigns madness.' }],
    discussionQuestions: ['Why does Hamlet delay?', '  '],
    faq: [
      { question: 'Is Hamlet mad?', answer: 'Debated.' },
      { question: 'Empty answer?', answer: '  ' },
    ],
    sources: [
      { title: 'Folger', url: 'https://www.folger.edu/hamlet' },
      { title: 'Bad', url: 'javascript:alert(1)' },
    ],
  };

  it('все блоки есть: заголовки и оглавление по порядку §3, «Дальше» последним', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    await renderPage();

    expect(h2Texts()).toEqual([
      'About the work',
      'Main idea',
      'Themes',
      'Characters',
      'Symbols and motifs',
      'Key quotes',
      'Meaning of the title',
      'Meaning of the ending',
      'Context and background',
      'Style and techniques',
      'Reception and criticism',
      'Adaptations and how they differ from the book',
      'Common misreadings',
      'Discussion questions',
      'Frequently Asked Questions',
      'Sources',
      'Read or listen to the full book',
    ]);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(
      within(toc)
        .getAllByRole('link')
        .map((a) => a.getAttribute('href'))
    ).toEqual([
      '#themes',
      '#characters',
      '#symbols',
      '#key-quotes',
      '#title-meaning',
      '#ending',
      '#context',
      '#style',
      '#reception',
      '#adaptations',
      '#misreadings',
      '#discussion-questions',
      '#faq',
      '#sources',
    ]);
    expect(document.getElementById('faq')).not.toBeNull();
    // Блок «Дальше» - со своим якорем, а не с чужим якорем пересказа.
    expect(document.getElementById('analysis-continue')).not.toBeNull();
    expect(document.getElementById('summary-continue')).toBeNull();
  });

  it('нет данных низа - ни заголовков, ни пунктов оглавления (FULL без блоков §13-§20)', async () => {
    await renderPage();

    for (const title of [
      'Context and background',
      'Style and techniques',
      'Reception and criticism',
      'Adaptations and how they differ from the book',
      'Common misreadings',
      'Discussion questions',
      'Frequently Asked Questions',
      'Sources',
    ]) {
      expect(h2Texts()).not.toContain(title);
    }
    expect(screen.queryByText('Character relationships')).toBeNull();
  });

  it('пустые строки и списки низа - блоков нет', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({
      ...FULL,
      context: '  ',
      timeline: [],
      style: [],
      reception: '\n\n',
      adaptations: [],
      misreadings: [],
      discussionQuestions: ['   '],
      faq: [],
      sources: [],
    });
    await renderPage();

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
  });

  it('таймлайн: 3 события - лента с метками вида; 2 - ленты нет, текст контекста на месте', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const { container, unmount } = await renderPage();
    const context = container.querySelector('#context') as HTMLElement;
    expect(within(context).getByRole('heading', { name: 'Timeline' })).toBeInTheDocument();
    expect(within(context).getByText('Author’s life')).toBeInTheDocument();
    expect(within(context).getByText('The era')).toBeInTheDocument();
    expect(within(context).getByText('The book')).toBeInTheDocument();
    expect(within(context).getByText('Globe opens')).toBeInTheDocument();
    unmount();

    mocks.getPublicBookAnalysis.mockResolvedValue({
      ...LOWER,
      timeline: LOWER.timeline.slice(0, 2),
    });
    const second = await renderPage();
    const context2 = second.container.querySelector('#context') as HTMLElement;
    expect(within(context2).queryByRole('heading', { name: 'Timeline' })).toBeNull();
    expect(within(context2).queryByText('Globe opens')).toBeNull();
    expect(within(context2).getByText('Elizabethan stage.')).toBeInTheDocument();
  });

  it('только таймлайн от трёх событий без текста - раздел контекста есть', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...LOWER, context: null });
    await renderPage();
    expect(h2Texts()).toContain('Context and background');
  });

  it('стиль: пример - цитатой с главой; экранизации: год и вид, у other метки нет', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const { container } = await renderPage();

    const style = container.querySelector('#style') as HTMLElement;
    expect(within(style).getByText('O, that this too too solid flesh')).toBeInTheDocument();
    expect(within(style).getByRole('link', { name: 'Chapter 2' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/read?chapter=2'
    );
    const adaptations = container.querySelector('#adaptations') as HTMLElement;
    expect(within(adaptations).getByText('1948 · Film')).toBeInTheDocument();
    expect(within(adaptations).getByText('Cuts Rosencrantz.')).toBeInTheDocument();
    const other = within(adaptations).getByText('Opera Hamlet').closest('li') as HTMLElement;
    expect(other.textContent).toBe('Opera Hamlet');
    expect(within(adaptations).getByText('2009 · TV series')).toBeInTheDocument();
    expect(within(adaptations).getByText('Stage production')).toBeInTheDocument();
  });

  it('ошибки понимания - пара мнение / разбор; вопросы - нумерованным списком без пустых', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const { container } = await renderPage();

    const misreadings = container.querySelector('#misreadings') as HTMLElement;
    expect(within(misreadings).getByText('Common view')).toBeInTheDocument();
    expect(within(misreadings).getByText('What the text shows')).toBeInTheDocument();
    expect(within(misreadings).getByText('He feigns madness.')).toBeInTheDocument();
    const questions = container.querySelectorAll('#discussion-questions ol > li');
    expect([...questions].map((li) => li.textContent)).toEqual(['Why does Hamlet delay?']);
  });

  it('FAQ - без FAQPage: на странице только Article и крошки', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const html = renderToStaticMarkup(await pageElement());

    expect(html).toContain('Is Hamlet mad?');
    expect(html).toContain('Debated.');
    expect(html).not.toContain('FAQPage');
    // Вопрос без ответа не выводится (§1.4).
    expect(html).not.toContain('Empty answer?');
  });

  it('источники: ссылка наружу с rel; небезопасный адрес - название текстом', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const { container } = await renderPage();

    const sources = container.querySelector('#sources') as HTMLElement;
    const folger = within(sources).getByRole('link', { name: 'Folger' });
    expect(folger).toHaveAttribute('href', 'https://www.folger.edu/hamlet');
    expect(folger).toHaveAttribute('rel', 'noopener noreferrer');
    expect(within(sources).queryByRole('link', { name: 'Bad' })).toBeNull();
    expect(within(sources).getByText('Bad')).toBeInTheDocument();
  });

  it('подпись: «Редакция» ведёт на раздел редполитики об анализе, с датой; есть и без источников', async () => {
    await renderPage();

    const team = screen.getByRole('link', { name: 'Bibliaris Editorial Team' });
    expect(team).toHaveAttribute('href', '/en/editorial-policy#analysis');
    expect(team.parentElement?.textContent).toContain('Updated');
    expect(team.parentElement?.textContent).toContain('2026');
  });

  it('полоса темы: клетка на главу версии, отмечены только существующие главы, подпись совпадает', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const { container } = await renderPage();

    const cards = [
      ...(container.querySelector('#themes')?.querySelectorAll(':scope ul > li') ?? []),
    ];
    const revenge = cards[0] as HTMLElement;
    const cells = revenge.querySelectorAll('ol > li');
    // Глав в версии три (1, 2, 5): клеток три, отмечены 1 и 2; главы 9 в версии нет.
    expect(cells).toHaveLength(3);
    expect([...revenge.querySelectorAll('ol a')].map((a) => a.getAttribute('href'))).toEqual([
      '/en/book/hamlet/read?chapter=1',
      '/en/book/hamlet/read?chapter=2',
    ]);
    expect(revenge.querySelector('p[class*="stripText"]')?.textContent).toBe('Chapters: 1–2');
    // Вторая тема отмечена только несуществующей главой - полосы нет.
    expect((cards[1] as HTMLElement).querySelector('ol')).toBeNull();
  });

  it('полоса темы: версия без глав - ни клеток, ни подписи', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...LOWER, chapterNumbers: [] });
    const { container } = await renderPage();

    const themes = container.querySelector('#themes') as HTMLElement;
    expect(themes.querySelector('ol')).toBeNull();
    expect(themes.textContent).not.toContain('Chapters:');
  });

  it('полоса темы: 120 глав - клетки; 121 - только подпись со ссылками (В4)', async () => {
    const chapters = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...LOWER, chapterNumbers: chapters(120) });
    const first = await renderPage();
    const card = first.container.querySelector('#themes ul > li') as HTMLElement;
    expect(card.querySelectorAll('ol > li')).toHaveLength(120);
    first.unmount();

    mocks.getPublicBookAnalysis.mockResolvedValue({ ...LOWER, chapterNumbers: chapters(121) });
    const second = await renderPage();
    const card2 = second.container.querySelector('#themes ul > li') as HTMLElement;
    expect(card2.querySelector('ol')).toBeNull();
    expect(card2.textContent).toContain('Chapters: 1–2, 9');
    expect(within(card2).getByRole('link', { name: '9' })).toHaveAttribute(
      'href',
      '/en/book/hamlet/read?chapter=9'
    );
  });

  it('карта отношений: SVG и список связей в HTML сервера, эпизодического героя нет', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(LOWER);
    const html = renderToStaticMarkup(await pageElement());

    expect(html).toContain('Character relationships');
    expect(html).toContain('<svg');
    expect(html).toContain('Prince Hamlet → loves → Ophelia');
    expect(html).toContain('Ophelia → loves → Prince Hamlet');
    expect(html).toContain('Prince Hamlet → nephew → Claudius');
    expect(html).not.toContain('jokes with');
  });

  it('карта отношений: меньше двух линий - блока нет', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({
      ...LOWER,
      characters: LOWER.characters.map((c) =>
        c.key === 'hamlet' ? { ...c, relations: [{ to: 'ophelia', label: 'loves' }] } : c
      ),
    });
    const { container } = await renderPage();
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(screen.queryByText('Character relationships')).toBeNull();
  });
});
