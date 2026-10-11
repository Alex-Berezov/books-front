/** @type {import('next').NextConfig} */
// Имя переменной запоминается вместе со значением: в игре всегда ровно одна из двух,
// и сообщение об отказе ниже обязано назвать именно ту, куда смотреть.
const mediaCdnVar = process.env.NEXT_PUBLIC_MEDIA_CDN_URL
  ? 'NEXT_PUBLIC_MEDIA_CDN_URL'
  : 'NEXT_PUBLIC_UPLOADS_BASE_URL';
const mediaCdnUrl =
  process.env.NEXT_PUBLIC_MEDIA_CDN_URL || process.env.NEXT_PUBLIC_UPLOADS_BASE_URL;
// LEGACY-456. `localhost` в прод-конфиге превращал `/_next/image?url=http://localhost:<порт>/...`
// в обход во внутренние сервисы контейнера: запись стоит только вне прода. Из переменной выше
// в проде не берётся ни один `http`-адрес (`localhost`, `127.0.0.1`, `minio:9000`): это тот же
// обход, а предикат `lib/utils/image-host.ts` в проде по `http` и так не пропускает ничего.
const isProduction = process.env.NODE_ENV === 'production';
// Негодное значение переменной (без схемы, с пробелом, пустая строка) роняло бы загрузку
// самого конфига с `TypeError: Invalid URL` — то есть и `next dev`, и `next build`, без имени
// переменной в сообщении. Статические записи ниже дают рабочий набор и без неё.
//
// Схема берётся из самой переменной, а не ставится `https` вслепую: локальное значение
// `http://localhost:8787` из `.env.example` давало запись, не совпадающую ни с чем, и молча.
const mediaCdn = (() => {
  if (!mediaCdnUrl) return undefined;
  let parsed;
  try {
    parsed = new URL(mediaCdnUrl);
  } catch {
    return undefined;
  }
  // 🔴 Подстановка отсюда воссоздала бы LEGACY-137 в обход всего: значение живёт
  // в настройках репозитория, а не в коде, — его не видит ни ревьюер, ни замок
  // перед коммитом, ни сторож `__tests__/next.config.test.ts` (тот читает конфиг
  // при снятых переменных, чтобы не зависеть от машины прогона). Поэтому здесь
  // отказ, а не отбрасывание: строку в логе сборки при зелёном CI никто не прочтёт.
  // Опечатка в схеме — случайность, она по-прежнему отбрасывается молча, выше.
  if (parsed.hostname.includes('*')) {
    throw new Error(
      mediaCdnVar +
        ': подстановка в имени хоста запрещена (получено "' +
        parsed.hostname +
        '"). Она превращает /_next/image в открытый прокси картинок — LEGACY-137. ' +
        'Укажи точное имя хоста.'
    );
  }
  if (isProduction && parsed.protocol === 'http:') return undefined;
  return { hostname: parsed.hostname, protocol: parsed.protocol.replace(':', '') };
})();

// LEGACY-456. Два заголовка CSP, а не один: `frame-ancestors` в Report-Only браузер игнорирует,
// поэтому запрет встраивания идёт отдельным действующим заголовком, а полная политика пока
// только сообщает о нарушениях. Адреса для отчётов нет: нарушения видны в консоли браузера
// (e2e, ручная проверка). Переход полной политики в enforce — отдельным шагом, вместе
// с адресом для отчётов или после прогона, показавшего, что аналитика и картинки не ломаются.
// `X-Frame-Options` дублирует `frame-ancestors` для браузеров без CSP2.
const reportOnlyCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https:",
  "frame-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

const securityHeaders = [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Content-Security-Policy-Report-Only', value: reportOnlyCsp },
];

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
  // Главная ждёт на сборке `Retry-After` лимитера (60 с) перед повтором в `httpGet`;
  // при умолчании в 60 с Next убил бы воркер раньше повтора (LEGACY-411, решение арбитра 24.09.2026).
  // Хватает, пока главная укладывается в два окна лимитера: у неё три уровня запросов подряд,
  // и каждый может поймать свою паузу (page.tsx) - три паузы по ~70 с в 180 с уже не влезут.
  staticPageGenerationTimeout: 180,
  eslint: {
    // Список каталогов, которые линтует сама сборка. Здесь стоял несуществующий `src`,
    // а `api`, `providers` и `types` не стояли вовсе (LEGACY-151). Состав сверяет
    // `__tests__/lint-coverage.test.ts`, чтобы каталог не выпал снова молча.
    //
    // ⚠️ Полный охват даёт не этот список, а `yarn lint` — он зовёт `eslint` по всему
    // дереву и потому видит и корневые файлы, и тесты. Здесь только исходники продукта:
    // тесты и спеки сборке линтовать незачем.
    dirs: ['app', 'lib', 'components', 'api', 'providers', 'types'],
  },
  images: {
    // LEGACY-448: без `image/avif` — Critical RCE оптимизатора в `next` 14. Частичная мера: AVIF-исходник
    // до `/_next/image` всё ещё доходит, закрывает переезд `T121`; вернуть формат можно только после него.
    formats: ['image/webp'],
    imageSizes: [96, 112, 144, 176, 256, 320],
    /**
     * ⚠️ Подстановка в доменной части верхнего уровня (`**.com` и любая другая) сюда
     * не возвращается ни под каким предлогом, включая «временно, пока подключаем хост»:
     * она превращает `/_next/image` в открытый прокси картинок — чужой трафик и чужой
     * контент отдаются с нашего домена (LEGACY-137). Сторож — `__tests__/next.config.test.ts`.
     *
     * ⚠️ `media.bibliaris.com` стоит статической записью, и **снимать её нельзя**, хотя
     * с 26.08.2026 тот же хост приезжает и из `NEXT_PUBLIC_MEDIA_CDN_URL` (`Dockerfile`,
     * `deploy.yml`, `LEGACY-279`). Она не дубль, а запасной рубеж: незаданное или пустое
     * значение переменной даёт `undefined` молча, и без этой записи в проде не осталось бы
     * ни одной записи на медиа-хост — `/_next/image` ответил бы 400 на каждую обложку.
     * Повтор при заданной переменной безвреден: сопоставление идёт `.some()`.
     */
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bibliaris.com',
      },
      ...(mediaCdn ? [{ protocol: mediaCdn.protocol, hostname: mediaCdn.hostname }] : []),
      {
        protocol: 'https',
        hostname: 'media.bibliaris.com',
      },
      ...(isProduction ? [] : [{ protocol: 'http', hostname: 'localhost' }]),
    ],
  },
};

module.exports = nextConfig;
