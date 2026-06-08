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
    backgroundColor: '#f9fafb',
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: false,
  },
  plugins: {
    // Preferences must share the same App Group as the Share Extension so that
    // the extension can write pendingShareImage/URL/Title and the main app can
    // read them.  Requires "App Groups" capability enabled for BOTH the App target
    // and the ShareExtension target in Xcode (see ios/App/ShareExtension/XCODE_SETUP.md).
    Preferences: {
      group: 'group.com.travelpanel.app',
    },
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#f9fafb',
      showSpinner: false,
      launchAutoHide: false,
    },
    StatusBar: {
      style: 'Default',
      backgroundColor: '#6366f1',
      overlaysWebView: false,
    },
  },
};

export default config;
