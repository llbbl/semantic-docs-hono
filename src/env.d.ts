/// <reference types="vite/client" />

/**
 * Environment variables available during build
 * Note: These are replaced at build time by Vite
 */
type ImportMetaEnv = Record<string, never>;

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
