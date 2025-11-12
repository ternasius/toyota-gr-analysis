import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { copyDatasetsPlugin } from './vite-plugin-copy-datasets'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode (available for future use)
  loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react(), copyDatasetsPlugin()],
    publicDir: 'public',
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '@/components': path.resolve(__dirname, './src/components'),
        '@/lib': path.resolve(__dirname, './src/lib'),
        '@/hooks': path.resolve(__dirname, './src/hooks'),
        '@/store': path.resolve(__dirname, './src/store'),
        '@/types': path.resolve(__dirname, './src/types'),
        '@/utils': path.resolve(__dirname, './src/utils'),
      },
    },
    build: {
      // Production optimizations (Requirement 14.2)
      minify: 'esbuild', // Use esbuild for fast minification
      
      // Enable source maps for production debugging (Task 17.1)
      sourcemap: mode === 'production' ? 'hidden' : true,
      
      // Target modern browsers for smaller bundle size
      target: 'es2020',
      
      // Code splitting configuration
      rollupOptions: {
        output: {
          manualChunks: {
            // Split Plotly.js into its own chunk (large library)
            'plotly': ['plotly.js-dist-min'],
            // Split React and related libraries
            'react-vendor': ['react', 'react-dom'],
            // Split state management
            'store': ['zustand', 'idb'],
            // Split utilities
            'utils': ['pako'],
          },
          // Asset file naming for better caching
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name?.split('.')
            const ext = info?.[info.length - 1]
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
              return `assets/images/[name]-[hash][extname]`
            } else if (/woff2?|ttf|otf|eot/i.test(ext || '')) {
              return `assets/fonts/[name]-[hash][extname]`
            }
            return `assets/[name]-[hash][extname]`
          },
          chunkFileNames: 'assets/js/[name]-[hash].js',
          entryFileNames: 'assets/js/[name]-[hash].js',
        },
      },
      
      // Chunk size warnings
      chunkSizeWarningLimit: 1000, // 1MB
      
      // Report compressed size (includes gzip)
      reportCompressedSize: true,
      
      // CSS code splitting
      cssCodeSplit: true,
    },
    
    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'zustand', 'idb', 'pako', 'plotly.js-dist-min'],
      exclude: [],
    },
    
    // Server configuration for development
    server: {
      port: 3000,
      strictPort: false,
      open: true,
      fs: {
        // Allow serving files from the parent directory (for datasets_trimmed)
        allow: ['..'],
      },
    },
    
    // Preview server configuration
    preview: {
      port: 4173,
      strictPort: false,
      open: true,
    },
    
    // Define environment variables (Task 17.1)
    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
    },
  }
})
