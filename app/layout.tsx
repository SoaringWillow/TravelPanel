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
        {/* Dark mode: apply .dark class before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `
(function(){
  function applyTheme(dark){document.documentElement.classList.toggle('dark',dark);}
  var stored=localStorage.getItem('theme');
  if(stored==='dark'){applyTheme(true);}
  else if(stored==='light'){applyTheme(false);}
  else{applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches);}
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',function(e){
    if(!localStorage.getItem('theme'))applyTheme(e.matches);
  });
})();
        `}} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
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

