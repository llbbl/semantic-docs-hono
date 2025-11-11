/**
 * Semantic Search API Endpoint
 * Uses Cloudflare AI Search with R2 content
 */

import { Hono } from 'hono';
import { logger } from '@/lib/logger.ts';
import type { Env } from '../../types';

const app = new Hono<{ Bindings: Env }>();

// Note: Rate limiting should be configured via Cloudflare Dashboard
// See docs/RATE_LIMITING.md for setup instructions

// AI Search index name (configured in Cloudflare dashboard)
const AI_SEARCH_INDEX = 'semantic-docs';

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

    // Limit max results
    const sanitizedLimit = Math.min(Math.max(1, limit), 20);

    // Perform semantic search using Cloudflare AI Search
    const searchResponse = await c.env.AI.autorag(AI_SEARCH_INDEX).search({
      query,
      max_num_results: sanitizedLimit,
      rerank: true, // Enable reranking for better relevance
    });

    // Transform results to match previous API format
    const results = searchResponse.results.map((result) => ({
      content: result.content,
      score: result.score,
      metadata: result.metadata,
    }));

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
