import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.danielespinosa.entrenoapp',
  appName: 'EntrenoApp',
  webDir: 'out',
  backgroundColor: '#000000',
  server: {
    url: 'https://entrenoapp-blond.vercel.app',
    cleartext: false,
  },
  ios: {
    contentInset: 'always',
    preferredContentMode: 'mobile',
    scheme: 'EntrenoApp',
    backgroundColor: '#000000',
  },
  android: {
    allowMixedContent: true,
    backgroundColor: '#000000',
  },
};

export default config;
