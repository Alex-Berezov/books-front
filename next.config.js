/** @type {import('next').NextConfig} */
const mediaCdnUrl =
  process.env.NEXT_PUBLIC_MEDIA_CDN_URL || process.env.NEXT_PUBLIC_UPLOADS_BASE_URL;
const mediaCdnHostname = mediaCdnUrl ? new URL(mediaCdnUrl).hostname : undefined;

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'src', 'lib', 'components'],
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    imageSizes: [96, 112, 144, 176, 205, 256, 320],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bibliaris.com',
      },
      ...(mediaCdnHostname ? [{ protocol: 'https', hostname: mediaCdnHostname }] : []),
      {
        protocol: 'https',
        hostname: '**.com',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

module.exports = nextConfig;
