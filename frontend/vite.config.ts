import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, req) => {
            // #region agent log
            fetch(
              'http://127.0.0.1:7617/ingest/2ab143c7-be70-4ef2-abc3-3470b97b6d20',
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Debug-Session-Id': 'a4d11a',
                },
                body: JSON.stringify({
                  sessionId: 'a4d11a',
                  hypothesisId: 'H1-H3',
                  location: 'vite.config.ts:proxy',
                  message: 'vite proxy ECONNREFUSED',
                  data: {
                    url: req?.url,
                    error: String(
                      (err as NodeJS.ErrnoException)?.message ?? err,
                    ),
                    code: (err as NodeJS.ErrnoException)?.code,
                  },
                  timestamp: Date.now(),
                }),
              },
            ).catch(() => {});
            // #endregion
          });
        },
      },
    },
  },
});