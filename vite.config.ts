import path from 'node:path';
import { fileURLToPath } from 'node:url';
import build from '@hono/vite-build/cloudflare-workers';
import devServer from '@hono/vite-dev-server';
import tailwindcss from '@tailwindcss/vite';
import honox from 'honox/vite';
import { defineConfig, loadEnv } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), '');

  return {
    define: {
      'process.env.TURSO_DB_URL': JSON.stringify(env.TURSO_DB_URL),
      'process.env.TURSO_AUTH_TOKEN': JSON.stringify(env.TURSO_AUTH_TOKEN),
      'process.env.EMBEDDING_PROVIDER': JSON.stringify(env.EMBEDDING_PROVIDER),
    },
    build: {
      rollupOptions: {
        external: [
          '@xenova/transformers',
          'onnxruntime-node',
          'ws',
          'bufferutil',
          'utf-8-validate',
          'promise-limit',
        ],
      },
    },
    plugins: [honox(), tailwindcss(), devServer(), build()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        '~': path.resolve(__dirname, './app'),
        // Force web version of libsql
        '@libsql/client$': '@libsql/client/web',
      },
      conditions: ['workerd', 'worker', 'browser'],
    },
    ssr: {
      external: [
        'ws',
        'bufferutil',
        'utf-8-validate',
        'promise-limit',
        'onnxruntime-node',
        '@xenova/transformers',
      ],
      resolve: {
        conditions: ['workerd', 'worker', 'browser'],
        externalConditions: ['workerd', 'worker', 'browser'],
      },
      noExternal: ['@libsql/client'],
    },
    optimizeDeps: {
      exclude: [
        'ws',
        'bufferutil',
        'utf-8-validate',
        'promise-limit',
        'onnxruntime-node',
        '@xenova/transformers',
      ],
    },
  };
});
