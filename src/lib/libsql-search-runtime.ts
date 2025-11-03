/**
 * Runtime-only libsql-search functions (no indexer, simplified embeddings)
 * Copied from @logan/libsql-search to avoid CommonJS dependencies
 */

import type { Client } from '@libsql/client/web';

export interface SearchResult {
  id: number;
  slug: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  distance: number;
  created_at: string;
}

export interface SearchOptions {
  client: Client;
  query: string;
  limit?: number;
  tableName?: string;
  embeddingOptions?: {
    provider?: 'local' | 'gemini' | 'openai';
    apiKey?: string;
    dimensions?: number;
  };
}

/**
 * Generate embedding - supports Gemini and OpenAI
 */
async function generateEmbedding(
  text: string,
  options: SearchOptions['embeddingOptions'] = {},
): Promise<number[]> {
  const { provider = 'local' } = options;

  if (provider === 'local') {
    // Local embeddings not supported in Cloudflare Workers
    throw new Error(
      'Local embedding provider is not supported in Cloudflare Workers. ' +
        'Please use "gemini" or "openai" provider instead. ' +
        'Set EMBEDDING_PROVIDER environment variable to "gemini" or "openai".',
    );
  }

  if (provider === 'gemini') {
    // Use Gemini API
    const apiKey = options.apiKey || process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY required');

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'models/text-embedding-004',
          content: { parts: [{ text }] },
        }),
      },
    );

    const data = (await response.json()) as { embedding: { values: number[] } };
    return data.embedding.values;
  }

  if (provider === 'openai') {
    // Use OpenAI API
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY required');

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
        dimensions: options.dimensions || 768,
      }),
    });

    const data = (await response.json()) as {
      data: Array<{ embedding: number[] }>;
    };
    return data.data[0].embedding;
  }

  throw new Error(`Unknown embedding provider: ${provider}`);
}

/**
 * Perform semantic search using vector similarity
 */
export async function search(options: SearchOptions): Promise<SearchResult[]> {
  const {
    client,
    query,
    limit = 10,
    tableName = 'articles',
    embeddingOptions = {},
  } = options;

  // Generate embedding for query
  const queryEmbedding = await generateEmbedding(query, embeddingOptions);

  // Perform vector search
  const results = await client.execute({
    sql: `
      SELECT
        id,
        slug,
        title,
        content,
        folder,
        tags,
        created_at,
        vector_distance_cos(embedding, vector(?)) as distance
      FROM ${tableName}
      WHERE embedding IS NOT NULL
      ORDER BY distance
      LIMIT ?
    `,
    args: [JSON.stringify(queryEmbedding), limit],
  });

  // Parse and format results
  return results.rows.map((row) => ({
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    content: row.content as string,
    folder: row.folder as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    distance: row.distance as number,
    created_at: row.created_at as string,
  }));
}

/**
 * Get all articles
 */
export async function getAllArticles(
  client: Client,
  tableName = 'articles',
): Promise<
  Array<{
    id: number;
    slug: string;
    title: string;
    folder: string;
    tags: string[];
    created_at: string;
    updated_at: string;
  }>
> {
  const results = await client.execute(`
    SELECT id, slug, title, folder, tags, created_at, updated_at
    FROM ${tableName}
    ORDER BY title
  `);

  return results.rows.map((row) => ({
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    folder: row.folder as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }));
}

/**
 * Get a single article by slug
 */
export async function getArticleBySlug(
  client: Client,
  slug: string,
  tableName = 'articles',
): Promise<{
  id: number;
  slug: string;
  title: string;
  content: string;
  folder: string;
  tags: string[];
  created_at: string;
  updated_at: string;
} | null> {
  const results = await client.execute({
    sql: `
      SELECT id, slug, title, content, folder, tags, created_at, updated_at
      FROM ${tableName}
      WHERE slug = ?
      LIMIT 1
    `,
    args: [slug],
  });

  if (results.rows.length === 0) {
    return null;
  }

  const row = results.rows[0];
  return {
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    content: row.content as string,
    folder: row.folder as string,
    tags: JSON.parse((row.tags as string) || '[]'),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * Get articles by folder
 */
export async function getArticlesByFolder(
  client: Client,
  folder: string,
  tableName = 'articles',
): Promise<
  Array<{
    id: number;
    slug: string;
    title: string;
    folder: string;
    tags: string[];
  }>
> {
  const results = await client.execute({
    sql: `
      SELECT id, slug, title, folder, tags
      FROM ${tableName}
      WHERE folder = ?
      ORDER BY title
    `,
    args: [folder],
  });

  return results.rows.map((row) => ({
    id: row.id as number,
    slug: row.slug as string,
    title: row.title as string,
    folder: row.folder as string,
    tags: JSON.parse((row.tags as string) || '[]'),
  }));
}

/**
 * Get all unique folders
 */
export async function getFolders(
  client: Client,
  tableName = 'articles',
): Promise<string[]> {
  const results = await client.execute(`
    SELECT DISTINCT folder
    FROM ${tableName}
    ORDER BY folder
  `);

  return results.rows.map((row) => row.folder as string);
}
