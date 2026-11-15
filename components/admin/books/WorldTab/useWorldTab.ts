import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  useBookAnalysis,
  useBookWorld,
  useMarkBookWorldEntityRead,
  useSaveBookWorld,
  useSetBookWorldEntityFlags,
} from '@/api/hooks';
import {
  buildWorldPromptInputsText,
  promptDossierFromStatus,
} from '@/lib/admin/book-world-prompt-inputs';
import { copyPromptText } from '@/lib/admin/copy-prompt-text';
import { isRecordChanged } from '@/lib/admin/expected-row';
import {
  loadBookWorldValidation,
  type BookWorldValidation,
} from '@/lib/admin/load-book-world-validation';
import { errorCode, isDataRejected, isServerFailure } from '@/lib/admin/request-errors';
import { usePromptInputsSource } from '@/lib/hooks/usePromptInputsSource';
import type { WorldEntityCheck, WorldImportPreviewOk, WorldTabProps } from './WorldTab.types';
import type {
  JsonImportPreview,
  JsonImportResult,
} from '@/components/admin/common/JsonImportPreviewModal';
import type {
  BookWorldEntitySummary,
  BookWorldListResponse,
  BookWorldExpected,
  SaveBookWorldRequest,
  SetBookWorldFlagsRequest,
} from '@/types/api-schema';
import { worldErrorText, worldReadErrorText } from './worldErrors';

/**
 * Что вкладка видела у всей версии (решение арбитра `F08 | F08-1` R6, 15.11.2026): сущностей
 * нет — `expectedAbsent`; есть — самый свежий `updatedAt` и их число (удалённую сущность
 * `updatedAt` не выдаёт, число — выдаёт). Список не загружен — `undefined`.
 */
export const worldExpectedRow = (
  list: BookWorldListResponse | undefined
): BookWorldExpected | undefined => {
  if (!list) return undefined;
  if (list.entities.length === 0) return { expectedAbsent: 'true' };
  const newest = list.entities.reduce((max, e) =>
    Date.parse(e.updatedAt) > Date.parse(max.updatedAt) ? e : max
  );
  return { expectedUpdatedAt: newest.updatedAt, expectedCount: list.entities.length };
};

/** Открытая карточка: ключ сущности, `null` — новая; закрыта — `undefined`. */
export type WorldSelection = string | null | undefined;

export const useWorldTab = (props: Omit<WorldTabProps, 'isEditor'>) => {
  const { versionId, version, isAdmin = false } = props;
  const { enqueueSnackbar } = useSnackbar();

  const worldQuery = useBookWorld(versionId);
  const analysisQuery = useBookAnalysis(versionId);
  // Главы и досье «Вводных» — общий источник вкладок Analysis и World.
  const promptSource = usePromptInputsSource(versionId, version.language, isAdmin);

  const { mutateAsync: writeWorld } = useSaveBookWorld();
  // Своя мутация для пробы: её ожидание не должно выглядеть записью.
  const { mutateAsync: runImportPreview } = useSaveBookWorld();
  const { mutateAsync: markRead } = useMarkBookWorldEntityRead();
  const { mutateAsync: setFlags } = useSetBookWorldEntityFlags();

  const [validation, setValidation] = useState<BookWorldValidation | null>(null);
  const [validationFailed, setValidationFailed] = useState(false);
  const [selected, setSelected] = useState<WorldSelection>(undefined);
  /** Отказ отметки или флага — строкой над списком, а не потерянным тостом. */
  const [actionError, setActionError] = useState<string | null>(null);
  /** Сущности, у которых отметка или флаг в пути: их переключатели и кнопка стоят. */
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  /** Итог записи новой сущности: карточка открывается заново по ключу и его не теряет. */
  const [createdCheck, setCreatedCheck] = useState<{ key: string; check: WorldEntityCheck } | null>(
    null
  );

  const loadValidation = useCallback(() => {
    setValidationFailed(false);
    loadBookWorldValidation().then(setValidation, () => setValidationFailed(true));
  }, []);
  useEffect(loadValidation, [loadValidation]);

  const runMark = async (
    key: string,
    request: () => Promise<BookWorldEntitySummary>,
    onError: (error: unknown) => void
  ): Promise<BookWorldEntitySummary | null> => {
    setActionError(null);
    setPending((prev) => new Set(prev).add(key));
    try {
      // В кэш ложится только ответ последней отметки — это держит хук (`latestMark`).
      return await request();
    } catch (error) {
      if (!isServerFailure(error)) onError(error);
      return null;
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  const handleMarkRead = async (entity: BookWorldEntitySummary) => {
    const editor = entity.editor;
    if (!editor) return;
    const row = await runMark(
      entity.key,
      // Отметка того текста модели, который вкладка показала.
      () => markRead({ versionId, key: entity.key, autoTextAt: editor.autoTextAt }),
      (error) => {
        setActionError(`${entity.key}: ${worldReadErrorText(error)}`);
        if (errorCode(error) === 'WORLD_TEXT_CHANGED') void worldQuery.refetch();
      }
    );
    if (row) enqueueSnackbar(`«${entity.name}» marked as read`, { variant: 'success' });
  };

  const handleFlags = (entity: BookWorldEntitySummary, flags: SetBookWorldFlagsRequest) =>
    void runMark(
      entity.key,
      () => setFlags({ versionId, key: entity.key, flags }),
      (error) =>
        setActionError(`${entity.key}: could not change the flag: ${worldErrorText(error)}`)
    );

  const analyzeImport = useMemo(
    () =>
      validation
        ? (text: string) => validation.analyzeBookWorldImport(text, version.language)
        : null,
    [validation, version.language]
  );

  /** Пробная запись (`dryRun`): ссылки, главы, дословность цитат и ядро — до записи. */
  const previewImport = useCallback(
    async (data: SaveBookWorldRequest): Promise<JsonImportPreview<WorldImportPreviewOk>> => {
      try {
        const res = await runImportPreview({ versionId, data, dryRun: true });
        return { state: 'ok', entities: res.entities };
      } catch (error) {
        const message = worldErrorText(error);
        return isDataRejected(error)
          ? { state: 'rejected', message }
          : { state: 'failed', message };
      }
    },
    [runImportPreview, versionId]
  );

  const worldData = worldQuery.data;
  const refetchWorld = worldQuery.refetch;
  /** Запись импорта: слияние делает сервер, сверка — по тому, что видела вкладка (R6). */
  const applyImport = useCallback(
    async (data: SaveBookWorldRequest): Promise<JsonImportResult> => {
      const expected = worldExpectedRow(worldData);
      if (!expected) return { ok: false, message: 'The world list is not loaded yet.' };
      try {
        const res = await writeWorld({ versionId, data, expected });
        const created = res.entities.filter((e) => e.created).length;
        enqueueSnackbar(
          `World imported: ${created} created, ${res.entities.length - created} updated`,
          { variant: 'success' }
        );
        return { ok: true };
      } catch (error) {
        if (isRecordChanged(error)) {
          void refetchWorld();
          return {
            ok: false,
            message:
              'The world was changed on the server since the list was loaded: the list is reloaded, check it and import again.',
          };
        }
        return { ok: false, message: worldErrorText(error) };
      }
    },
    [worldData, writeWorld, versionId, enqueueSnackbar, refetchWorld]
  );

  const copyPromptInputs = () => {
    const source = promptSource.prepare('The dossier is not loaded yet');
    if (source.state !== 'ready') {
      enqueueSnackbar(source.message, { variant: source.state === 'error' ? 'error' : 'warning' });
      return;
    }
    if (analysisQuery.isPending) {
      enqueueSnackbar('The analysis is not loaded yet', { variant: 'warning' });
      return;
    }
    // Анализ или досье не загрузились — копия без них, и редактор об этом знает. Ошибка фонового
    // перечитывания при уже загруженном анализе — не отказ: данные те же. Досье — только у
    // `admin`: у прочих его нет, и это тоже сказано.
    const analysisFailed = analysisQuery.isError && analysisQuery.data === undefined;
    const without = [
      analysisFailed ? 'could not load the analysis heroes' : null,
      isAdmin ? source.withoutDossier : 'the dossier (admin only)',
    ].filter((w): w is string => w !== null);
    const dossier = isAdmin
      ? promptDossierFromStatus(source.dossier, source.dossierLanguage)
      : null;
    const text = buildWorldPromptInputsText(
      version,
      source.chapters,
      source.chaptersTotal,
      // Не загрузился — раздела нет вовсе (как у досье); анализа нет (`null`) — «нет».
      analysisFailed ? undefined : (analysisQuery.data?.characters ?? null),
      dossier
    );
    copyPromptText(
      text,
      () =>
        without.length === 0
          ? enqueueSnackbar('Prompt inputs copied', { variant: 'success' })
          : enqueueSnackbar(`Prompt inputs copied without: ${without.join('; ')}`, {
              variant: 'warning',
            }),
      () => enqueueSnackbar('Could not copy to clipboard', { variant: 'error' })
    );
  };

  return {
    world: worldQuery.data,
    isLoading: worldQuery.isPending,
    loadError: worldQuery.data ? null : worldQuery.error,
    retryLoad: () => void worldQuery.refetch(),
    validation,
    validationFailed,
    retryValidation: loadValidation,
    selected,
    /** Открыть или закрыть карточку; итог прошлого создания к ней не относится. */
    select: (selection: WorldSelection) => {
      setCreatedCheck(null);
      setSelected(selection);
    },
    actionError,
    handleMarkRead: (entity: BookWorldEntitySummary) => void handleMarkRead(entity),
    pending,
    handleFlags,
    createdCheck,
    /** Новая сущность записана: карточка открывается по её ключу с итогом записи. */
    openCreated: (key: string, check: WorldEntityCheck | null) => {
      setCreatedCheck(check ? { key, check } : null);
      setSelected(key);
    },
    analyzeImport,
    previewImport,
    applyImport,
    copyPromptInputs,
  };
};
