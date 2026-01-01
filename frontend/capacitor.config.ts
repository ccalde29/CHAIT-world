import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.chaitworld.app',
  appName: 'CHAIT World',
  webDir: 'build',
  server: {
    iosScheme: 'chaitworld',
    androidScheme: 'chaitworld'
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
  },
};

export default config;
