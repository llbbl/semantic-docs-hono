/**
 * Cloudflare Workers environment bindings
 */

import type { R2Bucket } from '@cloudflare/workers-types';

export interface Env {
  // R2 bucket for markdown content (scanned by AI Search)
  CONTENT: R2Bucket;

  // R2 bucket for static assets (not indexed by AI Search)
  STATIC: R2Bucket;

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
        data: Array<{
          file_id: string;
          filename: string;
          score: number;
          attributes: Record<string, unknown>;
          content: Array<{
            id: string;
            type: string;
            text: string;
          }>;
        }>;
      }>;
      search: (options: {
        query: string;
        max_num_results?: number;
        rerank?: boolean;
      }) => Promise<{
        object: string;
        search_query: string;
        data: Array<{
          file_id: string;
          filename: string;
          score: number;
          attributes: Record<string, unknown>;
          content: Array<{
            id: string;
            type: string;
            text: string;
          }>;
        }>;
        has_more: boolean;
        next_page: string | null;
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
