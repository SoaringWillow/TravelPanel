import type { Metadata } from 'next';
import './globals.css';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { ResourceBanner } from '@/components/ResourceBanner';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';
import { DarkModeSync } from '@/components/DarkModeSync';
import { ClipboardBanner } from '@/components/ClipboardBanner';

export const metadata: Metadata = {
  title: 'TravelPanel - AI Trip Planner',
  description: 'Map-centric travel app where AI extracts locations from social media links and helps you plan routes',
};

// Inline script runs before React hydrates to prevent FOUC in dark mode.
// Reads system preference and applies the 'dark' class to <html> immediately.
const darkModeScript = `
(function(){
  try {
    var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: darkModeScript }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" media="(prefers-color-scheme: light)" />
        <meta name="theme-color" content="#0f1117" media="(prefers-color-scheme: dark)" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body>
        <DarkModeSync />
        <ClipboardBanner />
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

