/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    // Enable the app directory for Next 13
    appDir: true
  }
};

module.exports = nextConfig;