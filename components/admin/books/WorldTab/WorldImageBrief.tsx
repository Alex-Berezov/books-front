import type { FC } from 'react';
import { useSnackbar } from 'notistack';
import { Button } from '@/components/admin/common/Button';
import { WORLD_IMAGE_ROLES } from '@/lib/admin/book-world-blocks';
import { copyPromptText } from '@/lib/admin/copy-prompt-text';
import type { BookWorldEntity } from '@/types/api-schema';
import styles from './WorldTab.module.scss';

export const BRIEF_NO_APPEARANCE = 'No Appearance - brief is not written';
export const BRIEF_NOT_WRITTEN = 'Brief not written yet - rerun the page or import JSON';
export const BRIEF_STALE =
  'Brief does not match the current Appearance - regenerate the brief or import JSON';

// ТЗ места (F08-12b, решение `F08 | F08-12b` Q2): основа — «Описание», а не «Внешность».
export const BRIEF_NO_DESCRIPTION = 'No Description - brief is not written';
export const BRIEF_NOT_WRITTEN_PLACE =
  'Brief not written yet - rerun the place step or import JSON';
export const BRIEF_STALE_PLACE =
  'Brief does not match the current Description - regenerate the brief or import JSON';

export type ImageBriefState = { brief: string; stale: boolean } | { reason: string } | null;

type BriefBasis = 'appearance' | 'description';

/**
 * Основа ТЗ по типу сущности: у места — «Описание», у героя — «Внешность». Копия правила
 * `briefBasisBlock` бэкенда (books/src/modules/book-world/book-world-data.ts) — change both together.
 */
const briefBasisBlock = (type: BookWorldEntity['type']): BriefBasis =>
  type === 'place' ? 'description' : 'appearance';

/** Тексты раздела ТЗ по основе (`briefBasisBlock`). */
const BRIEF_TEXTS: Readonly<
  Record<BriefBasis, { noBasis: string; notWritten: string; stale: string }>
> = {
  appearance: { noBasis: BRIEF_NO_APPEARANCE, notWritten: BRIEF_NOT_WRITTEN, stale: BRIEF_STALE },
  description: {
    noBasis: BRIEF_NO_DESCRIPTION,
    notWritten: BRIEF_NOT_WRITTEN_PLACE,
    stale: BRIEF_STALE_PLACE,
  },
};

/**
 * Что показать о ТЗ на иллюстрацию (решения `F08 | F08-11d-2`): только по данным открытой версии,
 * принятая картинка не влияет. Не герой `main`/`secondary` — раздела нет (`null`); нет «Внешности» —
 * причина; есть «Внешность», нет ТЗ — подсказка; есть ТЗ — текст, устаревшее — с пометкой. У места
 * (F08-12b, `F08 | F08-12b` Q2) — у любого, без роли, по «Описанию»: сервер считает устаревание по нему.
 */
export const imageBriefState = (
  entity: Pick<BookWorldEntity, 'type' | 'role' | 'appearance' | 'description' | 'editor'>
): ImageBriefState => {
  if (
    entity.type !== 'place' &&
    (entity.type !== 'character' || !entity.role || !WORLD_IMAGE_ROLES.includes(entity.role))
  ) {
    return null;
  }
  const basisBlock = briefBasisBlock(entity.type);
  const texts = BRIEF_TEXTS[basisBlock];
  if (!entity[basisBlock]?.trim()) return { reason: texts.noBasis };
  const brief = entity.editor?.imageBrief?.trim();
  if (!brief) return { reason: texts.notWritten };
  return { brief, stale: entity.editor?.imageBriefStale === true };
};

/**
 * ТЗ на иллюстрацию героя во вкладке World (F08-11d-2, решение владельца D8): картинку редакция
 * делает вручную по этому тексту. Только показ и копирование — правка через импорт JSON или ход
 * «Write World» (решение `F08 | F08-11d-2`); видят все, кто открывает вкладку. ТЗ, написанное
 * не по текущей «Внешности», не копируется: по нему заказали бы чужой облик.
 */
export const WorldImageBrief: FC<{ entity: BookWorldEntity }> = ({ entity }) => {
  const { enqueueSnackbar } = useSnackbar();
  const state = imageBriefState(entity);
  if (!state) return null;

  return (
    <section className={styles.briefPanel} aria-label="Illustration brief">
      <h4 className={styles.sectionTitle}>Illustration brief</h4>
      {'brief' in state ? (
        <>
          <p className={styles.briefText}>{state.brief}</p>
          {state.stale ? (
            <p className={styles.error}>{BRIEF_TEXTS[briefBasisBlock(entity.type)].stale}</p>
          ) : (
            <div className={styles.actions}>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() =>
                  copyPromptText(
                    state.brief,
                    () => enqueueSnackbar('Brief copied', { variant: 'success' }),
                    () => enqueueSnackbar('Could not copy to clipboard', { variant: 'error' })
                  )
                }
              >
                Copy brief
              </Button>
            </div>
          )}
        </>
      ) : (
        <p className={styles.hint}>{state.reason}</p>
      )}
    </section>
  );
};
