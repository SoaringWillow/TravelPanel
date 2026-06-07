import type { Metadata } from 'next';
import './globals.css';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { ResourceBanner } from '@/components/ResourceBanner';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ToastProvider } from '@/components/Toast';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata: Metadata = {
  title: 'TravelPanel — AI Travel Planner',
  description: 'Clip travel inspiration from social media, extract locations automatically, and generate AI-powered trip itineraries.',
  applicationName: 'TravelPanel',
  appleWebApp: {
    capable: true,
    title: 'TravelPanel',
    statusBarStyle: 'default',
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
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TravelPanel" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <ToastProvider>
          <CapacitorBridge />
          <AnalyticsProvider />
          <OfflineBanner />
          <ResourceBanner />
          <div className="min-h-screen">
            {children}
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}

