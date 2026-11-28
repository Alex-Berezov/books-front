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

  // Темы героя (решения арбитра `F08 | F08-13` Q3, `F08 | F08-13d` V1): `themeKeys` его карточки
  // анализа - ссылками на карточки тем вместо общей «Analysis: themes»; ключа нет в анализе - темы нет.
  it('«Дальше»: темы героя из анализа - ссылками на theme-{key}, вместо общей ссылки на темы', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({
      ...ANALYSIS,
      themes: [
        { key: 'courage', title: 'Courage' },
        { key: 'maps', title: 'Maps' },
      ],
      characters: ANALYSIS.characters.map((c) =>
        c.key === 'anna' ? { ...c, themeKeys: ['courage', 'gone', 'maps'] } : c
      ),
    });
    const { container } = await renderEntity();
    const next = container.querySelector('#next') as HTMLElement;
    expect(within(next).getByRole('link', { name: 'Courage' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis#theme-courage'
    );
    expect(within(next).getByRole('link', { name: 'Maps' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis#theme-maps'
    );
    expect(next).toHaveTextContent('Themes of the analysis: Courage, Maps');
    expect(next.textContent).not.toMatch(/gone/);
    expect(within(next).queryByRole('link', { name: 'Analysis: themes' })).toBeNull();
  });

  it('«Дальше»: ни одна тема героя не нашлась в анализе - общая ссылка «Analysis: themes»', async () => {
    mocks.getPublicBookAnalysis.mockResolvedValue({
      ...ANALYSIS,
      characters: ANALYSIS.characters.map((c) =>
        c.key === 'anna' ? { ...c, themeKeys: ['gone'] } : c
      ),
    });
    const { container } = await renderEntity();
    const next = container.querySelector('#next') as HTMLElement;
    expect(within(next).getByRole('link', { name: 'Analysis: themes' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis#themes'
    );
    expect(next.textContent).not.toMatch(/gone|Themes of the analysis/);
  });

  it('пункт анализа «Дальше»: страницы анализа нет - темы героя названием без ссылки, повтор ключа - одна тема', async () => {
    const { worldStrings } = await import('@/lib/i18n/worldStrings');
    const { worldNextAnalysisItem } = await import('@/app/[lang]/book/[slug]/wiki/worldThemes');
    // Страница сюда не приводит (без анализа по счётчику его и не запрашивают), поэтому - сам пункт.
    render(
      <>
        {worldNextAnalysisItem({
          strings: worldStrings.en,
          themeTitles: new Map([['courage', 'Courage']]),
          heroThemeKeys: ['courage', 'courage', 'gone'],
          links: { analysis: null, analysisHasThemes: true, summary: null },
        })}
      </>
    );
    expect(document.body).toHaveTextContent(/^Themes of the analysis: Courage$/);
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('пункт анализа «Дальше»: своих тем нет - у анализа без тем ссылка без якоря, без страницы анализа - пункта нет', async () => {
    const { worldStrings } = await import('@/lib/i18n/worldStrings');
    const { worldNextAnalysisItem } = await import('@/app/[lang]/book/[slug]/wiki/worldThemes');
    const item = (analysis: string | null, analysisHasThemes: boolean) =>
      worldNextAnalysisItem({
        strings: worldStrings.en,
        themeTitles: new Map(),
        heroThemeKeys: [],
        links: { analysis, analysisHasThemes, summary: null },
      });
    expect(item(null, true)).toBeNull();
    render(<>{item('/en/book/b/analysis', false)}</>);
    expect(screen.getByRole('link', { name: 'Analysis of the book' })).toHaveAttribute(
      'href',
      '/en/book/b/analysis'
    );
  });

  it('темы героя - только у героя: у не-героя с ключом героя анализа и у героя без карточки - пусто', async () => {
    const { heroThemeKeysOf } = await import('@/app/[lang]/book/[slug]/wiki/worldThemes');
    const analysis = {
      characters: [{ key: 'anna', name: 'Anna', role: 'main' as const, themeKeys: ['courage'] }],
    };
    expect(heroThemeKeysOf({ type: 'character', key: 'anna' }, analysis)).toEqual(['courage']);
    for (const type of ['object', 'place', 'pair', 'term', 'event']) {
      expect(heroThemeKeysOf({ type, key: 'anna' }, analysis)).toEqual([]);
    }
    expect(heroThemeKeysOf({ type: 'character', key: 'tom' }, analysis)).toEqual([]);
    expect(heroThemeKeysOf({ type: 'character', key: 'anna' }, null)).toEqual([]);
  });

  it('пункт анализа «Дальше»: повтор ключа темы героя - одна ссылка', async () => {
    const { worldStrings } = await import('@/lib/i18n/worldStrings');
    const { worldNextAnalysisItem } = await import('@/app/[lang]/book/[slug]/wiki/worldThemes');
    render(
      <>
        {worldNextAnalysisItem({
          strings: worldStrings.fr,
          themeTitles: new Map([['courage', 'Courage']]),
          heroThemeKeys: ['courage', 'courage'],
          links: { analysis: '/fr/book/b/analysis', analysisHasThemes: true, summary: null },
        })}
      </>
    );
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(document.body).toHaveTextContent('Thèmes de l’analyse : Courage');
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

  // F08-12c-2: у места картинка есть - на странице и в Article.image, как у героя.
  it('место: картинка из ответа на странице и в Article.image', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, type: 'place' }, { image: IMAGE })
    );
    const { container } = await renderEntity();
    expect(container.querySelector('figure img')).not.toBeNull();
    const data = JSON.parse(
      container.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}'
    );
    expect(data.image).toBe(IMAGE.url);
  });

  // F08-12c-2: картинка - только у героя и места (`worldImageTypeAllowed`); предмет - нет, даже если
  // ответ её несёт.
  it('предмет: картинки из ответа нет ни на странице, ни в Article.image', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ENTITY_FULL, type: 'object' }, { image: IMAGE })
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

  it('h1 по формуле места и разделы §7 в порядке Q3; разделов героя нет, картинка - в «Коротко»', async () => {
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
    // F08-12c-2: принятая картинка места - в «Коротко», с alt по языку и подписью-ссылкой на редполитику.
    const figure = document.getElementById('in-brief')!.querySelector('figure') as HTMLElement;
    expect(figure).not.toBeNull();
    expect(within(figure).getByRole('img').getAttribute('alt')).toBe(
      'Old Harbor, illustration for the book “World Book”'
    );
    expect(
      within(figure).getByRole('link', { name: 'Editorial illustration, created with AI' })
    ).toHaveAttribute('href', '/en/editorial-policy#world');
    expect(document.querySelectorAll('figure')).toHaveLength(1);
    expect(screen.queryByText('Character analysis', { exact: false })).toBeNull();
  });

  it('место только с картинкой (без «Коротко», вида и местоположения): раздел есть ради картинки', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse(
        { ...PLACE, short: null, kind: null, location: null },
        { image: { url: 'https://cdn.bibliaris.com/x.webp', width: 1200, height: 675 } }
      )
    );
    await renderEntity('harbor');
    const brief = document.getElementById('in-brief') as HTMLElement;
    expect(brief).not.toBeNull();
    expect(brief.querySelector('figure img')).not.toBeNull();
    expect(brief.querySelector('dl')).toBeNull();
  });

  it('место без картинки: фигуры нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(PLACE));
    await renderEntity('harbor');
    expect(document.querySelector('figure')).toBeNull();
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

  describe('литературная карта (F08-12d, решения `F08 | F08-12d`)', () => {
    const tiles = (cols: number, rows: number) =>
      Array.from({ length: cols * rows }, (_, i) => ({
        col: i % cols,
        row: Math.floor(i / cols),
        url: `https://cdn.bibliaris.com/world-map/osm/9/${i}/1/abcdef0123456789.png`,
      }));
    const BOOK_MAP = {
      zoom: 9,
      cols: 4,
      rows: 3,
      tiles: tiles(4, 3),
      points: [
        { key: 'harbor', left: 40, top: 50 },
        { key: 'mill', left: 60, top: 25 },
      ],
    };
    const PLACE_MAP = {
      zoom: 12,
      cols: 2,
      rows: 2,
      tiles: tiles(2, 2),
      points: [{ key: 'harbor', left: 50, top: 50 }],
    };
    const REAL_POINT = { lat: 59.9, lng: 30.3, sourceUrl: 'https://www.wikidata.org/wiki/Q656' };
    const realCard = (over: Record<string, unknown> = {}) =>
      card({ kind: 'real', point: REAL_POINT, ...over });

    it('/wiki заказывает карту (?map=1) и в теле, и в мете; страница героя - список без карты', async () => {
      await renderIndex();
      await indexMeta();
      expect(mocks.getPublicBookWorld.mock.calls.length).toBeGreaterThan(0);
      for (const call of mocks.getPublicBookWorld.mock.calls) {
        expect(call).toEqual(['v-en', { map: true }]);
      }
      cleanup();
      mocks.getPublicBookWorld.mockClear();
      await renderEntity('anna');
      expect(mocks.getPublicBookWorld.mock.calls.length).toBeGreaterThan(0);
      for (const call of mocks.getPublicBookWorld.mock.calls) expect(call).toEqual(['v-en']);
    });

    it('/wiki: карта внутри «Места» перед списком - мозаика из хранилища, номера, подпись OSM, легенда', async () => {
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        places: [
          realCard(),
          realCard({
            key: 'mill',
            name: 'The Mill',
            hasPage: false,
            point: { ...REAL_POINT, sourceUrl: 'https://www.wikidata.org/wiki/Q2' },
          }),
        ],
        map: BOOK_MAP,
      });
      await renderIndex();
      const section = document.getElementById('places')!;
      // Нового раздела и пункта оглавления нет (П1): карта - внутри «Места».
      expect(h2Texts().filter((t) => t === 'Literary map')).toEqual([]);
      const scope = within(section);
      expect(scope.getByRole('heading', { level: 3, name: 'Literary map' })).toBeInTheDocument();
      const mosaic = scope.getByRole('img', {
        name: 'Literary map: places of the book “World Book”',
      });
      const imgs = mosaic.querySelectorAll('img');
      expect(imgs).toHaveLength(12);
      expect([...imgs].map((i) => i.getAttribute('src'))).toEqual(BOOK_MAP.tiles.map((t) => t.url));
      for (const img of imgs) expect(img.getAttribute('alt')).toBe('');
      expect(section.innerHTML).not.toContain('tile.openstreetmap.org');
      // Точки - слой SVG, номер у каждой; JS нет - только разметка.
      const points = mosaic.querySelectorAll('svg [data-point]');
      expect([...points].map((p) => p.getAttribute('data-point'))).toEqual(['harbor', 'mill']);
      expect([...points].map((p) => p.textContent)).toEqual(['1', '2']);
      expect(mosaic.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 1024 768');
      expect(mosaic.querySelector('circle')!.getAttribute('cx')).toBe(String(0.4 * 1024));
      // Подпись OSM - ссылкой, видна под картой.
      expect(scope.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute(
        'href',
        'https://www.openstreetmap.org/copyright'
      );
      // Легенда: номер - пункт списка, имя ссылкой только со страницей, источник - Wikidata.
      const legend = section.querySelector('ol')!;
      const items = within(legend)
        .getAllByRole('listitem')
        .filter((li) => li.parentElement === legend);
      expect(items).toHaveLength(2);
      expect(within(items[0]).getByRole('link', { name: 'Old Harbor' })).toHaveAttribute(
        'href',
        '/en/book/world-book/wiki/harbor'
      );
      expect(within(items[1]).queryByRole('link', { name: 'The Mill' })).toBeNull();
      expect(items[1].textContent).toContain('The Mill');
      expect(within(items[0]).getByRole('link', { name: 'Wikidata' })).toHaveAttribute(
        'href',
        'https://www.wikidata.org/wiki/Q656'
      );
      expect(within(items[1]).getByRole('link', { name: 'Wikidata' })).toHaveAttribute(
        'href',
        'https://www.wikidata.org/wiki/Q2'
      );
      expect(items[0].textContent).toContain('Coordinates');
      expect(within(items[0]).getAllByRole('link', { name: 'Chapter 3' })[0]).toHaveAttribute(
        'href',
        '/en/book/world-book/read?chapter=3'
      );
      // Карта - перед списком карточек.
      const cards = section.querySelector('ul')!;
      expect(mosaic.compareDocumentPosition(cards) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('/wiki: сцены легенды - под тем же спойлер-островом, что в карточке', async () => {
      mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, places: [realCard()], map: BOOK_MAP });
      spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
      spoiler.progress = { chapterNumber: 1 };
      await renderIndex();
      const legend = within(document.getElementById('places')!.querySelector('ol')!);
      expect(legend.getByText('The farewell', { exact: false }).closest('[hidden]')).not.toBeNull();
      expect(legend.getByText('The arrival', { exact: false }).closest('[hidden]')).toBeNull();
    });

    it.each([
      ['map: null', { map: null }],
      ['без поля map (бэкенд до F08-12d)', {}],
      [
        'ответ не той формы (тайлов меньше cols × rows)',
        { map: { ...BOOK_MAP, tiles: tiles(2, 2) } },
      ],
    ])('/wiki: %s - блока карты нет, список мест на месте', async (_, over) => {
      mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, places: [realCard()], ...over });
      await renderIndex();
      const section = document.getElementById('places')!;
      expect(section.querySelector('figure')).toBeNull();
      expect(section.textContent).not.toContain('Literary map');
      expect(section.textContent).not.toContain('OpenStreetMap');
      expect(within(section).getByRole('link', { name: 'Old Harbor' })).toBeInTheDocument();
    });

    it.each([
      ['колонок 0', { cols: 0, tiles: [] }],
      ['колонок 5 (класса сетки нет)', { cols: 5, rows: 1, tiles: tiles(5, 1) }],
      ['строк 0', { rows: 0, tiles: [] }],
      ['tiles не массив', { tiles: null }],
      ['points не массив', { points: null }],
    ])('/wiki: карта не той формы (%s) - блока карты нет', async (_, over) => {
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        places: [realCard()],
        map: { ...BOOK_MAP, ...over },
      });
      await renderIndex();
      const section = document.getElementById('places')!;
      expect(section.querySelector('figure')).toBeNull();
      expect(section.textContent).not.toContain('Literary map');
    });

    it('/wiki: точка без места в списке не рисуется ни на карте, ни в легенде; номера совпадают', async () => {
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        places: [realCard()],
        map: {
          ...BOOK_MAP,
          points: [
            { key: 'ghost', left: 10, top: 10 },
            { key: 'harbor', left: 40, top: 50 },
          ],
        },
      });
      await renderIndex();
      const section = document.getElementById('places')!;
      const points = section.querySelectorAll('svg [data-point]');
      expect([...points].map((p) => p.getAttribute('data-point'))).toEqual(['harbor']);
      expect([...points].map((p) => p.textContent)).toEqual(['1']);
      const legend = section.querySelector('ol')!;
      expect([...legend.children].map((li) => li.querySelector('a')?.textContent)).toEqual([
        'Old Harbor',
      ]);
    });

    it('/wiki: у всех точек нет мест в списке - блока карты нет', async () => {
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        places: [realCard()],
        map: { ...BOOK_MAP, points: [{ key: 'ghost', left: 10, top: 10 }] },
      });
      await renderIndex();
      expect(document.getElementById('places')!.querySelector('figure')).toBeNull();
    });

    it('/wiki: точка у края мозаики не выходит за край (центр не ближе радиуса)', async () => {
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        places: [realCard()],
        map: { ...BOOK_MAP, points: [{ key: 'harbor', left: 0, top: 100 }] },
      });
      await renderIndex();
      const circle = document.getElementById('places')!.querySelector('circle')!;
      const r = Number(circle.getAttribute('r'));
      expect(r).toBeGreaterThan(0);
      expect(Number(circle.getAttribute('cx'))).toBe(r);
      expect(Number(circle.getAttribute('cy'))).toBe(768 - r);
    });

    it('ru: заголовок и доступное имя карты по языку, подпись OSM без перевода', async () => {
      mocks.getBookOverview.mockResolvedValue(
        makeBook({
          versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 3)],
          slug: 'mir-kniga',
        })
      );
      mocks.getPublicBookWorld.mockResolvedValue({
        ...LIST,
        language: 'ru',
        places: [realCard()],
        map: BOOK_MAP,
      });
      await renderIndex('ru', 'mir-kniga');
      const section = within(document.getElementById('places')!);
      expect(
        section.getByRole('heading', { level: 3, name: 'Литературная карта' })
      ).toBeInTheDocument();
      expect(
        section.getByRole('img', { name: 'Литературная карта: места книги «Мир-книга»' })
      ).toBeInTheDocument();
      expect(
        section.getByRole('link', { name: '© OpenStreetMap contributors' })
      ).toBeInTheDocument();
      expect(section.getByText('Координаты', { exact: false })).toBeInTheDocument();
    });

    it('страница реального места: малая карта отдельным блоком сразу после «Коротко», без номера', async () => {
      mocks.getPublicBookWorldEntity.mockResolvedValue(
        entityResponse({ ...PLACE, kind: 'real', point: REAL_POINT }, { map: PLACE_MAP })
      );
      await renderEntity('harbor');
      expect(h2Texts().slice(0, 2)).toEqual(['In brief', 'Location']);
      const block = document.getElementById('map')!;
      expect(
        document.getElementById('in-brief')!.compareDocumentPosition(block) &
          Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      const scope = within(block);
      const mosaic = scope.getByRole('img', { name: 'Old Harbor on the map' });
      expect(mosaic.querySelectorAll('img')).toHaveLength(4);
      expect(mosaic.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 512 512');
      expect(mosaic.querySelector('text')).toBeNull();
      expect(scope.getByRole('link', { name: 'Wikidata' })).toHaveAttribute(
        'href',
        'https://www.wikidata.org/wiki/Q656'
      );
      expect(scope.getByRole('link', { name: '© OpenStreetMap contributors' })).toHaveAttribute(
        'href',
        'https://www.openstreetmap.org/copyright'
      );
      // Строка «Location» текстом в «Коротко» остаётся.
      expect(
        within(document.getElementById('in-brief')!).getByText('At the mouth of the river')
      ).toBeInTheDocument();
    });

    it.each([
      ['карты нет (null)', { kind: 'real', point: REAL_POINT }, { map: null }],
      ['без поля map (бэкенд до F08-12d)', { kind: 'real', point: REAL_POINT }, {}],
      ['точки нет', { kind: 'real', point: null }, { map: PLACE_MAP }],
    ])('страница места: %s - блока карты нет', async (_, entity, over) => {
      mocks.getPublicBookWorldEntity.mockResolvedValue(
        entityResponse({ ...PLACE, ...entity }, over)
      );
      await renderEntity('harbor');
      expect(document.getElementById('map')).toBeNull();
      expect(document.body.textContent).not.toContain('OpenStreetMap');
    });

    it.each([
      ['тайлов меньше cols × rows', { tiles: tiles(1, 1) }],
      ['колонок 5', { cols: 5, rows: 1, tiles: tiles(5, 1) }],
    ])('страница места: карта не той формы (%s) - блока нет', async (_, over) => {
      mocks.getPublicBookWorldEntity.mockResolvedValue(
        entityResponse(
          { ...PLACE, kind: 'real', point: REAL_POINT },
          { map: { ...PLACE_MAP, ...over } }
        )
      );
      await renderEntity('harbor');
      expect(document.getElementById('map')).toBeNull();
    });

    it('размер точки растёт с сеткой: на телефоне номер читается при 4 и при 2 колонках', async () => {
      const sizes = async (map: typeof BOOK_MAP) => {
        cleanup();
        mocks.getPublicBookWorld.mockResolvedValue({ ...LIST, places: [realCard()], map });
        await renderIndex();
        const section = document.getElementById('places')!;
        const circle = section.querySelector('circle')!;
        return {
          r: Number(circle.getAttribute('r')),
          stroke: Number(circle.getAttribute('stroke-width')),
          font: Number(section.querySelector('svg text')!.getAttribute('font-size')),
        };
      };
      const wide = await sizes({ ...BOOK_MAP, points: [{ key: 'harbor', left: 50, top: 50 }] });
      const small = await sizes({
        ...BOOK_MAP,
        cols: 2,
        rows: 2,
        tiles: tiles(2, 2),
        points: [{ key: 'harbor', left: 50, top: 50 }],
      });
      // Доля ширины мозаики одна и та же: на экране 375 px номер около 12 px при любой сетке.
      expect(wide).toEqual({ r: 32, stroke: 6, font: 36 });
      expect(small).toEqual({ r: 16, stroke: 3, font: 18 });
    });

    it('страница героя: карта в ответе (так бэкенд не отдаёт) не рисуется', async () => {
      mocks.getPublicBookWorldEntity.mockResolvedValue(
        entityResponse({ ...ENTITY_FULL, point: REAL_POINT }, { map: PLACE_MAP })
      );
      await renderEntity('anna');
      expect(document.getElementById('map')).toBeNull();
      expect(document.body.textContent).not.toContain('OpenStreetMap');
    });
  });
});

describe('страницы предмета, понятия, события и их разделы на /wiki (F08-13c)', () => {
  const base = (key: string, name: string, type: string) => ({
    ...summary(key, name, { type, role: null, short: `${name} in brief.` }),
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
    kind: null,
    location: null,
    significance: null,
    description: null,
    wikidataId: null,
    point: null,
    scenes: null,
    quotes: null,
    faq: null,
    characterKeys: null,
    themeKeys: null,
    mentions: { chapters: [1, 2], first: 1, perChapter: [], coPresence: [] },
    createdAt: '2026-11-01T10:00:00.000Z',
  });
  const ROBE = {
    ...base('robe', 'The Robe', 'object'),
    significance: 'The robe is his idleness.',
    description: 'Of Persian cloth.',
    quotes: [{ text: 'Robe quote.', chapter: 2, interpretation: 'Softness.', speakerKey: 'anna' }],
    faq: [{ question: 'Why the robe?', answer: 'Comfort.' }],
    characterKeys: ['anna', 'nobody'],
    themeKeys: ['courage', 'gone'],
  };
  const TERM = {
    ...base('lark-law', 'Lark law', 'term'),
    significance: 'The rule of the map.',
    quotes: [{ text: 'Law quote.', chapter: 1, interpretation: 'Rule.' }],
  };
  const DUEL = {
    ...base('duel', 'The Duel', 'event'),
    significance: 'Tom loses the duel.',
    scenes: [
      { chapter: 1, title: 'The challenge', text: 'A glove falls.' },
      { chapter: 3, title: 'The shot', text: 'Tom falls.' },
    ],
    characterKeys: ['tom'],
    mentions: { chapters: [1, 3], first: 1, perChapter: [], coPresence: [] },
  };
  const objCard = (key: string, name: string, over: Record<string, unknown> = {}) => ({
    key,
    name,
    short: `${name} in brief.`,
    chapter: 2,
    hasPage: true,
    ...over,
  });

  afterEach(() => {
    spoiler.session = { data: null, status: 'unauthenticated' };
    spoiler.progress = undefined;
  });

  it('предмет: h1 по формуле места, разделы в порядке Q1, связи - герой ссылкой и тема на карточку своей темы анализа', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ROBE));
    await renderEntity('robe');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The Robe in World Book');
    expect(h2Texts()).toEqual([
      'In brief',
      'Meaning in the book',
      'Description',
      'Quotes',
      'Connections',
      'Where it appears',
      'Questions about The Robe',
    ]);
    const links = within(document.getElementById('connections')!);
    expect(links.getByRole('link', { name: 'Anna Lark' })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/anna'
    );
    // Карточка своей темы (`theme-{key}`, решение арбитра `F08 | F08-13` Q7; до F08-13d - #themes).
    expect(links.getByRole('link', { name: 'Courage' })).toHaveAttribute(
      'href',
      '/en/book/world-book/analysis#theme-courage'
    );
    // Ключ вне героев и вне текущего анализа - не выводится, голого ключа нет (Q5).
    expect(document.getElementById('connections')!.textContent).not.toMatch(/nobody|gone/);
    for (const id of ['character', 'path', 'relations', 'next', 'scenes']) {
      expect(document.getElementById(id)).toBeNull();
    }
  });

  it('понятие: без связей и описания; событие: сцены и герои, значение под островом последней главы сцен (Q6)', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(TERM));
    await renderEntity('lark-law');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Lark law in World Book');
    expect(h2Texts()).toEqual(['In brief', 'Meaning in the book', 'Quotes', 'Where it appears']);
    cleanup();

    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber: 1 };
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(DUEL));
    await renderEntity('duel');
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('The Duel in World Book');
    expect(h2Texts()).toEqual([
      'In brief',
      'Meaning in the book',
      'How it happens',
      'Connections',
      'Where it appears',
    ]);
    // «Коротко» открыто; значение несёт исход - под островом главы 3; сцена главы 1 открыта.
    expect(screen.getByText('The Duel in brief.').closest('[hidden]')).toBeNull();
    expect(screen.getByText('Tom loses the duel.').closest('[hidden]')).not.toBeNull();
    expect(screen.getByText('A glove falls.').closest('[hidden]')).toBeNull();
    expect(screen.getByText('Tom falls.').closest('[hidden]')).not.toBeNull();
  });

  it('событие: последняя сцена вне глав версии - значение под островом последней главы сцен среди глав версии, а не открыто', async () => {
    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber: 1 };
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...DUEL,
        scenes: [...DUEL.scenes, { chapter: 12, title: 'Gone', text: 'Out of the version.' }],
      })
    );
    await renderEntity('duel');
    // Глава 12 не в `chapterNumbers` [1, 2, 3]: остров значения - главы 3.
    expect(screen.getByText('Tom loses the duel.').closest('[hidden]')).not.toBeNull();
  });

  it('событие без сцен в главах версии и аноним без прогресса: значение открыто, острова нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse({ ...DUEL, scenes: null }));
    await renderEntity('duel');
    expect(screen.getByText('Tom loses the duel.').closest('[hidden]')).toBeNull();
    cleanup();
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(DUEL));
    await renderEntity('duel');
    // Аноним: прогресса нет - остров свёрнут не будет, как у краулера.
    expect(screen.getByText('Tom loses the duel.').closest('[hidden]')).toBeNull();
  });

  it('мета: title по хвосту типа (§15), description из «Коротко»; ru - «в книге»', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ROBE));
    expect((await entityMeta('robe')).title).toBe(
      'The Robe in World Book by Jane Writer: meaning and quotes'
    );
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(TERM));
    expect((await entityMeta('lark-law')).title).toBe(
      'Lark law in World Book by Jane Writer: what it means'
    );
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(DUEL));
    const meta = await entityMeta('duel');
    expect(meta.title).toBe(
      'The Duel in World Book by Jane Writer: what happens and why it matters'
    );
    expect(meta.description).toBe('The Duel in brief.');

    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({ ...ROBE, name: 'Халат' }, { language: 'ru' })
    );
    mocks.getBookOverview.mockResolvedValue(
      makeBook({
        versions: [version('en', 'world-book', 3), version('ru', 'mir-kniga', 3)],
        slug: 'mir-kniga',
      })
    );
    expect((await entityMeta('robe', 'ru', 'mir-kniga')).title).toBe(
      'Халат в книге «Мир-книга», Jane Writer: значение и цитаты'
    );
  });

  it('/wiki: предметы и события карточками, глоссарий строками; ссылка только при своей странице; после мест (Q2-Q4)', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      objects: [objCard('robe', 'The Robe'), objCard('cane', 'The Cane', { hasPage: false })],
      events: [objCard('duel', 'The Duel', { chapter: 1 })],
      terms: [
        objCard('lark-law', 'Lark law', { short: 'The rule of the map.', chapter: 1 }),
        objCard('fog', 'Fog', { short: null, chapter: 3, hasPage: false }),
        objCard('dew', 'Dew', { short: null, chapter: null, hasPage: false }),
      ],
    });
    await renderIndex();
    // Порядок §4 п.6: предметы, понятия (глоссарий), события.
    const ids = ['objects', 'glossary', 'events', 'more'];
    for (let i = 1; i < ids.length; i++) {
      const before = document.getElementById(ids[i - 1])!;
      const after = document.getElementById(ids[i])!;
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    const objects = within(document.getElementById('objects')!);
    expect(objects.getByRole('link', { name: 'The Robe' })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/robe'
    );
    expect(objects.queryByRole('link', { name: 'The Cane' })).toBeNull();
    expect(objects.getByText('The Cane')).toBeInTheDocument();
    const events = within(document.getElementById('events')!);
    expect(events.getByText('The Duel in brief.')).toBeInTheDocument();
    expect(events.getByRole('link', { name: 'Chapter 1' })).toBeInTheDocument();
    const rows = [...document.getElementById('glossary')!.querySelectorAll('li')].map(
      (li) => li.textContent
    );
    expect(rows).toEqual(['Lark law — The rule of the map. — Chapter 1', 'Fog — Chapter 3', 'Dew']);
    expect(
      within(document.getElementById('glossary')!).getByRole('link', { name: 'Lark law' })
    ).toHaveAttribute('href', '/en/book/world-book/wiki/lark-law');
  });

  it('событие: после прочтения главы последней сцены значение открыто (остров главы 3 снят)', async () => {
    spoiler.session = { data: { user: { id: 'u1' } }, status: 'authenticated' };
    spoiler.progress = { chapterNumber: 3 };
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(DUEL));
    await renderEntity('duel');
    expect(screen.getByText('Tom loses the duel.').closest('[hidden]')).toBeNull();
    expect(screen.getByText('Tom falls.').closest('[hidden]')).toBeNull();
  });

  it('цитата предмета: говорящий - герой по speakerKey; без ключа и с чужим ключом подписи нет', async () => {
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(ROBE));
    await renderEntity('robe');
    expect(document.getElementById('quotes')!.textContent).toContain('Anna Lark');
    cleanup();
    mocks.getPublicBookWorldEntity.mockResolvedValue(entityResponse(TERM));
    await renderEntity('lark-law');
    expect(document.getElementById('quotes')!.textContent).toContain('Law quote.');
    expect(document.getElementById('quotes')!.textContent).not.toContain('Anna Lark');
    cleanup();
    mocks.getPublicBookWorldEntity.mockResolvedValue(
      entityResponse({
        ...TERM,
        quotes: [{ text: 'Law quote.', chapter: 1, interpretation: 'Rule.', speakerKey: 'nobody' }],
      })
    );
    await renderEntity('lark-law');
    expect(document.getElementById('quotes')!.textContent).toContain('Law quote.');
    expect(document.getElementById('quotes')!.textContent).not.toMatch(/nobody/);
  });

  it('связи предмета: ссылки на анализ нет - тема названием без ссылки, герой по-прежнему ссылкой', async () => {
    const { worldStrings } = await import('@/lib/i18n/worldStrings');
    const { buildObjectSections } =
      await import('@/app/[lang]/book/[slug]/wiki/WorldObjectSections');
    // Страница сюда не приводит (без анализа по счётчику его и не запрашивают), поэтому - сам сборщик.
    const input = {
      entity: {
        ...ROBE,
        short: null,
        significance: null,
        description: null,
        quotes: null,
        faq: null,
      },
      strings: worldStrings.en,
      textLinks: null,
      people: new Map([['anna', { name: 'Anna Lark', href: '/en/book/world-book/wiki/anna' }]]),
      themeTitles: new Map([['courage', 'Courage']]),
      links: { analysis: null, analysisHasThemes: false, summary: null },
      chapterNumbers: [1, 2, 3],
      progressVersionId: null,
      analysisStrings: { analysisChapters: 'Chapters' },
      linker: { label: (n: number) => `Chapter ${n}`, href: () => null },
    } as unknown as Parameters<typeof buildObjectSections>[0];
    const section = buildObjectSections(input).find((x) => x.id === 'connections')!;
    render(<>{section.body}</>);
    expect(screen.getByText('Courage')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Courage' })).toBeNull();
    expect(screen.getByRole('link', { name: 'Anna Lark' })).toHaveAttribute(
      'href',
      '/en/book/world-book/wiki/anna'
    );
  });

  it('/wiki: карточка предмета и события без главы - без строки главы; без «Коротко» и без страницы - только имя', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      objects: [objCard('robe', 'The Robe', { chapter: null })],
      events: [objCard('duel', 'The Duel', { chapter: null, short: null, hasPage: false })],
    });
    await renderIndex();
    for (const id of ['objects', 'events']) {
      const section = within(document.getElementById(id)!);
      expect(section.queryByRole('link', { name: /Chapter/ })).toBeNull();
      expect(document.getElementById(id)!.textContent).not.toMatch(/Chapter/);
    }
    expect(within(document.getElementById('events')!).getByText('The Duel')).toBeInTheDocument();
    expect(document.getElementById('events')!.querySelectorAll('p')).toHaveLength(0);
  });

  it('/wiki: карточка со своей страницей и без «Коротко» занимает слот ссылки - имя дальше по тексту не ссылка', async () => {
    const mention = objCard('cane', 'The Cane', {
      short: 'Leaned against The Robe.',
      hasPage: false,
    });
    const robe = objCard('robe', 'The Robe', { short: null });
    const paragraphOf = () =>
      screen.getByText(
        (_, el) => el?.tagName === 'P' && el.textContent === 'Leaned against The Robe.'
      );
    const world = {
      ...LIST,
      entities: [
        ...LIST.entities,
        { ...summary('robe', 'The Robe', { type: 'object', role: null }), forms: ['The Robe'] },
      ],
    };
    mocks.getPublicBookWorld.mockResolvedValue({ ...world, objects: [robe, mention] });
    await renderIndex();
    expect(within(paragraphOf()).queryAllByRole('link')).toEqual([]);
    cleanup();
    // Контроль: упоминание раньше карточки предмета остаётся ссылкой - слот тратит именно карточка.
    mocks.getPublicBookWorld.mockResolvedValue({ ...world, objects: [mention, robe] });
    await renderIndex();
    expect(within(paragraphOf()).getAllByRole('link')).toHaveLength(1);
  });

  it('/wiki: порядок §4 п.6 при наличии мест - места, предметы, глоссарий, события, ссылки', async () => {
    mocks.getPublicBookWorld.mockResolvedValue({
      ...LIST,
      places: [
        {
          key: 'harbor',
          name: 'Old Harbor',
          short: 'Where the map begins.',
          kind: null,
          location: null,
          hasPage: true,
          point: null,
          scenes: [],
        },
      ],
      objects: [objCard('robe', 'The Robe')],
      terms: [objCard('lark-law', 'Lark law')],
      events: [objCard('duel', 'The Duel')],
    });
    await renderIndex();
    const ids = ['places', 'objects', 'glossary', 'events', 'more'];
    for (let i = 1; i < ids.length; i++) {
      const before = document.getElementById(ids[i - 1])!;
      const after = document.getElementById(ids[i])!;
      expect(before, ids[i - 1]).not.toBeNull();
      expect(after, ids[i]).not.toBeNull();
      expect(before.compareDocumentPosition(after) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('/wiki: бэкенд без карточек (до F08-13c) - разделов нет', async () => {
    mocks.getPublicBookWorld.mockResolvedValue(LIST);
    await renderIndex();
    for (const id of ['objects', 'events', 'glossary']) {
      expect(document.getElementById(id)).toBeNull();
    }
  });
});
