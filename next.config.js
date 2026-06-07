const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output for optimised Vercel deployment
  output: 'standalone',

  // Suppress noisy warnings from maplibre-gl and framer-motion in build output
  webpack(config, { isServer }) {
    if (!isServer) {
      // Maplibre uses node builtins — tell webpack to ignore them in the browser
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
