/**
 * Vector Search API Endpoint
 * Uses libsql-search for semantic search
 */

import { Hono } from 'hono';
import { logger } from '../../../src/lib/logger';
import { search } from '../../../src/lib/search-wrapper';
import { getTursoClient } from '../../../src/lib/turso';
import { rateLimitMiddleware } from '../../../src/middleware/rateLimit';

const app = new Hono();

// Apply rate limiting: 20 requests per minute per IP
app.use('*', rateLimitMiddleware({ maxRequests: 20, windowSeconds: 60 }));

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

// GET endpoint returns method not allowed
app.get('/', async (c) => {
  return c.json({ error: 'Use POST method for search' }, 405);
});

export default app;
