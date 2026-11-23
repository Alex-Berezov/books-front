import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildLangUrl } from '@/lib/seo/urls';
import { logError } from '@/lib/utils/log-error';
import { ApiError } from '@/types/api';
import type {
  BookWorldAlternate,
  BookWorldEntity,
  BookWorldEntityResponse,
  BookWorldEntitySummary,
  BookWorldListResponse,
  BookWorldRelation,
} from '@/types/api-schema';

/**
 * Страница пары героев `/{lang}/book/{slug}/wiki/{a}--{b}` (F08-8c, `product.md` §6): тот же маршрут,
 * что у героя, ключ `{a}--{b}`, тип `pair`. Ссылки героя на пару, исключение пары из «Героев» и из
 * перелинковки по имени, карта сайта.
 */

const mocks = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
  getBookOverview: vi.fn(),
  getPublicBookWorld: vi.fn(),
  getPublicBookWorldEntity: vi.fn(),
  getPublicBookAnalysis: vi.fn(),
  getPublicAudioChapters: vi.fn(),
  resolveSeo: vi.fn(),
  resolveRetiredSlug: vi.fn(),
  beaconProps: [] as { bookVersionId: string; entityKey?: string }[],
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.redirect,
  redirect: mocks.redirect,
  usePathname: () => '/en/book/world-book/wiki',
  useRouter: () => ({ back: vi.fn(), replace: vi.fn(), push: vi.fn() }),
}));

vi.mock('@/api/endpoints/public', async () => {
  const actual =
    await vi.importActual<typeof import('@/api/endpoints/public')>('@/api/endpoints/public');
  return {
    ...actual,
    getBookOverview: mocks.getBookOverview,
    getPublicBookWorld: mocks.getPublicBookWorld,
    getPublicBookWorldEntity: mocks.getPublicBookWorldEntity,
    getPublicBookAnalysis: mocks.getPublicBookAnalysis,
    resolveSeo: mocks.resolveSeo,
  };
});

vi.mock('@/api/endpoints/public-audio', () => ({
  getPublicAudioChaptersForPage: mocks.getPublicAudioChapters,
}));

// Спойлер-остров (`F08-10b`) берёт сессию и прогресс на клиенте; здесь - аноним без прогресса,
// так же, как страницу видит краулер.
const spoiler = vi.hoisted(() => ({
  session: { data: null as unknown, status: 'unauthenticated' },
  progress: undefined as unknown,
}));

vi.mock('next-auth/react', () => ({ useSession: () => spoiler.session }));

vi.mock('@/api/hooks/useProgress', () => ({ useProgress: () => ({ data: spoiler.progress }) }));

vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: mocks.resolveRetiredSlug }));
vi.mock('@/lib/seo/degraded', () => ({ noteDegraded: vi.fn() }));
vi.mock('@/lib/utils/log-error', () => ({ logError: vi.fn() }));
vi.mock('@/app/[lang]/book/[slug]/RelatedBooksSection', () => ({
  RelatedBooksSection: () => null,
}));
vi.mock('@/components/public/WorldBeacon', () => ({
  WorldBeacon: ({
    children,
    bookVersionId,
    entityKey,
  }: {
    children: React.ReactNode;
    bookVersionId: string;
    entityKey?: string;
  }) => {
    mocks.beaconProps.push({ bookVersionId, ...(entityKey ? { entityKey } : {}) });
    return <>{children}</>;
  },
}));

const version = (language: string, slug: string) => ({
  id: `v-${language}`,
  type: 'text',
  language,
  slug,
  title: 'World Book',
  author: 'Jane Writer',
  isFree: true,
  translators: [],
  originalLanguage: 'en',
  _count: { chapters: 3, audioChapters: 1, summaries: 0, analyses: 0, worldEntities: 4 },
});

const makeBook = (lang = 'en') => ({
  id: 'b1',
  slug: 'world-book',
  title: 'World Book',
  author: 'Jane Writer',
  authorSlug: 'jane-writer',
  firstPublishedYear: 1900,
  primaryCategory: { name: 'Novel' },
  coverUrl: 'https://cdn.bibliaris.com/world.jpg',
  versionIds: { text: `v-${lang}`, audio: null },
  versions: [version(lang, 'world-book')],
});

const summary = (
  key: string,
  name: string,
  over: Partial<BookWorldEntitySummary> = {}
): BookWorldEntitySummary => ({
  key,
  type: 'character',
  name,
  role: 'main',
  short: `${name} in brief.`,
  hasCore: true,
  isIndexable: true,
  mentionFirst: 1,
  updatedAt: '2026-11-02T10:00:00.000Z',
  ...over,
});

const ALTERNATES: BookWorldAlternate[] = [{ language: 'en', slug: 'world-book' }];
const PAIR_KEY = 'anna--tom';
const HREFLANG_PAIR = {
  en: buildLangUrl('en', '/book/world-book/wiki/anna--tom'),
  ru: buildLangUrl('ru', '/book/mir-kniga/wiki/anna--tom'),
  'x-default': buildLangUrl('en', '/book/world-book/wiki/anna--tom'),
};

const PAIR_ROW = summary(PAIR_KEY, 'Anna Lark and Tom Reed', {
  type: 'pair',
  role: null,
  short: 'The mapmaker and the lamplighter.',
});

const LIST: BookWorldListResponse = {
  language: 'en',
  alternates: ALTERNATES,
  entities: [
    { ...summary('anna', 'Anna Lark'), forms: ['Anna Lark'] },
    { ...summary('tom', 'Tom Reed', { role: 'secondary' }), forms: ['Tom Reed'] },
    { ...summary('zed', 'Zed Park', { role: 'minor' }), forms: ['Zed Park'] },
  ],
};
const LIST_WITH_PAIR: BookWorldListResponse = {
  ...LIST,
  entities: [...LIST.entities, { ...PAIR_ROW, forms: [] }],
};

const PAIR_ENTITY: BookWorldEntity = {
  ...PAIR_ROW,
  aliases: null,
  profile: null,
  appearance: null,
  character: null,
  arc: null,
  scenes: null,
  relations: null,
  critique: null,
  prototypes: null,
  adaptations: null,
  sources: null,
  compare: [
    { feature: 'Work', a: 'Maps the road.', chapterA: 1, b: 'Lights the lamps.', chapterB: 2 },
    { feature: 'Fate', a: 'Leads.', chapterA: 3, b: 'Stays.', chapterB: 7 },
  ],
  bonds: 'The crossing binds them.',
  differences: 'She reads, he keeps the light.',
  quotes: [
    {
      text: 'He never let the lamp go out.',
      chapter: 3,
      speakerKey: 'anna',
      aboutKey: 'tom',
      interpretation: 'Her view of him.',
    },
  ],
  conclusion: 'One guides, the other lights the way.',
  faq: [{ question: 'Who leads?', answer: 'Anna Lark.' }],
  mentions: { chapters: [1, 2, 9], first: 1, perChapter: [], coPresence: [] },
  createdAt: '2026-11-01T10:00:00.000Z',
};

const HERO = (
  key: string,
  name: string,
  relations: BookWorldRelation[] | null
): BookWorldEntity => ({
  ...summary(key, name),
  aliases: null,
  profile: null,
  appearance: null,
  character: `${name} is steady.`,
  arc: null,
  scenes: null,
  relations,
  quotes: null,
  critique: null,
  prototypes: null,
  adaptations: null,
  compare: null,
  bonds: null,
  differences: null,
  conclusion: null,
  faq: null,
  sources: null,
  mentions: {
    chapters: [1, 2],
    first: 1,
    perChapter: [],
    coPresence: [{ key: 'zed', chapters: [1] }],
  },
  createdAt: '2026-11-01T10:00:00.000Z',
});

const entityResponse = (entity: BookWorldEntity): BookWorldEntityResponse => ({
  language: 'en',
  chapterNumbers: [1, 2, 3],
  entity,
  alternates: ALTERNATES,
  image: null,
});

const loadEntity = () => import('@/app/[lang]/book/[slug]/wiki/[entity]/page');
const loadIndex = () => import('@/app/[lang]/book/[slug]/wiki/page');
const renderEntity = async (key: string, lang = 'en') => {
  const { default: Page } = await loadEntity();
  return render(await Page({ params: Promise.resolve({ lang, slug: 'world-book', entity: key }) }));
};
const entityMeta = async (key: string) => {
  const { generateMetadata } = await loadEntity();
  return generateMetadata({
    params: Promise.resolve({ lang: 'en', slug: 'world-book', entity: key }),
  });
};

const h2Texts = () => screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
const hrefs = (root: HTMLElement) =>
  within(root)
    .getAllByRole('link')
    .map((a) => a.getAttribute('href'));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.beaconProps.length = 0;
  mocks.notFound.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  mocks.resolveRetiredSlug.mockResolvedValue(null);
  mocks.getBookOverview.mockResolvedValue(makeBook());
  mocks.getPublicBookWorld.mockResolvedValue(LIST_WITH_PAIR);
  mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(PAIR_ENTITY));
  mocks.getPublicBookAnalysis.mockResolvedValue(null);
  mocks.getPublicAudioChapters.mockResolvedValue([]);
  mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, follow' } });
});

describe('страница пары героев', () => {
  it('h1 «{Имя} и {Имя}: сравнительная характеристика», порядок разделов, оглавление ровно из них', async () => {
    await renderEntity(PAIR_KEY);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna Lark and Tom Reed: character comparison'
    );
    expect(h2Texts()).toEqual([
      'In brief',
      'Comparison',
      'Chapters they share',
      'What connects them',
      'What sets them apart',
      'Quotes about each other',
      'Conclusion',
      'Questions about Anna Lark and Tom Reed',
      'The characters',
    ]);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(hrefs(toc)).toEqual([
      '#in-brief',
      '#compare',
      '#shared-chapters',
      '#bonds',
      '#differences',
      '#quotes',
      '#conclusion',
      '#faq',
      '#next',
    ]);
    expect(mocks.beaconProps).toEqual([{ bookVersionId: 'v-en', entityKey: PAIR_KEY }]);
  });

  it('таблица сравнения: колонки по героям, главы ссылками в читалку, глава вне версии - текстом', async () => {
    const { container } = await renderEntity(PAIR_KEY);
    const table = container.querySelector('table') as HTMLElement;
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Feature', 'Anna Lark', 'Tom Reed']);
    expect(within(table).getAllByRole('row')).toHaveLength(3);
    expect(within(table).getByRole('rowheader', { name: 'Work' })).toBeInTheDocument();
    expect(hrefs(table)).toEqual([
      '/en/book/world-book/read?chapter=1',
      '/en/book/world-book/read?chapter=2',
      '/en/book/world-book/read?chapter=3',
    ]);
    expect(within(table).getByText('Chapter 7').closest('a')).toBeNull();
  });

  it('общие главы - посчитанное присутствие пары; глава вне версии не показывается', async () => {
    const { container } = await renderEntity(PAIR_KEY);
    const strip = container.querySelector('#shared-chapters') as HTMLElement;
    expect(
      within(strip).getByRole('list', {
        name: 'Chapters where Anna Lark and Tom Reed appear together',
      })
    ).toBeInTheDocument();
    // Общие главы 1 и 2; глава 9 вне версии.
    expect(strip).toHaveTextContent('1–2');
    expect(strip).not.toHaveTextContent('9');
  });

  it('цитата друг о друге «кто → о ком», вывод и ссылки на обоих героев', async () => {
    const { container } = await renderEntity(PAIR_KEY);
    expect(container.querySelector('#quotes')).toHaveTextContent('Anna Lark → Tom Reed');
    expect(container.querySelector('#conclusion')).toHaveTextContent(
      'One guides, the other lights the way.'
    );
    const next = container.querySelector('#next') as HTMLElement;
    expect(new Set(hrefs(next))).toEqual(
      new Set(['/en/book/world-book/wiki/anna', '/en/book/world-book/wiki/tom'])
    );
  });

  it('JSON-LD Article на адресе пары', async () => {
    const { container } = await renderEntity(PAIR_KEY);
    const ld = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(JSON.stringify(ld)).toContain('/en/book/world-book/wiki/anna--tom');
    expect(ld.headline).toBe('Anna Lark and Tom Reed: character comparison');
  });

  it('мета: title с книгой и автором, canonical на пару, hreflang, описание из «Коротко»', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue({
      ...entityResponse(PAIR_ENTITY),
      alternates: [...ALTERNATES, { language: 'ru', slug: 'mir-kniga' }],
    });
    const meta = await entityMeta(PAIR_KEY);
    expect(meta.title).toBe(
      'Anna Lark and Tom Reed in World Book by Jane Writer: character comparison'
    );
    expect(meta.description).toBe('The mapmaker and the lamplighter.');
    expect(meta.alternates?.canonical).toBe(buildLangUrl('en', '/book/world-book/wiki/anna--tom'));
    expect(meta.alternates?.languages).toEqual(HREFLANG_PAIR);
    expect(meta.robots).toBeUndefined();
  });

  it('isIndexable=false: открыта, но noindex и вне hreflang', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...PAIR_ENTITY, isIndexable: false })
    );
    const meta = await entityMeta(PAIR_KEY);
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it('список мира не загрузился: имя пары - из самой сущности, страница остаётся', async () => {
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    await renderEntity(PAIR_KEY);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna Lark and Tom Reed: character comparison'
    );
    expect((await entityMeta(PAIR_KEY)).title).toBe(
      'Anna Lark and Tom Reed in World Book by Jane Writer: character comparison'
    );
  });

  it('ручка ответила 404 (нет ядра, не прочитана, герой пропал) - 404 и noindex в мете', async () => {
    mocks.getPublicBookWorldEntity.mockRejectedValue(
      new ApiError({ statusCode: 404, message: 'x' })
    );
    await expect(renderEntity(PAIR_KEY)).rejects.toThrow('NEXT_NOT_FOUND');
    expect(await entityMeta(PAIR_KEY)).toEqual({ robots: { index: false, follow: true } });
  });

  it.each([
    ['a---b', 'anna---tom'],
    ['не по алфавиту', 'tom--anna'],
    ['один герой', 'anna--anna'],
  ])(
    'type pair с неканоническим ключом (%s): 404 и noindex в мете, не шаблон героя; отказ в журнале',
    async (_label, key) => {
      mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse({ ...PAIR_ENTITY, key }));
      await expect(renderEntity(key)).rejects.toThrow('NEXT_NOT_FOUND');
      expect(mocks.notFound).toHaveBeenCalledTimes(1);
      expect(vi.mocked(logError)).toHaveBeenCalledWith(
        'Book world pair with a non-canonical key:',
        key
      );
      expect(vi.mocked(logError)).toHaveBeenCalledTimes(1);
      // Мета - как у 404: noindex без title пары, canonical и hreflang.
      expect(await entityMeta(key)).toEqual({ robots: { index: false, follow: true } });
    }
  );

  it('частичная пара: пустые разделы не собираются, сторона без текста отфильтрована, чужое имя не подпись', async () => {
    // Героя anna нет ни в списке мира, ни в анализе: его имени нет.
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST_WITH_PAIR,
      entities: LIST_WITH_PAIR.entities.filter((e) => e.key !== 'anna'),
    });
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...PAIR_ENTITY,
        compare: [
          {
            feature: 'Work',
            a: 'Maps the road.',
            chapterA: 1,
            b: 'Lights the lamps.',
            chapterB: 2,
          },
          { feature: 'Fate', a: 'Leads.', chapterA: 3, b: '  ', chapterB: 3 },
        ],
        bonds: '',
        differences: null,
        conclusion: '   ',
        faq: null,
        quotes: [
          {
            text: 'He never let the lamp go out.',
            chapter: 3,
            speakerKey: 'anna',
            aboutKey: 'tom',
            interpretation: 'Her view of him.',
          },
        ],
      })
    );
    const { container } = await renderEntity(PAIR_KEY);
    // Имени героя нет - таблицы сравнения нет (блок без данных, `product.md` §1 п.5): ни «—», ни ключа.
    expect(h2Texts()).toEqual([
      'In brief',
      'Chapters they share',
      'Quotes about each other',
      'The characters',
    ]);
    expect(container.querySelector('table')).toBeNull();
    expect(container).not.toHaveTextContent('—');
    expect(container).not.toHaveTextContent('Maps the road.');
    // Говорящего не назвать - цитата без подписи, имя того, о ком она, автором не ставится.
    const quotes = container.querySelector('#quotes') as HTMLElement;
    expect(quotes).toHaveTextContent('He never let the lamp go out.');
    expect(quotes).not.toHaveTextContent('Tom Reed');
    // Имени героя нет - h1 из имени сущности.
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna Lark and Tom Reed: character comparison'
    );
  });

  it('имя говорящего из пробелов - цитата без подписи, а не « → Tom Reed»', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST_WITH_PAIR,
      entities: LIST_WITH_PAIR.entities.map((e) => (e.key === 'anna' ? { ...e, name: '   ' } : e)),
    } as BookWorldListResponse);
    const { container } = await renderEntity(PAIR_KEY);
    const quotes = container.querySelector('#quotes') as HTMLElement;
    expect(quotes).toHaveTextContent('He never let the lamp go out.');
    expect(quotes).not.toHaveTextContent('→');
  });

  it.each([
    ['нет первого героя', (e: { key: string }) => e.key !== 'anna', (e: object) => e],
    ['нет второго героя', (e: { key: string }) => e.key !== 'tom', (e: object) => e],
    [
      'имя второго героя из пробелов',
      () => true,
      (e: { key: string; name: string }) => (e.key === 'tom' ? { ...e, name: '   ' } : e),
    ],
  ])('таблицы сравнения нет, если у героя нет имени: %s', async (_label, keep, patch) => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST_WITH_PAIR,
      entities: LIST_WITH_PAIR.entities.filter(keep).map(patch),
    } as BookWorldListResponse);
    const { container } = await renderEntity(PAIR_KEY);
    expect(h2Texts()).not.toContain('Comparison');
    expect(container.querySelector('table')).toBeNull();
  });

  it('таблица сравнения: строка со стороной без текста отфильтрована, шапка - имена обоих героев', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...PAIR_ENTITY,
        compare: [
          {
            feature: 'Work',
            a: 'Maps the road.',
            chapterA: 1,
            b: 'Lights the lamps.',
            chapterB: 2,
          },
          { feature: 'Fate', a: 'Leads.', chapterA: 3, b: '  ', chapterB: 3 },
        ],
      })
    );
    const { container } = await renderEntity(PAIR_KEY);
    const table = container.querySelector('table') as HTMLElement;
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent)
    ).toEqual(['Feature', 'Anna Lark', 'Tom Reed']);
    expect(within(table).getAllByRole('row')).toHaveLength(2);
    expect(within(table).queryByRole('rowheader', { name: 'Fate' })).toBeNull();
  });

  it('хлебная крошка и title пары - те же имена, что в h1, а не имя сущности', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...PAIR_ENTITY, name: 'The mapmaker pair' })
    );
    await renderEntity(PAIR_KEY);
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' });
    expect(within(crumbs).getByText('Anna Lark and Tom Reed')).toHaveAttribute(
      'aria-current',
      'page'
    );
    expect(crumbs).not.toHaveTextContent('The mapmaker pair');
    expect((await entityMeta(PAIR_KEY)).title).toBe(
      'Anna Lark and Tom Reed in World Book by Jane Writer: character comparison'
    );
  });

  it('мета: список мира не загрузился - имена из анализа, как на странице; отказ в журнале', async () => {
    const book = makeBook();
    book.versions[0]._count.analyses = 1;
    mocks.getBookOverview.mockResolvedValue(book);
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    mocks.getPublicBookAnalysis.mockResolvedValue({
      characters: [
        { key: 'anna', name: 'Anna of the analysis' },
        { key: 'tom', name: 'Tom of the analysis' },
      ],
    });
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...PAIR_ENTITY, name: 'The mapmaker pair' })
    );
    expect((await entityMeta(PAIR_KEY)).title).toBe(
      'Anna of the analysis and Tom of the analysis in World Book by Jane Writer: character comparison'
    );
    expect(vi.mocked(logError)).toHaveBeenCalledWith(
      'Error loading book world list for pair metadata:',
      expect.any(ApiError)
    );
    expect(vi.mocked(logError)).toHaveBeenCalledTimes(1);
  });

  it('имя героя в списке мира из пробелов - h1 и title берут имя из анализа', async () => {
    const book = makeBook();
    book.versions[0]._count.analyses = 1;
    mocks.getBookOverview.mockResolvedValue(book);
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST_WITH_PAIR,
      entities: LIST_WITH_PAIR.entities.map((e) => (e.key === 'anna' ? { ...e, name: '   ' } : e)),
    } as BookWorldListResponse);
    mocks.getPublicBookAnalysis.mockResolvedValue({
      characters: [{ key: 'anna', name: 'Anna of the analysis' }],
    });
    await renderEntity(PAIR_KEY);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna of the analysis and Tom Reed: character comparison'
    );
    expect((await entityMeta(PAIR_KEY)).title).toBe(
      'Anna of the analysis and Tom Reed in World Book by Jane Writer: character comparison'
    );
  });

  it('пять языков: h1 пары по формуле языка', async () => {
    const heading = async (lang: string) => {
      mocks.getBookOverview.mockResolvedValue(makeBook(lang));
      cleanup();
      await renderEntity(PAIR_KEY, lang);
      return screen.getByRole('heading', { level: 1 }).textContent;
    };
    expect(await heading('ru')).toBe('Anna Lark и Tom Reed: сравнительная характеристика');
    expect(await heading('es')).toBe('Anna Lark y Tom Reed: comparación de personajes');
    expect(await heading('fr')).toBe('Anna Lark et Tom Reed : comparaison des personnages');
    expect(await heading('pt')).toBe('Anna Lark e Tom Reed: comparação de personagens');
    expect(await heading('en')).toBe('Anna Lark and Tom Reed: character comparison');
  });
});

describe('пара: ссылки с героя и исключения', () => {
  it('герой: на строке партнёра с публичной парой - ссылка на пару, у остальных нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(
        HERO('anna', 'Anna Lark', [
          { to: 'tom', label: 'Friend of' },
          { to: 'zed', label: 'Mentor of' },
        ])
      )
    );
    const { container } = await renderEntity('anna');
    const rel = container.querySelector('#relations') as HTMLElement;
    const links = within(rel).getAllByRole('link', { name: /Compare/ });
    expect(links.map((a) => a.getAttribute('href'))).toEqual([
      '/en/book/world-book/wiki/anna--tom',
    ]);
    expect(links[0]).toHaveTextContent('Compare Anna Lark and Tom Reed');
  });

  it('ключ собирается по алфавиту: со страницы второго героя ссылка та же', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(HERO('tom', 'Tom Reed', [{ to: 'anna', label: 'Ally of' }]))
    );
    const { container } = await renderEntity('tom');
    const rel = container.querySelector('#relations') as HTMLElement;
    expect(within(rel).getByRole('link', { name: /Compare/ })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/anna--tom'
    );
  });

  it('пара - отдельной строкой «Отношений» без повтора, даже без строки партнёра в relations и соседях', async () => {
    const noNeighbours = { chapters: [1, 2], first: 1, perChapter: [], coPresence: [] };
    const compareLinks = async (key: string, name: string) => {
      cleanup();
      mocks.getPublicBookWorldEntity.mockResolvedValue(
        entityResponse({ ...HERO(key, name, null), mentions: noNeighbours })
      );
      const { container } = await renderEntity(key);
      const rel = container.querySelector('#relations') as HTMLElement;
      return within(rel)
        .getAllByRole('link', { name: /Compare/ })
        .map((a) => [a.textContent, a.getAttribute('href')]);
    };
    const expected = [['Compare Anna Lark and Tom Reed', '/en/book/world-book/wiki/anna--tom']];
    // Без отношений и соседей - ссылка всё равно есть, с обеих страниц героев.
    expect(await compareLinks('anna', 'Anna Lark')).toEqual(expected);
    expect(await compareLinks('tom', 'Tom Reed')).toEqual(expected);

    // Партнёр и в отношениях, и в соседях - ссылка одна.
    cleanup();
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...HERO('tom', 'Tom Reed', [{ to: 'anna', label: 'Ally of' }]),
        mentions: { ...noNeighbours, coPresence: [{ key: 'anna', chapters: [1] }] },
      })
    );
    const { container } = await renderEntity('tom');
    const rel = container.querySelector('#relations') as HTMLElement;
    expect(
      within(rel)
        .getAllByRole('link', { name: /Compare/ })
        .map((a) => a.textContent)
    ).toEqual(['Compare Anna Lark and Tom Reed']);
  });

  it.each([
    ['без ядра', { hasCore: false }],
    [
      'с editor (ответ редактору)',
      {
        editor: {
          isVisible: true,
          isListed: false,
          readAt: null,
          autoTextAt: null,
          firstPublishedAt: null,
          missing: [],
          mentionChapters: null,
        },
      },
    ],
  ])('пара в списке %s - ссылки на неё нет', async (_label, over) => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: [...LIST.entities, { ...PAIR_ROW, ...over, forms: [] }],
    });
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(HERO('anna', 'Anna Lark', [{ to: 'tom', label: 'Friend of' }]))
    );
    const { container } = await renderEntity('anna');
    expect(within(container).queryByRole('link', { name: /Compare/ })).toBeNull();
  });

  it('пары нет в списке (не публична) - ссылки на неё нет', async () => {
    mocks.getPublicBookWorld.mockResolvedValue(LIST);
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(HERO('anna', 'Anna Lark', [{ to: 'tom', label: 'Friend of' }]))
    );
    const { container } = await renderEntity('anna');
    expect(within(container).queryByRole('link', { name: /Compare/ })).toBeNull();
  });

  it.each([
    ['ключ не по алфавиту (tom--anna)', 'tom--anna'],
    ['один и тот же герой (anna--anna)', 'anna--anna'],
  ])('пара в списке, %s - ссылки в «Отношениях» нет', async (_label, key) => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: [...LIST.entities, { ...PAIR_ROW, key, forms: [] }],
    });
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(HERO('anna', 'Anna Lark', [{ to: 'tom', label: 'Friend of' }]))
    );
    const { container } = await renderEntity('anna');
    const rel = container.querySelector('#relations') as HTMLElement;
    expect(within(rel).queryByRole('link', { name: /Compare/ })).toBeNull();
    expect(rel.innerHTML).not.toContain(`wiki/${key}`);
  });

  it('общая /wiki: пары нет среди карточек героев', async () => {
    const { default: Page } = await loadIndex();
    const { container } = render(
      await Page({ params: Promise.resolve({ lang: 'en', slug: 'world-book' }) })
    );
    const heroes = container.querySelector('#characters > ul') as HTMLElement;
    expect(within(heroes).getAllByRole('listitem')).toHaveLength(3);
    expect(container.innerHTML).not.toContain('anna--tom');
  });

  it('в тексте имя пары не цель ссылки, имена героев внутри него - ссылки на героев', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: [...LIST.entities, { ...PAIR_ROW, forms: ['Anna Lark and Tom Reed'] }],
    });
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...HERO('tom', 'Tom Reed', null),
        character: 'Loyal to Zed Park and Anna Lark and Tom Reed.',
      })
    );
    const { container } = await renderEntity('tom');
    // Ссылка на пару - только строкой «Отношений», в тексте имя пары ссылкой не становится.
    expect(container.querySelector('#character')?.innerHTML).not.toContain('wiki/anna--tom"');
    expect(container.querySelector('a[href$="/wiki/zed"]')).not.toBeNull();
    expect(container.querySelector('a[href$="/wiki/anna"]')).not.toBeNull();
  });

  it('карта сайта: пара из ответа ручки попадает в файл, фронт тип не фильтрует', async () => {
    const { buildWorldSitemapItems } = await import('@/lib/sitemap/world');
    const items = await buildWorldSitemapItems('en', 1, async () => ({
      items: [
        {
          slug: 'world-book',
          lastmod: '2026-11-10T08:00:00.000Z',
          alternates: ALTERNATES,
          entities: [
            { key: 'anna', lastmod: '2026-11-12T09:30:00.000Z', alternates: ALTERNATES },
            { key: PAIR_KEY, lastmod: '2026-11-13T07:15:00.000Z', alternates: ALTERNATES },
          ],
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }));
    const pairUrl = 'https://bibliaris.com/en/book/world-book/wiki/anna--tom';
    // Запись пары целиком: адрес, дата пары из ответа (не героя и не версии) и кластер hreflang.
    expect(items.filter((i) => String(i.url).endsWith('/wiki/anna--tom'))).toEqual([
      {
        url: pairUrl,
        lastModified: '2026-11-13T07:15:00.000Z',
        changeFrequency: 'weekly',
        priority: 0.6,
        alternates: { languages: { en: pairUrl, 'x-default': pairUrl } },
      },
    ]);
  });
});

describe('пара: спойлер-остров (F08-10b, решение `F08 | F08-10b` Q4)', () => {
  beforeEach(() => {
    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber: 1 };
  });

  afterEach(() => {
    spoiler.session = { data: null, status: 'unauthenticated' };
    spoiler.progress = undefined;
  });

  it('цитата с главой больше главы читателя свёрнута; таблица сравнения не сворачивается', async () => {
    await renderEntity(PAIR_KEY);
    expect(screen.getByText(/He never let the lamp go out\./).closest('[hidden]')).not.toBeNull();
    expect(screen.getByText('Opens after chapter 3', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'reveal now' })).toBeInTheDocument();
    expect(screen.getByText('Stays.').closest('[hidden]')).toBeNull();
    expect(screen.getByText('Leads.').closest('[hidden]')).toBeNull();
  });
});
