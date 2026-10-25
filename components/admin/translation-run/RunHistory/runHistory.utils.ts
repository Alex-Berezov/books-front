import type {
  TranslationRunAuthor,
  TranslationRunLanguageResult,
  TranslationRunStageModel,
} from '@/types/api-schema';
import {
  failedText,
  languageStatusText,
  languageStopText,
  stageName,
} from '../translationRun.utils';

/** Автор запуска; пользователь удалён — `deleted user` (решение арбитра `F05 | F05-8`, В4). */
export const authorText = (author: TranslationRunAuthor | null): string => {
  if (author === null) return 'deleted user';
  return author.name ? `${author.name} (${author.email})` : author.email;
};

/** Модель этапа и запасные: «Translation: a/main (fallbacks: b/spare)». */
export const stageModelText = (m: TranslationRunStageModel): string => {
  const spare = m.fallbacks.length > 0 ? ` (fallbacks: ${m.fallbacks.join(', ')})` : '';
  return `${stageName(m.stage)}: ${m.model}${spare}`;
};

/**
 * Итог языка словами блока хода и отчёта: статус, у упавшего — причина с текстом сервиса,
 * у незакончившегося — последняя остановка, у отменённого — где он стоял до отмены.
 */
export const languageResultText = (r: TranslationRunLanguageResult): string => {
  const code = r.language.toUpperCase();
  if (r.status === 'failed') return `${code}: ${failedText(r)}`;
  const status = languageStatusText(r.status);
  if (!r.reason) return `${code}: ${status}`;
  // У отменённого причина — где он стоял до отмены, а не то, чего он ждёт сейчас.
  const stop = languageStopText(r.reason);
  return r.status === 'cancelled'
    ? `${code}: ${status}, stopped: ${stop}`
    : `${code}: ${status}, ${stop}`;
};
