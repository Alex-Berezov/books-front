/**
 * Абсолютный адрес со схемой `http`/`https` — то же, что `@IsAbsoluteHttpUrl()` на бэкенде
 * (`books/src/shared/validators/absolute-http-url.decorator.ts`, `LEGACY-401`). Хост без TLD
 * допустим: адрес `LocalStorage` по умолчанию `http://localhost:5000`.
 *
 * Файл без `zod` намеренно: форма автора зовёт проверку напрямую, и импорт `zod` отсюда
 * добавлял ~30 kB в бандл трёх роутов авторов (бюджет бандла, `T75`). Поле формы на `zod` —
 * `http-url-field.ts`.
 */

/** Предел длины: `max_allowed_length` у `isURL` бэкенда, он же у пути от корня. */
const MAX_URL_LENGTH = 2084;

const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4 = new RegExp(`^${IPV4_OCTET}(\\.${IPV4_OCTET}){3}$`);

/** Метка хоста по `isFQDN` бэкенда с его опциями (`require_tld: false`, без `_`). */
function isValidLabel(label: string): boolean {
  return (
    label.length <= 63 &&
    /^[a-z¡-￿0-9-]+$/i.test(label) &&
    !/[！-～]/.test(label) &&
    !/^-|-$/.test(label)
  );
}

/**
 * `isIP(…, 6)` бэкенда — та же регулярка, что в `validator/lib/isIP.js`, вместе с зоной
 * интерфейса (`fe80::1%eth0`, `%pvc1.3`). `new URL` зону не принимает вовсе.
 */
const IPV6_SEGMENT = '(?:[0-9a-fA-F]{1,4})';
const IPV4_ADDRESS = `(${IPV4_OCTET}[.]){3}${IPV4_OCTET}`;
const IPV6 = new RegExp(
  '^(' +
    `(?:${IPV6_SEGMENT}:){7}(?:${IPV6_SEGMENT}|:)|` +
    `(?:${IPV6_SEGMENT}:){6}(?:${IPV4_ADDRESS}|:${IPV6_SEGMENT}|:)|` +
    `(?:${IPV6_SEGMENT}:){5}(?::${IPV4_ADDRESS}|(:${IPV6_SEGMENT}){1,2}|:)|` +
    `(?:${IPV6_SEGMENT}:){4}(?:(:${IPV6_SEGMENT}){0,1}:${IPV4_ADDRESS}|(:${IPV6_SEGMENT}){1,3}|:)|` +
    `(?:${IPV6_SEGMENT}:){3}(?:(:${IPV6_SEGMENT}){0,2}:${IPV4_ADDRESS}|(:${IPV6_SEGMENT}){1,4}|:)|` +
    `(?:${IPV6_SEGMENT}:){2}(?:(:${IPV6_SEGMENT}){0,3}:${IPV4_ADDRESS}|(:${IPV6_SEGMENT}){1,5}|:)|` +
    `(?:${IPV6_SEGMENT}:){1}(?:(:${IPV6_SEGMENT}){0,4}:${IPV4_ADDRESS}|(:${IPV6_SEGMENT}){1,6}|:)|` +
    `(?::((?::${IPV6_SEGMENT}){0,5}:${IPV4_ADDRESS}|(?::${IPV6_SEGMENT}){1,7}|:))` +
    ')(%[0-9a-zA-Z.]{1,})?$'
);

/**
 * Перенос `isURL` из `validator` (его зовёт `IsUrl` бэкенда) с опциями `IsAbsoluteHttpUrl`:
 * `require_protocol`, `protocols: ['http', 'https']`, `require_tld: false`. `new URL`
 * для этого не годится: он срезает пробелы, достраивает `https:/x`, пускает `_`, `!`, `$`
 * в хост и нормализует `https://123` в `0.0.0.123` — бэкенд всё это отбивает 400.
 */
export function isAbsoluteHttpUrl(value: string): boolean {
  if (!value || /[\s<>]/.test(value) || value.length > MAX_URL_LENGTH) return false;

  const withoutQuery = value.split('#')[0]!.split('?')[0]!;
  const schemeParts = withoutQuery.split('://');
  if (schemeParts.length < 2) return false;
  const protocol = schemeParts.shift()!.toLowerCase();
  if (protocol !== 'http' && protocol !== 'https') return false;

  const rest = schemeParts.join('://');
  if (rest === '') return false;
  const authority = rest.split('/')[0]!;

  const atParts = authority.split('@');
  if (atParts.length > 1) {
    if (atParts[0] === '') return false;
    const auth = atParts.shift()!;
    const authParts = auth.split(':');
    if (authParts.length > 2) return false;
    if (authParts[0] === '' && authParts[1] === '') return false;
  }
  const hostPort = atParts.join('@');

  let host: string;
  let ipv6: string | null = null;
  let port: string | null = null;
  const ipv6Match = hostPort.match(/^\[([^\]]+)\](?::([0-9]+))?$/);
  if (ipv6Match) {
    host = '';
    ipv6 = ipv6Match[1]!;
    port = ipv6Match[2] ?? null;
  } else {
    const hostParts = hostPort.split(':');
    host = hostParts.shift()!;
    if (hostParts.length) port = hostParts.join(':');
  }

  if (port !== null && port.length > 0) {
    const portNumber = parseInt(port, 10);
    if (!/^[0-9]+$/.test(port) || portNumber <= 0 || portNumber > 65535) return false;
  }

  if (ipv6 !== null) return IPV6.test(ipv6);
  if (IPV4.test(host)) return true;

  const labels = host.split('.');
  // Числовая «зона» отбивается и без `require_tld`: `https://123`, `https://1.2.3.256`.
  if (/^\d+$/.test(labels[labels.length - 1]!)) return false;
  return labels.every(isValidLabel);
}

/**
 * Путь от корня сайта: `/ru/author/wilde`. Не `//host` (протокол-относительный адрес уводит
 * на чужой хост), без пробелов, управляющих символов, обратной косой черты и `<`/`>`.
 * Копия `isRootPath` бэкенда.
 */
function isRootPath(value: string): boolean {
  return (
    value.length <= MAX_URL_LENGTH &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    // eslint-disable-next-line no-control-regex -- управляющие символы в пути недопустимы
    !/[\s\\\x00-\x1f\x7f<>]/.test(value)
  );
}

/** Зеркало `@IsAbsoluteHttpUrlOrRootPath()` бэкенда: `BookVersion.authorPageUrl` (`T94`). */
export function isAbsoluteHttpUrlOrRootPath(value: string): boolean {
  return isRootPath(value) || isAbsoluteHttpUrl(value);
}
