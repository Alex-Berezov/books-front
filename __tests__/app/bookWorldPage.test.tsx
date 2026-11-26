import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { quoteCardClassName } from '@/components/common/QuotesBlock/QuotesBlock';
import { ApiError } from '@/types/api';
import type { BookWorldAlternate } from '@/types/api-schema';

/**
 * Страницы мира книги `/{lang}/book/{slug}/wiki` и `/wiki/{key}` (F08-3b, `product.md` §3-§5, §12, §16):
 * серверный рендер, блок без данных не выводится, ссылка на главу - только на существующую, «Слушать» -
 * только при аудиоглаве того же номера, пометка «спойлер», 404-ветки, `noindex` при
 * `isIndexable=false` и при `noindex` книги, hreflang - из поля `alternates` ответа.
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
  getBookOverview: vi.fn(),
  getPublicBookWorld: vi.fn(),
  getPublicBookWorldEntity: vi.fn(),
  getPublicBookAnalysis: vi.fn(),
  getPublicAudioChapters: vi.fn(),
  resolveSeo: vi.fn(),
  resolveRetiredSlug: vi.fn(),
  noteDegraded: vi.fn(),
  logError: vi.fn(),
  beaconProps: [] as { bookVersionId: string; entityKey?: string }[],
}));

vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  permanentRedirect: mocks.permanentRedirect,
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

vi.mock('@/lib/seo/retired-slug', () => ({ resolveRetiredSlug: mocks.resolveRetiredSlug }));

vi.mock('@/lib/seo/degraded', () => ({ noteDegraded: mocks.noteDegraded }));

vi.mock('@/lib/utils/log-error', () => ({ logError: mocks.logError }));

vi.mock('@/app/[lang]/book/[slug]/RelatedBooksSection', () => ({
  RelatedBooksSection: () => null,
}));

// Спойлер-остров (`F08-10b`) берёт сессию и прогресс на клиенте; здесь - аноним без прогресса,
// так же, как страницу видит краулер.
const spoiler = vi.hoisted(() => ({
  session: { data: null as unknown, status: 'unauthenticated' },
  progress: undefined as unknown,
  versionIds: [] as string[],
}));

vi.mock('next-auth/react', () => ({ useSession: () => spoiler.session }));

vi.mock('@/api/hooks/useProgress', () => ({
  useProgress: (versionId: string) => {
    spoiler.versionIds.push(versionId);
    return { data: spoiler.progress };
  },
}));

// Счётчик - клиентская обёртка с `fetch` на монтировании: здесь проверяется страница, а не он, -
// только то, какую версию и какой ключ страница ему передала.
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

const version = (language: string, slug: string, worldEntities: number) => ({
  id: `v-${language}`,
  type: 'text',
  language,
  slug,
  title: language === 'ru' ? 'Мир-книга' : 'World Book',
  author: 'Jane Writer',
  isFree: true,
  translators: [],
  originalLanguage: 'en',
  _count: { chapters: 3, audioChapters: 1, summaries: 0, analyses: 1, worldEntities },
});

const makeBook = (over: Record<string, unknown> = {}) => ({
  id: 'b1',
  slug: 'world-book',
  title: 'World Book',
  author: 'Jane Writer',
  authorSlug: 'jane-writer',
  firstPublishedYear: 1900,
  primaryCategory: { name: 'Novel' },
  coverUrl: 'https://cdn.bibliaris.com/world.jpg',
  versionIds: { text: 'v-en', audio: 'a-en' },
  versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 1)],
  ...over,
});

const summary = (key: string, name: string, over: Record<string, unknown> = {}) => ({
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

const ALTERNATES: BookWorldAlternate[] = [
  { language: 'en', slug: 'world-book' },
  { language: 'ru', slug: 'mir-kniga' },
];

const LIST = {
  language: 'en',
  alternates: ALTERNATES,
  entities: [
    summary('anna', 'Anna Lark', { updatedAt: '2026-11-05T10:00:00.000Z' }),
    summary('tom', 'Tom Reed', { role: 'secondary', mentionFirst: 2 }),
    summary('zed', 'Zed Park', { role: 'minor', mentionFirst: null }),
    summary('bea', 'Bea Moss', { role: 'minor' }),
    summary('cal', 'Cal Dune', { role: 'minor' }),
  ],
  places: [],
};

const ENTITY_FULL = {
  ...summary('anna', 'Anna Lark', { updatedAt: '2026-11-05T10:00:00.000Z' }),
  aliases: ['Anna'],
  profile: { position: 'Mapmaker', relationToMain: 'The main heroine' },
  appearance: 'Tall, with ink on her fingers.',
  character: 'Steady and curious.',
  arc: {
    from: 'A mapmaker at home',
    to: 'A guide',
    stages: [
      { title: 'The map', text: 'Reads the signs.', chapter: 1 },
      { title: 'The bridge', text: 'Leads the crossing.', chapter: 2 },
      { title: 'The end', text: 'Closes the map.', chapter: 3 },
    ],
  },
  scenes: [
    { chapter: 1, title: 'The map scene', text: 'Opening.', paragraph: 4 },
    { chapter: 2, title: 'The bridge scene', text: 'Crossing.' },
  ],
  relations: [
    { to: 'tom', label: 'Friend and fellow traveller' },
    { to: 'ghost', label: 'Rival of' },
  ],
  quotes: [
    { text: 'Quote one.', chapter: 1, interpretation: 'Meaning one.', speakerKey: 'tom' },
    { text: 'Quote seven.', chapter: 7, interpretation: 'Meaning seven.' },
    { text: 'Quote three.', chapter: 3, interpretation: 'Meaning three.' },
  ],
  critique: 'Critics read her as foresight.',
  prototypes: 'No known prototype.',
  adaptations: [
    { title: 'Service film', year: 2001, actor: 'Service Actor', differences: 'Night crossing.' },
  ],
  faq: [{ question: 'Who is Anna Lark?', answer: 'The mapmaker.' }],
  sources: [{ title: 'Service source', url: 'https://example.com/source' }],
  kind: null,
  location: null,
  significance: null,
  description: null,
  wikidataId: null,
  point: null,
  mentions: {
    chapters: [1, 2, 3, 9],
    first: 1,
    perChapter: [],
    coPresence: [
      { key: 'zed', chapters: [1, 2] },
      { key: 'tom', chapters: [1, 2, 3] },
      { key: 'bea', chapters: [1] },
      { key: 'cal', chapters: [1] },
      { key: 'ghost', chapters: [1, 2, 3, 4] },
    ],
  },
  createdAt: '2026-11-01T10:00:00.000Z',
};

const ENTITY_MINIMAL = {
  ...summary('tom', 'Tom Reed', { role: null, short: 'A lamplighter.', mentionFirst: null }),
  aliases: null,
  profile: null,
  appearance: null,
  character: 'Loyal.',
  arc: { from: 'Follower', to: 'Keeper', stages: null },
  scenes: [{ chapter: 1, title: 'The door', text: 'He watches.' }],
  relations: null,
  quotes: [{ text: 'Door quote.', chapter: 1, interpretation: 'Watching.' }],
  critique: 'Hidden without sources.',
  prototypes: 'Hidden without sources.',
  adaptations: [{ title: 'Hidden film', differences: 'Hidden.' }],
  faq: null,
  sources: null,
  mentions: null,
  createdAt: '2026-11-01T10:00:00.000Z',
};

const entityResponse = (entity: Record<string, unknown>, over: Record<string, unknown> = {}) => ({
  language: 'en',
  chapterNumbers: [1, 2, 3],
  entity,
  alternates: ALTERNATES,
  image: null,
  ...over,
});

const ANALYSIS = {
  language: 'en',
  hasCore: true,
  chapterNumbers: [1, 2, 3],
  mainIdea: 'Idea.',
  themes: [{ key: 'courage', title: 'Courage' }],
  characters: [
    {
      key: 'anna',
      name: 'Anna Lark',
      role: 'main',
      relations: [
        { to: 'tom', label: 'friend of' },
        { to: 'zed', label: 'mentor of' },
      ],
    },
    { key: 'tom', name: 'Tom Reed', role: 'secondary', relations: [{ to: 'anna', label: 'ally' }] },
    { key: 'zed', name: 'Zed Park', role: 'secondary', relations: null },
    { key: 'ghost', name: 'The Ghost', role: 'secondary', relations: null },
  ],
  createdAt: '2026-10-17T09:00:00.000Z',
  updatedAt: '2026-10-18T10:00:00.000Z',
};

const loadIndex = () => import('@/app/[lang]/book/[slug]/wiki/page');
const loadEntity = () => import('@/app/[lang]/book/[slug]/wiki/[entity]/page');

const renderIndex = async (lang = 'en', slug = 'world-book') => {
  const { default: Page } = await loadIndex();
  return render(await Page({ params: Promise.resolve({ lang, slug }) }));
};
const renderEntity = async (key = 'anna', lang = 'en', slug = 'world-book') => {
  const { default: Page } = await loadEntity();
  return render(await Page({ params: Promise.resolve({ lang, slug, entity: key }) }));
};
const indexMeta = async (lang = 'en', slug = 'world-book') => {
  const { generateMetadata } = await loadIndex();
  return generateMetadata({ params: Promise.resolve({ lang, slug }) });
};
const entityMeta = async (key = 'anna', lang = 'en', slug = 'world-book') => {
  const { generateMetadata } = await loadEntity();
  return generateMetadata({ params: Promise.resolve({ lang, slug, entity: key }) });
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
  mocks.redirect.mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
  mocks.resolveRetiredSlug.mockResolvedValue(null);
  mocks.getBookOverview.mockResolvedValue(makeBook());
  mocks.getPublicBookWorld.mockResolvedValue(LIST);
  mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_FULL));
  mocks.getPublicBookAnalysis.mockResolvedValue(ANALYSIS);
  mocks.getPublicAudioChapters.mockResolvedValue([{ number: 1 }]);
  mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'index, follow' } });
});

describe('общая страница мира', () => {
  it('h1 по формуле, карточки героев со ссылкой на страницу и «впервые - глава N»', async () => {
    const { container } = await renderIndex();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'World Book: characters, places and world of the book'
    );
    const heroes = container.querySelector('#characters > ul') as HTMLElement;
    const anna = within(heroes).getByRole('link', { name: 'Anna Lark' });
    expect(anna).toHaveAttribute('href', '/en/book/world-book/wiki/anna');
    // Глава есть у героев с `mentionFirst`; у Zed Park его нет - строки нет вовсе.
    const read = within(container).getAllByRole('link', { name: 'Chapter 1' });
    expect(read[0]).toHaveAttribute('href', '/en/book/world-book/read?chapter=1');
    expect(within(container).queryAllByText(/First appears:/)).toHaveLength(4);
  });

  it('оглавление - ровно из выведенных разделов; подпись ведёт на раздел world и несёт максимальную дату', async () => {
    await renderIndex();

    // Карта отношений - своим разделом после карточек героев (§4 п.5).
    expect(h2Texts()).toEqual(['Characters', 'Character relationships', 'More about the book']);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(hrefs(toc)).toEqual(['#characters', '#relations-map', '#more']);
    expect(document.querySelector('#relations-map svg[role="img"]')).not.toBeNull();
    expect(document.querySelector('#characters svg')).toBeNull();
    const byline = screen.getByRole('link', { name: 'Bibliaris Editorial Team' });
    expect(byline).toHaveAttribute('href', '/en/editorial-policy#world');
    // Максимальный `updatedAt` из публичных сущностей - 5 ноября.
    expect(byline.parentElement).toHaveTextContent(/November 5, 2026/);
  });

  it('карта отношений: узлы публичных героев - ссылки, непубличный герой анализа - без ссылки', async () => {
    const { container } = await renderIndex();

    const svg = container.querySelector('svg[role="img"]') as SVGElement;
    const nodeLinks = [...svg.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(nodeLinks).toEqual([
      '/en/book/world-book/wiki/anna',
      '/en/book/world-book/wiki/tom',
      '/en/book/world-book/wiki/zed',
    ]);
    // «The Ghost» - герой анализа без страницы: узла-ссылки нет.
    expect(svg.querySelectorAll('a')).toHaveLength(3);
  });

  it('без анализа карты и ссылки на анализ нет, страница остаётся', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue(null);
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          { ...version('en', 'world-book', 3), _count: { worldEntities: 3, analyses: 0 } },
        ],
      })
    );
    const { container } = await renderIndex();

    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Analysis of the book' })).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('у версии без анализа по счётчику обзора анализ не запрашивается (общая и героя)', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [
          { ...version('en', 'world-book', 3), _count: { worldEntities: 3, analyses: 0 } },
        ],
      })
    );
    await renderIndex();
    cleanup();
    await renderEntity();
    expect(mocks.getPublicBookAnalysis).not.toHaveBeenCalled();
  });

  it('у версии без текста ссылок на главы нет', async () => {
    mocks.getBookOverview.mockResolvedValue(makeBook({ versionIds: { text: null, audio: null } }));
    await renderIndex();

    expect(screen.queryByRole('link', { name: /Chapter \d/ })).toBeNull();
    expect(screen.getAllByText(/First appears:/).length).toBeGreaterThan(0);
  });

  it('«Читать с начала» - на первую главу читалки, а не на сохранённое место (§4 п.7)', async () => {
    const { container } = await renderIndex();
    const more = container.querySelector('#more') as HTMLElement;
    expect(within(more).getByRole('link', { name: 'Read from the beginning' })).toHaveAttribute(
      'href',
      '/en/book/world-book/read?chapter=1'
    );
  });

  it('счётчик получает версию языка страницы и не получает ключа', async () => {
    await renderIndex();
    expect(mocks.beaconProps).toEqual([{ bookVersionId: 'v-en' }]);
  });

  // §4: существование - по любой публичной сущности (как карта сайта и `_count.worldEntities`),
  // список героев - только `character`.
  it('в списке нет героев, но есть другие сущности - страница есть, без раздела героев', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: [summary('harbour', 'The Harbour', { type: 'place' })],
    });
    const { container } = await renderIndex();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(container.querySelector('#characters')).toBeNull();
    expect(screen.queryByText('The Harbour')).toBeNull();
    expect((await indexMeta()).robots).toBeUndefined();
  });

  it('публичных сущностей нет вовсе - 404 и мета noindex: одно правило', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, entities: [] });
    await expect(renderIndex()).rejects.toThrow('NEXT_NOT_FOUND');
    expect(await indexMeta()).toEqual({ robots: { index: false, follow: true } });
  });

  it('название с `$&` попадает в h1 и title как есть', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [{ ...version('en', 'world-book', 3), title: 'Cash $& Carry' }],
      })
    );
    await renderIndex();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Cash $& Carry: characters, places and world of the book'
    );
    expect((await indexMeta()).title).toBe(
      'Cash $& Carry: characters, places and world of the book — Jane Writer'
    );
  });

  it('отказ анализа: карты нет, страница остаётся, отказ записан в журнал', async () => {
    mocks.getPublicBookAnalysis.mockRejectedValue(new ApiError({ statusCode: 502, message: 'x' }));
    const { container } = await renderIndex();
    expect(container.querySelector('#relations-map')).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(mocks.logError).toHaveBeenCalledTimes(1);
    expect(mocks.logError).toHaveBeenCalledWith(
      'Error loading book analysis for book world:',
      expect.any(ApiError)
    );
  });

  it('451 в мете - noindex без записи о деградации (правовой отказ - не сбой)', async () => {
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 451, message: 'x' }));
    expect(await indexMeta()).toEqual({ robots: { index: false, follow: true } });
    expect(mocks.noteDegraded).not.toHaveBeenCalled();
    // Отказ транспорта - по-прежнему деградация и 5xx.
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 502, message: 'x' }));
    await expect(indexMeta()).rejects.toBeInstanceOf(ApiError);
    expect(mocks.noteDegraded).toHaveBeenCalledTimes(1);
  });

  it('нет публичных сущностей - 404', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, entities: [] });
    await expect(renderIndex()).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('404 ручки и язык без версии - 404; 5xx - отказ, а не 404', async () => {
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 404, message: 'x' }));
    await expect(renderIndex()).rejects.toThrow('NEXT_NOT_FOUND');

    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 502, message: 'x' }));
    await expect(renderIndex()).rejects.toBeInstanceOf(ApiError);

    mocks.notFound.mockClear();
    await expect(renderIndex('fr')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('пропавшее поле ответа - отказ загрузки, а не молчаливый 404', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ language: 'en', alternates: ALTERNATES });
    await expect(renderIndex()).rejects.toThrow(/carries no entities/);
    expect(mocks.notFound).not.toHaveBeenCalled();

    mocks.getPublicBookWorld.mockResolvedValue(LIST);
    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versions: [{ ...version('en', 'world-book', 3), _count: { chapters: 3 } }] })
    );
    await expect(renderIndex()).rejects.toThrow(/no world entity count/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  // 🔴 L-013: нечитаемая дата не становится эпохой 1970 в JSON-LD и подписи.
  it('ни одна дата updatedAt не разобралась - отказ загрузки, а не эпоха 1970', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: LIST.entities.map((e) => ({ ...e, updatedAt: 'not-a-date' })),
    });
    await expect(renderIndex()).rejects.toThrow(/carries no readable updatedAt/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('часть дат нечитаема - JSON-LD по читаемым, без 1970', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: [
        summary('anna', 'Anna Lark', { updatedAt: 'not-a-date' }),
        summary('tom', 'Tom Reed', { updatedAt: '2026-11-03T10:00:00.000Z' }),
      ],
    });
    const { container } = await renderIndex();
    const ld = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(ld?.textContent ?? '{}');
    expect(data.dateModified).toBe('2026-11-03T10:00:00.000Z');
    expect(data.datePublished).toBe('2026-11-03T10:00:00.000Z');
    expect(container.innerHTML).not.toContain('1970');
  });

  it('другой слаг книги - 307 на канонический', async () => {
    await expect(renderIndex('en', 'old-slug')).rejects.toThrow('NEXT_REDIRECT');
    expect(mocks.redirect).toHaveBeenCalledTimes(1);
    expect(mocks.redirect).toHaveBeenCalledWith('/en/book/world-book/wiki');
  });

  it('JSON-LD Article об этой книге, без FAQPage', async () => {
    const { container } = await renderIndex();
    const ld = container.querySelector('script[type="application/ld+json"]');
    const data = JSON.parse(ld?.textContent ?? '{}');
    expect(data['@type']).toBe('Article');
    expect(data.author.name).toBe('Bibliaris Editorial Team');
    expect(data.about['@id']).toMatch(/\/en\/book\/world-book#book$/);
    expect(container.innerHTML).not.toContain('FAQPage');
  });

  it('мета: title, description по формуле, canonical и hreflang из alternates', async () => {
    const meta = await indexMeta();
    expect(meta.title).toBe('World Book: characters, places and world of the book — Jane Writer');
    expect(String(meta.description).length).toBeLessThanOrEqual(160);
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toMatch(/\/en\/book\/world-book\/wiki$/);
    expect(Object.keys(meta.alternates?.languages ?? {}).sort()).toEqual(['en', 'ru', 'x-default']);
  });

  it('общая страница индексируется и при всех isIndexable=false, пока нет noindex книги (Q10)', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: LIST.entities.map((e) => ({ ...e, isIndexable: false })),
    });
    expect((await indexMeta()).robots).toBeUndefined();
  });

  it('noindex книги закрывает мир: noindex, follow и вне hreflang', async () => {
    mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'noindex, follow' } });
    const meta = await indexMeta();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it('пустой alternates - hreflang не выводится', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, alternates: [] });
    expect((await indexMeta()).alternates?.languages).toBeUndefined();
  });

  it('кластер без самой страницы - hreflang не выводится (ownClusterOrNone)', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      alternates: [{ language: 'ru', slug: 'mir-kniga' }],
    });
    expect((await indexMeta()).alternates?.languages).toBeUndefined();
  });

  it('мета страницы без мира - noindex', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, entities: [] });
    expect(await indexMeta()).toEqual({ robots: { index: false, follow: true } });
  });
});

describe('страница героя: полный герой', () => {
  it('h1 по формуле и порядок разделов §5; оглавление ровно из них', async () => {
    await renderEntity();

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna Lark in World Book: character analysis'
    );
    expect(h2Texts()).toEqual([
      'About the character',
      'In brief',
      'Presence across the chapters',
      'Appearance',
      'Character',
      'Character path',
      'Key scenes',
      'Relationships',
      'Quotes',
      'The character in criticism',
      'Prototypes',
      'On screen and stage',
      'Sources',
      'Questions about Anna Lark',
      'Next',
    ]);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(hrefs(toc)).toHaveLength(15);
  });

  it('крошки: Главная, книга, «Мир книги» ссылкой, имя', async () => {
    await renderEntity();
    const crumbs = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(hrefs(crumbs)).toEqual(['/en', '/en/book/world-book', '/en/book/world-book/wiki']);
    expect(within(crumbs).getByText('Anna Lark')).toBeInTheDocument();
  });

  it('ссылки на главы - только на существующие; несуществующая глава - номер текстом', async () => {
    const { container } = await renderEntity();

    const quotes = container.querySelector('#quotes') as HTMLElement;
    expect(within(quotes).getByRole('link', { name: 'Chapter 1' })).toHaveAttribute(
      'href',
      '/en/book/world-book/read?chapter=1'
    );
    expect(within(quotes).queryByRole('link', { name: 'Chapter 7' })).toBeNull();
    expect(within(quotes).getByText('Chapter 7')).toBeInTheDocument();
    // Глава 9 из присутствия есть в тексте мира, но нет в версии: клетки и подписи для неё нет.
    const presence = container.querySelector('#presence') as HTMLElement;
    expect(presence).toHaveTextContent('Chapters: 1–3');
    expect(presence.textContent).not.toContain('9');
  });

  it('полоса присутствия: клетка на главу, закрашена и ссылкой у тех, где герой есть', async () => {
    const { container } = await renderEntity();
    const cells = container.querySelectorAll('#presence ol > li');
    expect(cells).toHaveLength(3);
    expect(container.querySelectorAll('#presence ol a')).toHaveLength(3);
  });

  it('больше 120 глав - только подпись текстом, клеток нет', async () => {
    const many = Array.from({ length: 130 }, (_, i) => i + 1);
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(
        {
          ...ENTITY_FULL,
          mentions: { ...ENTITY_FULL.mentions, chapters: [1, 2, 3, 7, 9, 10, 11, 12] },
        },
        { chapterNumbers: many }
      )
    );
    const { container } = await renderEntity();
    expect(container.querySelectorAll('#presence ol')).toHaveLength(0);
    expect(container.querySelector('#presence')).toHaveTextContent('Chapters: 1–3, 7, 9–12');
  });

  // F08-10a: абзац сцены из хода - в ссылке читалки; сцена без абзаца ведёт на главу.
  it('«Читать сцену» открывает абзац сцены, без абзаца - главу', async () => {
    const { container } = await renderEntity();
    const scenes = container.querySelector('#scenes') as HTMLElement;
    const read = within(scenes).getAllByRole('link', { name: 'Read the scene' });
    expect(read.map((a) => a.getAttribute('href'))).toEqual([
      '/en/book/world-book/read?chapter=1&p=4',
      '/en/book/world-book/read?chapter=2',
    ]);
  });

  it('«Слушать» - только у сцены с аудиоглавой того же номера', async () => {
    const { container } = await renderEntity();
    const scenes = container.querySelector('#scenes') as HTMLElement;
    expect(within(scenes).getAllByRole('link', { name: 'Read the scene' })).toHaveLength(2);
    const listen = within(scenes).getAllByRole('link', { name: 'Listen' });
    expect(listen).toHaveLength(1);
    // На аудиоглаву того же номера (Q6): плеер откроет её, а не сохранённое место.
    expect(listen[0]).toHaveAttribute('href', '/en/book/world-book/listen?chapter=1');
    // Ссылка стоит в карточке сцены главы 1, а не главы 2.
    expect(listen[0].closest('li')).toHaveTextContent('The map scene');
  });

  it('без аудиоверсии книги «Слушать» нет совсем', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versionIds: { text: 'v-en', audio: null } })
    );
    const { container } = await renderEntity();
    expect(
      within(container.querySelector('#scenes') as HTMLElement).queryByRole('link', {
        name: 'Listen',
      })
    ).toBeNull();
    expect(mocks.getPublicAudioChapters).not.toHaveBeenCalled();
  });

  it('отказ ручки аудиоглав не ломает страницу: ссылок «Слушать» нет', async () => {
    mocks.getPublicAudioChapters.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    const { container } = await renderEntity();
    expect(
      within(container.querySelector('#scenes') as HTMLElement).queryByRole('link', {
        name: 'Listen',
      })
    ).toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
  });

  it('пометка «спойлер» - только у этапов последней трети книги', async () => {
    const { container } = await renderEntity();
    const arc = container.querySelector('#path') as HTMLElement;
    const tagged = within(arc).getAllByText('Spoiler');
    expect(tagged).toHaveLength(1);
    expect(tagged[0].closest('li')).toHaveTextContent('The end');
  });

  it('отношения: герой со страницей - ссылкой, остальные - текстом; соседи по coPresence', async () => {
    const { container } = await renderEntity();
    const rel = container.querySelector('#relations') as HTMLElement;
    expect(within(rel).getAllByRole('link', { name: 'Tom Reed' })[0]).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/tom'
    );
    // «ghost» - герой анализа без страницы: имя текстом, ссылки нет.
    expect(within(rel).queryByRole('link', { name: 'The Ghost' })).toBeNull();
    expect(rel).toHaveTextContent('Rival of → The Ghost');
    // «Чаще всего»: 3 героя, больше общих глав выше, при равенстве по ключу; непубличный ghost не входит.
    const heading = within(rel).getByRole('heading', { level: 3 });
    const list = heading.nextElementSibling as HTMLElement;
    expect(
      within(list)
        .getAllByRole('link')
        .map((a) => a.textContent)
    ).toEqual(['Tom Reed', 'Zed Park', 'Bea Moss']);
  });

  it('«Дальше»: до 6 карточек соседей и ссылки на анализ и читалку', async () => {
    const { container } = await renderEntity();
    const next = container.querySelector('#next') as HTMLElement;
    expect(
      within(next)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent)
    ).toEqual(['Tom Reed', 'Zed Park', 'Bea Moss', 'Cal Dune']);
    expect(within(next).getByRole('link', { name: 'Analysis: themes' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis#themes'
    );
    expect(
      within(next).getByRole('link', { name: 'Read chapter 1, where Anna Lark first appears' })
    ).toHaveAttribute('href', '/en/book/world-book/read?chapter=1');
  });

  it('«Дальше»: у анализа нет тем - ссылка на анализ без якоря #themes', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({ ...ANALYSIS, themes: null });
    const { container } = await renderEntity();
    const next = container.querySelector('#next') as HTMLElement;
    expect(within(next).queryByRole('link', { name: 'Analysis: themes' })).toBeNull();
    expect(within(next).getByRole('link', { name: 'Analysis of the book' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis'
    );
  });

  it('цитаты: говорящий и толкование в HTML сервера; FAQ - h3 и ответ, без FAQPage', async () => {
    const { container } = await renderEntity();
    const quotes = container.querySelector('#quotes') as HTMLElement;
    expect(quotes).toHaveTextContent('Quote one.');
    expect(quotes).toHaveTextContent('Tom Reed');
    expect(quotes).toHaveTextContent('Meaning one.');
    const faq = container.querySelector('#faq') as HTMLElement;
    expect(within(faq).getByRole('heading', { level: 3 })).toHaveTextContent('Who is Anna Lark?');
    expect(faq).toHaveTextContent('The mapmaker.');
    expect(container.innerHTML).not.toContain('FAQPage');
  });

  it('внешние блоки несут список источников; подпись - дата сущности и якорь world', async () => {
    const { container } = await renderEntity();
    const sources = container.querySelector('#sources') as HTMLElement;
    expect(within(sources).getByRole('link', { name: 'Service source' })).toHaveAttribute(
      'href',
      'https://example.com/source'
    );
    const byline = screen.getByRole('link', { name: 'Bibliaris Editorial Team' });
    expect(byline).toHaveAttribute('href', '/en/editorial-policy#world');
    expect(byline.parentElement).toHaveTextContent(/November 5, 2026/);
  });

  // 🔴 `LEGACY-447`, `ui-kit.md`: адрес из данных в `href` только через `isSafeHref` (`SourcesList`).
  it('источник с адресом javascript: - название текстом, не ссылкой', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...ENTITY_FULL,
        sources: [
          { title: 'Evil source', url: 'javascript:alert(1)' },
          { title: 'Service source', url: 'https://example.com/source' },
        ],
      })
    );
    const { container } = await renderEntity();
    const sources = container.querySelector('#sources') as HTMLElement;
    expect(sources).toHaveTextContent('Evil source');
    expect(within(sources).queryByRole('link', { name: 'Evil source' })).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    expect(within(sources).getByRole('link', { name: 'Service source' })).toBeInTheDocument();
  });

  it('JSON-LD Article страницы сущности: url, about и обложка', async () => {
    const { container } = await renderEntity();
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(data['@type']).toBe('Article');
    expect(data.url).toMatch(/\/en\/book\/world-book\/wiki\/anna$/);
    expect(data.image).toBe('https://cdn.bibliaris.com/world.jpg');
    expect(data.datePublished).toBe('2026-11-01T10:00:00.000Z');
  });
});

describe('страница героя: иллюстрация (F08-11c)', () => {
  const IMAGE = {
    url: 'https://media.bibliaris.com/illustrations/anna.png',
    width: 1200,
    height: 1200,
  };

  beforeEach(() => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_FULL, { image: IMAGE }));
  });

  it('принятая картинка: alt, подпись со ссылкой на редполитику и Article.image', async () => {
    const { container } = await renderEntity();
    const img = container.querySelector('figure img') as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.alt).toBe('Anna Lark, illustration for the book “World Book”');
    const caption = within(container.querySelector('figure') as HTMLElement).getByRole('link', {
      name: 'Editorial illustration, created with AI',
    });
    expect(caption).toHaveAttribute('href', '/en/editorial-policy#world');
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(data.image).toBe(IMAGE.url);
  });

  it('ru: alt и подпись по языку, ссылка - на русскую редполитику', async () => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 3)],
        slug: 'mir-kniga',
      })
    );
    const { container } = await renderEntity('anna', 'ru', 'mir-kniga');
    const figure = container.querySelector('figure') as HTMLElement;
    expect((figure.querySelector('img') as HTMLImageElement).alt).toBe(
      'Anna Lark, иллюстрация к книге «Мир-книга»'
    );
    expect(
      within(figure).getByRole('link', { name: 'Иллюстрация редакции, создана с помощью ИИ' })
    ).toHaveAttribute('href', '/ru/editorial-policy#world');
  });

  it('одна сторона неизвестна: квадрат запасной стороны, а не ложная пропорция', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(ENTITY_FULL, { image: { ...IMAGE, width: 1600, height: null } })
    );
    const { container } = await renderEntity();
    const img = container.querySelector('figure img') as HTMLImageElement;
    expect(img.getAttribute('width')).toBe('1200');
    expect(img.getAttribute('height')).toBe('1200');
  });

  it('свой хост - через оптимизатор', async () => {
    const { container } = await renderEntity();
    expect((container.querySelector('figure img') as HTMLImageElement).src).toContain(
      '/_next/image'
    );
  });

  it('хост вне оптимизатора: исходник как есть, без /_next/image', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(ENTITY_FULL, { image: { ...IMAGE, url: 'https://other.example/a.png' } })
    );
    const { container } = await renderEntity();
    expect((container.querySelector('figure img') as HTMLImageElement).getAttribute('src')).toBe(
      'https://other.example/a.png'
    );
  });

  it.each([
    [
      'en',
      'Editorial illustration, created with AI',
      'Anna Lark, illustration for the book “World Book”',
    ],
    [
      'es',
      'Ilustración de la redacción, creada con IA',
      'Anna Lark, ilustración del libro «World Book»',
    ],
    [
      'fr',
      'Illustration de la rédaction, créée avec l’IA',
      'Anna Lark, illustration du livre « World Book »',
    ],
    ['pt', 'Ilustração da redação, criada com IA', 'Anna Lark, ilustração do livro «World Book»'],
    [
      'ru',
      'Иллюстрация редакции, создана с помощью ИИ',
      'Anna Lark, иллюстрация к книге «Мир-книга»',
    ],
  ])('%s: подпись, полный alt, ссылка на редполитику языка', async (lang, caption, altFull) => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versions: [version(lang, 'world-book', 3)], slug: 'world-book' })
    );
    const { container } = await renderEntity('anna', lang);
    const figure = container.querySelector('figure') as HTMLElement;
    const alt = (figure.querySelector('img') as HTMLImageElement).alt;
    expect(alt).toBe(altFull);
    expect(within(figure).getByRole('link', { name: caption })).toHaveAttribute(
      'href',
      `/${lang}/editorial-policy#world`
    );
  });

  it('герой без строк инфобокса: раздел есть ради картинки, пустого списка нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(ENTITY_MINIMAL, { image: IMAGE })
    );
    const { container } = await renderEntity('tom');
    const about = container.querySelector('#about') as HTMLElement;
    expect(about.querySelector('figure img')).not.toBeNull();
    expect(about.querySelector('dl')).toBeNull();
  });

  it('не герой: картинки из ответа нет ни на странице, ни в Article.image', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, type: 'place' }, { image: IMAGE })
    );
    const { container } = await renderEntity();
    expect(container.querySelector('figure')).toBeNull();
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(data.image).toBe('https://cdn.bibliaris.com/world.jpg');
  });

  it('картинки нет: ни фигуры, ни подписи, Article.image - обложка', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_FULL));
    const { container } = await renderEntity();
    expect(container.querySelector('figure')).toBeNull();
    expect(container).not.toHaveTextContent('Editorial illustration');
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(data.image).toBe('https://cdn.bibliaris.com/world.jpg');
  });
});

describe('страница героя: минимальный герой и краевые случаи', () => {
  beforeEach(() => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_MINIMAL));
  });

  it('блок без данных не выводится вовсе: ни заголовка, ни пункта оглавления', async () => {
    await renderEntity('tom');

    expect(h2Texts()).toEqual([
      'In brief',
      'Character',
      'Character path',
      'Key scenes',
      'Quotes',
      'Next',
    ]);
    const toc = screen.getByRole('navigation', { name: 'Contents' });
    expect(hrefs(toc)).toEqual(['#in-brief', '#character', '#path', '#scenes', '#quotes', '#next']);
  });

  it('критика, прототипы и экранизации без источников не выводятся', async () => {
    await renderEntity('tom');
    expect(screen.queryByText('Hidden without sources.')).toBeNull();
    expect(screen.queryByText('Hidden film')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Sources' })).toBeNull();
  });

  it('у версии без текста (chapterNumbers пуст) ссылок на главы нет, номера - текстом', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(ENTITY_FULL, { chapterNumbers: [] })
    );
    const { container } = await renderEntity();
    expect(container.querySelector('a[href*="read?chapter"]')).toBeNull();
    expect(container.querySelector('#presence')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Read the scene' })).toBeNull();
    expect(container.querySelector('#scenes')).not.toBeNull();
    // Аудио - отдельная версия: «Слушать» не зависит от текста и остаётся, пока аудиоглава есть.
    expect(
      within(container.querySelector('#scenes') as HTMLElement).getAllByRole('link', {
        name: 'Listen',
      })
    ).toHaveLength(1);
  });

  it('книга без текстовой версии: ссылок на главы нет, хотя chapterNumbers пришли', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_FULL));
    mocks.getBookOverview.mockResolvedValue(makeBook({ versionIds: { text: null, audio: null } }));
    const { container } = await renderEntity();
    expect(container.querySelector('a[href*="read?chapter"]')).toBeNull();
  });

  it('ключ вне формата - 404 до запроса', async () => {
    await expect(renderEntity('Bad_Key')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(renderEntity('a'.repeat(61))).rejects.toThrow('NEXT_NOT_FOUND');
    expect(mocks.getPublicBookWorldEntity).not.toHaveBeenCalled();
    expect(mocks.getBookOverview).not.toHaveBeenCalled();
  });

  it('ручка ответила 404 (нет ядра, не прочитана, скрыта) - 404; 5xx - отказ', async () => {
    mocks.getPublicBookWorldEntity.mockRejectedValue(
      new ApiError({ statusCode: 404, message: 'x' })
    );
    await expect(renderEntity('tom')).rejects.toThrow('NEXT_NOT_FOUND');

    mocks.getPublicBookWorldEntity.mockRejectedValue(
      new ApiError({ statusCode: 500, message: 'x' })
    );
    await expect(renderEntity('tom')).rejects.toBeInstanceOf(ApiError);
  });

  it('ответ без chapterNumbers или alternates - отказ загрузки, не 404', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue({ language: 'en', entity: ENTITY_MINIMAL });
    await expect(renderEntity('tom')).rejects.toThrow(/unexpected shape/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('связь с сущностью без имени (нет ни в списке, ни в анализе) не выводится: сырого ключа нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...ENTITY_FULL,
        relations: [...ENTITY_FULL.relations, { to: 'ned-fox', label: 'Brother of' }],
      })
    );
    const { container } = await renderEntity();
    const rel = container.querySelector('#relations') as HTMLElement;
    expect(rel).not.toHaveTextContent('ned-fox');
    expect(rel).not.toHaveTextContent('Brother of');
    expect(rel).toHaveTextContent('Rival of → The Ghost');
  });

  it('счётчик получает версию языка страницы и ключ героя', async () => {
    await renderEntity();
    expect(mocks.beaconProps).toEqual([{ bookVersionId: 'v-en', entityKey: 'anna' }]);
  });

  it('имя героя с `$&` попадает в h1 и title как есть', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, name: 'Anna $& Co' })
    );
    await renderEntity();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Anna $& Co in World Book: character analysis'
    );
    expect((await entityMeta()).title).toBe(
      'Anna $& Co in World Book by Jane Writer: character analysis'
    );
  });

  it('отказ списка мира и анализа записан в журнал, страница остаётся (не 404)', async () => {
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    mocks.getPublicBookAnalysis.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    await renderEntity();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(mocks.notFound).not.toHaveBeenCalled();
    expect(mocks.logError).toHaveBeenCalledTimes(2);
    expect(mocks.logError).toHaveBeenCalledWith(
      'Error loading book world list for entity page:',
      expect.any(ApiError)
    );
    expect(mocks.logError).toHaveBeenCalledWith(
      'Error loading book analysis for book world:',
      expect.any(ApiError)
    );
  });

  it('451 в мете героя - noindex без записи о деградации', async () => {
    mocks.getPublicBookWorldEntity.mockRejectedValue(
      new ApiError({ statusCode: 451, message: 'x' })
    );
    expect(await entityMeta()).toEqual({ robots: { index: false, follow: true } });
    expect(mocks.noteDegraded).not.toHaveBeenCalled();
  });

  it('сбой списка мира не роняет страницу героя: соседей и ссылок на героев нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ENTITY_FULL));
    mocks.getPublicBookWorld.mockRejectedValue(new ApiError({ statusCode: 500, message: 'x' }));
    await renderEntity();
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Zed Park' })).toBeNull();
  });
});

describe('страница героя: мета и индексация', () => {
  it('индексируемый герой: canonical на себя, hreflang из alternates, описание из «Коротко»', async () => {
    const meta = await entityMeta();
    expect(meta.title).toBe('Anna Lark in World Book by Jane Writer: character analysis');
    expect(meta.description).toBe('Anna Lark in brief.');
    expect(meta.robots).toBeUndefined();
    expect(meta.alternates?.canonical).toMatch(/\/en\/book\/world-book\/wiki\/anna$/);
    expect(meta.alternates?.languages).toMatchObject({
      en: expect.stringMatching(/\/en\/book\/world-book\/wiki\/anna$/),
      ru: expect.stringMatching(/\/ru\/book\/mir-kniga\/wiki\/anna$/),
    });
  });

  it('описание длиннее 160 знаков режется', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, short: 'word '.repeat(60) })
    );
    expect(String((await entityMeta()).description).length).toBeLessThanOrEqual(160);
  });

  it('isIndexable=false: страница открыта, но noindex, follow и вне hreflang', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, isIndexable: false }, { alternates: [] })
    );
    const meta = await entityMeta();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
    await expect(renderEntity()).resolves.toBeDefined();
  });

  it('isIndexable=false закрывает и при непустом alternates: hreflang не выводится', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, isIndexable: false })
    );
    expect((await entityMeta()).alternates?.languages).toBeUndefined();
  });

  it('noindex книги закрывает страницу героя: noindex, follow и вне hreflang', async () => {
    mocks.resolveSeo.mockResolvedValue({ meta: { robots: 'noindex' } });
    const meta = await entityMeta();
    expect(meta.robots).toEqual({ index: false, follow: true });
    expect(meta.alternates?.languages).toBeUndefined();
  });

  it('кривой ключ или 404 ручки - мета noindex', async () => {
    expect(await entityMeta('Bad_Key')).toEqual({ robots: { index: false, follow: true } });
    mocks.getPublicBookWorldEntity.mockRejectedValue(
      new ApiError({ statusCode: 404, message: 'x' })
    );
    expect(await entityMeta()).toEqual({ robots: { index: false, follow: true } });
  });
});

describe('hreflang страницы = hreflang карты сайта (одна фикстура alternates)', () => {
  it('общая страница и страница героя: один набор языков и адресов', async () => {
    const { buildWorldSitemapItems } = await import('@/lib/sitemap/world');
    const items = await buildWorldSitemapItems('en', 1, async () => ({
      items: [
        {
          slug: 'world-book',
          lastmod: '2026-11-10T08:00:00.000Z',
          alternates: ALTERNATES,
          entities: [{ key: 'anna', lastmod: '2026-11-12T09:30:00.000Z', alternates: ALTERNATES }],
        },
      ],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    }));
    const [general, anna] = items;

    const index = await indexMeta();
    const entity = await entityMeta();
    expect(index.alternates?.languages).toBeDefined();
    expect(general.alternates?.languages).toEqual(index.alternates?.languages);
    expect(entity.alternates?.languages).toBeDefined();
    expect(anna.alternates?.languages).toEqual(entity.alternates?.languages);
  });
});

describe('пять языков', () => {
  it.each([
    ['ru', '«Мир-книга»: мир книги — герои, места и понятия'],
    ['en', 'World Book: characters, places and world of the book'],
  ])('h1 общей страницы на %s', async (lang, h1) => {
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 3)],
        slug: lang === 'ru' ? 'mir-kniga' : 'world-book',
      })
    );
    await renderIndex(lang, lang === 'ru' ? 'mir-kniga' : 'world-book');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(h1);
  });
});

// F08-5, решение арбитра Q9: сессия ссылок создаётся страницей мира и идёт в построители разделов
// полем входа; на общей странице «глава N» не ссылка (Q6), на странице героя нет ссылки на себя.
describe('мир книги: перелинковка мира (F08-5)', () => {
  const withForms = (entities: Record<string, unknown>[]) =>
    entities.map((e) => ({ ...e, forms: [e.name as string] }));
  // Абзац целиком: ссылка внутри делит текст на узлы, поиск по своему тексту узла его не найдёт.
  const paragraph = (text: string) =>
    screen.getByText((_, el) => el?.tagName === 'P' && el.textContent === text);

  beforeEach(() => {
    mocks.getPublicBookWorld.mockReset();
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: withForms([
        ...LIST.entities.filter((e) => e.key !== 'tom'),
        summary('tom', 'Tom Reed', {
          role: 'secondary',
          mentionFirst: 2,
          short: 'Follows Anna Lark into Chapter 3.',
        }),
      ]),
    });
  });

  it('общая /wiki: первое упоминание героя - ссылка, «Глава N» в тексте - не ссылка', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: withForms([
        summary('anna', 'Anna Lark', { short: 'Anna Lark trusts Tom Reed.' }),
        summary('tom', 'Tom Reed', {
          role: 'secondary',
          mentionFirst: 2,
          short: 'Follows Anna Lark into Chapter 3.',
        }),
      ]),
    });
    await renderIndex();
    // Карточка Тома ниже: в «Коротко» Анны его имя - первое упоминание и ссылка.
    expect(within(paragraph('Anna Lark trusts Tom Reed.')).getByRole('link')).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/tom'
    );
    const tom = paragraph('Follows Anna Lark into Chapter 3.');
    expect(within(tom).queryAllByRole('link')).toEqual([]);
  });

  it('общая /wiki: имя героя в «Коротко» его карточки - не ссылка, заголовок уже ведёт туда', async () => {
    await renderIndex();
    expect(within(paragraph('Anna Lark in brief.')).queryAllByRole('link')).toEqual([]);
    expect(within(paragraph('Bea Moss in brief.')).queryAllByRole('link')).toEqual([]);
  });

  it('страница героя, «Дальше»: имя соседа в «Коротко» его карточки - не ссылка', async () => {
    await renderEntity();
    const next = document.getElementById('next')!;
    expect(within(next).getByRole('link', { name: 'Tom Reed' }).closest('h3')).not.toBeNull();
    const short = within(next).getByText(
      (_, el) => el?.tagName === 'P' && el.textContent === 'Bea Moss in brief.'
    );
    expect(within(short).queryAllByRole('link')).toEqual([]);
  });

  it('общая /wiki: у карточки без «Коротко» герой дальше по странице - не ссылка', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: withForms([
        summary('anna', 'Anna Lark', { short: null }),
        summary('tom', 'Tom Reed', {
          role: 'secondary',
          mentionFirst: 2,
          short: 'Follows Anna Lark.',
        }),
      ]),
    });
    await renderIndex();
    expect(within(paragraph('Follows Anna Lark.')).queryAllByRole('link')).toEqual([]);
  });

  // Q14: у версии свой слаг (не слаг книги) - заголовок карточки и ссылка в тексте на один адрес.
  const ownSlugBook = () =>
    makeBook({ versions: [version('en', 'world-en', 3), version('ru', 'mir-kniga', 1)] });

  it('общая /wiki, свой слаг версии: заголовок и текст ведут на один адрес героя', async () => {
    mocks.getBookOverview.mockResolvedValue(ownSlugBook());
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      entities: withForms([
        summary('anna', 'Anna Lark', { short: 'Anna Lark trusts Tom Reed.' }),
        summary('tom', 'Tom Reed', { role: 'secondary', mentionFirst: 2 }),
      ]),
    });
    await renderIndex();
    const inText = within(paragraph('Anna Lark trusts Tom Reed.')).getByRole('link');
    const title = screen.getByRole('heading', { level: 3, name: /Tom Reed/ });
    expect(inText).toHaveAttribute('href', '/en/book/world-en/wiki/tom');
    expect(within(title).getByRole('link')).toHaveAttribute('href', inText.getAttribute('href'));
  });

  it('страница героя: герой из «Связей» и «Вместе» в тексте ниже - не ссылка', async () => {
    // Cal - только в «Связях» (в соседях первые три: Zed, Tom, Bea), Bea - только в соседях.
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...ENTITY_FULL,
        relations: [{ to: 'cal', label: 'Cousin of' }],
        faq: [{ question: 'Who helps?', answer: 'Cal Dune and Bea Moss help.' }],
      })
    );
    await renderEntity();
    const relations = within(document.getElementById('relations')!);
    expect(relations.getByRole('link', { name: 'Cal Dune' })).toBeInTheDocument();
    expect(relations.getByRole('link', { name: 'Bea Moss' })).toBeInTheDocument();
    const faq = within(document.getElementById('faq')!);
    expect(faq.getByText('Cal Dune and Bea Moss help.')).toBeInTheDocument();
    expect(faq.queryAllByRole('link')).toEqual([]);
  });

  it('страница героя, свой слаг версии: текст и карточка «Дальше» - один адрес соседа', async () => {
    mocks.getBookOverview.mockResolvedValue(ownSlugBook());
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, short: 'Anna Lark trusts Tom Reed.' })
    );
    await renderEntity();
    const inText = within(document.getElementById('in-brief')!).getByRole('link', {
      name: 'Tom Reed',
    });
    const card = within(document.getElementById('next')!).getByRole('link', { name: 'Tom Reed' });
    expect(inText).toHaveAttribute('href', '/en/book/world-en/wiki/tom');
    expect(card).toHaveAttribute('href', inText.getAttribute('href'));
  });

  it('страница героя: на себя ссылки нет, на другого героя и на главу - есть', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...ENTITY_FULL,
        short: 'Anna Lark trusts Tom Reed.',
        character: 'Steady since Chapter 2.',
        arc: { ...ENTITY_FULL.arc, to: 'A guide for Bea Moss' },
      })
    );
    await renderEntity();
    const short = within(document.getElementById('in-brief')!);
    expect(short.queryByRole('link', { name: 'Anna Lark' })).toBeNull();
    expect(short.getByRole('link', { name: 'Tom Reed' })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/tom'
    );
    expect(
      within(document.getElementById('character')!).getByRole('link', { name: 'Chapter 2' })
    ).toHaveAttribute('href', '/en/book/world-book/read?chapter=2');
    expect(
      within(document.getElementById('path')!).getByRole('link', { name: 'Bea Moss' })
    ).toHaveAttribute('href', '/en/book/world-book/wiki/bea');
  });
});

describe('страница героя: спойлер-остров (F08-10b)', () => {
  const signedInAtChapter = (chapterNumber: number) => {
    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber };
  };

  afterEach(() => {
    spoiler.session = { data: null, status: 'unauthenticated' };
    spoiler.progress = undefined;
  });

  it('серверный HTML одинаков у анонима и у вошедшего с прогрессом: весь текст в нём, свёртки нет', async () => {
    const { renderToString } = await import('react-dom/server');
    const { default: Page } = await loadEntity();
    const params = () => Promise.resolve({ lang: 'en', slug: 'world-book', entity: 'anna' });
    const anonymous = renderToString(await Page({ params: params() }));
    signedInAtChapter(1);
    const reader = renderToString(await Page({ params: params() }));
    expect(reader).toBe(anonymous);
    expect(anonymous).toContain('Closes the map.');
    expect(anonymous).not.toContain('Opens after chapter');
  });

  it('вошедший на главе 1: этапы, сцена и цитата с главой больше - свёрнуты; описание, глава 1 и цитата вне глав версии - нет', async () => {
    signedInAtChapter(1);
    await renderEntity();
    expect(screen.getAllByRole('button', { name: 'reveal now' })).toHaveLength(4);
    // Глава 2 - и этап, и сцена.
    expect(screen.getAllByText('Opens after chapter 2', { exact: false })).toHaveLength(2);
    expect(screen.getByText('Closes the map.').closest('[hidden]')).not.toBeNull();
    expect(screen.getByText('Crossing.').closest('[hidden]')).not.toBeNull();
    expect(screen.getByText(/Quote three\./).closest('[hidden]')).not.toBeNull();
    expect(screen.getByText('Reads the signs.').closest('[hidden]')).toBeNull();
    expect(screen.getByText('Opening.').closest('[hidden]')).toBeNull();
    // Свёрнутая цитата - в ячейке с рамкой карточки `QuotesBlock`, этап - без неё.
    // Глава 3 - и этап, и цитата: в рамке ровно одна ячейка.
    const cells = screen
      .getAllByText('Opens after chapter 3', { exact: false })
      .map((n) => n.closest('p')!.parentElement!.className);
    expect(cells.filter((c) => c === quoteCardClassName)).toHaveLength(1);
    expect(cells).toHaveLength(2);
    for (const n of screen.getAllByText('Opens after chapter 2', { exact: false })) {
      expect(n.closest('p')!.parentElement!.className).not.toBe(quoteCardClassName);
    }
    // Глава 7 вне `chapterNumbers` версии - «блок без главы» (Q5), не сворачивается.
    expect(screen.getByText(/Quote seven\./).closest('[hidden]')).toBeNull();
  });

  it('прогресс - текстовой версии языка (`versionIds.text`), а не версии мира; без текста свёртки нет', async () => {
    signedInAtChapter(1);
    spoiler.versionIds.length = 0;
    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versionIds: { text: 't-en', audio: 'a-en' } })
    );
    await renderEntity();
    expect(new Set(spoiler.versionIds)).toEqual(new Set(['t-en']));
    expect(screen.getAllByRole('button', { name: 'reveal now' }).length).toBeGreaterThan(0);
    cleanup();

    mocks.getBookOverview.mockResolvedValue(
      makeBook({ versionIds: { text: null, audio: 'a-en' } })
    );
    await renderEntity();
    expect(screen.queryByRole('button', { name: 'reveal now' })).toBeNull();
    expect(document.querySelector('[hidden]')).toBeNull();
  });

  it('аноним видит всё раскрытым', async () => {
    await renderEntity();
    expect(screen.queryByRole('button', { name: 'reveal now' })).toBeNull();
    expect(document.querySelector('[hidden]')).toBeNull();
  });

  it('подпись - на языке страницы', async () => {
    signedInAtChapter(1);
    await renderEntity('anna', 'ru');
    expect(screen.getAllByRole('button', { name: 'раскрыть сейчас' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Откроется после главы 2', { exact: false })).toHaveLength(2);
  });
});

describe('страница места и места на /wiki (F08-12c)', () => {
  const PLACE = {
    ...summary('harbor', 'Old Harbor', {
      type: 'place',
      role: null,
      short: 'Where the map begins.',
    }),
    aliases: null,
    profile: null,
    appearance: null,
    character: null,
    arc: null,
    relations: null,
    critique: null,
    prototypes: null,
    adaptations: null,
    sources: null,
    compare: null,
    bonds: null,
    differences: null,
    conclusion: null,
    kind: 'fictional',
    location: 'At the mouth of the river',
    significance: 'The harbor is where Anna Lark decides to leave.',
    description: 'Grey piers and gulls.',
    wikidataId: null,
    point: null,
    scenes: [
      { chapter: 1, title: 'The arrival', text: 'Ships come in.', paragraph: 2 },
      { chapter: 3, title: 'The farewell', text: 'Anna leaves.' },
    ],
    quotes: [{ text: 'Harbor quote.', chapter: 2, interpretation: 'Salt.', speakerKey: 'anna' }],
    faq: [{ question: 'Is the harbor real?', answer: 'No, it is invented.' }],
    mentions: { chapters: [1, 2, 3], first: 1, perChapter: [], coPresence: [] },
    createdAt: '2026-11-01T10:00:00.000Z',
  };
  const card = (over: Record<string, unknown> = {}) => ({
    key: 'harbor',
    name: 'Old Harbor',
    short: 'Where the map begins.',
    kind: 'fictional',
    location: 'At the mouth of the river',
    hasPage: true,
    point: { lat: 1, lng: 2, sourceUrl: 'https://www.wikidata.org/wiki/Q1' },
    scenes: [
      { title: 'The arrival', chapter: 1, paragraph: 2 },
      { title: 'The farewell', chapter: 3, paragraph: null },
    ],
    ...over,
  });

  afterEach(() => {
    spoiler.session = { data: null, status: 'unauthenticated' };
    spoiler.progress = undefined;
  });

  it('h1 по формуле места и разделы §7 в порядке Q3; разделов героя и картинки нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(PLACE, {
        image: { url: 'https://cdn.bibliaris.com/x.webp', width: 1200, height: 675 },
      })
    );
    await renderEntity('harbor');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Old Harbor in World Book');
    expect(h2Texts()).toEqual([
      'In brief',
      'Meaning in the book',
      'Description',
      'The place in quotes',
      'What happens here',
      'Presence across the chapters',
      'Questions about Old Harbor',
    ]);
    const brief = within(document.getElementById('in-brief')!);
    expect(brief.getByText('Fictional place')).toBeInTheDocument();
    expect(brief.getByText('At the mouth of the river')).toBeInTheDocument();
    // Говорящий цитаты места - герой (`speakerKey`).
    expect(document.getElementById('quotes')!.textContent).toContain('Anna Lark');
    for (const id of ['character', 'path', 'about', 'relations', 'next']) {
      expect(document.getElementById(id)).toBeNull();
    }
    expect(document.querySelector('figure')).toBeNull();
    expect(screen.queryByText('Character analysis', { exact: false })).toBeNull();
  });

  it('мета места: title по формуле Q5, description из «Коротко»; ru - «в книге»', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(PLACE));
    const meta = await entityMeta('harbor');
    expect(meta.title).toBe('Old Harbor in World Book by Jane Writer: meaning and scenes');
    expect(meta.description).toBe('Where the map begins.');

    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...PLACE, name: 'Старая гавань' }, { language: 'ru' })
    );
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 3)],
        slug: 'mir-kniga',
      })
    );
    const ru = await entityMeta('harbor', 'ru', 'mir-kniga');
    expect(ru.title).toBe('Старая гавань в книге «Мир-книга», Jane Writer: значение и сцены');
    await renderEntity('harbor', 'ru', 'mir-kniga');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe(
      'Старая гавань в книге «Мир-книга»'
    );
  });

  it('/wiki: раздел мест после карты отношений; со страницей - ссылка, без - текстом; сцены с главой, точки нет', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      places: [card(), card({ key: 'mill', name: 'The Mill', hasPage: false, short: null })],
    });
    await renderIndex();
    const map = document.getElementById('relations-map')!;
    const placesSection = document.getElementById('places')!;
    const more = document.getElementById('more')!;
    // После карты отношений и перед «Ссылками» (§4 п.6).
    expect(
      map.compareDocumentPosition(placesSection) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      placesSection.compareDocumentPosition(more) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    const places = within(document.getElementById('places')!);
    expect(places.getByRole('link', { name: 'Old Harbor' })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/harbor'
    );
    expect(places.queryByRole('link', { name: 'The Mill' })).toBeNull();
    expect(places.getByText('The Mill')).toBeInTheDocument();
    expect(places.getAllByText('Fictional place')).toHaveLength(2);
    expect(places.getAllByRole('link', { name: 'Chapter 3' })[0]).toHaveAttribute(
      'href',
      '/en/book/world-book/read?chapter=3'
    );
    expect(document.getElementById('places')!.innerHTML).not.toContain('wikidata');
  });

  it('/wiki: вошедший на главе 1 - сцена главы 3 свёрнута, главы 1 - нет', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, places: [card()] });
    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber: 1 };
    await renderIndex();
    const places = within(document.getElementById('places')!);
    expect(places.getByText('The farewell', { exact: false }).closest('[hidden]')).not.toBeNull();
    expect(places.getByText('The arrival', { exact: false }).closest('[hidden]')).toBeNull();
  });

  it('вид места: реальное - «Real place», без вида - строки «Kind» нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse({ ...PLACE, kind: 'real' }));
    await renderEntity('harbor');
    const brief = within(document.getElementById('in-brief')!);
    expect(brief.getByText('Real place')).toBeInTheDocument();
    cleanup();
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse({ ...PLACE, kind: null }));
    await renderEntity('harbor');
    const plain = within(document.getElementById('in-brief')!);
    expect(plain.queryByText('Kind')).toBeNull();
    expect(plain.queryByText('Real place')).toBeNull();
    expect(plain.queryByText('Fictional place')).toBeNull();
  });

  it('место без данных разделов: ни заголовка, ни пункта оглавления (§1 п.5)', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...PLACE,
        short: null,
        kind: null,
        location: null,
        significance: null,
        description: '  ',
        quotes: null,
        scenes: null,
        faq: null,
        mentions: null,
      })
    );
    await renderEntity('harbor');
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0);
    for (const id of [
      'in-brief',
      'significance',
      'description',
      'quotes',
      'scenes',
      'presence',
      'faq',
    ]) {
      expect(document.getElementById(id)).toBeNull();
    }
  });

  it('/wiki: гость видит все сцены мест раскрытыми', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, places: [card()] });
    await renderIndex();
    const places = within(document.getElementById('places')!);
    expect(places.getByText('The farewell', { exact: false }).closest('[hidden]')).toBeNull();
    expect(places.queryByRole('button', { name: 'reveal now' })).toBeNull();
  });

  it('/wiki: карточка без вида и места - без подписи вида и строки «Location»', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      places: [card({ kind: null, location: null, scenes: [] })],
    });
    await renderIndex();
    const section = document.getElementById('places')!;
    expect(within(section).getByRole('link', { name: 'Old Harbor' })).toBeInTheDocument();
    expect(section.textContent).not.toContain('Location');
    expect(within(section).queryByText('Fictional place')).toBeNull();
    expect(within(section).queryByText('Real place')).toBeNull();
    expect(section.querySelectorAll('ul ul')).toHaveLength(0);
  });

  it('places: [] (рубильник мест выключен) - раздела мест нет, страница как прежде', async () => {
    await renderIndex();
    expect(document.getElementById('places')).toBeNull();
    expect(h2Texts()).not.toContain('Places');
  });

  it('ответ без places - отказ загрузки, а не пустой раздел', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      language: 'en',
      alternates: ALTERNATES,
      entities: LIST.entities,
    });
    await expect(renderIndex()).rejects.toThrow(/places/);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });
});
