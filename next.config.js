const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
  openAnalyzer: false,
});

const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Packages that are already imported dynamically (large): MapLibre, jsPDF
  // Run: ANALYZE=true npm run build  to generate bundle report in .next/analyze/
};

module.exports = withBundleAnalyzer(withPWA(nextConfig));
