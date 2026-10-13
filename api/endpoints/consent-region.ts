import type { CachedRegion } from '@/lib/consent/consent-storage';

export interface ConsentRegionAnswer {
  region: CachedRegion;
  /** Ответ сервера, а не откат по ошибке: только такой кэшируется на вкладку. */
  fromServer: boolean;
}

/**
 * Нужна ли посетителю плашка согласия: собственный маршрут фронта `app/api/consent-region`
 * (`F01`), а не ручка бэкенда.
 *
 * Голый `fetch`, а не `http*`: клиент из `lib/http.ts` ходит на `API_BASE_URL` бэкенда, где такой
 * ручки нет, - вызов через него получил бы 404 и, по откату ниже, выключил бы GA всем посетителям
 * вне стран плашки. Отказ не бросается: любая ошибка, не-200 или тело без boolean - это
 * `required`, ошибка в сторону плашки (решение владельца D2).
 */
export async function fetchConsentRegion(): Promise<ConsentRegionAnswer> {
  try {
    const response = await fetch('/api/consent-region', { cache: 'no-store' });
    if (!response.ok) return { region: 'required', fromServer: false };
    const body: unknown = await response.json();
    const flag = (body as { consentRequired?: unknown } | null)?.consentRequired;
    if (typeof flag !== 'boolean') return { region: 'required', fromServer: false };
    return { region: flag ? 'required' : 'not-required', fromServer: true };
  } catch {
    return { region: 'required', fromServer: false };
  }
}
