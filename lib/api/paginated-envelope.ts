import { ApiError } from '@/types/api';
import type { PaginatedResult, PaginationInfo } from '@/types/api-schema/common';

/**
 * Приведение списочного ответа к единой обёртке `{items, pagination}` (`LEGACY-177`).
 *
 * 🔴 Зачем это нужно, хотя бэкенд уже переведён. Стороны выкатываются врозь: бэкенд
 * уезжает тегом через конвейер, фронт — пушем в `main`, и безопасного порядка у пары
 * нет. В окне между выкатами тот же самый маршрут отвечает **прежней** формой, а экраны
 * читают `pagination.total` и `items.length`. Без приведения это не «данных нет»,
 * а падение: `data` не пустой, поэтому `?.` не срабатывает, и чтение поля у `undefined`
 * роняет экран целиком — белый экран вместо списка.
 *
 * Формы, которые сюда приходят, и во что сворачиваются:
 *
 * | Что прислал сервер | Откуда | Во что превращается |
 * | --- | --- | --- |
 * | `{items, pagination}` | текущий бэкенд | как есть |
 * | `{items, total, page, limit}` | бэкенд до тега, плоская форма | `pagination` собирается из плоских полей |
 * | `{data, meta}` | бэкенд до тега, админские списки | `items` из `data`, `pagination` из `meta` |
 * | голый массив | самые старые маршруты | одна страница со всеми строками |
 *
 * ⚠️ Приведение живёт **в слое запросов, а не в экранах**. Защита, размазанная по
 * компонентам, — это десять мест, каждое из которых надо не забыть: ревью первого круга
 * нашло ровно такую дыру в девяти экранах, второго — в десятом. Здесь же оно одно
 * на маршрут и снимается вместе с окном выката одним удалением вызова.
 *
 * ⚠️ Снимать вместе с окном выката, а не раньше: пока в `books` не уехал тег с новой
 * формой, эта функция — единственное, что отделяет админку от белого экрана.
 */

/** Плоская форма: поля пагинации лежат рядом с `items`. */
interface FlatEnvelope<T> {
  items?: T[];
  total?: number;
  page?: number;
  limit?: number;
}

/** Прежняя админская форма `{data, meta}`. */
interface DataMetaEnvelope<T> {
  data?: T[];
  meta?: Partial<PaginationInfo>;
}

type AnyEnvelope<T> = Partial<PaginatedResult<T>> & FlatEnvelope<T> & DataMetaEnvelope<T>;

/**
 * Число страниц считается так же, как `paginated()` на бэкенде: при нулевом `limit`
 * страниц ноль, а не `Infinity`.
 */
const pagesOf = (total: number, limit: number): number =>
  limit > 0 ? Math.ceil(total / limit) : 0;

/**
 * Запасные значения для маршрутов, где размер страницы задаёт сам вызывающий код,
 * а не параметры функции. Они используются, **только** если сервер не прислал ни
 * `page`, ни `limit` ни в одной форме: у всех четырёх форм эти поля есть, кроме
 * голого массива, поэтому на практике сюда доходит лишь предельный случай.
 */
export const LIST_FALLBACK = { page: 1, limit: 20 };

/**
 * @param body ответ сервера в любой из четырёх форм
 * @param fallback значения запроса — ими закрываются поля, которых нет ни в одной форме
 */
export const toPaginated = <T>(
  body: AnyEnvelope<T> | T[] | undefined | null,
  fallback: { page: number; limit: number }
): PaginatedResult<T> => {
  if (Array.isArray(body)) {
    return {
      items: body,
      pagination: {
        page: 1,
        limit: fallback.limit,
        total: body.length,
        totalPages: pagesOf(body.length, fallback.limit),
      },
    };
  }

  if (!body) {
    return {
      items: [],
      pagination: { page: fallback.page, limit: fallback.limit, total: 0, totalPages: 0 },
    };
  }

  // Целевая форма — отдаётся как есть, ничего не пересчитывается: `totalPages`
  // считает сервер, и повторять его правило округления здесь незачем.
  if (body.pagination) return { items: body.items ?? [], pagination: body.pagination };

  const items = body.items ?? body.data ?? [];
  const meta = body.meta;
  const page = meta?.page ?? body.page ?? fallback.page;
  const limit = meta?.limit ?? body.limit ?? fallback.limit;
  const total = meta?.total ?? body.total ?? items.length;

  return {
    items,
    pagination: { page, limit, total, totalPages: meta?.totalPages ?? pagesOf(total, limit) },
  };
};

/**
 * ⚠️ Переходник пачки `W7` (`LEGACY-379`): четырнадцать маршрутов бэкенда переходят
 * с голого массива на `{items, pagination}`, а фронт выкатывается раньше тега бэкенда.
 * Строже `toPaginated` намеренно: принимаются ровно две формы, массив сворачивается
 * в одну страницу, всё остальное (включая `null`) — ошибка, а не пустой список,
 * иначе сломанный ответ выглядел бы как «данных нет». Ошибка — `ApiError` с кодом 502:
 * глобальный тост в `providers/AppProviders.tsx` показывает только `ApiError` от 500.
 *
 * Снимается вторым коммитом того же захода, после выката бэкенда и сброса кэша
 * (решение арбитра 23.09.2026, `books-app-docs/ai-context/decisions-log.md`).
 */
export const toListResult = <T>(body: T[] | PaginatedResult<T>): PaginatedResult<T> => {
  if (Array.isArray(body)) {
    return toPaginated(body, { page: 1, limit: body.length });
  }
  if (
    body !== null &&
    typeof body === 'object' &&
    Array.isArray(body.items) &&
    body.pagination !== null &&
    typeof body.pagination === 'object'
  ) {
    return body;
  }
  throw new ApiError({
    statusCode: 502,
    error: 'Bad Gateway',
    message: 'Unexpected list response shape: expected {items, pagination}',
  });
};
