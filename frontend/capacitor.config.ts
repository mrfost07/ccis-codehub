import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snsu.cciscodehub',
  appName: 'CCIS CodeHub',
  webDir: 'dist',
  server: {
    url: 'https://ccis-codehub.space',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
