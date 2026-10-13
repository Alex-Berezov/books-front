/**
 * Страны, где посетителю нужна плашка согласия на cookie (`F01`, решение владельца D2):
 * ЕС-27 вместе с его особыми территориями, ЕЭЗ вне ЕС, Великобритания и Швейцария. Коды — как у Cloudflare (`cf-ipcountry`):
 * Греция `GR`, а не `EL`; Великобритания `GB`, а не `UK`.
 */
export const CONSENT_COUNTRIES = [
  // ЕС-27
  'AT',
  'BE',
  'BG',
  'CY',
  'CZ',
  'DE',
  'DK',
  'EE',
  'ES',
  'FI',
  'FR',
  'GR',
  'HR',
  'HU',
  'IE',
  'IT',
  'LT',
  'LU',
  'LV',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SE',
  'SI',
  'SK',
  // ЕС-27, особые территории со своим кодом у Cloudflare (decisions-log, F01-2)
  'GF',
  'GP',
  'MQ',
  'RE',
  'YT',
  'MF',
  'AX',
  // ЕЭЗ вне ЕС
  'IS',
  'LI',
  'NO',
  // прочие
  'GB',
  'CH',
] as const;

const CONSENT_COUNTRY_SET: ReadonlySet<string> = new Set(CONSENT_COUNTRIES);

const ISO_ALPHA2 = /^[A-Z]{2}$/;

/** Cloudflare отдаёт `XX`, «страна неизвестна». `T1` (Tor) сюда не входит: его отсекает `ISO_ALPHA2`. */
const UNKNOWN_COUNTRY = 'XX';

/**
 * Нужна ли плашка. Ошибка в сторону «нужна»: страна не определилась, пуста или не похожа на
 * ISO-2 - плашка показывается (решение D2). `false` - только для валидного кода вне списка.
 */
export function isConsentRequired(country: string | null | undefined): boolean {
  const code = country?.trim().toUpperCase() ?? '';
  if (!ISO_ALPHA2.test(code) || code === UNKNOWN_COUNTRY) return true;
  return CONSENT_COUNTRY_SET.has(code);
}
