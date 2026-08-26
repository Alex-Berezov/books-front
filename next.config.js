/** @type {import('next').NextConfig} */
// Имя переменной запоминается вместе со значением: в игре всегда ровно одна из двух,
// и сообщение об отказе ниже обязано назвать именно ту, куда смотреть.
const mediaCdnVar = process.env.NEXT_PUBLIC_MEDIA_CDN_URL
  ? 'NEXT_PUBLIC_MEDIA_CDN_URL'
  : 'NEXT_PUBLIC_UPLOADS_BASE_URL';
const mediaCdnUrl =
  process.env.NEXT_PUBLIC_MEDIA_CDN_URL || process.env.NEXT_PUBLIC_UPLOADS_BASE_URL;
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
  return { hostname: parsed.hostname, protocol: parsed.protocol.replace(':', '') };
})();

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'src', 'lib', 'components'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
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
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

module.exports = nextConfig;
