import { CONSENT_REGION_STORAGE_KEY, CONSENT_STORAGE_KEY } from './consent-storage';

/**
 * Перечень cookie и записей в хранилище браузера. Единственный источник для таблицы на
 * `/cookies` (F01-3): страница строится из него, а тест `cookieInventory.test.ts` краснеет,
 * если в коде появилась запись, которой здесь нет. Цели и сроки - ключи словаря
 * `cookies.inventory.*` (заводятся в F01-3 вместе с таблицей).
 *
 * Имена из `'use client'`-модулей (`sessionMarker`, `localProgress`, `InternalNavigationTracker`)
 * записаны строкой, а не импортом: серверная страница `/cookies` получила бы из такого модуля
 * клиентскую ссылку вместо строки. Совпадение имени с источником держит сторож перечня.
 */
export interface CookieInventoryEntry {
  name: string;
  provider: 'bibliaris' | 'google';
  storage: 'cookie' | 'localStorage' | 'sessionStorage';
  category: 'necessary' | 'analytics';
  purposeKey: string;
  durationKey: string;
}

export const COOKIE_INVENTORY: readonly CookieInventoryEntry[] = [
  {
    name: '__Secure-authjs.session-token',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'session',
    durationKey: 'sevenDays',
  },
  {
    name: '__Host-authjs.csrf-token',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'csrf',
    durationKey: 'session',
  },
  {
    name: '__Secure-authjs.callback-url',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'callbackUrl',
    durationKey: 'session',
  },
  {
    name: '__Secure-authjs.pkce.code_verifier',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'signIn',
    durationKey: 'minutes',
  },
  {
    name: '__Secure-authjs.state',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'signIn',
    durationKey: 'minutes',
  },
  {
    name: 'logged_in',
    provider: 'bibliaris',
    storage: 'cookie',
    category: 'necessary',
    purposeKey: 'loginMarker',
    durationKey: 'year',
  },
  {
    name: CONSENT_STORAGE_KEY,
    provider: 'bibliaris',
    storage: 'localStorage',
    category: 'necessary',
    purposeKey: 'consentChoice',
    // «Принять» действует год, «Отклонить» - бессрочно (`consent-storage.ts`): срок свой.
    durationKey: 'consentChoice',
  },
  {
    name: CONSENT_REGION_STORAGE_KEY,
    provider: 'bibliaris',
    storage: 'sessionStorage',
    category: 'necessary',
    purposeKey: 'consentRegion',
    durationKey: 'tab',
  },
  {
    name: 'bibliaris.reading-progress.v1',
    provider: 'bibliaris',
    storage: 'localStorage',
    category: 'necessary',
    purposeKey: 'readingProgress',
    durationKey: 'untilCleared',
  },
  {
    name: 'bibliaris.currentPath',
    provider: 'bibliaris',
    storage: 'sessionStorage',
    category: 'necessary',
    purposeKey: 'navigation',
    durationKey: 'tab',
  },
  {
    name: 'bibliaris.previousPath',
    provider: 'bibliaris',
    storage: 'sessionStorage',
    category: 'necessary',
    purposeKey: 'navigation',
    durationKey: 'tab',
  },
  {
    name: '_ga',
    provider: 'google',
    storage: 'cookie',
    category: 'analytics',
    purposeKey: 'analytics',
    durationKey: 'twoYears',
  },
  {
    name: '_ga_<ID>',
    provider: 'google',
    storage: 'cookie',
    category: 'analytics',
    purposeKey: 'analytics',
    durationKey: 'twoYears',
  },
];
