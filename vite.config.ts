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
          // Keep heavyweight dependencies out of the initial application bundle.
          // Split D3 modules separately so charts do not become one new oversized chunk.
          manualChunks(id) {
            const normalizedId = id.replace(/\\/g, '/');
            const marker = '/node_modules/';
            const markerIndex = normalizedId.lastIndexOf(marker);

            if (markerIndex !== -1) {
              const packagePath = normalizedId.slice(markerIndex + marker.length);
              const parts = packagePath.split('/');
              const packageName = parts[0];

              if (packageName === '@firebase' && parts[1]) {
                return `vendor-firebase-${parts[1].replace(/[^a-zA-Z0-9_-]/g, '-')}`;
              }

              if (packageName === 'firebase' && parts[1]) {
                return `vendor-firebase-${parts[1].replace(/[^a-zA-Z0-9_-]/g, '-')}`;
              }

              if (packageName === 'recharts') {
                return 'vendor-recharts';
              }

              if (packageName.startsWith('d3-')) {
                return `vendor-${packageName}`;
              }

              if (packageName === '@vis.gl' && parts[1] === 'react-google-maps') {
                return 'vendor-google-maps';
              }
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
    build: {
      chunkSizeWarningLimit: 750,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              if (id.includes('@vis.gl') || id.includes('google-maps')) {
                return 'vendor-maps';
              }
              if (id.includes('lucide-react')) {
                return 'vendor-icons';
              }
              if (id.includes('motion')) {
                return 'vendor-motion';
              }
            }
          },
        },
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
