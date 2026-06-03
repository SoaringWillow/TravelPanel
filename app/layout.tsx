import type { Metadata } from 'next';
import './globals.css';
import { CapacitorBridge } from '@/components/CapacitorBridge';
import { ResourceBanner } from '@/components/ResourceBanner';
import { AnalyticsProvider } from '@/components/AnalyticsProvider';

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
        {/* Sync dark class before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){var q=window.matchMedia('(prefers-color-scheme: dark)');if(q.matches)document.documentElement.classList.add('dark');q.addEventListener('change',function(e){document.documentElement.classList.toggle('dark',e.matches);});})();` }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#6366f1" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#1e1b4b" />
        <meta name="color-scheme" content="light dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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

