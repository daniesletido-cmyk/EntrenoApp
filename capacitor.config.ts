import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielespinosa.entrenoapp',
  appName: 'EntrenoApp',
  webDir: 'out',
  server: {
    url: 'https://entrenoapp-production-f07b.up.railway.app',
    cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
