import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { 
    host: true, 
    port: 5173,
    fs: {
      deny: ['**/iTeach-design-references/**']
    }
  },
  optimizeDeps: {
    exclude: ['iTeach-design-references']
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/three/') || id.includes('@react-three') || id.includes('three-stdlib') || id.includes('camera-controls')) return 'spatial-runtime';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-runtime';
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion-runtime';
          if (id.includes('@phosphor-icons')) return 'icons';
          return 'vendor';
        },
      },
    },
  },
});
