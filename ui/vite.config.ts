import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Frank serves this build from his own origin (ADR-006), so the app calls
  // /mcp relatively and there is no VITE_FRANK_URL and no CORS. In dev the
  // console runs on Vite's port, so proxy /mcp to a locally running Frank.
  server: {
    proxy: {
      '/mcp': { target: 'http://127.0.0.1:3000', changeOrigin: true },
      '/healthz': { target: 'http://127.0.0.1:3000', changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['test/**/*.test.tsx', 'test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
