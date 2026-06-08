const withPWA = require('next-pwa')({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

const { withSentryConfig } = require('@sentry/nextjs');

/** @type {import('next').NextConfig} */
const nextConfig = {};

const configWithPWA = withPWA(nextConfig);

// Only wrap with Sentry when the DSN is provided — keeps dev builds lean.
module.exports = process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(configWithPWA, {
      silent: true,
      org: undefined,
      project: undefined,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : configWithPWA;
