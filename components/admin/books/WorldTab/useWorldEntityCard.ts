import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';
import {
  useBookWorld,
  useBookWorldEntity,
  useDeleteBookWorldEntity,
  useSaveBookWorldEntity,
} from '@/api/hooks';
import { formFromWorldEntity, type WorldEntityFormValues } from '@/lib/admin/book-world-form-state';
import { isRecordChanged } from '@/lib/admin/expected-row';
import { isDataRejected, isServerFailure } from '@/lib/admin/request-errors';
import type { WorldEntityCheck, WorldImportPreviewOk } from './WorldTab.types';
import type {
  JsonImportPreview,
  JsonImportResult,
} from '@/components/admin/common/JsonImportPreviewModal';
import type { BookWorldIssue } from '@/lib/admin/book-world-blocks';
import type { BookWorldEntityImport } from '@/lib/admin/book-world-validation';
import type { BookWorldValidation } from '@/lib/admin/load-book-world-validation';
import type { BookWorldEntitySummary, ExpectedRow, SupportedLang } from '@/types/api-schema';
import { useWorldRecountNotice } from './useWorldRecountNotice';
import {
  isWorldPublished,
  WORLD_KEY_TAKEN,
  worldDeleteErrorText,
  worldErrorText,
} from './worldErrors';

export interface WorldEntityCardOptions {
  versionId: string;
  language: SupportedLang;
  /** Ключ сущности; `null` — новая (ключ вводится и после записи не меняется). */
  entityKey: string | null;
  validation: BookWorldValidation | null;
  /** Итог записи, если карточку открыли сразу после создания сущности. */
  initialCheck?: WorldEntityCheck | null;
  onClose: () => void;
  onCreated: (key: string, check: WorldEntityCheck | null) => void;
}

const KEY_RULE = 'lowercase latin letters, digits and «-», 1–60';

/**
 * Логика карточки героя (F08-1): заполнение формы один раз свежим ответом, запись всей сущности
 * со сверкой (`expectedUpdatedAt` — что показала карточка; новая — `expectedAbsent`), удаление,
 * импорт JSON одной сущности (`product.md` §17 п.4).
 */
export const useWorldEntityCard = (options: WorldEntityCardOptions) => {
  const { versionId, language, entityKey, validation, onClose, onCreated } = options;
  const { enqueueSnackbar } = useSnackbar();
  const isNew = entityKey === null;
  const entityQuery = useBookWorldEntity(versionId, entityKey);
  const worldQuery = useBookWorld(versionId);
  const saveMutation = useSaveBookWorldEntity();
  const deleteMutation = useDeleteBookWorldEntity();
  // Своя проба и своя запись импорта: их ожидание не должно выглядеть сохранением формы.
  const { mutateAsync: probeEntity } = useSaveBookWorldEntity();
  const { mutateAsync: writeEntity } = useSaveBookWorldEntity();

  const [form, setForm] = useState<WorldEntityFormValues>(() => formFromWorldEntity(null));
  const [issues, setIssues] = useState<BookWorldIssue[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const [reloadError, setReloadError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<WorldEntityCheck | null>(options.initialCheck ?? null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Форма заполняется с сервера один раз и только свежим ответом: запись уходит целиком, и
  // устаревший кэш вернул бы поля, сохранённые другим редактором.
  const [hydrated, setHydrated] = useState(isNew);
  // С чем форма сверена: на запись уходит `updatedAt` той сущности, которую форма показала.
  const base = useRef<string | null>(null);
  const entity = entityQuery.data?.entity ?? null;
  const recount = useWorldRecountNotice(
    versionId,
    entity,
    () => entityQuery.refetch(),
    options.initialCheck?.recountQueued === true
  );
  useEffect(() => {
    if (hydrated || !entityQuery.isSuccess || entityQuery.fetchStatus !== 'idle') return;
    base.current = entityQuery.data.entity.updatedAt;
    setForm(formFromWorldEntity(entityQuery.data.entity));
    setHydrated(true);
  }, [hydrated, entityQuery.isSuccess, entityQuery.fetchStatus, entityQuery.data]);

  /** Перечитать сущность в форму; отказ показывается, отметка «изменена» остаётся. */
  const reload = async () => {
    if (isNew) return;
    setReloadError(null);
    const res = await entityQuery.refetch();
    if (res.isError || !res.data) {
      setReloadError(worldErrorText(res.error));
      return;
    }
    base.current = res.data.entity.updatedAt;
    setForm(formFromWorldEntity(res.data.entity));
    setHydrated(true);
    setStale(false);
    setIssues([]);
    setServerError(null);
  };

  const handleSave = () => {
    if (!validation) {
      enqueueSnackbar('Validation is not loaded yet', { variant: 'warning' });
      return;
    }
    setServerError(null);
    const key = entityKey ?? form.key.trim();
    if (!validation.checkBookWorldKey(key)) {
      setIssues([{ path: 'key', message: KEY_RULE }]);
      return;
    }
    const built = validation.worldEntityRequestFromForm(
      form,
      language,
      entity?.type ?? 'character'
    );
    setIssues(built.errors);
    if (!built.data) return;
    saveMutation.mutate(
      {
        versionId,
        key,
        data: built.data,
        expected: isNew ? { expectedAbsent: 'true' } : { expectedUpdatedAt: base.current ?? '' },
      },
      {
        onSuccess: (res) => {
          if (res.entity) base.current = res.entity.updatedAt;
          recount.onSaved(res.recountQueued);
          const check = {
            hasCore: res.hasCore,
            warnings: res.warnings,
            recountQueued: res.recountQueued,
          };
          setLastCheck(check);
          enqueueSnackbar('Entity saved', { variant: 'success' });
          if (isNew) onCreated(key, check);
        },
        onError: (error) => {
          if (isServerFailure(error)) return;
          if (isRecordChanged(error)) {
            // У новой сущности 409 сверки «записи нет» — ключ уже занят, а не чужая правка.
            if (isNew) setIssues([{ path: 'key', message: WORLD_KEY_TAKEN }]);
            else setStale(true);
            return;
          }
          setServerError(worldErrorText(error));
        },
      }
    );
  };

  const handleDelete = (onDone: () => void) => {
    if (entityKey === null) return;
    setDeleteError(null);
    deleteMutation.mutate(
      { versionId, key: entityKey },
      {
        onSuccess: () => {
          onDone();
          enqueueSnackbar(`Entity «${entityKey}» deleted`, { variant: 'success' });
          onClose();
        },
        onError: (error) => setDeleteError(worldDeleteErrorText(error)),
      }
    );
  };

  const analyzeImport = useMemo(
    () =>
      validation
        ? (jsonText: string) =>
            validation.analyzeBookWorldEntityImport(jsonText, language, entityKey)
        : null,
    [validation, language, entityKey]
  );

  const worldEntities = worldQuery.data?.entities;
  const previewImport = useCallback(
    async (data: BookWorldEntityImport): Promise<JsonImportPreview<WorldImportPreviewOk>> => {
      try {
        const res = await probeEntity({ versionId, key: data.key, data: data.body, dryRun: true });
        const created = isNew && !worldEntities?.some((e) => e.key === data.key);
        return {
          state: 'ok',
          entities: [{ key: data.key, created, hasCore: res.hasCore, warnings: res.warnings }],
        };
      } catch (error) {
        const message = worldErrorText(error);
        return isDataRejected(error)
          ? { state: 'rejected', message }
          : { state: 'failed', message };
      }
    },
    [probeEntity, versionId, isNew, worldEntities]
  );

  /**
   * Запись импорта: сверка по этой сущности — `updatedAt`, который показала карточка, у новой
   * карточки — строка списка с тем же ключом, а нет её — `expectedAbsent`.
   */
  const applyImport = async (data: BookWorldEntityImport): Promise<JsonImportResult> => {
    let expected: ExpectedRow;
    let row: BookWorldEntitySummary | undefined;
    if (!isNew) {
      expected = { expectedUpdatedAt: base.current ?? '' };
    } else if (worldEntities) {
      row = worldEntities.find((e) => e.key === data.key);
      expected = row ? { expectedUpdatedAt: row.updatedAt } : { expectedAbsent: 'true' };
    } else {
      return { ok: false, message: 'The world list is not loaded yet.' };
    }
    let check: WorldEntityCheck;
    try {
      const res = await writeEntity({ versionId, key: data.key, data: data.body, expected });
      check = { hasCore: res.hasCore, warnings: res.warnings, recountQueued: res.recountQueued };
    } catch (error) {
      if (isRecordChanged(error)) {
        const message =
          isNew && !row
            ? `key: ${WORLD_KEY_TAKEN}`
            : 'The entity was changed on the server since it was shown: reload it and import again.';
        return { ok: false, message };
      }
      return { ok: false, message: worldErrorText(error) };
    }
    enqueueSnackbar(`Entity «${data.key}» imported`, { variant: 'success' });
    setLastCheck(check);
    recount.onSaved(check.recountQueued === true);
    if (isNew) onCreated(data.key, check);
    else void reload();
    return { ok: true };
  };

  /** Была ли на сайте сущность с этим ключом: у сохранённой — она сама, у новой — строка списка. */
  const isPublished = (key: string) =>
    isWorldPublished(isNew ? worldEntities?.find((e) => e.key === key) : entity);

  return {
    isNew,
    entity,
    /** Номера глав версии; `null` — карточка ещё не загружена или сущность новая. */
    chapterNumbers: entityQuery.data?.chapterNumbers ?? null,
    isPublished,
    hydrated,
    loadError: entityQuery.error,
    form,
    setForm,
    issues,
    serverError,
    stale,
    reloadError,
    lastCheck,
    deleteError,
    resetDeleteError: () => setDeleteError(null),
    reload: () => void reload(),
    /** У версии стоит пересчёт присутствия (решения арбитра S5, S6). */
    recountNotice: recount.notice,
    reloadPresence: () => void recount.reload(),
    presenceReloadError: recount.reloadError,
    handleSave,
    isSaving: saveMutation.isPending,
    handleDelete,
    isDeleting: deleteMutation.isPending,
    analyzeImport,
    previewImport,
    applyImport,
  };
};
