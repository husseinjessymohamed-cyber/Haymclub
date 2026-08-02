import {
  defineConfig,
  mergeConfig,
  type UserConfig,
} from 'vite';

import baseConfig from './vite.config.haymclub-base.ts';

const codespaceName =
  process.env.CODESPACE_NAME;

const forwardingDomain =
  process.env
    .GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN;

const forwardedHost =
  codespaceName && forwardingDomain
    ? `${codespaceName}-5173.${forwardingDomain}`
    : undefined;

export default defineConfig(() => {
  const codespaceOptions = forwardedHost
    ? {
        allowedHosts: [
          forwardedHost,
        ],

        hmr: {
          protocol: 'wss' as const,
          host: forwardedHost,
          clientPort: 443,
        },
      }
    : {};

  return mergeConfig(
    baseConfig as UserConfig,
    {
      server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,

        ...codespaceOptions,

        proxy: {
          '/api': {
            target:
              'http://127.0.0.1:3000',

            changeOrigin: true,
            secure: false,
            ws: true,
          },
        },
      },

      preview: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
      },
    },
  );
});
