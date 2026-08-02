import { defineConfig, mergeConfig } from 'vite';
import baseConfig from './vite.config';

export default defineConfig(async (environment) => {
  const resolvedBase =
    typeof baseConfig === 'function'
      ? await (baseConfig as any)(environment)
      : await baseConfig;

  const codespaceName = process.env.CODESPACE_NAME;
  const publicHost = codespaceName
    ? `${codespaceName}-5173.app.github.dev`
    : undefined;

  return mergeConfig(resolvedBase as any, {
    server: {
      host: '0.0.0.0',
      port: 5173,
      strictPort: true,

      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3000',
          changeOrigin: true,
          secure: false,
        },
      },

      hmr: publicHost
        ? {
            protocol: 'wss',
            host: publicHost,
            clientPort: 443,
          }
        : true,
    },
  });
});
