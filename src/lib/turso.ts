/**
 * Turso/LibSQL client wrapper using libsql-search
 * Falls back to local SQLite file when Turso credentials aren't available
 * Uses @libsql/client/web for Cloudflare Workers compatibility
 */

import { type Client, createClient } from '@libsql/client/web';
import { logger } from './logger';

let client: Client | null = null;

export function getTursoClient(): Client {
  if (!client) {
    // In Vite, process.env is available server-side, but we need to ensure .env is loaded
    const url = process.env.TURSO_DB_URL;
    const authToken = process.env.TURSO_AUTH_TOKEN;

    if (url && authToken) {
      // Use Turso remote database (HTTP only for Workers compatibility)
      logger.info(`Using Turso database: ${url}`);
      client = createClient({
        url,
        authToken,
        // Force HTTP transport (no WebSockets)
        intMode: 'number',
      });
    } else {
      // Development without Turso: throw error with helpful message
      throw new Error(
        `Turso credentials required. Set TURSO_DB_URL and TURSO_AUTH_TOKEN in .env file. ` +
          `Local file:// URLs are not supported in Workers/Vite SSR. ` +
          `Found: url=${url}, token=${authToken ? 'present' : 'missing'}`,
      );
    }
  }

  return client;
}

// Re-export search utilities from libsql-search
export {
  getAllArticles,
  getArticleBySlug,
  getArticlesByFolder,
  getFolders,
} from './search-wrapper';
