import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { summaryKeys, useBookSummarySectionMutations, useBookSummarySections } from '@/api/hooks';
import { htmlToPlainText } from '@/lib/utils/html-text';
import { ApiError } from '@/types/api';
import type {
  BookSummarySectionListItem,
  BookSummarySectionWarning,
  CreateBookSummarySectionRequest,
} from '@/types/api-schema';

/** Отказ устаревшей вкладке: раздел или порядок успел поменять другой редактор (409), раздела нет (404). */
export const STALE_TAB_MESSAGE = 'Changed by another editor. Reload the tab.';

/** Пределы раздела — те же, что у сервера (`books` `SUMMARY_SECTION_LIMITS`). */
export const SECTION_TITLE_MAX_LENGTH = 200;
export const SECTION_READER_CHAPTER_MAX = 10_000;

/** Черновик карточки раздела. */
export interface SectionDraft {
  title: string;
  text: string;
  readerChapter: string;
}

/** Действие, ждущее подтверждения (`product.md` §7 п.4). */
export type PendingSectionAction = (
  | { kind: 'delete'; sectionId: string; number: number; isLast: boolean }
  | { kind: 'move'; sectionId: string; direction: -1 | 1 }
) & {
  /** Порядок разделов, который видел редактор, когда просил действие: он и уходит в `from`. */
  from: string[];
};

/** Тексты подтверждений — решение арбитра `F04 | F04-1`, п.5. */
export function confirmMessage(action: PendingSectionAction): string {
  if (action.kind === 'move') {
    return 'Move section? Sections will be renumbered and their addresses will change: old search links will open other sections.';
  }
  return action.isLast
    ? `Delete section ${action.number}? Its address will stop working.`
    : `Delete section ${action.number}? Following sections will be renumbered and their addresses will change: old search links will open other sections, the last address will stop working.`;
}

/** Проверка черновика тем же правилом, что у сервера; ошибка — текстом у карточки. */
export function validateSectionDraft(
  draft: SectionDraft
):
  | { error: string }
  | { data: CreateBookSummarySectionRequest & { readerChapter: number | null } } {
  const title = draft.title.trim();
  if (!title) return { error: 'Title is required' };
  if (title.length > SECTION_TITLE_MAX_LENGTH) {
    return { error: `Title must be at most ${SECTION_TITLE_MAX_LENGTH} characters` };
  }
  if (/[<>]/.test(title)) return { error: 'Title must be plain text without tags' };
  if (!htmlToPlainText(draft.text.trim())) return { error: 'Section text is required' };
  const raw = draft.readerChapter.trim();
  let readerChapter: number | null = null;
  if (raw) {
    readerChapter = Number(raw);
    if (
      !Number.isInteger(readerChapter) ||
      readerChapter < 1 ||
      readerChapter > SECTION_READER_CHAPTER_MAX
    ) {
      return {
        error: `Reader chapter must be a whole number from 1 to ${SECTION_READER_CHAPTER_MAX}`,
      };
    }
  }
  return { data: { title, text: draft.text.trim(), readerChapter } };
}

/**
 * Устаревшая вкладка — 409 и 404 только у действий над разделом по `id` (правка, удаление,
 * перестановка): там 404 значит «раздел удалил другой редактор». У добавления 404 — нет версии
 * или ручки, и просьба обновить вкладку ввела бы в заблуждение.
 */
export const isStaleSectionError = (error: unknown) =>
  error instanceof ApiError && (error.statusCode === 409 || error.statusCode === 404);

/** 5xx показывает общий тост `MutationCache` (`providers/AppProviders.tsx`); свой — второй раз. */
const isServerFailure = (error: unknown) => error instanceof ApiError && error.statusCode >= 500;

const errorText = (error: unknown, fallback: string) =>
  error instanceof Error && error.message ? error.message : fallback;

/**
 * Разделы пересказа во вкладке Summary (F04-1, `tech.md` §5). Раздел адресуется только `id`;
 * удаление и перестановка несут `from` — порядок, который видит вкладка, и уходят только после
 * подтверждения; новый порядок приходит в ответе и становится следующим `from`. На отказ
 * устаревшей вкладке список перечитывается, а закэшированный текст раздела выбрасывается: иначе
 * каждая следующая попытка уходила бы с тем же устаревшим `from` или `expectedUpdatedAt`.
 */
export const useSummarySections = (versionId: string) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useBookSummarySections(versionId);
  const { create, update, remove, reorder } = useBookSummarySectionMutations(versionId);
  const [pending, setPending] = useState<PendingSectionAction | null>(null);
  const [warnings, setWarnings] = useState<Record<string, BookSummarySectionWarning[]>>({});
  const [addWarnings, setAddWarnings] = useState<BookSummarySectionWarning[]>([]);

  const sections: BookSummarySectionListItem[] = data?.sections ?? [];
  const order = () => sections.map((s) => s.id);

  const refreshAfterStale = (sectionId?: string) => {
    void queryClient.invalidateQueries({ queryKey: summaryKeys.sections(versionId) });
    if (sectionId) queryClient.removeQueries({ queryKey: summaryKeys.section(sectionId) });
  };

  /**
   * Отказ действия над разделом по `id`; `true` — вкладка устарела. `keepCard` — 404 у сохранения:
   * список не перечитывается, иначе карточка удалённого раздела исчезла бы вместе с набранным текстом.
   */
  const failSectionAction = (
    error: unknown,
    fallback: string,
    sectionId?: string,
    keepCard = false
  ): boolean => {
    if (isStaleSectionError(error)) {
      const deleted = error instanceof ApiError && error.statusCode === 404;
      if (!(keepCard && deleted)) refreshAfterStale(sectionId);
      enqueueSnackbar(STALE_TAB_MESSAGE, { variant: 'error' });
      return true;
    }
    if (!isServerFailure(error)) enqueueSnackbar(errorText(error, fallback), { variant: 'error' });
    return false;
  };

  /** Добавление в конец; `true` — сохранено (форма добавления очищается). */
  const addSection = async (draft: SectionDraft): Promise<string | true> => {
    const checked = validateSectionDraft(draft);
    if ('error' in checked) return checked.error;
    try {
      const res = await create.mutateAsync(checked.data);
      setWarnings((prev) => ({ ...prev, [res.section.id]: res.warnings }));
      // Новая карточка свёрнута: предупреждение показывается и у формы добавления, и в тосте.
      setAddWarnings(res.warnings);
      if (res.warnings.length > 0) {
        enqueueSnackbar(
          `Section ${res.section.number} added. ${res.warnings.map((w) => w.message).join(' ')}`,
          { variant: 'warning' }
        );
      } else {
        enqueueSnackbar(`Section ${res.section.number} added`, { variant: 'success' });
      }
      return true;
    } catch (error) {
      // Ошибка показывается у формы добавления; 5xx — ещё и общим тостом `MutationCache`.
      return errorText(error, 'Failed to add the section');
    }
  };

  /**
   * Правка раздела по `id`; `expectedUpdatedAt` — дата, которую видела карточка. Ответ — новая дата
   * для следующего сохранения (или ошибка у карточки; `stale` — карточке нужно перечитать раздел).
   */
  const saveSection = async (
    sectionId: string,
    draft: SectionDraft,
    expectedUpdatedAt: string
  ): Promise<{ updatedAt: string } | { error: string; stale?: boolean }> => {
    const checked = validateSectionDraft(draft);
    if ('error' in checked) return checked;
    try {
      const res = await update.mutateAsync({
        sectionId,
        data: { ...checked.data, expectedUpdatedAt },
      });
      setWarnings((prev) => ({ ...prev, [sectionId]: res.warnings }));
      enqueueSnackbar(`Section ${res.section.number} saved`, {
        variant: res.warnings.length > 0 ? 'warning' : 'success',
      });
      return { updatedAt: res.section.updatedAt };
    } catch (error) {
      if (failSectionAction(error, 'Failed to save the section', sectionId, true)) {
        return { error: STALE_TAB_MESSAGE, stale: true };
      }
      return { error: errorText(error, 'Not saved') };
    }
  };

  const requestDelete = (sectionId: string) => {
    const index = sections.findIndex((s) => s.id === sectionId);
    if (index < 0) return;
    setPending({
      kind: 'delete',
      sectionId,
      number: sections[index].number,
      isLast: index === sections.length - 1,
      from: order(),
    });
  };

  const requestMove = (sectionId: string, direction: -1 | 1) => {
    const index = sections.findIndex((s) => s.id === sectionId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= sections.length) return;
    setPending({ kind: 'move', sectionId, direction, from: order() });
  };

  /**
   * Подтверждённое действие уходит с `from` — порядком, который редактор видел, когда просил его
   * (на нём построен текст подтверждения). Список успел смениться — сервер ответит 409, и вкладка
   * попросит обновиться: номера меняются только так, как редактор подтвердил (`product.md` §7 п.4).
   */
  const confirmPending = async () => {
    const action = pending;
    if (!action) return;
    setPending(null);
    const { from } = action;
    const index = from.indexOf(action.sectionId);
    const target = action.kind === 'move' ? index + action.direction : index;
    try {
      if (action.kind === 'delete') {
        await remove.mutateAsync({ sectionId: action.sectionId, from });
        enqueueSnackbar('Section deleted', { variant: 'success' });
        return;
      }
      const to = [...from];
      [to[index], to[target]] = [to[target], to[index]];
      await reorder.mutateAsync({ from, to });
    } catch (error) {
      failSectionAction(
        error,
        action.kind === 'delete' ? 'Failed to delete the section' : 'Failed to move the section',
        action.sectionId
      );
    }
  };

  return {
    sections,
    isLoading,
    loadError: isError ? errorText(error, 'Failed to load the sections') : null,
    warnings,
    addWarnings,
    clearAddWarnings: () => setAddWarnings([]),
    pending,
    pendingMessage: pending ? confirmMessage(pending) : '',
    cancelPending: () => setPending(null),
    confirmPending,
    requestDelete,
    requestMove,
    addSection,
    saveSection,
    isAdding: create.isPending,
    // Пока идут удаление или перестановка, добавление ждёт: его ответ и ответ порядка легли бы в
    // список вперемешку, а `from` следующего действия разошёлся бы с сервером.
    isReordering: remove.isPending || reorder.isPending,
    // Пока идёт добавление, порядок тоже меняется: удаление и перестановка ушли бы без нового раздела.
    isChangingOrder: create.isPending || remove.isPending || reorder.isPending,
  };
};
