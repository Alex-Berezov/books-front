import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  config,
  isPrivateRoute,
  middleware,
  STATIC_ASSET_EXTENSIONS,
  STATIC_ASSET_PATTERN,
} from '@/middleware';

vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(async () => null),
}));

const { getToken } = await import('next-auth/jwt');
const getTokenMock = vi.mocked(getToken);

/**
 * `LEGACY-083`. Проверяются два свойства, вокруг которых запись и написана:
 *
 * 1. контентные маршруты действительно попадают под `matcher` — иначе
 *    нормализация регистра и хоста до публичных страниц не доходит;
 * 2. ни один контентный маршрут не считается личным — расширение охвата без
 *    этого закрывает публичную страницу авторизацией, о чём запись
 *    предупреждает прямо.
 *
 * ⚠️ **Первая версия сверяла список строк `matcher`, и это было бесполезно.**
 * Код-ревью показало, что Next компилирует `matcher` в регистро**зависимую**
 * регулярку, поэтому перечисление `/:lang(...)/book/:path*` не ловило
 * `/en/Book/Slug` — тот самый адрес, ради которого запись заведена. Список
 * строк был «правильным» и при этом не работал. Теперь шаблон компилируется и
 * проверяется на адресах.
 *
 * ⚠️ Вторая ловушка, тоже из ревью: предикат проверяется **экспортированный**,
 * а не его копия рядом с тестом. Копия оставляла тест зелёным при мутации.
 */
const matcherRegExp = new RegExp(`^${config.matcher[0]}$`);
const matched = (path: string) => matcherRegExp.test(path);

describe('middleware matcher: охват (LEGACY-083)', () => {
  it.each([
    '/en/book/hamlet',
    '/en/author/austen',
    '/en/category/fiction',
    '/en/genre/drama',
    '/en/collection/classics',
    '/en/tag/love',
    '/en/catalog',
  ])('контентный маршрут %s проходит через middleware', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each([
    // 🔴 Ровно те адреса, ради которых запись и заведена: без нормализации они
    // уезжают в API как есть, получают 404 и закрепляются в кэше на 300 секунд.
    '/en/Book/Slug',
    '/EN/book/hamlet',
    '/en/Category/Fiction',
  ])('адрес в неверном регистре %s тоже проходит — иначе его некому исправить', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each(['/en/categories', '/en/genres', '/en/collections', '/en/tags'])(
    'хаб таксономии %s не забыт — его адрес публикует карта сайта',
    (path) => {
      expect(matched(path)).toBe(true);
    }
  );

  it('catch-all CMS-страниц тоже под охватом', () => {
    expect(matched('/en/some/cms/page')).toBe(true);
  });

  it.each([
    '/en/read/hamlet',
    '/en/listen/hamlet',
    '/en/summary/hamlet',
    '/en/profile',
    // Живые читалка и плеер — гейт до них доходит только через matcher.
    '/en/book/hamlet/read',
    '/en/book/hamlet/listen',
  ])('личный маршрут %s из охвата не выпал', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each(['/_next/static/chunk.js', '/api/version', '/favicon.ico', '/robots.txt'])(
    'служебный путь %s исключён — страницами он не обслуживается',
    (path) => {
      expect(matched(path)).toBe(false);
    }
  );
});

describe('isPrivateRoute: якорь на позицию сегмента (LEGACY-083)', () => {
  it.each([
    ['/en/read/hamlet', true],
    ['/ru/listen/voyna-i-mir', true],
    ['/es/summary/quijote', true],
    // Без хвоста — тоже личный: пускать анонима нельзя.
    ['/en/read', true],
    // Регистр не должен решать вопрос доступа, даже если нормализация идёт раньше.
    ['/EN/Read/hamlet', true],
  ])('%s → личный: %s', (path, expected) => {
    expect(isPrivateRoute(path)).toBe(expected);
  });

  it.each([
    // 🔴 Ловушка, о которой предупреждает запись: слово «read» внутри
    // публичного адреса не делает его личным.
    '/en/category/read/',
    '/en/category/read',
    '/ru/tag/listen/',
    '/en/genre/summary',
    '/en/book/how-to-read-books',
    '/en/author/reader-digest',
    '/en/catalog',
  ])('публичный %s личным не считается', (path) => {
    expect(isPrivateRoute(path)).toBe(false);
  });
});

/**
 * `LEGACY-175`. Секционный шаблон закрывал редирект-заглушки, а живые читалка и
 * плеер лежат по `/{lang}/book/{slug}/read|listen` и уходили мимо гейта.
 * Возврат прежнего предиката краснит первую группу; снятие якоря на позицию
 * сегмента (`[^/]+` на слаг, `(?:\/|$)` на хвост) — вторую.
 */
describe('isPrivateRoute: живые читалка и плеер (LEGACY-175)', () => {
  it.each([
    '/en/book/hamlet/read',
    '/en/book/hamlet/listen',
    '/ru/book/voyna-i-mir/read',
    // Хвост со слэшем и регистр вопроса доступа не решают.
    '/en/book/hamlet/read/',
    '/EN/Book/Hamlet/Read',
  ])('живой маршрут %s закрыт', (path) => {
    expect(isPrivateRoute(path)).toBe(true);
  });

  it.each([
    // Родительская страница книги остаётся публичной — это и есть то, что
    // аноним видит до входа.
    '/en/book/hamlet',
    '/en/book/hamlet/',
    // Слово в хвосте слага личным маршрутом не делает.
    '/en/book/hamlet/readers',
    '/en/book/hamlet/listened',
    // Книга со слагом `read`: сегментов на один меньше, это не читалка.
    '/en/book/read',
    // 🔴 Якорь на позицию сегмента, обе половины. `[^/]+` вместо `.+`: лишний
    // сегмент в слаге — это уже не читалка, а catch-all CMS-страницы
    // (`app/[lang]/[...slug]`), и закрывать её входом нельзя. `^` в начале:
    // адрес, где `book/{slug}/read` лежит в середине пути, тоже CMS-страница.
    // Обе мутации проходили мимо тестов, пока этих двух строк не было.
    '/en/book/hamlet/chapter-1/read',
    '/en/blog/de/book/hamlet/read',
  ])('публичный %s личным не считается', (path) => {
    expect(isPrivateRoute(path)).toBe(false);
  });
});

/**
 * `LEGACY-135`. Прежний хвост `.*\.[a-zA-Z0-9]+$` выкидывал из middleware любой
 * адрес с точкой в последнем сегменте — вместе со статикой уходили мимо гейта
 * и содержательные адреса. Проверяется и попадание, и исключение: тест на одно
 * лишь исключение оставлял дыру зелёной.
 */
// ⚠️ Своего списка расширений у теста нет намеренно. Третья копия того же
// перечня сделала бы проверку бесполезной ровно там, где она нужна: добавление
// расширения в `config.matcher` мимо `STATIC_ASSET_EXTENSIONS` оставляло бы все
// тесты зелёными, а адрес — вне middleware. Список берётся из кода, а второй —
// разбирается из самого matcher.
const matcherExtensions = (config.matcher[0].match(/\\\.\(\?:([^)]+)\)/)?.[1] ?? '').split('|');

describe('middleware matcher: точка в адресе (LEGACY-135)', () => {
  it.each([
    '/en/read/hamlet.v2',
    '/admin/en/books/1.5',
    '/en/book/o-simple.plan',
    '/ru/tag/web2.0',
  ])('содержательный адрес %s проходит через middleware', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each([
    '/favicon.ico',
    '/robots.txt',
    '/sitemap.xml',
    '/apple-touch-icon.png',
    // 🔴 Файлы из `public/`, у которых регистр в имени значим. `sitemap.xsl`
    // подключён к каждой карте сайта, а файл подтверждения владения доменом
    // приходит от поисковика с фиксированным смешанным регистром: попади он под
    // нормализацию — 301 на несуществующий адрес и потерянное подтверждение.
    '/sitemap.xsl',
    '/googleA1b2C3d4.html',
    '/yandex_A1B2.html',
    '/site.webmanifest',
  ])('статика %s по-прежнему исключена', (path) => {
    expect(matched(path)).toBe(false);
  });

  // Два списка расширений — в matcher и в STATIC_ASSET_EXTENSIONS — обязаны
  // совпадать по составу: подставить переменную в matcher нельзя, Next
  // разбирает его статически. Расхождение означает, что охват middleware и
  // нормализация регистра расходятся на конкретном типе файлов.
  it('состав перечня в matcher совпадает с STATIC_ASSET_EXTENSIONS', () => {
    expect([...matcherExtensions].sort()).toEqual([...STATIC_ASSET_EXTENSIONS].sort());
  });

  it.each(STATIC_ASSET_EXTENSIONS)('расширение .%s исключено обоими списками', (ext) => {
    const path = `/assets/file.${ext}`;
    expect(matched(path)).toBe(false);
    expect(STATIC_ASSET_PATTERN.test(path)).toBe(true);
  });

  it('точка в слаге статикой не считается ни там, ни там', () => {
    expect(matched('/en/read/hamlet.v2')).toBe(true);
    expect(STATIC_ASSET_PATTERN.test('/en/read/hamlet.v2')).toBe(false);
  });
});

/**
 * `LEGACY-134`. Хост в `Location` берётся из настроек, а не из заголовка
 * запроса. Заголовок `Host` задаёт клиент: подставленный в ответ, он делает
 * 301 открытым перенаправлением — постоянным и кэшируемым.
 */
// ⚠️ Настроенный адрес намеренно **не совпадает** ни с хостом запроса, ни с
// `DEFAULT_SITE_URL` из `lib/seo/urls.ts`. Если стабить `https://bibliaris.com`,
// посадка доказывает только «хост не из заголовка `Host`»: замена `getSiteUrl()`
// на строковый литерал оставила бы её зелёной, а «origin из настроек» —
// непроверенным.
const SITE_URL = 'https://site.example';
const SITE_HOST = 'site.example';
/** Хост, на который приходит запрос, — заведомо не тот, что в настройках. */
const REQ = 'https://bibliaris.com';

const request = (url: string, headers: Record<string, string> = {}) =>
  new NextRequest(url, { headers });

const locationOf = (response: Response): URL => {
  const location = response.headers.get('location');
  expect(location).not.toBeNull();
  return new URL(location as string);
};

describe('редирект: origin только из настроек (LEGACY-134)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
    getTokenMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('подменённый Host не попадает в Location', async () => {
    const response = await middleware(request(`${REQ}/EN/book/hamlet`, { host: 'evil.example' }));

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/en/book/hamlet`);
  });

  it('подменённый Host не попадает в Location и при редиректе с http', async () => {
    const response = await middleware(
      request(`${REQ}/en/book/hamlet`, {
        host: 'evil.example',
        'x-forwarded-proto': 'http',
      })
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/en/book/hamlet`);
  });

  it('www убирается, а строка запроса сохраняется', async () => {
    const response = await middleware(
      request(`${REQ}/en/catalog?page=2`, { host: 'www.bibliaris.com' })
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(`${SITE_URL}/en/catalog?page=2`);
  });

  // 🔴 Проверка живости контейнера ходит на `http://127.0.0.1:3000/` и следует
  // за редиректом. Абсолютный адрес публичного сайта увёл бы её наружу: при
  // живом выходе в интернет она мерила бы прод и зеленела на мёртвом
  // контейнере, без выхода — краснела бы навсегда. В контейнере `NODE_ENV`
  // равен `production`, поэтому по нему исключение не разделить.
  it.each(['127.0.0.1:3000', 'localhost:3000'])(
    'проверка живости с %s остаётся внутри контейнера',
    async (host) => {
      vi.stubEnv('NODE_ENV', 'production');

      const response = await middleware(request(`http://${host}/`, { host }));

      expect(locationOf(response).host).toBe(host);
    }
  );

  it('локальная разработка редиректит на адрес запроса, а не на прод', async () => {
    const response = await middleware(
      request('http://localhost:3000/EN/book/hamlet', { host: 'localhost:3000' })
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe('http://localhost:3000/en/book/hamlet');
  });

  // 🔴 Признак локальной разработки — вторая дверь в ту же дыру: прежнее
  // `host.includes('localhost')` принимало чужой домен с этой подстрокой, и на
  // сборке с NODE_ENV !== 'production' origin ответа снова брался из заголовка.
  // Возврат `.includes` красит эти два теста и только их.
  it.each(['localhost.evil.example', '127.0.0.1.evil.example', 'localhost-evil.example'])(
    'хост %s локальным не считается',
    async (host) => {
      const response = await middleware(request(`${REQ}/EN/book/hamlet`, { host }));

      expect(locationOf(response).host).toBe(SITE_HOST);
    }
  );

  it('подменённый Host не переключает имя cookie сессии', async () => {
    await middleware(request(`${REQ}/admin/en/dashboard`, { host: 'localhost.evil.example' }));

    expect(getTokenMock).toHaveBeenCalledWith(expect.objectContaining({ secureCookie: true }));
  });

  // 🔴 Вторая находка ревью: путь `//evil.example/foo` — протокольно
  // относительный адрес, и `new URL(путь, origin)` разрешал его в
  // `https://evil.example/foo`. Хост в ответе обязан оставаться своим при любом
  // пути, поэтому проверяются все три причины редиректа.
  it.each([
    ['регистр', { host: 'bibliaris.com' }, `${REQ}//evil.example/Foo`],
    ['http', { host: 'bibliaris.com', 'x-forwarded-proto': 'http' }, `${REQ}//evil.example/foo`],
    ['www', { host: 'www.bibliaris.com' }, `${REQ}//evil.example/foo`],
  ])('путь //evil.example не уводит на чужой хост (%s)', async (_case, headers, url) => {
    const response = await middleware(request(url, headers));

    expect(locationOf(response).host).toBe(SITE_HOST);
  });

  // 🔴 Третья находка ревью: `new URL(путь, request.url)` — а `request.url` Next
  // строит из заголовка `Host`. Первая правка чинила один выход из четырёх,
  // остальные три отдавали 307 на чужой хост.
  it('корневой редирект не уводит на чужой хост', async () => {
    const response = await middleware(request(`${REQ}/`, { host: 'evil.example' }));

    expect(locationOf(response).host).toBe(SITE_HOST);
  });

  it('отправка анонима на вход с личного маршрута не уводит на чужой хост', async () => {
    const response = await middleware(request(`${REQ}/en/read/hamlet`, { host: 'evil.example' }));

    const location = locationOf(response);
    expect(location.host).toBe(SITE_HOST);
    expect(location.pathname).toBe('/en/auth/sign-in');
    expect(location.searchParams.get('callbackUrl')).toBe('/en/read/hamlet');
  });

  // 🔴 `LEGACY-175`. Именно этот адрес открывал аноним, пока гейт ловил только
  // редирект-заглушки. Возврат прежнего предиката даёт здесь 200 без Location.
  it('аноним с живой читалки уходит на вход, а не в пустую страницу', async () => {
    const response = await middleware(request(`${REQ}/en/book/hamlet/read`, { host: SITE_HOST }));

    const location = locationOf(response);
    expect(location.host).toBe(SITE_HOST);
    expect(location.pathname).toBe('/en/auth/sign-in');
    expect(location.searchParams.get('callbackUrl')).toBe('/en/book/hamlet/read');
  });

  it('отправка анонима на вход из админки не уводит на чужой хост', async () => {
    const response = await middleware(
      request(`${REQ}/admin/en/dashboard`, { host: 'evil.example' })
    );

    const location = locationOf(response);
    expect(location.host).toBe(SITE_HOST);
    expect(location.pathname).toBe('/en/auth/sign-in');
  });

  it('403 при нехватке роли не уводит на чужой хост', async () => {
    getTokenMock.mockResolvedValue({ roles: ['user'] } as never);

    const response = await middleware(
      request(`${REQ}/admin/en/dashboard`, { host: 'evil.example' })
    );

    const location = locationOf(response);
    expect(location.host).toBe(SITE_HOST);
    expect(location.pathname).toBe('/en/403');
  });

  // Посадки на `callbackUrl` здесь нет намеренно: сегодня ни один путь с
  // ведущей двойной косой не проходит ни `isPrivateRoute`, ни `isAdminRoute`,
  // поэтому в `callbackUrl` такой путь не попадает вовсе. Нормализация в коде
  // оставлена на случай, когда предикаты расширят, — проверять сейчас нечего.

  it('канонический адрес не редиректится', async () => {
    const response = await middleware(request(`${SITE_URL}/en/book/hamlet`, { host: SITE_HOST }));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});

/**
 * `LEGACY-136`. Блок «DIAGNOSTIC: temporary logging» печатал на каждый запрос к
 * `/admin` почту, роли и весь объект `user`. Логи контейнера читает кто угодно.
 */
describe('middleware не печатает персональные данные (LEGACY-136)', () => {
  const token = {
    email: 'admin@bibliaris.com',
    roles: ['admin'],
    role: 'admin',
    user: { id: 'u-1', email: 'admin@bibliaris.com', name: 'Admin' },
  };

  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
    getTokenMock.mockResolvedValue(token as never);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('запрос к админке не роняет в консоль ни почту, ни роли, ни объект user', async () => {
    const spies = (['log', 'info', 'debug', 'warn', 'error'] as const).map((level) =>
      vi.spyOn(console, level).mockImplementation(() => {})
    );

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, {
        host: SITE_HOST,
        cookie: '__Secure-next-auth.session-token=abc',
      })
    );

    expect(response.status).toBe(200);

    const printed = spies
      .flatMap((spy) => spy.mock.calls)
      .flat()
      .map((argument) => (typeof argument === 'string' ? argument : JSON.stringify(argument)))
      .join(' ');

    expect(printed).not.toContain('admin@bibliaris.com');
    expect(printed).not.toContain('session-token');
    // Сверяется значение, а не имя ключа: удалённый блок печатал `roles:` без
    // кавычек, поэтому проверка на строку `"roles"` не покраснела бы и при
    // возврате дефекта.
    expect(printed).not.toContain('"admin"');
    expect(printed).not.toContain('u-1');
  });
});
