import type { Metadata } from 'next';
import './globals.css';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { ResourceBanner } from '@/components/ResourceBanner';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

export const metadata: Metadata = {
  title: 'TravelPanel — AI Trip Planner',
  description: 'Save travel inspiration from any app. AI extracts locations and wisdom, then plans your perfect trip.',
  applicationName: 'TravelPanel',
  appleWebApp: {
    capable: true,
    title: 'TravelPanel',
    statusBarStyle: 'black-translucent',
  },
  icons: {
    apple: [
      { url: '/icon-128.png', sizes: '128x128' },
      { url: '/icon-192.png', sizes: '192x192' },
      { url: '/icon-512.png', sizes: '512x512' },
    ],
    icon: [
      { url: '/icon-16.png', sizes: '16x16' },
      { url: '/icon-32.png', sizes: '32x32' },
    ],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#4F46E5" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="TravelPanel" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" sizes="192x192" href="/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/icon-512.png" />
      </head>
      <body>
        <CapacitorBridge />
        <AnalyticsProvider />
        <ResourceBanner />
        <div className="min-h-screen">
          {children}
        </div>
      </body>
    </html>
  );
}

