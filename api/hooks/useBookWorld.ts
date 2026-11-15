/**
 * React Query hooks for the book world (F08-1).
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  deleteBookWorldEntity,
  getBookWorld,
  getBookWorldEntity,
  markBookWorldEntityRead,
  saveBookWorld,
  saveBookWorldEntity,
  setBookWorldEntityFlags,
} from '@/api/endpoints/admin/bookWorld';
import type {
  BookWorldEntitySaveResponse,
  BookWorldExpected,
  BookWorldEntitySummary,
  BookWorldEntityResponse,
  BookWorldListResponse,
  BookWorldSaveResponse,
  ExpectedRow,
  SaveBookWorldEntityRequest,
  SaveBookWorldRequest,
  SetBookWorldFlagsRequest,
} from '@/types/api-schema';

export const bookWorldQueryKeys = {
  all: ['book-world'] as const,
  list: (versionId: string) => [...bookWorldQueryKeys.all, 'list', versionId] as const,
  entities: (versionId: string) => [...bookWorldQueryKeys.all, 'entity', versionId] as const,
  entity: (versionId: string, key: string) =>
    [...bookWorldQueryKeys.entities(versionId), key] as const,
};

export const useBookWorld = (versionId: string) =>
  useQuery({
    queryKey: bookWorldQueryKeys.list(versionId),
    queryFn: () => getBookWorld(versionId),
    staleTime: 30 * 1000,
  });

/** Карточка сущности; `key === null` — новая, запроса нет. */
export const useBookWorldEntity = (versionId: string, key: string | null) =>
  useQuery({
    queryKey: bookWorldQueryKeys.entity(versionId, key ?? ''),
    queryFn: () => getBookWorldEntity(versionId, key ?? ''),
    enabled: key !== null,
    staleTime: 30 * 1000,
  });

/**
 * Номер последней отметки («прочитано» или флаг) по сущности: в кэш ложится только ответ
 * последнего запроса — ответ раньше ушедшего, пришедший позже, не откатывает переключатель.
 */
const latestMark = new Map<string, number>();
const markId = (versionId: string, key: string) => `${versionId}/${key}`;
const nextMark = (versionId: string, key: string): { seq: number } => {
  const seq = (latestMark.get(markId(versionId, key)) ?? 0) + 1;
  latestMark.set(markId(versionId, key), seq);
  return { seq };
};
const isLatestMark = (versionId: string, key: string, seq: number | undefined) =>
  latestMark.get(markId(versionId, key)) === seq;

/**
 * Строка списка и карточка той же сущности — из ответа отметки: список не перечитывается целиком
 * ради одной сущности, карточка показывает новые «прочитано», «показывать», «индексировать».
 * `updatedAt` прежний: отметки его не двигают (решение арбитра `F08 | F08-1` R6, круг 2), и сверка
 * записи остаётся по тому, что показала форма.
 */
const patchMarkedRow = (
  queryClient: ReturnType<typeof useQueryClient>,
  versionId: string,
  row: BookWorldEntitySummary
) => {
  queryClient.setQueryData<BookWorldListResponse>(bookWorldQueryKeys.list(versionId), (prev) =>
    prev
      ? {
          ...prev,
          entities: prev.entities.map((e) =>
            e.key === row.key ? { ...row, updatedAt: e.updatedAt } : e
          ),
        }
      : prev
  );
  queryClient.setQueryData<BookWorldEntityResponse>(
    bookWorldQueryKeys.entity(versionId, row.key),
    (prev) =>
      prev
        ? { ...prev, entity: { ...prev.entity, ...row, updatedAt: prev.entity.updatedAt } }
        : prev
  );
};

/** Импорт всей версии; `dryRun` ничего не пишет и кэш не сбрасывает. */
export const useSaveBookWorld = () => {
  const queryClient = useQueryClient();
  return useMutation<
    BookWorldSaveResponse,
    Error,
    {
      versionId: string;
      data: SaveBookWorldRequest;
      dryRun?: boolean;
      expected?: BookWorldExpected;
    }
  >({
    mutationFn: ({ versionId, data, dryRun, expected }) =>
      saveBookWorld(versionId, data, dryRun, expected),
    onSuccess: (res, { versionId, dryRun }) => {
      if (dryRun) return;
      // Список — из ответа, перечитывать его незачем; карточки версии — заново.
      if (res.world) queryClient.setQueryData(bookWorldQueryKeys.list(versionId), res.world);
      else void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.list(versionId) });
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.entities(versionId) });
    },
  });
};

export const useSaveBookWorldEntity = () => {
  const queryClient = useQueryClient();
  return useMutation<
    BookWorldEntitySaveResponse,
    Error,
    {
      versionId: string;
      key: string;
      data: SaveBookWorldEntityRequest;
      dryRun?: boolean;
      expected?: ExpectedRow;
    }
  >({
    mutationFn: ({ versionId, key, data, dryRun, expected }) =>
      saveBookWorldEntity(versionId, key, data, dryRun, expected),
    onSuccess: (res, { versionId, key, dryRun }) => {
      if (dryRun) return;
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.list(versionId) });
      // Сохранённая сущность пришла в ответе — карточка берёт её, второго GET нет.
      const entity = res.entity;
      if (!entity) {
        void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.entity(versionId, key) });
        return;
      }
      queryClient.setQueryData<BookWorldEntityResponse>(
        bookWorldQueryKeys.entity(versionId, key),
        (prev) => (prev ? { ...prev, entity } : prev)
      );
    },
  });
};

export const useDeleteBookWorldEntity = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, { versionId: string; key: string }>({
    mutationFn: ({ versionId, key }) => deleteBookWorldEntity(versionId, key),
    onSuccess: (_res, { versionId, key }) => {
      queryClient.removeQueries({ queryKey: bookWorldQueryKeys.entity(versionId, key) });
      void queryClient.invalidateQueries({ queryKey: bookWorldQueryKeys.list(versionId) });
    },
  });
};

export const useMarkBookWorldEntityRead = () => {
  const queryClient = useQueryClient();
  return useMutation<
    BookWorldEntitySummary,
    Error,
    { versionId: string; key: string; autoTextAt: string | null },
    { seq: number }
  >({
    mutationFn: ({ versionId, key, autoTextAt }) =>
      markBookWorldEntityRead(versionId, key, { autoTextAt }),
    onMutate: ({ versionId, key }) => nextMark(versionId, key),
    onSuccess: (row, { versionId, key }, context) => {
      if (isLatestMark(versionId, key, context?.seq)) patchMarkedRow(queryClient, versionId, row);
    },
  });
};

export const useSetBookWorldEntityFlags = () => {
  const queryClient = useQueryClient();
  return useMutation<
    BookWorldEntitySummary,
    Error,
    { versionId: string; key: string; flags: SetBookWorldFlagsRequest },
    { seq: number }
  >({
    mutationFn: ({ versionId, key, flags }) => setBookWorldEntityFlags(versionId, key, flags),
    onMutate: ({ versionId, key }) => nextMark(versionId, key),
    onSuccess: (row, { versionId, key }, context) => {
      if (isLatestMark(versionId, key, context?.seq)) patchMarkedRow(queryClient, versionId, row);
    },
  });
};
