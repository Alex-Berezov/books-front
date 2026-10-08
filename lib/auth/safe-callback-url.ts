/**
 * Адрес возврата после входа (`?callbackUrl=`) — только путь на нашем сайте (`LEGACY-445`).
 *
 * Значение приходит из адреса страницы и уходит в `router.push` и `signIn`: без проверки
 * `?callbackUrl=https://evil.example` уводит на фишинг после настоящего входа, а `javascript:`
 * исполняет код на нашем домене.
 *
 * Управляющие символы и обратная косая черта отбиваются до разбора: браузер вырезает таб
 * и перевод строки, и `/%09/evil` после декодирования становится `//evil` — чужим хостом;
 * `\` браузер читает как `/`, и `/\evil` — тот же `//evil`.
 *
 * @param raw значение параметра; `null`, если его нет
 * @param lang язык страницы — запасной адрес `/${lang}`
 * @param origin origin сайта, с которым сравнивается разобранный адрес
 * @returns `pathname + search + hash` своего адреса либо `/${lang}`
 */
export function safeCallbackUrl(raw: string | null, lang: string, origin: string): string {
  const fallback = `/${lang}`;
  if (!raw) return fallback;

  // Значение из `searchParams.get` уже декодировано; второй разбор пути ловит `%09` и `%5C`,
  // записанные дважды. Строка запроса во второй разбор не идёт: `?q=a%5Cb` — законный поиск.
  // Литеральный `%` (`/100%`) разбора не переживает — тогда проверяется сама строка.
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw.split(/[?#]/)[0] ?? raw);
  } catch {
    // строка с литеральным `%` — проверяется как есть
  }
  // eslint-disable-next-line no-control-regex -- управляющие символы в адресе возврата недопустимы
  const forbidden = /[\u0000-\u001F\u007F\\]/;
  if (forbidden.test(raw) || forbidden.test(decoded)) {
    return fallback;
  }

  try {
    const url = new URL(raw, origin);
    if (url.origin !== origin) return fallback;
    // `/.//evil` и `/a/..//evil` разбираются в путь `//evil` на своём origin, а возвращённый
    // `//evil` — уже адрес чужого хоста без схемы.
    if (url.pathname.startsWith('//')) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
