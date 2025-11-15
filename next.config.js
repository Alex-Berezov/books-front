/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'src', 'lib', 'components'],
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.bibliaris.com',
      },
      {
        protocol: 'https',
        hostname: '**.com', // Allow all .com domains for testing
      },
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
};

module.exports = nextConfig;
