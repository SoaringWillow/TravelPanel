import type { Metadata } from 'next';
import './globals.css';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { ResourceBanner } from '@/components/ResourceBanner';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { ThemeProvider } from '@/components/ThemeProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import OfflineHandler from '@/components/OfflineHandler';
import ProximityToast from '@/components/ProximityToast';

export const metadata: Metadata = {
  title: 'TravelPanel - AI Trip Planner',
  description: 'Map-centric travel app where AI extracts locations from social media links and helps you plan routes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TravelPanel" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-180.png" />
        <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-167.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-120.png" />
        {/* FOUC prevention: apply dark class before first paint */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('tp_theme')||'system';if(t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme:dark)').matches))document.documentElement.classList.add('dark')}catch(e){}})()` }} />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors">
        <ErrorBoundary>
          <ThemeProvider>
            <CapacitorBridge />
            <AnalyticsProvider />
            <ResourceBanner />
            <OfflineHandler />
            <ProximityToast />
            <div className="min-h-screen">
              {children}
            </div>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}

