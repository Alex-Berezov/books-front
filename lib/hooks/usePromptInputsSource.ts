import { useBookVersion, useChapterTitles, useVersionDossier } from '@/api/hooks';
import type { ChapterTitle, DossierStatus } from '@/types/api-schema';

/**
 * Источники «Вводных для промпта» вкладок Analysis (F03-1) и World (F08-1): главы версии и
 * досье. Досье — только у `admin` (решение арбитра `F07 | F07-3`): ручка закрыта остальным.
 * Досье переведённой версии — досье её исходника, и язык досье — язык той версии.
 */

export type PromptInputsSource =
  | { state: 'error'; message: string }
  | { state: 'wait'; message: string }
  | {
      state: 'ready';
      chapters: readonly ChapterTitle[];
      chaptersTotal: number;
      /** Досье для «Вводных»; `undefined` — без досье (не `admin` или см. `withoutDossier`). */
      dossier: DossierStatus | undefined;
      /** Язык досье; `undefined` — неизвестен. */
      dossierLanguage: string | undefined;
      /** Почему копия идёт без досье, о котором редактор должен знать; `null` — не идёт. */
      withoutDossier: string | null;
    };

export const usePromptInputsSource = (
  versionId: string,
  versionLanguage: string,
  isAdmin: boolean
) => {
  const chaptersQuery = useChapterTitles(versionId);
  const dossierQuery = useVersionDossier(versionId, isAdmin);
  const dossierSource = dossierQuery.data?.sourceVersionId ?? null;
  const foreignDossier = dossierSource !== null && dossierSource !== versionId;
  const dossierSourceQuery = useBookVersion(dossierSource ?? '', {
    enabled: isAdmin && foreignDossier,
  });

  /**
   * Что копировать сейчас. Главы или досье ещё грузятся — копировать рано (`wait`, текст —
   * `dossierWaitMessage` для досье); досье не загрузилось или устарело — копия без него, и
   * редактор об этом знает. Досье не готово (нет, строится, упало) — без него молча. Ошибка
   * фонового перечитывания при уже загруженных данных — не отказ: данные те же.
   */
  const prepare = (dossierWaitMessage: string): PromptInputsSource => {
    if (chaptersQuery.error) {
      return { state: 'error', message: `Could not load chapters: ${chaptersQuery.error.message}` };
    }
    if (!chaptersQuery.data) return { state: 'wait', message: 'Chapters are not loaded yet' };
    let withoutDossier: string | null = null;
    if (isAdmin) {
      const dossier = dossierQuery.data;
      const dossierReady = dossier?.status === 'ready';
      if (!dossier) {
        if (!dossierQuery.isError) return { state: 'wait', message: dossierWaitMessage };
        withoutDossier = 'could not load the dossier';
      } else if (dossierReady && dossier.fresh === false) {
        withoutDossier = 'the dossier is outdated';
      } else if (dossierReady && foreignDossier && !dossierSourceQuery.data) {
        if (!dossierSourceQuery.isError) return { state: 'wait', message: dossierWaitMessage };
        withoutDossier = 'could not load the language of the dossier';
      }
    }
    return {
      state: 'ready',
      chapters: chaptersQuery.data.items,
      chaptersTotal: chaptersQuery.data.pagination.total,
      dossier: withoutDossier === null ? dossierQuery.data : undefined,
      dossierLanguage: foreignDossier ? dossierSourceQuery.data?.language : versionLanguage,
      withoutDossier,
    };
  };

  return { prepare };
};
