/** @type {import('next').NextConfig} */
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
