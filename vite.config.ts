import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { host: '0.0.0.0', port: 5174 },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/ai-assistant-v2-[hash].js',
        chunkFileNames: 'assets/ai-assistant-v2-[hash].js',
        assetFileNames: 'assets/ai-assistant-v2-[hash].[ext]',
      },
    },
  },
});
