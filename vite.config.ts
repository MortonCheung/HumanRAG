/// <reference types="vitest/config" />
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
    entries: ['index.html'],
    exclude: ['iTeach-design-references']
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['iTeach-design-references/**', 'node_modules/**', 'dist/**', 'output/**'],
  },
  build: {
    target: 'es2022',
    // Three.js, R3F and postprocessing stay in the lazy scene entry. 1.2 MB is
    // an intentional ceiling for that optional WebGL runtime, not the initial shell.
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (
            id.includes('/three/') ||
            id.includes('@react-three') ||
            id.includes('three-stdlib') ||
            id.includes('camera-controls') ||
            id.includes('/postprocessing/') ||
            id.includes('/gsap/') ||
            id.includes('@gsap/')
          ) return 'spatial-runtime';
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('scheduler')) return 'react-runtime';
          if (id.includes('/motion/') || id.includes('framer-motion')) return 'motion-runtime';
          if (id.includes('@phosphor-icons')) return 'icons';
          return undefined;
        },
      },
    },
  },
});
