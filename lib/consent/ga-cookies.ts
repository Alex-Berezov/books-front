const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';

const isGaCookie = (name: string): boolean => name === '_ga' || name.startsWith('_ga_');

/** `.bibliaris.com` для `www.bibliaris.com`; для `localhost` и IP родителя нет. */
function parentDomain(hostname: string): string | null {
  const labels = hostname.split('.');
  if (labels.length < 2 || /^\d+$/.test(labels[labels.length - 1])) return null;
  return `.${labels.slice(-2).join('.')}`;
}

/** Удаляет `_ga` и `_ga_*` для текущего хоста и родительского домена, путь `/`. */
export function clearGaCookies(hostname: string = window.location.hostname): void {
  const names = document.cookie
    .split(';')
    .map((part) => part.split('=')[0].trim())
    .filter(isGaCookie);
  if (names.length === 0) return;
  const parent = parentDomain(hostname);
  for (const name of names) {
    document.cookie = `${name}=; expires=${EXPIRED}; path=/`;
    if (parent) document.cookie = `${name}=; expires=${EXPIRED}; path=/; domain=${parent}`;
  }
}

/** Идентификатор GA из окружения - одно место на `app/layout.tsx` и `ConsentProvider`. */
export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Админка: ни GA, ни плашки согласия. Граница по сегменту, как в `lib/auth/session-end.ts`. */
export const isAnalyticsExcludedPath = (pathname: string | null | undefined): boolean =>
  pathname === '/admin' || (pathname?.startsWith('/admin/') ?? false);

type GaWindow = Record<string, unknown> & { gtag?: (...args: unknown[]) => void };

/**
 * Выключатель уже загруженного gtag в той же загрузке страницы. `next/script` вставленный скрипт
 * не выгружает и при повторном монтировании не запускает заново, поэтому отзыв ставит флаг
 * `ga-disable-<ID>` (документированный выключатель gtag.js), а повторное согласие снимает его
 * и заново отдаёт `config` - иначе gtag остался бы без идентификатора, стёртого вместе с `_ga`.
 */
export function setGaDisabled(disabled: boolean, measurementId: string | undefined): void {
  if (!measurementId) return;
  const ga = window as unknown as GaWindow;
  const flag = `ga-disable-${measurementId}`;
  if (disabled) {
    ga[flag] = true;
    return;
  }
  if (!(flag in ga)) return;
  delete ga[flag];
  ga.gtag?.('config', measurementId);
}
