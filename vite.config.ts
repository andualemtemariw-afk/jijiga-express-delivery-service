import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        output: {
          // Keep heavyweight libraries out of the initial application bundle.
          // D3 packages are separated individually so the chart vendor chunk
          // does not simply become one new oversized bundle.
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            const firebaseMatch = normalizedId.match(/\\/node_modules\\/(?:@firebase|firebase)\\/([^/]+)/);
            if (firebaseMatch) {
              return `vendor-firebase-${firebaseMatch[1].replace(/[^a-zA-Z0-9_-]/g, '-')}`;
            }

            const chartMatch = normalizedId.match(/\\/node_modules\\/(recharts|d3-[^/]+)/);
            if (chartMatch) {
              return `vendor-${chartMatch[1]}`;
            }

            if (normalizedId.includes('/node_modules/@vis.gl/react-google-maps/')) {
              return 'vendor-google-maps';
            }

            return undefined;
          },
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify - file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    preview: {
      host: '0.0.0.0',
      port: 4173,
      allowedHosts: ['4173-isel300if3xfv0zh21oey-cf5c245a.us1.manus.computer'],
    },
  };
});
