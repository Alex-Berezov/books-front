/**
 * React Query hooks for the translation run of a whole book (F05-7, `admin` only).
 *
 * Запуск идёт фоном на бэкенде: ход перечитывается раз в несколько секунд, пока операция
 * запуска `active` или идёт одна из его операций досье и глоссария (решение арбитра
 * `F05 | F05-7`: на паузе `DOSSIER_PAUSED` работает досье). 503 `LLM_DISABLED`
 * и `LLM_MODELS_UNAVAILABLE` окно показывает своей плашкой (`localErrorCodes`).
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type UseMutationOptions,
} from '@tanstack/react-query';
import {
  cancelLlmOperation,
  LLM_MODELS_UNAVAILABLE,
  resumeLlmOperation,
} from '@/api/endpoints/admin/llm';
import {
  cancelTranslationRun,
  getBookTranslationRuns,
  getTranslationRun,
  getTranslationRunEstimate,
  getTranslationRunReport,
  getTranslationSource,
  pauseTranslationRun,
  resumeTranslationRun,
  startTranslationRun,
} from '@/api/endpoints/admin/translation';
import { localErrorCodes } from '@/lib/api/local-error-codes';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import type { ApiError } from '@/types/api';
import type {
  LlmOperation,
  ResumeTranslationRunRequest,
  StartTranslationRunRequest,
  TranslationRun,
  TranslationRunEstimateParams,
} from '@/types/api-schema';
import { COMPARE_REFETCH_MS, LLM_DISABLED } from './useTranslationCompare';

/** Языков в запуске — не больше языков сайта (валидатор `StartTranslationRunDto`). */
export const RUN_MAX_LANGUAGES = SUPPORTED_LANGS.length;

const LOCAL_CODES = localErrorCodes([LLM_DISABLED, LLM_MODELS_UNAVAILABLE]);

export const translationRunKeys = {
  all: ['translation-run'] as const,
  source: (versionId: string) => [...translationRunKeys.all, 'source', versionId] as const,
  /** Префикс оценок версии: старт сбрасывает все наборы языков разом. */
  estimates: (versionId: string) => [...translationRunKeys.all, 'estimate', versionId] as const,
  estimate: (versionId: string, params: TranslationRunEstimateParams) =>
    [...translationRunKeys.estimates(versionId), params] as const,
  /** Префикс всех списков книги: сброс задевает и идущие запуски версии, и последний. */
  list: (bookId: string) => [...translationRunKeys.all, 'list', bookId] as const,
  versionRuns: (bookId: string, versionId: string, filter: 'active' | 'latest') =>
    [...translationRunKeys.list(bookId), versionId, filter] as const,
  detail: (id: string) => [...translationRunKeys.all, 'detail', id] as const,
  report: (id: string) => [...translationRunKeys.all, 'report', id] as const,
};

/** Можно ли переводить версию и на какие языки; `enabled` — только у `admin` (403 остальным). */
export const useTranslationSource = (versionId: string, enabled: boolean) =>
  useQuery({
    queryKey: translationRunKeys.source(versionId),
    queryFn: () => getTranslationSource(versionId),
    enabled,
    retry: false,
  });

/** Набор языков без порядка кликов: `[ru, fr]` и `[fr, ru]` — одна оценка, один ключ. */
const sortedParams = (params: TranslationRunEstimateParams): TranslationRunEstimateParams => ({
  ...params,
  languages: [...params.languages].sort(),
});

/** Оценка до запуска: запрос уходит только с выбранными языками, на каждую смену выбора. */
export const useTranslationRunEstimate = (
  versionId: string,
  params: TranslationRunEstimateParams | null
) => {
  const sorted = params ? sortedParams(params) : null;
  return useQuery({
    queryKey: translationRunKeys.estimate(versionId, sorted ?? { languages: [] }),
    queryFn: () => getTranslationRunEstimate(versionId, sorted as TranslationRunEstimateParams),
    enabled:
      sorted !== null &&
      sorted.languages.length > 0 &&
      sorted.languages.length <= RUN_MAX_LANGUAGES,
    retry: false,
    meta: LOCAL_CODES,
  });
};

/**
 * Запуски версии для её блока (решение арбитра `F05 | F05-7`, /fix В1): все идущие и на паузе —
 * у версии их бывает несколько, по языку на запуск; нет ни одного — её последний. Фильтром на
 * сервере, а не по первой странице книги.
 */
export const useVersionTranslationRuns = (bookId: string, versionId: string) => {
  const active = useQuery({
    queryKey: translationRunKeys.versionRuns(bookId, versionId, 'active'),
    queryFn: () =>
      getBookTranslationRuns(bookId, {
        bookVersionId: versionId,
        active: true,
        // Идущих запусков у версии не больше языков: по запуску на язык (Р23).
        limit: RUN_MAX_LANGUAGES,
      }),
  });
  const latest = useQuery({
    queryKey: translationRunKeys.versionRuns(bookId, versionId, 'latest'),
    queryFn: () => getBookTranslationRuns(bookId, { bookVersionId: versionId, limit: 1 }),
  });
  const running = active.data?.items ?? [];
  // Последний закончившийся остаётся виден и рядом с идущими: его отчёт и черновик (§2.4).
  const finished = (latest.data?.items ?? []).filter((r) => !running.some((a) => a.id === r.id));
  return {
    runs: [...running, ...finished],
    // Отказ «последнего» прячет блок, только когда идущих нет: идущие показываются и без него.
    error: active.error ?? (running.length === 0 ? latest.error : null),
    refetch: () => Promise.all([active.refetch(), latest.refetch()]),
  };
};

const isWorking = (op: LlmOperation): boolean => op.status === 'active';

/**
 * Перечитывать, пока идёт запуск или одна из его операций досье и глоссария; всё на паузе или
 * закончилось — без опроса. Запрос упал — опрос встаёт, отказ виден своей плашкой.
 */
export const translationRunRefetchInterval = (
  run: TranslationRun | undefined,
  failed = false
): number | false =>
  !failed && run !== undefined && (isWorking(run.operation) || run.operations.some(isWorking))
    ? COMPARE_REFETCH_MS
    : false;

/**
 * Запуск или его досье сменили состояние: языки (`translation-source`), списки запусков книги
 * и отчёт — устарели. Одно место и для кнопок, и для конца опроса. Сам ход здесь не сбрасывается:
 * из чтения хода это перезапустило бы то же чтение по кругу — кнопки сбрасывают его сами.
 */
const invalidateRunDependents = (
  queryClient: QueryClient,
  run: Pick<TranslationRun, 'id' | 'bookVersionId'>,
  bookId: string
) =>
  Promise.all([
    queryClient.invalidateQueries({ queryKey: translationRunKeys.report(run.id) }),
    queryClient.invalidateQueries({ queryKey: translationRunKeys.list(bookId) }),
    queryClient.invalidateQueries({ queryKey: translationRunKeys.source(run.bookVersionId) }),
  ]);

export const useTranslationRun = (id: string | null, bookId: string) => {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: translationRunKeys.detail(id ?? ''),
    queryFn: async () => {
      const before = queryClient.getQueryData<TranslationRun>(translationRunKeys.detail(id ?? ''));
      const run = await getTranslationRun(id as string);
      // Опрос кончился на этом чтении (конец, отмена, пауза — в том числе из другой вкладки):
      // языки и списки иначе остались бы «в процессе» до перезагрузки. Стоящий ход, прочитанный
      // заново, ничего не сбрасывает — сброс только на переходе.
      if (
        before !== undefined &&
        translationRunRefetchInterval(before) !== false &&
        translationRunRefetchInterval(run) === false
      ) {
        void invalidateRunDependents(queryClient, run, bookId);
      }
      return run;
    },
    enabled: id !== null,
    refetchInterval: (query) =>
      translationRunRefetchInterval(query.state.data, query.state.status === 'error'),
  });
};

/**
 * Отчёт идущего запуска меняется на каждом шаге: каждое открытие окна читает его заново, а пока
 * окно открыто у идущего запуска (`live`) — перечитывает с шагом опроса хода.
 */
export const useTranslationRunReport = (id: string | null, live = false) =>
  useQuery({
    queryKey: translationRunKeys.report(id ?? ''),
    queryFn: () => getTranslationRunReport(id as string),
    enabled: id !== null,
    staleTime: 0,
    refetchInterval: live ? COMPARE_REFETCH_MS : false,
  });

/**
 * Пауза, «продолжить» и отмена запуска и «продолжить»/«отменить» его операций досье
 * и глоссария (В5): после ответа ход, отчёт, списки и языки перечитываются — и при отказе,
 * 409 значит, что на экране устаревшее состояние.
 */
export const useTranslationRunActions = (
  run: Pick<TranslationRun, 'id' | 'bookVersionId'>,
  bookId: string
) => {
  const queryClient = useQueryClient();
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: translationRunKeys.detail(run.id) }),
      invalidateRunDependents(queryClient, run, bookId),
    ]);

  const pause = useMutation<TranslationRun, ApiError, void>({
    mutationFn: () => pauseTranslationRun(run.id),
    onSettled: refresh,
  });
  const resume = useMutation<TranslationRun, ApiError, ResumeTranslationRunRequest>({
    mutationFn: (data) => resumeTranslationRun(run.id, data),
    meta: LOCAL_CODES,
    onSettled: refresh,
  });
  const cancel = useMutation<TranslationRun, ApiError, void>({
    mutationFn: () => cancelTranslationRun(run.id),
    onSettled: refresh,
  });
  // Операция досье на `LIMIT_REACHED` выходит из паузы только с новым лимитом (карточка, «От F05-4a»).
  const resumeOperation = useMutation<LlmOperation, ApiError, { id: string; limitUsd?: string }>({
    mutationFn: ({ id, limitUsd }) => resumeLlmOperation(id, limitUsd),
    meta: LOCAL_CODES,
    onSettled: refresh,
  });
  const cancelOperation = useMutation<LlmOperation, ApiError, string>({
    mutationFn: cancelLlmOperation,
    onSettled: refresh,
  });
  return { pause, resume, cancel, resumeOperation, cancelOperation };
};

export const useStartTranslationRun = (
  versionId: string,
  bookId: string,
  options?: UseMutationOptions<TranslationRun, ApiError, StartTranslationRunRequest>
) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data) => startTranslationRun(versionId, data),
    ...options,
    meta: { ...options?.meta, ...LOCAL_CODES },
    onSuccess: (...args) => {
      const [started] = args;
      queryClient.setQueryData(translationRunKeys.detail(started.id), started);
      // Языки запуска теперь `TRANSLATION_IN_PROGRESS`, досье строится: и то и другое меняется.
      void queryClient.invalidateQueries({ queryKey: translationRunKeys.list(bookId) });
      void queryClient.invalidateQueries({ queryKey: translationRunKeys.source(versionId) });
      void queryClient.invalidateQueries({ queryKey: translationRunKeys.estimates(versionId) });
      options?.onSuccess?.(...args);
    },
  });
};
