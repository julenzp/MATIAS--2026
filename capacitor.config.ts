import type { CapacitorConfig } from '@capacitor/cli';

// Para desarrollo con hot-reload, descomenta la sección 'server' abajo
// Para producción, déjala comentada para usar los archivos locales en 'dist'
const config: CapacitorConfig = {
  appId: 'app.lovable.a6824366b05841ccbfe9162709097b3e',
  appName: 'companion-route-planner',
  webDir: 'dist',
  // IMPORTANTE: Para producción, comenta la sección 'server' 
  // Solo descomenta para desarrollo con hot-reload
  // server: {
  //   url: 'https://a6824366-b058-41cc-bfe9-162709097b3e.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // }
};

export default config;
