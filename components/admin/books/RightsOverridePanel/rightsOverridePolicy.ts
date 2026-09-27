import type { PublicationGateResult } from '@/types/api-schema/rights-intake';

/** Границы причины решения — те же, что проверяет бэкенд (после trim). */
export const OVERRIDE_REASON_MIN_LENGTH = 10;
export const OVERRIDE_REASON_MAX_LENGTH = 2000;

/**
 * Блокеры, которые решение администратора не снимает никогда. Копия
 * `SUPERVISOR_OVERRIDE_EXEMPT_GATE_CODES` из `books/src/modules/book-version/publication-gate.constants.ts`
 * той же формы: правится парно, иначе кнопка появится при запрете, который решение не снимает.
 */
export const NEVER_OVERRIDDEN_GATE_CODES: readonly string[] = ['VERSION_CONTENT_INCOMPLETE'];

export const isNeverOverriddenGateCode = (code: string): boolean =>
  NEVER_OVERRIDDEN_GATE_CODES.includes(code);

/** Код 409 ручки отмены: активного решения уже нет. */
export const RIGHTS_OVERRIDE_NOT_ACTIVE_CODE = 'RIGHTS_OVERRIDE_NOT_ACTIVE';

/** Сообщение об ошибке причины или `null`, если причина годится. */
export const validateOverrideReason = (value: string): string | null => {
  const length = value.trim().length;
  if (length < OVERRIDE_REASON_MIN_LENGTH) {
    return `Причина обязательна: не меньше ${OVERRIDE_REASON_MIN_LENGTH} знаков.`;
  }
  if (length > OVERRIDE_REASON_MAX_LENGTH) {
    return `Причина длиннее ${OVERRIDE_REASON_MAX_LENGTH} знаков.`;
  }
  return null;
};

/**
 * Кнопка «Разрешить публикацию» показывается только администратору и только когда гейт
 * запретил публикацию чем-то, что решение способно снять. Запрет из одного
 * `VERSION_CONTENT_INCOMPLETE` решением не лечится — кнопка там только обманула бы.
 */
export const canGrantOverride = (params: {
  isAdmin: boolean;
  gate: PublicationGateResult | undefined;
}): boolean => {
  const { isAdmin, gate } = params;
  if (!isAdmin || !gate || gate.canPublish !== false) return false;
  return gate.blockingReasons.some((reason) => !isNeverOverriddenGateCode(reason.code));
};
