/**
 * Cloudflare Workers environment bindings
 */

import type { R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  // R2 bucket for content storage
  CONTENT: R2Bucket;

  // AI binding for semantic search
  AI: {
    autorag: (name: string) => {
      aiSearch: (options: {
        query: string;
        model?: string;
        rewrite_query?: boolean;
        max_num_results?: number;
      }) => Promise<{
        answer: string;
        results: Array<{
          content: string;
          score: number;
          metadata?: Record<string, unknown>;
        }>;
      }>;
      search: (options: {
        query: string;
        max_num_results?: number;
        rerank?: boolean;
      }) => Promise<{
        results: Array<{
          content: string;
          score: number;
          metadata?: Record<string, unknown>;
        }>;
      }>;
    };
  };

  // Environment variables
  AI_SEARCH_INDEX: string;
}

/**
 * Article metadata from manifest
 */
export interface Article {
  title: string;
  slug: string;
  tags: string[];
  folder: string;
}

/**
 * Folder structure from manifest
 */
export interface Folder {
  name: string;
  slug: string;
  articles: Article[];
}

/**
 * Manifest structure
 */
export interface Manifest {
  folders: Folder[];
  lastUpdated: string;
}
