import { refusalTextOfCode } from '@/components/admin/books/ContentDraft/contentDraft.utils';
import { errorCode, errorText } from '@/lib/admin/request-errors';
import type { WorldImageGeneration } from '@/types/api-schema';

/** Почему генерация не удалась: код задачи (`failedReason`) — человеческой фразой (F08-11b). */
const FAILED_REASONS: Record<string, string> = {
  WORLD_IMAGE_NOT_IMAGE: 'The model answered with something that is not a PNG, JPEG or WEBP image.',
  WORLD_IMAGE_TOO_SMALL: 'The image is narrower or lower than 1200 px.',
  WORLD_IMAGE_TOO_LARGE: 'The image is too large to store.',
  WORLD_IMAGE_INPUT_MISSING:
    'The character no longer has appearance text or is no longer a main or secondary character.',
  LLM_INSUFFICIENT_FUNDS: 'The OpenRouter balance is too low to generate an image.',
  LLM_UNAVAILABLE: 'The image model is unavailable now.',
  // Хвост кода — какой лимит, как в `LANGUAGE_STOPS` (`translation-run/translationRun.utils.ts`):
  // лимит операции считается из оценки и в настройках не поднимается, потолок — поднимается.
  'LLM_BUDGET_EXCEEDED:operation':
    'The generation cost more than its limit: generate again or choose a cheaper image model in LLM settings.',
  'LLM_BUDGET_EXCEEDED:ceiling': 'The spending ceiling is reached: raise it in LLM settings.',
};

/** Код задачи — фразой: свой, затем общий отказ LLM; незнакомый код — `null`. */
const reasonOf = (code: string): string | null =>
  FAILED_REASONS[code] ?? refusalTextOfCode(code) ?? null;

/** Причина паузы или отмены: фраза, незнакомый код — как есть. */
export const worldImageReasonText = (code: string): string => reasonOf(code) ?? `Reason: ${code}.`;

export const worldImageFailedText = (generation: Pick<WorldImageGeneration, 'failedReason'>) =>
  generation.failedReason === null
    ? 'The generation failed.'
    : (reasonOf(generation.failedReason) ?? `The generation failed: ${generation.failedReason}.`);

/** Свои коды ручек иллюстрации; общие отказы LLM (`LLM_CEILING_REACHED`...) — общим текстом. */
const REQUEST_ERRORS: Record<string, string> = {
  WORLD_IMAGE_IN_PROGRESS: 'A generation is already running for this character.',
  WORLD_IMAGE_NOT_ALLOWED: 'Only main and secondary characters get an illustration.',
  WORLD_IMAGE_NO_APPEARANCE: 'The character has no appearance text: the portrait is drawn from it.',
  WORLD_IMAGE_NONE: 'There is no generated illustration to accept.',
  WORLD_IMAGE_CHANGED:
    'The illustration was regenerated meanwhile: check the new one and accept it.',
};

/** Отказ ручки «Generate» или «Accept»: известный код — фраза, иначе строки сервера как есть. */
export const worldImageRequestErrorText = (error: unknown): string => {
  const code = errorCode(error) ?? '';
  return REQUEST_ERRORS[code] ?? refusalTextOfCode(code) ?? errorText(error, 'Request failed');
};
