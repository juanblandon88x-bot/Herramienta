import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  //
  server: {
    proxy: {
      '/api/1win': {
        target: 'https://test-eight-sepia-52.vercel.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/1win/, '/1win'),
      },
    },
  },
});
