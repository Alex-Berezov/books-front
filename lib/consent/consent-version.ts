/**
 * Версия политики cookie. Поднимается при смысловой правке перечня (`cookie-inventory.ts`):
 * новая аналитика, новая цель. Согласие старой версии недействительно и спрашивается заново;
 * отказ действует всегда (`consent-storage.ts`).
 */
export const CONSENT_POLICY_VERSION = 1;

/** Сколько действует согласие, дней. */
export const CONSENT_MAX_AGE_DAYS = 365;
