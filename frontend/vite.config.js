import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { compression } from 'vite-plugin-compression2'
import connectCompression from 'compression'

// Inline plugin: adds gzip middleware to both dev and preview servers
const devCompression = {
  name: 'dev-compression',
  configureServer(server) {
    server.middlewares.use(connectCompression())
  },
  configurePreviewServer(server) {
    server.middlewares.use(connectCompression())
  },
}

export default defineConfig({
  plugins: [
    react(),
    devCompression,
    // Pre-compress build output with gzip and brotli
    compression({ algorithm: 'gzip',          include: /\.(js|css|html|svg|json)$/ }),
    compression({ algorithm: 'brotliCompress', include: /\.(js|css|html|svg|json)$/, ext: '.br' }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts': ['recharts'],
          'vendor-socket': ['socket.io-client'],
          'vendor-xlsx':   ['xlsx'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
