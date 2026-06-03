const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache OpenFreeMap vector tiles — stale-while-revalidate, up to 500 tiles
    {
      urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'openfreemap-tiles',
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 1 week
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Cache MapLibre GL styles
    {
      urlPattern: /^https:\/\/tiles\.openfreemap\.org\/styles\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'maplibre-styles',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 24 * 60 * 60,
        },
        cacheableResponse: { statuses: [0, 200] },
      },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
