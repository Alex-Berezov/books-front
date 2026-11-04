'use client';

import type { FC } from 'react';
import { CONTENT_DRAFT_LOCAL_CODES } from '@/api/hooks';
import { OperationProgress, type ResumeAction } from '@/components/admin/books/ContentDraft';
import { refusalCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { operationPauseText } from '@/components/admin/translation-run/translationRun.utils';
import { isHandledLocally } from '@/lib/api/local-error-codes';
import { ApiError } from '@/types/api';
import type { SupportedLang } from '@/lib/i18n/lang';
import type { SummaryWriteItem } from '@/types/api-schema';
import styles from './SummaryWrite.module.scss';
import { refusalText } from './summaryWrite.utils';

export interface ItemResumeProps {
  /** Операция перегенерации текста (`regenOperationId`), стоящая на паузе. */
  operationId: string;
  pauseReason: SummaryWriteItem['regenPauseReason'];
  lang: SupportedLang;
  /** Действия текста закрыты: идёт «Accept all» или ход не перечитывается. */
  disabled: boolean;
  resume: ResumeAction & { variables?: { id: string; limitUsd?: string } };
}

/** Отказ «Continue» перегенерации словами; 5xx показывает общий тост `MutationCache`. */
const resumeRefusalText = (error: unknown): string =>
  refusalCode(error) === 'LLM_OPERATION_NOT_RESUMABLE'
    ? 'The regeneration is not paused any more.'
    : refusalText(error);

/**
 * Пауза перегенерации (F06-5c, решение арбитра `F06 | F06-5c`): тот же выход из паузы, что у хода
 * (`OperationProgress`) — причина словами, «Continue», на `LIMIT_REACHED` с новым лимитом, ссылка на
 * «LLM settings» при потолке и провайдерах. Рисуется только при `regenOperationStatus = paused`.
 */
export const ItemResume: FC<ItemResumeProps> = ({
  operationId,
  pauseReason,
  lang,
  disabled,
  resume,
}) => {
  // Мутация одна на вкладку: занятость и отказ — только своей операции.
  const own = resume.variables?.id === operationId;
  const error = own ? resume.error : null;
  const text = `Regeneration paused: ${operationPauseText(pauseReason)}.`;
  // Действия закрыты или идёт «Continue» другой операции: причина без кнопки, а не чужой спиннер.
  if (disabled || (resume.isPending && !own)) {
    return (
      <p className={styles.hint} role="status">
        {text}
      </p>
    );
  }
  return (
    <OperationProgress
      operation={{ id: operationId, status: 'paused', pauseReason }}
      text={text}
      lang={lang}
      resume={{
        mutate: resume.mutate,
        isPending: own && resume.isPending,
        // Общий тост 5xx показан — своей строкой не дублируем; локальные коды (`LLM_DISABLED`,
        // `LLM_MODELS_UNAVAILABLE`) тоста не дают, их отказ пишется здесь.
        error:
          error instanceof ApiError &&
          error.statusCode >= 500 &&
          !isHandledLocally(error, CONTENT_DRAFT_LOCAL_CODES)
            ? null
            : error,
      }}
      limitLabel="New limit of the regeneration"
      resumeLabel="Continue"
      refusalText={resumeRefusalText}
    />
  );
};
