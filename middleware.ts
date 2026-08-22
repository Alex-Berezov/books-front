/**
 * Middleware for route protection
 *
 * Checks authorization and user roles for admin panel access.
 * All routes under /admin/* require authorization and admin or content_manager role.
 */

import { NextResponse } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { ADMIN_PANEL_ROLES } from '@/lib/auth/constants';
import { DEFAULT_REDIRECT_LANG } from '@/lib/middleware.constants';
import { getSiteUrl } from '@/lib/seo/urls';
import type { NextRequest } from 'next/server';

/**
 * Check if path is admin route
 */
const isAdminRoute = (pathname: string): boolean => {
  return pathname.startsWith('/admin');
};

/**
 * Личных маршрутов среди контентных больше нет.
 *
 * Решение владельца продукта от 22.08.2026 отменяет решение от 15.08.2026:
 * чтение, прослушивание и саммари бесплатны и **не требуют входа**. Регистрация
 * даёт дополнительное — комментарии, полку, прогресс между устройствами, — но не
 * доступ к тексту. Прежний гейт (`PRIVATE_SECTION_PATTERN`, `PRIVATE_BOOK_PATTERN`,
 * `isPrivateRoute`) снят здесь целиком вместе с посадками в
 * `__tests__/middleware.test.ts`.
 *
 * ⚠️ Это не регрессия `LEGACY-175`. Та запись говорила, что гейт не покрывает живые
 * читалку и плеер, — при отсутствии гейта покрывать нечего. Возвращать шаблоны
 * «по реестру техдолга» нельзя: реестр помечен как отменённый по этому решению
 * (`books-app-docs/ai-context/legacy-warnings.md`, `LEGACY-175`).
 *
 * Бэкенд своего рубежа на этих маршрутах не имел и не имеет: `GET chapters/:id`,
 * `GET versions/:id/audio-chapters` и `reader-bootstrap` публичны. Ограничения по
 * стране и правам (`assertAccess`, скоупы `TEXT_READER`/`AUDIO`) действуют
 * независимо от авторизации и этой правкой не затронуты.
 *
 * Личным остаётся только `/admin/**` — см. `isAdminRoute` выше.
 */

/**
 * Extract language from path (handles admin and public paths)
 */
const extractLangFromPath = (pathname: string): string => {
  const match = pathname.match(/^\/(?:admin\/)?([a-z]{2})/);
  return match ? match[1] : DEFAULT_REDIRECT_LANG;
};

/**
 * Расширения статики — единственное, что исключается из обработки по точке в
 * адресе.
 *
 * 🔴 **Общий шаблон «точка и любой хвост» исключал содержательные адреса**
 * (`LEGACY-135`): `/en/read/hamlet.v2` и `/admin/en/books/1.5` уходили в
 * приложение мимо гейта ролей и мимо нормализации. Перечень закрыт: новый тип
 * статики добавляется сюда осознанно, а слаг с точкой остаётся страницей.
 *
 * ⚠️ Тот же перечень продублирован строкой в `config.matcher` ниже — Next
 * анализирует matcher статически и переменную туда подставить нельзя. Чтобы
 * дубликат не разъехался молча, перечень объявлен **списком**, а не готовой
 * регуляркой: тест разбирает альтернативу из `config.matcher` и сверяет её с
 * этим списком по составу. Третьей копии в тесте нет.
 *
 * ⚠️ Перечень выключает адрес из middleware целиком, включая `/admin/**`:
 * гипотетический `/admin/en/users/1.json` гейт роли на этом рубеже не увидит.
 * Второй рубеж — `app/admin/[lang]/layout.tsx` — на месте, поэтому это
 * эшелонирование, а не дыра; но помнить об этом при добавлении расширений.
 */
export const STATIC_ASSET_EXTENSIONS = [
  'ico',
  'png',
  'jpg',
  'jpeg',
  'webp',
  'avif',
  'gif',
  'svg',
  'css',
  'js',
  'mjs',
  'map',
  'txt',
  'xml',
  // 🔴 `xsl` и `html` — не теория. `public/sitemap.xsl` подключён к каждой карте
  // сайта (`lib/sitemap/utils.ts`), а файлы подтверждения владения доменом
  // (`google<смешанныйРегистр>.html`, `yandex_*.html`) кладут в `public/` со
  // смешанным регистром в имени: под правилом «uppercase -> lowercase» такой
  // файл получил бы 301 на несуществующий адрес, и подтверждение отвалилось бы.
  'xsl',
  'html',
  'webmanifest',
  'json',
  'woff',
  'woff2',
  'ttf',
  'eot',
  'mp3',
  'm4a',
  'ogg',
  'wav',
  'pdf',
  'epub',
];

export const STATIC_ASSET_PATTERN = new RegExp(`\\.(?:${STATIC_ASSET_EXTENSIONS.join('|')})$`, 'i');

/**
 * Check if path is a page route (not static asset, api, etc.)
 */
const isPagePath = (pathname: string): boolean => {
  if (pathname.startsWith('/_next') || pathname.startsWith('/api')) {
    return false;
  }
  if (STATIC_ASSET_PATTERN.test(pathname)) {
    return false;
  }
  return true;
};

/**
 * Петлевой адрес — единственный случай, когда редирект остаётся на хосте
 * запроса: это либо локальная разработка, либо проверка живости изнутри
 * контейнера.
 *
 * 🔴 Шаблон заякорен намеренно. Прежняя проверка `host.includes('localhost')`
 * принимала `localhost.evil.example`, то есть открывала ровно ту дыру, ради
 * которой закрывается `LEGACY-134`. Заякоренный шаблон впустить чужой домен не
 * может, а петля наружу не ведёт: подмена `Host` на `127.0.0.1` уводит
 * посетителя на его же машину, а не на сайт злоумышленника.
 */
const LOCAL_HOST_PATTERN = /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i;

/**
 * Middleware function
 */
export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const host = request.headers.get('host') || request.nextUrl.host;
  const proto = request.headers.get('x-forwarded-proto') || 'https';

  // 🔴 `LEGACY-134`. Origin ответа берётся из настроек, а не из запроса.
  // Заголовок `Host` подконтролен клиенту: подставленный в `Location`, он
  // превращал 301 в открытое перенаправление — постоянное и кэшируемое.
  // `host` ниже читается только как признак (www-вариант, петлевой адрес) и в
  // адрес ответа не попадает.
  //
  // ⚠️ Исключение для петли — не удобство разработки, а требование эксплуатации:
  // проверка живости контейнера ходит на `http://127.0.0.1:3000/`
  // (`Dockerfile`, `docker-compose.prod.yml`), и абсолютный адрес публичного
  // сайта в ответе увёл бы её из контейнера в интернет — она мерила бы прод и
  // зеленела на мёртвом контейнере. По `NODE_ENV` это исключение не разделить:
  // в контейнере как раз `production`.
  const isLoopbackHost = LOCAL_HOST_PATTERN.test(host);
  const requestProto = request.nextUrl.protocol.replace(':', '');
  const redirectOrigin = isLoopbackHost ? `${requestProto}://${host}` : getSiteUrl();

  /**
   * Единственный способ собрать адрес ответа в этом файле.
   *
   * 🔴 `new URL(путь, request.url)` не годится: `request.url` Next строит из
   * заголовка `Host`, поэтому чужой хост доезжал до `Location` во **всех**
   * редиректах функции, а не только в 301-нормализации. Ревью нашло это после
   * первой правки записи — она чинила один выход из четырёх.
   *
   * 🔴 `new URL(путь, origin)` тоже не годится: путь вида `//evil.example/foo`
   * протокольно относителен и разрешается в чужой хост. Origin задаётся первым,
   * путь кладётся в `pathname` (этот сеттер хост не меняет), ведущие слэши и
   * обратные слэши схлопываются.
   */
  const buildRedirectUrl = (path: string, searchString = ''): URL => {
    const url = new URL(redirectOrigin);
    url.pathname = `/${path.replace(/^[/\\]+/, '')}`;
    url.search = searchString;
    return url;
  };

  /** Путь запроса, пригодный для `callbackUrl`: без ведущей двойной косой. */
  const safePathname = `/${pathname.replace(/^[/\\]+/, '')}`;

  // Instant redirect for root path '/' to default language
  if (pathname === '/') {
    return NextResponse.redirect(buildRedirectUrl(`/${DEFAULT_REDIRECT_LANG}`));
  }

  let shouldRedirect = false;
  let targetPathname = pathname;

  // 1. http -> https (excluding local development)
  if (proto === 'http' && !isLoopbackHost) {
    shouldRedirect = true;
  }

  // 2. www -> non-www
  if (host.toLowerCase().startsWith('www.')) {
    shouldRedirect = true;
  }

  // 3. uppercase -> lowercase path
  if (isPagePath(pathname) && /[A-Z]/.test(pathname)) {
    targetPathname = pathname.toLowerCase();
    shouldRedirect = true;
  }

  if (shouldRedirect) {
    const redirectUrl = buildRedirectUrl(targetPathname, search);
    // Текущий адрес собирается строкой, а не через `new URL`: `host` может быть
    // любым, и разбор мусорного значения уронил бы middleware целиком.
    //
    // ⚠️ Схема берётся из `proto`, то есть из `x-forwarded-proto`, — из того же
    // источника, по которому принято решение редиректить. Прежний вариант
    // сравнивал с `request.nextUrl.protocol`, а он считается из того же
    // заголовка, но с **другим умолчанием**: Next при отсутствии заголовка
    // берёт `http`, код здесь — `https`. На расхождении умолчаний редирект с
    // http на https сам себя отменял как «адрес не изменился».
    const currentUrl = `${proto}://${host}${pathname}${search}`;

    if (redirectUrl.toString() !== currentUrl) {
      return NextResponse.redirect(redirectUrl, 301);
    }
  }

  // For non-admin routes, skip auth checks
  if (!isAdminRoute(pathname)) {
    return NextResponse.next();
  }

  // Get session token for protected routes
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: !isLoopbackHost,
  });

  // 🔴 `LEGACY-136`. Здесь стоял блок «DIAGNOSTIC: temporary logging»: на каждый
  // запрос к `/admin` он печатал в поток контейнера почту, роли и весь объект
  // `user` из токена. Логи выката читает кто угодно, срока хранения у них нет.
  // Персональные данные из токена и cookie в middleware не печатаются вовсе —
  // ни под флагом отладки, ни временно.

  // Check admin routes
  if (isAdminRoute(pathname)) {
    // If no session - redirect to login
    if (!token) {
      const lang = extractLangFromPath(pathname);
      const signInUrl = buildRedirectUrl(`/${lang}/auth/sign-in`);
      signInUrl.searchParams.set('callbackUrl', safePathname);
      return NextResponse.redirect(signInUrl);
    }

    // Check for an admin-panel role (admin, content_manager or lawyer).
    // A lawyer is let in but sees only the legal sections — the sidebar filters by role.
    const userRoles = (token.roles as string[]) || [];
    const hasAdminPanelRole = ADMIN_PANEL_ROLES.some((role) => userRoles.includes(role));

    // If no required role - show 403
    if (!hasAdminPanelRole) {
      const lang = extractLangFromPath(pathname);
      return NextResponse.redirect(buildRedirectUrl(`/${lang}/403`));
    }
  }

  // All OK - pass the request
  return NextResponse.next();
}

/**
 * Matcher configuration - which paths the middleware applies to
 */
export const config = {
  /**
   * 🔴 **Один широкий шаблон, а не список маршрутов — и это не стиль, а
   * необходимость.** Next компилирует `matcher` в регистро**зависимую**
   * регулярку (`new RegExp(matcher.regexp)` без флага `i`), поэтому
   * перечисление вида `/:lang(ru|en|es|fr|pt)/book/:path*` не ловит
   * `/en/Book/Slug` — ровно тот адрес, ради нормализации которого запись
   * `LEGACY-083` и заведена. Проверено на установленной версии Next:
   * `/en/book/hamlet` совпадает, `/en/Book/Hamlet` и `/EN/book/hamlet` — нет.
   *
   * Перечисление вдобавок промахивалось мимо хабов таксономий
   * (`/en/categories`, `/en/genres`, `/en/collections`, `/en/tags`) и мимо
   * catch-all CMS-страниц, хотя их адреса карта сайта публикует.
   *
   * Исключения — статика и API: у первых есть расширение **из перечня**, вторые
   * обслуживаются не страницами. Остальное отбирают предикаты в коде:
   * `isPagePath` нормализует, `isAdminRoute` гейтит.
   *
   * 🔴 **Перечень расширений вместо общего хвоста `.*\.[a-zA-Z0-9]+$`**
   * (`LEGACY-135`). Общий шаблон выкидывал из middleware любой адрес с точкой в
   * последнем сегменте: `/admin/en/books/1.5` шёл в приложение без проверки
   * роли, `/en/read/hamlet.v2` — без 301. Перечень обязан совпадать
   * по составу со списком `STATIC_ASSET_EXTENSIONS` выше (`STATIC_ASSET_PATTERN`
   * из него выводится); подставить переменную сюда нельзя — Next
   * разбирает matcher статически, — поэтому расхождение стережёт тест.
   *
   * ⚠️ Побочный эффект: список языков больше нигде в этом файле не дублируется,
   * так что добавление языка в `SUPPORTED_LANGS` не оставляет здесь протухших
   * строк.
   */
  matcher: [
    '/((?!_next/|api/|.*\\.(?:ico|png|jpg|jpeg|webp|avif|gif|svg|css|js|mjs|map|txt|xml|xsl|html|webmanifest|json|woff|woff2|ttf|eot|mp3|m4a|ogg|wav|pdf|epub)$).*)',
  ],
};
