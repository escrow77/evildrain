/** @type {import('next').NextConfig} */

require('dotenv').config(); //Load .env variables

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  reactStrictMode: true,
  trailingSlash: true,
};

module.exports = nextConfig;
