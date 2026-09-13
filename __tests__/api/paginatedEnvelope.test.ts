import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { getAuthors } from '@/api/endpoints/admin/authors';
import { getBooks } from '@/api/endpoints/admin/books';
import { commentsApi } from '@/api/endpoints/admin/comments';
import { getContributors } from '@/api/endpoints/admin/contributors';
import { getMediaFiles } from '@/api/endpoints/admin/media';
import { getPages } from '@/api/endpoints/admin/pages';
import { personsApi } from '@/api/endpoints/admin/persons';
import { getUsers } from '@/api/endpoints/admin/users';
import { getUserActivities } from '@/api/endpoints/auth';
import { getBookshelf } from '@/api/endpoints/bookshelf';
import type {
  BookshelfListResponse,
  CommentsResponse,
  MediaResponse,
  PersonListResponse,
  UserActivitiesResponse,
} from '@/types/api-schema';
// Не через барель: `UsersResponse` туда не вынесен намеренно — причина в комментарии
// у блока `./user` в `types/api-schema/index.ts`.
import type { UsersResponse } from '@/types/api-schema/user';
import type { ContributorListResponse } from '@/types/contributors';
import { server } from '../msw/server';

/**
 * Единая обёртка списочного ответа `{items, pagination}` (`LEGACY-177`, 13.09.2026).
 * Источник формы — `books/src/shared/dto/paginated-response.dto.ts`.
 *
 * 🔴 Барьер здесь двухслойный, и одного слоя не хватает.
 *
 * Рантайм ловит только те маршруты, где фронт что-то делает с телом: маппер `/media`
 * и разбор старого массива у `/users/me/activities`. Остальные вызовы — сквозные:
 * `httpGetAuth<T>` возвращает разобранный JSON как есть, поэтому возврат старой
 * обёртки в **типе** не меняет ни одного рантайм-значения, и `toEqual` остаётся
 * зелёным. Ровно так уже уезжала выдуманная форма в `LEGACY-191`.
 *
 * Поэтому второй слой — утверждения на уровне типов: набор ключей ответа сверяется
 * **целиком**, а не по одному полю. Вернётся `{data, meta}` или плоский
 * `{items,total,page,limit}` — соответствующая константа перестанет присваиваться,
 * и `tsc --noEmit` покраснеет прямо здесь, а не через полгода на живом запросе.
 */

vi.mock('next-auth/react', () => ({
  getSession: vi.fn(() =>
    Promise.resolve({ accessToken: 'test-token', user: { id: 'u1' }, expires: '2099-01-01' })
  ),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

const API_BASE = 'http://localhost:5000/api';

/** Набор ключей `T` совпадает с `K` ровно, без лишних и без недостающих. */
type ExactKeys<T, K extends PropertyKey> = [keyof T] extends [K]
  ? [K] extends [keyof T]
    ? true
    : false
  : false;

type EnvelopeKeys<T> = ExactKeys<T, 'items' | 'pagination'>;
type PaginationKeys<T extends { pagination: unknown }> = ExactKeys<
  T['pagination'],
  'page' | 'limit' | 'total' | 'totalPages'
>;
type PaginationKeysWithNext<T extends { pagination: unknown }> = ExactKeys<
  T['pagination'],
  'page' | 'limit' | 'total' | 'totalPages' | 'hasNext'
>;

// Снаружи у списочного ответа ровно два поля.
const USERS_ENVELOPE: EnvelopeKeys<UsersResponse> = true;
const COMMENTS_ENVELOPE: EnvelopeKeys<CommentsResponse> = true;
const MEDIA_ENVELOPE: EnvelopeKeys<MediaResponse> = true;
const CONTRIBUTORS_ENVELOPE: EnvelopeKeys<ContributorListResponse> = true;
const PERSONS_ENVELOPE: EnvelopeKeys<PersonListResponse> = true;
const ACTIVITIES_ENVELOPE: EnvelopeKeys<UserActivitiesResponse> = true;
const BOOKSHELF_ENVELOPE: EnvelopeKeys<BookshelfListResponse> = true;

// Внутри `pagination` — четыре поля; у бесконечных списков к ним добавлен `hasNext`.
const USERS_PAGINATION: PaginationKeys<UsersResponse> = true;
const COMMENTS_PAGINATION: PaginationKeys<CommentsResponse> = true;
// `offset` из ответа `/admin/persons` ушёл: страницу считает бэкенд.
const PERSONS_PAGINATION: PaginationKeys<PersonListResponse> = true;
const ACTIVITIES_PAGINATION: PaginationKeysWithNext<UserActivitiesResponse> = true;
const BOOKSHELF_PAGINATION: PaginationKeysWithNext<BookshelfListResponse> = true;

const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };
const paginationWithNext = { ...pagination, hasNext: false };

describe('единая обёртка {items, pagination} (LEGACY-177)', () => {
  describe('форма объявлена целиком, а не отдельными полями', () => {
    it('снаружи у ответа только items и pagination', () => {
      expect([
        USERS_ENVELOPE,
        COMMENTS_ENVELOPE,
        MEDIA_ENVELOPE,
        CONTRIBUTORS_ENVELOPE,
        PERSONS_ENVELOPE,
        ACTIVITIES_ENVELOPE,
        BOOKSHELF_ENVELOPE,
      ]).toEqual([true, true, true, true, true, true, true]);
    });

    it('hasNext сохранён внутри pagination, а не рядом с items', () => {
      expect([
        USERS_PAGINATION,
        COMMENTS_PAGINATION,
        PERSONS_PAGINATION,
        ACTIVITIES_PAGINATION,
        BOOKSHELF_PAGINATION,
      ]).toEqual([true, true, true, true, true]);
    });
  });

  describe('сквозные маршруты отдают тело как есть', () => {
    const passthrough: Array<[string, string, () => Promise<{ pagination: unknown }>]> = [
      ['GET /admin/authors', `${API_BASE}/admin/authors`, () => getAuthors()],
      ['GET /books', `${API_BASE}/books`, () => getBooks()],
      ['GET /admin/pages', `${API_BASE}/admin/pages`, () => getPages()],
      ['GET /admin/comments', `${API_BASE}/admin/comments`, () => commentsApi.getComments({})],
      ['GET /users', `${API_BASE}/users`, () => getUsers()],
      ['GET /admin/contributors', `${API_BASE}/admin/contributors`, () => getContributors()],
      ['GET /admin/persons', `${API_BASE}/admin/persons`, () => personsApi.list()],
      [
        'GET /admin/persons/search',
        `${API_BASE}/admin/persons/search`,
        () => personsApi.search('x'),
      ],
    ];

    it.each(passthrough)('%s разбирается как {items, pagination}', async (_route, url, call) => {
      const body = { items: [{ id: 'row-1' }], pagination };
      server.use(http.get(url, () => HttpResponse.json(body)));

      // Сравнение целиком: лишнее поле снаружи обёртки (`total`, `meta`, `offset`)
      // роняет проверку так же, как пропавшее.
      await expect(call()).resolves.toEqual(body);
    });

    it('GET /me/bookshelf сохраняет hasNext внутри pagination', async () => {
      const body = { items: [{ id: 'shelf-1' }], pagination: paginationWithNext };
      server.use(http.get(`${API_BASE}/me/bookshelf`, () => HttpResponse.json(body)));

      await expect(getBookshelf(1, 20)).resolves.toEqual(body);
    });

    it('GET /users/me/activities сохраняет hasNext внутри pagination', async () => {
      const body = { items: [{ id: 'act-1' }], pagination: paginationWithNext };
      server.use(http.get(`${API_BASE}/users/me/activities`, () => HttpResponse.json(body)));

      await expect(getUserActivities({ page: 1, limit: 20 })).resolves.toEqual(body);
    });
  });

  describe('маршруты, где фронт перекладывает тело сам', () => {
    /**
     * `/media` — единственный список, который фронт отображает: строки сервера
     * превращаются в `MediaFile`. Пагинация после `LEGACY-177` переносится как есть,
     * а не пересчитывается: прежний `Math.ceil(total / limit)` при `limit = 0`
     * давал `Infinity`.
     */
    it('GET /media переносит pagination сервера, а не считает totalPages сам', async () => {
      server.use(
        http.get(`${API_BASE}/media`, () =>
          HttpResponse.json({
            items: [
              {
                id: 'm-1',
                url: 'https://cdn/x.png',
                key: 'covers/x.png',
                contentType: 'image/png',
                size: 10,
                createdAt: '2026-01-01T00:00:00Z',
                createdById: 'u1',
                isDeleted: false,
              },
            ],
            pagination: { page: 2, limit: 0, total: 7, totalPages: 0 },
          })
        )
      );

      await expect(getMediaFiles({ page: 2, limit: 0 })).resolves.toEqual({
        items: [
          {
            id: 'm-1',
            url: 'https://cdn/x.png',
            filename: 'x.png',
            mimeType: 'image/png',
            size: 10,
            type: 'image',
            createdAt: '2026-01-01T00:00:00Z',
            updatedAt: '2026-01-01T00:00:00Z',
          },
        ],
        pagination: { page: 2, limit: 0, total: 7, totalPages: 0 },
      });
    });

    /**
     * Ветка со старым **массивом** — это `LEGACY-218`, а не `LEGACY-177`: она
     * закрывает окно выката, когда сервер ещё не знал о пагинации вовсе. Снимать её
     * здесь нечем, но форму она обязана собирать новую.
     */
    it('GET /users/me/activities: голый массив заворачивается в новую обёртку', async () => {
      server.use(
        http.get(`${API_BASE}/users/me/activities`, () => HttpResponse.json([{ id: 'act-1' }]))
      );

      await expect(getUserActivities({ page: 1, limit: 20 })).resolves.toEqual({
        items: [{ id: 'act-1' }],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1, hasNext: false },
      });
    });

    it('GET /users/me/activities: нулевой limit даёт ноль страниц, а не Infinity', async () => {
      server.use(http.get(`${API_BASE}/users/me/activities`, () => HttpResponse.json([])));

      await expect(getUserActivities({ page: 1, limit: 0 })).resolves.toEqual({
        items: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0, hasNext: false },
      });
    });
  });

  /**
   * Окно между выкатами сторон: бэкенд уезжает тегом, фронт — пушем в `main`,
   * безопасного порядка у пары нет. Пока бэкенд на прежнем теге, оба маршрута
   * отдают плоскую форму без ключа `pagination`, а экраны читают
   * `pagination.hasNext` и `pagination.totalPages`. Ветки деградации заведены
   * ради этого окна — и проверяются здесь, иначе снятие ветки или опечатка
   * в её полях не краснеет нигде.
   */
  describe('старая форма бэкенда в окне выката сворачивается в новую', () => {
    it('GET /users/me/activities: плоский объект без pagination', async () => {
      server.use(
        http.get(`${API_BASE}/users/me/activities`, () =>
          HttpResponse.json({
            items: [{ id: 'act-1' }, { id: 'act-2' }],
            total: 7,
            page: 2,
            limit: 2,
            hasNext: true,
          })
        )
      );

      // Значения берутся из ответа, а не из параметров запроса: сервер —
      // источник истины о том, что он на самом деле отдал.
      await expect(getUserActivities({ page: 2, limit: 2 })).resolves.toEqual({
        items: [{ id: 'act-1' }, { id: 'act-2' }],
        pagination: { page: 2, limit: 2, total: 7, totalPages: 4, hasNext: true },
      });
    });

    it('GET /media: плоский объект без pagination', async () => {
      server.use(
        http.get(`${API_BASE}/media`, () =>
          HttpResponse.json({
            items: [
              {
                id: 'm-1',
                url: 'https://cdn/x.png',
                key: 'covers/x.png',
                contentType: 'image/png',
                size: 10,
                createdAt: '2026-01-01T00:00:00Z',
                createdById: 'u1',
                isDeleted: false,
              },
            ],
            total: 5,
            page: 2,
            limit: 2,
          })
        )
      );

      const res = await getMediaFiles({ page: 2, limit: 2 });

      expect(res.pagination).toEqual({ page: 2, limit: 2, total: 5, totalPages: 3 });
      expect(res.items).toHaveLength(1);
    });

    it('GET /media: плоский объект с нулевым limit даёт ноль страниц, а не Infinity', async () => {
      server.use(
        http.get(`${API_BASE}/media`, () =>
          HttpResponse.json({ items: [], total: 0, page: 1, limit: 0 })
        )
      );

      await expect(getMediaFiles({ page: 1, limit: 0 })).resolves.toEqual({
        items: [],
        pagination: { page: 1, limit: 0, total: 0, totalPages: 0 },
      });
    });
  });
});
