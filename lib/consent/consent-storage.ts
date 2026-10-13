import { CONSENT_MAX_AGE_DAYS, CONSENT_POLICY_VERSION } from './consent-version';

export const CONSENT_STORAGE_KEY = 'bibliaris.consent.v1';
export const CONSENT_REGION_STORAGE_KEY = 'bibliaris.consent-region.v1';

export interface StoredConsent {
  analytics: boolean;
  decidedAt: string;
  version: number;
}

export type CachedRegion = 'required' | 'not-required';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Выбор посетителя или `null`, если его нет или он недействителен. Любая ошибка хранилища
 * (приватный режим, запрет, битый JSON) - тоже «выбора нет».
 *
 * Согласие (`analytics: true`) истекает: другая версия политики или старше 365 дней. Дата
 * из будущего (сбитые часы, ручная правка) не принимается: такое согласие не истекало бы никогда.
 * Отказ (`analytics: false`) не истекает и версией не сбрасывается.
 */
export function readConsentChoice(now: number = Date.now()): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { analytics, decidedAt, version } = parsed as Record<string, unknown>;
    if (typeof analytics !== 'boolean' || typeof decidedAt !== 'string') return null;
    if (typeof version !== 'number') return null;
    const choice: StoredConsent = { analytics, decidedAt, version };
    if (!analytics) return choice;
    const decidedMs = Date.parse(decidedAt);
    if (Number.isNaN(decidedMs) || decidedMs > now) return null;
    if (version !== CONSENT_POLICY_VERSION) return null;
    if (now - decidedMs > CONSENT_MAX_AGE_DAYS * DAY_MS) return null;
    return choice;
  } catch {
    return null;
  }
}

/** Регион, запомненный на вкладку; только вывод (`required`/`not-required`), не страна. */
export function readCachedRegion(): CachedRegion | null {
  try {
    const value = window.sessionStorage.getItem(CONSENT_REGION_STORAGE_KEY);
    return value === 'required' || value === 'not-required' ? value : null;
  } catch {
    return null;
  }
}

export function writeCachedRegion(region: CachedRegion): void {
  try {
    window.sessionStorage.setItem(CONSENT_REGION_STORAGE_KEY, region);
  } catch {
    // Хранилище недоступно: на следующей загрузке спросим сервер ещё раз.
  }
}

/**
 * Записывает выбор посетителя с текущей версией политики и временем решения. Хранилище
 * недоступно - выбор живёт до перезагрузки, на следующей плашка (в её регионе) спросит снова.
 */
export function writeConsentChoice(analytics: boolean, now: number = Date.now()): StoredConsent {
  const choice: StoredConsent = {
    analytics,
    decidedAt: new Date(now).toISOString(),
    version: CONSENT_POLICY_VERSION,
  };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // Приватный режим или запрет хранилища: выбор действует на эту загрузку.
  }
  return choice;
}
