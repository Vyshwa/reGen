import { fileURLToPath, URL } from 'url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import environment from 'vite-plugin-environment';

process.env.STORAGE_GATEWAY_URL = process.env.STORAGE_GATEWAY_URL || 'https://blob.caffeine.ai';

export default defineConfig({
    logLevel: 'info',
    build: {
        emptyOutDir: true,
        sourcemap: false,
        minify: false
    },
    css: {
        postcss: './postcss.config.js'
    },
    optimizeDeps: {
        esbuildOptions: {
            define: {
                global: 'globalThis'
            }
        }
    },
    server: {
        proxy: {
            '/api': {
                target: 'http://127.0.0.1:5000',
                changeOrigin: true
            }
        },
        // ✅ Allow regen.krishub.in as a host
        allowedHosts: ['regen.krishub.in']
    },
    plugins: [
        environment('all', { prefix: 'CANISTER_' }),
        environment('all', { prefix: 'DFX_' }),
        environment(['STORAGE_GATEWAY_URL']),
        react()
    ],
    resolve: {
        alias: [
            {
                find: 'declarations',
                replacement: fileURLToPath(new URL('../declarations', import.meta.url))
            },
            {
                find: '@',
                replacement: fileURLToPath(new URL('./src', import.meta.url))
            }
        ],
        dedupe: ['@dfinity/agent']
    }
});
