import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.menumoney',
  appName: 'TTSERVICE-LOAN',
  webDir: 'dist',
  
  server: {
    url: "https://ttservice-loan.onrender.com",
    cleartext: false,
  },
};

export default config;
