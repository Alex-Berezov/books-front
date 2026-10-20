import { unstable_doesMiddlewareMatch } from 'next/experimental/testing/server';
import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ADMIN_PANEL_ROLES, UserRole } from '@/lib/auth/constants';
import { resetClaimClosuresCache } from '@/lib/claim-closures';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { SUPPORTED_LANGS } from '@/lib/i18n/lang';
import { summarySectionClosedStrings } from '@/lib/i18n/summarySectionClosedStrings';
import { decodeEntities } from '@/lib/utils/html-entities';
import { config, middleware, STATIC_ASSET_EXTENSIONS, STATIC_ASSET_PATTERN } from '@/middleware';

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
    // Анализ (F03-2): закрытие по стране блока окончённой претензии живёт здесь.
    '/en/book/hamlet/analysis',
  ])('маршрут %s из охвата не выпал', (path) => {
    expect(matched(path)).toBe(true);
  });

  it.each(['/_next/static/chunk.js', '/api/version', '/favicon.ico', '/robots.txt'])(
    'служебный путь %s исключён — страницами он не обслуживается',
    (path) => {
      expect(matched(path)).toBe(false);
    }
  );
});

/**
 * `T121` (`LEGACY-448`). Тесты охвата выше судят по своей модели — `config.matcher`,
 * собранному в `RegExp` руками. Модель верна, пока Next компилирует matcher так же:
 * регистрозависимо и по сырому, не декодированному пути. Здесь та же выборка адресов
 * сверяется с компилятором самого Next (`unstable_doesMiddlewareMatch`): сменит он
 * правила при обновлении — расхождение покраснеет здесь, а не у читателя с 404.
 */
describe('модель matcher совпадает с компилятором Next (T121)', () => {
  it.each([
    '/en/book/hamlet',
    '/en/Book/Slug',
    '/EN/book/hamlet',
    '/en/book/hamlet/read',
    '/ru/tag/%D1%81%D1%82%D1%80%D0%B0%D1%85',
    '/en/some/cms/page',
    '/_next/static/chunk.js',
    '/api/version',
    '/favicon.ico',
    '/robots.txt',
    '/covers/hamlet.png',
    '/covers/hamlet.PNG',
  ])('%s: Next и модель теста решают одинаково', (path) => {
    expect(unstable_doesMiddlewareMatch({ config, url: path })).toBe(matched(path));
  });
});

/**
 * Чтение, прослушивание и саммари бесплатны и открыты анониму — решение
 * владельца от 22.08.2026, отменяющее решение от 15.08.2026 (`LEGACY-175`).
 *
 * Посадка сделана на самом `middleware`, а не на предикате: предиката больше
 * нет, а вернуть гейт можно и мимо него — условием прямо в теле. Проверяется
 * то, что важно продукту: аноним доходит до страницы, а не до формы входа.
 */
describe('контентные маршруты открыты анониму', () => {
  // Анализ ходит за списком закрытий (F03-2): в этом наборе бэкенда нет - список пуст, без сети.
  beforeEach(() => {
    resetClaimClosuresCache();
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('{"items":[]}', { status: 200 }))
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it.each([
    // Живые читалка и плеер.
    '/en/book/hamlet/read',
    '/en/book/hamlet/listen',
    '/ru/book/voyna-i-mir/read',
    '/en/book/hamlet/read/',
    // Редирект-заглушки старых адресов: аноним должен получить свой 301 на
    // новый адрес, а не форму входа перед ним.
    '/en/read/hamlet',
    '/ru/listen/voyna-i-mir',
    '/en/read',
    // Саммари.
    '/es/summary/quijote',
    '/en/summary/hamlet/v1',
    // Родительская страница книги публична и была публичной раньше.
    '/en/book/hamlet',
    // Анализ (F03-2) открыт анониму, как пересказ.
    '/en/book/hamlet/analysis',
  ])('аноним на %s не уходит на форму входа', async (path) => {
    const response = await middleware(request(`${REQ}${path}`, { host: SITE_HOST }));

    const location = response.headers.get('location');
    expect(location === null || !location.includes('/auth/sign-in')).toBe(true);
  });

  it('токен сессии для контентного маршрута вовсе не читается', async () => {
    getTokenMock.mockClear();

    await middleware(request(`${REQ}/en/book/hamlet/read`, { host: SITE_HOST }));

    expect(getTokenMock).not.toHaveBeenCalled();
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
    // Стили экрана 451 закрытого анализа (F03-4, В2): попади под middleware - редирект на язык.
    '/rights-blocked.css',
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

  // Открытый редирект на форме входа стережёт админский случай ниже: контентные
  // маршруты анонима на вход больше не отправляют, и проверять там нечего.
  it('нормализация контентного адреса не уводит на чужой хост', async () => {
    const response = await middleware(
      request(`${REQ}/EN/book/hamlet/read`, { host: 'evil.example' })
    );

    expect(locationOf(response).host).toBe(SITE_HOST);
  });

  // Посадка на сам `callbackUrl`: без неё замена `safePathname` на сырой
  // `pathname` или потеря строки `searchParams.set` проходят мимо всех тестов.
  it('анониму из админки возвращают адрес, с которого он пришёл', async () => {
    const response = await middleware(request(`${REQ}/admin/en/dashboard`, { host: SITE_HOST }));

    expect(locationOf(response).searchParams.get('callbackUrl')).toBe('/admin/en/dashboard');
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
  // ведущей двойной косой не проходит `isAdminRoute`, поэтому в `callbackUrl`
  // такой путь не попадает вовсе. Нормализация в коде
  // оставлена на случай, когда предикаты расширят, — проверять сейчас нечего.

  it('канонический адрес не редиректится', async () => {
    const response = await middleware(request(`${SITE_URL}/en/book/hamlet`, { host: SITE_HOST }));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});

/**
 * `LEGACY-186`. Октет `%D1` содержит hex-цифру `D` — голая `/[A-Z]/.test`
 * принимала её за заглавную букву пути и редиректила рабочий нелатинский адрес
 * на самого себя в другом регистре кодирования.
 *
 * ⚠️ Кодирует адрес не карта сайта: она отдаёт слаг сырым
 * (`app/sitemaps/[filename]/route.ts` → `buildPublicUrl`, склейка строк).
 * В `%XX` путь превращают клиент и краулер при запросе, а
 * `request.nextUrl.pathname` его не декодирует — оттого совпадение
 * и доезжало до правила 3.
 *
 * ⚠️ Граница посадки: тест зовёт `middleware(new NextRequest(...))` напрямую, то есть
 * проверяет `NextRequest` установленного next, а не маршрутизацию его сервера. Начни
 * сервер Next декодировать путь до middleware — здесь останется зелёно. На next 15.5.27
 * (`T121`) проверено запросом к собранному приложению (`next start`): `/ru/Tag/%D1%81…` —
 * 301 на `/ru/tag/%D1%81…` с октетами как были, `/ru/tag/%D1%81…` — без 301.
 *
 * Посадка лежит своим `describe`, а не внутри блока `LEGACY-134`: разбор чужого
 * блока целиком унёс бы её вместе с собой, а по имени записи она бы не нашлась.
 */
describe('нормализация регистра не трогает процентное кодирование (LEGACY-186)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
    getTokenMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('нелатинский адрес в форме %XX не получает лишний 301', async () => {
    const response = await middleware(
      request(`${SITE_URL}/ru/tag/%D1%81%D1%82%D1%80%D0%B0%D1%85`, { host: SITE_HOST })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('заглавная буква пути рядом с %XX получает 301, октет сохраняется', async () => {
    const response = await middleware(
      request(`${SITE_URL}/ru/Tag/%D1%81%D1%82%D1%80%D0%B0%D1%85`, { host: SITE_HOST })
    );

    expect(response.status).toBe(301);
    expect(response.headers.get('location')).toBe(
      `${SITE_URL}/ru/tag/%D1%81%D1%82%D1%80%D0%B0%D1%85`
    );
  });

  // 🔴 Смешанный случай: латинская заглавная в языке — причина 301, а сам слаг
  // нелатинский. Путь доезжает до middleware уже закодированным (`URL`
  // кодирует не-ASCII сам), поэтому проверяется главное: язык понижен, а октеты
  // слага дошли байт в байт. Прежний `pathname.toLowerCase()` понижал и hex,
  // отдавая `%d0%a4` вместо `%D0%A4`, — на этом кейс и краснеет.
  it('заглавный язык понижается, октеты нелатинского слага сохраняются', async () => {
    const response = await middleware(request(`${SITE_URL}/RU/tag/Фэнтези`, { host: SITE_HOST }));

    expect(response.status).toBe(301);
    expect(new URL(response.headers.get('location') as string).pathname).toBe(
      `/ru/tag/${encodeURIComponent('Фэнтези')}`
    );
  });
});

/**
 * 🔴 `LEGACY-157`. Отрицательные ветки гейта админки посадками закрыты (аноним уходит
 * на форму входа, чужая роль — на `/403`), а положительная — нет: замена
 * `ADMIN_PANEL_ROLES` на пустой список или инверсия условия роняли бы только вход
 * тех, кому он положен, и ни один тест этого не видел. Сотрудник в админке — то,
 * ради чего гейт и написан, поэтому проверяется каждая роль из списка.
 */
describe('гейт админки пропускает сотрудника (LEGACY-157)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ⚠️ Состав списка закрепляется отдельно, а не только перебирается. `it.each` по
  // пустому массиву регистрирует ноль случаев и молчит: опустошение
  // `ADMIN_PANEL_ROLES` закрыло бы админку всем сотрудникам сразу, а набор остался
  // бы зелёным — отрицательные случаи этого тоже не видят.
  it('в список ролей админки входят администратор, контент-менеджер и юрист', () => {
    expect([...ADMIN_PANEL_ROLES]).toEqual([
      UserRole.ADMIN,
      UserRole.CONTENT_MANAGER,
      UserRole.LAWYER,
    ]);
  });

  it.each([...ADMIN_PANEL_ROLES])('роль %s проходит в админку без редиректа', async (role) => {
    getTokenMock.mockResolvedValue({ roles: [role] } as never);

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  it('роль вне списка в админку не проходит', async () => {
    getTokenMock.mockResolvedValue({ roles: ['user'] } as never);

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
    );

    expect(locationOf(response).pathname).toBe('/en/403');
  });

  it('токен без ролей вовсе в админку не проходит', async () => {
    getTokenMock.mockResolvedValue({} as never);

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
    );

    expect(locationOf(response).pathname).toBe('/en/403');
  });
});

describe('гейт админки не пускает мёртвую сессию (LEGACY-466)', () => {
  beforeEach(() => {
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', SITE_URL);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // Роль в токене остаётся прежней и после отказа refresh: без проверки `error` разжалованный
  // или заблокированный попадал в оболочку админки.
  it.each(['SessionEnded', 'AccountDisabled'])(
    'токен с ролью администратора и ошибкой %s уходит на вход',
    async (error) => {
      getTokenMock.mockResolvedValue({ roles: ['admin'], error } as never);

      const response = await middleware(
        request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
      );

      const location = locationOf(response);
      expect(location.pathname).toBe('/en/auth/sign-in');
      expect(location.searchParams.get('reason')).toBe(error);
      expect(location.searchParams.get('callbackUrl')).toBe('/admin/en/dashboard');
    }
  );

  it('старая кука окончательного отказа (RefreshAccessTokenError + «никогда») тоже уходит на вход', async () => {
    getTokenMock.mockResolvedValue({
      roles: ['admin'],
      error: 'RefreshAccessTokenError',
      refreshRetryAt: Number.MAX_SAFE_INTEGER,
    } as never);

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
    );

    const location = locationOf(response);
    expect(location.pathname).toBe('/en/auth/sign-in');
    expect(location.searchParams.get('reason')).toBe('SessionEnded');
  });

  it('временный отказ refresh сотрудника не выкидывает: роль решает как прежде', async () => {
    getTokenMock.mockResolvedValue({
      roles: ['admin'],
      error: 'RefreshAccessTokenError',
    } as never);

    const response = await middleware(
      request(`${SITE_URL}/admin/en/dashboard`, { host: SITE_HOST })
    );

    expect(response.status).toBe(200);
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

/**
 * F03-2, решение арбитра `F03 | F03-2`: анализ, закрытый блоком окончённой претензии по стране,
 * отвечает 451 посетителю из этой страны; другим странам, неизвестной стране и при сбое бэкенда
 * без прежнего списка - открыт. Блок на весь мир закрывает всех.
 */
describe('анализ: закрытие по стране блока окончённой претензии', () => {
  const closures = {
    items: [
      { slugs: ['hamlet', 'gamlet'], language: 'en', countryCode: 'GB', expiresAt: null },
      { slugs: ['emma'], language: null, countryCode: null, expiresAt: null },
      {
        slugs: ['carol'],
        language: 'en',
        countryCode: 'DE',
        expiresAt: '2000-01-01T00:00:00.000Z',
      },
    ],
  };
  const fetchMock = vi.fn();

  const open = (path: string, country?: string) =>
    middleware(
      request(`${REQ}${path}`, {
        host: SITE_HOST,
        ...(country ? { 'cf-ipcountry': country } : {}),
      })
    );

  beforeEach(() => {
    resetClaimClosuresCache();
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(new Response(JSON.stringify(closures), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('посетитель из страны блока - 451 без претензии и причины, не кэшируется', async () => {
    const response = await open('/en/book/hamlet/analysis', 'GB');

    expect(response.status).toBe(451);
    expect(response.headers.get('cache-control')).toBe('private, no-store');
    const html = await response.text();
    expect(html).toContain('Not available in your region');
    expect(html).toContain('href="/en/book/hamlet"');
    expect(html).toContain('noindex');
    // F03-4, В2: оформление - статикой с адреса сайта, без инлайн-стилей и без нового маршрута.
    expect(html).toContain('<link rel="stylesheet" href="/rights-blocked.css">');
    expect(html).not.toMatch(/style=|<style/);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/analyses\/claim-closures$/);
  });

  // F03-4: экран на языке страницы - на всех пяти, а не только на en.
  it.each(SUPPORTED_LANGS)('%s: экран 451 на языке страницы', async (lang) => {
    const response = await open(`/${lang}/book/emma/analysis`);
    const html = await response.text();
    // Сверяется видимый текст, а не копия экранирования из кода: разметка раскодируется.
    const text = decodeEntities(html);
    const { title, analysisMessage } = getDictionary(lang).rightsBlocked;
    // Пустая строка словаря дала бы toContain('') - всегда истину.
    expect(title.trim()).not.toBe('');
    expect(analysisMessage.trim()).not.toBe('');

    expect(response.status).toBe(451);
    expect(html).toContain(`<html lang="${lang}">`);
    expect(text).toContain(`>${title}</h1>`);
    expect(text).toContain(analysisMessage);
    expect(html).toContain(`href="/${lang}/book/emma"`);
    expect(html).toContain(`href="/${lang}/catalog"`);
  });

  it.each([
    ['другая страна', '/en/book/hamlet/analysis', 'US'],
    ['страна неизвестна', '/en/book/hamlet/analysis', undefined],
    ['другой язык книги', '/fr/book/hamlet/analysis', 'GB'],
    ['истёкший блок', '/en/book/carol/analysis', 'DE'],
    ['страница книги, а не анализ', '/en/book/hamlet', 'GB'],
  ])('%s - открыто', async (_name, path, country) => {
    const response = await open(path, country);
    expect(response.status).not.toBe(451);
  });

  it('страна в нижнем регистре сверяется как в верхнем; XX - страна неизвестна', async () => {
    expect((await open('/en/book/hamlet/analysis', 'gb')).status).toBe(451);
    resetClaimClosuresCache();
    expect((await open('/en/book/hamlet/analysis', 'XX')).status).not.toBe(451);
  });

  it('блок на весь мир и на все языки - 451 и без страны', async () => {
    expect((await open('/ru/book/emma/analysis')).status).toBe(451);
  });

  it('список один на окно кэша: второй заход не ходит в бэкенд', async () => {
    await open('/en/book/hamlet/analysis', 'GB');
    await open('/en/book/hamlet/analysis', 'US');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('бэкенд не ответил и списка не было - открыто', async () => {
    fetchMock.mockRejectedValue(new Error('down'));
    expect((await open('/en/book/hamlet/analysis', 'GB')).status).not.toBe(451);
  });

  // F04-3 (D4, решение арбитра `F04 | F04-3`): разделы пересказа закрыты тем же списком, что анализ,
  // со своим заголовком и текстом (`product.md` §5а), без «в вашей стране».
  describe('раздел пересказа /summary/{n}', () => {
    it('страна блока - 451 своим экраном, номер без раздела тоже, не кэшируется', async () => {
      for (const path of ['/en/book/hamlet/summary/1', '/en/book/hamlet/summary/7']) {
        const response = await open(path, 'GB');
        expect(response.status).toBe(451);
        expect(response.headers.get('cache-control')).toBe('private, no-store');
        const text = decodeEntities(await response.text());
        expect(text).toContain('<title>Section unavailable</title>');
        expect(text).toContain('>Section unavailable</h1>');
        expect(text).toContain(
          'This section summary is unavailable because of rights restrictions. The book page stays open.'
        );
        expect(text).not.toContain(getDictionary('en').rightsBlocked.title);
        expect(text).toContain('href="/en/book/hamlet"');
        expect(text).toContain('href="/en/catalog"');
      }
    });

    it.each(SUPPORTED_LANGS)('%s: экран 451 раздела на языке страницы', async (lang) => {
      const response = await open(`/${lang}/book/emma/summary/2`);
      const text = decodeEntities(await response.text());
      const strings = summarySectionClosedStrings[lang];
      expect(strings.summarySectionClosedTitle.trim()).not.toBe('');
      expect(response.status).toBe(451);
      expect(text).toContain(`<html lang="${lang}">`);
      expect(text).toContain(`>${strings.summarySectionClosedTitle}</h1>`);
      expect(text).toContain(strings.summarySectionClosedMessage);
    });

    it.each([
      ['сам пересказ', '/en/book/hamlet/summary', 'GB'],
      ['кривой номер abc', '/en/book/hamlet/summary/abc', 'GB'],
      ['кривой номер 01', '/en/book/hamlet/summary/01', 'GB'],
      ['глубже номера', '/en/book/hamlet/summary/1/x', 'GB'],
      ['другая страна', '/en/book/hamlet/summary/1', 'US'],
      ['истёкший блок', '/en/book/carol/summary/1', 'DE'],
    ])('%s - открыто', async (_name, path, country) => {
      const response = await open(path, country);
      expect(response.status).not.toBe(451);
    });

    it('блок на весь мир - 451 и без страны', async () => {
      expect((await open('/ru/book/emma/summary/1')).status).toBe(451);
    });
  });
});
