import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['hdq.tail095a21.ts.net'],
  },
  build: {
    rollupOptions: {
      input: ['index.html', 'spacer-ring/index.html'],
    },
  },
});
