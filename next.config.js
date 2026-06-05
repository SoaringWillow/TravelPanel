const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
  runtimeCaching: [
    // Cache MapLibre tile requests for offline map browsing
    {
      urlPattern: /^https:\/\/tiles\.openfreemap\.org\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'maplibre-tiles',
        expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 }, // 7 days
        cacheableResponse: { statuses: [0, 200] },
      },
    },
    // Cache MapLibre style JSON
    {
      urlPattern: /^https:\/\/tiles\.openfreemap\.org\/styles\/.*/i,
      handler: 'StaleWhileRevalidate',
      options: { cacheName: 'maplibre-style' },
    },
  ],
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
