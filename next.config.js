/** @type {import('next').NextConfig} */
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
  try {
    const { hostname, protocol } = new URL(mediaCdnUrl);
    return { hostname, protocol: protocol.replace(':', '') };
  } catch {
    return undefined;
  }
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
     * `media.bibliaris.com` стоит статической записью, а не только через переменную выше:
     * `NEXT_PUBLIC_MEDIA_CDN_URL` не передаётся в продовую сборку (`Dockerfile`, `deploy.yml`),
     * поэтому в проде условная запись не собирается вовсе. Разобрано в `LEGACY-279`.
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
