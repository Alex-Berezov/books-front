import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { WorldTab, type WorldTabProps } from '@/components/admin/books/WorldTab';
import type {
  BookWorldEntityResponse,
  BookWorldEntitySaveResponse,
  BookWorldEntitySummary,
  BookWorldListResponse,
  BookWorldSaveResponse,
  ChapterTitle,
  DossierStatus,
  PaginatedResult,
} from '@/types/api-schema';
import { server } from '../msw/server';

/**
 * Бэкенд мира книги для спек вкладки World (F08-1): msw-ручки с записью запросов и
 * подменяемыми ответами. Сессию (`next-auth/react`) и `notistack` спека мокает сама.
 */

export const API = 'http://localhost:5000/api';
export const WORLD = `${API}/versions/v1/world`;
export const LANDED = '2026-11-14T10:00:00.000Z';
/** `updatedAt` сущности в карточке: не совпадает со строкой списка. */
export const ENTITY_SEEN = '2026-11-14T10:30:00.000Z';
/** `updatedAt` самой свежей сущности списка (sonya): по нему сверяется импорт версии (R6). */
export const LIST_NEWEST = '2026-11-14T12:00:00.000Z';
/** `updatedAt` из ответа флага: отметка двигает `updatedAt` сущности. */
export const MARKED_AT = '2026-11-14T13:00:00.000Z';

export const row = (
  patch: Partial<BookWorldEntitySummary>,
  editor: Partial<NonNullable<BookWorldEntitySummary['editor']>> = {}
): BookWorldEntitySummary => ({
  key: 'raskolnikov',
  type: 'character',
  name: 'Rodion Raskolnikov',
  role: 'main',
  short: 'A student',
  hasCore: true,
  isIndexable: true,
  mentionFirst: null,
  updatedAt: '2026-11-14T09:00:00.000Z',
  editor: {
    isVisible: true,
    isListed: false,
    readAt: null,
    autoTextAt: LANDED,
    firstPublishedAt: null,
    missing: [],
    mentionChapters: 2,
    ...editor,
  },
  ...patch,
});

export const LIST = (): BookWorldEntitySummary[] => [
  row({}),
  row(
    { key: 'sonya', name: 'Sonya', role: 'secondary', hasCore: false, updatedAt: LIST_NEWEST },
    { missing: ['quotes', 'mentions'], readAt: '2026-11-14T11:00:00.000Z', mentionChapters: 0 }
  ),
  row(
    { key: 'lebezyatnikov', name: 'Lebezyatnikov', role: null },
    { autoTextAt: null, mentionChapters: null }
  ),
];

/** Карточка: ответ страницы сущности редактору — с полями F08-2 (присутствие, исключения, `stale`). */
export const detail = (key: string): BookWorldEntityResponse => ({
  language: 'en',
  chapterNumbers: [1, 2],
  alternates: [],
  entity: {
    ...row(
      { key, name: 'Sonya', updatedAt: ENTITY_SEEN },
      { aliasExclusions: null, stale: [], mentionsAt: '2026-11-14T10:00:00.000Z' }
    ),
    aliases: ['Sonya'],
    profile: null,
    appearance: null,
    character: null,
    arc: null,
    scenes: null,
    relations: null,
    quotes: null,
    critique: null,
    prototypes: null,
    adaptations: null,
    faq: null,
    sources: null,
    mentions: {
      chapters: [1, 2],
      first: 1,
      perChapter: [
        { chapter: 1, count: 1 },
        { chapter: 2, count: 1 },
      ],
      coPresence: [],
    },
    createdAt: '2026-11-14T08:00:00.000Z',
  },
});

export const version = {
  title: 'Crime and Punishment',
  author: 'F. Dostoevsky',
  language: 'en' as const,
};

/** Досье нет: «Вводные» идут без него молча. */
export const MISSING_DOSSIER = {
  status: 'missing',
  id: null,
  sourceVersionId: 'v1',
  generation: null,
  fresh: null,
  formatVersion: null,
  model: null,
  partsDone: 0,
  groupsDone: 0,
  groupsTotal: 0,
  failedReason: null,
  operation: null,
  previousOperation: null,
  data: null,
  updatedAt: null,
} satisfies DossierStatus;

type Reply = (key: string, body: unknown, query: string) => Response | Promise<Response>;

export interface WorldApi {
  gets: string[];
  reads: { key: string; body: unknown }[];
  flags: { key: string; body: unknown }[];
  puts: { query: string; body: unknown }[];
  entityPuts: { key: string; query: string; body: unknown }[];
  deletes: string[];
  /** Строки списка мира; по умолчанию `LIST()`. */
  list: () => BookWorldEntitySummary[];
  readReply: Reply;
  flagsReply: Reply;
  putReply: Reply;
  entityPutReply: Reply;
  deleteReply: Reply;
  entityReply: Reply;
  chaptersReply: () => Response | Promise<Response>;
  analysisReply: () => Response | Promise<Response>;
}

export const json409 = (code: string) =>
  HttpResponse.json({ statusCode: 409, message: 'refused', code }, { status: 409 });

/** Ручки мира книги и «Вводных»; ответы по умолчанию — удачные. */
export const installWorldApi = (): WorldApi => {
  const api: WorldApi = {
    gets: [],
    reads: [],
    flags: [],
    puts: [],
    entityPuts: [],
    deletes: [],
    list: LIST,
    readReply: (key) => HttpResponse.json(row({ key }, { readAt: LANDED })),
    // Как бэкенд: `isIndexable` — поле строки, `isVisible` — служебное, в `editor`.
    flagsReply: (key, body) => {
      const { isVisible, isIndexable } = body as { isVisible?: boolean; isIndexable?: boolean };
      return HttpResponse.json(
        row(
          { key, updatedAt: MARKED_AT, ...(isIndexable === undefined ? {} : { isIndexable }) },
          isVisible === undefined ? {} : { isVisible }
        )
      );
    },
    putReply: () =>
      HttpResponse.json({
        world: null,
        entities: [{ key: 'raskolnikov', created: false, hasCore: false, warnings: [] }],
      } satisfies BookWorldSaveResponse),
    entityPutReply: () =>
      HttpResponse.json({
        entity: null,
        hasCore: false,
        warnings: [],
        recountQueued: false,
      } satisfies BookWorldEntitySaveResponse),
    deleteReply: () => new HttpResponse(null, { status: 204 }),
    entityReply: (key) => HttpResponse.json(detail(key)),
    chaptersReply: () =>
      HttpResponse.json({
        items: [{ number: 1, title: 'One' }],
        pagination: { page: 1, limit: 1000, total: 1, totalPages: 1 },
      } satisfies PaginatedResult<ChapterTitle>),
    analysisReply: () => HttpResponse.json(null),
  };
  server.use(
    http.get(WORLD, () => {
      api.gets.push('list');
      return HttpResponse.json({
        language: 'en',
        alternates: [],
        entities: api.list(),
      } satisfies BookWorldListResponse);
    }),
    http.get(`${WORLD}/:key`, ({ params }) => {
      api.gets.push(String(params.key));
      return api.entityReply(String(params.key), null, '');
    }),
    http.post(`${WORLD}/:key/read`, async ({ params, request }) => {
      const body = await request.json();
      api.reads.push({ key: String(params.key), body });
      return api.readReply(String(params.key), body, '');
    }),
    http.patch(`${WORLD}/:key/flags`, async ({ params, request }) => {
      const body = await request.json();
      api.flags.push({ key: String(params.key), body });
      return api.flagsReply(String(params.key), body, '');
    }),
    http.put(WORLD, async ({ request }) => {
      const query = new URL(request.url).search;
      const body = await request.json();
      api.puts.push({ query, body });
      return api.putReply('', body, query);
    }),
    http.put(`${WORLD}/:key`, async ({ params, request }) => {
      const query = new URL(request.url).search;
      const body = await request.json();
      api.entityPuts.push({ key: String(params.key), query, body });
      return api.entityPutReply(String(params.key), body, query);
    }),
    http.delete(`${WORLD}/:key`, ({ params }) => {
      api.deletes.push(String(params.key));
      return api.deleteReply(String(params.key), null, '');
    }),
    http.get(`${API}/admin/versions/v1/chapter-titles`, () => api.chaptersReply()),
    http.get(`${API}/versions/v1/analysis`, () => api.analysisReply()),
    http.get(`${API}/admin/versions/v1/dossier`, () => HttpResponse.json(MISSING_DOSSIER))
  );
  return api;
};

export const renderWorldTab = (
  isAdmin: boolean,
  isEditor: boolean | null = true,
  versionOverride: Partial<WorldTabProps['version']> = {}
) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <WorldTab
        versionId="v1"
        version={{ ...version, ...versionOverride }}
        isAdmin={isAdmin}
        isEditor={isEditor}
      />
    </QueryClientProvider>
  );
  return { client };
};

export const rowOf = async (key: string) => within(await screen.findByTestId(`world-row-${key}`));

export const cardOf = async (name: string) => within(await screen.findByRole('region', { name }));
