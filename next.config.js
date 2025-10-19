/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'src', 'lib', 'components'],
  },
  images: {
    domains: ['api.bibliaris.com'],
  },
};

module.exports = nextConfig;
