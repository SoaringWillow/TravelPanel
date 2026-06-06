import type { CapacitorConfig } from '@capacitor/cli';

// In development, set CAPACITOR_SERVER_URL to your machine's local IP:
//   CAPACITOR_SERVER_URL=http://192.168.1.100:3000 npm run ios:dev
// In production, set CAPACITOR_SERVER_URL to your deployed Vercel URL:
//   CAPACITOR_SERVER_URL=https://your-app.vercel.app npm run ios:build
const serverUrl = process.env.CAPACITOR_SERVER_URL;

const config: CapacitorConfig = {
  appId: 'com.travelpanel.app',
  appName: 'TravelPanel',
  webDir: 'out',
  server: {
    ...(serverUrl ? { url: serverUrl, cleartext: serverUrl.startsWith('http://') } : {}),
    iosScheme: 'https',
    androidScheme: 'https',
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#6366f1',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    Preferences: {
      // Match the App Group suite in ShareViewController.swift so the Share Extension
      // can write pendingShareImage / pendingShareURL into the same store that
      // CapacitorBridge reads from.
      group: 'group.com.travelpanel.app',
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#6366f1',
      showSpinner: false,
      launchAutoHide: false,
      splashFullScreen: true,
      splashImmersive: false,
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#6366f1',
      overlaysWebView: false,
    },
  },
};

export default config;
