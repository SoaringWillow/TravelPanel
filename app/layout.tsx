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
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        {/* Inline script to apply dark class before first paint — prevents flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('tp-color-scheme')||'auto';var dark=s==='dark'||(s==='auto'&&window.matchMedia('(prefers-color-scheme:dark)').matches);if(dark)document.documentElement.classList.add('dark')}catch(e){}})();`,
          }}
        />
      </head>
      <body className="bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors">
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

