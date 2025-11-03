/**
 * Vector Search API Endpoint
 * Uses libsql-search for semantic search
 */

import { Hono } from 'hono';
import { search } from '@/lib/libsql-search-runtime.ts';
import { logger } from '@/lib/logger.ts';
import { getTursoClient } from '@/lib/turso.ts';

const app = new Hono();

// Note: Rate limiting should be configured via Cloudflare Dashboard
// See docs/RATE_LIMITING.md for setup instructions

// POST endpoint for search
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { query, limit = 10 } = body;

    if (!query || typeof query !== 'string') {
      return c.json({ error: 'Query parameter is required' }, 400);
    }

    // Limit query length to prevent abuse
    if (query.length > 500) {
      return c.json(
        {
          error: 'Query too long',
          message: 'Query must be less than 500 characters',
        },
        400,
      );
    }

    // Limit max results to prevent excessive database queries
    const sanitizedLimit = Math.min(Math.max(1, limit), 20);

    const client = await getTursoClient();

    // Get embedding provider from environment
    const embeddingProvider =
      (process.env.EMBEDDING_PROVIDER as 'local' | 'gemini' | 'openai') ||
      'local';

    // Perform vector search
    const results = await search({
      client,
      query,
      limit: sanitizedLimit,
      embeddingOptions: {
        provider: embeddingProvider,
      },
    });

    return c.json({
      results,
      count: results.length,
      query,
    });
  } catch (error) {
    logger.error('Search error', {
      error: error instanceof Error ? error.message : String(error),
    });

    return c.json(
      {
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      500,
    );
  }
});

// Handle GET requests with method not allowed
app.all('/', async (c) => {
  if (c.req.method !== 'POST') {
    return c.json(
      { error: 'Method not allowed', message: 'Use POST method for search' },
      405,
    );
  }
  // This shouldn't be reached, but just in case
  return c.json({ error: 'Invalid request' }, 400);
});

export default app;
